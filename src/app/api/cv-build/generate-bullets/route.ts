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

  const body = await req.json().catch(() => null) as {
    role?: string; company?: string; sector?: string; targetRole?: string;
  } | null;

  if (!body?.role?.trim()) {
    return NextResponse.json({ error: "Intitulé de poste requis" }, { status: 400 });
  }

  const brief = briefForClaude((body.sector as CvSectorKey) ?? "generique");

  const prompt = `${brief}

Génère exactement 3 bullets de CV percutants et professionnels pour ce poste.

Poste : ${body.role}${body.company ? `\nEntreprise : ${body.company}` : ""}${body.targetRole ? `\nPoste visé à terme : ${body.targetRole}` : ""}

Règles strictes :
- Commence chaque bullet par un verbe d'action au passé (Développé, Géré, Piloté, Réalisé, etc.)
- Au moins 2 des 3 bullets doivent contenir un chiffre ou un % pour montrer l'impact
- Sois concret et spécifique au secteur
- Une seule phrase par bullet, max 120 caractères
- Réponds UNIQUEMENT avec 3 lignes, une par bullet, sans numérotation ni tirets ni guillemets`;

  try {
    const raw = (await callClaude(prompt, { system: "Tu es un expert en rédaction de CV français.", model: "claude-sonnet-4-6", timeoutMs: 30_000 })).trim();
    const bullets = raw.split("\n").map((l: string) => l.replace(/^[-•·*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 4);
    if (!bullets.length) throw new Error("Réponse vide");
    return NextResponse.json({ bullets });
  } catch {
    return NextResponse.json({ error: "Génération impossible" }, { status: 500 });
  }
}
