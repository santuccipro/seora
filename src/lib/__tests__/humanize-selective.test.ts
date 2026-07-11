/**
 * Tests du pipeline `humanizeSelective` (étape B du refactor).
 *
 * Aucun test ne fait d'appel réseau : on injecte des mocks `scoreFn` /
 * `rewriteFn` via `HumanizeDeps`. Les paragraphes sont fabriqués à la
 * volée avec la lib `docx` puis parsés par `parseDocx` pour obtenir des
 * vrais `ParagraphNode` mutables.
 *
 * Exécution (depuis la racine du projet) :
 *   npx tsx src/lib/__tests__/humanize-selective.test.ts
 *
 * Sortie zéro = OK, non-zéro = FAIL.
 */

import { strict as assert } from "node:assert";
import { Document, Packer, Paragraph, TextRun } from "docx";

import { parseDocx, ParagraphNode } from "../docx-native-parser";
import {
  humanizeSelective,
  HumanizeProgressEvent,
  HumanizeReport,
} from "../humanize-selective";

// -----------------------------------------------------------------------------
// FIXTURES
// -----------------------------------------------------------------------------
async function makeParagraphs(texts: string[]): Promise<ParagraphNode[]> {
  const doc = new Document({
    sections: [
      {
        children: texts.map(
          (t) => new Paragraph({ children: [new TextRun({ text: t })] }),
        ),
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  const parsed = await parseDocx(buf);
  return parsed.paragraphs;
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
// TESTS
// -----------------------------------------------------------------------------

async function main() {
  // ---------------------------------------------------------------------------
  await test(
    "test 1 : seul le paragraphe HIGH est réécrit (30/55/75 → rewrite p2 uniquement)",
    async () => {
      const texts = [
        "Paragraphe HUMAIN — franchement c'est du vécu, ça change tout au quotidien.",
        "Paragraphe MEDIUM — la structure narrative alterne mais garde une certaine rigueur académique.",
        "Paragraphe IA — Premièrement, il est important de noter que la formalisation des objectifs constitue un socle. Deuxièmement, trois effets convergents en découlent. Troisièmement, en somme, cela s'inscrit dans une perspective structurelle.",
      ];
      const paragraphs = await makeParagraphs(texts);

      // Mock : scores initiaux 30, 55, 75. Après rewrite → 20.
      let scoreCallIndex = 0;
      const scoreCalls: string[][] = [];
      const scoreFn = async (batch: string[]) => {
        scoreCalls.push([...batch]);
        // Premier appel : batch initial des 3 paragraphes
        if (scoreCallIndex === 0) {
          scoreCallIndex++;
          return [30, 55, 75];
        }
        // Appels suivants : rescoring d'un paragraphe unique après rewrite
        scoreCallIndex++;
        return batch.map(() => 20);
      };

      const rewriteCalls: Array<{ text: string; attempt: number }> = [];
      const rewriteFn = async (text: string, attempt: number) => {
        rewriteCalls.push({ text, attempt });
        // Renvoie une version modifiée mais assez longue pour ne pas être
        // rejetée par le filtre "< 50% longueur origine".
        return `Franchement, c'est du vécu au quotidien. On formalise les objectifs par écrit, ça pose une base solide. Concrètement, ça sert. Au final, plusieurs effets qui vont dans le même sens en découlent, et ça s'inscrit dans une logique structurelle claire.`;
      };

      const events: HumanizeProgressEvent[] = [];
      const report = await humanizeSelective(
        paragraphs,
        { onProgress: (e) => events.push(e) },
        { scoreFn, rewriteFn, scoreBatchSize: 20, scoreConcurrency: 1, rewriteConcurrency: 1 },
      );

      // Sanity structure
      assert.equal(report.totalParagraphs, 3);
      assert.equal(report.perParagraph.length, 3);

      // Seul p2 doit avoir été rewrité
      assert.equal(rewriteCalls.length, 1, `expected 1 rewrite call, got ${rewriteCalls.length}`);
      assert.equal(rewriteCalls[0].attempt, 0);
      assert.equal(rewriteCalls[0].text, texts[2]);

      // p0 et p1 restent intacts
      assert.equal(report.perParagraph[0].changed, false);
      assert.equal(report.perParagraph[1].changed, false);
      assert.equal(report.perParagraph[0].attempts, 0);
      assert.equal(report.perParagraph[1].attempts, 0);
      assert.equal(report.perParagraph[0].textBefore, texts[0]);
      assert.equal(report.perParagraph[0].textAfter, texts[0]);
      assert.equal(paragraphs[0].text, texts[0]);
      assert.equal(paragraphs[1].text, texts[1]);

      // p2 est modifié et re-scoré
      assert.equal(report.perParagraph[2].changed, true);
      assert.equal(report.perParagraph[2].attempts, 1);
      assert.equal(report.perParagraph[2].scoreBefore, 75);
      assert.equal(report.perParagraph[2].scoreAfter, 20);
      assert.notEqual(report.perParagraph[2].textAfter, texts[2]);
      assert.notEqual(paragraphs[2].text, texts[2]);

      // Compteurs globaux
      assert.equal(report.paragraphsRewritten, 1);
      assert.equal(report.paragraphsSkipped, 2);
      assert.equal(report.paragraphsFailed, 0);

      // Progress events présents
      assert.ok(events.some((e) => e.step === "scoring"));
      assert.ok(events.some((e) => e.step === "rewriting" && e.paragraphIndex === 2));
      assert.ok(events.some((e) => e.step === "rescoring" && e.paragraphIndex === 2));
      assert.ok(events.some((e) => e.step === "done"));
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "test 2 : rewrite reste HIGH → retry jusqu'à maxRetries, marqué failed",
    async () => {
      const texts = [
        "Paragraphe IA lourd — Premièrement, il convient de noter que la mise en œuvre repose sur un socle structurel. Deuxièmement, en somme, trois effets convergents s'inscrivent dans une perspective académique. Par ailleurs, il est important de souligner cette dimension.",
      ];
      const paragraphs = await makeParagraphs(texts);

      let scoreCallIndex = 0;
      const scoreFn = async (batch: string[]) => {
        scoreCallIndex++;
        // Premier appel (batch initial) → 80. Tous les rescores restent HIGH.
        if (scoreCallIndex === 1) return [80];
        return batch.map(() => 75); // never drops below targetScore
      };

      const rewriteCalls: number[] = [];
      const rewriteFn = async (text: string, attempt: number) => {
        rewriteCalls.push(attempt);
        // Variation minime, mais assez longue pour passer le filtre
        return `${text.replace("Premièrement", "D'abord")} (attempt ${attempt})`;
      };

      const report = await humanizeSelective(
        paragraphs,
        { maxRetries: 2 }, // 1 + 2 = 3 tentatives max
        { scoreFn, rewriteFn, rewriteConcurrency: 1, scoreConcurrency: 1 },
      );

      // 3 tentatives (attempt 0, 1, 2)
      assert.deepEqual(rewriteCalls, [0, 1, 2]);

      assert.equal(report.perParagraph[0].changed, true);
      assert.equal(report.perParagraph[0].attempts, 3);
      assert.equal(report.perParagraph[0].scoreBefore, 80);
      assert.equal(report.perParagraph[0].scoreAfter, 75);
      assert.ok(
        report.perParagraph[0].scoreAfter > 40,
        "scoreAfter should still exceed targetScore",
      );

      assert.equal(report.paragraphsRewritten, 0);
      assert.equal(report.paragraphsFailed, 1);
      assert.equal(report.paragraphsSkipped, 0);
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "test 3 : rapport final expose textBefore/textAfter et scores par paragraphe",
    async () => {
      const texts = [
        "Court paragraphe HIGH — il convient de noter que l'analyse structurelle repose sur un socle académique convergent en somme par ailleurs.",
        "Paragraphe déjà humain, marqueurs perso concrets — c'est du vécu au quotidien franchement.",
      ];
      const paragraphs = await makeParagraphs(texts);

      const rewritten = `Franchement, l'analyse s'appuie sur une base solide. Ça pose un cadre clair, et c'est du vécu. Concrètement, tout va dans le même sens au quotidien.`;

      let call = 0;
      const scoreFn = async (batch: string[]) => {
        call++;
        if (call === 1) return [70, 15]; // initial : p0 HIGH, p1 LOW
        return batch.map(() => 25); // rescore p0 → OK
      };
      const rewriteFn = async () => rewritten;

      const report: HumanizeReport = await humanizeSelective(
        paragraphs,
        {},
        { scoreFn, rewriteFn, scoreConcurrency: 1, rewriteConcurrency: 1 },
      );

      // Structure du rapport
      assert.equal(report.totalParagraphs, 2);
      assert.equal(report.perParagraph.length, 2);

      // p0 rewritten
      const r0 = report.perParagraph[0];
      assert.equal(r0.index, 0);
      assert.equal(r0.scoreBefore, 70);
      assert.equal(r0.scoreAfter, 25);
      assert.equal(r0.attempts, 1);
      assert.equal(r0.changed, true);
      assert.equal(r0.textBefore, texts[0]);
      assert.equal(r0.textAfter, rewritten);

      // p1 intact
      const r1 = report.perParagraph[1];
      assert.equal(r1.index, 1);
      assert.equal(r1.scoreBefore, 15);
      assert.equal(r1.scoreAfter, 15);
      assert.equal(r1.attempts, 0);
      assert.equal(r1.changed, false);
      assert.equal(r1.textBefore, texts[1]);
      assert.equal(r1.textAfter, texts[1]);

      // Mutation in-place propagée dans le ParagraphNode
      assert.equal(paragraphs[0].text, rewritten);
      assert.equal(paragraphs[1].text, texts[1]);

      // Compteurs
      assert.equal(report.paragraphsRewritten, 1);
      assert.equal(report.paragraphsSkipped, 1);
      assert.equal(report.paragraphsFailed, 0);
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "batching : plus de 20 paragraphes → plusieurs appels scoreFn au boot",
    async () => {
      const texts = Array.from(
        { length: 45 },
        (_, i) =>
          `Paragraphe numéro ${i + 1} avec quelques mots pour dépasser le seuil minimum de scoring interne du module humanizer.`,
      );
      const paragraphs = await makeParagraphs(texts);

      const batchSizes: number[] = [];
      const scoreFn = async (batch: string[]) => {
        batchSizes.push(batch.length);
        return batch.map(() => 10); // tout LOW → aucun rewrite
      };
      const rewriteFn = async () => {
        throw new Error("rewriteFn should not be called when all LOW");
      };

      const report = await humanizeSelective(
        paragraphs,
        {},
        { scoreFn, rewriteFn, scoreBatchSize: 20, scoreConcurrency: 3 },
      );

      // 45 paragraphes / 20 par batch → 3 batches (20 + 20 + 5)
      assert.equal(batchSizes.length, 3, `expected 3 batches, got ${batchSizes.length}`);
      const sorted = [...batchSizes].sort((a, b) => a - b);
      assert.deepEqual(sorted, [5, 20, 20]);

      assert.equal(report.paragraphsRewritten, 0);
      assert.equal(report.paragraphsSkipped, 45);
      assert.equal(report.paragraphsFailed, 0);
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "rewrite échoue → 2e tentative retente et OK → success final",
    async () => {
      const texts = [
        "Paragraphe HIGH — il convient de noter la mise en œuvre d'un socle académique convergent en somme.",
      ];
      const paragraphs = await makeParagraphs(texts);

      let call = 0;
      const scoreFn = async (batch: string[]) => {
        call++;
        if (call === 1) return [70]; // initial
        return batch.map(() => 20); // rescore → OK
      };

      const rewriteAttempts: number[] = [];
      const rewriteFn = async (text: string, attempt: number) => {
        rewriteAttempts.push(attempt);
        if (attempt === 0) throw new Error("simulated Claude timeout");
        return `Franchement, l'analyse s'appuie sur une base solide au quotidien. On formalise le tout par écrit, ça pose un cadre clair. Concrètement ça sert, et ça s'inscrit dans une dynamique cohérente.`;
      };

      const report = await humanizeSelective(
        paragraphs,
        { maxRetries: 2 },
        { scoreFn, rewriteFn, rewriteConcurrency: 1, scoreConcurrency: 1 },
      );

      assert.deepEqual(rewriteAttempts, [0, 1]);
      // attempts compte les tentatives réussies (a muté le paragraphe) — donc
      // ici 1 essai raté + 1 essai réussi = attempts = 2 (numéro d'essai réussi
      // +1 = 1 + 1). On garde la convention "record.attempts = attempt + 1"
      // → l'essai qui a réussi est le 2e (attempt=1) donc attempts = 2.
      assert.equal(report.perParagraph[0].attempts, 2);
      assert.equal(report.perParagraph[0].changed, true);
      assert.equal(report.perParagraph[0].scoreAfter, 20);
      assert.equal(report.paragraphsRewritten, 1);
      assert.equal(report.paragraphsFailed, 0);
    },
  );

  // ---------------------------------------------------------------------------
  await test(
    "rewrite trop court → tentative rejetée, retry avec attempt suivant",
    async () => {
      const texts = [
        "Paragraphe HIGH assez long pour qu'un rewrite tronqué déclenche la sécurité < 50 % longueur — il convient de noter la mise en œuvre du socle académique convergent en somme.",
      ];
      const paragraphs = await makeParagraphs(texts);

      let call = 0;
      const scoreFn = async (batch: string[]) => {
        call++;
        if (call === 1) return [70];
        return batch.map(() => 15);
      };
      const rewriteAttempts: number[] = [];
      const rewriteFn = async (text: string, attempt: number) => {
        rewriteAttempts.push(attempt);
        if (attempt === 0) return "Trop court."; // rejeté
        return `Franchement, la mise en place s'appuie sur une base solide et cohérente. Ça pose un cadre clair au quotidien, concrètement ça sert. Bref, on formalise le tout par écrit, ça évite les emmerdes plus tard.`;
      };

      const report = await humanizeSelective(
        paragraphs,
        { maxRetries: 2 },
        { scoreFn, rewriteFn, rewriteConcurrency: 1, scoreConcurrency: 1 },
      );

      assert.deepEqual(rewriteAttempts, [0, 1]);
      assert.equal(report.perParagraph[0].changed, true);
      assert.equal(report.perParagraph[0].scoreAfter, 15);
      assert.equal(report.paragraphsRewritten, 1);
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
