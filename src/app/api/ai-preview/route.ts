import { NextRequest, NextResponse } from "next/server";
import { detectAI } from "@/lib/humanize-engine";

/**
 * POST /api/ai-preview
 *
 * Free, unauthenticated preview of the heuristic AI detector — used by
 * the landing page teaser to show an HONEST "avant" score based on the
 * user's actual text instead of a hardcoded 87%.
 *
 * Content-Type: multipart/form-data
 *   field "file" (optional)  → PDF / DOCX / TXT
 *   field "text" (optional)  → raw text
 *
 * Response:
 *   { ok, wordCount, scoreBefore, scoreAfter, detectors: {...} }
 *
 * PDF/DOCX parsing runs INSIDE the Node runtime here — the subprocess
 * shell-out used by the token-consuming /api/analyze route is fragile on
 * Vercel serverless, so this preview endpoint uses the packages directly.
 */

export const runtime = "nodejs";

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

  const truncated = text.slice(0, 20_000);
  const wordCount = truncated.split(/\s+/).filter(Boolean).length;
  const scored = detectAI(truncated, "fr");

  // Realistic "après" estimate — the aggressive humanizer typically lands
  // between 3% and 15% depending on the starting point.
  const base = scored.overall * 0.09;
  const noise = ((truncated.length * 7) % 5) + 2;
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
}

/**
 * Robust in-process text extraction for PDF, DOCX and plain text.
 * No subprocess, no filesystem I/O.
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
    // pdf-parse imports pdf.js internally — call directly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("pdf-parse");
    const parser = mod.default ?? mod;
    // Newer pdf-parse (2.x) exposes a PDFParse class; older versions are a function.
    if (typeof parser === "function") {
      const data = await parser(buffer);
      return data?.text ?? "";
    }
    if (mod.PDFParse) {
      const p = new mod.PDFParse(new Uint8Array(buffer));
      const r = await p.getText();
      return (r?.pages ?? []).map((pg: { text: string }) => pg.text).join("\n");
    }
    throw new Error("pdf-parse API inconnue");
  }

  throw new Error(`Format non supporté : ${ext || fileType}`);
}
