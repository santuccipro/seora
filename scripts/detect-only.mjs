import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const envRaw = execSync("grep -E '^(SEORA_DETECTOR_TOKEN|SEORA_DETECTOR_URL)=' /tmp/seora-env.tmp", { encoding: "utf8" });
for (const line of envRaw.trim().split("\n")) {
  const [k, ...v] = line.split("=");
  process.env[k] = v.join("=").replace(/^"|"$/g, "");
}

const mammoth = await import("mammoth");
const INPUT = "/tmp/esteban_pdf2docx.docx";
const buf = await readFile(INPUT);
const { value: text } = await mammoth.extractRawText({ buffer: buf });
const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 30);
console.log(`[info] ${text.length} chars, ${paragraphs.length} paragraphes ≥30 chars`);

const t0 = Date.now();
const res = await fetch(`${process.env.SEORA_DETECTOR_URL}/detect`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.SEORA_DETECTOR_TOKEN}`,
  },
  body: JSON.stringify({ text, language: "fr", fast_mode: false }),
});

const dt = ((Date.now() - t0) / 1000).toFixed(1);
if (!res.ok) {
  const err = await res.text();
  console.error(`[error] ${res.status}: ${err.slice(0, 300)}`);
  process.exit(1);
}
const data = await res.json();
console.log(`\n[done] ${dt}s`);
console.log(`Score global IA : ${data.global_score ?? data.globalScore ?? data.score}%`);
console.log(`\nRésultats bruts :`, JSON.stringify(data, null, 2).slice(0, 1500));
