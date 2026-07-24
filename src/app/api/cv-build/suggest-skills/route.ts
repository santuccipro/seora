import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaude } from "@/lib/claude-client";
import { briefForClaude, CvSectorKey } from "@/lib/cv-criteria";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { sector?: string; targetRole?: string } | null;
  const sector = (body?.sector ?? "generique") as CvSectorKey;
  const targetRole = body?.targetRole?.trim() ?? "";

  const brief = briefForClaude(sector);

  const prompt = `${brief}

Liste exactement 10 compétences techniques (hard skills) pertinentes pour ce profil.

Poste visé : ${targetRole || "non précisé"}

Règles :
- Compétences concrètes et mesurables (outils, méthodes, logiciels, frameworks, certifications...)
- Pas de soft skills (pas de "communication", "leadership", "organisation")
- Format court : 1 à 4 mots par compétence
- Variées : mix outils métier, techniques sectorielles, outils transverses
- Réponds UNIQUEMENT avec 10 lignes, une compétence par ligne, sans numérotation ni tirets`;

  try {
    const raw = (await callClaude(prompt, {
      system: "Tu es expert RH et rédaction de CV français. Réponds en français.",
      model: "claude-sonnet-4-6",
      timeoutMs: 55_000,
    })).trim();

    const skills = raw
      .split("\n")
      .map((l) => l.replace(/^[-•·*\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 10);

    if (!skills.length) throw new Error("empty");
    return NextResponse.json({ skills });
  } catch {
    return NextResponse.json({ error: "Génération impossible" }, { status: 500 });
  }
}
