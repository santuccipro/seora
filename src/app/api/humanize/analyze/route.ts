import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  extractTextFromFile,
  detectAI,
  detectByParagraph,
  claudeScoreText,
  Language,
} from "@/lib/humanize-engine";

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
          const paragraphs = detectByParagraph(originalText, language);

          send("progress", { phase: "scoring", detail: "Analyse Claude Sonnet en cours (3 tranches)..." });
          const claude = await claudeScoreText(originalText, language);

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
