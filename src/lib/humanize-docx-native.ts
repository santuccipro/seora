/**
 * humanize-docx-native
 * --------------------
 * Étape C du refactor humanizer — l'ORCHESTRATEUR end-to-end.
 *
 * Pipeline complet sur un .docx :
 *  1. `parseDocx(inputBuffer)`                       (étape A)
 *  2. `humanizeSelective(paragraphs, ...)`           (étape B)
 *      → mute in-place les paragraphes HIGH (≥ highRiskThreshold)
 *  3. `globalScoreBefore` / `globalScoreAfter` estimés à partir des scores
 *     paragraphe-par-paragraphe (moyenne pondérée par nombre de mots).
 *  4. Si globalScoreAfter > finalTargetGlobal et qu'il reste des passes
 *     globales autorisées : on ABAISSE `highRiskThreshold` de 10 et on
 *     relance une passe sur les paragraphes encore risqués.
 *  5. `serializeDocx({zip, documentDom})` UNE fois à la fin (étape A)
 *  6. Renvoie {outputBuffer, report}.
 *
 * 12/07 (Orsu) — SKIP GLOBAL SCORING : la V3.1 faisait 2 gros scorings
 * détecteur Fly (chunké 4000 mots) avant/après = ~20 min sur DPP 12800 mots.
 * On les remplace par une estimation issue des scores paragraphe (déjà
 * calculés par humanizeSelective via Sonnet 4.6, précis). Économie ~20 min.
 * Le `detectorFn` reste dans l'interface pour compat mais n'est plus appelé.
 *
 * ⚠ Design :
 *  - Isolation totale de `humanize-engine.ts` (le pipeline "full" en prod
 *    n'est pas touché). Ce module ouvre un NOUVEAU flow parallèle.
 *  - Toutes les dépendances externes (callClaude via humanizeSelective) sont
 *    injectables via `HumanizeDocxDeps` pour les tests. En prod : tout est
 *    par défaut sur les prod services.
 */

import {
  parseDocx,
  serializeDocx,
  ParsedDocx,
} from "./docx-native-parser";
import {
  humanizeSelective,
  HumanizeDeps,
  HumanizeReport,
  defaultScoreFn,
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
  /**
   * Scores par paragraphe déjà calculés côté analyse (workflow "analyse
   * d'abord → humanise après"). Si fourni, la 1ère passe skip le scoring
   * initial paragraphe-par-paragraphe (économie ~50% latence). L'array doit
   * être aligné index-par-index sur les paragraphes du DOCX parsé. Les
   * passes de retry global rescorent quand même le sous-ensemble restant.
   * 12/07 (Orsu) — Fix 1 vision Marius (linéaire forcé + réutilisation).
   */
  prescoredParagraphs?: number[];
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
   * DÉPRÉCIÉ (12/07 Orsu) — laissé dans l'interface pour compat des tests
   * existants mais N'EST PLUS APPELÉ. Les scores globaux avant/après sont
   * désormais estimés à partir des scores paragraphe (moyenne pondérée par
   * nombre de mots).
   *
   * Historiquement : score global (0-100) d'un texte via le détecteur Seora
   * (chunk 4000 mots + POST /detect vers `SEORA_DETECTOR_URL`). Ces 2 appels
   * coûtaient ~20 min sur un DPP 12800 mots — d'où le skip.
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
  const prescoredParagraphs = options.prescoredParagraphs;

  // 12/07 (Orsu) — SKIP GLOBAL SCORING : detectorFn n'est plus appelé.
  // Réservé à l'interface pour compat mais inutilisé (voir doc du type).
  void deps.detectorFn;

  // ---------- Parse ----------
  onProgress?.({ step: "parse", pass: 1 });
  const parsed: ParsedDocx = await parseDocx(inputBuffer);
  const paragraphsCount = parsed.paragraphs.length;

  let currentHighRiskThreshold = initialHighRiskThreshold;
  let mergedPerParagraph: HumanizeReport["perParagraph"] = [];
  let passesUsed = 0;
  let globalScoreBefore = 0;
  let globalScoreAfter = 0;

  // maxGlobalRetries=1 → 2 passes autorisées (1 nominale + 1 retry)
  const maxPasses = 1 + maxGlobalRetries;

  for (let pass = 1; pass <= maxPasses; pass++) {
    passesUsed = pass;

    onProgress?.({
      step: "rewrite",
      pass,
      detail: { highRiskThreshold: currentHighRiskThreshold },
    });

    // 12/07 (Orsu) — Fix 1 vision Marius : sur la 1ère passe, si l'UI a
    // fourni `prescoredParagraphs`, on wrap le scoreFn pour renvoyer ces
    // valeurs sur le batch initial (identifié par texts.length === total).
    // Les rescores post-rewrite (batches de taille 1) passent au vrai scoreFn.
    const injectedDeps: HumanizeDeps = { ...(deps.humanizeSelectiveDeps ?? {}) };
    if (
      pass === 1 &&
      prescoredParagraphs &&
      prescoredParagraphs.length === parsed.paragraphs.length
    ) {
      const realScoreFn = injectedDeps.scoreFn;
      const totalCount = parsed.paragraphs.length;
      let initialBatchServed = 0;
      injectedDeps.scoreFn = async (texts: string[]) => {
        // Batch initial : humanize-selective envoie N batches qui totalisent
        // parsed.paragraphs.length (dans l'ordre) au step "scoring". On sert
        // ces batches depuis prescored jusqu'à épuisement, puis on retombe
        // sur le vrai scoreFn (rescores post-rewrite).
        if (initialBatchServed < totalCount) {
          const start = initialBatchServed;
          const end = Math.min(start + texts.length, totalCount);
          const slice = prescoredParagraphs.slice(start, end);
          initialBatchServed = end;
          if (slice.length === texts.length) return slice;
          // Fallback si mismatch : refile au vrai scoreFn
        }
        // Rescores post-rewrite (batches taille 1 en général) → délégation
        // au scoreFn réel (injecté par les tests) ou defaultScoreFn (prod).
        return realScoreFn ? realScoreFn(texts) : defaultScoreFn(texts);
      };
    }

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
      injectedDeps,
    );

    mergedPerParagraph = mergePerParagraph(mergedPerParagraph, passReport.perParagraph);

    // 12/07 (Orsu) — Estimation globale depuis les scores paragraphe (skip
    // gros scoring détecteur Fly). Précision suffisante : chaque paragraphe
    // est scoré par Claude Sonnet 4.6, moyenne pondérée par nb de mots.
    if (pass === 1) {
      globalScoreBefore = computeGlobalScoreFromParagraphs(
        mergedPerParagraph,
        "before",
      );
    }
    globalScoreAfter = computeGlobalScoreFromParagraphs(
      mergedPerParagraph,
      "after",
    );

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
    // Les paragraphes de `parsed.paragraphs` ont été mutés in-place par
    // humanizeSelective ; pas besoin de re-parser un buffer sérialisé. On
    // abaisse juste le seuil HIGH de 10 pour re-cibler les paragraphes
    // encore risqués.
    currentHighRiskThreshold = Math.max(
      targetScore,
      currentHighRiskThreshold - 10,
    );
  }

  // ---------- Serialize (une seule fois à la fin) ----------
  onProgress?.({ step: "serialize", pass: passesUsed });
  const outputBuffer: Buffer = await serializeDocx({
    zip: parsed.zip,
    documentDom: parsed.documentDom,
  });

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

/**
 * Estime un score global 0-100 à partir des scores paragraphe (moyenne
 * pondérée par nombre de mots). Remplace les 2 appels détecteur Fly qui
 * coûtaient ~20 min sur DPP 12800 mots. Précision suffisante : chaque
 * paragraphe est déjà scoré finement par Claude Sonnet 4.6.
 *
 * `which` = "before" utilise scoreBefore + textBefore ;
 * `which` = "after"  utilise scoreAfter + textAfter (post-rewrite).
 */
function computeGlobalScoreFromParagraphs(
  perParagraph: HumanizeReport["perParagraph"],
  which: "before" | "after",
): number {
  let weightedSum = 0;
  let totalWords = 0;
  for (const p of perParagraph) {
    const text = which === "before" ? p.textBefore : p.textAfter;
    const score = which === "before" ? p.scoreBefore : p.scoreAfter;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) continue;
    weightedSum += score * words;
    totalWords += words;
  }
  if (totalWords === 0) return 0;
  return Math.max(0, Math.min(100, Math.round(weightedSum / totalWords)));
}

// ============================================================================
// HELPERS
// ============================================================================

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
// (12/07 Orsu) — defaultDetectorFn + postDetectWithRetry SUPPRIMÉS.
// Le scoring global est désormais estimé depuis les scores paragraphe. Cf.
// `computeGlobalScoreFromParagraphs` plus haut. Si un jour on veut revenir au
// scoring détecteur, ressusciter depuis le git history de ce fichier.
// ============================================================================
