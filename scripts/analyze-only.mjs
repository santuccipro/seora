import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const envRaw = execSync("grep -E '^(SEORA_DETECTOR_TOKEN|SEORA_DETECTOR_URL)=' /tmp/seora-env.tmp", { encoding: "utf8" });
for (const line of envRaw.trim().split("\n")) {
  const [k, ...v] = line.split("=");
  process.env[k] = v.join("=").replace(/^"|"$/g, "");
}

const { callDetector } = await import("../src/lib/seora-detector.ts");
const mammoth = await import("mammoth");

const INPUT = "/tmp/esteban_pdf2docx.docx";
const buf = await readFile(INPUT);
const extracted = await mammoth.extractRawText({ buffer: buf });
const text = extracted.value;
const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 30);

console.log(`[info] ${text.length} chars, ${paragraphs.length} paragraphes ≥30 chars`);

const t0 = Date.now();
const detected = await callDetector(text, "fr");
const dt = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n[done] ${dt}s`);
console.log(`Score global IA : ${detected.globalScore}%`);
if (detected.signals) console.log(`Signaux :`, JSON.stringify(detected.signals, null, 2));
else console.log(`Raw :`, JSON.stringify(detected, null, 2).slice(0, 500));
