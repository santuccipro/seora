import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface LinkedInExtract {
  firstName?: string;
  lastName?: string;
  role?: string;
  city?: string;
  linkedin?: string;
  summary?: string;
  experiences?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  educations?: Array<{
    degree: string;
    school: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills?: string[];
  languages?: Array<{ name: string; level?: string }>;
}

/**
 * POST /api/cv-build/linkedin-import
 * Accepts { linkedinText: string } — pasted LinkedIn profile text.
 * Returns a LinkedInExtract object with structured data.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { linkedinText?: string } | null;
  if (!body?.linkedinText || body.linkedinText.trim().length < 50) {
    return NextResponse.json({ error: "Texte LinkedIn trop court (min 50 caractères)" }, { status: 400 });
  }

  const prompt = `Tu es un extracteur de données LinkedIn. À partir du texte brut suivant (copié-collé depuis LinkedIn), extrais les informations structurées. Si une info n'est pas présente, omet le champ. Retourne UNIQUEMENT du JSON valide.

Texte LinkedIn :
${body.linkedinText.slice(0, 3000)}

Structure JSON attendue (omet les champs absents) :
{
  "firstName": "Prénom",
  "lastName": "Nom",
  "role": "Titre du profil / poste actuel",
  "city": "Ville",
  "linkedin": "URL LinkedIn si présente",
  "summary": "Résumé / accroche pro",
  "experiences": [
    {
      "title": "Intitulé du poste",
      "company": "Entreprise",
      "location": "Ville",
      "startDate": "Mois Année",
      "endDate": "Mois Année ou En cours",
      "description": "Description (1-2 phrases)"
    }
  ],
  "educations": [
    {
      "degree": "Diplôme",
      "school": "Établissement",
      "location": "Ville",
      "startDate": "Année",
      "endDate": "Année"
    }
  ],
  "skills": ["Compétence 1", "Compétence 2"],
  "languages": [
    { "name": "Anglais", "level": "C1" }
  ]
}`;

  try {
    const result = await callClaudeJSON<LinkedInExtract>(prompt, {
      system: "Tu es un extracteur de données structurées. Tu réponds uniquement en JSON valide, sans markdown ni commentaires.",
      model: "claude-sonnet-4-6",
      timeoutMs: 30_000,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur extraction" },
      { status: 500 }
    );
  }
}
