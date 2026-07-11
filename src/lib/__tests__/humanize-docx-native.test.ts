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

      // Le détecteur global a été appelé au moins 2× (before + after)
      assert.ok(detector.getCalls() >= 2, `detector called ${detector.getCalls()}× (expected ≥2)`);

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
  await test(
    "orchestrator : global retry se déclenche quand score reste > finalTargetGlobal",
    async () => {
      const buf = await makeSampleDocx();

      // Detector qui reste au-dessus de la cible sur les 2 premiers appels,
      // puis descend en dessous au 3e appel (simule retry qui aboutit).
      let call = 0;
      const detectorFn = async (_text: string): Promise<number> => {
        call++;
        if (call === 1) return 70; // before
        if (call === 2) return 50; // after pass 1 — > finalTargetGlobal=15 → retry
        return 10;                 // after pass 2 — OK
      };

      const rewriteCalls: number[] = [];
      const rewriteFn = async (text: string, _attempt: number) => {
        rewriteCalls.push(1);
        return `Franchement, ${text.slice(0, 30)} — bref c'est du vécu, ça change tout au quotidien, concrètement ça sert vraiment, et voilà. Point.`.repeat(1);
      };

      // Score paragraphe : reste 70 sur p AI même après rewrite → force le retry
      // Au 2e passage (seuil abaissé à 50), on renvoie 30 pour les AI (encore >
      // targetScore=40) mais du coup ils sont ENCORE rewritten → OK.
      let scoreCallIdx = 0;
      const scoreFn = async (texts: string[]) => {
        scoreCallIdx++;
        return texts.map((t) => (isAiText(t) ? 65 : 15));
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

      assert.equal(result.report.passesUsed, 2, `expected 2 passes, got ${result.report.passesUsed}`);
      assert.equal(result.report.globalScoreBefore, 70);
      assert.equal(result.report.globalScoreAfter, 10);

      // Un event pass=2 doit exister
      assert.ok(
        events.some((e) => e.pass === 2),
        "expected a progress event with pass=2",
      );
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "orchestrator : passe unique si finalTargetGlobal atteint dès la 1ère passe",
    async () => {
      const buf = await makeSampleDocx();

      let call = 0;
      const detectorFn = async (_text: string): Promise<number> => {
        call++;
        if (call === 1) return 60; // before
        return 10;                 // after pass 1 — déjà OK ≤ 15
      };

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

      assert.equal(result.report.passesUsed, 1, `expected 1 pass, got ${result.report.passesUsed}`);
      assert.equal(result.report.globalScoreAfter, 10);
      // Detector appelé exactement 2× (before + after pass 1)
      assert.equal(call, 2);
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
