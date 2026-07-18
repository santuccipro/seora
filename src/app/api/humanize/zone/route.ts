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

const SYSTEM_FR = `Tu es Rewordify pour le français académique. Tu reçois un paragraphe et tu le réécris en remplaçant environ 35% des mots par des synonymes contextuels appropriés.

RÈGLES STRICTES :
- Garde EXACTEMENT la même structure de phrase et le même ordre des idées
- Garde EXACTEMENT le même registre et le même ton (ne rends pas le texte plus familier, ni plus formel)
- Remplace seulement les mots — ne reformule pas les phrases en entier
- Conserve toutes les informations factuelles (noms propres, dates, chiffres, institutions)
- Ne résume pas, ne développe pas — même longueur approximative
- Ne change PAS le sens des phrases
- Renvoie UNIQUEMENT le texte réécrit, sans préambule ni explication`;

const SYSTEM_EN = `You are Rewordify for academic English. Replace approximately 35% of words with contextual synonyms.

STRICT RULES:
- Keep EXACTLY the same sentence structure and order of ideas
- Keep EXACTLY the same register and tone
- Only replace words — do not reformulate entire sentences
- Preserve all factual information (proper nouns, dates, numbers, institutions)
- Same approximate length — do not summarize or expand
- Return ONLY the rewritten text, no preamble`;

const SYSTEM_ES = `Eres Rewordify para español académico. Reemplaza aproximadamente el 35% de las palabras con sinónimos contextuales.

REGLAS ESTRICTAS:
- Mantén EXACTAMENTE la misma estructura y orden de ideas
- Mantén EXACTAMENTE el mismo registro y tono
- Solo reemplaza palabras — no reformules frases enteras
- Conserva toda la información factual
- Misma longitud aproximada
- Devuelve SOLO el texto reescrito, sin preámbulo`;

const SYSTEM: Record<string, string> = { fr: SYSTEM_FR, en: SYSTEM_EN, es: SYSTEM_ES };

// Split text into sentence-level chunks of ≤ MAX_CHUNK_CHARS each.
// Mac mini claude --print hangs on long prompts; chunking keeps each call short.
const MAX_CHUNK_CHARS = 500;

function splitChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current && (current + s).length > MAX_CHUNK_CHARS) {
      chunks.push(current.trimEnd());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trimEnd());
  return chunks.length ? chunks : [text];
}

function buildPrompt(text: string, language: string): string {
  if (language === "fr") {
    return `Remplace environ 35% des mots de ce paragraphe par des synonymes en gardant la même structure :\n\n${text}`;
  }
  if (language === "en") {
    return `Replace approximately 35% of the words in this paragraph with synonyms while keeping the same structure:\n\n${text}`;
  }
  return `Reemplaza aproximadamente el 35% de las palabras de este párrafo por sinónimos manteniendo la misma estructura:\n\n${text}`;
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
      const chunks = splitChunks(text);
      const sys = SYSTEM[language] ?? SYSTEM_FR;
      const rewordedParts: string[] = [];
      for (const chunk of chunks) {
        const part = await callClaude(buildPrompt(chunk, language), {
          system: sys,
          model: "claude-sonnet-4-6",
          timeoutMs: 30_000,
        });
        rewordedParts.push(part.trim());
      }
      const reworded = rewordedParts.join(" ");

      const humanizedText = withCyrillic
        ? injectCyrillic(reworded)
        : reworded;

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
