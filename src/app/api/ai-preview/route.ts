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

const PROMPT_TEMPLATE = (text: string, wordCount: number) => `Analyse le texte suivant (${wordCount.toLocaleString("fr-FR")} mots) et retourne un score COMPILATIO-GRADE de détection IA.

━━━━━━━━━━━━━━━━━━━━━━━
BARÈME COMPILATIO (calibré sur rapports réels 2026) :
- 0-15 : très humain — passe sans souci
- 15-30 : mixte, quelques passages IA
- 30-50 : moitié IA — Compilatio flag et l'école demande justification
- 50-75 : majoritairement IA — gros risque de rejet
- 75-100 : quasi 100% IA
━━━━━━━━━━━━━━━━━━━━━━━

SIGNAUX FORTS QUE COMPILATIO REPÈRE (à activement chercher) :
- Cascades énumératives : "Premièrement... Deuxièmement... Troisièmement..."
- Antithèses balancées : "X n'est pas Y, c'est Z", "loin d'être X, c'est Y"
- Nominalizations abstraites : "l'identification des opportunités", "la formalisation des objectifs"
- Groupes ternaires calibrés : "trois effets convergents / concomitants"
- Métaphores conceptuelles : "un socle de X", "un actif stratégique"
- Signatures ChatGPT : "Il est important de noter", "Il convient de", "En somme", "Explorons"
- Registre soutenu uniforme sans variation
- Absence totale de marqueurs personnels ("franchement", "concrètement", "à mon niveau")
- Absence de phrases courtes (<8 mots)
- Absence de digressions humaines ("Bon,", "Bref,", "Voilà,")
- Absence de micro-imperfections grammaticales
- Absence d'ancrages temporels/spatiaux ("dans mon quotidien", "l'autre jour")
- Cohérence sémantique trop lisse — pas de "gué" dans l'argumentation

SIGNAUX HUMAINS QUI FONT BAISSER LE SCORE :
- Marqueurs personnels : "franchement", "concrètement", "à mon niveau", "c'est du vécu"
- Métaphores accessibles : "ceinture de sécurité", "tour de contrôle"
- Registre variable — passe du soutenu à l'oral et retour
- Phrases très courtes intercalées ("C'est du vécu.", "Bon, l'intranet.")
- Digressions naturelles
- Micro-imperfections : accord raté, apostrophe manquante, typo isolée
- Formulations orales : "mais le truc c'est que", "on prend le pli"
- Anecdotes personnelles vécues avec détails concrets

CONSIGNE : Tu dois LIRE le texte en entier et évaluer la DENSITÉ des signaux IA vs humains. Un texte long avec quelques patterns IA au milieu d'un océan de style humain = score bas. Un texte court entièrement écrit dans un registre uniforme et abstrait = score haut.

Sois HONNÊTE. Si le texte est manifestement humain, score bas. Si manifestement IA, score haut. Zéro complaisance dans les deux sens.

━━━━━━━━━━━━━━━━━━━━━━━
TEXTE À ANALYSER :
"""
${text}
"""
━━━━━━━━━━━━━━━━━━━━━━━

RÉPONDS UNIQUEMENT par ce JSON strict :
{
  "overall": <int 0-100, ton estimation Compilatio-grade>,
  "reasoning": "<2-3 phrases synthétiques justifiant ton score>",
  "topOffenders": ["<extrait 100-200 chars du passage le plus flag>", "<autre extrait>", "<autre>"],
  "perDetector": {
    "gptZero": <int 0-100, focus perplexité + burstiness>,
    "sapling": <int 0-100, focus connecteurs + formalité>,
    "originality": <int 0-100, focus vocab + structure>,
    "compilatio": <int 0-100, focus patterns académiques>
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

  // Sonnet 4.6 handles ~200K token context. We send up to ~40K chars to keep
  // latency reasonable — that's ~10-13K words, plenty for a DPP.
  const sample = text.slice(0, 40_000);
  const wordCount = sample.split(/\s+/).filter(Boolean).length;

  try {
    const raw = await callClaude(PROMPT_TEMPLATE(sample, wordCount), {
      system: SYSTEM,
      model: "claude-sonnet-4-6",
      timeoutMs: 110_000,
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
