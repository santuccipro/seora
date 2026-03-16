import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCoverLetter } from "@/lib/analyze-cv";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.tokens <= 0) {
      return NextResponse.json({ error: "Pas assez de tokens" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("letter") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let letterText: string;

    if (file.type === "application/pdf") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = (await import("pdf-parse")) as any;
      const pdf = pdfModule.default || pdfModule;
      const pdfData = await pdf(buffer);
      letterText = pdfData.text;
    } else {
      letterText = buffer.toString("utf-8");
    }

    if (!letterText.trim()) {
      return NextResponse.json({ error: "Fichier vide ou illisible" }, { status: 400 });
    }

    const analysis = await analyzeCoverLetter(letterText);

    const saved = await prisma.coverLetterAnalysis.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileContent: letterText,
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
      id: saved.id,
      score: analysis.score,
      scoreBreakdown: analysis.scoreBreakdown,
      summary: analysis.summary,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
    });
  } catch (error) {
    console.error("Cover letter analysis error:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}
