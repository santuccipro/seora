import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  extractTextFromFile,
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
  onBatchProgress?: (done: number, total: number) => void | Promise<void>,
  traceBuffer?: string[]
): Promise<{ scores: number[]; reasons: string[] }> {
  const trace = (line: string) => {
    console.log(line);
    if (traceBuffer) traceBuffer.push(line);
  };
  // 07/07 (Orsu) — BATCH_SIZE baissé 40→25 pour réduire le risque de timeout
  // par batch (Claude Sonnet met parfois >90s sur 40 phrases si surcharge).
  // Plus de batches mais plus petits = plus prévisible + tolère mieux les
  // flares Anthropic. DPP 12k mots (~800 phrases) : 32 batches × ~15s / 2 concurrents
  // = ~4 min (vs ~1 min avant), toujours dans le maxDuration 300s.
  const BATCH_SIZE = 25;
  const scores = new Array<number>(chunks.length).fill(-1);
  // 07/07 (Orsu) — reasons align avec scores : raison courte pour chaque phrase
  // à score >= 50 (les zones flaggées). Vide pour les phrases classées humaines.
  const reasons = new Array<string>(chunks.length).fill("");
  if (chunks.length === 0) return { scores, reasons };

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
    // 07/07 (Orsu) — logging temporaire pour tracer les fails d'analyse
    const batchLabel = `[analyze-batch start=${start} n=${items.length} attempt=${attempt}]`;
    const t0 = Date.now();
    trace(`${batchLabel} START`);
    const numbered = items
      .map((t, k) => `[${k}] ${t.replace(/\s+/g, " ").slice(0, 900)}`)
      .join("\n\n");
    const prompt = `Détecteur IA Compilatio-grade. Ci-dessous ${items.length} passages numérotés d'un texte académique ${langHint}.

Pour CHAQUE passage, donne un score 0-100 estimant la probabilité qu'il soit généré par IA.
BARÈME : 0-15 humain sûr · 15-30 mixte · 30-50 moitié IA · 50-75 majoritairement IA · 75+ quasi 100% IA.

SIGNAUX IA (+) : cascades énumératives, antithèses balancées ("n'est pas X c'est Y"), registre uniforme, nominalizations "l'identification des", connecteurs "par ailleurs / en outre", trios rhétoriques.
SIGNAUX HUMAINS (-) : "franchement", "concrètement", "à mon niveau", "bon,", "en vrai", phrases courtes, registre variable, micro-imperfections.

**IMPORTANT** — pour CHAQUE passage dont le score est ≥ 50, ajoute un champ "why" court (≤ 15 mots) qui cite LE marqueur IA le plus flagrant dans cette phrase précise (pas générique). Pour les passages < 50, mets "why": "".

Exemples de bon "why" :
- "triade rhétorique + connecteur 'par ailleurs'"
- "nominalisation dense 'l'identification des'"
- "antithèse balancée 'n'est pas X c'est Y'"
- "registre soutenu uniforme, zéro burstiness"

Réponds STRICTEMENT ce JSON :
{"scores":[{"i":0,"s":78,"why":"triade rhétorique explicite"},{"i":1,"s":12,"why":""}, ...]}

PASSAGES :
${numbered}`;

    try {
      const raw = await callClaude(prompt, {
        system: "Détecteur IA Compilatio-grade. Réponds uniquement JSON strict, sans commentaire ni backticks.",
        model: "claude-sonnet-4-6",
        // 07/07 (Orsu) — timeout 90s→120s : Claude Sonnet peut mettre 60-90s
        // sur 25 phrases quand l'API est chargée. 120s laisse une marge safe.
        timeoutMs: 120_000,
      });
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no JSON in Claude response");
      const parsed = JSON.parse(m[0]) as { scores?: Array<{ i: number; s: number; why?: string }> };
      const gotIndexes = new Set<number>();
      for (const entry of parsed.scores ?? []) {
        const abs = start + entry.i;
        if (abs < scores.length) {
          scores[abs] = Math.max(0, Math.min(100, Math.round(entry.s)));
          reasons[abs] = (entry.why ?? "").toString().slice(0, 120);
          gotIndexes.add(abs);
        }
      }
      // Si le batch a droppé des items on retry pour les rattraper
      const missing = items
        .map((_, k) => start + k)
        .filter((abs) => !gotIndexes.has(abs));
      // 07/07 (Orsu) — 2 retries au lieu de 1 (attempt < 2)
      if (missing.length > 0 && attempt < 2) {
        throw new Error(`batch incomplete: ${missing.length}/${items.length} missing`);
      }
      trace(`${batchLabel} OK (${Date.now() - t0}ms, scored=${gotIndexes.size})`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errName = err instanceof Error ? err.name : "Unknown";
      trace(`${batchLabel} FAIL (${Date.now() - t0}ms) — ${errName}: ${errMsg.slice(0, 300)}`);
      // 07/07 (Orsu) — 2 retries au lieu de 1, backoff progressif (1.2s → 3s)
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        return runBatch(batch, attempt + 1);
      }
      throw err;
    }
  };

  // 07/07 (Orsu) — RETOUR à 2 concurrents. Sim CONCURRENCY=3 sur DPP 12k :
  // le CLI claude --print sur usage_server saturait (7/20 batches timeout).
  // Structurel : Claude Max CLI gère mal 3+ appels concurrents. Retour
  // à 2 : sim de 716s wall-clock, safe sous les 800s Vercel Pro.
  const CONCURRENCY = 2;
  let done = 0;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const slice = batches.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (b) => {
        await runBatch(b);
        done += 1;
        await onBatchProgress?.(done, batches.length);
      })
    );
  }

  if (scores.some((s) => s < 0)) {
    throw new Error("Scoring Claude Sonnet incomplet — certains passages n'ont pas de score. Réessaie.");
  }
  return { scores, reasons };
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
/**
 * Découpe un paragraphe en phrases, en préservant l'exact séparateur (espace
 * ou ponctuation résiduelle) après chaque phrase, pour permettre au UI de
 * reconstruire fidèlement le texte original en concaténant text + tail.
 */
function splitIntoSentences(text: string): Array<{ text: string; tail: string }> {
  const out: Array<{ text: string; tail: string }> = [];
  const regex = /([^.!?…]+[.!?…]+["»)']*)(\s+|$)/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    out.push({ text: m[1].trim(), tail: m[2] || " " });
    lastEnd = regex.lastIndex;
  }
  if (lastEnd < text.length) {
    const trailing = text.slice(lastEnd).trim();
    if (trailing) out.push({ text: trailing, tail: "" });
  }
  return out.filter((s) => s.text.length > 0);
}

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
// 07/07 (Orsu) — Test réel end-to-end sur DPP 12k mots : analyse a fait 798.3s
// (tous les 19 batches OK) mais Vercel a coupé PILE 2s avant que le "done"
// soit envoyé. Passage à 900s pour 2 min de marge sur l'aggregation + save DB.
export const maxDuration = 900;

const ANALYZE_TOKEN_COST = 1;

/**
 * POST /api/humanize/analyze
 *
 * Analyse-only endpoint : extrait le texte, calcule le score IA global
 * (Claude Sonnet 4.6) et scores par-paragraphe, sans jamais appeler
 * Opus pour réécrire. Coût : 1 token. 07/07 (Orsu) : ancienne détection
 * heuristique retirée — le patron veut uniquement le score Claude.
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
 *   event: done       data: {id, wordCount, claudeScore, claudeReasoning, topOffenders, paragraphs}
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

        // 07/07 (Orsu) — hoisted hors du try pour être accessible dans le catch
        const traceBuffer: string[] = [];

        try {
          send("progress", { phase: "extracting", analysisId: analysis.id });

          const originalText = await extractTextFromFile(buffer, file.name, file.type);
          if (!originalText || originalText.trim().length < 100) {
            throw new Error("Le fichier ne contient pas assez de texte à analyser (min. 100 caractères).");
          }

          send("progress", { phase: "detecting", detail: `${originalText.split(/\s+/).length} mots extraits` });

          // Découpage à deux niveaux :
          //  • smartChunk pour la structure paragraphe (rendu UI)
          //  • splitIntoSentences pour scorer PHRASE PAR PHRASE dans chaque
          //    chunk — le user veut voir quelles phrases précises sont IA,
          //    pas un pavé bleu de 200 mots.
          const chunkTexts = smartChunk(originalText, 170);
          const sentencesPerChunk = chunkTexts.map((c) => splitIntoSentences(c));
          const flatSentences = sentencesPerChunk.flatMap((sList) => sList.map((s) => s.text));

          // Scoring Claude en SÉQUENTIEL pour éviter que le runner Mac
          // mini se prenne 6+ appels concurrents et fail silencieusement :
          //  a) score global (3 slices parallèles internes)
          //  b) score par phrase (batches de 40 en parallèle 2-à-2)
          send("progress", {
            phase: "scoring",
            detail: "Score global Claude Sonnet…",
          });
          const claude = await claudeScoreText(originalText, language);

          send("progress", {
            phase: "scoring",
            detail: `Analyse de ${flatSentences.length} phrases (batch 1)…`,
          });
          // 07/07 (Orsu) — Vercel Function crash sans catch → on persiste
          // errorMessage en DB AU FIL DE L'EAU (après chaque batch) pour que
          // même en kill brutal, la DB reflète le dernier batch bougé.
          const t0 = Date.now();
          const { scores: sentenceScores, reasons: sentenceReasons } = await claudeScoreChunks(
            flatSentences,
            language,
            async (done, total) => {
              if (done < total) {
                send("progress", {
                  phase: "scoring",
                  detail: `Analyse des phrases (batch ${done + 1}/${total})…`,
                });
              }
              // Persist DB checkpoint every batch
              try {
                await prisma.humanizerAnalysis.update({
                  where: { id: analysis.id },
                  data: {
                    status: done < total ? "scoring" : "scoring-done",
                    errorMessage: `[in-progress] batch ${done}/${total} · ${Math.round((Date.now() - t0) / 1000)}s · trace: ${traceBuffer.slice(-6).join(" | ").slice(0, 800)}`,
                  },
                });
              } catch {
                // best-effort
              }
            },
            traceBuffer
          );

          // Réagrégation : pour chaque chunk (= paragraph), attacher les
          // scores individuels des phrases qu'il contient. Le risk global
          // du paragraph = max des scores de ses phrases.
          // 07/07 (Orsu) — pour chaque zone flagée, on remonte les 2-3 raisons
          // les plus explicites (why cité par Claude sur les phrases high) et
          // on les concatène en "topReasons" au niveau paragraph, pour que
          // l'UI puisse expliquer POURQUOI la zone est classée IA.
          let cursor = 0;
          const paragraphs = chunkTexts.map((text, index) => {
            const sList = sentencesPerChunk[index];
            const sentences = sList.map((s) => {
              const abs = cursor++;
              const sc = sentenceScores[abs] ?? 0;
              const why = sentenceReasons[abs] ?? "";
              return { text: s.text, tail: s.tail, score: sc, why };
            });
            const maxScore = sentences.reduce((mx, s) => (s.score > mx ? s.score : mx), 0);
            const risk: "high" | "medium" | "low" =
              maxScore >= 50 ? "high" : maxScore >= 25 ? "medium" : "low";
            // Dédupliqué, on garde les whys les plus flagrants (phrases score DESC)
            const topReasons = sentences
              .filter((s) => s.score >= 50 && s.why)
              .sort((a, b) => b.score - a.score)
              .map((s) => s.why)
              .filter((w, i, arr) => arr.indexOf(w) === i)
              .slice(0, 3);
            return { index, text, sentences, score: maxScore, risk, topReasons };
          });

          const wordCount = originalText.trim().split(/\s+/).length;

          // 07/07 (Orsu) — patron veut plus voir de score heuristique. On stocke
          // uniquement le score Claude Sonnet en aiScoreBefore. Le detectAI reste
          // calculé côté serveur pour usage interne éventuel mais n'est plus renvoyé.
          await prisma.humanizerAnalysis.update({
            where: { id: analysis.id },
            data: {
              originalText,
              aiScoreBefore: claude.overall,
              scoreDetails: JSON.stringify({
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
            claudeScore: claude.overall,
            claudeReasoning: claude.reasoning,
            topOffenders: claude.topOffenders,
            paragraphs,
          });
        } catch (err) {
          // Rembourse le token en cas d'échec
          const errText = err instanceof Error ? err.message : "Erreur inconnue";
          // 07/07 (Orsu) — écrit traceBuffer (si présent) dans errorMessage
          // pour debug post-mortem via Prisma Mac mini.
          const bufferedTrace = traceBuffer.length > 0
            ? `\n---TRACE---\n${traceBuffer.join("\n")}`
            : "";
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { tokens: { increment: ANALYZE_TOKEN_COST } },
            });
            await prisma.humanizerAnalysis.update({
              where: { id: analysis.id },
              data: {
                status: "failed",
                errorMessage: `${errText}${bufferedTrace}`.slice(0, 4000),
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
