import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const analysis = await prisma.cVAnalysis.findUnique({
      where: { id },
    });

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json(
        { error: "Analyse introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: analysis.id,
      fileName: analysis.fileName,
      score: analysis.score,
      scoreBreakdown: analysis.scoreBreakdown ? JSON.parse(analysis.scoreBreakdown) : null,
      summary: analysis.summary,
      strengths: analysis.strengths ? JSON.parse(analysis.strengths) : [],
      weaknesses: analysis.weaknesses ? JSON.parse(analysis.weaknesses) : [],
      corrections: analysis.corrections ? JSON.parse(analysis.corrections) : null,
      correctedCV: analysis.correctedCV,
      status: analysis.status,
      createdAt: analysis.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
