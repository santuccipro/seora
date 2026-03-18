import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCoverLetter } from "@/lib/analyze-cv";
import { researchCompany } from "@/lib/scrape-company";
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
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    if (user.tokens < 3) {
      return NextResponse.json(
        { error: "Pas assez de tokens (3 requis pour la génération de lettre)" },
        { status: 403 }
      );
    }

    const { cvAnalysisId, jobDescription, companyName, companyUrl } = await req.json();

    if (!jobDescription || !companyName) {
      return NextResponse.json(
        { error: "Description du poste et nom d'entreprise requis" },
        { status: 400 }
      );
    }

    // Get CV content
    let cvText = "";
    if (cvAnalysisId) {
      const analysis = await prisma.cVAnalysis.findUnique({
        where: { id: cvAnalysisId },
      });
      if (analysis && analysis.userId === user.id) {
        cvText = analysis.fileContent;
      }
    }

    // Research company (scrape + AI)
    const companyInfo = await researchCompany(companyName, companyUrl);
    const companyInfoText = `
Entreprise: ${companyInfo.name}
Description: ${companyInfo.description}
Secteur: ${companyInfo.sector}
Valeurs: ${companyInfo.values.join(", ")}
Produits/Services: ${companyInfo.products.join(", ")}
Culture: ${companyInfo.culture}
Taille: ${companyInfo.size}
    `.trim();

    // Generate cover letter
    const result = await generateCoverLetter(
      cvText,
      jobDescription,
      companyName,
      companyInfoText
    );

    // Save to DB
    const coverLetter = await prisma.coverLetterAnalysis.create({
      data: {
        userId: user.id,
        fileName: `Lettre - ${companyName}`,
        fileContent: jobDescription,
        score: 85, // Generated letters start with a high score
        summary: `Lettre de motivation générée pour ${companyName}`,
        strengths: JSON.stringify(result.companyInsights),
        weaknesses: JSON.stringify(result.tips),
        correctedText: result.coverLetter,
        status: "generated",
        tokensUsed: 3,
      },
    });

    // Deduct tokens
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 3 } },
    });

    return NextResponse.json({
      id: coverLetter.id,
      coverLetter: result.coverLetter,
      tips: result.tips,
      companyInsights: result.companyInsights,
      companyInfo,
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération" },
      { status: 500 }
    );
  }
}
