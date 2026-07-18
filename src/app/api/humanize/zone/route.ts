import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN_COST = 1;

// Calibrated on the same DPP that scored 9% on Compilatio after rewrite.
const SYSTEM_FR = `Tu es un rédacteur académique humain. Tu dois réécrire le paragraphe fourni pour qu'il soit indétectable par les détecteurs IA (GPTZero, Sapling, Originality, Compilatio, Seora), tout en conservant exactement le même sens et les mêmes informations.

━━━━━━━━━━━━━━━━━━━━━━━
INTERDITS ABSOLUS (ces patterns déclenchent TOUS les détecteurs) :
━━━━━━━━━━━━━━━━━━━━━━━
- JAMAIS de tiret long (—) ou de tiret d'énumération (-)
- JAMAIS : "Par ailleurs", "En effet", "De plus", "Ainsi", "Il convient de noter que", "Il est important de souligner", "En outre", "Dans cette perspective", "À cet égard", "Force est de constater", "Il apparaît que", "On peut noter que"
- JAMAIS de structure parallèle : "Non seulement X mais aussi Y", "D'un côté X, de l'autre Y", "Premièrement..., Deuxièmement..., Troisièmement..."
- JAMAIS d'antithèse balancée : "X n'est pas Y, c'est Z"
- JAMAIS de nominalisation abstraite en fin de phrase : "un renforcement de la fidélisation", "une optimisation des processus"
- JAMAIS trois phrases consécutives de longueur similaire

━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES OBLIGATOIRES :
━━━━━━━━━━━━━━━━━━━━━━━
1. Varie les longueurs de phrases : courtes (<8 mots) intercalées avec des longues
2. Minimum 1 marqueur personnel : "Concrètement", "Franchement", "À mon niveau", "sur le terrain", "c'est du vécu", "pour être clair", "au quotidien"
3. 1 mot de registre courant à la place d'un mot soutenu : "cramer" pour "dilapider", "base" pour "socle", "faire durer" pour "pérenniser"
4. Verbes concrets plutôt que nominalisations : "on identifie" plutôt que "l'identification de"
5. 1 digression orale : "Bon,", "Bref,", "Mais le truc c'est que", "Voilà,"
6. Commence 1 phrase par une conjonction : "Et", "Mais", "Alors"

━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLE CALIBRÉ (résultat cible : < 15 % Compilatio) :
━━━━━━━━━━━━━━━━━━━━━━━
AVANT : "Par ailleurs, les dispositifs de formation mis en place contribuent de manière significative au développement des compétences. En effet, cette approche vise à optimiser la performance des collaborateurs tout en renforçant leur engagement."
APRÈS : "Les formations déployées jouent vraiment un rôle. Concrètement, les équipes montent en compétences plus vite — et ça se voit. Franchement, l'engagement suit quand les gens sentent qu'on investit sur eux."

RENVOIE UNIQUEMENT le texte réécrit. Pas de préambule, pas d'explication.`;

const SYSTEM_EN = `You are a human academic writer. Rewrite the paragraph to be undetectable by AI detectors (GPTZero, Sapling, Originality, Compilatio), while keeping the exact same meaning and information.

BANNED: em-dashes, "Furthermore", "Moreover", "It is important to note", "In addition", "It should be noted", "It is worth mentioning", parallel structures ("Not only X but also Y"), balanced antitheses ("X is not Y, it's Z"), three consecutive equal-length sentences.

REQUIRED: Mix short sentences (<8 words) with long ones. Add 1 personal marker ("In practice", "Honestly", "From what I've seen"). Replace 1 formal word with casual. Use concrete verbs not nominalizations. Start 1 sentence with a conjunction.

Return ONLY the rewritten text, no preamble.`;

const SYSTEM_ES = `Eres un redactor académico humano. Reescribe el párrafo para que sea indetectable por detectores IA, conservando el mismo significado.

PROHIBIDO: guiones largos, "Por otra parte", "Asimismo", "Cabe destacar", "Es importante señalar", estructuras paralelas, antítesis equilibradas, tres frases consecutivas de longitud similar.

OBLIGATORIO: Mezcla frases cortas (<8 palabras) con largas. Añade 1 marcador personal. Reemplaza 1 palabra formal por coloquial. Usa verbos concretos. Empieza 1 frase con conjunción.

Devuelve SOLO el texto reescrito, sin preámbulo.`;

const SYSTEM: Record<string, string> = { fr: SYSTEM_FR, en: SYSTEM_EN, es: SYSTEM_ES };

function buildPrompt(text: string, language: string): string {
  if (language === "fr") {
    return `Réécris ce paragraphe en appliquant STRICTEMENT les règles anti-détection :\n\n${text}`;
  }
  if (language === "en") {
    return `Rewrite this paragraph applying the anti-detection rules strictly:\n\n${text}`;
  }
  return `Reescribe este párrafo aplicando estrictamente las reglas anti-detección:\n\n${text}`;
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
        system: SYSTEM[language] ?? SYSTEM_FR,
        model: "claude-sonnet-4-6",
        timeoutMs: 45_000,
      });

      return NextResponse.json({ humanizedText: humanized.trim() });
    } catch (err) {
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
