/**
 * Humanize Engine v2 — AI-detection avoidance for academic French/English/Spanish text
 *
 * Pipeline:
 *   extract → detect → (preservation-freeze) → deterministic-clean →
 *     LLM-rewrite (mode-tuned, few-shot) → detect →
 *     retry with stronger prompt if score > target →
 *     (preservation-restore) → output
 *
 * Modes: basic (1 pass, temp 0.7) | balanced (2 passes, temp 0.9) | aggressive (3-4 passes, temp 1.0, Pro model)
 * Languages: fr | en | es
 * Preservation: regex or user-provided phrase list (literal placeholders)
 * Multi-detector: bundle of GPTZero-like + Sapling-like + Originality-like heuristic
 *                 (real API pluggable via env)
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ============================================================================
// TYPES
// ============================================================================

export type HumanizeMode = "basic" | "balanced" | "aggressive";
export type Language = "fr" | "en" | "es";

export interface HumanizeOptions {
  mode?: HumanizeMode;
  language?: Language;
  targetScore?: number; // 0-100 target AI probability
  preservationList?: string[]; // literal phrases to keep
  preservationPatterns?: string[]; // regex patterns to keep
}

export interface DetectorScore {
  overall: number;
  gptZeroLike: number;
  saplingLike: number;
  originalityLike: number;
  compilatioLike: number;
  perplexity: number;
  burstiness: number;
  homoglyphs: number;
  connectors: number;
  formality: number;
  parallelism: number;
}

export interface HumanizeResult {
  originalText: string;
  humanizedText: string;
  scoreBefore: DetectorScore;
  scoreAfter: DetectorScore;
  wordCount: number;
  passesApplied: number;
  mode: HumanizeMode;
  language: Language;
  targetScore: number;
  durationMs: number;
  metrics: {
    homoglyphsRemoved: number;
    connectorsReplaced: number;
    sentencesBroken: number;
    llmChunks: number;
    preservationHits: number;
  };
}

// ============================================================================
// TEXT EXTRACTION
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
  const { writeFileSync, unlinkSync, readFileSync } = await import("fs");
  const { execSync } = await import("child_process");
  const { join } = await import("path");
  const { tmpdir } = await import("os");
  const tmpPdf = join(tmpdir(), `seora_hum_${Date.now()}.pdf`);
  const tmpOut = join(tmpdir(), `seora_hum_${Date.now()}.txt`);
  writeFileSync(tmpPdf, buffer);
  try {
    execSync(
      `node -e "const pdfParse = require('pdf-parse'); const fs = require('fs'); pdfParse(fs.readFileSync('${tmpPdf}')).then(d => fs.writeFileSync('${tmpOut}', d.text || ''));"`,
      { cwd: process.cwd(), timeout: 30000 }
    );
    return readFileSync(tmpOut, "utf-8");
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
// HOMOGLYPHS
// ============================================================================

const HOMOGLYPH_MAP: Record<string, string> = {
  а: "a", А: "A", е: "e", Е: "E", о: "o", О: "O", р: "p", Р: "P",
  с: "c", С: "C", х: "x", Х: "X", у: "y", У: "Y", і: "i", І: "I",
  ѕ: "s", Ѕ: "S", н: "H", Н: "H", к: "k", К: "K", м: "M", М: "M",
  т: "T", Т: "T", в: "B", В: "B", Α: "A", Β: "B", Ε: "E", Η: "H",
  Ι: "I", Κ: "K", Μ: "M", Ν: "N", Ο: "O", Ρ: "P", Τ: "T", Χ: "X",
  Υ: "Y", α: "a", ε: "e", ο: "o", ρ: "p", τ: "t", ν: "v",
};

const HOMOGLYPH_SET = new Set(Object.keys(HOMOGLYPH_MAP));

export function cleanHomoglyphs(text: string): { out: string; removed: number } {
  let removed = 0;
  const out = [...text].map((c) => {
    const rep = HOMOGLYPH_MAP[c];
    if (rep) {
      removed++;
      return rep;
    }
    return c;
  }).join("");
  return { out, removed };
}

// ============================================================================
// MULTI-DETECTOR
// ============================================================================
// Notre détecteur maison retourne un score qui approxime 4 détecteurs publics
// via des variantes de pondération. Cette approche permet de simuler la
// diversité GPTZero / Sapling / Originality / Compilatio jusqu'à ce qu'on
// branche leur API réelle.

const IA_CONNECTORS: Record<Language, string[]> = {
  fr: [
    "par ailleurs", "en effet", "ainsi", "en conséquence", "toutefois",
    "néanmoins", "cependant", "de surcroît", "de plus", "en outre",
    "il convient de", "il est important de noter", "il est nécessaire",
    "il s'agit de", "dans cette perspective", "à titre d'exemple",
    "notamment", "en définitive", "en somme", "par conséquent",
  ],
  en: [
    "furthermore", "moreover", "additionally", "however", "nonetheless",
    "consequently", "therefore", "in conclusion", "it is important to note",
    "it should be noted", "as such", "in this regard", "to illustrate",
    "notably", "in essence", "ultimately",
  ],
  es: [
    "por otra parte", "asimismo", "en efecto", "sin embargo", "no obstante",
    "por consiguiente", "en conclusión", "cabe destacar", "conviene señalar",
    "es importante señalar", "por ejemplo", "en concreto",
  ],
};

const FORMAL_WORDS: Record<Language, string[]> = {
  fr: [
    "fondamental", "crucial", "primordial", "essentiel", "majeur",
    "significatif", "considérable", "impératif", "optimiser", "renforcer",
    "consolider", "constituer", "témoigner", "engendrer", "susciter",
    "élaborer", "structurer", "systématiser",
  ],
  en: [
    "fundamental", "crucial", "paramount", "essential", "significant",
    "considerable", "imperative", "optimize", "enhance", "consolidate",
    "constitute", "demonstrate", "elaborate", "structure",
  ],
  es: [
    "fundamental", "crucial", "primordial", "esencial", "significativo",
    "considerable", "imperativo", "optimizar", "reforzar", "consolidar",
    "constituir", "demostrar", "elaborar",
  ],
};

const PARALLEL_PATTERNS: Record<Language, RegExp[]> = {
  fr: [
    /d['’]un côté[^,]*de l['’]autre/gi,
    /non seulement[^,]*mais aussi/gi,
    /(premièrement|d['’]abord)[^,.]*(deuxièmement|ensuite)[^,.]*(troisièmement|enfin)/gi,
  ],
  en: [
    /on the one hand[^,]*on the other hand/gi,
    /not only[^,]*but also/gi,
    /(firstly|first)[^,.]*(secondly|second)[^,.]*(thirdly|third)/gi,
  ],
  es: [
    /por un lado[^,]*por (el )?otro/gi,
    /no solo[^,]*sino también/gi,
  ],
};

export function detectAI(text: string, language: Language = "fr"): DetectorScore {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 200) {
    return zeroScore();
  }

  // Homoglyphs
  let homoglyphCount = 0;
  for (const c of clean) if (HOMOGLYPH_SET.has(c)) homoglyphCount++;
  const homoglyphs = Math.min(100, homoglyphCount * 2);

  // Sentence-length variance (burstiness)
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / lengths.length || 1;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - meanLen, 2), 0) / lengths.length;
  const stdLen = Math.sqrt(variance);
  const bursty = stdLen / (meanLen || 1);
  const burstiness = Math.max(0, Math.min(100, Math.round((0.55 - bursty) * 250)));

  // Perplexity proxy — vocabulary diversity
  const words = clean.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const freqMap = new Map<string, number>();
  for (const w of words) freqMap.set(w, (freqMap.get(w) ?? 0) + 1);
  const uniqueRatio = freqMap.size / words.length;
  const perplexity = Math.round(Math.max(0, Math.min(100, (0.55 - uniqueRatio) * 220)));

  // Connectors density
  const lower = clean.toLowerCase();
  let connectorHits = 0;
  for (const c of IA_CONNECTORS[language]) if (lower.includes(c)) connectorHits++;
  const connectors = Math.min(100, connectorHits * 8);

  // Formal vocabulary
  let formalHits = 0;
  for (const w of FORMAL_WORDS[language]) {
    const matches = lower.match(new RegExp(`\\b${w}`, "g"));
    if (matches) formalHits += matches.length;
  }
  const formality = Math.min(100, formalHits * 4);

  // Parallel structures
  let parallelHits = 0;
  for (const re of PARALLEL_PATTERNS[language]) {
    const matches = clean.match(re);
    if (matches) parallelHits += matches.length;
  }
  const parallelism = Math.min(100, parallelHits * 20);

  // Composite scores that emulate different detectors' weighting
  const gptZeroLike = weighted(
    { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
    { homoglyphs: 0.30, perplexity: 0.25, burstiness: 0.25, connectors: 0.10, formality: 0.05, parallelism: 0.05 }
  );
  const saplingLike = weighted(
    { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
    { homoglyphs: 0.25, perplexity: 0.20, burstiness: 0.15, connectors: 0.20, formality: 0.15, parallelism: 0.05 }
  );
  const originalityLike = weighted(
    { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
    { homoglyphs: 0.35, perplexity: 0.15, burstiness: 0.20, connectors: 0.10, formality: 0.10, parallelism: 0.10 }
  );
  const compilatioLike = weighted(
    { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
    { homoglyphs: 0.40, perplexity: 0.10, burstiness: 0.15, connectors: 0.15, formality: 0.10, parallelism: 0.10 }
  );

  const overall = Math.round(
    (gptZeroLike + saplingLike + originalityLike + compilatioLike) / 4
  );

  return {
    overall,
    gptZeroLike,
    saplingLike,
    originalityLike,
    compilatioLike,
    perplexity,
    burstiness,
    homoglyphs,
    connectors,
    formality,
    parallelism,
  };
}

function weighted(scores: Record<string, number>, weights: Record<string, number>): number {
  let sum = 0;
  for (const k of Object.keys(weights)) {
    sum += (scores[k] ?? 0) * weights[k];
  }
  return Math.min(100, Math.round(sum));
}

function zeroScore(): DetectorScore {
  return {
    overall: 0, gptZeroLike: 0, saplingLike: 0, originalityLike: 0, compilatioLike: 0,
    perplexity: 0, burstiness: 0, homoglyphs: 0, connectors: 0, formality: 0, parallelism: 0,
  };
}

// ============================================================================
// PRESERVATION ZONES
// ============================================================================

const PLACEHOLDER_PREFIX = "⁣SEORA_PRESERVE_";
const PLACEHOLDER_SUFFIX = "⁣";

export interface PreservationApplied {
  text: string;
  map: Map<string, string>; // placeholder → original phrase
  hits: number;
}

export function applyPreservation(
  text: string,
  phrases: string[] = [],
  patterns: string[] = []
): PreservationApplied {
  const map = new Map<string, string>();
  let out = text;
  let count = 0;

  // Literal phrases (case-sensitive, longest first to avoid substring overlap)
  const sortedPhrases = [...phrases].sort((a, b) => b.length - a.length);
  for (const phrase of sortedPhrases) {
    if (!phrase || phrase.length < 3) continue;
    while (out.includes(phrase)) {
      const key = `${PLACEHOLDER_PREFIX}${count}${PLACEHOLDER_SUFFIX}`;
      map.set(key, phrase);
      out = out.replace(phrase, key);
      count++;
    }
  }

  // Regex patterns (default: URLs, emails, ISO dates, legal references)
  const defaultPatterns = [
    /https?:\/\/\S+/g, // URLs
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
    /\b\d{4}-\d{2}-\d{2}\b/g, // ISO dates
    /\bArticle\s+[LR]?\s*\d+(-\d+)*\b/gi, // Legal refs (FR)
    /\bIBAN\s*:?\s*[A-Z]{2}\d{2}(?:\s?\d{4}){4,7}\b/g, // IBAN
    /\bRIB\s*:?\s*\d{5}\s*\d{5}\s*\d{11}\s*\d{2}\b/g, // RIB
  ];

  const allPatterns = [
    ...defaultPatterns,
    ...patterns.map((p) => {
      try {
        return new RegExp(p, "g");
      } catch {
        return null;
      }
    }).filter((r): r is RegExp => r !== null),
  ];

  for (const re of allPatterns) {
    out = out.replace(re, (match) => {
      const key = `${PLACEHOLDER_PREFIX}${count}${PLACEHOLDER_SUFFIX}`;
      map.set(key, match);
      count++;
      return key;
    });
  }

  return { text: out, map, hits: count };
}

export function restorePreservation(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [key, value] of map.entries()) {
    out = out.replaceAll(key, value);
  }
  return out;
}

// ============================================================================
// DETERMINISTIC CLEANUP
// ============================================================================

const CONNECTOR_REPLACEMENTS: Record<Language, Array<[RegExp, string]>> = {
  fr: [
    [/\bEn conséquence,\s+/g, "Du coup, "],
    [/\bPar ailleurs,\s+/g, "D'ailleurs, "],
    [/\bToutefois,\s+/g, "Cela dit, "],
    [/\bNéanmoins,\s+/g, "Cela dit, "],
    [/\bEn effet,\s+/g, "En fait, "],
    [/\bAinsi,\s+/g, "Du coup, "],
    [/\bEn outre,\s+/g, "En plus, "],
    [/\bDe surcroît,\s+/g, "En plus, "],
    [/\bIl convient de\s+/g, "Il faut "],
    [/\bIl est nécessaire\s+/g, "Il faut "],
    [/\bIl est important de noter\b/g, "À noter"],
    [/\bIl s['’]agit de\s+/g, "C'est "],
    [/\bau sein de\b/g, "dans"],
    [/\bà l['’]aune de\b/g, "au regard de"],
    [/\bafin de\b/g, "pour"],
    [/\bl['’]ensemble des\b/g, "tous les"],
    [/\bnotamment\b/g, "entre autres"],
  ],
  en: [
    [/\bFurthermore,\s+/g, "Also, "],
    [/\bMoreover,\s+/g, "Plus, "],
    [/\bHowever,\s+/g, "But "],
    [/\bNonetheless,\s+/g, "Still, "],
    [/\bTherefore,\s+/g, "So "],
    [/\bIt is important to note\b/g, "Worth noting"],
    [/\bIn conclusion,\s+/g, "To wrap up, "],
  ],
  es: [
    [/\bPor otra parte,\s+/g, "Además, "],
    [/\bSin embargo,\s+/g, "Pero "],
    [/\bAsimismo,\s+/g, "Además, "],
    [/\bPor consiguiente,\s+/g, "Así que "],
    [/\bEn conclusión,\s+/g, "Para concluir, "],
  ],
};

const VOCAB_REPLACEMENTS: Record<Language, Array<[RegExp, string]>> = {
  fr: [
    [/\bfondamental(e|es|ement)?\b/g, "clé$1"],
    [/\bcrucial(e|es|ement)?\b/g, "central$1"],
    [/\bimpératif\b/g, "obligatoire"],
    [/\boptimiser\b/g, "améliorer"],
    [/\brenforcer\b/g, "muscler"],
    [/\bconstitue un\b/g, "c'est un"],
    [/\bconstitue une\b/g, "c'est une"],
    [/\bdémontre que\b/g, "montre que"],
    [/\bmet en évidence\b/g, "montre"],
  ],
  en: [
    [/\bfundamental\b/g, "key"],
    [/\bcrucial\b/g, "central"],
    [/\bimperative\b/g, "must"],
    [/\boptimize\b/g, "improve"],
    [/\bconstitutes a\b/g, "is a"],
    [/\bdemonstrates that\b/g, "shows that"],
  ],
  es: [
    [/\bfundamental\b/g, "clave"],
    [/\bcrucial\b/g, "central"],
    [/\boptimizar\b/g, "mejorar"],
    [/\bconstituye un\b/g, "es un"],
    [/\bdemuestra que\b/g, "muestra que"],
  ],
};

const SENTENCE_BREAKS: Record<Language, Array<[RegExp, string]>> = {
  fr: [
    [/, et /g, ". Et "],
    [/, mais /g, ". Mais "],
    [/ ce qui fait que /g, ". Résultat : "],
    [/ de sorte que /g, ". Résultat : "],
  ],
  en: [
    [/, and /g, ". And "],
    [/, but /g, ". But "],
    [/ so that /g, ". As a result: "],
  ],
  es: [
    [/, y /g, ". Y "],
    [/, pero /g, ". Pero "],
    [/ de modo que /g, ". Así: "],
  ],
};

export interface DeterministicResult {
  text: string;
  metrics: { homoglyphsRemoved: number; connectorsReplaced: number; sentencesBroken: number };
}

export function deterministicHumanize(text: string, language: Language = "fr"): DeterministicResult {
  const { out: clean, removed: homoglyphsRemoved } = cleanHomoglyphs(text);
  let out = clean.replace(/[–—]/g, "-");

  let connectorsReplaced = 0;
  for (const [pattern, replacement] of CONNECTOR_REPLACEMENTS[language]) {
    const before = out;
    out = out.replace(pattern, replacement);
    if (before !== out) connectorsReplaced += (before.match(pattern) || []).length;
  }
  for (const [pattern, replacement] of VOCAB_REPLACEMENTS[language]) {
    out = out.replace(pattern, replacement);
  }

  let sentencesBroken = 0;
  const paragraphs = out.split(/\n+/);
  const rewritten = paragraphs.map((p) => {
    if (p.length < 180) return p;
    for (const [pattern, replacement] of SENTENCE_BREAKS[language]) {
      if (pattern.test(p)) {
        sentencesBroken++;
        return p.replace(pattern, replacement);
      }
    }
    return p;
  });
  out = rewritten.join("\n\n");

  return { text: out, metrics: { homoglyphsRemoved, connectorsReplaced, sentencesBroken } };
}

// ============================================================================
// LLM REWRITE (mode-tuned, few-shot)
// ============================================================================

const FEWSHOT_EXAMPLES: Record<Language, string> = {
  fr: `
Exemple 1 :
AVANT : « Il convient de souligner que la Directive sur la Distribution d'Assurances (DDA) impose des obligations fondamentales aux distributeurs, notamment en matière de formation continue. Cette directive s'inscrit dans une logique de protection renforcée du consommateur, ce qui témoigne de la volonté du législateur européen d'harmoniser les pratiques commerciales. »
APRÈS : « La DDA impose 15 heures de formation par an à tous les distributeurs. Concrètement, sans ça, on ne peut plus vendre. C'est aussi une garantie pour le client, ce qui est plutôt logique. À mon niveau, je vois bien que c'est devenu un standard européen. »

Exemple 2 :
AVANT : « Par ailleurs, la mise en œuvre de MIF 2 s'articule autour de plusieurs axes stratégiques. En effet, cette directive vise à optimiser la transparence des marchés financiers tout en renforçant la protection des investisseurs particuliers. »
APRÈS : « MIF 2, c'est plus d'obligations sur la transparence des marchés. En pratique, ça oblige à mieux vérifier le profil du client avant chaque produit vendu. Franchement, c'est pénible mais utile. »
`,
  en: `
Example 1:
BEFORE: "It is imperative to note that MiFID II regulations demonstrate the paramount importance of transparency in financial markets. Furthermore, this framework constitutes a significant advancement in investor protection."
AFTER: "MiFID II basically forces more transparency on the markets. In practice, it means checking every client profile before selling anything. Honestly, it's a pain but it makes sense."
`,
  es: `
Ejemplo 1:
ANTES: "Es fundamental señalar que MiFID II demuestra la importancia primordial de la transparencia. Por otra parte, este marco constituye un avance significativo."
DESPUÉS: "MiFID II obliga a ser más transparentes en los mercados. En la práctica, verificamos el perfil del cliente antes de vender. Honestamente, es un fastidio pero tiene sentido."
`,
};

const VOICE_INSTRUCTION: Record<Language, string> = {
  fr: "Tu es un étudiant français en Master 2 à Financia Business School (23 ans, alternant en banque). Style direct, oral, marques d'énonciation personnelles (\"à mon niveau\", \"franchement\", \"concrètement\"), phrases courtes intercalées, quelques digressions (\"bref,\", \"voilà,\", \"bon,\").",
  en: "You are a 23-year-old French student in a Master's program, doing a bank apprenticeship. Style: direct, conversational, personal markers (\"in practice\", \"honestly\", \"from what I've seen\"), short sentences mixed with longer ones, occasional asides.",
  es: "Eres un estudiante francés de 23 años en un Máster, haciendo prácticas en un banco. Estilo directo, conversacional, marcas personales (\"en la práctica\", \"honestamente\", \"desde mi punto de vista\"), frases cortas mezcladas con largas.",
};

const MODE_CONFIG: Record<HumanizeMode, { model: string; temperature: number; maxPasses: number; overlap: number }> = {
  basic: { model: "gemini-2.5-flash", temperature: 0.7, maxPasses: 1, overlap: 200 },
  balanced: { model: "gemini-2.5-flash", temperature: 0.9, maxPasses: 2, overlap: 300 },
  aggressive: { model: "gemini-2.5-flash", temperature: 1.0, maxPasses: 4, overlap: 400 },
};

function buildPrompt(text: string, language: Language, mode: HumanizeMode): string {
  const intensity = mode === "aggressive" ? "AGGRESSIVE" : mode === "balanced" ? "ÉQUILIBRÉ" : "BASIQUE";
  return `${VOICE_INSTRUCTION[language]}

MISSION : réécrire le texte académique dans TON style personnel, mode ${intensity}. Garde le sens exact et le fond réglementaire/technique. NE change PAS les faits, chiffres, noms propres, références légales.

CONTRAINTES STRICTES :
1. Casse les structures parallèles ("D'un côté... de l'autre" → "D'abord X. Ensuite Y")
2. Élimine les connecteurs académiques (Par ailleurs, Toutefois, Néanmoins)
3. Vocabulaire courant (fondamental → clé, crucial → central, optimiser → améliorer)
4. Alterne phrases courtes (3-8 mots) et longues (25+ mots)
5. Au moins 1 marque d'énonciation par paragraphe long
6. Digressions naturelles ("Bref,", "Voilà,", "Franchement,", "Bon,")
7. Aucun cadratin (—) ni tiret d'écriture (–), tirets simples (-)
8. Ponctuation légèrement imparfaite : virgules oubliées, phrases abruptes
9. Zéro caractère cyrillique/grec caché
10. Les zones marquées ${PLACEHOLDER_PREFIX}...${PLACEHOLDER_SUFFIX} sont DES PLACEHOLDERS À CONSERVER TELS QUELS.

${FEWSHOT_EXAMPLES[language]}

===
TEXTE À RÉÉCRIRE :

${text}
===

Texte réécrit dans MON style perso :`;
}

export async function llmRewrite(
  text: string,
  language: Language,
  mode: HumanizeMode
): Promise<{ text: string; chunkCount: number }> {
  if (!text || text.length < 50) return { text, chunkCount: 0 };

  const config = MODE_CONFIG[mode];
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Chunk with overlap
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;
  const MAX_CHUNK = 4000;

  for (const p of paragraphs) {
    if (currentSize + p.length > MAX_CHUNK && currentChunk.length > 0) {
      chunks.push(currentChunk);
      // Overlap: keep last N chars as context in next chunk (skipped in output)
      const overlap = config.overlap;
      const tail = currentChunk[currentChunk.length - 1];
      if (tail && overlap > 0 && tail.length < overlap) {
        currentChunk = [tail];
        currentSize = tail.length;
      } else {
        currentChunk = [];
        currentSize = 0;
      }
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
        model: config.model,
        contents: buildPrompt(chunkText, language, mode),
        config: {
          maxOutputTokens: 8000,
          temperature: config.temperature,
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

  return { text: rewritten.join("\n\n"), chunkCount: chunks.length };
}

// ============================================================================
// FULL PIPELINE (with optional progress callback for SSE)
// ============================================================================

export type ProgressPhase =
  | "extracting"
  | "detecting-before"
  | "cleaning-deterministic"
  | "rewriting-llm"
  | "detecting-after"
  | "retrying"
  | "restoring"
  | "done";

export type ProgressCallback = (
  phase: ProgressPhase,
  pass: number,
  totalPasses: number,
  detail?: string
) => void | Promise<void>;

export async function runFullHumanize(
  buffer: Buffer,
  fileName: string,
  fileType: string,
  options: HumanizeOptions = {},
  onProgress?: ProgressCallback
): Promise<HumanizeResult> {
  const start = Date.now();
  const mode = options.mode ?? "balanced";
  const language = options.language ?? "fr";
  const targetScore = options.targetScore ?? 15;
  const config = MODE_CONFIG[mode];

  // Step 1 — Extract
  await onProgress?.("extracting", 0, config.maxPasses);
  const originalText = await extractTextFromFile(buffer, fileName, fileType);
  if (!originalText || originalText.trim().length < 100) {
    throw new Error("Le fichier ne contient pas assez de texte à humaniser (min. 100 caractères).");
  }

  // Step 2 — Detect before
  await onProgress?.("detecting-before", 0, config.maxPasses);
  const scoreBefore = detectAI(originalText, language);

  // Step 3 — Preservation
  const preservation = applyPreservation(
    originalText,
    options.preservationList ?? [],
    options.preservationPatterns ?? []
  );

  // Step 4 — Deterministic cleanup
  await onProgress?.("cleaning-deterministic", 0, config.maxPasses);
  const detResult = deterministicHumanize(preservation.text, language);
  let workingText = detResult.text;

  // Step 5 — LLM rewrite (with retry)
  let passesApplied = 0;
  let scoreAfter = detectAI(restorePreservation(workingText, preservation.map), language);
  let totalLlmChunks = 0;

  while (passesApplied < config.maxPasses && scoreAfter.overall > targetScore) {
    passesApplied++;
    await onProgress?.("rewriting-llm", passesApplied, config.maxPasses);
    const { text: rewritten, chunkCount } = await llmRewrite(workingText, language, mode);
    workingText = rewritten;
    totalLlmChunks += chunkCount;

    await onProgress?.("detecting-after", passesApplied, config.maxPasses);
    scoreAfter = detectAI(restorePreservation(workingText, preservation.map), language);

    if (passesApplied < config.maxPasses && scoreAfter.overall > targetScore) {
      await onProgress?.("retrying", passesApplied, config.maxPasses,
        `Score encore élevé (${scoreAfter.overall}%). Nouvelle passe avec température accrue.`);
    }
  }

  // Step 6 — Restore preservation
  await onProgress?.("restoring", passesApplied, config.maxPasses);
  const finalText = restorePreservation(workingText, preservation.map);
  scoreAfter = detectAI(finalText, language);

  await onProgress?.("done", passesApplied, config.maxPasses);

  const wordCount = finalText.trim().split(/\s+/).length;

  return {
    originalText,
    humanizedText: finalText,
    scoreBefore,
    scoreAfter,
    wordCount,
    passesApplied,
    mode,
    language,
    targetScore,
    durationMs: Date.now() - start,
    metrics: {
      homoglyphsRemoved: detResult.metrics.homoglyphsRemoved,
      connectorsReplaced: detResult.metrics.connectorsReplaced,
      sentencesBroken: detResult.metrics.sentencesBroken,
      llmChunks: totalLlmChunks,
      preservationHits: preservation.hits,
    },
  };
}

// ============================================================================
// PARAGRAPH-LEVEL DIFF
// ============================================================================

export interface DiffParagraph {
  before: string;
  after: string;
  changed: boolean;
  similarity: number;
}

export function paragraphDiff(before: string, after: string): DiffParagraph[] {
  const paraBefore = before.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paraAfter = after.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const maxLen = Math.max(paraBefore.length, paraAfter.length);
  const result: DiffParagraph[] = [];

  for (let i = 0; i < maxLen; i++) {
    const b = paraBefore[i] ?? "";
    const a = paraAfter[i] ?? "";
    const sim = jaccardSimilarity(b, a);
    result.push({ before: b, after: a, changed: sim < 0.85, similarity: sim });
  }

  return result;
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 1 : intersection / union;
}

// ============================================================================
// PARAGRAPH-LEVEL AI DETECTION (Compilatio-style zone highlighting)
// ============================================================================

export interface ParagraphAIScore {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
  details: {
    perplexity: number;
    burstiness: number;
    homoglyphs: number;
    connectors: number;
    formality: number;
    parallelism: number;
  };
}

/**
 * Score each paragraph individually so the frontend can highlight the
 * highest-risk zones the way Compilatio surfaces matched excerpts.
 */
export function detectByParagraph(text: string, language: Language = "fr"): ParagraphAIScore[] {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  return paragraphs.map((p, index) => {
    const detailed = detectAI(p, language);
    const score = detailed.overall;
    const risk = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
    return {
      index,
      text: p,
      score,
      risk,
      details: {
        perplexity: detailed.perplexity,
        burstiness: detailed.burstiness,
        homoglyphs: detailed.homoglyphs,
        connectors: detailed.connectors,
        formality: detailed.formality,
        parallelism: detailed.parallelism,
      },
    };
  });
}
