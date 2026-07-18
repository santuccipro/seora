/**
 * E2E test humanizer V3 — vrai DPP Esteban (Financia Business School).
 *
 * Prend le DPP converti PDF→DOCX (via LibreOffice) et le passe dans
 * `humanizeDocxNative()`. Rapport détaillé stdout.
 *
 * Env requis :
 *   SEORA_DETECTOR_URL    (default https://detector.tryseora.com)
 *   SEORA_DETECTOR_TOKEN  (bearer)
 *   CLAUDE_RUNNER_URL     (tunnel Mac mini)
 *   CLAUDE_RUNNER_TOKEN
 *
 * Usage :
 *   npx tsx scripts/e2e-test-humanizer-v3.ts
 */

import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";

import { parseDocx } from "../src/lib/docx-native-parser";
import {
  humanizeDocxNative,
  HumanizeDocxProgressEvent,
} from "../src/lib/humanize-docx-native";

const INPUT_PATH = "/tmp/1783781729755-AgADER0AAoBUiFI.docx";
const OUTPUT_PATH = "/tmp/esteban_humanized.docx";

function fmtSec(ms: number): string {
  return (ms / 1000).toFixed(1) + "s";
}

function truncate(s: string, n = 80): string {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ");
  return t.length <= n ? t : t.slice(0, n) + "…";
}

async function main() {
  const t0 = performance.now();

  const missing: string[] = [];
  if (!process.env.SEORA_DETECTOR_TOKEN) missing.push("SEORA_DETECTOR_TOKEN");
  if (!process.env.CLAUDE_RUNNER_URL) missing.push("CLAUDE_RUNNER_URL");
  if (!process.env.CLAUDE_RUNNER_TOKEN) missing.push("CLAUDE_RUNNER_TOKEN");
  if (missing.length) {
    console.error(`[ENV] missing: ${missing.join(", ")}`);
    process.exit(2);
  }
  if (!process.env.SEORA_DETECTOR_URL) {
    process.env.SEORA_DETECTOR_URL = "https://detector.tryseora.com";
  }

  console.log(`[STEP 1] read input DOCX : ${INPUT_PATH}`);
  const inputBuffer = await fs.readFile(INPUT_PATH);
  console.log(`  size: ${(inputBuffer.length / 1024).toFixed(1)} KB`);

  const preParsed = await parseDocx(inputBuffer);
  const wordCount = preParsed.paragraphs.reduce(
    (n, p) => n + p.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  console.log(`  paragraphes non-vides: ${preParsed.paragraphs.length}`);
  console.log(`  mots total: ${wordCount}`);

  console.log(`\n[STEP 2] humanizeDocxNative()`);
  const events: HumanizeDocxProgressEvent[] = [];
  const result = await humanizeDocxNative(inputBuffer, {
    targetScore: 40,
    highRiskThreshold: 60,
    maxRetries: 2,
    finalTargetGlobal: 15,
    maxGlobalRetries: 1,
    onProgress: (e) => {
      events.push(e);
      if (
        e.step === "parse" ||
        e.step === "score" ||
        e.step === "serialize" ||
        e.step === "rescore" ||
        e.step === "final_check" ||
        e.step === "done"
      ) {
        const detail = e.detail
          ? ` detail=${JSON.stringify(e.detail).slice(0, 160)}`
          : "";
        console.log(
          `  progress: ${e.step}${e.pass ? ` pass=${e.pass}` : ""}${detail}`,
        );
      }
    },
  });

  const t1 = performance.now();
  console.log(`\n[STEP 3] pipeline done in ${fmtSec(t1 - t0)}`);

  await fs.writeFile(OUTPUT_PATH, result.outputBuffer);
  console.log(
    `  output written: ${OUTPUT_PATH} (${(result.outputBuffer.length / 1024).toFixed(1)} KB)`,
  );

  let outputValid = false;
  let outParsed: Awaited<ReturnType<typeof parseDocx>> | null = null;
  try {
    outParsed = await parseDocx(result.outputBuffer);
    outputValid = true;
    console.log(
      `  output DOCX valide (${outParsed.paragraphs.length} paragraphes)`,
    );
  } catch (err) {
    console.error(
      `  output DOCX INVALIDE: ${err instanceof Error ? err.message : err}`,
    );
  }

  const rep = result.report;
  console.log(
    `\n──────────────────────────────────────────────────────────`,
  );
  console.log(`RAPPORT`);
  console.log(`──────────────────────────────────────────────────────────`);
  console.log(`Input        : ${INPUT_PATH}`);
  console.log(
    `Output       : ${OUTPUT_PATH} (${result.outputBuffer.length} bytes)`,
  );
  console.log(`Paragraphes  : ${rep.paragraphsProcessed}`);
  console.log(`Mots         : ${wordCount}`);
  console.log(`Passes       : ${rep.passesUsed}`);
  console.log(`Latence      : ${fmtSec(t1 - t0)}`);
  console.log(``);
  console.log(`Score global AVANT : ${rep.globalScoreBefore.toFixed(1)}%`);
  console.log(`Score global APRÈS : ${rep.globalScoreAfter.toFixed(1)}%`);
  console.log(
    `Delta              : ${(rep.globalScoreBefore - rep.globalScoreAfter).toFixed(1)} pts`,
  );
  console.log(``);
  console.log(`Paragraphes réécrits  : ${rep.paragraphsRewritten}`);
  console.log(`Paragraphes failed    : ${rep.paragraphsFailed}`);
  console.log(``);

  const perP = rep.perParagraph;
  const relevant = perP.filter((p) => p.changed || p.scoreBefore >= 60);
  console.log(
    `Détail per-paragraph (HIGH + changed, ${relevant.length}/${perP.length}):`,
  );
  for (const p of relevant.slice(0, 25)) {
    const arrow = p.changed ? "→" : "↔";
    console.log(
      `  p${p.index.toString().padStart(3)}: ${p.scoreBefore
        .toString()
        .padStart(3)} ${arrow} ${p.scoreAfter
        .toString()
        .padStart(3)}  (att=${p.attempts})  ${truncate(p.textBefore, 60)}`,
    );
  }
  if (relevant.length > 25) {
    console.log(`  ... (+${relevant.length - 25} autres)`);
  }

  console.log(``);
  console.log(`Vérifications:`);
  const checks: Array<[boolean, string]> = [];
  checks.push([outputValid, "DOCX output valide (parse OK)"]);
  checks.push([
    rep.globalScoreAfter < rep.globalScoreBefore,
    `Score global baissé (${rep.globalScoreBefore.toFixed(1)} > ${rep.globalScoreAfter.toFixed(1)})`,
  ]);
  checks.push([
    rep.paragraphsRewritten > 0,
    `≥1 paragraphe réécrit (${rep.paragraphsRewritten})`,
  ]);

  const neutralUnchanged = perP.filter(
    (p) => p.scoreBefore < 40 && !p.changed,
  ).length;
  const neutralTotal = perP.filter((p) => p.scoreBefore < 40).length;
  checks.push([
    neutralUnchanged === neutralTotal,
    `Paragraphes neutres intacts (${neutralUnchanged}/${neutralTotal})`,
  ]);

  // Formatage préservé
  let formatOk = false;
  let formatDetail = "n/a";
  if (outputValid && outParsed) {
    const changedIdx = perP.find((p) => p.changed)?.index;
    if (changedIdx !== undefined) {
      const inP = preParsed.paragraphs.find((x) => x.index === changedIdx);
      const outP = outParsed.paragraphs.find((x) => x.index === changedIdx);
      if (inP && outP) {
        const serIn = inP.runs.map((r) =>
          r.props ? r.props.toString() : "NO_RPR",
        );
        const serOut = outP.runs.map((r) =>
          r.props ? r.props.toString() : "NO_RPR",
        );
        const commonLen = Math.min(serIn.length, serOut.length);
        let identical = commonLen > 0;
        for (let k = 0; k < commonLen; k++) {
          if (serIn[k] !== serOut[k]) {
            identical = false;
            break;
          }
        }
        formatOk = identical;
        formatDetail = `p${changedIdx}: ${commonLen} runs comparés, identiques=${identical}`;
      } else {
        formatDetail = `p${changedIdx} introuvable in ou out`;
      }
    } else {
      formatDetail = "aucun paragraphe modifié";
    }
  }
  checks.push([formatOk, `Formatage (<w:rPr>) préservé (${formatDetail})`]);

  for (const [ok, label] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  }

  const allPass = checks.every(([ok]) => ok);
  console.log(``);
  console.log(`Verdict global : ${allPass ? "ALL PASS" : "PARTIAL / FAIL"}`);
  console.log(``);

  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(3);
});
