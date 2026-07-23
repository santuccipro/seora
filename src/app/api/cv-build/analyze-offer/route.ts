import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaude } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { offerText?: string } | null;
  if (!body?.offerText?.trim() || body.offerText.length < 50) {
    return NextResponse.json({ error: "Texte trop court" }, { status: 400 });
  }
  if (body.offerText.length > 8000) {
    return NextResponse.json({ error: "Texte trop long (max 8 000 caractères)" }, { status: 400 });
  }

  const system = `Tu es un expert en recrutement et en CV. Analyse une offre d'emploi et réponds UNIQUEMENT en JSON valide, sans markdown, sans balises, sans explication.`;

  const prompt = `Analyse cette offre d'emploi et réponds en JSON strictement dans ce format :
{
  "sector": "commerce-vente",
  "jobTitle": "Business Developer SaaS B2B",
  "keywords": ["CRM Salesforce", "prospection B2B", "négociation", "SaaS", "pipeline commercial"]
}

Secteurs possibles (choisis le plus précis) :
banque-finance, conseil-strategie, tech-dev, marketing-communication, design-creation, juridique, sante-medical, luxe-mode, industrie-ingenierie, commerce-vente, immobilier, rh-recrutement, education-formation, hotellerie-restauration, logistique-supply, generique

Règles :
- keywords : 5 à 8 compétences CONCRÈTES mentionnées dans l'offre (outils, méthodes, soft skills rares), pas de généralités
- jobTitle : intitulé normalisé du poste (tel qu'il apparaîtrait sur un CV)
- sector : le plus précis possible

Offre d'emploi :
${body.offerText.slice(0, 8000)}`;

  try {
    const raw = (await callClaude(prompt, { system, model: "claude-haiku-4-5", timeoutMs: 30_000 })).trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as { sector: string; jobTitle: string; keywords: string[] };
    if (!parsed.sector || !parsed.jobTitle || !Array.isArray(parsed.keywords)) {
      throw new Error("Format invalide");
    }
    return NextResponse.json({
      sector: parsed.sector,
      jobTitle: parsed.jobTitle,
      keywords: parsed.keywords.slice(0, 8),
    });
  } catch {
    return NextResponse.json({ error: "Analyse impossible — reformule ou raccourcis l'offre" }, { status: 500 });
  }
}
