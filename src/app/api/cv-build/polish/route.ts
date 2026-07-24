import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaude } from "@/lib/claude-client";
import { briefForClaude, CvSectorKey } from "@/lib/cv-criteria";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/cv-build/polish
 *
 * Rewrites a single CV field (summary or bullet) so it reads pro, sector-
 * aware and ATS-friendly. Free while iterating — no token cost.
 *
 * Body:
 *   { kind: "summary" | "bullet",
 *     sector: CvSectorKey,
 *     targetRole: string,
 *     text: string,
 *     role?: string,          // for bullet only, current job title
 *     company?: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as
    | { kind: "summary" | "bullet" | "diploma"; sector: CvSectorKey; targetRole: string; text: string; role?: string; company?: string }
    | null;
  if (!body || !body.text || !body.kind) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const brief = briefForClaude(body.sector);

  let system: string;
  let prompt: string;

  if (body.kind === "diploma") {
    system = "Tu es expert en rédaction de CV français haut de gamme. Tu réponds UNIQUEMENT par le titre reformulé, sans guillemets ni ponctuation finale.";
    prompt = `Reformule ce titre de diplôme pour qu'il soit plus percutant et professionnel sur un CV, sans en changer le niveau ni le domaine. Ajoute une spécialisation crédible si pertinente. Maximum 80 caractères.

Titre actuel : ${body.text}
Secteur cible : ${body.sector ?? "généraliste"}`;
  } else {
    system = body.kind === "summary"
      ? `Tu es un coach CV français expert. Réécris ce résumé pro en 2 à 4 phrases naturelles et impactantes, adaptées au secteur visé. Tu répondras UNIQUEMENT par le résumé réécrit, sans commentaire.`
      : `Tu es un coach CV français expert. Réécris ce bullet en une seule phrase, commencée par un verbe d'action fort, chiffrée si possible, adaptée au secteur visé. Tu répondras UNIQUEMENT par la phrase réécrite, sans commentaire, sans guillemets, sans point final si le bullet original n'en a pas.`;

    const contextLine = body.kind === "bullet" && body.role && body.company
      ? `Poste actuel du candidat : ${body.role} @ ${body.company}. Poste visé : ${body.targetRole}.\n\n`
      : `Poste visé : ${body.targetRole}.\n\n`;

    prompt = `${brief}\n\n${contextLine}Texte original du candidat :\n${body.text}`;
  }

  try {
    const out = (await callClaude(prompt, { system, model: "claude-sonnet-4-6", timeoutMs: 40_000 })).trim();
    return NextResponse.json({ text: out });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur Claude" },
      { status: 500 }
    );
  }
}
