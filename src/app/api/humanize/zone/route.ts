import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN_COST = 1;

const SYSTEM_PROMPT = `Tu es un expert en réécriture de texte académique. Tu dois réécrire le texte fourni de façon à ce qu'il ne soit plus détecté comme généré par IA (GPTZero, Sapling, Originality, Compilatio), tout en conservant le sens, les informations et le niveau académique.

Règles STRICTES :
- Varie la longueur des phrases (certaines courtes, certaines longues — comme un humain)
- Remplace les connecteurs typiques de l'IA ("Par ailleurs", "En effet", "De plus", "Ainsi") par des formulations plus naturelles
- Introduis des légères imperfections stylistiques humaines (reformulations moins parfaites, tournures idiomatiques)
- Conserve TOUT le sens et les informations factuelles
- Conserve la même langue (FR/EN/ES)
- Ne résume PAS — tu dois garder la même quantité d'information
- Renvoie UNIQUEMENT le texte réécrit, sans préambule ni explication`;

function buildPrompt(text: string, language: string): string {
  const langHint = language === "fr" ? "en français" : language === "en" ? "in English" : "en español";
  return `Réécris ce paragraphe ${langHint} pour qu'il soit moins détectable comme IA. Garde exactement le même sens :\n\n${text}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const language = ["fr", "en", "es"].includes(body.language) ? body.language : "fr";

    if (!text || text.length < 20) {
      return NextResponse.json({ error: "Texte trop court" }, { status: 400 });
    }
    if (text.length > 3000) {
      return NextResponse.json({ error: "Zone trop longue (max 3000 caractères)" }, { status: 400 });
    }

    // Deduct token atomically
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Pas assez de tokens (coût : ${TOKEN_COST} token).` },
        { status: 403 }
      );
    }

    try {
      const humanized = await callClaude(buildPrompt(text, language), {
        system: SYSTEM_PROMPT,
        model: "claude-sonnet-4-6",
        timeoutMs: 45_000,
      });

      return NextResponse.json({ humanizedText: humanized.trim() });
    } catch (err) {
      // Refund on Claude failure
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur Claude" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[api/humanize/zone]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
