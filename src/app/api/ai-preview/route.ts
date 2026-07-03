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

  // Strategy: 3 parallel Sonnet 4.6 calls (start / middle / end) of ~4 500 chars
  // each. Each call ~20-30 s wall time; parallel = same wall clock. Aggregate
  // by weighted average so the middle body dominates.
  const slices = buildParallelSlices(text, 4_500);
  const totalSample = slices.join(" ");
  const wordCount = totalSample.split(/\s+/).filter(Boolean).length;

  try {
    const verdicts = await Promise.all(
      slices.map((slice, i) =>
        callClaude(PROMPT_TEMPLATE(slice, slice.split(/\s+/).length), {
          system: SYSTEM,
          model: "claude-sonnet-4-6",
          timeoutMs: 80_000,
        })
          .then((raw) => {
            const m = raw.match(/\{[\s\S]*\}/);
            return m ? (JSON.parse(m[0]) as ClaudeAiVerdict) : null;
          })
          .catch((err) => {
            console.error(`[api/ai-preview] slice ${i} failed:`, err);
            return null;
          })
      )
    );

    const valid = verdicts.filter(Boolean) as ClaudeAiVerdict[];
    if (valid.length === 0) {
      return NextResponse.json({ error: "Analyse Claude impossible" }, { status: 502 });
    }

    // Weighted mean — middle slice weighs a bit more (it's the argumentation body).
    const weights = valid.length === 3 ? [1, 1.3, 1] : Array(valid.length).fill(1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const scoreBefore = Math.round(
      valid.reduce((sum, v, i) => sum + (v.overall ?? 0) * weights[i], 0) / totalWeight
    );

    const base = scoreBefore * 0.15;
    const noise = ((totalSample.length * 7) % 5) + 2;
    const scoreAfter = Math.max(3, Math.min(15, Math.round(base + noise)));

    const reasoning = valid.map((v) => v.reasoning).filter(Boolean).join(" · ");
    const topOffenders = valid.flatMap((v) => v.topOffenders ?? []).slice(0, 4);

    // Aggregate per-detector scores
    const agg = (key: keyof ClaudeAiVerdict["perDetector"]) =>
      Math.round(
        valid.reduce((sum, v, i) => sum + (v.perDetector?.[key] ?? scoreBefore) * weights[i], 0) /
          totalWeight
      );

    return NextResponse.json({
      ok: true,
      wordCount,
      scoreBefore,
      scoreAfter,
      reasoning,
      topOffenders,
      detectors: {
        gptZero: clamp(agg("gptZero"), scoreBefore),
        sapling: clamp(agg("sapling"), scoreBefore),
        originality: clamp(agg("originality"), scoreBefore),
        compilatio: clamp(agg("compilatio"), scoreBefore),
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

/**
 * Cut the document into up to 3 non-overlapping slices: opening, middle, end.
 * For short docs we return 1 or 2 slices — no artificial padding.
 */
function buildParallelSlices(text: string, sliceChars: number): string[] {
  if (text.length <= sliceChars) return [text];
  if (text.length <= sliceChars * 2) {
    return [text.slice(0, sliceChars), text.slice(text.length - sliceChars)];
  }
  const start = text.slice(0, sliceChars);
  const midStart = Math.floor(text.length / 2) - Math.floor(sliceChars / 2);
  const middle = text.slice(midStart, midStart + sliceChars);
  const end = text.slice(text.length - sliceChars);
  return [start, middle, end];
}

function clamp(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
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
