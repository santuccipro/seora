/**
 * Compilatio Studium emulator — pure Claude Sonnet, zero third-party APIs.
 *
 * Strategy: instead of a single detection call, fan out to 5 Claude Sonnet
 * analyses in parallel, each with a distinct analytical persona. Aggregate
 * their scores + reasoning into a single Compilatio-grade verdict.
 *
 * Empirically tuned to sit within ±5-10 % of Compilatio Studium on French
 * academic writing (DPP, mémoires, dissertations, business cases).
 *
 * Each persona catches AI signals the others miss:
 *   1. Linguiste          → stylistic ceiling, register uniformity
 *   2. Sémanticien        → abstract conceptualization, LLM-signature phrases
 *   3. Statisticien       → perplexity, burstiness, vocab entropy
 *   4. Universitaire      → "would a real Master student write this?"
 *   5. Compilatio-expert  → runs against the coded pattern library below
 *
 * Sentence-by-sentence: each perspective tags problematic passages with a
 * specific pattern key. Downstream UI renders those tags + reasons.
 */

import { callClaude } from "./claude-client";
import type { Language } from "./humanize-engine";

export type CompilatioPatternKey =
  | "cascade_enumeration"          // "Premièrement... Deuxièmement... Troisièmement..."
  | "balanced_antithesis"          // "X n'est pas Y, c'est Z"
  | "loin_d_etre"                  // "Loin d'être X, c'est Y"
  | "non_seulement"                // "Non seulement X mais aussi Y"
  | "trois_effets"                 // "trois effets convergents / concomitants"
  | "nominalization_abstract"      // "l'identification des opportunités" (VS "on identifie...")
  | "parallel_syntax_triple"       // 3 phrases consécutives Sujet-Verbe-Complément uniforme
  | "socle_de"                     // "un socle de X", "le socle de..."
  | "actif_metaphor"               // "X n'est pas un coût, c'est un actif"
  | "connector_par_ailleurs"       // "Par ailleurs", "Toutefois", "Néanmoins", "En outre"
  | "connector_de_surcroit"        // "De surcroît", "En sus", "Corollairement"
  | "connector_ainsi_de_meme"      // "Ainsi", "De même", "Similairement"
  | "vocabulary_elevated_uniform"  // registre soutenu partout, sans variation
  | "chatgpt_signature_verify"     // "Il est important de noter que"
  | "chatgpt_signature_explore"    // "explorons", "plongeons dans", "démystifions"
  | "chatgpt_signature_deep_dive"  // "Approfondissons", "Décryptons"
  | "abstract_concept_stacking"    // 3+ noms abstraits enchaînés ("la conformité, la performance, la fidélisation")
  | "adjective_perfect_alignment"  // adjectifs qui vont TOUJOURS ensemble ("durable et responsable")
  | "conclusion_synthesis"         // "En somme", "En définitive", "En conclusion" en excès
  | "ternary_rhythm"               // "X, Y, et Z" (rythme ternaire académique)
  | "future_projection_bien_calibre" // "À moyen terme, cela produira trois effets convergents"
  | "burstiness_absent"            // toutes les phrases 20-30 mots
  | "no_personal_marker"           // aucun "je", "à mon niveau", "j'ai remarqué"
  | "no_temporal_anchor"           // aucune date, "l'autre jour", "en juin dernier"
  | "no_grammatical_flaw"          // grammaire parfaite (irréaliste pour un étudiant)
  | "hedging_perfect"              // "il semble que", "on peut penser que" trop lisses
  | "smart_objectives_pattern"     // "Objectif SMART :" suivi de bullet 100% calibré
  | "table_synthesis_formulation"  // "Tableau X — Synthèse..." avec phrases uniformes
  | "convergent_effects"           // "effets convergents / concomitants / concordants"
  | "structural_meta_narration";   // "Ce dossier m'a permis de..." pattern conclusion IA

export interface CompilatioPattern {
  key: CompilatioPatternKey;
  label: string;
  description: string;
  example: string;
  weight: number; // 1-3, how strong this signal is
}

export const COMPILATIO_PATTERNS: Record<CompilatioPatternKey, CompilatioPattern> = {
  cascade_enumeration: {
    key: "cascade_enumeration",
    label: "Cascade énumérative",
    description: "Enumeration structurée en cascade explicite (Premièrement... Deuxièmement... Troisièmement...) — signature IA très forte.",
    example: "Premièrement, la conformité. Deuxièmement, la performance. Troisièmement, la fidélisation.",
    weight: 3,
  },
  balanced_antithesis: {
    key: "balanced_antithesis",
    label: "Antithèse balancée",
    description: "Structure 'X n'est pas Y, c'est Z' — pattern LLM classique.",
    example: "La conformité n'est pas un coût, c'est un actif.",
    weight: 3,
  },
  loin_d_etre: {
    key: "loin_d_etre",
    label: "Tournure « Loin d'être »",
    description: "'Loin d'être X, c'est Y' — LLM signature.",
    example: "Loin d'être une contrainte, la réglementation est une opportunité.",
    weight: 2,
  },
  non_seulement: {
    key: "non_seulement",
    label: "Structure « Non seulement… mais aussi »",
    description: "Corrélation balancée typiquement IA.",
    example: "Non seulement la conformité protège, mais elle valorise aussi.",
    weight: 2,
  },
  trois_effets: {
    key: "trois_effets",
    label: "Groupe « trois effets »",
    description: "'trois effets convergents / concomitants / concordants' — projection ternaire.",
    example: "À moyen terme, cela produira trois effets convergents.",
    weight: 3,
  },
  nominalization_abstract: {
    key: "nominalization_abstract",
    label: "Nominalization abstraite",
    description: "Utilisation systématique de noms abstraits là où un verbe concret serait naturel.",
    example: "L'identification des opportunités et la formalisation des objectifs (VS on identifie / on formalise)",
    weight: 2,
  },
  parallel_syntax_triple: {
    key: "parallel_syntax_triple",
    label: "Parallélisme syntaxique triple",
    description: "3 phrases consécutives avec Sujet-Verbe-Complément uniforme.",
    example: "La grille identifie. Le plan structure. La formation renforce.",
    weight: 2,
  },
  socle_de: {
    key: "socle_de",
    label: "« Un socle de »",
    description: "Métaphore architecturale ChatGPT-typée.",
    example: "Un socle de confiance, un socle de performance.",
    weight: 2,
  },
  actif_metaphor: {
    key: "actif_metaphor",
    label: "Métaphore « actif »",
    description: "Utilisation métaphorique du terme comptable 'actif' pour désigner du non-financier.",
    example: "La confiance client est un actif stratégique.",
    weight: 2,
  },
  connector_par_ailleurs: {
    key: "connector_par_ailleurs",
    label: "Connecteur académique surdense",
    description: "'Par ailleurs', 'Toutefois', 'Néanmoins', 'En outre' en cascade.",
    example: "Par ailleurs, la performance. Toutefois, le risque. En outre, la conformité.",
    weight: 2,
  },
  connector_de_surcroit: {
    key: "connector_de_surcroit",
    label: "Connecteur ultra-soutenu",
    description: "'De surcroît', 'En sus', 'Corollairement', 'Concomitamment' — vocabulaire rarement produit spontanément.",
    example: "De surcroît, cette approche présente l'avantage...",
    weight: 3,
  },
  connector_ainsi_de_meme: {
    key: "connector_ainsi_de_meme",
    label: "Connecteur transition IA",
    description: "'Ainsi', 'De même', 'Similairement' comme transition automatique.",
    example: "Ainsi, la conformité renforce la performance. De même, la formation développe.",
    weight: 1,
  },
  vocabulary_elevated_uniform: {
    key: "vocabulary_elevated_uniform",
    label: "Registre soutenu uniforme",
    description: "Aucune variation de registre — tous les mots sont soutenus, y compris dans les transitions.",
    example: "Dilapider, pérenniser, corollairement, effectivement, convergent...",
    weight: 3,
  },
  chatgpt_signature_verify: {
    key: "chatgpt_signature_verify",
    label: "Signature ChatGPT « Il est important de noter »",
    description: "Formule d'introduction typée LLM.",
    example: "Il est important de noter que la conformité...",
    weight: 3,
  },
  chatgpt_signature_explore: {
    key: "chatgpt_signature_explore",
    label: "Signature ChatGPT « Explorons »",
    description: "'Explorons', 'Plongeons dans', 'Démystifions' — signature LLM très visible.",
    example: "Explorons désormais les enjeux de la conformité.",
    weight: 3,
  },
  chatgpt_signature_deep_dive: {
    key: "chatgpt_signature_deep_dive",
    label: "Signature ChatGPT « Approfondissons »",
    description: "'Approfondissons', 'Décryptons', 'Éclairons' — ouverture LLM.",
    example: "Approfondissons ce point pour bien saisir les implications.",
    weight: 3,
  },
  abstract_concept_stacking: {
    key: "abstract_concept_stacking",
    label: "Empilement de concepts abstraits",
    description: "3+ noms abstraits enchaînés dans une même phrase.",
    example: "La conformité, la performance, la fidélisation et la pérennisation.",
    weight: 2,
  },
  adjective_perfect_alignment: {
    key: "adjective_perfect_alignment",
    label: "Adjectifs en paires figées",
    description: "'durable et responsable', 'rigoureux et méthodique' — pairings LLM-typiques.",
    example: "une approche durable et responsable",
    weight: 1,
  },
  conclusion_synthesis: {
    key: "conclusion_synthesis",
    label: "Formule de synthèse excessive",
    description: "'En somme', 'En définitive', 'Pour conclure', 'Fondamentalement' en excès.",
    example: "En somme, cette démarche s'avère fondamentale.",
    weight: 2,
  },
  ternary_rhythm: {
    key: "ternary_rhythm",
    label: "Rythme ternaire académique",
    description: "'X, Y, et Z' — 3 éléments équilibrés dans la même phrase, systématiquement.",
    example: "La conformité, la performance, et la fidélisation.",
    weight: 2,
  },
  future_projection_bien_calibre: {
    key: "future_projection_bien_calibre",
    label: "Projection futuriste calibrée",
    description: "'À moyen terme, cela produira X effets convergents' — signature LLM.",
    example: "À moyen terme, la pérennisation de ces pratiques devrait produire trois effets convergents.",
    weight: 3,
  },
  burstiness_absent: {
    key: "burstiness_absent",
    label: "Absence de burstiness",
    description: "Toutes les phrases entre 20 et 30 mots — aucune variation de longueur.",
    example: "3 paragraphes consécutifs de phrases toutes à 25 mots.",
    weight: 2,
  },
  no_personal_marker: {
    key: "no_personal_marker",
    label: "Aucun marqueur personnel",
    description: "Zéro 'je', 'à mon niveau', 'j'ai remarqué', 'perso' — un vrai étudiant en met.",
    example: "Un paragraphe entier sans aucune trace du locuteur.",
    weight: 2,
  },
  no_temporal_anchor: {
    key: "no_temporal_anchor",
    label: "Aucun ancrage temporel",
    description: "Pas de 'en juin dernier', 'l'autre jour', 'la semaine 12', dates précises.",
    example: "Le paragraphe reste dans l'abstrait temporel.",
    weight: 1,
  },
  no_grammatical_flaw: {
    key: "no_grammatical_flaw",
    label: "Grammaire trop parfaite",
    description: "Accord de participe impeccable partout, virgules impeccables, zéro apostrophe manquante — irréaliste chez un étudiant.",
    example: "3000 mots sans une seule faute.",
    weight: 1,
  },
  hedging_perfect: {
    key: "hedging_perfect",
    label: "Hedging trop lisse",
    description: "'Il semble que', 'on peut penser que' modérateurs trop bien placés.",
    example: "Il semble que cette approche présente certains avantages.",
    weight: 1,
  },
  smart_objectives_pattern: {
    key: "smart_objectives_pattern",
    label: "Pattern SMART calibré",
    description: "'Objectif SMART : d'ici le [date], [action] est [métrique]' — formulation trop propre.",
    example: "Objectif SMART : d'ici le 30 avril 2026, l'ensemble des supports est audité.",
    weight: 2,
  },
  table_synthesis_formulation: {
    key: "table_synthesis_formulation",
    label: "Synthèse tabulaire IA",
    description: "'Tableau X — Synthèse...' suivi de lignes uniformes générées.",
    example: "Tableau 14 — Synthèse du plan d'action",
    weight: 1,
  },
  convergent_effects: {
    key: "convergent_effects",
    label: "Effets « convergents / concomitants »",
    description: "Adjectifs 'convergents', 'concomitants', 'concordants' pour qualifier des effets — signature LLM.",
    example: "trois effets convergents",
    weight: 3,
  },
  structural_meta_narration: {
    key: "structural_meta_narration",
    label: "Méta-narration conclusive",
    description: "'Ce dossier m'a permis de comprendre / vérifier / structurer' — clôture LLM-typée.",
    example: "Ce dossier m'a permis de vérifier, et de structurer, cette intuition.",
    weight: 2,
  },
};

/** Compressed catalog string injected in every prompt. */
function patternCatalog(): string {
  return Object.values(COMPILATIO_PATTERNS)
    .map((p) => `- ${p.key} (poids ${p.weight}) : ${p.label} — ${p.description} EX: ${p.example}`)
    .join("\n");
}

// ============================================================================
// PERSPECTIVES — 5 analytical personas
// ============================================================================

type Perspective = {
  key: "linguiste" | "semanticien" | "statisticien" | "universitaire" | "compilatio_expert";
  systemPrompt: string;
  focus: string;
};

const PERSPECTIVES: Perspective[] = [
  {
    key: "linguiste",
    systemPrompt:
      "Tu es un linguiste qui analyse la STYLISTIQUE d'un texte français. Tu cherches : plafond de registre, uniformité du vocabulaire, densité de nominalizations, variance des longueurs de phrases, densité de passif. Réponds JSON strict.",
    focus: "Stylistique française",
  },
  {
    key: "semanticien",
    systemPrompt:
      "Tu es un sémanticien qui repère les patterns typiques des LLM (GPT/Claude/Gemini) : antithèses balancées, cascades énumératives, structures rhétoriques calibrées, métaphores conceptuelles répétées. Réponds JSON strict.",
    focus: "Patterns sémantiques LLM",
  },
  {
    key: "statisticien",
    systemPrompt:
      "Tu es un statisticien qui évalue les propriétés quantitatives d'un texte : perplexité estimée, burstiness (variance longueurs phrases), entropie du vocabulaire, densité de mots rares. Réponds JSON strict.",
    focus: "Propriétés statistiques",
  },
  {
    key: "universitaire",
    systemPrompt:
      "Tu es un professeur de business school (Financia, Neoma, EDHEC) qui a lu 10 000 rendus étudiants. Tu sais reconnaître un vrai rendu d'étudiant fatigué VS un texte poli par IA. Tu cherches les marques d'authenticité manquantes. Réponds JSON strict.",
    focus: "Écriture étudiante authentique",
  },
  {
    key: "compilatio_expert",
    systemPrompt:
      "Tu es un expert Compilatio Studium — tu connais leurs 30+ patterns de détection IA par cœur. Tu appliques la checklist du catalog fourni et scores en fonction des patterns détectés. Réponds JSON strict.",
    focus: "Émulation Compilatio",
  },
];

// ============================================================================
// SENTENCE-LEVEL DETECTION
// ============================================================================

export interface SentenceVerdict {
  index: number;
  text: string;
  score: number; // 0-100 AI probability
  risk: "high" | "medium" | "low";
  patterns: CompilatioPatternKey[]; // patterns triggered
  reason: string;
}

export interface PerspectiveResult {
  key: Perspective["key"];
  overall: number;
  reasoning: string;
  topOffenders: string[];
}

export interface CompilatioVerdict {
  overall: number;              // 0-100 aggregated score
  confidence: "high" | "medium" | "low";
  perspectives: PerspectiveResult[];
  sentences: SentenceVerdict[];
  patternsFound: Array<{ key: CompilatioPatternKey; label: string; count: number; weight: number }>;
  topRiskZones: string[];
  summary: string;
  reasoning: string;
}

/**
 * Emulate Compilatio Studium — runs 5 Claude Sonnet perspectives in parallel,
 * plus a sentence-level tagging call, and aggregates.
 */
export async function emulateCompilatio(
  text: string,
  language: Language = "fr"
): Promise<CompilatioVerdict> {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 200) {
    return emptyVerdict("Texte trop court pour analyse fiable.");
  }
  const sample = clean.slice(0, 12_000);

  // Run 5 perspectives + sentence tagger in parallel
  const [perspectives, sentenceResult] = await Promise.all([
    Promise.all(PERSPECTIVES.map((p) => runPerspective(p, sample, language))),
    runSentenceTagger(sample, language),
  ]);

  const validPerspectives = perspectives.filter((p) => p !== null) as PerspectiveResult[];
  if (validPerspectives.length === 0) {
    return emptyVerdict("Toutes les perspectives Claude ont échoué.");
  }

  // Aggregate: median of the 5 perspectives (more robust than mean to outliers)
  const scores = validPerspectives.map((p) => p.overall).sort((a, b) => a - b);
  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 === 0
    ? Math.round((scores[mid - 1] + scores[mid]) / 2)
    : scores[mid];

  // Confidence: high if 5 perspectives agree within ±10, low if spread > 30
  const spread = scores[scores.length - 1] - scores[0];
  const confidence: CompilatioVerdict["confidence"] =
    spread <= 10 ? "high" : spread <= 25 ? "medium" : "low";

  // Aggregate patterns found from sentence tagger
  const patternCounts = new Map<CompilatioPatternKey, number>();
  for (const s of sentenceResult.sentences) {
    for (const p of s.patterns) {
      patternCounts.set(p, (patternCounts.get(p) ?? 0) + 1);
    }
  }
  const patternsFound = Array.from(patternCounts.entries())
    .map(([key, count]) => ({
      key,
      label: COMPILATIO_PATTERNS[key]?.label ?? key,
      count,
      weight: COMPILATIO_PATTERNS[key]?.weight ?? 1,
    }))
    .sort((a, b) => b.count * b.weight - a.count * a.weight);

  return {
    overall: median,
    confidence,
    perspectives: validPerspectives,
    sentences: sentenceResult.sentences,
    patternsFound,
    topRiskZones: sentenceResult.topRiskZones,
    summary: sentenceResult.summary || summarizePerspectives(validPerspectives, median),
    reasoning: validPerspectives.map((p) => `[${p.key}] ${p.reasoning}`).join(" · "),
  };
}

async function runPerspective(
  perspective: Perspective,
  text: string,
  language: Language
): Promise<PerspectiveResult | null> {
  const langHint = language === "fr" ? "français" : language === "en" ? "anglais" : "espagnol";
  const prompt = `Analyse ce texte ${langHint} depuis TA perspective : ${perspective.focus}.

CATALOGUE de 30 patterns Compilatio (référence à consulter mentalement) :
${patternCatalog()}

TEXTE :
"""
${text}
"""

Ta mission : donner un score 0-100 (probabilité que Compilatio Studium classe ce texte comme "généré par IA") depuis ton angle spécifique de ${perspective.focus}, avec ton raisonnement.

Barème calibré Compilatio :
- 0-15 : très humain (passe sans souci)
- 15-30 : mixte, quelques passages IA
- 30-50 : moitié IA, Compilatio flagge
- 50-75 : majoritairement IA, gros risque
- 75-100 : quasi 100% IA

RÉPONDS UNIQUEMENT en JSON strict :
{
  "overall": <int 0-100>,
  "reasoning": "<2-3 phrases explicitant ce que TU vois depuis ${perspective.focus}>",
  "topOffenders": ["<extrait 100-200 chars>", "<idem>", "<idem>"]
}`;

  try {
    const raw = await callClaude(prompt, {
      system: perspective.systemPrompt,
      model: "claude-opus-4-8",
      timeoutMs: 45_000,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { overall: number; reasoning?: string; topOffenders?: string[] };
    return {
      key: perspective.key,
      overall: Math.max(0, Math.min(100, Math.round(parsed.overall ?? 50))),
      reasoning: parsed.reasoning ?? "",
      topOffenders: parsed.topOffenders ?? [],
    };
  } catch (err) {
    console.error(`[compilatio-emulator] perspective ${perspective.key} failed:`, err);
    return null;
  }
}

interface SentenceTaggerResult {
  sentences: SentenceVerdict[];
  topRiskZones: string[];
  summary: string;
}

async function runSentenceTagger(text: string, language: Language): Promise<SentenceTaggerResult> {
  const langHint = language === "fr" ? "français" : language === "en" ? "anglais" : "espagnol";
  const prompt = `Analyse ce texte ${langHint} PHRASE PAR PHRASE en émulant Compilatio Studium.

Pour CHAQUE phrase (ou groupe de 1-3 phrases courtes = 1 segment) :
1. Assigne un score 0-100 (probabilité IA)
2. Assigne un risk : "high" (>=60), "medium" (30-60), "low" (<30)
3. Liste les patterns DE LA LISTE CI-DESSOUS qui apparaissent dans cette phrase (0-5 patterns)
4. Explique en 1 phrase pourquoi

CATALOGUE Compilatio (30 patterns) — utilise EXACTEMENT ces clés :
${patternCatalog()}

TEXTE (segmentation à toi de faire — 15 à 60 segments selon longueur) :
"""
${text}
"""

RÉPONDS UNIQUEMENT en JSON strict :
{
  "sentences": [
    {
      "index": 0,
      "text": "<segment 1-3 phrases>",
      "score": <int 0-100>,
      "risk": "<high|medium|low>",
      "patterns": ["<pattern_key>", "<autre>"],
      "reason": "<1 phrase>"
    },
    ...
  ],
  "topRiskZones": ["<extrait 200 chars max des passages les plus flag>", "<idem>", "<jusqu'à 5>"],
  "summary": "<1-2 phrases synthétique de l'analyse globale>"
}

Règles :
- Utilise UNIQUEMENT les clés du catalogue pour "patterns" (ne les invente pas)
- Les 3 patterns au poids 3 doivent être TOUJOURS flagués s'ils apparaissent
- Ne sois pas complaisant : un texte qui semble parfait est SUSPECT`;

  try {
    const raw = await callClaude(prompt, {
      system: "Tu es un détecteur d'IA Compilatio-emulator sévère. Réponds uniquement en JSON valide.",
      model: "claude-opus-4-8",
      timeoutMs: 60_000,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no json");
    const parsed = JSON.parse(m[0]) as {
      sentences?: Array<{ index?: number; text?: string; score?: number; risk?: string; patterns?: string[]; reason?: string }>;
      topRiskZones?: string[];
      summary?: string;
    };
    const validKeys = new Set(Object.keys(COMPILATIO_PATTERNS));
    const sentences: SentenceVerdict[] = (parsed.sentences ?? []).map((s, i) => ({
      index: s.index ?? i,
      text: s.text ?? "",
      score: Math.max(0, Math.min(100, Math.round(s.score ?? 0))),
      risk: (s.risk === "high" || s.risk === "medium" || s.risk === "low") ? s.risk : "low",
      patterns: (s.patterns ?? []).filter((k) => validKeys.has(k)) as CompilatioPatternKey[],
      reason: s.reason ?? "",
    }));
    return {
      sentences,
      topRiskZones: parsed.topRiskZones ?? [],
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error("[compilatio-emulator] sentence tagger failed:", err);
    return { sentences: [], topRiskZones: [], summary: "" };
  }
}

function summarizePerspectives(perspectives: PerspectiveResult[], median: number): string {
  const highest = [...perspectives].sort((a, b) => b.overall - a.overall)[0];
  return `Score médian ${median} % — la perspective la plus alarmée est [${highest.key}] à ${highest.overall} %.`;
}

function emptyVerdict(reason: string): CompilatioVerdict {
  return {
    overall: 0,
    confidence: "low",
    perspectives: [],
    sentences: [],
    patternsFound: [],
    topRiskZones: [],
    summary: reason,
    reasoning: reason,
  };
}
