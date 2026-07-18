import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { extractTextFromFile, Language } from "@/lib/humanize-engine";

/**
 * POST /api/humanize/analyze-v2 — Moteur v2 (statistique + stylométrique)
 *
 * Refonte complète du scoring IA (09/07 Orsu). Au lieu d'un unique juge
 * Claude Sonnet — trop mou, trop corrélé au registre formel — on combine
 * plusieurs signaux calibrés sur les papiers 2024-2025 :
 *
 *   • Perplexity moyenne par phrase (GPT-2 FR local)
 *   • Burstiness = std/mean perplexity (Fast-DetectGPT ICLR 2024)
 *   • Deviation POS vs baseline humain académique
 *   • Density de connecteurs/phrases préférés des LLMs
 *   • Variance longueur de phrases + MTLD
 *
 * Le calcul tourne sur un service Python (Mac mini) exposé via tunnel
 * Cloudflare. URL configurée dans SEORA_DETECTOR_URL, auth via
 * SEORA_DETECTOR_TOKEN.
 *
 * SSE events:
 *   progress {phase, detail?}
 *   done     {id, wordCount, scoreGlobal, confidence, signals, zones, ...}
 *   error    {message}
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const ANALYZE_TOKEN_COST = 1;

interface DetectorZone {
  index: number;
  text: string;
  score: number;
  signals: Record<string, number | string>;
}

interface DetectorResponse {
  score_global: number;
  confidence: number;
  obfuscation_score?: number; // v3.1r5 — axe séparé (homoglyphs cyrilliques + chars invisibles)
  signals: {
    fast_detect_gpt: number;
    perplexity_sentence_avg: number;
    perplexity_sentence_std: number;
    burstiness: number;
    sentence_length_mean: number;
    sentence_length_var: number;
    mtld: number;
    pos_deviation: number;
    connector_overuse: number;
    ai_favorite_hits: number;
    ai_favorite_top: string[];
    human_markers: number;
    punctuation_ratios: Record<string, number>;
    pos_ratios: Record<string, number>;
    raw_score_before_boost: number;
    human_boost_applied: number;
  };
  zones: DetectorZone[];
  meta: {
    n_sentences: number;
    n_perplexity_sampled: number;
    language: string;
    model: string;
    weights: Record<string, number>;
  };
  elapsed_ms?: number;
}

async function callDetector(text: string, language: Language): Promise<DetectorResponse> {
  const url = process.env.SEORA_DETECTOR_URL;
  if (!url) throw new Error("SEORA_DETECTOR_URL non configuré côté Vercel");
  const token = process.env.SEORA_DETECTOR_TOKEN || "";

  // Retry up to 3 times on 503/502 (Fly.io cold start) with exponential backoff
  const MAX_ATTEMPTS = 3;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, (attempt - 1) * 5000)); // 5s, 10s
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000);
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, language, fast_mode: false }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const err = new Error(`Detector HTTP ${res.status}: ${errText.slice(0, 300)}`);
        // Retry on 502/503 (Fly.io cold start / transient)
        if ((res.status === 502 || res.status === 503) && attempt < MAX_ATTEMPTS) {
          lastErr = err;
          console.warn(`[analyze-v2] Detector ${res.status} — retry ${attempt}/${MAX_ATTEMPTS}`);
          clearTimeout(timeout);
          continue;
        }
        throw err;
      }
      clearTimeout(timeout);
      return (await res.json()) as DetectorResponse;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
        throw err; // don't retry hard timeouts
      }
      if (attempt < MAX_ATTEMPTS) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        console.warn(`[analyze-v2] Detector error attempt ${attempt}: ${lastErr.message}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Detector unavailable after retries");
}

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

    // Atomic token deduction
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: ANALYZE_TOKEN_COST } },
      data: { tokens: { decrement: ANALYZE_TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Pas assez de tokens.` },
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
            // stream closed
          }
        };
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
            throw new Error("Texte trop court (min. 100 caractères).");
          }
          const wordCount = originalText.trim().split(/\s+/).length;
          const paragraphCount = originalText.split(/\n{2,}/).filter((p) => p.trim().length > 0).length;
          const estimatedMs = Math.max(15_000, paragraphCount * 300);
          send("progress", { phase: "detecting", detail: `${wordCount} mots · pipeline v2 · ~${Math.round(estimatedMs / 1000)}s estimé`, percent: 10 });
          let currentPct = 10;
          const progressInterval = setInterval(() => {
            if (currentPct < 87) {
              currentPct += 1;
              send("progress", { phase: "detecting", detail: `${wordCount} mots · pipeline v2`, percent: currentPct });
            }
          }, 1000);

          let detected!: DetectorResponse;
          try {
            detected = await callDetector(originalText, language);
          } finally {
            clearInterval(progressInterval);
          }

          // Map detector zones to paragraph format the UI already knows
          const paragraphs = detected.zones.map((z) => ({
            index: z.index,
            text: z.text,
            score: Math.round(z.score),
            risk: (z.score >= 60 ? "high" : z.score >= 40 ? "medium" : "low") as
              | "high"
              | "medium"
              | "low",
            signals: z.signals,
          }));

          // Persist
          await prisma.humanizerAnalysis.update({
            where: { id: analysis.id },
            data: {
              originalText,
              aiScoreBefore: Math.round(detected.score_global),
              scoreDetails: JSON.stringify({
                engineVersion: "v2",
                claudeScoreBefore: Math.round(detected.score_global),
                signals: detected.signals,
                zones: paragraphs,
                meta: detected.meta,
                confidence: detected.confidence,
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
            engineVersion: "v2",
            scoreGlobal: Math.round(detected.score_global),
            confidence: detected.confidence,
            obfuscationScore: Math.round(detected.obfuscation_score ?? 0),
            signals: detected.signals,
            zones: paragraphs,
            meta: detected.meta,
            elapsedMs: detected.elapsed_ms,
            percent: 100,
          });
        } catch (err) {
          const errText = err instanceof Error ? err.message : "Erreur inconnue";
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { tokens: { increment: ANALYZE_TOKEN_COST } },
            });
            await prisma.humanizerAnalysis.update({
              where: { id: analysis.id },
              data: { status: "failed", errorMessage: errText.slice(0, 4000) },
            });
          } catch {
            // best-effort
          }
          send("error", { message: errText });
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
    console.error("[api/humanize/analyze-v2] Fatal:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
