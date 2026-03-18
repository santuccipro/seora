import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCV } from "@/lib/analyze-cv";
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
        { error: "Pas assez de tokens. Achetez des tokens pour continuer." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("cv") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let cvText: string;

    if (file.type === "application/pdf") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import("pdf-parse") as any;
      const pdf = pdfModule.default || pdfModule;
      const pdfData = await pdf(buffer);
      cvText = pdfData.text;
    } else {
      cvText = buffer.toString("utf-8");
    }

    if (!cvText.trim()) {
      return NextResponse.json(
        { error: "Le fichier semble vide ou illisible" },
        { status: 400 }
      );
    }

    const analysis = await analyzeCV(cvText);

    const cvAnalysis = await prisma.cVAnalysis.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileContent: cvText,
        score: analysis.score,
        scoreBreakdown: JSON.stringify(analysis.scoreBreakdown),
        summary: analysis.summary,
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        status: "analyzed",
        tokensUsed: 1,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 1 } },
    });

    return NextResponse.json({
      id: cvAnalysis.id,
      score: analysis.score,
      scoreBreakdown: analysis.scoreBreakdown,
      summary: analysis.summary,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}
