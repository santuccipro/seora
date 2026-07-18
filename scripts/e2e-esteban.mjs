// Direct E2E test on Esteban DPP.
// Uses tsx-transpiled TS modules from src/lib/.
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

// Load SEORA_DETECTOR_TOKEN
const envRaw = execSync("grep '^SEORA_DETECTOR_TOKEN=' /tmp/seora-env.tmp", { encoding: "utf8" });
process.env.SEORA_DETECTOR_TOKEN = envRaw.split("=")[1].replace(/["\s]/g, "");
process.env.SEORA_DETECTOR_URL = "https://detector.tryseora.com";

console.log("[boot] SEORA_DETECTOR_TOKEN loaded:", process.env.SEORA_DETECTOR_TOKEN.slice(0, 8) + "...");

const { humanizeDocxNative } = await import("../src/lib/humanize-docx-native.ts");

const INPUT = "/tmp/esteban_pdf2docx.docx";
const OUTPUT = "/tmp/esteban_humanized_v2.docx";
const REPORT = "/tmp/esteban_humanized_report_v2.json";

const t0 = Date.now();
const buf = await readFile(INPUT);
console.log(`[input] ${INPUT} (${buf.length} bytes)`);

const result = await humanizeDocxNative(buf, {
  targetScore: 40,
  highRiskThreshold: 60,
  maxRetries: 2,
  finalTargetGlobal: 15,
  maxGlobalRetries: 1,
  onProgress: (e) => {
    const t = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${t}s] progress: ${e.step}`, e.detail ?? "");
  },
});

await writeFile(OUTPUT, result.outputBuffer);
await writeFile(REPORT, JSON.stringify(result.report, null, 2));

const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[done] ${dt}s wall-clock`);
console.log(`  globalScoreBefore: ${result.report.globalScoreBefore}`);
console.log(`  globalScoreAfter:  ${result.report.globalScoreAfter}`);
console.log(`  paragraphs processed: ${result.report.paragraphsProcessed}`);
console.log(`  paragraphs rewritten: ${result.report.paragraphsRewritten}`);
console.log(`  paragraphs failed:    ${result.report.paragraphsFailed}`);
console.log(`  passesUsed: ${result.report.passesUsed}`);
console.log(`  output:  ${OUTPUT} (${result.outputBuffer.length} bytes)`);
console.log(`  report:  ${REPORT}`);
