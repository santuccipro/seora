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

interface LinkedInPayload {
  profileText: string;
  targetSector: string;
  targetRole: string;
  targetLevel: "stage" | "alternance" | "junior" | "senior" | "executive";
  currentSituation: string;
}

export interface LinkedInAnalysis {
  globalScore: number;
  scoreBreakdown: {
    titre: number;
    resume: number;
    experiences: number;
    competences: number;
    formation: number;
  };
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  rewrittenTitle: string;
  rewrittenSummary: string;
  missingKeywords: string[];
  recommendedSkills: string[];
  quickWins: Array<{
    action: string;
    impact: "faible" | "moyen" | "fort";
    timeEstimate: string;
  }>;
  recruiterInsight: string;
  competitorComparison: string;
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

    const body = (await req.json()) as LinkedInPayload;
    const { profileText, targetSector, targetRole, targetLevel, currentSituation } = body;

    if (!profileText || profileText.length < 200 || profileText.length > 5000) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: 1 } } });
      return NextResponse.json(
        { error: "Le texte du profil doit faire entre 200 et 5000 caractères." },
        { status: 400 }
      );
    }
    if (!targetSector || !targetRole || !targetLevel || !currentSituation) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: 1 } } });
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const sectorBrief = briefForClaude(targetSector as CvSectorKey);

    const levelGuide: Record<string, string> = {
      stage: "Le candidat cherche un STAGE (< 6 mois). Adapte les conseils pour un étudiant sans expérience pro significative : valorise les projets académiques, associations, compétences techniques, softskills. Le ton doit refléter la motivation et le potentiel.",
      alternance: "Le candidat cherche une ALTERNANCE. Mets l'accent sur les compétences techniques acquises en formation, la capacité d'apprentissage rapide, et la disponibilité immédiate. Conseille de montrer l'école et le rythme d'alternance.",
      junior: "Le candidat est JUNIOR (0-3 ans d'expérience). Focus sur les premières expériences concrètes, l'impact chiffré même modeste, la montée en compétences rapide. Les recruteurs cherchent du potentiel + premiers résultats.",
      senior: "Le candidat est SENIOR (3-10 ans). Les recruteurs attendent des réalisations significatives, du leadership, des chiffres d'impact concrets. Le profil LinkedIn doit inspirer confiance immédiatement.",
      executive: "Le candidat vise un poste EXECUTIVE / DIRECTION. Le profil doit rayonner de crédibilité, d'impact business à grande échelle, de vision stratégique. Chaque mot compte. Pas de détail inutile.",
    };

    const prompt = `Tu es un expert LinkedIn et coach carrière spécialisé en recrutement en France. Analyse ce profil LinkedIn et génère des recommandations ultra-personnalisées.

=== CONTEXTE ===
Poste visé : ${targetRole}
Niveau : ${targetLevel}
Situation actuelle : ${currentSituation}
${levelGuide[targetLevel] ?? ""}

=== CRITÈRES SECTEUR ===
${sectorBrief}

=== PROFIL LINKEDIN DU CANDIDAT ===
${profileText}

=== INSTRUCTIONS D'ANALYSE ===
Analyse ce profil en profondeur. Sois CONCRET et SPÉCIFIQUE : tes recommandations doivent s'appuyer sur le contenu réel du profil, pas sur des généralités.

Pour le "rewrittenSummary" : écris en français, à la première personne, 200-300 mots, comme si c'était le candidat qui écrivait. Adapte le style au secteur (sobre pour finance/juridique, punchy pour tech/marketing). Aucun cliché IA ("passionné par", "dynamique", "polyvalent"). Commence par une accroche forte, donne des exemples concrets, termine par une phrase d'intention professionnelle.

Pour le "rewrittenTitle" : max 220 caractères, headline LinkedIn optimisée qui dépasse le simple intitulé de poste — intègre des mots-clés sectoriels et différencie le candidat.

Pour les "quickWins" : actions GENUINEMENT actionnables en moins de 5 minutes aujourd'hui. Pas "mettez à jour votre photo". Des actions concrètes basées sur ce que tu as vu manquer dans CE profil.

Les scores doivent s'additionner exactement à globalScore (titre 0-20 + resume 0-20 + experiences 0-20 + competences 0-20 + formation 0-20 = globalScore).

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans texte avant ou après) :

{
  "globalScore": <number 0-100>,
  "scoreBreakdown": {
    "titre": <number 0-20>,
    "resume": <number 0-20>,
    "experiences": <number 0-20>,
    "competences": <number 0-20>,
    "formation": <number 0-20>
  },
  "verdict": "<1 phrase directe sur l'état actuel du profil>",
  "strengths": ["<force 1>", "<force 2>", "<force 3>"],
  "weaknesses": ["<faiblesse 1>", "<faiblesse 2>", "<faiblesse 3>"],
  "rewrittenTitle": "<nouveau titre LinkedIn optimisé, max 220 chars>",
  "rewrittenSummary": "<nouveau À propos rédigé à la 1ère personne, 200-300 mots, français, sector-aware>",
  "missingKeywords": ["<mot-clé 1>", "<mot-clé 2>", "<mot-clé 3>", "<mot-clé 4>", "<mot-clé 5>", "<mot-clé 6>"],
  "recommendedSkills": ["<compétence 1>", "<compétence 2>", "<compétence 3>", "<compétence 4>", "<compétence 5>"],
  "quickWins": [
    { "action": "<action concrète 1>", "impact": "fort", "timeEstimate": "<durée>" },
    { "action": "<action concrète 2>", "impact": "moyen", "timeEstimate": "<durée>" },
    { "action": "<action concrète 3>", "impact": "moyen", "timeEstimate": "<durée>" }
  ],
  "recruiterInsight": "<Ce qu'un recruteur ${targetSector} pense réellement en lisant ce profil — honnête, direct, constructif>",
  "competitorComparison": "<Comparé aux autres candidats pour ce type de poste, ton profil... — analyse honnête des forces/faiblesses compétitives>"
}`;

    let analysis: LinkedInAnalysis;
    try {
      analysis = await callClaudeJSON<LinkedInAnalysis>(prompt, {
        model: "claude-sonnet-4-6",
        timeoutMs: 110_000,
      });
    } catch (innerErr) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: 1 } } });
      throw innerErr;
    }

    // Ensure scoreBreakdown sums to globalScore
    const breakdown = analysis.scoreBreakdown;
    const sum =
      (breakdown.titre ?? 0) +
      (breakdown.resume ?? 0) +
      (breakdown.experiences ?? 0) +
      (breakdown.competences ?? 0) +
      (breakdown.formation ?? 0);
    if (sum !== analysis.globalScore) {
      analysis.globalScore = sum;
    }

    // Save to DB (fire-and-forget)
    prisma.linkedInAnalysis.create({
      data: {
        userId: user.id,
        targetSector,
        targetRole,
        targetLevel,
        globalScore: analysis.globalScore,
        scoreBreakdown: JSON.stringify(analysis.scoreBreakdown),
        verdict: analysis.verdict,
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        rewrittenTitle: analysis.rewrittenTitle,
        rewrittenSummary: analysis.rewrittenSummary,
        missingKeywords: JSON.stringify(analysis.missingKeywords),
        recommendedSkills: JSON.stringify(analysis.recommendedSkills),
        quickWins: JSON.stringify(analysis.quickWins),
        recruiterInsight: analysis.recruiterInsight,
        competitorComparison: analysis.competitorComparison,
        tokensUsed: 1,
      },
    }).catch(() => {}); // fire-and-forget

    return NextResponse.json(analysis);
  } catch (err) {
    captureError(err, { route: "linkedin-analyzer" });
    console.error("[linkedin-analyzer]", err);
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
