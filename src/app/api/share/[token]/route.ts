import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";

// GET - Get shared analysis (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const analysis = await prisma.cVAnalysis.findUnique({
      where: { shareToken: token },
      select: {
        score: true,
        scoreBreakdown: true,
        summary: true,
        strengths: true,
        weaknesses: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      score: analysis.score,
      scoreBreakdown: analysis.scoreBreakdown ? JSON.parse(analysis.scoreBreakdown) : null,
      summary: analysis.summary,
      strengths: analysis.strengths ? JSON.parse(analysis.strengths) : [],
      weaknesses: analysis.weaknesses ? JSON.parse(analysis.weaknesses) : [],
      userName: analysis.user.name,
      createdAt: analysis.createdAt,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Generate share token for an analysis
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { analysisId } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const analysis = await prisma.cVAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
    }

    let shareToken = analysis.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(8).toString("hex");
      await prisma.cVAnalysis.update({
        where: { id: analysisId },
        data: { shareToken },
      });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareToken}`;

    return NextResponse.json({ shareUrl, shareToken });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
