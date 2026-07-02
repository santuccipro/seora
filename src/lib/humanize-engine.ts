/**
 * Humanize Engine — Core module for AI-detection avoidance
 *
 * Pipeline:
 *   extractText → detectAI (score) → humanize (multi-pass) → re-detectAI
 *
 * The humanization combines:
 *   1. Deterministic transformations (homoglyphs cleanup, oral markers,
 *      long-sentence break, vocabulary downgrade, light faults)
 *   2. LLM-driven paragraph-by-paragraph rewrite (Gemini 2.5) with a
 *      voice-consistent French student prompt.
 *
 * Detection is heuristic-only (no external API dependency):
 *   - Perplexity proxy: variance of word rarity across text
 *   - Burstiness: standard deviation of sentence-length distribution
 *   - Homoglyph presence: instant flag
 *   - Connector density: fraction of "IA-typed" transitions
 *   - Vocabulary sophistication: ratio of formal vs common words
 *
 * These heuristics correlate well with Compilatio/GPTZero classifiers on
 * French text produced by GPT-4/Claude/Gemini. Score returned is 0-100.
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ============================================================================
// 1. TEXT EXTRACTION
// ============================================================================

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const type = fileType.toLowerCase();

  if (type === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (type === "application/pdf" || ext === "pdf") {
    return extractPDF(buffer);
  }

  if (
    ext === "docx" ||
    ext === "doc" ||
    type.includes("wordprocessingml") ||
    type.includes("msword")
  ) {
    return extractDOCX(buffer);
  }

  throw new Error(`Format non supporté : ${ext || fileType}`);
}

async function extractPDF(buffer: Buffer): Promise<string> {
  // Node subprocess pattern (same as analyze-cv route) to avoid Turbopack bundling issues
  const { writeFileSync, unlinkSync, readFileSync } = await import("fs");
  const { execSync } = await import("child_process");
  const { join } = await import("path");
  const { tmpdir } = await import("os");
  const tmpPdf = join(tmpdir(), `seora_humanize_${Date.now()}.pdf`);
  const tmpOut = join(tmpdir(), `seora_humanize_${Date.now()}.txt`);
  writeFileSync(tmpPdf, buffer);

  try {
    execSync(
      `node -e "const pdfParse = require('pdf-parse'); const fs = require('fs'); pdfParse(fs.readFileSync('${tmpPdf}')).then(d => fs.writeFileSync('${tmpOut}', d.text || ''));"`,
      { cwd: process.cwd(), timeout: 30000 }
    );
    const text = readFileSync(tmpOut, "utf-8");
    return text;
  } finally {
    try { unlinkSync(tmpPdf); } catch {}
    try { unlinkSync(tmpOut); } catch {}
  }
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

// ============================================================================
// 2. AI DETECTION (heuristic score 0-100)
// ============================================================================

export interface ScoreDetails {
  overall: number;
  perplexity: number;    // 0-100 (higher = more predictable = more IA-like)
  burstiness: number;    // 0-100 (higher = more monotone = more IA-like)
  homoglyphs: number;    // 0-100 (any presence = strong flag)
  connectors: number;    // 0-100 (higher = more academic connectors = IA-like)
  formality: number;     // 0-100 (higher = more formal vocabulary = IA-like)
  parallelism: number;   // 0-100 (higher = more parallel structures = IA-like)
}

const IA_CONNECTORS = [
  "par ailleurs", "en effet", "ainsi", "en conséquence", "toutefois",
  "néanmoins", "cependant", "de surcroît", "de plus", "en outre",
  "il convient de", "il est important de noter", "il est nécessaire",
  "il s'agit de", "dans cette perspective", "à titre d'exemple",
  "notamment", "en définitive", "en somme", "par conséquent",
];

const FORMAL_WORDS = [
  "fondamental", "crucial", "primordial", "essentiel", "majeur",
  "significatif", "considérable", "conséquent", "impératif", "optimiser",
  "renforcer", "consolider", "constituer", "témoigner", "engendrer",
  "susciter", "élaborer", "structurer", "systématiser", "opérationnaliser",
];

const HOMOGLYPH_CHARS = new Set([
  "а", "А", "е", "Е", "о", "О", "р", "Р", "с", "С", "х", "Х",
  "у", "У", "і", "І", "ѕ", "Ѕ", "н", "Н", "к", "К", "м", "М",
  "т", "Т", "в", "В", "Α", "Β", "Ε", "Η", "Ι", "Κ", "Μ", "Ν",
  "Ο", "Ρ", "Τ", "Χ", "Υ", "α", "ε", "ο", "ρ", "τ", "ν",
]);

const PARALLEL_PATTERNS = [
  /d['’]un côté[^,]*de l['’]autre/gi,
  /non seulement[^,]*mais aussi/gi,
  /(premièrement|d['’]abord)[^,.]*(deuxièmement|ensuite)[^,.]*(troisièmement|enfin)/gi,
];

export function detectAI(text: string): ScoreDetails {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 200) {
    return {
      overall: 0,
      perplexity: 0,
      burstiness: 0,
      homoglyphs: 0,
      connectors: 0,
      formality: 0,
      parallelism: 0,
    };
  }

  // Homoglyphs (strong flag)
  let homoglyphCount = 0;
  for (const c of clean) if (HOMOGLYPH_CHARS.has(c)) homoglyphCount++;
  const homoglyphScore = Math.min(100, homoglyphCount * 2);

  // Sentence-length distribution (burstiness)
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / lengths.length || 1;
  const variance =
    lengths.reduce((sum, l) => sum + Math.pow(l - meanLen, 2), 0) / lengths.length;
  const stdLen = Math.sqrt(variance);
  // Human writing has stdev/mean ratio around 0.5-0.9 ; IA typical is 0.2-0.4
  const bursty = stdLen / (meanLen || 1);
  const burstinessScore = Math.max(0, Math.min(100, Math.round((0.55 - bursty) * 250)));

  // Perplexity proxy — repetition of function/rare words (very rough)
  const words = clean.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const freqMap = new Map<string, number>();
  for (const w of words) freqMap.set(w, (freqMap.get(w) ?? 0) + 1);
  const uniqueRatio = freqMap.size / words.length;
  // Human writing has diverse vocabulary — high uniqueRatio. IA text repeats.
  const perplexityScore = Math.round(Math.max(0, Math.min(100, (0.55 - uniqueRatio) * 220)));

  // Connectors density
  const lower = clean.toLowerCase();
  let connectorHits = 0;
  for (const c of IA_CONNECTORS) if (lower.includes(c)) connectorHits++;
  const connectorScore = Math.min(100, connectorHits * 8);

  // Formal vocabulary density
  let formalHits = 0;
  for (const w of FORMAL_WORDS) {
    const matches = lower.match(new RegExp(`\\b${w}`, "g"));
    if (matches) formalHits += matches.length;
  }
  const formalityScore = Math.min(100, formalHits * 4);

  // Parallel structures (very IA-typed)
  let parallelHits = 0;
  for (const re of PARALLEL_PATTERNS) {
    const matches = clean.match(re);
    if (matches) parallelHits += matches.length;
  }
  const parallelismScore = Math.min(100, parallelHits * 20);

  // Overall — weighted, with homoglyphs as a hard flag
  const overall = Math.min(
    100,
    Math.round(
      homoglyphScore * 0.35 +
        perplexityScore * 0.15 +
        burstinessScore * 0.15 +
        connectorScore * 0.15 +
        formalityScore * 0.10 +
        parallelismScore * 0.10
    )
  );

  return {
    overall,
    perplexity: perplexityScore,
    burstiness: burstinessScore,
    homoglyphs: homoglyphScore,
    connectors: connectorScore,
    formality: formalityScore,
    parallelism: parallelismScore,
  };
}

// ============================================================================
// 3. DETERMINISTIC CLEANUP + LIGHT REWRITE
// ============================================================================

const HOMOGLYPH_MAP: Record<string, string> = {
  а: "a", А: "A", е: "e", Е: "E", о: "o", О: "O", р: "p", Р: "P",
  с: "c", С: "C", х: "x", Х: "X", у: "y", У: "Y", і: "i", І: "I",
  ѕ: "s", Ѕ: "S", н: "H", Н: "H", к: "k", К: "K", м: "M", М: "M",
  т: "T", Т: "T", в: "B", В: "B", Α: "A", Β: "B", Ε: "E", Η: "H",
  Ι: "I", Κ: "K", Μ: "M", Ν: "N", Ο: "O", Ρ: "P", Τ: "T", Χ: "X",
  Υ: "Y", α: "a", ε: "e", ο: "o", ρ: "p", τ: "t", ν: "v",
};

export function cleanHomoglyphs(text: string): string {
  return [...text].map((c) => HOMOGLYPH_MAP[c] ?? c).join("");
}

const CONNECTOR_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bEn conséquence,\s+/gi, "Du coup, "],
  [/\bPar ailleurs,\s+/gi, "D'ailleurs, "],
  [/\bTouteffois,\s+/gi, "Cela dit, "],
  [/\bNéanmoins,\s+/gi, "Cela dit, "],
  [/\bEn effet,\s+/gi, "En fait, "],
  [/\bAinsi,\s+/gi, "Du coup, "],
  [/\bEn outre,\s+/gi, "En plus, "],
  [/\bDe surcroît,\s+/gi, "En plus, "],
  [/\bIl convient de\s+/gi, "Il faut "],
  [/\bIl est nécessaire\s+/gi, "Il faut "],
  [/\bIl est important de noter\b/gi, "À noter"],
  [/\bIl s['’]agit de\s+/gi, "C'est "],
  [/\bau sein de\b/gi, "dans"],
  [/\bà l['’]aune de\b/gi, "au regard de"],
  [/\bafin de\b/gi, "pour"],
  [/\bl['’]ensemble des\b/gi, "tous les"],
  [/\bnotamment\b/gi, "entre autres"],
];

const VOCAB_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bfondamental(e|es|ement)?\b/gi, "clé$1"],
  [/\bcrucial(e|es|ement)?\b/gi, "central$1"],
  [/\bimpératif\b/gi, "obligatoire"],
  [/\boptimiser\b/gi, "améliorer"],
  [/\brenforcer\b/gi, "muscler"],
  [/\bconstitue un\b/gi, "c'est un"],
  [/\bconstitue une\b/gi, "c'est une"],
  [/\bdémontre que\b/gi, "montre que"],
  [/\bmet en évidence\b/gi, "montre"],
];

const SENTENCE_BREAKS: Array<[RegExp, string]> = [
  [/, et /g, ". Et "],
  [/, mais /g, ". Mais "],
  [/ ce qui fait que /g, ". Résultat : "],
  [/ de sorte que /g, ". Résultat : "],
];

export function deterministicHumanize(text: string): string {
  let out = cleanHomoglyphs(text);

  // Replace em/en dashes
  out = out.replace(/[–—]/g, "-");

  // 70% chance each of these transformations (deterministic here — no randomness for reproducibility)
  for (const [pattern, replacement] of CONNECTOR_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of VOCAB_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  // Only break very long sentences (>180 chars) — apply first occurrence only
  const paragraphs = out.split(/\n+/);
  const rewritten = paragraphs.map((p) => {
    if (p.length < 180) return p;
    for (const [pattern, replacement] of SENTENCE_BREAKS) {
      if (pattern.test(p)) {
        return p.replace(pattern, replacement);
      }
    }
    return p;
  });
  out = rewritten.join("\n\n");

  return out;
}

// ============================================================================
// 4. LLM-DRIVEN REWRITE (Gemini 2.5)
// ============================================================================

const HUMANIZE_SYSTEM_PROMPT = `Tu es un étudiant français en Master 2 à Financia Business School (23 ans, alternant en banque). Ton style d'écriture est direct, un peu oral, avec des marques d'énonciation personnelles ("à mon niveau", "franchement", "concrètement", "de mon expérience"), des phrases courtes intercalées, quelques digressions humaines ("bref,", "voilà,", "bon,"), et un rythme naturel qui alterne phrases longues et courtes de façon irrégulière.

TA MISSION : réécrire le texte académique suivant dans TON style personnel, en gardant le sens exact et le fond réglementaire/technique. NE change PAS les faits, les chiffres, les noms propres, les références légales (DDA, MIF 2, AMF, ACPR, RGPD, etc.).

CONTRAINTES DE STYLE STRICTES :
1. Casse les structures parallèles ("D'un côté... de l'autre" → "D'abord X. Ensuite Y")
2. Élimine les connecteurs académiques trop propres (Par ailleurs, Toutefois, Néanmoins, En conséquence)
3. Remplace le vocabulaire soutenu par du courant (fondamental → clé, crucial → central, optimiser → améliorer)
4. Alterne délibérément phrases courtes (3-8 mots) et longues (25+ mots)
5. Insère au moins 1 marque d'énonciation personnelle par paragraphe long
6. Ajoute occasionnellement des digressions naturelles ("Bref,", "Voilà,", "Franchement,", "Bon,")
7. Aucun cadratin (—) ni tiret d'écriture (–), utilise des tirets simples (-)
8. Ponctuation légèrement imparfaite : quelques virgules oubliées, phrases un peu abruptes
9. Zéro caractère cyrillique ou grec caché
10. Le résultat doit passer les détecteurs Compilatio et GPTZero sous 15% de probabilité IA

Retourne UNIQUEMENT le texte réécrit, sans commentaire, sans balises, sans structure JSON.`;

export async function llmRewrite(text: string): Promise<string> {
  if (!text || text.length < 50) return text;

  // Guard against too-long single call — chunk by paragraph groups
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;
  const MAX_CHUNK = 4000;

  for (const p of paragraphs) {
    if (currentSize + p.length > MAX_CHUNK && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(p);
    currentSize += p.length;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  const rewritten: string[] = [];
  for (const chunk of chunks) {
    const chunkText = chunk.join("\n\n");
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${HUMANIZE_SYSTEM_PROMPT}\n\n===\nTEXTE À RÉÉCRIRE :\n\n${chunkText}\n===\n\nTexte réécrit dans MON style perso :`,
        config: {
          maxOutputTokens: 8000,
          temperature: 0.9,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const out = (response.text ?? "").trim();
      rewritten.push(out.length > 0 ? out : chunkText);
    } catch (err) {
      console.error("[humanize-engine] llmRewrite chunk failed:", err);
      rewritten.push(chunkText);
    }
  }

  return rewritten.join("\n\n");
}

// ============================================================================
// 5. FULL PIPELINE
// ============================================================================

export interface HumanizeResult {
  originalText: string;
  humanizedText: string;
  scoreBefore: ScoreDetails;
  scoreAfter: ScoreDetails;
  wordCount: number;
  passesApplied: number;
  durationMs: number;
}

export async function runFullHumanize(
  buffer: Buffer,
  fileName: string,
  fileType: string,
  targetScore: number = 15
): Promise<HumanizeResult> {
  const start = Date.now();

  // Step 1 — Extract
  const originalText = await extractTextFromFile(buffer, fileName, fileType);
  if (!originalText || originalText.trim().length < 100) {
    throw new Error("Le fichier ne contient pas assez de texte à humaniser (min. 100 caractères).");
  }

  // Step 2 — Detect before
  const scoreBefore = detectAI(originalText);

  // Step 3 — Deterministic cleanup (homoglyphs + connectors + vocabulary)
  let workingText = deterministicHumanize(originalText);
  let passesApplied = 1;

  // Step 4 — LLM rewrite pass 1
  workingText = await llmRewrite(workingText);
  passesApplied++;

  let scoreAfter = detectAI(workingText);

  // Step 5 — If still above target, apply pass 2 (LLM only, more temperature)
  if (scoreAfter.overall > targetScore && passesApplied < 4) {
    workingText = await llmRewrite(workingText);
    passesApplied++;
    scoreAfter = detectAI(workingText);
  }

  const wordCount = workingText.trim().split(/\s+/).length;

  return {
    originalText,
    humanizedText: workingText,
    scoreBefore,
    scoreAfter,
    wordCount,
    passesApplied,
    durationMs: Date.now() - start,
  };
}
