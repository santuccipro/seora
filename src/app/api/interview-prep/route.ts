import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaudeJSON } from "@/lib/claude-client";
import { briefForClaude } from "@/lib/cv-criteria";
import type { CvSectorKey } from "@/lib/cv-criteria";
import { captureError } from "@/lib/sentry";

export const runtime = "nodejs";
export const maxDuration = 120;

interface PrepPayload {
  sector: string;
  position: string;
  companyName?: string;
  experienceLevel?: "junior" | "senior" | "executive";
}

interface PrepQuestion {
  question: string;
  category: "comportemental" | "technique" | "motivation" | "situation";
  difficulty: "facile" | "moyen" | "difficile";
  tip: string;
  sampleAnswer: string;
}

interface PrepResult {
  questions: PrepQuestion[];
  globalTips: string[];
  redFlags: string[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: 1 } },
      data: { tokens: { decrement: 1 } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json({ error: "Pas assez de tokens. Achetez des tokens pour continuer." }, { status: 403 });
    }

    const body = (await req.json()) as PrepPayload;
    const { sector, position, companyName, experienceLevel } = body;

    if (!sector || !position) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: 1 } } });
      return NextResponse.json(
        { error: "Secteur et poste requis" },
        { status: 400 }
      );
    }

    const sectorBrief = briefForClaude(sector as CvSectorKey);
    const levelLabel =
      experienceLevel === "junior"
        ? "profil junior (0-3 ans)"
        : experienceLevel === "senior"
        ? "profil senior (3-8 ans)"
        : experienceLevel === "executive"
        ? "profil executive (8+ ans)"
        : "profil générique";

    const prompt = `Tu es un expert en recrutement et coaching carrière en France. Génère des questions d'entretien pour :

Poste visé : ${position}
${companyName ? `Entreprise : ${companyName}` : ""}
Niveau : ${levelLabel}

CONTEXTE SECTORIEL :
${sectorBrief}

Génère exactement 8 questions d'entretien réparties ainsi :
- 2 questions comportementales (méthode STAR, basées sur le vécu)
- 2 questions techniques (compétences métier du secteur)
- 2 questions de motivation (pourquoi ce poste/cette entreprise)
- 2 questions situationnelles (mise en situation concrète)

Pour chaque question, fournis :
- La question précise et pertinente pour le poste
- La catégorie : exactement "comportemental" ou "technique" ou "motivation" ou "situation"
- La difficulté : exactement "facile" ou "moyen" ou "difficile"
- Un conseil pratique pour bien répondre (tip, 1-2 phrases)
- Un exemple de réponse structurée STAR (sampleAnswer, 3-4 phrases concrètes)

Réponds UNIQUEMENT en JSON valide (aucun texte avant ou après) :
{
  "questions": [
    {
      "question": "string",
      "category": "comportemental",
      "difficulty": "facile",
      "tip": "string",
      "sampleAnswer": "string"
    }
  ],
  "globalTips": ["conseil 1", "conseil 2", "conseil 3", "conseil 4"],
  "redFlags": ["erreur à éviter 1", "erreur à éviter 2", "erreur à éviter 3"]
}

Les globalTips : 3-4 conseils généraux pour réussir cet entretien (spécifiques au secteur et niveau).
Les redFlags : 2-3 erreurs communes à éviter pour ce type de poste/secteur.
Tout en français, ton direct et actionnable.`;

    try {
      const result = await callClaudeJSON<PrepResult>(prompt, {
        system:
          "Tu es un expert en recrutement et préparation d'entretien en France. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après le JSON.",
        timeoutMs: 110_000,
      });

      // Save session (fire-and-forget)
      prisma.interviewPrepSession.create({
        data: {
          userId: user.id,
          sector,
          position,
          companyName: companyName ?? null,
          experienceLevel: experienceLevel ?? null,
          questions: JSON.stringify(result.questions),
          globalTips: JSON.stringify(result.globalTips),
          redFlags: JSON.stringify(result.redFlags),
          tokensUsed: 1,
        },
      }).catch(() => {});

      return NextResponse.json(result);
    } catch (innerErr) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: 1 } } });
      throw innerErr;
    }
  } catch (err) {
    captureError(err, { route: "interview-prep" });
    console.error("[interview-prep]", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération" },
      { status: 500 }
    );
  }
}
