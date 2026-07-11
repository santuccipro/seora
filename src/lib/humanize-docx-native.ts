/**
 * humanize-docx-native
 * --------------------
 * Étape C du refactor humanizer — l'ORCHESTRATEUR end-to-end.
 *
 * Pipeline complet sur un .docx :
 *  1. `parseDocx(inputBuffer)`                       (étape A)
 *  2. Score GLOBAL initial via `detector.tryseora.com/detect`
 *     (chunké en 4000 mots, moyenne pondérée)
 *  3. `humanizeSelective(paragraphs, ...)`           (étape B)
 *      → mute in-place les paragraphes HIGH (≥ highRiskThreshold)
 *  4. `serializeDocx({zip, documentDom})`            (étape A)
 *  5. Re-parse + re-score global du buffer produit → globalScoreAfter
 *  6. Si globalScoreAfter > finalTargetGlobal et qu'il reste des passes
 *     globales autorisées : on ABAISSE `highRiskThreshold` de 10 et on
 *     relance une passe sur les paragraphes encore risqués.
 *  7. Renvoie {outputBuffer, report}.
 *
 * ⚠ Design :
 *  - Isolation totale de `humanize-engine.ts` (le pipeline "full" en prod
 *    n'est pas touché). Ce module ouvre un NOUVEAU flow parallèle.
 *  - Toutes les dépendances externes (fetch détecteur, callClaude via
 *    humanizeSelective) sont injectables via `HumanizeDocxDeps` pour les
 *    tests. En prod : tout est par défaut sur les prod services.
 */

import {
  parseDocx,
  serializeDocx,
  ParagraphNode,
  ParsedDocx,
} from "./docx-native-parser";
import {
  humanizeSelective,
  HumanizeDeps,
  HumanizeReport,
} from "./humanize-selective";

// ============================================================================
// TYPES — API publique
// ============================================================================

export interface HumanizeDocxOptions {
  /** Score par paragraphe considéré "OK". Default 40. */
  targetScore?: number;
  /** Seuil au-dessus duquel un paragraphe est réécrit. Default 60. */
  highRiskThreshold?: number;
  /** Retries par paragraphe dans humanizeSelective. Default 2. */
  maxRetries?: number;
  /** Score global final cible sur tout le doc. Default 15. */
  finalTargetGlobal?: number;
  /** Passes GLOBALES de retry si le score final reste au-dessus de la cible. Default 1 (donc 2 passes max en tout). */
  maxGlobalRetries?: number;
  /** Callback progression (SSE / UI). */
  onProgress?: (event: HumanizeDocxProgressEvent) => void;
}

export interface HumanizeDocxProgressEvent {
  step:
    | "parse"
    | "score"
    | "rewrite"
    | "rescore"
    | "serialize"
    | "final_check"
    | "done";
  /** Numéro de passe globale 1-based (1 = première, 2 = 1er retry global). */
  pass?: number;
  detail?: unknown;
}

export interface HumanizeDocxReport {
  /** Score détecteur Seora sur le doc entier AVANT humanize. */
  globalScoreBefore: number;
  /** Score détecteur Seora sur le doc entier APRÈS humanize (final). */
  globalScoreAfter: number;
  /** Nombre de paragraphes non-vides détectés dans le doc. */
  paragraphsProcessed: number;
  /** Paragraphes rewrités avec succès (scoreAfter ≤ targetScore) — cumul toutes passes. */
  paragraphsRewritten: number;
  /** Paragraphes rewrités mais qui restent > targetScore après tous les retries locaux. */
  paragraphsFailed: number;
  /** Nombre de passes globales utilisées (1 minimum). */
  passesUsed: number;
  /** Rapport per-paragraph fusionné toutes passes confondues (dernier état). */
  perParagraph: HumanizeReport["perParagraph"];
}

export interface HumanizeDocxResult {
  outputBuffer: Buffer;
  report: HumanizeDocxReport;
}

/**
 * Dépendances injectables. En prod : laisser tout undefined.
 */
export interface HumanizeDocxDeps {
  /**
   * Score global (0-100) d'un texte via le détecteur Seora. Par défaut :
   * chunk 4000 mots + POST /detect vers `SEORA_DETECTOR_URL` avec bearer
   * token `SEORA_DETECTOR_TOKEN`, retries 3× sur 503.
   */
  detectorFn?: (text: string) => Promise<number>;
  /** Deps passées à `humanizeSelective` (mocks de scoreFn / rewriteFn en test). */
  humanizeSelectiveDeps?: HumanizeDeps;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function humanizeDocxNative(
  inputBuffer: Buffer,
  options: HumanizeDocxOptions = {},
  deps: HumanizeDocxDeps = {},
): Promise<HumanizeDocxResult> {
  const targetScore = options.targetScore ?? 40;
  const initialHighRiskThreshold = options.highRiskThreshold ?? 60;
  const maxRetries = options.maxRetries ?? 2;
  const finalTargetGlobal = options.finalTargetGlobal ?? 15;
  const maxGlobalRetries = options.maxGlobalRetries ?? 1;
  const onProgress = options.onProgress;

  const detectorFn = deps.detectorFn ?? defaultDetectorFn;

  // ---------- Pass 1 ----------
  onProgress?.({ step: "parse", pass: 1 });
  let parsed: ParsedDocx = await parseDocx(inputBuffer);
  const paragraphsCount = parsed.paragraphs.length;

  onProgress?.({ step: "score", pass: 1, detail: "initial global score" });
  const fullTextBefore = joinParagraphsText(parsed.paragraphs);
  const globalScoreBefore = await detectorFn(fullTextBefore);

  let currentHighRiskThreshold = initialHighRiskThreshold;
  let mergedPerParagraph: HumanizeReport["perParagraph"] = [];
  let passesUsed = 0;
  let outputBuffer: Buffer = inputBuffer;
  let globalScoreAfter = globalScoreBefore;

  // maxGlobalRetries=1 → 2 passes autorisées (1 nominale + 1 retry)
  const maxPasses = 1 + maxGlobalRetries;

  for (let pass = 1; pass <= maxPasses; pass++) {
    passesUsed = pass;

    onProgress?.({
      step: "rewrite",
      pass,
      detail: { highRiskThreshold: currentHighRiskThreshold },
    });

    const passReport = await humanizeSelective(
      parsed.paragraphs,
      {
        targetScore,
        highRiskThreshold: currentHighRiskThreshold,
        maxRetries,
        onProgress: (e) =>
          onProgress?.({
            step: "rewrite",
            pass,
            detail: e,
          }),
      },
      deps.humanizeSelectiveDeps ?? {},
    );

    mergedPerParagraph = mergePerParagraph(mergedPerParagraph, passReport.perParagraph);

    onProgress?.({ step: "serialize", pass });
    outputBuffer = await serializeDocx({
      zip: parsed.zip,
      documentDom: parsed.documentDom,
    });

    onProgress?.({ step: "rescore", pass });
    // Re-parser le buffer produit et re-scorer sur le texte réellement sérialisé
    // (ceinture-bretelles : garantit qu'on score exactement ce qui va sortir).
    const reparsed = await parseDocx(outputBuffer);
    const fullTextAfter = joinParagraphsText(reparsed.paragraphs);
    globalScoreAfter = await detectorFn(fullTextAfter);

    onProgress?.({
      step: "final_check",
      pass,
      detail: { globalScoreAfter, finalTargetGlobal },
    });

    if (globalScoreAfter <= finalTargetGlobal) {
      // ✅ objectif global atteint, on arrête
      break;
    }
    if (pass >= maxPasses) {
      // Plus de retries autorisés
      break;
    }

    // ---------- Prépare la passe suivante ----------
    // On travaille désormais sur le doc REPARSÉ (qui contient déjà les
    // mutations précédentes) pour ne pas les perdre. On abaisse le seuil de 10.
    parsed = reparsed;
    currentHighRiskThreshold = Math.max(
      targetScore,
      currentHighRiskThreshold - 10,
    );
  }

  const paragraphsRewritten = mergedPerParagraph.filter(
    (p) => p.changed && p.scoreAfter <= targetScore,
  ).length;
  const paragraphsFailed = mergedPerParagraph.filter(
    (p) => p.changed && p.scoreAfter > targetScore,
  ).length;

  onProgress?.({ step: "done", pass: passesUsed });

  return {
    outputBuffer,
    report: {
      globalScoreBefore,
      globalScoreAfter,
      paragraphsProcessed: paragraphsCount,
      paragraphsRewritten,
      paragraphsFailed,
      passesUsed,
      perParagraph: mergedPerParagraph,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function joinParagraphsText(paragraphs: ParagraphNode[]): string {
  return paragraphs.map((p) => p.text).join("\n\n");
}

/**
 * Fusionne le rapport per-paragraph d'une nouvelle passe dans l'agrégat :
 *  - garde le `scoreBefore` de la 1ère passe (baseline vraie)
 *  - remplace `scoreAfter` / `textAfter` / `changed` / `attempts` par les
 *    dernières valeurs (l'état "final" du paragraphe).
 *
 * Le nombre de paragraphes est censé rester constant entre passes (même
 * DOCX reparsé). Si ce n'est pas le cas (ex: paragraphe devenu vide), on
 * aligne sur les index min communs.
 */
function mergePerParagraph(
  previous: HumanizeReport["perParagraph"],
  next: HumanizeReport["perParagraph"],
): HumanizeReport["perParagraph"] {
  if (previous.length === 0) return next.map((e) => ({ ...e }));

  const out: HumanizeReport["perParagraph"] = [];
  const n = Math.max(previous.length, next.length);
  for (let i = 0; i < n; i++) {
    const p = previous[i];
    const q = next[i];
    if (!p && q) {
      out.push({ ...q });
      continue;
    }
    if (p && !q) {
      out.push({ ...p });
      continue;
    }
    // p && q — merge
    out.push({
      index: p.index,
      scoreBefore: p.scoreBefore, // baseline
      scoreAfter: q.scoreAfter,   // dernier état
      attempts: p.attempts + q.attempts,
      changed: p.changed || q.changed,
      textBefore: p.textBefore,
      textAfter: q.changed ? q.textAfter : p.textAfter,
    });
  }
  return out;
}

// ============================================================================
// DEFAULT DETECTOR — POST /detect vers detector.tryseora.com
// ============================================================================

/**
 * Score global d'un texte via le détecteur Seora. Chunké en 4000 mots,
 * moyenne pondérée par le nombre de mots.
 */
async function defaultDetectorFn(text: string): Promise<number> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 30) {
    // Trop court pour un scoring fiable — on renvoie 0 (safer that surchoter).
    return 0;
  }

  const chunks: string[] = [];
  const chunkSize = 4000;
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  let weightedSum = 0;
  let totalWords = 0;

  for (const chunk of chunks) {
    const chunkWords = chunk.trim().split(/\s+/).filter(Boolean).length;
    const score = await postDetectWithRetry(chunk, "fr");
    weightedSum += score * chunkWords;
    totalWords += chunkWords;
  }

  if (totalWords === 0) return 0;
  return Math.max(0, Math.min(100, Math.round(weightedSum / totalWords)));
}

interface DetectorPayload {
  score_global?: number;
}

/**
 * POST /detect avec retry sur 503 (le détecteur peut renvoyer 503 sous
 * charge — Fly.io warm-up). 3 tentatives max, backoff 2s puis 5s.
 */
async function postDetectWithRetry(
  text: string,
  language: string,
): Promise<number> {
  const url = process.env.SEORA_DETECTOR_URL ?? "https://detector.tryseora.com";
  const token = process.env.SEORA_DETECTOR_TOKEN ?? "";
  const trimmedUrl = url.replace(/\/$/, "");

  const backoffs = [0, 2000, 5000];
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) {
      await new Promise((r) => setTimeout(r, backoffs[attempt]));
    }
    try {
      const res = await fetch(`${trimmedUrl}/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, language, fast_mode: false }),
        signal: AbortSignal.timeout(240_000),
      });
      if (res.status === 503) {
        lastErr = new Error(`Detector 503 (attempt ${attempt + 1})`);
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          `Detector HTTP ${res.status}: ${errText.slice(0, 300)}`,
        );
      }
      const data = (await res.json()) as DetectorPayload;
      const score = Number(data.score_global);
      if (!Number.isFinite(score)) {
        throw new Error(
          `Detector response missing score_global: ${JSON.stringify(data).slice(0, 300)}`,
        );
      }
      return Math.max(0, Math.min(100, score));
    } catch (err) {
      lastErr = err;
      // Sur erreur réseau (autre que 503 déjà gérée), on retente
      if (attempt < backoffs.length - 1) continue;
      throw err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Detector unavailable after retries");
}
