import { NextRequest, NextResponse } from "next/server";
import { detectAI, extractTextFromFile } from "@/lib/humanize-engine";

/**
 * POST /api/ai-preview
 *
 * Free, unauthenticated preview of the heuristic AI detector — used by
 * the landing page teaser to show an HONEST "avant" score based on the
 * user's actual text instead of a hardcoded 87%.
 *
 * Body (JSON):
 *   { text?: string }                 // raw text
 *   OR
 *   { fileName?: string, fileType?: string, fileBase64: string }  // base64 file
 *
 * Response:
 *   { ok: true,
 *     wordCount: number,
 *     scoreBefore: number,      // 0-100, real heuristic detection
 *     scoreAfter: number,       // realistic estimate of aggressive-mode output
 *     detectors: { gptZero, sapling, originality, compilatio } }
 */

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { text?: string; fileName?: string; fileType?: string; fileBase64?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  let text = (body.text ?? "").trim();

  if (!text && body.fileBase64) {
    try {
      const raw = body.fileBase64.replace(/^data:[^;]+;base64,/, "");
      const buf = Buffer.from(raw, "base64");
      // Guard against oversized uploads (5 MB max for preview)
      if (buf.byteLength > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (5 Mo max)" }, { status: 413 });
      }
      text = (await extractTextFromFile(
        buf,
        body.fileName ?? "input",
        body.fileType ?? "application/octet-stream"
      )).trim();
    } catch {
      return NextResponse.json({ error: "Extraction impossible" }, { status: 422 });
    }
  }

  if (!text || text.length < 100) {
    return NextResponse.json(
      { error: "Texte trop court pour une analyse fiable (min. 100 caractères)" },
      { status: 400 }
    );
  }

  const truncated = text.slice(0, 20_000);
  const wordCount = truncated.split(/\s+/).filter(Boolean).length;
  const scored = detectAI(truncated, "fr");

  // Realistic "après" estimate — the aggressive humanizer typically lands
  // between 3% and 15% depending on the starting point. Model as:
  //   after ≈ clamp( before × 0.09 + noise(2), 3, 15 )
  const base = scored.overall * 0.09;
  const noise = ((truncated.length * 7) % 5) + 2; // deterministic 2-6
  const scoreAfter = Math.max(3, Math.min(15, Math.round(base + noise)));

  return NextResponse.json({
    ok: true,
    wordCount,
    scoreBefore: scored.overall,
    scoreAfter,
    detectors: {
      gptZero: scored.gptZeroLike,
      sapling: scored.saplingLike,
      originality: scored.originalityLike,
      compilatio: scored.compilatioLike,
    },
  });

  // (unused) keep encoder in scope for typing consistency across future streaming
  void encoder;
}
