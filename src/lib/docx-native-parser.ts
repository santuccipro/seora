/**
 * docx-native-parser
 * ------------------
 * Ouvre un fichier .docx (= ZIP contenant du XML), extrait la structure
 * paragraphes/runs de `word/document.xml`, permet d'éditer le TEXTE inline
 * sans jamais toucher aux propriétés de formatage (`<w:rPr>` = police, gras,
 * taille, couleur), puis resérialise le tout en DOCX valide.
 *
 * ⚠ Design volontairement minimal pour l'étape A du refactor humanizer :
 *  - on ne touche PAS aux autres XML du zip (styles, numbering, images…)
 *  - les paragraphes vides, sauts de section et tables sont conservés tels
 *    quels dans le DOM (donc dans le fichier final), mais N'apparaissent pas
 *    dans la liste `paragraphs` (rien à humaniser dedans).
 *  - la redistribution multi-run est PROPORTIONNELLE à la longueur des runs
 *    d'origine. Fonctionne bien pour les cas "run bold isolé au milieu d'une
 *    phrase" mais peut donner des résultats étranges si un paragraphe très
 *    fragmenté (5+ runs) est réécrit par un LLM qui change la longueur totale.
 *    → à améliorer étape B (map spans avec alignement sémantique).
 */

import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// ============================================================================
// TYPES
// ============================================================================

export interface RunNode {
  /** Index du run dans son paragraphe (0-based). */
  index: number;
  /** Contenu texte concaténé (tous les <w:t> du run, jointure avec \n pour <w:br/>, \t pour <w:tab/>). */
  text: string;
  /** Le nœud <w:rPr> preserved as-is (ou null si aucune propriété). */
  props: Element | null;
  /** Le nœud XML <w:r> brut. */
  xmlNode: Element;
  /** Les nœuds <w:t> à l'intérieur du run — pour re-écrire sans toucher aux <w:br/> / <w:tab/>. */
  textNodes: Element[];
}

export interface ParagraphNode {
  /** Index du paragraphe parmi TOUS les <w:p> direct-children de <w:body>, empty ou non. */
  index: number;
  /** Texte concaténé de tous les runs du paragraphe. */
  text: string;
  /** Runs <w:r> qui composent le paragraphe. */
  runs: RunNode[];
  /** Le nœud XML <w:p> brut. */
  xmlNode: Element;
}

export interface ParsedDocx {
  /** Paragraphes NON-VIDES du corps principal (dans l'ordre). */
  paragraphs: ParagraphNode[];
  /** Le zip complet (avec word/document.xml en mémoire, sera remplacé au serialize). */
  zip: JSZip;
  /** Le XML source de word/document.xml (avant modifications). */
  documentXml: string;
  /** Le DOM parsé et modifiable de word/document.xml. */
  documentDom: Document;
}

// ============================================================================
// PARSE
// ============================================================================

/**
 * Ouvre un buffer .docx et renvoie la structure éditable.
 * Ne modifie rien : le zip et le DOM sont chargés en mémoire, prêts à être
 * mutés via updateParagraphText puis re-sérialisés via serializeDocx.
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocx> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("DOCX invalide : word/document.xml introuvable dans le zip.");
  }
  const documentXml = await docFile.async("string");
  const documentDom = new DOMParser().parseFromString(
    documentXml,
    "application/xml"
  );

  const bodyList = documentDom.getElementsByTagName("w:body");
  const body = bodyList.item(0);
  if (!body) {
    throw new Error("DOCX invalide : <w:body> introuvable dans document.xml.");
  }

  const paragraphs: ParagraphNode[] = [];
  let pOrderIdx = 0;

  for (let i = 0; i < body.childNodes.length; i++) {
    const child = body.childNodes.item(i);
    if (!child || child.nodeType !== 1) continue; // ELEMENT_NODE
    const el = child as unknown as Element;
    if (el.tagName !== "w:p") continue;

    const paragraphIndex = pOrderIdx++;
    const runs = extractRuns(el);
    const paragraphText = runs.map((r) => r.text).join("");

    // Skip empty paragraphs (they stay in the DOM & final file, but nothing
    // to humanize inside).
    if (paragraphText.trim().length === 0) continue;

    paragraphs.push({
      index: paragraphIndex,
      text: paragraphText,
      runs,
      xmlNode: el,
    });
  }

  return { paragraphs, zip, documentXml, documentDom };
}

/**
 * Récupère les runs <w:r> DIRECTS d'un paragraphe.
 * Note : on inclut aussi les runs à l'intérieur de <w:hyperlink> (via
 * getElementsByTagName) pour ne pas manquer le texte des liens. Limitation :
 * si un lien est réécrit, son URL est indépendante (dans relationships) et
 * reste valide, mais le texte visible du lien pourrait être remplacé par
 * du texte non-lié suite à redistribution proportionnelle.
 */
function extractRuns(paragraphEl: Element): RunNode[] {
  const runs: RunNode[] = [];
  const runList = paragraphEl.getElementsByTagName("w:r");

  for (let r = 0; r < runList.length; r++) {
    const runEl = runList.item(r);
    if (!runEl) continue;

    // <w:rPr> = properties. On les LAISSE INTACTES.
    const rPrList = runEl.getElementsByTagName("w:rPr");
    let props: Element | null = null;
    // On ne prend que le <w:rPr> DIRECT-child (pas ceux imbriqués via un
    // éventuel nested run — pas de nested run en pratique, mais safety belt).
    for (let p = 0; p < rPrList.length; p++) {
      const cand = rPrList.item(p);
      if (cand && cand.parentNode === runEl) {
        props = cand as unknown as Element;
        break;
      }
    }

    const textNodes: Element[] = [];
    let text = "";
    for (let c = 0; c < runEl.childNodes.length; c++) {
      const ch = runEl.childNodes.item(c);
      if (!ch || ch.nodeType !== 1) continue;
      const chEl = ch as unknown as Element;
      if (chEl.tagName === "w:t") {
        textNodes.push(chEl);
        text += chEl.textContent ?? "";
      } else if (chEl.tagName === "w:br") {
        text += "\n";
      } else if (chEl.tagName === "w:tab") {
        text += "\t";
      }
      // On ignore les autres (w:drawing, w:noBreakHyphen, w:sym, w:footnoteReference, etc.)
      // pour l'extraction texte, mais ils restent dans le DOM.
    }

    runs.push({
      index: r,
      text,
      props,
      xmlNode: runEl as unknown as Element,
      textNodes,
    });
  }

  return runs;
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Met à jour le texte d'un paragraphe en préservant les propriétés de
 * formatage de chaque run.
 *
 * Stratégie :
 *  - 1 seul run → on écrit directement dans son 1er <w:t> (les <w:t>
 *    suivants du même run sont vidés mais leurs frères <w:br/> restent).
 *  - N runs → redistribution PROPORTIONNELLE à la longueur d'origine.
 *    Le dernier run récupère le reste pour éviter les pertes d'arrondi.
 *
 * ⚠ Limitation : si un run n'a AUCUN <w:t> (ex : run purement <w:br/>),
 * il est ignoré (aucun texte à lui donner) — son <w:br/> reste dans le DOM.
 */
export function updateParagraphText(
  paragraph: ParagraphNode,
  newText: string
): void {
  const runs = paragraph.runs;
  if (runs.length === 0) return;

  // Runs sans <w:t> : réservés pour <w:br/> etc., on les ignore côté texte.
  const writableRuns = runs.filter((r) => r.textNodes.length > 0);
  if (writableRuns.length === 0) return;

  // Fast path : un seul run writable
  if (writableRuns.length === 1) {
    writeRun(writableRuns[0], newText);
    paragraph.text = runs.map((r) => r.text).join("");
    return;
  }

  const totalOriginalLen = writableRuns.reduce(
    (sum, r) => sum + r.text.length,
    0
  );
  if (totalOriginalLen === 0) {
    // Tous vides : on met tout le texte dans le premier writable run.
    writeRun(writableRuns[0], newText);
    for (let i = 1; i < writableRuns.length; i++) writeRun(writableRuns[i], "");
    paragraph.text = runs.map((r) => r.text).join("");
    return;
  }

  // Write everything to the first writable run and clear the rest.
  // Proportional splits across runs break words mid-run when the new text
  // length differs from the original, causing torn formatting in Word.
  writeRun(writableRuns[0], newText);
  for (let i = 1; i < writableRuns.length; i++) writeRun(writableRuns[i], "");

  paragraph.text = runs.map((r) => r.text).join("");
}

/**
 * Écrit `text` dans le 1er <w:t> du run et vide les autres <w:t>.
 * Préserve <w:br/>, <w:tab/>, et bien sûr <w:rPr>.
 */
function writeRun(run: RunNode, text: string): void {
  if (run.textNodes.length === 0) {
    run.text = "";
    return;
  }
  setTextNodeContent(run.textNodes[0], text);
  for (let i = 1; i < run.textNodes.length; i++) {
    setTextNodeContent(run.textNodes[i], "");
  }
  run.text = text;
}

function setTextNodeContent(el: Element, text: string): void {
  // Vider les enfants existants
  while (el.firstChild) el.removeChild(el.firstChild);
  const doc = el.ownerDocument;
  if (!doc) return;
  el.appendChild(doc.createTextNode(text));
  // Préserver espaces début/fin — sinon Word les collapse.
  if (text.length > 0 && (text !== text.trim() || text.includes("  "))) {
    el.setAttribute("xml:space", "preserve");
  }
}

// ============================================================================
// SERIALIZE
// ============================================================================

/**
 * Sérialise le DOM modifié + le zip en Buffer .docx prêt à écrire sur disque
 * ou renvoyer via une Response.
 *
 * Les autres fichiers du zip (styles.xml, media, header, footer, numbering…)
 * sont conservés intacts.
 */
export async function serializeDocx(parsed: {
  zip: JSZip;
  documentDom: Document;
}): Promise<Buffer> {
  const serializer = new XMLSerializer();
  let newXml = serializer.serializeToString(parsed.documentDom);
  // Word veut la déclaration XML en tête. xmldom la retire souvent.
  if (!newXml.startsWith("<?xml")) {
    newXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${newXml}`;
  }
  parsed.zip.file("word/document.xml", newXml);
  const out = await parsed.zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    // mimeType important pour la reconnaissance système
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return out;
}
