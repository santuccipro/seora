import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/humanize/share/[token] — public endpoint to view a shared analysis
 * (no auth required, only returns the safe fields)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  }

  const analysis = await prisma.humanizerAnalysis.findFirst({
    where: { shareToken: token, status: "done" },
    select: {
      fileName: true,
      aiScoreBefore: true,
      aiScoreAfter: true,
      wordCount: true,
      passesCount: true,
      scoreDetails: true,
      createdAt: true,
      humanizedText: true,
      originalText: true,
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analyse introuvable ou révoquée" }, { status: 404 });
  }

  return NextResponse.json({
    fileName: analysis.fileName,
    aiScoreBefore: analysis.aiScoreBefore,
    aiScoreAfter: analysis.aiScoreAfter,
    wordCount: analysis.wordCount,
    passesCount: analysis.passesCount,
    scoreDetails: analysis.scoreDetails ? JSON.parse(analysis.scoreDetails) : null,
    createdAt: analysis.createdAt,
    // Truncated previews for public sharing (no full leak)
    originalPreview: analysis.originalText?.slice(0, 800) ?? "",
    humanizedPreview: analysis.humanizedText?.slice(0, 800) ?? "",
  });
}
