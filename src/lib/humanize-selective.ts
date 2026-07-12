/**
 * humanize-selective
 * ------------------
 * Étape B du refactor humanizer :
 *  1. Prend une liste de `ParagraphNode` (issus de `docx-native-parser.parseDocx`).
 *  2. Score chaque paragraphe via l'API du "détecteur" Seora (Claude Sonnet
 *     jouant le rôle d'un détecteur Compilatio-grade).
 *  3. Réécrit UNIQUEMENT les paragraphes flaggés HIGH (score >= 60) via un
 *     LLM avec 3 variantes de prompt (standard → agressif → allégé) sur
 *     les retries.
 *  4. Mute chaque paragraphe HIGH in-place avec `updateParagraphText()` du
 *     parser (donc les <w:rPr> = formatage sont conservés à 100 %).
 *  5. Renvoie un rapport `HumanizeReport` détaillé avant/après.
 *
 * ⚠ Design ISOLÉ pour l'étape B :
 *  - N'importe QUE `claude-client` + `docx-native-parser`.
 *  - Ne touche PAS `humanize-engine.ts` (l'intégration se fera dans une étape
 *    ultérieure). La duplication de prompt scoring/rewrite est volontaire —
 *    on veut valider ce pipeline sans risquer de casser le pipeline "full"
 *    encore utilisé en prod.
 *
 * Test : `npx tsx src/lib/__tests__/humanize-selective.test.ts`.
 */

import { callClaude } from "./claude-client";
import { updateParagraphText, ParagraphNode } from "./docx-native-parser";

// ============================================================================
// TYPES (API publique — miroir de la mission Orsu étape B)
// ============================================================================

export interface HumanizeOptions {
  /** Seuil au-dessous duquel un paragraphe est considéré "OK". Default 40. */
  targetScore?: number;
  /** Seuil au-dessus duquel un paragraphe est réécrit. Default 60. */
  highRiskThreshold?: number;
  /** Nombre de RETRIES (i.e. tentatives ADDITIONNELLES après le premier essai). Default 2 → 3 tentatives max. */
  maxRetries?: number;
  /** Callback de progression pour SSE / UI. */
  onProgress?: (event: HumanizeProgressEvent) => void;
}

export interface HumanizeProgressEvent {
  step: "scoring" | "rewriting" | "rescoring" | "done";
  paragraphIndex?: number;
  totalParagraphs?: number;
  scoreBefore?: number;
  scoreAfter?: number;
  /** Numéro de tentative 0-based (0 = premier essai, 1 = 1er retry, etc.). */
  attempt?: number;
}

export interface HumanizeReport {
  totalParagraphs: number;
  /** HIGH réécrit avec succès (scoreAfter <= targetScore). */
  paragraphsRewritten: number;
  /** LOW + MEDIUM — jamais touchés. */
  paragraphsSkipped: number;
  /** HIGH qui n'ont pas passé le seuil après tous les retries. */
  paragraphsFailed: number;
  perParagraph: Array<{
    index: number;
    scoreBefore: number;
    scoreAfter: number;
    /** Nombre de tentatives de rewrite effectives (0 = paragraphe non touché). */
    attempts: number;
    /** True dès qu'un rewrite a modifié le paragraphe (même si failed). */
    changed: boolean;
    textBefore: string;
    textAfter: string;
  }>;
}

/**
 * Dépendances injectables — permet de mocker les appels Claude dans les tests
 * sans dépendre du réseau ni du runner Mac-mini. En prod : laisser undefined,
 * les implémentations par défaut appellent `callClaude`.
 */
export interface HumanizeDeps {
  /** Prend un batch de textes, renvoie 1 score (0-100) par texte, MÊME ORDRE. */
  scoreFn?: (texts: string[]) => Promise<number[]>;
  /**
   * Prend un texte + le numéro de tentative (0 = premier essai) et renvoie le
   * texte réécrit. Doit throw si échec (le caller gère le retry).
   */
  rewriteFn?: (text: string, attempt: number) => Promise<string>;
  /**
   * Concurrency pour le scoring batch (default 15).
   * 12/07 (Orsu) — Bump 5→15 pour DPP 12800 mots (~19 batches → 2 rounds au
   * lieu de 4). Le runner Cloudflare (Mac mini + Claude Max) tient la charge.
   */
  scoreConcurrency?: number;
  /** Taille de batch pour scoring (default 20). */
  scoreBatchSize?: number;
  /**
   * Concurrency pour le rewriting paragraphe par paragraphe (default 15).
   * 12/07 (Orsu) — Bump 5→15 idem scoreConcurrency (rewrites Sonnet 4.6 sur
   * attempt 0, Opus 4.7 sur retries).
   */
  rewriteConcurrency?: number;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function humanizeSelective(
  paragraphs: ParagraphNode[],
  options: HumanizeOptions = {},
  deps: HumanizeDeps = {},
): Promise<HumanizeReport> {
  const targetScore = options.targetScore ?? 40;
  const highRiskThreshold = options.highRiskThreshold ?? 60;
  const maxRetries = options.maxRetries ?? 2;
  const onProgress = options.onProgress;

  const scoreFn = deps.scoreFn ?? defaultScoreFn;
  const rewriteFn = deps.rewriteFn ?? defaultRewriteFn;
  const scoreConcurrency = deps.scoreConcurrency ?? 15;
  const scoreBatchSize = deps.scoreBatchSize ?? 20;
  const rewriteConcurrency = deps.rewriteConcurrency ?? 15;

  const perParagraph: HumanizeReport["perParagraph"] = paragraphs.map((p, i) => ({
    index: i,
    scoreBefore: 0,
    scoreAfter: 0,
    attempts: 0,
    changed: false,
    textBefore: p.text,
    textAfter: p.text,
  }));

  // ------------------------------------------------------------------
  // 1. Score initial (batché + parallélisé)
  // ------------------------------------------------------------------
  onProgress?.({
    step: "scoring",
    totalParagraphs: paragraphs.length,
  });

  const initialScores = await scoreAllParagraphs(
    paragraphs.map((p) => p.text),
    scoreFn,
    scoreBatchSize,
    scoreConcurrency,
  );

  for (let i = 0; i < paragraphs.length; i++) {
    perParagraph[i].scoreBefore = initialScores[i];
    perParagraph[i].scoreAfter = initialScores[i];
  }

  // ------------------------------------------------------------------
  // 2. Ciblage HIGH + rewrite avec retries
  // ------------------------------------------------------------------
  const highIndexes = perParagraph
    .filter((p) => p.scoreBefore >= highRiskThreshold)
    .map((p) => p.index);

  await runWithConcurrency(highIndexes, rewriteConcurrency, async (idx) => {
    const record = perParagraph[idx];
    const paragraph = paragraphs[idx];
    let currentText = record.textBefore;

    // Tentatives : 1 essai + maxRetries retries = maxRetries + 1 attempts
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      onProgress?.({
        step: "rewriting",
        paragraphIndex: idx,
        totalParagraphs: paragraphs.length,
        attempt,
      });

      let rewritten: string;
      try {
        rewritten = await rewriteFn(currentText, attempt);
      } catch (err) {
        // Rewrite fail (Claude down, timeout, etc.). On log et on tente
        // le retry suivant SANS avoir muté le paragraphe.
        console.error(
          `[humanize-selective] rewrite fail p${idx} attempt ${attempt}:`,
          err instanceof Error ? err.message : err,
        );
        continue;
      }

      // Rewrite vide / trop court / identique → on considère l'essai raté
      if (!rewritten || rewritten.trim().length < currentText.length * 0.5) {
        console.warn(
          `[humanize-selective] rewrite trop court p${idx} attempt ${attempt}, skip attempt`,
        );
        continue;
      }
      if (rewritten.trim() === currentText.trim()) {
        continue;
      }

      // ✅ On a un candidat — mute in-place le paragraphe.
      updateParagraphText(paragraph, rewritten);
      record.attempts = attempt + 1;
      record.changed = true;
      record.textAfter = rewritten;
      currentText = rewritten;

      // ------------------------------------------------------------------
      // 3. Re-score post-rewrite
      // ------------------------------------------------------------------
      onProgress?.({
        step: "rescoring",
        paragraphIndex: idx,
        totalParagraphs: paragraphs.length,
        attempt,
      });

      let newScore = record.scoreAfter;
      try {
        const scores = await scoreFn([rewritten]);
        if (scores.length !== 1) {
          throw new Error(
            `scoreFn returned ${scores.length} scores for 1 text (expected 1)`,
          );
        }
        newScore = clampScore(scores[0]);
      } catch (err) {
        console.error(
          `[humanize-selective] rescore fail p${idx} attempt ${attempt}:`,
          err instanceof Error ? err.message : err,
        );
        // On garde le rewrite (le texte a été modifié), mais on considère
        // le score inchangé — donc failed sauf si déjà OK.
      }

      record.scoreAfter = newScore;

      onProgress?.({
        step: "rescoring",
        paragraphIndex: idx,
        totalParagraphs: paragraphs.length,
        attempt,
        scoreBefore: record.scoreBefore,
        scoreAfter: newScore,
      });

      if (newScore <= targetScore) {
        // ✅ succès, on arrête les retries
        break;
      }
      // Sinon on continue avec attempt+1 → prompt variant différent
    }
  });

  // ------------------------------------------------------------------
  // 4. Rapport final
  // ------------------------------------------------------------------
  const paragraphsRewritten = perParagraph.filter(
    (p) => p.changed && p.scoreAfter <= targetScore,
  ).length;
  const paragraphsFailed = perParagraph.filter(
    (p) => p.changed && p.scoreAfter > targetScore,
  ).length;
  // Skipped = tous les non-touchés (LOW + MEDIUM + HIGH qui ont fail
  // avant le premier rewrite abouti — cas rare : rewriteFn throw en boucle)
  const paragraphsSkipped = perParagraph.length - paragraphsRewritten - paragraphsFailed;

  onProgress?.({
    step: "done",
    totalParagraphs: paragraphs.length,
  });

  return {
    totalParagraphs: paragraphs.length,
    paragraphsRewritten,
    paragraphsSkipped,
    paragraphsFailed,
    perParagraph,
  };
}

// ============================================================================
// SCORING — batching + concurrency
// ============================================================================

/**
 * Score N paragraphes en les découpant en batches, chaque batch étant
 * envoyé en 1 seul appel Claude. Les batches sont exécutés en parallèle
 * (avec limite de concurrency). Renvoie 1 score par paragraphe, MÊME ORDRE.
 */
async function scoreAllParagraphs(
  texts: string[],
  scoreFn: (texts: string[]) => Promise<number[]>,
  batchSize: number,
  concurrency: number,
): Promise<number[]> {
  if (texts.length === 0) return [];

  const batches: { start: number; end: number }[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push({ start: i, end: Math.min(i + batchSize, texts.length) });
  }

  const scores: number[] = new Array(texts.length).fill(0);

  await runWithConcurrency(batches, concurrency, async (batch) => {
    const slice = texts.slice(batch.start, batch.end);
    try {
      const batchScores = await scoreFn(slice);
      if (batchScores.length !== slice.length) {
        throw new Error(
          `scoreFn returned ${batchScores.length} scores for batch of ${slice.length}`,
        );
      }
      for (let i = 0; i < slice.length; i++) {
        scores[batch.start + i] = clampScore(batchScores[i]);
      }
    } catch (err) {
      console.error(
        `[humanize-selective] score batch [${batch.start},${batch.end}) failed:`,
        err instanceof Error ? err.message : err,
      );
      // Fallback : on score 0 → paragraphes considérés "OK" (safer que
      // considérer tout HIGH — on préfère perdre en recall qu'en durée)
      for (let i = 0; i < slice.length; i++) {
        scores[batch.start + i] = 0;
      }
    }
  });

  return scores;
}

// ============================================================================
// DEFAULT IMPLEMENTATIONS (real Claude calls via callClaude)
// ============================================================================

/**
 * Scoring par batch : envoie N paragraphes en 1 seul appel Claude et
 * récupère un JSON `{scores: [{i,s}, ...]}`. Robuste aux paragraphes
 * courts (< 100 chars → score 0 fixé).
 *
 * Exporté pour permettre à humanize-docx-native.ts de le réutiliser en
 * fallback quand des scores pré-calculés (workflow "analyse d'abord") sont
 * épuisés (voir option `prescoredParagraphs`).
 */
export async function defaultScoreFn(texts: string[]): Promise<number[]> {
  if (texts.length === 0) return [];

  // Court-circuit : un seul texte trop court → score 0 direct
  const results: number[] = new Array(texts.length).fill(0);
  const toScore: { i: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (!texts[i] || texts[i].trim().length < 80) {
      results[i] = 0;
    } else {
      toScore.push({ i, text: texts[i] });
    }
  }
  if (toScore.length === 0) return results;

  const listed = toScore
    .map(({ text }, k) => `[${k}] """${text.replace(/"""/g, '"·"·"')}"""`)
    .join("\n\n");

  const prompt = `Score chaque paragraphe (0-100, IA-detection Compilatio-grade). Réponds STRICTEMENT ce JSON, aucun commentaire :
{"scores":[{"i":0,"s":<int>},{"i":1,"s":<int>},...]}

BARÈME : 0-30 humain · 30-60 mixte · 60-80 IA marqué · 80+ quasi 100% IA.

SIGNAUX IA (+) : cascades "Premièrement/Deuxièmement/Troisièmement", antithèses balancées "n'est pas X c'est Y", "trois effets convergents", "un socle de X", "il est important de noter", "en somme", nominalizations denses, registre uniforme, zéro burstiness, connecteurs académiques ("par ailleurs", "en outre", "il convient de").
SIGNAUX HUMAINS (-) : "franchement,", "concrètement,", "à mon niveau", "c'est du vécu", métaphores accessibles, phrases <8 mots, registre variable, micro-imperfections.

Sois honnête. Un score par paragraphe listé ci-dessous.

PARAGRAPHES :
${listed}`;

  const raw = await callClaude(prompt, {
    system:
      "Détecteur IA Compilatio-grade multi-paragraphes. Réponds uniquement JSON valide.",
    model: "claude-sonnet-4-6",
    timeoutMs: 75_000,
  });

  const parsed = extractScoreJson(raw, toScore.length);
  for (let k = 0; k < toScore.length; k++) {
    results[toScore[k].i] = parsed[k];
  }
  return results;
}

/**
 * Rewrite d'un paragraphe. Le prompt varie selon `attempt` :
 *   0 = prompt standard (variations légères, marqueurs oraux)
 *   1 = prompt agressif (casse structure, injecte marqueurs perso, baisse registre)
 *   2+ = prompt allégé (change juste les tournures les plus flag)
 * → variation utile pour trouver un angle qui casse le score sans dériver.
 */
async function defaultRewriteFn(text: string, attempt: number): Promise<string> {
  const prompt = buildRewritePrompt(text, attempt);
  const raw = await callClaude(prompt, {
    system:
      "Tu réécris du texte académique français pour le rendre indétectable par Compilatio. Retourne UNIQUEMENT le texte reformulé, aucun commentaire, aucun préambule, aucun backtick.",
    // Attempt 0 = Sonnet (rapide + bon), retries = Opus 4.7 (plus créatif)
    model: attempt === 0 ? "claude-sonnet-4-6" : "claude-opus-4-7",
    timeoutMs: 45_000,
  });
  return stripPreamble(raw).trim();
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildRewritePrompt(text: string, attempt: number): string {
  const base = `Reformule le texte suivant en préservant EXACTEMENT le sens et le contenu factuel, mais en variant la formulation. Contraintes STRICTES :
- Longueur : reste dans ±20% de la longueur originale (mots)
- Style : varie les tournures, casse la rigidité de structure, injecte quelques marqueurs oraux légers ("franchement", "en vrai", "du coup", "genre")
- Interdits : em-dashes (—), guillemets typographiques (« », " "), structure "premièrement/deuxièmement/troisièmement"
- Préserve : nombres, noms propres, dates, citations
Écris UNIQUEMENT le texte reformulé, aucun commentaire.

TEXTE :
${text}`;

  if (attempt === 0) return base;

  if (attempt === 1) {
    // Retry AGRESSIF — le premier essai n'a pas suffi à baisser le score.
    return `Le texte suivant est encore trop "IA-detectable". Réécris-le en cassant AGRESSIVEMENT sa structure :
- Injecte au moins 2 marqueurs oraux ("franchement,", "concrètement,", "à mon niveau", "en vrai", "du coup", "bon,")
- Insère au moins 1 phrase courte (<8 mots) : "C'est du vécu.", "Ça change tout.", "Bref, ouais."
- Casse TOUTES les cascades énumératives ("Premièrement/Deuxièmement/Troisièmement" → flux naturel sans annonce)
- Casse TOUTES les antithèses balancées ("X n'est pas Y, c'est Z" → asymétrique)
- Baisse le registre 20 % du temps : socle→base, pérenniser→faire durer, convergent→qui va dans le même sens, dilapider→cramer
- Fluidifie avec participes présents plutôt que subordonnées
- Reste dans ±25% de la longueur originale (mots)
- Interdits : em-dashes (—), guillemets « » " "
- Préserve : nombres, noms propres, dates, citations, termes techniques

Écris UNIQUEMENT le texte reformulé, aucun commentaire.

TEXTE :
${text}`;
  }

  // attempt >= 2 → variation "allégée" : on garde le squelette mais on
  // vise uniquement les tournures les plus flag. Utile quand la version
  // AGRESSIVE a dérivé le sens ou raccourci trop.
  return `Le texte suivant reste borderline IA-detectable après plusieurs tentatives. Applique une CORRECTION CHIRURGICALE (sans réécrire tout) :
- Remplace CHAQUE occurrence de "il est important de noter", "il convient de", "en somme", "par ailleurs", "trois effets convergents", "un socle de" par une reformulation naturelle.
- Casse UNE cascade énumérative si présente ("Premièrement/Deuxièmement...").
- Injecte 1 marqueur oral discret ("franchement," ou "concrètement,") au début d'une phrase.
- Garde EXACTEMENT le même sens et la même longueur (±10 %).
- Interdits : em-dashes (—), guillemets typographiques.
- Préserve : nombres, noms propres, dates, citations, termes techniques.

Écris UNIQUEMENT le texte corrigé, aucun commentaire.

TEXTE :
${text}`;
}

// ============================================================================
// JSON PARSING / SANITIZATION
// ============================================================================

/**
 * Extrait la liste des scores depuis la réponse Claude. Format attendu :
 *   {"scores":[{"i":0,"s":42},...]}
 * En cas de parse partiel : les indices manquants sont mis à 0.
 */
function extractScoreJson(raw: string, expectedCount: number): number[] {
  const scores: number[] = new Array(expectedCount).fill(0);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn(
      `[humanize-selective] no JSON in scoring response: ${raw.slice(0, 200)}`,
    );
    return scores;
  }
  try {
    const parsed = JSON.parse(match[0]) as {
      scores?: Array<{ i?: number; s?: number }>;
    };
    if (!Array.isArray(parsed.scores)) {
      console.warn(`[humanize-selective] scores field is not an array`);
      return scores;
    }
    for (const entry of parsed.scores) {
      const i = entry.i;
      const s = entry.s;
      if (typeof i !== "number" || typeof s !== "number") continue;
      if (i < 0 || i >= expectedCount) continue;
      scores[i] = clampScore(s);
    }
  } catch (err) {
    console.warn(
      `[humanize-selective] JSON parse failed: ${err instanceof Error ? err.message : err}`,
    );
  }
  return scores;
}

function clampScore(s: number): number {
  if (!Number.isFinite(s)) return 0;
  return Math.max(0, Math.min(100, Math.round(s)));
}

/**
 * Enlève les préambules type "Voici le texte reformulé :\n\n..." qui
 * traînent parfois même quand on demande "aucun commentaire".
 */
function stripPreamble(raw: string): string {
  let out = raw.trim();
  // Retire un éventuel bloc ```...```
  if (out.startsWith("```")) {
    out = out.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");
  }
  // Retire un préambule 1 ligne suivi de 2 sauts de ligne
  const firstBlock = out.split(/\n\n/, 1)[0];
  if (
    firstBlock.length < 120 &&
    /^(voici|here'?s|texte reformul|texte réécrit|réécriture|reformul)/i.test(
      firstBlock,
    )
  ) {
    out = out.slice(firstBlock.length).trim();
  }
  return out;
}

// ============================================================================
// CONCURRENCY LIMITER
// ============================================================================

/**
 * Exécute `fn(item)` pour chaque item avec au plus `concurrency` tâches
 * simultanées. Ne rejette JAMAIS — chaque erreur est laissée à la charge
 * de `fn`. Attend que tout soit fini avant de rendre la main.
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const effective = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const workers: Promise<void>[] = [];
  for (let w = 0; w < effective; w++) {
    workers.push(
      (async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= items.length) return;
          try {
            await fn(items[idx]);
          } catch (err) {
            // Contrat : fn est responsable de ses erreurs. Si elle throw
            // ici c'est un bug caller. On log et on continue.
            console.error(
              `[humanize-selective] worker crash on item ${idx}:`,
              err instanceof Error ? err.message : err,
            );
          }
        }
      })(),
    );
  }
  await Promise.all(workers);
}
