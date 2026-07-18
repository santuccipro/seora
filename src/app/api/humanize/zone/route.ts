import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 90;

const TOKEN_COST = 1;

// Cyrillic homoglyphs — injected post-rewrite for AI detector evasion
// Same approach as the PDF humanizer v15.
const CYRILLIC_SUBSTITUTIONS: Record<string, string> = {
  'a': 'а', // U+0430
  'e': 'е', // U+0435
  'o': 'о', // U+043E
  'p': 'р', // U+0440
  'c': 'с', // U+0441
  'x': 'х', // U+0445
  'A': 'А', // U+0410
  'B': 'В', // U+0412
  'E': 'Е', // U+0415
  'H': 'Н', // U+041D
  'K': 'К', // U+041A
  'M': 'М', // U+041C
  'O': 'О', // U+041E
  'P': 'Р', // U+0420
  'C': 'С', // U+0421
  'T': 'Т', // U+0422
  'X': 'Х', // U+0425
};

// Inject Cyrillic homoglyphs into ~25% of eligible characters in content words.
// Skips punctuation, numbers, proper nouns starting after first letter.
function injectCyrillic(text: string): string {
  const words = text.split(/(\s+)/);
  let wordCount = 0;
  return words.map((token) => {
    // Keep whitespace tokens unchanged
    if (/^\s+$/.test(token)) return token;
    wordCount++;
    // Only inject in every 3rd word minimum, and skip short words (<3 chars)
    if (wordCount % 3 !== 0 || token.length < 3) return token;
    // Don't touch the first character (preserve capitalisation readability)
    const chars = token.split('');
    let substituted = false;
    for (let i = 1; i < chars.length; i++) {
      const sub = CYRILLIC_SUBSTITUTIONS[chars[i]];
      if (sub && !substituted && Math.random() < 0.55) {
        chars[i] = sub;
        substituted = true; // max 1 substitution per word to stay subtle
      }
    }
    return chars.join('');
  }).join('');
}

// usage_server (Mac mini claude --print) does not reliably apply system prompts.
// All Rewordify instructions go in the user message to guarantee fast, clean output.
function buildPrompt(text: string, language: string): string {
  if (language === "en") {
    return `Rewrite this text replacing approximately 35% of the words with contextual synonyms. Keep the same sentence structure, register and tone. Preserve proper nouns, dates and numbers. IMPORTANT: reply with ONLY the rewritten text, no explanation, no list, no markdown, no title.\n\nText:\n${text}`;
  }
  if (language === "es") {
    return `Reescribe este texto reemplazando aproximadamente el 35% de las palabras por sinónimos contextuales. Mantén la misma estructura, registro y tono. Conserva nombres propios, fechas y cifras. IMPORTANTE: responde con SOLO el texto reescrito, sin explicación, lista, markdown ni título.\n\nTexto:\n${text}`;
  }
  return `Réécris ce texte en remplaçant environ 35% des mots par des synonymes contextuels appropriés. Garde exactement la même structure de phrase, le même registre et le même ton. Conserve les noms propres, dates et chiffres. IMPORTANT: réponds avec SEULEMENT le texte réécrit, sans aucune explication, liste, titre ou markdown.\n\nTexte :\n${text}`;
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
    const withCyrillic = body.cyrillic !== false; // true by default

    if (!text || text.length < 20) {
      return NextResponse.json({ error: "Texte trop court" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Zone trop longue (max 2000 caractères)" }, { status: 400 });
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
      const reworded = await callClaude(buildPrompt(text, language), {
        system: "",
        model: "claude-sonnet-4-6",
        timeoutMs: 40_000,
      });

      const humanizedText = withCyrillic
        ? injectCyrillic(reworded.trim())
        : reworded.trim();

      return NextResponse.json({ humanizedText });
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
