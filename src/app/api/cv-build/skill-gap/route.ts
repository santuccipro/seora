import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SkillGapResult {
  matches: string[];
  missing: string[];
  bonus: string[];
}

export async function POST(req: NextRequest) {
  const { skills, offerText, role, sector } = await req.json() as {
    skills: string[];
    offerText: string;
    role: string;
    sector: string;
  };

  if (!offerText?.trim() || !skills?.length) {
    return NextResponse.json({ matches: [], missing: [], bonus: [] });
  }

  const prompt = `Tu analyses l'adéquation entre les compétences d'un candidat et une offre d'emploi.

Poste visé : ${role} (secteur : ${sector})

Compétences du candidat :
${skills.map((s) => `- ${s}`).join("\n")}

Texte de l'offre :
${offerText.slice(0, 2000)}

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "matches": ["skill1", "skill2"],
  "missing": ["skill3", "skill4"],
  "bonus": ["skill5"]
}

Règles :
- "matches" : utilise les noms EXACTS tels qu'ils apparaissent dans la liste du candidat (max 10)
- "missing" : compétences requises par l'offre mais absentes du profil, 1-3 mots style CV pro (max 8)
- "bonus" : compétences du candidat non requises mais valorisantes pour ce poste (max 4)`;

  const result = await callClaudeJSON<SkillGapResult>(prompt, { model: "claude-sonnet-4-6", timeoutMs: 25_000 });

  return NextResponse.json(result);
}
