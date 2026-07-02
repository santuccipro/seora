import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  runFullHumanize,
  paragraphDiff,
  HumanizeMode,
  Language,
} from "@/lib/humanize-engine";

const TOKEN_COST: Record<HumanizeMode, number> = {
  basic: 2,
  balanced: 3,
  aggressive: 5,
};

/**
 * POST /api/humanize
 *
 * FormData:
 *   file           : File           (required)
 *   mode           : "basic"|"balanced"|"aggressive"  (default: "balanced")
 *   language       : "fr"|"en"|"es"                    (default: "fr")
 *   targetScore    : number 0-100                      (default: 15)
 *   preservation   : JSON string { list: string[], patterns: string[] }
 *   stream         : "true" to enable SSE progress     (default: false, returns JSON)
 *
 * Streaming response (when stream=true) emits SSE events:
 *   event: progress   data: {phase, pass, totalPasses, detail}
 *   event: done       data: {id, aiScoreBefore, aiScoreAfter, passesApplied, durationMs}
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
    const mode = (formData.get("mode") as HumanizeMode) ?? "balanced";
    const language = (formData.get("language") as Language) ?? "fr";
    const targetScore = Number(formData.get("targetScore") ?? 15);
    const preservationRaw = formData.get("preservation") as string | null;
    const stream = formData.get("stream") === "true";

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
    if (!(["basic", "balanced", "aggressive"] as HumanizeMode[]).includes(mode)) {
      return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
    }
    if (!(["fr", "en", "es"] as Language[]).includes(language)) {
      return NextResponse.json({ error: "Langue non supportée" }, { status: 400 });
    }

    const tokenCost = TOKEN_COST[mode];

    // Atomic token deduction
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: tokenCost } },
      data: { tokens: { decrement: tokenCost } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Pas assez de tokens. Il faut ${tokenCost} tokens (mode ${mode}).` },
        { status: 403 }
      );
    }

    // Parse preservation config
    let preservationList: string[] = [];
    let preservationPatterns: string[] = [];
    if (preservationRaw) {
      try {
        const parsed = JSON.parse(preservationRaw);
        preservationList = Array.isArray(parsed.list) ? parsed.list : [];
        preservationPatterns = Array.isArray(parsed.patterns) ? parsed.patterns : [];
      } catch {
        // ignore malformed preservation
      }
    }

    // Create analysis row
    const analysis = await prisma.humanizerAnalysis.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: ext,
        originalText: "",
        status: "extracting",
        tokensUsed: tokenCost,
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    if (stream) {
      // SSE streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          try {
            const result = await runFullHumanize(
              buffer,
              file.name,
              file.type,
              { mode, language, targetScore, preservationList, preservationPatterns },
              async (phase, pass, totalPasses, detail) => {
                send("progress", { phase, pass, totalPasses, detail });
              }
            );

            await prisma.humanizerAnalysis.update({
              where: { id: analysis.id },
              data: {
                originalText: result.originalText,
                humanizedText: result.humanizedText,
                aiScoreBefore: result.scoreBefore.overall,
                aiScoreAfter: result.scoreAfter.overall,
                scoreDetails: JSON.stringify({
                  before: result.scoreBefore,
                  after: result.scoreAfter,
                  metrics: result.metrics,
                  mode: result.mode,
                  language: result.language,
                  targetScore: result.targetScore,
                }),
                passesCount: result.passesApplied,
                wordCount: result.wordCount,
                status: "done",
              },
            });

            send("done", {
              id: analysis.id,
              aiScoreBefore: result.scoreBefore.overall,
              aiScoreAfter: result.scoreAfter.overall,
              passesApplied: result.passesApplied,
              wordCount: result.wordCount,
              durationMs: result.durationMs,
            });
          } catch (err) {
            // Refund tokens on failure
            await prisma.user.update({
              where: { id: user.id },
              data: { tokens: { increment: tokenCost } },
            });
            await prisma.humanizerAnalysis.update({
              where: { id: analysis.id },
              data: {
                status: "failed",
                errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
              },
            });
            send("error", {
              message: err instanceof Error ? err.message : "Erreur inconnue",
            });
          } finally {
            controller.close();
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
    }

    // Non-streaming: run and return JSON
    try {
      const result = await runFullHumanize(buffer, file.name, file.type, {
        mode,
        language,
        targetScore,
        preservationList,
        preservationPatterns,
      });

      const updated = await prisma.humanizerAnalysis.update({
        where: { id: analysis.id },
        data: {
          originalText: result.originalText,
          humanizedText: result.humanizedText,
          aiScoreBefore: result.scoreBefore.overall,
          aiScoreAfter: result.scoreAfter.overall,
          scoreDetails: JSON.stringify({
            before: result.scoreBefore,
            after: result.scoreAfter,
            metrics: result.metrics,
            mode: result.mode,
            language: result.language,
            targetScore: result.targetScore,
          }),
          passesCount: result.passesApplied,
          wordCount: result.wordCount,
          status: "done",
        },
      });

      return NextResponse.json({
        id: updated.id,
        aiScoreBefore: updated.aiScoreBefore,
        aiScoreAfter: updated.aiScoreAfter,
        passesApplied: updated.passesCount,
        wordCount: updated.wordCount,
        durationMs: result.durationMs,
        status: "done",
      });
    } catch (err) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: tokenCost } },
      });
      await prisma.humanizerAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        },
      });
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Erreur lors de l'humanisation. Vos tokens ont été remboursés.",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[api/humanize] Fatal:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/humanize?id=... — retrieve single analysis (+ optional diff)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const includeDiff = url.searchParams.get("diff") === "true";
  if (!id) {
    return NextResponse.json({ error: "Paramètre id requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const analysis = await prisma.humanizerAnalysis.findFirst({
    where: { id, userId: user.id },
  });
  if (!analysis) return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });

  const payload: Record<string, unknown> = {
    id: analysis.id,
    fileName: analysis.fileName,
    fileType: analysis.fileType,
    aiScoreBefore: analysis.aiScoreBefore,
    aiScoreAfter: analysis.aiScoreAfter,
    scoreDetails: analysis.scoreDetails ? JSON.parse(analysis.scoreDetails) : null,
    originalText: analysis.originalText,
    humanizedText: analysis.humanizedText,
    passesApplied: analysis.passesCount,
    wordCount: analysis.wordCount,
    status: analysis.status,
    errorMessage: analysis.errorMessage,
    shareToken: analysis.shareToken,
    createdAt: analysis.createdAt,
  };

  if (includeDiff && analysis.originalText && analysis.humanizedText) {
    payload.diff = paragraphDiff(analysis.originalText, analysis.humanizedText);
  }

  return NextResponse.json(payload);
}

// DELETE /api/humanize?id=... — remove an analysis
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Paramètre id requis" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  await prisma.humanizerAnalysis.deleteMany({
    where: { id, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
