/**
 * Test round-trip du parser DOCX natif.
 *
 * Exécution (depuis la racine du projet) :
 *   npx tsx src/lib/__tests__/docx-native-parser.test.ts
 *
 * (Le projet n'a pas de test runner configuré — on utilise `tsx` déjà présent
 * en devDeps et un mini harness assert-based. Sortie zéro = OK, non-zéro = FAIL.)
 */

import { strict as assert } from "node:assert";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import {
  parseDocx,
  updateParagraphText,
  serializeDocx,
} from "../docx-native-parser";

// -----------------------------------------------------------------------------
// SAMPLE DOCX (créé à la volée via la lib `docx`)
// -----------------------------------------------------------------------------
async function makeSampleDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          // p0 : mono-run plain
          new Paragraph({
            children: [
              new TextRun({
                text: "Bonjour Marius, ceci est un premier paragraphe simple.",
              }),
            ],
          }),
          // p1 : multi-run avec gras + police custom
          new Paragraph({
            children: [
              new TextRun({ text: "Ceci est " }),
              new TextRun({
                text: "important",
                bold: true,
                font: "Georgia",
                size: 28, // half-points → 14pt
                color: "C00000",
              }),
              new TextRun({ text: " et voilà." }),
            ],
          }),
          // p2 : italic
          new Paragraph({
            children: [
              new TextRun({ text: "Une phrase en ", italics: true }),
              new TextRun({ text: "italique", italics: true, bold: true }),
              new TextRun({ text: ".", italics: true }),
            ],
          }),
          // p3 : paragraphe vide (doit être conservé, mais NON présent dans paragraphs)
          new Paragraph({ children: [] }),
          // p4 : après le vide, un dernier paragraphe
          new Paragraph({
            children: [
              new TextRun({ text: "Dernier paragraphe après un vide." }),
            ],
          }),
          // p5 : une table (doit rester dans le DOM, ses paragraphes internes
          // ne sont pas dans la liste)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Cellule table A1" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Cellule table A2" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
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
// TESTS
// -----------------------------------------------------------------------------
async function main() {
  const sample = await makeSampleDocx();

  await test("parse returns paragraphs and preserves ordering", async () => {
    const parsed = await parseDocx(sample);
    assert.ok(parsed.paragraphs.length >= 4, `expected ≥4 non-empty paragraphs, got ${parsed.paragraphs.length}`);
    assert.equal(
      parsed.paragraphs[0].text,
      "Bonjour Marius, ceci est un premier paragraphe simple."
    );
    assert.equal(parsed.paragraphs[1].text, "Ceci est important et voilà.");
    assert.equal(parsed.paragraphs[2].text, "Une phrase en italique.");
    // Le paragraphe vide est skippé — le suivant vient direct.
    assert.equal(parsed.paragraphs[3].text, "Dernier paragraphe après un vide.");
  });

  await test("multi-run paragraph exposes multiple runs with props preserved", async () => {
    const parsed = await parseDocx(sample);
    const p1 = parsed.paragraphs[1];
    assert.equal(p1.runs.length, 3, "expected 3 runs in p1");
    assert.equal(p1.runs[0].text, "Ceci est ");
    assert.equal(p1.runs[1].text, "important");
    assert.equal(p1.runs[2].text, " et voilà.");
    // Le run 1 doit porter des <w:rPr> (car bold + font + size + color)
    assert.ok(p1.runs[1].props, "expected <w:rPr> on bold run");
  });

  await test("update single-run paragraph works trivially", async () => {
    const parsed = await parseDocx(sample);
    const p0 = parsed.paragraphs[0];
    updateParagraphText(p0, "TEXTE REMPLACÉ intégralement.");
    assert.equal(p0.text, "TEXTE REMPLACÉ intégralement.");

    const buf = await serializeDocx(parsed);
    const reparsed = await parseDocx(buf);
    assert.equal(reparsed.paragraphs[0].text, "TEXTE REMPLACÉ intégralement.");
    // Les autres paragraphes doivent être intacts
    assert.equal(reparsed.paragraphs[1].text, "Ceci est important et voilà.");
    assert.equal(reparsed.paragraphs[2].text, "Une phrase en italique.");
    assert.equal(reparsed.paragraphs[3].text, "Dernier paragraphe après un vide.");
  });

  await test("update multi-run paragraph redistributes proportionally and preserves rPr", async () => {
    const parsed = await parseDocx(sample);
    const p1 = parsed.paragraphs[1];
    const originalRPrXml = p1.runs[1].props?.toString();
    assert.ok(originalRPrXml, "sanity: p1.runs[1] should have rPr");

    // Ancien text = "Ceci est important et voilà." (28 chars)
    // Nouveau text = "Salut Marius, c'est très cool ici." (34 chars)
    const newText = "Salut Marius, c'est très cool ici.";
    updateParagraphText(p1, newText);

    // Après update, la CONCATENATION des runs doit égaler newText
    const rebuilt = p1.runs.map((r) => r.text).join("");
    assert.equal(rebuilt, newText, `rebuilt "${rebuilt}" != newText "${newText}"`);

    // Round-trip
    const buf = await serializeDocx(parsed);
    const reparsed = await parseDocx(buf);
    assert.equal(reparsed.paragraphs[1].text, newText);
    // Le <w:rPr> du 2e run doit toujours contenir bold + font + color
    const newRPr = reparsed.paragraphs[1].runs[1].props?.toString() ?? "";
    assert.ok(
      /w:b(\s|\/|>)/.test(newRPr),
      `expected <w:b> still present after round-trip, got: ${newRPr}`
    );
    assert.ok(
      newRPr.includes("Georgia"),
      `expected Georgia font preserved, got: ${newRPr}`
    );
    assert.ok(
      newRPr.includes("C00000"),
      `expected color C00000 preserved, got: ${newRPr}`
    );
  });

  await test("empty paragraph preserved in output DOM but absent from list", async () => {
    const parsed = await parseDocx(sample);
    // Sanity : le p2 (italic) est bien italic dans le DOM
    // On sérialise sans rien changer, on ré-ouvre, on vérifie que le zip
    // contient toujours toutes ses parts (styles, etc.)
    const buf = await serializeDocx(parsed);
    const reparsed = await parseDocx(buf);
    // Les italiques doivent survivre
    const italicRPr =
      reparsed.paragraphs[2].runs[0].props?.toString() ?? "";
    assert.ok(
      /w:i(\s|\/|>)/.test(italicRPr),
      `expected italic <w:i> preserved, got: ${italicRPr}`
    );
    // Vérifie que styles.xml est toujours dans le zip (pas d'écrasement)
    assert.ok(
      reparsed.zip.file("word/styles.xml"),
      "styles.xml must survive round-trip"
    );
  });

  await test("table survives round-trip untouched (not listed as paragraph)", async () => {
    const parsed = await parseDocx(sample);
    // Aucun des paragraphs dans la liste ne doit contenir "Cellule table"
    for (const p of parsed.paragraphs) {
      assert.ok(
        !p.text.includes("Cellule table"),
        `paragraph list must not include table cells, but found: ${p.text}`
      );
    }
    // Après round-trip le texte des cellules doit encore apparaître dans le XML
    const buf = await serializeDocx(parsed);
    const reparsedZip = await parseDocx(buf);
    const rawXml =
      (await reparsedZip.zip.file("word/document.xml")?.async("string")) ?? "";
    assert.ok(
      rawXml.includes("Cellule table A1") && rawXml.includes("Cellule table A2"),
      "table cells must survive in the final document.xml"
    );
  });

  await test("update preserves whitespace when text starts with space", async () => {
    const parsed = await parseDocx(sample);
    const p1 = parsed.paragraphs[1];
    // Force un texte avec espaces significatifs
    updateParagraphText(p1, "  espaces  autour  ");
    const buf = await serializeDocx(parsed);
    const reparsed = await parseDocx(buf);
    assert.equal(reparsed.paragraphs[1].text, "  espaces  autour  ");
  });

  // -----------------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n─────────────────\n${results.length - failed.length}/${results.length} tests passed`
  );
  if (failed.length > 0) {
    console.error(
      `\n${failed.length} test(s) failed:\n${failed.map((f) => "  - " + f.name).join("\n")}`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test harness crashed:", err);
  process.exit(1);
});
