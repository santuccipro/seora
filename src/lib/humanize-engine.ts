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

import { callClaude, ClaudeModel } from "./claude-client";

// ============================================================================
// TYPES
// ============================================================================

export type HumanizeMode = "basic" | "balanced" | "aggressive" | "compilatio-proof";
export type Language = "fr" | "en" | "es";

export interface HumanizeOptions {
  mode?: HumanizeMode;
  language?: Language;
  targetScore?: number; // 0-100 target AI probability
  preservationList?: string[]; // literal phrases to keep
  preservationPatterns?: string[]; // regex patterns to keep
  useClaudeScoring?: boolean; // use Claude Sonnet to score instead of heuristic (Compilatio-grade)
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
  claudeScoreBefore?: number;   // Claude-Sonnet Compilatio-grade score (before)
  claudeScoreAfter?: number;    // Claude-Sonnet Compilatio-grade score (after)
  claudeReasoning?: string;
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
  // `unpdf` bundles a serverless-friendly pdfjs build — no subprocess, no
  // DOMMatrix polyfill, works on Vercel Node runtime.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(doc, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : (text as string);
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

/**
 * COMPILATIO-SIGNATURE PATTERNS — regex-based detection of the same 30
 * patterns encoded in `compilatio-emulator.ts`. Deterministic, sub-millisecond,
 * catches what raw stat measures miss.
 *
 * Each match with weight ≥ 3 adds 15 points to the score, weight 2 adds 8,
 * weight 1 adds 3. Capped at 90. This gives the free heuristic detector a
 * pattern-based signal comparable to what the emulator produces, without
 * an LLM call.
 */
const COMPILATIO_SIGNATURE_PATTERNS_FR: Array<{ re: RegExp; weight: number; key: string }> = [
  // ══════════════ Weight 3 — HARD AI signature (each hit = +15 pts, capped 90) ══════════════
  { re: /premi[èe]rement[\s\S]{0,600}deuxi[èe]mement[\s\S]{0,600}troisi[èe]mement/gi, weight: 3, key: "cascade_enum" },
  { re: /\bn'est pas\b[^.!?]{5,60}\bc'est\b/gi, weight: 3, key: "balanced_antithesis" },
  { re: /\bloin d'être\b/gi, weight: 3, key: "loin_d_etre" },
  { re: /\btrois effets?\s+(convergents?|concomitants?|concordants?|majeurs?|principaux?)/gi, weight: 3, key: "trois_effets" },
  { re: /\bil (est|convient) important de noter\b/gi, weight: 3, key: "chatgpt_verify" },
  { re: /\b(explorons|plongeons dans|démystifions|décryptons|approfondissons|éclairons)\b/gi, weight: 3, key: "chatgpt_explore" },
  { re: /\beffets? (convergents?|concomitants?|concordants?)\b/gi, weight: 3, key: "convergent_effects" },
  { re: /\bde surcroît\b|\bcorollairement\b|\bconcomitamment\b|\bnonobstant\b|\bpar-delà\b/gi, weight: 3, key: "connector_surcroit" },
  { re: /\bà (moyen|long) terme,?\s+[^.]{0,120}(produira|entraînera|générera|convergent|permettra)/gi, weight: 3, key: "future_projection" },
  { re: /\bn'est pas un coût,?\s+c'est un actif\b/gi, weight: 3, key: "actif_metaphor_exact" },
  { re: /\bun renforcement de la (fidélisation|conformité|performance|compétitivité)/gi, weight: 3, key: "renforcement_de_la" },
  { re: /\bcette conviction que j'emporte\b/gi, weight: 3, key: "conviction_emporte" },
  { re: /\b(cinq|quatre|trois|six|sept)\s+enseignements\s+(transversaux|principaux|majeurs|clés)/gi, weight: 3, key: "n_enseignements" },
  { re: /\bcette (fiche|section|démarche|analyse|réflexion) m'a permis de\b/gi, weight: 3, key: "meta_narration_permis" },
  { re: /\bil (importe|convient|est essentiel|est fondamental) (de|d')\b/gi, weight: 3, key: "il_convient_de" },
  { re: /\bla (pérennisation|consolidation|structuration|systématisation|généralisation)\s+de\s+/gi, weight: 3, key: "nominalization_lourde" },
  { re: /\bau moins aussi importants? que\b/gi, weight: 3, key: "au_moins_aussi" },
  { re: /\b(cadre|socle|pilier|levier|vecteur) (de|d')\s+(la|le|l'|un|une)\s+/gi, weight: 3, key: "socle_pilier_levier" },

  // ══════════════ Weight 2 — MEDIUM AI signature (each hit = +10 pts, capped 60) ══════════════
  { re: /\bnon seulement\b[^.]{5,80}\bmais aussi\b/gi, weight: 2, key: "non_seulement" },
  { re: /\bun socle\s+(de|d')/gi, weight: 2, key: "socle_de" },
  { re: /\best un actif\b/gi, weight: 2, key: "actif_metaphor" },
  { re: /\b(en somme|en définitive|pour conclure|fondamentalement|en substance)\b/gi, weight: 2, key: "conclusion_synthesis" },
  { re: /\bce (dossier|mémoire|rapport|travail) m'a permis de (comprendre|vérifier|structurer|approfondir|saisir|valider)/gi, weight: 2, key: "meta_narration" },
  { re: /\bobjectif smart\s*:/gi, weight: 2, key: "smart_objective" },
  { re: /\btableau\s+\d+\s*[—-]\s*synthèse/gi, weight: 2, key: "table_synthesis" },
  { re: /\bl'(identification|formalisation|pérennisation|structuration|mise en œuvre|généralisation|systématisation|consolidation) (des|de|du|d')/gi, weight: 2, key: "nominalization" },
  { re: /\b(indicateurs?|effets?|résultats?|bénéfices?) (de suivi|attendus?|escomptés?|prévus?|projetés?)\s+(proposés?|clés?|majeurs?)?\b/gi, weight: 2, key: "indicateurs_suivi" },
  { re: /\bcette (démarche|approche|stratégie|posture) (s'avère|permet de|répond à|s'inscrit dans)/gi, weight: 2, key: "cette_demarche" },
  { re: /\bl'ensemble d(es|u|e la)\s+/gi, weight: 2, key: "ensemble_des" },
  { re: /\bpour aligner (mes|nos|ses|leurs) pratiques\b/gi, weight: 2, key: "aligner_pratiques" },
  { re: /\bpour (répondre|adresser|traiter) (à|aux) (ces|ces enjeux|cette problématique)/gi, weight: 2, key: "pour_repondre" },
  { re: /\ben effet,?\s+(cette|ce|ces|il|elle|nous|on)\s+/gi, weight: 2, key: "en_effet_cette" },
  { re: /\bpar ailleurs,?\s+(cette|ce|ces|il|elle|nous|on)\s+/gi, weight: 2, key: "par_ailleurs_cette" },
  { re: /\b(rigoureuse|systématique|approfondi[e]?|structurant[e]?|itérativ[e]?)\s+(approche|démarche|analyse|méthodologie)\b/gi, weight: 2, key: "adjectif_approche" },
  { re: /\bau service (de|d')\s+/gi, weight: 2, key: "au_service_de" },
  { re: /\bs'inscrit dans\s+(une|un|la|le|des|les)\s+(logique|démarche|dynamique|perspective|volonté)\b/gi, weight: 2, key: "s_inscrit_dans" },
  { re: /\bconstitue (un|une|le|la)\s+(pilier|socle|levier|vecteur|point|élément|facteur)\b/gi, weight: 2, key: "constitue_un_pilier" },
  { re: /\ba pour (vocation|objectif|ambition|finalité) de\b/gi, weight: 2, key: "a_pour_vocation" },
  { re: /\bdans (un|une) (logique|démarche|dynamique|optique|perspective)\s+d(e|')/gi, weight: 2, key: "dans_une_logique" },
  { re: /\bnotamment (par|via|à travers|grâce à|au moyen)/gi, weight: 2, key: "notamment_par" },
  { re: /\bpar l'entremise de\b|\bpar le biais de\b|\bpar le truchement de\b/gi, weight: 2, key: "par_le_biais" },
  { re: /\bil s'agit (bien|là) (de|d')\b/gi, weight: 2, key: "il_s_agit_bien" },
  { re: /\bau-delà (du|des|de la|de l')\b/gi, weight: 2, key: "au_dela_du" },
  { re: /\btirer (parti|profit|le meilleur) de\b/gi, weight: 2, key: "tirer_parti" },

  // ══════════════ Weight 1 — SOFT signal (each hit = +4 pts, capped 30) ══════════════
  { re: /\b(par ailleurs|toutefois|néanmoins|en outre|de plus)\b/gi, weight: 1, key: "connector_par_ailleurs" },
  { re: /\b(ainsi|de même|similairement)\s*,?\s+/gi, weight: 1, key: "connector_ainsi" },
  { re: /\bapproche\s+(durable|responsable|structurante|holistique|systémique|inclusive)\b/gi, weight: 1, key: "adjective_pair" },
  { re: /\brythme ternaire|,\s+\w+,\s+et\s+/gi, weight: 1, key: "ternary_rhythm" },
  { re: /\b(fondamental|crucial|primordial|essentiel|majeur|significatif|considérable|impératif)\b/gi, weight: 1, key: "adjectifs_soutenus" },
  { re: /\b(témoigne|témoignent|témoignant) (de|d')\b/gi, weight: 1, key: "temoigne_de" },
  { re: /\b(engendre|génère|produit|entraîne)\s+(des|un|une)\s+(effet|dynamique|bénéfice)/gi, weight: 1, key: "engendre_des" },
  { re: /\ben (matière|termes) de\s+/gi, weight: 1, key: "en_matiere_de" },
  { re: /\b(mettre en (lumière|évidence|exergue))\b/gi, weight: 1, key: "mettre_en_lumiere" },
];

const COMPILATIO_SIGNATURE_PATTERNS_EN: Array<{ re: RegExp; weight: number; key: string }> = [
  { re: /firstly[\s\S]{0,600}secondly[\s\S]{0,600}thirdly/gi, weight: 3, key: "cascade_enum" },
  { re: /\bit is important to note\b|\bit should be noted\b/gi, weight: 3, key: "chatgpt_verify" },
  { re: /\b(let's dive|let us dive|explore|decode|demystify) (into|the)/gi, weight: 3, key: "chatgpt_explore" },
  { re: /\bnot only\b[^.]{5,80}\bbut also\b/gi, weight: 2, key: "non_seulement" },
  { re: /\bfar from being\b/gi, weight: 3, key: "loin_d_etre" },
  { re: /\bthree (converging|concurrent|complementary) effects?/gi, weight: 3, key: "trois_effets" },
  { re: /\bin conclusion\b|\bin summary\b|\bultimately\b/gi, weight: 1, key: "conclusion_synthesis" },
];

const COMPILATIO_SIGNATURE_PATTERNS_ES: Array<{ re: RegExp; weight: number; key: string }> = [
  { re: /primero[\s\S]{0,600}segundo[\s\S]{0,600}tercero/gi, weight: 3, key: "cascade_enum" },
  { re: /\bes importante señalar\b/gi, weight: 3, key: "chatgpt_verify" },
  { re: /\bexploremos\b|\bprofundicemos\b|\bdesmitifiquemos\b/gi, weight: 3, key: "chatgpt_explore" },
];

/**
 * Human-marker density — signals that STRONGLY indicate a real student wrote
 * the passage. Each hit REDUCES the AI probability. Calibrated on Marius's
 * DPP-MAX (Compilatio 9%) which is packed with these markers.
 */
const HUMAN_MARKERS_FR: RegExp[] = [
  // Marqueurs personnels colloquiaux
  /\bfranchement,?\s+/gi,
  /\bconcr[èe]tement,?\s+/gi,
  /\bhonn[êe]tement,?\s+/gi,
  /\bperso,?\s+/gi,
  /\b[àa]\s+mon\s+niveau\b/gi,
  /\bpour\s+[êe]tre\s+clair,?\s+/gi,
  /\bje\s+le\s+dis\s+franchement\b/gi,
  /\bc'est\s+du\s+v[ée]cu\b/gi,
  /\bde\s+mon\s+c[ôo]t[ée]\b/gi,
  /\bsur\s+le\s+terrain\b/gi,
  /\ben\s+vrai\b/gi,
  /\bau\s+final\b/gi,
  /\bbref,?\s+/gi,
  /\bbon,?\s+(l'|la\s|le\s|il\s|c'est\s|c'|en\s|par\s|et\s)/gi,
  /\bvoil[àa],?\s+/gi,
  /\bau\s+quotidien\b/gi,
  /\bdans\s+mon\s+quotidien\b/gi,
  // Métaphores accessibles humaines
  /\bcein[t]?ure\s+de\s+s[ée]curit[ée]\b/gi,
  /\btour\s+de\s+contr[ôo]le\b/gi,
  /\bon\s+prend\s+le\s+pli\b/gi,
  /\ben\s+catimini\b/gi,
  /\boc[ée]an\s+rouge\b/gi,
  /\bma\s+boussole\b/gi,
  /\bcramer\b/gi,
  /\bfr[ôo]l[e]?\s+l['a]indigestion\b/gi,
  // Formulations orales
  /\bmais\s+le\s+truc,?\s+c'est\s+que/gi,
  /\bce\s+qui\s+est\s+plut[ôo]t\s+/gi,
  /\bc'est\s+la\s+base\b/gi,
  /\bc'est\s+plut[ôo]t\s+/gi,
  /\bc'est\s+vraiment\s+/gi,
  /\bpas\s+de\s+souci\b/gi,
  /\bpas\s+top\b/gi,
  /\bça\s+aide\s+pas\b/gi,
  /\bpas\s+ouf\b/gi,
];

const SHORT_SENTENCE_RE = /[.!?]\s+([A-ZÀÉÈÊ][^.!?]{5,45}?)[.!?]/g;

function countShortSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.filter((s) => s.trim().split(/\s+/).length <= 8).length;
}

function scoreHumanMarkers(text: string, language: Language): number {
  if (language !== "fr") return 0; // only calibrated for French so far
  const wordCount = text.split(/\s+/).length || 1;
  let hits = 0;
  for (const re of HUMAN_MARKERS_FR) {
    hits += (text.match(re) ?? []).length;
  }
  // Short-sentence density (Marius's DPP-MAX has ~10-15 % short sentences)
  const shortSentences = countShortSentences(text);
  const totalSentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5).length || 1;
  const shortRatio = shortSentences / totalSentences;
  const shortBonus = Math.min(15, shortRatio * 100);

  // Marker density: 5 marqueurs / 1000 mots = signature humaine forte
  const perThousand = (hits / wordCount) * 1000;
  const markerBonus = Math.min(35, perThousand * 6);

  return Math.round(markerBonus + shortBonus);
}

function scoreCompilatioSignatures(text: string, language: Language): number {
  const list =
    language === "en" ? COMPILATIO_SIGNATURE_PATTERNS_EN :
    language === "es" ? COMPILATIO_SIGNATURE_PATTERNS_ES :
    COMPILATIO_SIGNATURE_PATTERNS_FR;
  const wordCount = text.split(/\s+/).length || 1;
  let score = 0;
  let hardHits = 0;
  for (const { re, weight } of list) {
    const hits = (text.match(re) ?? []).length;
    if (hits === 0) continue;
    // Softer curves per weight — capped lower so single common connectors
    // don't dominate on well-written natural French.
    if (weight === 3) { score += Math.min(60, hits * 12); hardHits += hits; }
    else if (weight === 2) { score += Math.min(35, hits * 6); }
    else { score += Math.min(15, hits * 2); }
  }
  const perThousand = (score / wordCount) * 1000;
  const densityBoost = Math.min(10, perThousand * 0.3);
  const raw = Math.min(95, score + densityBoost);

  // COMPENSATION HUMAINE — the key fix. A text with many personal markers,
  // short sentences and accessible metaphors gets a fat discount.
  const humanBonus = scoreHumanMarkers(text, language);
  const compensated = Math.max(0, raw - humanBonus);

  // Hard-signature floor only if human bonus < 20 (a truly AI text has 0
  // markers, so the floor still fires; a human text with many markers escapes).
  const floor = humanBonus < 15
    ? (hardHits >= 3 ? 35 : hardHits >= 2 ? 22 : 0)
    : 0;
  return Math.max(floor, Math.round(compensated));
}

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

  // Compilatio-signature pattern hits — huge lift on well-edited academic text
  // where raw stats undershoot. This is the dimension that closes the gap
  // between our 13% heuristic and Compilatio's 47%.
  const signatureHits = scoreCompilatioSignatures(clean, language);

  // Composite scores — inject signature hits with a fat weight.
  // Signature score is now the DOMINANT term (60-85 %) because on well-edited
  // academic French, pattern presence is far more predictive than raw stats.
  const gptZeroLike = Math.round(
    0.40 * weighted(
      { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
      { homoglyphs: 0.30, perplexity: 0.25, burstiness: 0.25, connectors: 0.10, formality: 0.05, parallelism: 0.05 }
    ) + 0.60 * signatureHits
  );
  const saplingLike = Math.round(
    0.35 * weighted(
      { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
      { homoglyphs: 0.25, perplexity: 0.20, burstiness: 0.15, connectors: 0.20, formality: 0.15, parallelism: 0.05 }
    ) + 0.65 * signatureHits
  );
  const originalityLike = Math.round(
    0.35 * weighted(
      { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
      { homoglyphs: 0.35, perplexity: 0.15, burstiness: 0.20, connectors: 0.10, formality: 0.10, parallelism: 0.10 }
    ) + 0.65 * signatureHits
  );
  const compilatioLike = Math.round(
    0.15 * weighted(
      { homoglyphs, perplexity, burstiness, connectors, formality, parallelism },
      { homoglyphs: 0.40, perplexity: 0.10, burstiness: 0.15, connectors: 0.15, formality: 0.10, parallelism: 0.10 }
    ) + 0.85 * signatureHits
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

━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLES CALIBRÉS SUR UN VRAI DPP FINANCIA BS QUI PASSE À 9 % COMPILATIO
(Étudier chaque phrase — c'est CETTE signature exacte qu'il faut produire.)
━━━━━━━━━━━━━━━━━━━━━━━

Exemple 3 (introduction) :
« Franchement, travailler dans le secteur bancaire aujourd'hui, c'est avant tout opérer dans un environnement ultra-surveillé. Contrairement à un commerce classique, nous touchons à l'argent et aux projets de vie des gens, ce qui justifie un contrôle drastique de nos activités par l'ACPR et l'AMF. »
→ Notez : ouverture par "Franchement,", registre oral, phrase directe, aucune antithèse balancée.

Exemple 4 (constat terrain) :
« Bon, l'intranet : le défi de l'infobésité. Les infos réglementaires arrivent via l'intranet ou les mails régionaux, mais le volume est tel qu'on frôle l'indigestion. L'information purement patrimoniale se retrouve souvent (et c'est du vécu) noyée sous le flux des procédures internes. »
→ Notez : "Bon," en ouverture, métaphore accessible ("frôle l'indigestion"), incise personnelle "(et c'est du vécu)".

Exemple 5 (analyse) :
« C'est un logiciel de contrôle, pas d'anticipation. Concrètement je l'utilise tous les jours. C'est notre tour de contrôle en gros. Pour vérifier qu'un dossier client est complet, contrôler une signature, sortir un extrait de compte, il est vraiment bon. Mais le truc c'est que dès qu'on lui demande de flécher un nouveau public à cause d'une réforme fiscale récente par exemple, il ne sait pas faire. Ce n'est pas fait pour ça et personne à l'agence ne se sert d'ASIA comme d'un outil de veille. On l'utilise pour du curatif, pas du prédictif. À mon niveau je l'ai vite compris. »
→ Notez : phrases courtes coupées, "Concrètement" en incise, métaphore "tour de contrôle", "Mais le truc c'est que", clôture par marqueur personnel "À mon niveau je l'ai vite compris".

Exemple 6 (transition problème → solution) :
« Pour être clair, c'est ici que se noue le paradoxe de mon alternance. D'un côté, le groupe Société Générale pousse une stratégie omnicanale forte pour réduire les coûts et moderniser l'image. De l'autre, ma clientèle réclame de la proximité, du contact humain et de la réassurance, percevant parfois la digitalisation comme une dégradation du service. »
→ Notez : "Pour être clair" en ouverture, "D'un côté... De l'autre" mais ATTENTION sans structure calibrée derrière, participe présent qui fluidifie.

Exemple 7 (métaphore accessible + micro-imperfection) :
« Dans mon quotidien d'alternant à la Société Générale, je ne peux pas me permettre d'approximation : la veille réglementaire est ma ceinture de sécurité. Pour moi, une erreur de ma part pourrait non seulement coûter cher à l'agence en termes de sanctions, mais aussi engager ma propre responsabilité. »
→ Notez : métaphore "ceinture de sécurité", ancrage perso "Dans mon quotidien", clarté directe.

Exemple 8 (registre volontairement bas) :
« Franchement au début j'étais un peu perdu mais on prend le pli vite. C'est un outil de traçabilité avant tout. »
→ Notez : deux phrases courtes, "on prend le pli", "avant tout" en clôture assertive.

━━━━━━━━━━━━━━━━━━━━━━━
MARQUEURS OBLIGATOIRES À INJECTER (fréquence cible pour passer <15 % Compilatio) :
━━━━━━━━━━━━━━━━━━━━━━━
- 1 marqueur personnel tous les 200 mots : "À mon niveau", "Concrètement", "Franchement", "de mon côté", "je le dis franchement", "c'est du vécu", "sur le terrain", "au quotidien", "pour être clair"
- 1 phrase courte (<8 mots) tous les 200 mots : "C'est du vécu." "Bon, l'intranet." "C'est très concret."
- 1 digression tous les 300 mots : "Bon,", "Franchement,", "Pour être clair,", "Voilà,", "Bref,", "Mais le truc c'est que"
- 1 métaphore accessible par section (500-1000 mots) : "tour de contrôle", "ceinture de sécurité", "on prend le pli", "en catimini", "un océan rouge", "ma boussole"
- Baisse volontaire du registre 20 % du temps : "dilapider" → "cramer", "pérenniser" → "faire durer", "socle" → "base"
- 1 micro-imperfection subtile toutes les 500 mots : accord raté ("des logiques de..."), typo discrète ("operationalité"), guillemets bricolés
- Fluidification par participes présents : "percevant parfois", "engageant"
- Ancrage temporel/spatial : "Dans mon quotidien", "À Saint-Maur", "Cette semaine encore", "Franchement au début"`,
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

const MODE_CONFIG: Record<HumanizeMode, { model: ClaudeModel; temperature: number; maxPasses: number; overlap: number }> = {
  basic: { model: "claude-haiku-4-5", temperature: 0.7, maxPasses: 2, overlap: 200 },
  balanced: { model: "claude-sonnet-4-6", temperature: 0.95, maxPasses: 3, overlap: 300 },
  aggressive: { model: "claude-opus-4-7", temperature: 1.0, maxPasses: 4, overlap: 400 },
  // compilatio-proof = Opus 4.8 + boucle sur score Compilatio-emulator (Opus 4.8) jusqu'à <15%, 5 passes max
  "compilatio-proof": { model: "claude-opus-4-8", temperature: 1.0, maxPasses: 5, overlap: 400 },
};

/**
 * Anti-Compilatio rewriting instructions — derived from analysis of a real
 * Compilatio-flagged DPP (Financia BS, July 2026, 47% IA detected on 13k words).
 * Compilatio's ML model is triggered by SEMANTIC patterns that surface stats
 * miss:
 *  - Enumerations in cascade ("Premièrement...Deuxièmement...Troisièmement...")
 *  - Balanced antithesis ("X n'est pas Y, c'est Z")
 *  - Abstract nominalization ("trois effets convergents", "un socle de X")
 *  - Uniform elevated register even in short sentences
 *  - Perfect grammar and paragraph rhythm
 * Break these explicitly. Result: text much closer to a real tired student.
 */
const ANTI_COMPILATIO_RULES: Record<Language, string> = {
  fr: `RÈGLES ANTI-COMPILATIO (respecter à la lettre — c'est ça qui fait passer le seuil ML) :
A. **Anti-cascades énumératives** : dès que tu vois "Premièrement..., Deuxièmement..., Troisièmement..." ou "D'une part... D'autre part..." ou "Trois points ressortent : d'abord... ensuite... enfin..." → CASSE-LES. Reformule en phrases indépendantes qui ne s'annoncent pas comme une liste, ou introduis avec une phrase orale : "Il y a plein de choses à dire, mais si je devais en retenir quelques-unes...". Fusionne parfois deux points en un.
B. **Anti-antithèses balancées** : les tournures "X n'est pas Y, c'est Z" / "loin d'être X, c'est Y" / "Non seulement X mais aussi Y" → REFORMULE en une phrase moins symétrique. Ex : "La conformité n'est pas un coût, c'est un actif" → "En vrai, respecter les règles ça sert. Ça pose une base solide, ça sécurise le job, ça évite les emmerdes."
C. **Baisse volontaire du registre par endroits** : remplace les mots trop soutenus par leur équivalent courant. "dilapider" → "cramer", "convergent" → "qui va dans le même sens", "socle" → "base", "actif" (au sens comptable métaphorique) → "atout", "pérenniser" → "faire durer", "en amont" → "avant". PAS partout — juste 1 mot par paragraphe pour casser l'uniformité.
D. **Introduis des micro-imperfections** : phrase trop courte (3-5 mots) suivie d'une longue, virgule oubliée volontairement à un endroit, connecteur maladroit ("Après", "Du coup" au début d'un paragraphe formel), incise entre parenthèses relâchée ("(enfin, je crois)").
E. **Nominalizations abstraites → verbes concrets** : "l'identification des opportunités" → "on identifie les opportunités", "la formalisation des objectifs" → "on formalise les objectifs par écrit", "un renforcement de la fidélisation" → "les collaborateurs restent plus longtemps".
F. **Zéro perfection grammaticale** : coupe une phrase en plein milieu par un point (comme si tu reprenais ton souffle), commence 1 paragraphe sur 4 par une conjonction ("Et", "Mais", "Alors"), utilise des "y'a" / "c'est que" à l'oral.
G. **Casse la parallélisme sémantique** : si le paragraphe présente 3 idées avec la même structure syntaxique (Sujet-Verbe-Complément uniforme, ou "Cela permet X, cela facilite Y, cela renforce Z"), varie les structures. Une phrase déclarative, une question rhétorique, une exclamation courte.

━━━━━━━━━━━━━━━━━━━━━━━
QUOTAS D'INJECTION OBLIGATOIRES (calibrés sur un DPP réel qui passe à 9 % Compilatio) :
━━━━━━━━━━━━━━━━━━━━━━━
H. **Marqueur personnel tous les 200 mots** : minimum 1 occurrence toutes les 200 mots dans une liste comprenant "À mon niveau", "Concrètement", "Franchement", "de mon côté", "je le dis franchement", "c'est du vécu", "sur le terrain", "au quotidien", "pour être clair", "au final". OBLIGATOIRE, non négociable.

I. **Phrase courte tous les 200 mots** : au moins 1 phrase de moins de 8 mots toutes les 200 mots — style "C'est du vécu.", "Bon, l'intranet.", "Ça change tout.", "Résultat concret." Ne mets JAMAIS 300 mots consécutifs de phrases longues uniformes.

J. **Digression tous les 300 mots** : "Bon,", "Franchement,", "Pour être clair,", "Voilà,", "Bref,", "Mais le truc c'est que", en ouverture de phrase. Au moins 1 toutes les 300 mots.

K. **Métaphore accessible par section** : 1 par section de 500-1000 mots. Exemples inspirés du DPP-MAX à 9 % : "ma ceinture de sécurité", "tour de contrôle en gros", "on prend le pli", "en catimini", "un océan rouge", "ma boussole", "gagner en operationalité", "cramer la confiance", "frôle l'indigestion". Ne PAS utiliser "un socle de X" (pattern LLM).

L. **Baisse de registre 20 % du temps** : sur 5 mots soutenus utilisés, au moins 1 doit être remplacé par un mot courant. "dilapider" → "cramer", "pérenniser" → "faire durer", "socle" → "base", "convergent" → "qui va dans le même sens", "prépondérant" → "central".

M. **Micro-imperfection toutes les 500 mots** : discret mais présent. Accord raté isolé ("une logiques de..."), typo subtile ("operationalité", "conﬁance"), guillemets bricolés, apostrophe manquante isolée, participe passé mal accordé une fois par page.

N. **Ancrage temporel/spatial fréquent** : "Dans mon quotidien à Saint-Maur", "Cette semaine encore", "Franchement au début", "Depuis mon arrivée en septembre 2025", "L'autre jour en RDV client". Au moins 3 ancrages concrets par section.

O. **Métacommentaire humain** : "je le dis franchement" en incise, "et c'est du vécu" entre parenthèses, "(pour ce que ça vaut)", "(honnêtement)". Au moins 1 par section de 500 mots.

BENCHMARK ATTENDU : ton texte réécrit doit avoir ces caractéristiques mesurables :
- Ratio marqueurs perso / 1000 mots : ≥ 5
- Ratio phrases <8 mots / total phrases : ≥ 10 %
- Ratio digressions / 1000 mots : ≥ 3
- Baisse de registre spottée : ≥ 20 % des mots soutenus
- Aucun "trois effets convergents", aucune cascade "Premièrement/Deuxièmement/Troisièmement", aucune antithèse balancée "n'est pas X, c'est Y".`,
  en: `ANTI-COMPILATIO RULES:
A. Kill enumeration cascades ("First... Second... Third...") — reformulate as loose flowing sentences.
B. Break balanced antitheses ("X is not Y, it's Z") — make less symmetrical.
C. Lower register spottily — 1 casual word per paragraph.
D. Insert micro-imperfections: short sentence, missing comma, awkward connector.
E. Nominalizations → concrete verbs.
F. Zero grammatical perfection — start with conjunctions, cut sentences mid-flow.
G. Vary syntactic structures across paragraph.`,
  es: `REGLAS ANTI-COMPILATIO:
A. Romper cascadas enumerativas ("Primero... Segundo... Tercero...") — reformular como frases sueltas.
B. Romper antítesis equilibradas ("X no es Y, es Z") — hacerlas menos simétricas.
C. Bajar el registro puntualmente — 1 palabra coloquial por párrafo.
D. Insertar micro-imperfecciones.
E. Nominalizaciones → verbos concretos.
F. Cero perfección gramatical.
G. Variar estructuras sintácticas.`,
};

/**
 * Claude-based text scoring — reflects Compilatio-grade detection way
 * better than the heuristic. Uses Sonnet with a strict JSON output prompt.
 * Returns an overall score 0-100.
 *
 * The score is INFERRED from LLM reasoning about typical AI signals
 * (semantic patterns, register uniformity, cascade enumerations, etc.).
 * Empirically calibrated to be within ~10 pts of a real Compilatio detection
 * on academic French texts.
 */
export async function claudeScoreText(
  text: string,
  language: Language = "fr"
): Promise<{ overall: number; reasoning: string; topOffenders: string[] }> {
  if (!text || text.length < 200) {
    return { overall: 0, reasoning: "Texte trop court pour analyse fiable.", topOffenders: [] };
  }

  // 3-slice parallel Sonnet 4.6 scoring — fast, resilient to the CF tunnel
  // 100 s timeout, and gives a robust median. Avoids the 6-Opus emulator
  // which times out on 12k-word documents.
  const slices = sliceForScoring(text, 4_500);
  const langHint = language === "fr" ? "français" : language === "en" ? "anglais" : "espagnol";
  const heuristicFallback = detectAI(text, language).overall;

  const slicePrompt = (slice: string) => `Score Compilatio-grade IA (0-100) sur ce texte ${langHint} (${slice.split(/\s+/).length} mots).

BARÈME : 0-15 humain · 15-30 mixte · 30-50 moitié IA · 50-75 majoritairement IA · 75+ quasi 100% IA.

SIGNAUX IA (+) : "Premièrement/Deuxièmement/Troisièmement", "n'est pas X c'est Y", "trois effets convergents", "un socle de X", "Il est important de noter", "En somme", nominalizations "l'identification des", registre uniforme, zéro burstiness.

SIGNAUX HUMAINS (-) : "franchement,", "concrètement,", "à mon niveau", "c'est du vécu", "bon,", métaphores accessibles, phrases <8 mots, registre variable, micro-imperfections.

Sois honnête. Réponds STRICTEMENT ce JSON :
{"overall": <int 0-100>, "reasoning": "<1 phrase>", "topOffenders": ["<extrait>", "<extrait>"]}

TEXTE :
"""
${slice}
"""`;

  const results = await Promise.all(
    slices.map((slice) =>
      callClaude(slicePrompt(slice), {
        system: "Détecteur IA Compilatio-grade. Réponds uniquement JSON valide.",
        model: "claude-sonnet-4-6",
        timeoutMs: 75_000,
      })
        .then((raw) => {
          const m = raw.match(/\{[\s\S]*\}/);
          if (!m) return null;
          return JSON.parse(m[0]) as { overall: number; reasoning?: string; topOffenders?: string[] };
        })
        .catch(() => null)
    )
  );
  const valid = results.filter(Boolean) as Array<{ overall: number; reasoning?: string; topOffenders?: string[] }>;

  if (valid.length === 0) {
    // All slices failed — fall back to heuristic so the loop still runs
    return {
      overall: heuristicFallback,
      reasoning: "Score Claude indisponible — bascule vers heuristique.",
      topOffenders: [],
    };
  }

  // Median score across slices (robust to outliers)
  const scores = valid.map((v) => Math.max(0, Math.min(100, Math.round(v.overall ?? 0)))).sort((a, b) => a - b);
  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 === 0
    ? Math.round((scores[mid - 1] + scores[mid]) / 2)
    : scores[mid];

  // Extra safety: if Claude returned an implausibly low score but the
  // heuristic (which is now pattern-aware) says >40, trust the heuristic.
  const overall = median < 15 && heuristicFallback > 40 ? heuristicFallback : median;

  return {
    overall,
    reasoning: valid.map((v) => v.reasoning).filter(Boolean).join(" · "),
    topOffenders: valid.flatMap((v) => v.topOffenders ?? []).slice(0, 5),
  };
}

/** Build up to 3 slices (start / middle / end) capped at sliceChars. */
function sliceForScoring(text: string, sliceChars: number): string[] {
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

// Legacy single-call scorer kept for future use — currently unused.
async function _legacyScoreText(text: string, language: Language): Promise<{ overall: number; reasoning: string; topOffenders: string[] }> {
  const sample = text.slice(0, 12_000);
  const langHint = language === "fr" ? "français" : language === "en" ? "anglais" : "espagnol";
  const prompt = `Tu es un détecteur d'IA calibré pour émuler Compilatio Studium (le détecteur de référence en France pour les universités et écoles supérieures).

Analyse ce texte en ${langHint} et retourne un score global 0-100 estimant la probabilité que Compilatio le classe comme "généré par IA".

Compilatio est SEVERE et repère notamment :
- Enumerations en cascade ("Premièrement... Deuxièmement... Troisièmement...")
- Antithèses balancées ("X n'est pas Y, c'est Z", "loin d'être X, c'est Y")
- Registre soutenu uniforme sur toute la longueur
- Nominalizations abstraites ("un socle de X", "trois effets convergents")
- Structures parallèles (Sujet-Verbe-Complément uniforme sur 3 phrases)
- Rythme paragraphes trop régulier (pas de burstiness)
- Vocabulaire cohérent partout, même dans les extraits courts

RÉPONDS UNIQUEMENT en JSON strict :
{
  "overall": <int 0-100, honnête, ne surestime pas MAIS ne sous-estime pas non plus>,
  "reasoning": "<1-2 phrases synthétiques>",
  "topOffenders": ["<extrait 100-200 chars le plus flag>", "<idem>", "<idem>"]
}

Barème calibré Compilatio :
- 0-15 : très humain, passe sans souci
- 15-30 : mixte, quelques passages IA
- 30-50 : moitié IA, Compilatio va flag
- 50-75 : majoritairement IA, gros risque
- 75-100 : quasi 100% IA

TEXTE :
"""
${sample}
"""`;

  try {
    const raw = await callClaude(prompt, {
      system: "Tu es un détecteur d'IA sévère. Réponds uniquement par un JSON valide, sans backticks ni commentaire.",
      model: "claude-sonnet-4-6",
      timeoutMs: 50_000,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { overall: 50, reasoning: "Analyse Claude non parseable.", topOffenders: [] };
    const parsed = JSON.parse(m[0]) as { overall: number; reasoning?: string; topOffenders?: string[] };
    return {
      overall: Math.max(0, Math.min(100, Math.round(parsed.overall ?? 50))),
      reasoning: parsed.reasoning ?? "",
      topOffenders: parsed.topOffenders ?? [],
    };
  } catch (err) {
    console.error("[claudeScoreText] failed:", err);
    return { overall: 50, reasoning: "Erreur Claude.", topOffenders: [] };
  }
}

function buildPrompt(text: string, language: Language, mode: HumanizeMode): string {
  const intensity =
    mode === "compilatio-proof" ? "COMPILATIO-PROOF (maximum)" :
    mode === "aggressive" ? "AGGRESSIVE" :
    mode === "balanced" ? "ÉQUILIBRÉ" :
    "BASIQUE";
  // Anti-Compilatio rules now apply from BALANCED and up — the previous
  // restriction to aggressive+ meant balanced runs delivered only a ~10 pt
  // drop on real DPPs, which is worthless.
  const isHard = mode === "balanced" || mode === "aggressive" || mode === "compilatio-proof";
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

${isHard ? ANTI_COMPILATIO_RULES[language] + "\n\n" : ""}${FEWSHOT_EXAMPLES[language]}

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

  // Parallelise chunk rewriting — critical to stay under Vercel Hobby's
  // 60 s per-request cap. Sequential = 5 chunks × 30 s = 150 s (killed).
  // Parallel = 5 chunks in ~30 s wall clock (all-in-flight together).
  const chunkTexts = chunks.map((c) => c.join("\n\n"));
  const rewritten = await Promise.all(
    chunkTexts.map((chunkText) =>
      callClaude(buildPrompt(chunkText, language, mode), {
        model: config.model,
        system:
          "Tu es un assistant qui réécrit du texte académique pour le rendre indétectable par les outils anti-IA (Compilatio, GPTZero). Retourne UNIQUEMENT le texte réécrit, sans commentaire.",
        timeoutMs: 55_000,
      })
        .then((out) => {
          const t = out.trim();
          return t.length > 0 ? t : chunkText;
        })
        .catch((err) => {
          console.error("[humanize-engine] llmRewrite chunk failed:", err);
          return chunkText;
        })
    )
  );

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

  // Step 5 — LLM rewrite (with retry).
  // For "compilatio-proof" mode we score via Claude Sonnet instead of the
  // heuristic — that's what Compilatio-grade requires.
  const useClaudeScoring = options.useClaudeScoring ?? mode === "compilatio-proof";
  let passesApplied = 0;
  let scoreAfter = detectAI(restorePreservation(workingText, preservation.map), language);
  let claudeScoreBefore: number | undefined;
  let claudeScoreAfter: number | undefined;
  let claudeReasoning: string | undefined;
  let totalLlmChunks = 0;

  if (useClaudeScoring) {
    const r = await claudeScoreText(originalText, language);
    claudeScoreBefore = r.overall;
  }

  const currentTruthScore = async () => {
    if (!useClaudeScoring) return scoreAfter.overall;
    const restored = restorePreservation(workingText, preservation.map);
    const r = await claudeScoreText(restored, language);
    claudeScoreAfter = r.overall;
    claudeReasoning = r.reasoning;
    return r.overall;
  };

  let truth = await currentTruthScore();

  while (passesApplied < config.maxPasses && truth > targetScore) {
    passesApplied++;
    await onProgress?.("rewriting-llm", passesApplied, config.maxPasses,
      useClaudeScoring ? `Claude-score actuel : ${truth}% · nouvelle passe agressive.` : undefined);
    const { text: rewritten, chunkCount } = await llmRewrite(workingText, language, mode);
    workingText = rewritten;
    totalLlmChunks += chunkCount;

    await onProgress?.("detecting-after", passesApplied, config.maxPasses);
    scoreAfter = detectAI(restorePreservation(workingText, preservation.map), language);
    truth = await currentTruthScore();

    if (passesApplied < config.maxPasses && truth > targetScore) {
      await onProgress?.("retrying", passesApplied, config.maxPasses,
        useClaudeScoring
          ? `Claude-score encore élevé (${truth}%). Relance.`
          : `Score encore élevé (${truth}%). Nouvelle passe avec température accrue.`);
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
    claudeScoreBefore,
    claudeScoreAfter,
    claudeReasoning,
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
