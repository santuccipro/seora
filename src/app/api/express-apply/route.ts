import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaudeJSON } from "@/lib/claude-client";
import { briefForClaude } from "@/lib/cv-criteria";
import type { CvSectorKey } from "@/lib/cv-criteria";
import { captureError } from "@/lib/sentry";

export const runtime = "nodejs";
export const maxDuration = 180;

const TOKEN_COST = 3;

interface ExpressPayload {
  jobOffer: string;       // Full job offer text, max 3000 chars
  sector: string;         // CvSectorKey
  userContext?: string;   // Optional: user's current situation (formation, XP, etc.)
}

interface ExpressResult {
  adaptedSummary: string;         // CV summary optimized for the offer
  keywordsToAdd: string[];        // Keywords from offer to add to CV
  coverLetter: string;            // Full cover letter ready to use
  interviewTips: Array<{
    tip: string;
    why: string;
  }>;
  matchScore: number;             // 0-100 how well profile matches offer
  companyCulture: string;         // 1-2 sentences on company culture inferred from offer
  redFlags: string[];             // Potential issues with candidature
}

export async function POST(req: NextRequest) {
  let deductedUserId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json({ error: "Pas assez de tokens. Il en faut 3 pour la Candidature Express." }, { status: 403 });
    }
    deductedUserId = user.id;

    const body = (await req.json()) as ExpressPayload;
    const { jobOffer, sector, userContext } = body;

    if (!jobOffer || jobOffer.length < 100 || jobOffer.length > 3000) {
      return NextResponse.json({ error: "L'offre doit faire entre 100 et 3000 caractères." }, { status: 400 });
    }
    if (!sector) {
      return NextResponse.json({ error: "Secteur requis." }, { status: 400 });
    }

    const sectorBrief = briefForClaude(sector as CvSectorKey);

    const prompt = `Tu es un expert en recrutement et coaching carrière en France. Analyse cette offre d'emploi et génère un kit de candidature complet pour un candidat français.

=== OFFRE D'EMPLOI ===
${jobOffer}

=== SECTEUR ===
${sectorBrief}

${userContext ? `=== CONTEXTE DU CANDIDAT ===\n${userContext}\n` : ""}

=== INSTRUCTIONS ===
Génère un kit complet pour postuler à cette offre :

1. **adaptedSummary** : Un résumé de CV optimisé pour cette offre (120-150 mots, à la 1ère personne, intègre les mots-clés de l'offre, met en avant les compétences demandées, ton direct et professionnel).

2. **keywordsToAdd** : 6-8 mots-clés/compétences de l'offre que le candidat DOIT mentionner dans son CV.

3. **coverLetter** : Une lettre de motivation complète (300-400 mots), structure : accroche → pourquoi ce poste → ce que j'apporte → conclusion. Ton : professionnel mais humain, pas de clichés IA. Utilise "Madame, Monsieur," en entête. Termine par "Cordialement,".

4. **interviewTips** : 5 conseils spécifiques pour l'entretien de CE poste (pas des conseils génériques). Pour chaque conseil : action concrète + pourquoi ça marche pour ce recruteur.

5. **matchScore** : Score 0-100 estimant à quel point un profil junior/étudiant correspond à cette offre.

6. **companyCulture** : 1-2 phrases sur la culture d'entreprise inférée de l'offre (vocabulaire, valeurs).

7. **redFlags** : 2-3 points d'attention ou difficultés potentielles pour ce type de candidature.

Réponds UNIQUEMENT en JSON valide :
{
  "adaptedSummary": "...",
  "keywordsToAdd": ["...", "..."],
  "coverLetter": "...",
  "interviewTips": [{"tip": "...", "why": "..."}, ...],
  "matchScore": 75,
  "companyCulture": "...",
  "redFlags": ["...", "..."]
}`;

    const result = await callClaudeJSON<ExpressResult>(prompt, {
      model: "claude-sonnet-4-6",
      timeoutMs: 170_000,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (deductedUserId) {
      await prisma.user.update({ where: { id: deductedUserId }, data: { tokens: { increment: TOKEN_COST } } }).catch(() => {});
    }
    captureError(err, { route: "express-apply", userId: deductedUserId ?? undefined });
    console.error("[express-apply]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
