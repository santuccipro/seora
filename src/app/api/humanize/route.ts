import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { runFullHumanize } from "@/lib/humanize-engine";

const TOKEN_COST = 3;

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

    // Atomic token deduction
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        {
          error: `Pas assez de tokens. Il faut ${TOKEN_COST} tokens pour humaniser un document.`,
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      return NextResponse.json({ error: "Fichier trop lourd (max 15 Mo)" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "docx", "doc", "txt"].includes(ext)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      return NextResponse.json(
        { error: "Format non supporté (PDF, DOCX, DOC, TXT uniquement)" },
        { status: 400 }
      );
    }

    // Create the analysis row up-front (status: extracting)
    const analysis = await prisma.humanizerAnalysis.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: ext,
        originalText: "",
        status: "extracting",
        tokensUsed: TOKEN_COST,
      },
    });

    // Run the full pipeline (extraction + detection + humanization)
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await runFullHumanize(buffer, file.name, file.type);

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
      // Refund tokens on failure + mark analysis failed
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      await prisma.humanizerAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        },
      });
      console.error("[api/humanize] Pipeline failed:", err);
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
    console.error("[api/humanize] Fatal error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/humanize?id=... — retrieve a single analysis
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Paramètre id requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const analysis = await prisma.humanizerAnalysis.findFirst({
    where: { id, userId: user.id },
  });
  if (!analysis) {
    return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
  }

  return NextResponse.json({
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
    createdAt: analysis.createdAt,
  });
}
