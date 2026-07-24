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

  const body = await req.json().catch(() => null) as {
    bullets?: string[];
    offerText?: string;
    role?: string;
    sector?: string;
  } | null;

  if (!body?.bullets?.length || !body?.offerText?.trim()) {
    return NextResponse.json({ error: "Bullets et offre requis" }, { status: 400 });
  }

  const existingBullets = body.bullets.filter((b) => b.trim()).join("\n");
  if (!existingBullets) {
    return NextResponse.json({ error: "Aucun bullet existant à réécrire" }, { status: 400 });
  }

  const prompt = `Tu es un expert CV français. Réécris ces bullets de CV pour les adapter à l'offre d'emploi ci-dessous.

RÈGLES STRICTES :
- Garde tous les faits, chiffres et résultats existants
- Intègre naturellement les mots-clés pertinents de l'offre
- Commence chaque bullet par un verbe d'action au passé (Développé, Géré, Piloté, etc.)
- Max 130 caractères par bullet
- Ton professionnel français, pas anglicisé
- Réponds UNIQUEMENT avec les bullets réécrits, un par ligne, sans numérotation

${body.role ? `Poste visé : ${body.role}\n` : ""}
BULLETS ACTUELS :
${existingBullets}

OFFRE D'EMPLOI (extrais les mots-clés pertinents) :
${body.offerText.slice(0, 3000)}`;

  try {
    const raw = (await callClaude(prompt, {
      system: "Tu es un expert en rédaction de CV français. Tu réécris des bullets en intégrant les mots-clés d'une offre sans dénaturer les faits.",
      model: "claude-sonnet-4-6",
      timeoutMs: 30_000,
    })).trim();

    const bullets = raw
      .split("\n")
      .map((l) => l.replace(/^[-•·\d.)\s]+/, "").trim())
      .filter((l) => l.length > 0)
      .slice(0, body.bullets!.length + 1);

    if (!bullets.length) {
      return NextResponse.json({ error: "Réécriture impossible — réessaie" }, { status: 500 });
    }

    return NextResponse.json({ bullets });
  } catch (err) {
    console.error("[rewrite-bullets]", err);
    return NextResponse.json({ error: "Erreur serveur — réessaie" }, { status: 500 });
  }
}
