import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/claude-client";
import { parseDocx, serializeDocx, updateParagraphText } from "@/lib/docx-native-parser";
import { defaultScoreFn } from "@/lib/humanize-selective";

export const runtime = "nodejs";
export const maxDuration = 180;

const TOKEN_COST = 3;
const HIGH_RISK_THRESHOLD = 60;
const CONCURRENT_REWRITES = 4;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function convertPdfToDocx(pdfBuffer: Buffer, name: string): Promise<Buffer> {
  const url = process.env.SEORA_DETECTOR_URL;
  if (!url) throw new Error("SEORA_DETECTOR_URL non configuré");
  const token = process.env.SEORA_DETECTOR_TOKEN ?? "";
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), name);
  const res = await fetch(`${url.replace(/\/$/, "")}/convert-pdf`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`PDF→DOCX conversion HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 200) throw new Error("DOCX converti trop petit — invalide");
  return buf;
}

// Cyrillic homoglyphs — same table as /api/humanize/zone
const CYRILLIC: Record<string, string> = {
  a: "а", e: "е", o: "о", p: "р", c: "с", x: "х",
  A: "А", B: "В", E: "Е", H: "Н", K: "К", M: "М",
  O: "О", P: "Р", C: "С", T: "Т", X: "Х",
};

function injectCyrillic(text: string): string {
  const words = text.split(/(\s+)/);
  let n = 0;
  return words
    .map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      n++;
      if (n % 3 !== 0 || tok.length < 3) return tok;
      const chars = tok.split("");
      let done = false;
      for (let i = 1; i < chars.length; i++) {
        const sub = CYRILLIC[chars[i]];
        if (sub && !done && Math.random() < 0.55) {
          chars[i] = sub;
          done = true;
        }
      }
      return chars.join("");
    })
    .join("");
}

const SYSTEMS: Record<string, string> = {
  fr: `Tu es Rewordify pour le français académique. Tu reçois un paragraphe et tu le réécris en remplaçant environ 35% des mots par des synonymes contextuels appropriés.

RÈGLES STRICTES :
- Garde EXACTEMENT la même structure de phrase et le même ordre des idées
- Garde EXACTEMENT le même registre et le même ton (ne rends pas le texte plus familier, ni plus formel)
- Remplace seulement les mots — ne reformule pas les phrases en entier
- Conserve toutes les informations factuelles (noms propres, dates, chiffres, institutions)
- Ne résume pas, ne développe pas — même longueur approximative
- Ne change PAS le sens des phrases
- Renvoie UNIQUEMENT le texte réécrit, sans préambule ni explication`,
  en: `You are Rewordify for academic English. Replace approximately 35% of words with contextual synonyms.

STRICT RULES:
- Keep EXACTLY the same sentence structure and order of ideas
- Keep EXACTLY the same register and tone
- Only replace words — do not reformulate entire sentences
- Preserve all factual information (proper nouns, dates, numbers, institutions)
- Same approximate length — do not summarize or expand
- Return ONLY the rewritten text, no preamble`,
  es: `Eres Rewordify para español académico. Reemplaza aproximadamente el 35% de las palabras con sinónimos contextuales.

REGLAS ESTRICTAS:
- Mantén EXACTAMENTE la misma estructura y orden de ideas
- Mantén EXACTAMENTE el mismo registro y tono
- Solo reemplaza palabras — no reformules frases enteras
- Conserva toda la información factual
- Misma longitud aproximada
- Devuelve SOLO el texto reescrito, sin preámbulo`,
};

function buildPrompt(text: string, lang: string): string {
  if (lang === "en")
    return `Replace approximately 35% of the words in this paragraph with synonyms while keeping the same structure:\n\n${text}`;
  if (lang === "es")
    return `Reemplaza aproximadamente el 35% de las palabras de este párrafo por sinónimos manteniendo la misma estructura:\n\n${text}`;
  return `Remplace environ 35% des mots de ce paragraphe par des synonymes en gardant la même structure :\n\n${text}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );

    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json(
        { error: "Fichier trop lourd (max 10 Mo)" },
        { status: 400 },
      );
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "docx" && ext !== "pdf")
      return NextResponse.json(
        { error: "Format .docx ou .pdf uniquement" },
        { status: 400 },
      );

    const lang = ["fr", "en", "es"].includes(fd.get("language") as string)
      ? (fd.get("language") as string)
      : "fr";

    // Pre-scored paragraph scores from prior analysis (avoids re-scoring)
    let preScored: number[] | undefined;
    const rawScores = fd.get("paragraphScores");
    if (typeof rawScores === "string" && rawScores) {
      try {
        const arr = JSON.parse(rawScores);
        if (
          Array.isArray(arr) &&
          arr.every((s: unknown) => typeof s === "number")
        ) {
          preScored = arr.map((s: number) =>
            Math.max(0, Math.min(100, Math.round(s))),
          );
        }
      } catch {
        /* silent */
      }
    }

    // Atomic token deduction
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Pas assez de tokens (requis : ${TOKEN_COST})` },
        { status: 403 },
      );
    }

    try {
      const rawBuf = Buffer.from(await file.arrayBuffer());

      // Convert PDF → DOCX before parsing
      const buf: Buffer = ext === "pdf"
        ? await convertPdfToDocx(rawBuf, file.name)
        : rawBuf;

      const parsed = await parseDocx(buf);

      // Use pre-scored if length matches, else score via Claude
      let scores: number[];
      if (preScored && preScored.length === parsed.paragraphs.length) {
        scores = preScored;
      } else {
        scores = await defaultScoreFn(parsed.paragraphs.map((p) => p.text));
      }

      const highRiskIdx = scores
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s >= HIGH_RISK_THRESHOLD)
        .map(({ i }) => i);

      let rewrittenCount = 0;

      // Concurrent Rewordify rewrites (same prompt as /api/humanize/zone)
      let cursor = 0;
      await Promise.all(
        Array.from(
          { length: Math.min(CONCURRENT_REWRITES, Math.max(1, highRiskIdx.length)) },
          async () => {
            while (true) {
              const pos = cursor++;
              if (pos >= highRiskIdx.length) break;
              const pIdx = highRiskIdx[pos];
              const para = parsed.paragraphs[pIdx];
              if (!para.text || para.text.trim().length < 20) continue;
              try {
                const reworded = await callClaude(buildPrompt(para.text, lang), {
                  system: SYSTEMS[lang] ?? SYSTEMS.fr,
                  model: "claude-sonnet-4-6",
                  timeoutMs: 45_000,
                });
                updateParagraphText(para, injectCyrillic(reworded.trim()));
                rewrittenCount++;
              } catch (err) {
                console.error(
                  `[docx-rewordify] p${pIdx}:`,
                  err instanceof Error ? err.message : err,
                );
              }
            }
          },
        ),
      );

      const outBuf = await serializeDocx({
        zip: parsed.zip,
        documentDom: parsed.documentDom,
      });
      const outName = `humanized_rw_${file.name}`
        .replace(/[^\w.\- ]+/g, "_")
        .slice(0, 120);
      const ab = new ArrayBuffer(outBuf.byteLength);
      new Uint8Array(ab).set(outBuf);

      return new Response(ab, {
        status: 200,
        headers: {
          "Content-Type": DOCX_MIME,
          "Content-Disposition": `attachment; filename="${outName}"`,
          "Content-Length": String(outBuf.byteLength),
          "X-Rewritten-Count": String(rewrittenCount),
          "X-High-Risk-Count": String(highRiskIdx.length),
        },
      });
    } catch (err) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: { tokens: { increment: TOKEN_COST } },
        })
        .catch(() => {});
      const msg = err instanceof Error ? err.message : "Erreur";
      console.error("[api/humanize/docx-rewordify] failed:", msg);
      return NextResponse.json(
        { error: `Humanisation échouée : ${msg}. Tokens remboursés.` },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[api/humanize/docx-rewordify] fatal:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
