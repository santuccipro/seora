// Run the Seora analyze pipeline locally on a PDF, bypassing auth/DB/rate-limit.
// Uses the local usage_server (127.0.0.1:8771) via env override.
//
// Usage: node scripts/run-analyze-local.mjs <path-to-pdf>

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, ".."));

// Force runner env BEFORE importing anything from src/
process.env.CLAUDE_RUNNER_URL = "http://127.0.0.1:8771";
if (!process.env.CLAUDE_RUNNER_TOKEN) {
  const envFile = await fs.readFile("/Users/sxmoption/Nyma/engine/.env", "utf-8");
  const m = envFile.match(/^USAGE_SERVER_TOKEN=(.+)$/m);
  if (!m) throw new Error("USAGE_SERVER_TOKEN not found in Nyma engine .env");
  process.env.CLAUDE_RUNNER_TOKEN = m[1].replace(/^["']|["']$/g, "");
}

// Rely on tsx CLI (`npx tsx scripts/run-analyze-local.mjs <pdf>`)
const {
  extractTextFromFile,
  claudeScoreText,
  claudeScoreDimensions,
} = await import(path.resolve("src/lib/humanize-engine.ts"));

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("usage: node run-analyze-local.mjs <path-to-pdf>");
  process.exit(1);
}

const buf = await fs.readFile(pdfPath);
const fname = path.basename(pdfPath);

const t0 = Date.now();
const text = await extractTextFromFile(buf, fname, "application/pdf");
const t1 = Date.now();
console.log(`[extract] ${text.split(/\s+/).length} mots, ${text.length} chars, ${((t1 - t0) / 1000).toFixed(1)}s`);

const claude = await claudeScoreText(text, "fr");
const t2 = Date.now();
console.log(`[claudeScoreText] overall=${claude.overall} zones=${claude.zones?.length ?? 0} ${((t2 - t1) / 1000).toFixed(1)}s`);

const dimensions = await claudeScoreDimensions(text, "fr");
const t3 = Date.now();
console.log(`[dimensions] STRUCTURE=${dimensions.structure} REGISTRE=${dimensions.registre} ANTITHÈSES=${dimensions.antitheses} LANGUE=${dimensions.langue} ${((t3 - t2) / 1000).toFixed(1)}s`);

// Formule finale du route.ts (post 39ad99a)
const rawGlobal = claude.overall;
const dimBase = (dimensions.registre + dimensions.langue) / 2;
const compressedGlobal = Math.max(0, Math.min(100, Math.round(
  dimBase > 0 ? dimBase * 0.5 : rawGlobal * 0.4
)));

console.log("");
console.log("========================================");
console.log(`SCORE GLOBAL Seora après recalibration : ${compressedGlobal}%`);
console.log("========================================");
console.log(`  raw claude.overall (avant compression) : ${rawGlobal}`);
console.log(`  dimBase (REGISTRE+LANGUE)/2             : ${dimBase.toFixed(1)}`);
console.log(`  formule                                 : dimBase × 0.5 = ${(dimBase * 0.5).toFixed(1)}`);
console.log(`  → arrondi et clamped                    : ${compressedGlobal}%`);
console.log("");
console.log(`  Dimensions VIRÉES du calcul global (mais gardées en payload) :`);
console.log(`    STRUCTURE  : ${dimensions.structure}%   (patterns humains, false-positive)`);
console.log(`    ANTITHÈSES : ${dimensions.antitheses}%   (patterns humains, false-positive)`);
console.log("");
console.log(`Wall-clock total : ${((t3 - t0) / 1000).toFixed(1)}s`);
