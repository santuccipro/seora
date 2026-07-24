import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/claude-client";
import { briefForClaude, CvSectorKey } from "@/lib/cv-criteria";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

interface GeneratePayload {
  firstName: string;
  lastName: string;
  sector: CvSectorKey;
  targetRole: string;
  companyName: string;
  companyValues?: string;
  motivation: string;
  keyExperiences: string[];
  tone?: "formal" | "modern" | "creative";
}

interface LetterContent {
  subject: string;
  paragraphs: string[];
  closing: string;
}

/**
 * POST /api/cover-letter/wizard-generate
 * Generates cover letter content via Claude.
 * Returns { subject, paragraphs, closing }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const deductResult = await prisma.user.updateMany({
    where: { id: user.id, tokens: { gte: 2 } },
    data: { tokens: { decrement: 2 } },
  });
  if (deductResult.count === 0) {
    return NextResponse.json({ error: "Pas assez de tokens. Achetez des tokens pour continuer." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as GeneratePayload | null;
  if (!body?.motivation || !body?.targetRole || !body?.companyName) {
    return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
  }

  const brief = briefForClaude(body.sector);
  const toneGuide = body.tone === "modern"
    ? "Ton moderne et dynamique, phrases courtes et percutantes, vouvoiement."
    : body.tone === "creative"
    ? "Ton créatif et personnel, avec une accroche mémorable, vouvoiement."
    : "Ton formel et professionnel, phrases structurées, vouvoiement.";

  const companyContext = body.companyValues
    ? `L'entreprise visée : ${body.companyName}. Ce que le candidat sait d'elle : ${body.companyValues}`
    : `Entreprise visée : ${body.companyName}.`;

  const prompt = `Tu es un expert en rédaction de lettres de motivation en français pour le marché de l'emploi français.

${brief}

${toneGuide}

${companyContext}
Poste visé : ${body.targetRole}
Candidat : ${body.firstName} ${body.lastName}

Motivation principale du candidat (brut, à réécrire pro) :
${body.motivation}

Expériences/atouts clés à valoriser :
${body.keyExperiences.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Écris une lettre de motivation complète, en 3 à 4 paragraphes, parfaitement adaptée au secteur et au ton demandé.

IMPORTANT : Réponds UNIQUEMENT en JSON valide, sans markdown, sans balises, avec cette structure exacte :
{
  "subject": "Candidature au poste de [poste] — [secteur court]",
  "paragraphs": [
    "Premier paragraphe : accroche, pourquoi cette entreprise spécifiquement.",
    "Deuxième paragraphe : ce que tu apportes, expériences clés chiffrées, compétences.",
    "Troisième paragraphe : adéquation avec les valeurs/culture de l'entreprise.",
    "Quatrième paragraphe (optionnel) : disponibilité entretien, ouverture."
  ],
  "closing": "Dans l'attente de votre retour, je reste à votre disposition pour un entretien à votre convenance. Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
}`;

  try {
    const result = await callClaudeJSON<LetterContent>(prompt, {
      system: "Tu es un expert CV/lettre de motivation français. Tu réponds toujours en JSON valide uniquement, sans markdown.",
      model: "claude-sonnet-4-6",
      timeoutMs: 60_000,
    });
    return NextResponse.json(result);
  } catch (err) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { increment: 2 } },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur Claude" },
      { status: 500 }
    );
  }
}
