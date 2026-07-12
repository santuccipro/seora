/**
 * Tests du pipeline `humanizeDocxNative` (étape C — orchestrateur).
 *
 * Aucun test ne fait d'appel réseau : on injecte des mocks pour le
 * détecteur global ET pour le rewriter Claude. Le vrai parser DOCX natif
 * (étape A) et le vrai `humanizeSelective` (étape B) sont utilisés
 * (avec scoreFn/rewriteFn mockés).
 *
 * Exécution (depuis la racine du projet) :
 *   npx tsx src/lib/__tests__/humanize-docx-native.test.ts
 *
 * Sortie zéro = OK, non-zéro = FAIL.
 */

import { strict as assert } from "node:assert";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { parseDocx } from "../docx-native-parser";
import {
  humanizeDocxNative,
  HumanizeDocxProgressEvent,
} from "../humanize-docx-native";

// -----------------------------------------------------------------------------
// FIXTURE — DOCX avec paragraphes AI-like + neutres + formatage visible
// -----------------------------------------------------------------------------

const AI_TEXTS = [
  "Premièrement, il convient de noter que la formalisation méthodologique du projet constitue un socle structurant pour l'ensemble de la démarche entreprise. Deuxièmement, il est important de souligner que trois effets convergents en découlent, chacun s'inscrivant dans une perspective académique cohérente. Troisièmement, en somme, cette approche s'articule autour d'une dimension globale.",
  "Par ailleurs, la mise en œuvre de ces principes repose sur un socle méthodologique rigoureux. Il convient de noter que cette dynamique n'est pas simplement une contrainte, c'est une opportunité stratégique pour l'organisation. En outre, il est important de souligner la portée systémique de cette transformation.",
  "Il est important de noter que l'analyse structurelle du dispositif révèle trois dimensions convergentes. D'une part, la formalisation des objectifs. D'autre part, la pérennisation des acquis. Enfin, en somme, la dilapidation des ressources doit être évitée.",
];

const NEUTRAL_TEXTS = [
  "Le projet démarre en septembre 2025 à Paris.",
  "Marius a signé le contrat avec CEDIM la semaine dernière.",
];

/**
 * Génère un DOCX de test avec :
 *  - 3 paragraphes AI-like (chacun sera FLAGGED HIGH)
 *  - 2 paragraphes neutres/courts (LOW)
 *  - Un gras sur le mot "important" dans un des paragraphes AI
 *  - Une police custom (Georgia) sur un run
 */
async function makeSampleDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          // p0 : AI multi-run avec un run bold Georgia
          new Paragraph({
            children: [
              new TextRun({ text: "Premièrement, il convient de noter que la formalisation méthodologique du projet constitue un socle structurant pour l'ensemble de la démarche entreprise. Deuxièmement, il est " }),
              new TextRun({
                text: "important",
                bold: true,
                font: "Georgia",
                size: 28,
                color: "C00000",
              }),
              new TextRun({ text: " de souligner que trois effets convergents en découlent, chacun s'inscrivant dans une perspective académique cohérente. Troisièmement, en somme, cette approche s'articule autour d'une dimension globale." }),
            ],
          }),
          // p1 : neutre
          new Paragraph({
            children: [new TextRun({ text: NEUTRAL_TEXTS[0] })],
          }),
          // p2 : AI mono-run
          new Paragraph({
            children: [new TextRun({ text: AI_TEXTS[1] })],
          }),
          // p3 : neutre
          new Paragraph({
            children: [new TextRun({ text: NEUTRAL_TEXTS[1] })],
          }),
          // p4 : AI mono-run
          new Paragraph({
            children: [new TextRun({ text: AI_TEXTS[2] })],
          }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -----------------------------------------------------------------------------
// HARNESS
// -----------------------------------------------------------------------------
const results: Array<{ name: string; ok: boolean; err?: unknown }> = [];
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`\x1b[32mPASS\x1b[0m ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`\x1b[31mFAIL\x1b[0m ${name}`);
    console.error(err);
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function isAiText(text: string): boolean {
  // Signaux robustes présents dans les AI_TEXTS
  return (
    /Premièrement|Deuxièmement|Troisièmement/i.test(text) ||
    /il convient de noter|il est important de|en somme|par ailleurs/i.test(text)
  );
}

/**
 * Mock détecteur global : renvoie 70 tant qu'il reste plus de X% de paragraphes AI,
 * décroît proportionnellement. Utile pour simuler une baisse convaincante.
 */
function makeMockDetector() {
  let calls = 0;
  const scores: number[] = [];
  const fn = async (text: string): Promise<number> => {
    calls++;
    const aiHits = (text.match(/il convient de noter|Premièrement|Deuxièmement|Troisièmement|en somme|par ailleurs|il est important/gi) || []).length;
    const score = Math.min(85, Math.max(5, 10 + aiHits * 12));
    scores.push(score);
    return score;
  };
  return { fn, getCalls: () => calls, getScores: () => scores };
}

/**
 * Mock rewriter : renvoie une version "humanisée" — plus longue en marqueurs
 * oraux, aucun signal AI présent. Passe le filtre 50%-length de humanizeSelective.
 */
async function mockRewriteFn(text: string, _attempt: number): Promise<string> {
  return (
    `Franchement, on formalise le projet par écrit, ça pose une base solide au quotidien. ` +
    `Concrètement, plusieurs effets qui vont dans le même sens en découlent, chacun cohérent avec les autres. ` +
    `Au final, ça s'inscrit dans une logique globale claire. Bref, c'est du vécu. ` +
    `Ça sert vraiment sur le terrain, sans jargon inutile. Point.`
  );
}

/**
 * Mock scorer par-paragraphe (utilisé par humanizeSelective) :
 *  - texte AI → 75
 *  - autre    → 15
 */
async function mockScoreFn(texts: string[]): Promise<number[]> {
  return texts.map((t) => (isAiText(t) ? 75 : 15));
}

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

async function main() {
  // ---------------------------------------------------------------------------
  await test(
    "orchestrator : rapport OK — ≥1 paragraphe réécrit, score global descend",
    async () => {
      const buf = await makeSampleDocx();
      const detector = makeMockDetector();

      const events: HumanizeDocxProgressEvent[] = [];

      const result = await humanizeDocxNative(
        buf,
        {
          finalTargetGlobal: 15,
          maxGlobalRetries: 1,
          onProgress: (e) => events.push(e),
        },
        {
          detectorFn: detector.fn,
          humanizeSelectiveDeps: {
            scoreFn: mockScoreFn,
            rewriteFn: mockRewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
          },
        },
      );

      // Rapport global
      assert.equal(result.report.paragraphsProcessed, 5, "5 non-empty paragraphs expected");
      assert.ok(
        result.report.paragraphsRewritten >= 1,
        `expected ≥1 rewritten, got ${result.report.paragraphsRewritten}`,
      );
      assert.ok(
        result.report.globalScoreAfter <= result.report.globalScoreBefore,
        `expected globalScoreAfter (${result.report.globalScoreAfter}) ≤ globalScoreBefore (${result.report.globalScoreBefore})`,
      );
      assert.ok(
        result.report.passesUsed >= 1 && result.report.passesUsed <= 2,
        `passesUsed should be 1 or 2, got ${result.report.passesUsed}`,
      );

      // perParagraph présent
      assert.equal(result.report.perParagraph.length, 5);

      // 12/07 (Orsu) — SKIP GLOBAL SCORING : le détecteur global NE DOIT PAS
      // être appelé (les scores globaux sont estimés depuis paragraphScores).
      assert.equal(
        detector.getCalls(),
        0,
        `detectorFn should NOT be called (skipped), was called ${detector.getCalls()}× `,
      );

      // Progress events présents
      assert.ok(events.some((e) => e.step === "parse"));
      assert.ok(events.some((e) => e.step === "rewrite"));
      assert.ok(events.some((e) => e.step === "serialize"));
      assert.ok(events.some((e) => e.step === "done"));

      // Buffer output non-vide et parsable
      assert.ok(result.outputBuffer.byteLength > 0, "output buffer must not be empty");
      const reparsed = await parseDocx(result.outputBuffer);
      assert.ok(reparsed.paragraphs.length >= 5, "output must have ≥5 paragraphs");
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "orchestrator : paragraphes neutres INTACTS, paragraphes AI modifiés",
    async () => {
      const buf = await makeSampleDocx();
      const detector = makeMockDetector();

      const result = await humanizeDocxNative(
        buf,
        {
          finalTargetGlobal: 15,
          maxGlobalRetries: 1,
        },
        {
          detectorFn: detector.fn,
          humanizeSelectiveDeps: {
            scoreFn: mockScoreFn,
            rewriteFn: mockRewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
          },
        },
      );

      // Re-parse le buffer output
      const reparsed = await parseDocx(result.outputBuffer);
      const outputTexts = reparsed.paragraphs.map((p) => p.text);

      // Les paragraphes neutres doivent être INTACTS (bit-for-bit)
      assert.ok(
        outputTexts.includes(NEUTRAL_TEXTS[0]),
        `neutral p1 must be intact — outputTexts=${JSON.stringify(outputTexts)}`,
      );
      assert.ok(
        outputTexts.includes(NEUTRAL_TEXTS[1]),
        `neutral p2 must be intact`,
      );

      // Les paragraphes AI doivent avoir été REMPLACÉS (ne matchent plus les originaux)
      const originalAiCount = outputTexts.filter((t) =>
        /Premièrement, il convient de noter que la formalisation méthodologique/.test(t) ||
        /Par ailleurs, la mise en œuvre de ces principes/.test(t) ||
        /Il est important de noter que l'analyse structurelle du dispositif/.test(t),
      ).length;
      assert.ok(
        originalAiCount < AI_TEXTS.length,
        `AI paragraphs should have been replaced — still ${originalAiCount} original AI paragraphs present`,
      );

      // Le paragraphe multi-run (p0) doit conserver son <w:rPr> bold+Georgia+color
      const p0 = reparsed.paragraphs[0];
      // Il y a normalement plus d'un run si le formatage a survécu
      assert.ok(p0.runs.length >= 1, "p0 must have at least 1 run");
      // Cherche le <w:rPr> avec Georgia
      const hasFormatting = p0.runs.some((r) => {
        const s = r.props?.toString() ?? "";
        return s.includes("Georgia") || s.includes("C00000") || /w:b(\s|\/|>)/.test(s);
      });
      assert.ok(
        hasFormatting,
        `p0 must preserve at least one formatting property (Georgia/color/bold) — runs=${p0.runs.map((r) => r.props?.toString()).join(" | ")}`,
      );
    },
  );

  // ---------------------------------------------------------------------------
  // 12/07 (Orsu) — Réécrit après SKIP GLOBAL SCORING : les globalScoreBefore/
  // After sont maintenant estimés depuis les scores paragraphe (moyenne
  // pondérée par nb de mots). Pour forcer un retry global, on garde les scores
  // paragraphe HIGH en pass 1 (rescore reste HIGH → fails → estimated global
  // reste HIGH), puis on drop les scores à ~0 en pass 2 (initial batch bas →
  // estimated global tombe sous finalTargetGlobal).
  await test(
    "orchestrator : global retry se déclenche quand estimation globale reste > finalTargetGlobal",
    async () => {
      const buf = await makeSampleDocx();

      // detectorFn n'est plus appelé — on peut le fournir mais il ne sert à rien.
      let detectorCalls = 0;
      const detectorFn = async (): Promise<number> => {
        detectorCalls++;
        return 999; // valeur absurde : si jamais appelé, on le verra
      };

      const rewriteFn = async (text: string, _attempt: number) => {
        return `Franchement, ${text.slice(0, 30)} — bref c'est du vécu, ça change tout au quotidien, concrètement ça sert vraiment, et voilà. Point.`;
      };

      // Score paragraphe :
      //  - Pass 1 initial batch (5 paragraphes) → AI = 70, neutres = 15
      //  - Pass 1 rescores post-rewrite → toujours 70 (fail → attempts épuisés)
      //  → mergedPerParagraph.scoreAfter = 70 pour AI, 15 pour neutres
      //  → globalScoreAfter estimé ~50+ > 15 → retry global
      //  - Pass 2 initial batch → tous 5 (succès global)
      let batchCallCount = 0;
      const scoreFn = async (texts: string[]) => {
        batchCallCount++;
        // Le 1er batch (taille = totalParagraphs=5) = pass 1 initial
        // Les batches suivants de taille 1 = rescores post-rewrite pass 1
        // Puis un nouveau batch taille=5 = pass 2 initial → doit renvoyer LOW
        // On identifie pass 2 : le 2e appel de taille=5 rencontré.
        if (texts.length >= 5) {
          // Batch initial (pass 1 ou pass 2)
          if (batchCallCount === 1) {
            // Pass 1 initial
            return texts.map((t) => (isAiText(t) ? 70 : 15));
          }
          // Pass 2 initial : score très bas partout → estimé global tombe à ~5
          return texts.map(() => 5);
        }
        // Rescore post-rewrite (batch de taille 1) — reste HIGH pour AI
        return texts.map((t) => (isAiText(t) ? 70 : 15));
      };

      const events: HumanizeDocxProgressEvent[] = [];
      const result = await humanizeDocxNative(
        buf,
        {
          finalTargetGlobal: 15,
          maxGlobalRetries: 1,
          onProgress: (e) => events.push(e),
        },
        {
          detectorFn,
          humanizeSelectiveDeps: {
            scoreFn,
            rewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
          },
        },
      );

      // detectorFn ne doit JAMAIS être appelé
      assert.equal(detectorCalls, 0, "detectorFn must not be called");

      assert.equal(
        result.report.passesUsed,
        2,
        `expected 2 passes, got ${result.report.passesUsed}`,
      );
      // globalScoreBefore : dominé par AI paragraphs à 70 → doit être HIGH
      assert.ok(
        result.report.globalScoreBefore >= 40,
        `expected globalScoreBefore ≥40 (AI dominates), got ${result.report.globalScoreBefore}`,
      );
      // globalScoreAfter : pass 2 initial batch tout à 5 → estimé ≤ 15
      assert.ok(
        result.report.globalScoreAfter <= 15,
        `expected globalScoreAfter ≤15 after retry, got ${result.report.globalScoreAfter}`,
      );

      // Un event pass=2 doit exister
      assert.ok(
        events.some((e) => e.pass === 2),
        "expected a progress event with pass=2",
      );
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "orchestrator : passe unique si estimation globale atteinte dès la 1ère passe",
    async () => {
      const buf = await makeSampleDocx();

      let detectorCalls = 0;
      const detectorFn = async (): Promise<number> => {
        detectorCalls++;
        return 999;
      };

      // mockScoreFn renvoie 75 AI / 15 neutre en initial ; après rewrite les
      // AI ne matchent plus isAiText() → rescore = 15 → success → globalScoreAfter
      // estimé bas.
      const result = await humanizeDocxNative(
        buf,
        { finalTargetGlobal: 15, maxGlobalRetries: 3 },
        {
          detectorFn,
          humanizeSelectiveDeps: {
            scoreFn: mockScoreFn,
            rewriteFn: mockRewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
          },
        },
      );

      assert.equal(
        result.report.passesUsed,
        1,
        `expected 1 pass, got ${result.report.passesUsed}`,
      );
      assert.ok(
        result.report.globalScoreAfter <= 15,
        `expected globalScoreAfter ≤15, got ${result.report.globalScoreAfter}`,
      );
      // detectorFn jamais appelé
      assert.equal(detectorCalls, 0);
    },
  );

  // ---------------------------------------------------------------------------
  // 12/07 (Orsu) — Fix vision Marius : workflow linéaire "analyse d'abord →
  // humanize après" avec réutilisation des scores paragraphe-par-paragraphe.
  await test(
    "prescored : quand paragraphScores fournis, scoreFn N'EST PAS appelé sur le batch initial",
    async () => {
      const buf = await makeSampleDocx();
      const detectorFn = async () => 10; // Directement OK global → 1 seule passe
      let scoreFnCalls = 0;
      const trackedScoreFn = async (texts: string[]): Promise<number[]> => {
        scoreFnCalls++;
        return texts.map((t) => (isAiText(t) ? 75 : 15));
      };

      // 5 paragraphes dans le fixture (3 AI + 2 neutres). On force les 3 AI
      // à HIGH via prescoredParagraphs pour qu'ils soient rewrités.
      const prescored = [75, 15, 75, 15, 75];

      const result = await humanizeDocxNative(
        buf,
        {
          finalTargetGlobal: 15,
          maxGlobalRetries: 0, // 1 passe max
          prescoredParagraphs: prescored,
        },
        {
          detectorFn,
          humanizeSelectiveDeps: {
            scoreFn: trackedScoreFn,
            rewriteFn: mockRewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
            scoreBatchSize: 20,
          },
        },
      );

      // 3 paragraphes HIGH devraient être rewrités
      assert.ok(
        result.report.paragraphsRewritten >= 3,
        `expected ≥3 rewritten (HIGH=3), got ${result.report.paragraphsRewritten}`,
      );

      // scoreFn est appelé pour les rescores post-rewrite (1 par rewrite),
      // MAIS PAS pour le batch initial (économie de 1 appel Claude batché).
      // On attend ≤ 3 appels (1 par HIGH rewriten), jamais un batch de 5.
      assert.ok(
        scoreFnCalls <= 3,
        `expected scoreFn ≤3 calls (rescores only, no initial batch), got ${scoreFnCalls}`,
      );
      // Baseline scoreBefore utilise bien nos scores prescored
      assert.equal(result.report.perParagraph[0].scoreBefore, 75);
      assert.equal(result.report.perParagraph[1].scoreBefore, 15);
      assert.equal(result.report.perParagraph[2].scoreBefore, 75);
      assert.equal(result.report.perParagraph[3].scoreBefore, 15);
      assert.equal(result.report.perParagraph[4].scoreBefore, 75);
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "prescored : sans paragraphScores, le scoreFn IS appelé (contrôle négatif)",
    async () => {
      const buf = await makeSampleDocx();
      const detectorFn = async () => 10;
      let scoreFnCalls = 0;
      const trackedScoreFn = async (texts: string[]): Promise<number[]> => {
        scoreFnCalls++;
        return texts.map((t) => (isAiText(t) ? 75 : 15));
      };

      await humanizeDocxNative(
        buf,
        {
          finalTargetGlobal: 15,
          maxGlobalRetries: 0,
        },
        {
          detectorFn,
          humanizeSelectiveDeps: {
            scoreFn: trackedScoreFn,
            rewriteFn: mockRewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
            scoreBatchSize: 20,
          },
        },
      );

      // Sans prescored : ≥1 appel pour le batch initial + rescores
      assert.ok(
        scoreFnCalls >= 1,
        `expected scoreFn ≥1 call (initial batch), got ${scoreFnCalls}`,
      );
    },
  );

  // ---------------------------------------------------------------------------
  // 12/07 (Orsu) — Test dédié SKIP GLOBAL SCORING (optim 1) : les
  // globalScoreBefore/After sont estimés depuis les scores paragraphe, aucun
  // appel au détecteur global n'est fait quelque soit le déroulé.
  await test(
    "skip global scoring : globalScoreBefore/After estimés depuis paragraphScores, detectorFn JAMAIS appelé",
    async () => {
      const buf = await makeSampleDocx();

      let detectorCalls = 0;
      const detectorFn = async (): Promise<number> => {
        detectorCalls++;
        return 42;
      };

      // scoreFn stable : AI = 80 (very HIGH), neutre = 10 (LOW). Après rewrite,
      // les textes mutés ne matchent plus isAiText → rescore = 10.
      const result = await humanizeDocxNative(
        buf,
        { finalTargetGlobal: 15, maxGlobalRetries: 1 },
        {
          detectorFn,
          humanizeSelectiveDeps: {
            scoreFn: async (texts: string[]) =>
              texts.map((t) => (isAiText(t) ? 80 : 10)),
            rewriteFn: mockRewriteFn,
            scoreConcurrency: 1,
            rewriteConcurrency: 1,
          },
        },
      );

      // Assertion clé : detectorFn N'EST JAMAIS appelé (0 appel).
      assert.equal(
        detectorCalls,
        0,
        `detectorFn must NOT be called (skipped), was called ${detectorCalls}×`,
      );

      // Les scores globaux existent et sont bornés 0-100
      assert.ok(
        Number.isFinite(result.report.globalScoreBefore),
        "globalScoreBefore must be a finite number",
      );
      assert.ok(
        Number.isFinite(result.report.globalScoreAfter),
        "globalScoreAfter must be a finite number",
      );
      assert.ok(
        result.report.globalScoreBefore >= 0 &&
          result.report.globalScoreBefore <= 100,
        `globalScoreBefore out of 0-100: ${result.report.globalScoreBefore}`,
      );
      assert.ok(
        result.report.globalScoreAfter >= 0 &&
          result.report.globalScoreAfter <= 100,
        `globalScoreAfter out of 0-100: ${result.report.globalScoreAfter}`,
      );

      // globalScoreBefore doit refléter les AI paragraphs (score 80 sur ~155
      // mots) + neutres (score 10 sur ~18 mots) → estimé pondéré doit être HIGH.
      assert.ok(
        result.report.globalScoreBefore >= 50,
        `expected globalScoreBefore ≥50 (AI dominates), got ${result.report.globalScoreBefore}`,
      );
      // globalScoreAfter doit refléter les AI rewrités (rescore 10) + neutres
      // → estimé pondéré très bas.
      assert.ok(
        result.report.globalScoreAfter <= 20,
        `expected globalScoreAfter ≤20 (AI rewritten), got ${result.report.globalScoreAfter}`,
      );

      // Baisse effective
      assert.ok(
        result.report.globalScoreAfter < result.report.globalScoreBefore,
        `expected drop before→after, got ${result.report.globalScoreBefore}→${result.report.globalScoreAfter}`,
      );
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "orchestrator : buffer output est un DOCX valide (round-trip parsable)",
    async () => {
      const buf = await makeSampleDocx();
      const detectorFn = async () => 20;

      const result = await humanizeDocxNative(
        buf,
        {},
        {
          detectorFn,
          humanizeSelectiveDeps: {
            scoreFn: mockScoreFn,
            rewriteFn: mockRewriteFn,
          },
        },
      );

      // Round-trip
      const reparsed = await parseDocx(result.outputBuffer);
      assert.ok(reparsed.zip.file("word/document.xml"), "document.xml must exist");
      assert.ok(reparsed.zip.file("word/styles.xml"), "styles.xml must survive round-trip");
      assert.ok(reparsed.paragraphs.length >= 5);
    },
  );

  // ---------------------------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n─────────────────\n${results.length - failed.length}/${results.length} tests passed`,
  );
  if (failed.length > 0) {
    console.error(
      `\n${failed.length} test(s) failed:\n${failed.map((f) => "  - " + f.name).join("\n")}`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test harness crashed:", err);
  process.exit(1);
});
