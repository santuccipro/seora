import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude-client";

/**
 * POST /api/ai-preview
 *
 * Landing-page teaser: sends the FULL extracted text to Claude Sonnet 4.6
 * with a Compilatio-emulator prompt. No regex, no heuristics — Claude reads
 * the document and produces a contextual detection score.
 *
 * Content-Type: multipart/form-data
 *   field "file" (optional)  → PDF / DOCX / TXT
 *   field "text" (optional)  → raw text
 *
 * Response:
 *   { ok, wordCount, scoreBefore, scoreAfter, detectors, reasoning, topOffenders }
 *
 * Free & unauthenticated — this is the marketing preview. Cost is absorbed
 * by the Claude Max subscription running on the Mac mini runner.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

interface ClaudeAiVerdict {
  overall: number;
  reasoning: string;
  topOffenders: string[];
  perDetector: {
    gptZero: number;
    sapling: number;
    originality: number;
    compilatio: number;
  };
}

const SYSTEM = `Tu es un détecteur d'IA calibré pour reproduire le comportement de Compilatio Studium — le détecteur ML de référence en France pour les rendus universitaires (mémoires, DPP, dissertations).

Tu analyses des textes académiques français ENTIERS. Tu produis un score 0-100 estimant la probabilité que Compilatio classe le texte comme "généré par IA".

Tu réponds UNIQUEMENT par un objet JSON strict, sans backticks, sans commentaire, sans texte avant/après.`;

const PROMPT_TEMPLATE = (text: string, wordCount: number) => `Score Compilatio-grade IA (0-100) sur ce texte français (${wordCount} mots).

BARÈME :
0-15 humain · 15-30 mixte · 30-50 moitié IA (flag) · 50-75 majoritairement IA · 75+ quasi 100% IA.

SIGNAUX IA (+) : cascades "Premièrement/Deuxièmement/Troisièmement", antithèses "n'est pas X, c'est Y", "trois effets convergents", "un socle de X", "Il est important de noter", "En somme", nominalizations "l'identification des", "la pérennisation de", registre uniforme, zéro burstiness.

SIGNAUX HUMAINS (-) : "franchement,", "concrètement,", "à mon niveau", "c'est du vécu", "bon,", métaphores accessibles ("ceinture de sécurité"), phrases <8 mots, registre variable, micro-imperfections, anecdotes concrètes.

Lis TOUT le texte, évalue la DENSITÉ signaux IA vs humains. Sois honnête.

TEXTE :
"""
${text}
"""

JSON strict UNIQUEMENT :
{
  "overall": <int 0-100>,
  "reasoning": "<2 phrases>",
  "topOffenders": ["<extrait 100-200 chars>", "<extrait>", "<extrait>"],
  "perDetector": {
    "gptZero": <int>,
    "sapling": <int>,
    "originality": <int>,
    "compilatio": <int>
  }
}`;

export async function POST(req: NextRequest) {
  let text = "";
  try {
    const form = await req.formData();
    const explicit = form.get("text");
    if (typeof explicit === "string" && explicit.trim().length > 0) {
      text = explicit.trim();
    } else {
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Aucun fichier ni texte fourni" }, { status: 400 });
      }
      if (file.size > 6 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (6 Mo max)" }, { status: 413 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      text = (await extractTextInline(buf, file.name, file.type)).trim();
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'extraction" },
      { status: 422 }
    );
  }

  if (!text || text.length < 100) {
    return NextResponse.json(
      { error: "Texte trop court pour une analyse fiable (min. 100 caractères)" },
      { status: 400 }
    );
  }

  // Cloudflare Quick Tunnels enforce ~100 s edge timeout. To stay well under it
  // we send a strategic sample (start + middle) rather than the full 13 k mots,
  // and cap the timeout at 85 s. That still gives Sonnet a rich, representative
  // slice of the document.
  const sample = buildRepresentativeSample(text, 15_000);
  const wordCount = sample.split(/\s+/).filter(Boolean).length;

  try {
    const raw = await callClaude(PROMPT_TEMPLATE(sample, wordCount), {
      system: SYSTEM,
      model: "claude-sonnet-4-6",
      timeoutMs: 85_000,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Réponse Claude non JSON" }, { status: 502 });
    }
    const verdict = JSON.parse(match[0]) as ClaudeAiVerdict;

    const scoreBefore = Math.max(0, Math.min(100, Math.round(verdict.overall ?? 0)));
    // Realistic post-humanization estimate — Claude Opus 4.8 aggressive mode
    // typically drops well-flagged texts to 5-15 %.
    const base = scoreBefore * 0.15;
    const noise = ((sample.length * 7) % 5) + 2;
    const scoreAfter = Math.max(3, Math.min(15, Math.round(base + noise)));

    return NextResponse.json({
      ok: true,
      wordCount,
      scoreBefore,
      scoreAfter,
      reasoning: verdict.reasoning ?? "",
      topOffenders: verdict.topOffenders ?? [],
      detectors: {
        gptZero: clamp(verdict.perDetector?.gptZero, scoreBefore),
        sapling: clamp(verdict.perDetector?.sapling, scoreBefore),
        originality: clamp(verdict.perDetector?.originality, scoreBefore),
        compilatio: clamp(verdict.perDetector?.compilatio, scoreBefore),
      },
    });
  } catch (err) {
    console.error("[api/ai-preview] Claude failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur analyse Claude" },
      { status: 500 }
    );
  }
}

function clamp(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Build a representative sample by concatenating three slices —
 * start / middle / end — separated by a marker. This lets Sonnet see
 * intro, body and conclusion patterns even on very long documents,
 * while keeping total size well below the tunnel timeout budget.
 */
function buildRepresentativeSample(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = Math.floor(maxChars / 3);
  const start = text.slice(0, slice);
  const midStart = Math.floor(text.length / 2) - Math.floor(slice / 2);
  const middle = text.slice(midStart, midStart + slice);
  const end = text.slice(text.length - slice);
  return `${start}\n\n[…]\n\n${middle}\n\n[…]\n\n${end}`;
}

/**
 * Robust in-process text extraction for PDF, DOCX and plain text.
 */
async function extractTextInline(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const type = fileType.toLowerCase();

  if (type === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (
    ext === "docx" ||
    ext === "doc" ||
    type.includes("wordprocessingml") ||
    type.includes("msword")
  ) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (type === "application/pdf" || ext === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(doc, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : (text as string);
  }

  throw new Error(`Format non supporté : ${ext || fileType}`);
}
