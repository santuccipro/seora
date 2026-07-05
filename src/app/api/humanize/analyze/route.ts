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
 * Chaque batch fait 1 retry en cas d'échec. Si un batch échoue toujours,
 * on THROW (aucun fallback heuristique — le user perd confiance quand
 * les scores des zones ne collent pas avec le score global).
 */
async function claudeScoreChunks(
  chunks: string[],
  language: Language,
  onBatchProgress?: (done: number, total: number) => void | Promise<void>
): Promise<number[]> {
  // Batches plus petits (18 max) + séquentiels → prompts courts, temps
  // par batch réduit, et on ne sature pas le runner Mac-mini avec des
  // appels concurrents (aux dernières mesures il tenait 5 concurrent
  // mais avec latence cumulée qui claquait le timeout).
  const BATCH_SIZE = 18;
  const scores = new Array<number>(chunks.length).fill(-1);
  if (chunks.length === 0) return scores;

  const langHint = language === "fr" ? "français" : language === "en" ? "anglais" : "espagnol";

  const batches: { start: number; items: string[] }[] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push({ start: i, items: chunks.slice(i, i + BATCH_SIZE) });
  }

  const runBatch = async (
    batch: { start: number; items: string[] },
    attempt = 0
  ): Promise<void> => {
    const { start, items } = batch;
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
        timeoutMs: 90_000,
      });
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no JSON in Claude response");
      const parsed = JSON.parse(m[0]) as { scores?: Array<{ i: number; s: number }> };
      const gotIndexes = new Set<number>();
      for (const entry of parsed.scores ?? []) {
        const abs = start + entry.i;
        if (abs < scores.length) {
          scores[abs] = Math.max(0, Math.min(100, Math.round(entry.s)));
          gotIndexes.add(abs);
        }
      }
      // Si le batch a droppé des items on retry pour les rattraper
      const missing = items
        .map((_, k) => start + k)
        .filter((abs) => !gotIndexes.has(abs));
      if (missing.length > 0 && attempt < 1) {
        throw new Error(`batch incomplete: ${missing.length}/${items.length} missing`);
      }
    } catch (err) {
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 1200));
        return runBatch(batch, attempt + 1);
      }
      throw err;
    }
  };

  // Batches en SÉQUENTIEL — évite de saturer le runner qui gère mal
  // 6+ appels concurrents (retour empty ou timeout).
  for (let i = 0; i < batches.length; i++) {
    await runBatch(batches[i]);
    await onBatchProgress?.(i + 1, batches.length);
  }

  if (scores.some((s) => s < 0)) {
    throw new Error("Scoring Claude Sonnet incomplet — certains passages n'ont pas de score. Réessaie.");
  }
  return scores;
}

/**
 * Découpe un texte en chunks de ~targetWords mots en PRÉSERVANT la
 * structure originale (sauts de ligne, paragraphes). Chaque chunk peut
 * contenir plusieurs paragraphes séparés par \n\n, et les sauts de
 * ligne simples à l'intérieur d'un paragraphe sont conservés.
 *
 * Le UI utilise `whitespace-pre-wrap` sur le rendu de p.text, donc le
 * texte s'affiche comme dans le PDF d'origine.
 */
function smartChunk(text: string, targetWords = 170): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split par paragraphe (double saut de ligne).
  const paras = trimmed
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf: string[] = [];
  let bufWords = 0;

  const flush = () => {
    if (buf.length > 0) {
      chunks.push(buf.join("\n\n"));
      buf = [];
      bufWords = 0;
    }
  };

  const wc = (s: string) => s.split(/\s+/).filter(Boolean).length;

  for (const para of paras) {
    const w = wc(para);

    // Paragraphe trop gros → sous-découpe en phrases sans casser les
    // sauts de ligne internes (on garde la structure du paragraphe).
    if (w > targetWords * 1.4) {
      flush();
      const sentences = para.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/);
      let sBuf: string[] = [];
      let sBufWords = 0;
      for (const s of sentences) {
        const sw = wc(s);
        if (sBufWords + sw > targetWords && sBuf.length > 0) {
          chunks.push(sBuf.join(" "));
          sBuf = [];
          sBufWords = 0;
        }
        sBuf.push(s);
        sBufWords += sw;
      }
      if (sBuf.length > 0) chunks.push(sBuf.join(" "));
      continue;
    }

    if (bufWords + w > targetWords && buf.length > 0) {
      flush();
    }
    buf.push(para);
    bufWords += w;
  }
  flush();

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

          // Découpage : smartChunk préserve les paragraphes et sauts de
          // ligne du PDF d'origine (le UI utilise whitespace-pre-wrap).
          const chunkTexts = smartChunk(originalText, 170);

          // Scoring Claude en SÉQUENTIEL pour éviter que le runner Mac
          // mini se prenne 6+ appels concurrents et fail silencieusement :
          //  a) score global (3 slices parallèles internes)
          //  b) score par chunk (batches séquentiels)
          send("progress", {
            phase: "scoring",
            detail: "Score global Claude Sonnet…",
          });
          const claude = await claudeScoreText(originalText, language);

          send("progress", {
            phase: "scoring",
            detail: `Analyse de ${chunkTexts.length} zones (batch 1)…`,
          });
          const chunkClaudeScores = await claudeScoreChunks(
            chunkTexts,
            language,
            async (done, total) => {
              if (done < total) {
                send("progress", {
                  phase: "scoring",
                  detail: `Analyse des zones (batch ${done + 1}/${total})…`,
                });
              }
            }
          );

          // Merge : score Claude par chunk (garanti dispo, sinon throw
          // plus haut). Seuils calibrés cohérence avec le score global.
          const paragraphs = chunkTexts.map((text, index) => {
            const score = chunkClaudeScores[index];
            const risk: "high" | "medium" | "low" =
              score >= 50 ? "high" : score >= 25 ? "medium" : "low";
            return { index, text, score, risk };
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
