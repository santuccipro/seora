import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  extractTextFromFile,
  detectAI,
  claudeScoreText,
  Language,
} from "@/lib/humanize-engine";
import { callClaude } from "@/lib/claude-client";

/**
 * Score chaque chunk avec Claude Sonnet en batches parallèles.
 * Retourne un tableau de scores 0-100 alignés sur l'index des chunks.
 * Retombe silencieusement sur -1 si un batch échoue (le caller peut alors
 * fallback sur l'heuristique).
 */
async function claudeScoreChunks(
  chunks: string[],
  language: Language
): Promise<number[]> {
  const BATCH_SIZE = 25;
  const scores = new Array<number>(chunks.length).fill(-1);
  if (chunks.length === 0) return scores;

  const langHint = language === "fr" ? "français" : language === "en" ? "anglais" : "espagnol";

  const batches: { start: number; items: string[] }[] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push({ start: i, items: chunks.slice(i, i + BATCH_SIZE) });
  }

  await Promise.all(
    batches.map(async ({ start, items }) => {
      const numbered = items
        .map((t, k) => `[${k}] ${t.replace(/\s+/g, " ").slice(0, 900)}`)
        .join("\n\n");
      const prompt = `Détecteur IA Compilatio-grade. Ci-dessous ${items.length} passages numérotés d'un texte académique ${langHint}.

Pour CHAQUE passage, donne un score 0-100 estimant la probabilité qu'il soit généré par IA.
BARÈME : 0-15 humain sûr · 15-30 mixte · 30-50 moitié IA · 50-75 majoritairement IA · 75+ quasi 100% IA.

SIGNAUX IA (+) : cascades énumératives, antithèses balancées ("n'est pas X c'est Y"), registre uniforme, nominalizations "l'identification des", connecteurs "par ailleurs / en outre", trios rhétoriques.
SIGNAUX HUMAINS (-) : "franchement", "concrètement", "à mon niveau", "bon,", "en vrai", phrases courtes, registre variable, micro-imperfections.

Réponds STRICTEMENT ce JSON, un objet par passage :
{"scores":[{"i":0,"s":78},{"i":1,"s":34}, ...]}

PASSAGES :
${numbered}`;

      try {
        const raw = await callClaude(prompt, {
          system: "Détecteur IA Compilatio-grade. Réponds uniquement JSON strict, sans commentaire ni backticks.",
          model: "claude-sonnet-4-6",
          timeoutMs: 75_000,
        });
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) return;
        const parsed = JSON.parse(m[0]) as { scores?: Array<{ i: number; s: number }> };
        for (const entry of parsed.scores ?? []) {
          const abs = start + entry.i;
          if (abs < scores.length) {
            scores[abs] = Math.max(0, Math.min(100, Math.round(entry.s)));
          }
        }
      } catch {
        // batch failed, keep -1 sentinel → caller will fallback
      }
    })
  );

  return scores;
}

/**
 * Découpe un texte en chunks de ~150-200 mots découpés proprement à la
 * fin d'une phrase. Utilisé quand le PDF n'a pas de sauts de paragraphes
 * naturels — sans ça, tout le texte est vu comme "un seul paragraphe"
 * et le rapport ne peut pas surligner les zones à risque proprement.
 */
function smartChunk(text: string, targetWords = 170): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  // Split en phrases (heuristique simple : . ! ? suivis d'un espace + majuscule)
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf: string[] = [];
  let bufWords = 0;

  for (const s of sentences) {
    const w = s.split(/\s+/).length;
    if (bufWords + w > targetWords && buf.length > 0) {
      chunks.push(buf.join(" "));
      buf = [];
      bufWords = 0;
    }
    buf.push(s);
    bufWords += w;
  }
  if (buf.length > 0) chunks.push(buf.join(" "));
  return chunks;
}

export const runtime = "nodejs";
export const maxDuration = 300;

const ANALYZE_TOKEN_COST = 1;

/**
 * POST /api/humanize/analyze
 *
 * Analyse-only endpoint : extrait le texte, calcule le score IA global
 * (heuristique + Claude Sonnet 4.6) et scoresPar-paragraphe, sans jamais
 * appeler Opus pour réécrire. Coût : 1 token.
 *
 * Répond en Server-Sent Events pour éviter le timeout browser sur les
 * documents lourds (les appels Sonnet peuvent prendre 30-60s au total).
 * Le premier byte part immédiatement, le browser attend le stream final.
 *
 * FormData:
 *   file       : File           (required)
 *   language   : "fr"|"en"|"es"  (default: "fr")
 *
 * Events SSE:
 *   event: progress   data: {phase, detail?, analysisId?}
 *   event: done       data: {id, wordCount, heuristicScore, claudeScore, ...}
 *   event: error      data: {message}
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as Language) ?? "fr";

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop lourd (max 15 Mo)" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "docx", "doc", "txt"].includes(ext)) {
      return NextResponse.json(
        { error: "Format non supporté (PDF, DOCX, DOC, TXT uniquement)" },
        { status: 400 }
      );
    }
    if (!(["fr", "en", "es"] as Language[]).includes(language)) {
      return NextResponse.json({ error: "Langue non supportée" }, { status: 400 });
    }

    // Atomic token deduction (1 token pour l'analyse)
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: ANALYZE_TOKEN_COST } },
      data: { tokens: { decrement: ANALYZE_TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Pas assez de tokens. Il faut ${ANALYZE_TOKEN_COST} token pour l'analyse.` },
        { status: 403 }
      );
    }

    const analysis = await prisma.humanizerAnalysis.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: ext,
        originalText: "",
        status: "extracting",
        tokensUsed: ANALYZE_TOKEN_COST,
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // stream already closed
          }
        };

        // Heartbeat pour empêcher Vercel/CF de couper la connexion
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, 10_000);

        try {
          send("progress", { phase: "extracting", analysisId: analysis.id });

          const originalText = await extractTextFromFile(buffer, file.name, file.type);
          if (!originalText || originalText.trim().length < 100) {
            throw new Error("Le fichier ne contient pas assez de texte à analyser (min. 100 caractères).");
          }

          send("progress", { phase: "detecting", detail: `${originalText.split(/\s+/).length} mots extraits` });
          const heuristic = detectAI(originalText, language);

          // Découpage : smartChunk toujours utilisé pour uniformité,
          // sinon paragraphes trop hétérogènes en taille foutent le
          // scoring en l'air (1 phrase vs 500 mots).
          const chunkTexts = smartChunk(originalText, 170);
          const heuristicByChunk = chunkTexts.map((t) => detectAI(t, language));

          // Scoring Claude : global (3 tranches) + par-chunk (batches 25)
          // en parallèle pour minimiser la latence.
          send("progress", {
            phase: "scoring",
            detail: `Analyse Claude Sonnet : score global + ${chunkTexts.length} zones en parallèle…`,
          });
          const [claude, chunkClaudeScores] = await Promise.all([
            claudeScoreText(originalText, language),
            claudeScoreChunks(chunkTexts, language),
          ]);

          // Merge : score Claude par chunk quand dispo, sinon fallback
          // heuristique. Seuils calibrés pour cohérence avec le score
          // global : high ≥ 50, medium ≥ 25.
          const paragraphs = chunkTexts.map((text, index) => {
            const claudeScore = chunkClaudeScores[index];
            const heuristicScore = heuristicByChunk[index].overall;
            const score = claudeScore >= 0 ? claudeScore : heuristicScore;
            const risk: "high" | "medium" | "low" =
              score >= 50 ? "high" : score >= 25 ? "medium" : "low";
            return {
              index,
              text,
              score,
              risk,
              details: {
                perplexity: heuristicByChunk[index].perplexity,
                burstiness: heuristicByChunk[index].burstiness,
                homoglyphs: heuristicByChunk[index].homoglyphs,
                connectors: heuristicByChunk[index].connectors,
                formality: heuristicByChunk[index].formality,
                parallelism: heuristicByChunk[index].parallelism,
              },
            };
          });

          const wordCount = originalText.trim().split(/\s+/).length;

          await prisma.humanizerAnalysis.update({
            where: { id: analysis.id },
            data: {
              originalText,
              aiScoreBefore: heuristic.overall,
              scoreDetails: JSON.stringify({
                before: heuristic,
                claudeScoreBefore: claude.overall,
                claudeReasoning: claude.reasoning,
                topOffenders: claude.topOffenders,
                paragraphs,
                language,
              }),
              wordCount,
              status: "analyzed",
            },
          });

          send("done", {
            id: analysis.id,
            fileName: file.name,
            wordCount,
            heuristicScore: heuristic.overall,
            claudeScore: claude.overall,
            claudeReasoning: claude.reasoning,
            topOffenders: claude.topOffenders,
            paragraphs,
          });
        } catch (err) {
          // Rembourse le token en cas d'échec
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { tokens: { increment: ANALYZE_TOKEN_COST } },
            });
            await prisma.humanizerAnalysis.update({
              where: { id: analysis.id },
              data: {
                status: "failed",
                errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
              },
            });
          } catch {
            // best-effort
          }
          send("error", {
            message: err instanceof Error ? err.message : "Erreur inconnue",
          });
        } finally {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[api/humanize/analyze] Fatal:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
