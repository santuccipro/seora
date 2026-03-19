import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchCVToJob } from "@/lib/analyze-cv";
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

    const { cvAnalysisId, jobTitle, jobDescription } = await req.json();

    if (!cvAnalysisId || !jobDescription) {
      return NextResponse.json(
        { error: "CV et description de poste requis" },
        { status: 400 }
      );
    }

    const cvAnalysis = await prisma.cVAnalysis.findUnique({
      where: { id: cvAnalysisId },
    });

    if (!cvAnalysis || cvAnalysis.userId !== user.id) {
      return NextResponse.json({ error: "CV introuvable" }, { status: 404 });
    }

    // Atomic token deduction
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: 2 } },
      data: { tokens: { decrement: 2 } },
    });

    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: "Pas assez de tokens (2 requis)" },
        { status: 403 }
      );
    }

    try {
      const result = await matchCVToJob(cvAnalysis.fileContent, jobDescription);

      const jobMatch = await prisma.jobMatch.create({
        data: {
          userId: user.id,
          cvAnalysisId,
          jobTitle: jobTitle || "Poste",
          jobDescription,
          matchScore: result.matchScore,
          adaptedCV: result.adaptedCV,
          suggestions: JSON.stringify(result.suggestions),
          keywords: JSON.stringify({
            missing: result.missingKeywords,
            present: result.presentKeywords,
          }),
          status: "completed",
          tokensUsed: 2,
        },
      });

      return NextResponse.json({
        id: jobMatch.id,
        matchScore: result.matchScore,
        adaptedCV: result.adaptedCV,
        suggestions: result.suggestions,
        missingKeywords: result.missingKeywords,
        presentKeywords: result.presentKeywords,
        globalAdvice: result.globalAdvice,
      });
    } catch (error) {
      // Refund tokens on failure
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: 2 } },
      });
      console.error("Job match error:", error);
      return NextResponse.json(
        { error: "Erreur lors du matching" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Job match error:", error);
    return NextResponse.json(
      { error: "Erreur lors du matching" },
      { status: 500 }
    );
  }
}
