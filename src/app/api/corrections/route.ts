import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCorrections } from "@/lib/analyze-cv";
import { rateLimit } from "@/lib/rate-limit";

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
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    if (user.tokens <= 0) {
      return NextResponse.json(
        { error: "Pas assez de tokens" },
        { status: 403 }
      );
    }

    const { analysisId } = await req.json();

    const analysis = await prisma.cVAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json(
        { error: "Analyse introuvable" },
        { status: 404 }
      );
    }

    if (analysis.corrections) {
      return NextResponse.json({
        corrections: JSON.parse(analysis.corrections),
        correctedCV: analysis.correctedCV,
      });
    }

    const result = await generateCorrections(analysis.fileContent);

    await prisma.cVAnalysis.update({
      where: { id: analysisId },
      data: {
        corrections: JSON.stringify(result.corrections),
        correctedCV: result.correctedCV,
        status: "corrected",
        tokensUsed: { increment: 2 },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 2 } },
    });

    return NextResponse.json({
      corrections: result.corrections,
      correctedCV: result.correctedCV,
      tips: result.tips,
    });
  } catch (error) {
    console.error("Corrections error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des corrections" },
      { status: 500 }
    );
  }
}
