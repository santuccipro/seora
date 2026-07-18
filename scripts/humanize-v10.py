#!/usr/bin/env python3
"""
humanize-v10.py — Workflow humanisation + rehaussement visuel
- Extraction directe PyMuPDF (pas de pdf2docx)
- Reconstruction HTML/CSS professionnel → Chrome headless
- Tableaux stylés, typographie hiérarchisée, couleurs pro
- Garde-fou final : score, pages, tableaux

Usage:
  python3 humanize-v10.py input.pdf [--output out.pdf] [--threshold 25] [--lang fr]
"""

import sys, os, json, re, time, argparse, subprocess, tempfile, html as html_lib
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── Config ──────────────────────────────────────────────────────────────────

def load_env():
    env = {}
    paths = [
        "/tmp/seora-env.tmp",
        os.path.expanduser("~/.seora-env"),
        "/Users/sxmoption/orsu-tools/seora-detector/.env",
    ]
    for path in paths:
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        env[k.strip()] = v.strip().strip('"\'')
        except FileNotFoundError:
            pass
    return env

ENV = load_env()
DETECTOR_URL   = ENV.get("SEORA_DETECTOR_URL",  "https://detector.tryseora.com")
DETECTOR_TOKEN = ENV.get("SEORA_DETECTOR_TOKEN", "")

TARGET_SCORE   = 15.0
CHUNK_SIZE     = 30000
MIN_PARA_LEN   = 50
BATCH_SIZE     = 12
WORKERS        = 4
CLAUDE_TIMEOUT = 120
MAX_RETRIES    = 2

CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
]

DIRECT_FIXES = [
    (r" — ", ", "), (r"— ", ", "), (r" —", ","), (r"–", "-"),
    (r"«\s*", '"'), (r"\s*»", '"'),
    (r"\bEn outre,?\s*", "Et "), (r"\bPar ailleurs,?\s*", "Aussi, "),
    (r"\bIl convient de noter que\b", "Notons que"),
    (r"\bDans ce contexte,?\s*", "Ainsi "),
    (r"\bDe plus,?\s*", "Aussi, "), (r"\bEn effet,?\s*", ""),
    (r"\bNéanmoins,?\s*", "Mais "), (r"\bCependant,?\s*", "Mais "),
    (r"\bToutefois,?\s*", "Mais "), (r"\bEn conclusion,?\s*", "Pour finir, "),
    (r"\bPour conclure,?\s*", "Pour finir, "), (r"\bEn résumé,?\s*", "Bref, "),
    (r"\bAinsi,?\s*", "Du coup, "),
    (r"\bde plus\b", "aussi"), (r"\bpar ailleurs\b", "aussi"),
    (r"\ben outre\b", "et"), (r"\bainsi que\b", "et"),
    (r"\bnéanmoins\b", "mais"), (r"\bcependant\b", "mais"),
    (r"\btoutefois\b", "mais"), (r"\ben effet\b", ""),
    (r"\bà travers\b", "via"), (r"\bau regard de\b", "selon"),
    (r"\bdans le cadre de\b", "dans"),
    (r"\bconstitue\b", "est"), (r"\bconstituent\b", "sont"),
    (r"\bs'avère\b", "est"), (r"\bs'avèrent\b", "sont"),
    (r"\bpermet de\b", "aide à"), (r"\bpermettent de\b", "aident à"),
    (r"\bcontribue à\b", "aide à"),
]

# ─── Extraction structurée PyMuPDF ───────────────────────────────────────────

def classify_block(block, font_sizes_sorted):
    """Classifie un bloc texte en heading/body/caption selon taille de police."""
    spans = []
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            spans.append(span)
    if not spans:
        return "body", False, 11.0

    sizes = [s.get("size", 11) for s in spans]
    max_size = max(sizes)
    avg_size = sum(sizes) / len(sizes)
    is_bold = any(s.get("flags", 0) & 2**4 for s in spans)  # bit 4 = bold

    if max_size > 15:
        return "h1", is_bold, max_size
    elif max_size >= 13:
        return "h2", is_bold, max_size
    elif max_size >= 11.5 and is_bold:
        return "h3", is_bold, max_size
    elif avg_size < 9.5:
        return "caption", is_bold, avg_size
    else:
        return "body", is_bold, avg_size

def extract_block_text(block):
    parts = []
    for line in block.get("lines", []):
        line_text = "".join(s.get("text", "") for s in line.get("spans", []))
        parts.append(line_text)
    return " ".join(parts).strip()

def try_find_tables(page):
    """Utilise PyMuPDF find_tables() si disponible (>= 1.23)."""
    try:
        tabs = page.find_tables()
        return tabs.tables if hasattr(tabs, 'tables') else list(tabs)
    except AttributeError:
        return []

def extract_structured_content(pdf_path):
    """
    Retourne liste de dicts :
      {"type": "h1"|"h2"|"h3"|"body"|"caption"|"table", "text": str, "data": [[cells]]}
    """
    import fitz
    doc = fitz.open(pdf_path)
    content = []
    original_pages = doc.page_count

    for page_num in range(doc.page_count):
        page = doc[page_num]

        # Détecter les rectangles couverts par des tableaux
        table_rects = []
        page_tables = try_find_tables(page)
        for tab in page_tables:
            try:
                rect = tab.bbox if hasattr(tab, 'bbox') else None
                if rect:
                    table_rects.append(fitz.Rect(rect))
                    # Extraire données tableau
                    rows = tab.extract()
                    if rows:
                        content.append({"type": "table", "text": "", "data": rows})
            except Exception:
                pass

        # Extraire les blocs texte hors tableaux
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE).get("blocks", [])
        for block in blocks:
            if block.get("type") != 0:  # 0 = text
                continue
            block_rect = fitz.Rect(block["bbox"])
            # Skip si dans un tableau
            if any(block_rect.intersects(tr) for tr in table_rects):
                continue
            text = extract_block_text(block)
            if not text.strip():
                continue
            btype, is_bold, size = classify_block(block, [])
            content.append({"type": btype, "text": text, "data": None, "size": size})

    doc.close()
    return content, original_pages

# ─── Nettoyage direct ────────────────────────────────────────────────────────

def apply_direct_fixes(text):
    for pat, repl in DIRECT_FIXES:
        text = re.sub(pat, repl, text, flags=re.IGNORECASE)
    text = re.sub(r"[​‌‍­﻿⁠]", "", text)
    text = re.sub(r";([a-zA-ZÀ-ÿ])", r"; \1", text)
    text = re.sub(r"  +", " ", text)
    text = re.sub(r" ,", ",", text)
    return text.strip()

def clean_content(content):
    for item in content:
        if item["type"] in ("h1", "h2", "h3", "body", "caption"):
            item["text"] = apply_direct_fixes(item["text"])
        elif item["type"] == "table" and item["data"]:
            item["data"] = [
                [apply_direct_fixes(cell) if cell else "" for cell in row]
                for row in item["data"]
            ]
    return content

# ─── Detector ────────────────────────────────────────────────────────────────

def _detect_chunk(text, lang, fast_mode):
    payload = json.dumps({"text": text, "language": lang, "fast_mode": fast_mode}).encode()
    headers = {"Content-Type": "application/json"}
    if DETECTOR_TOKEN:
        headers["Authorization"] = f"Bearer {DETECTOR_TOKEN}"
    req = urllib.request.Request(
        f"{DETECTOR_URL}/detect", data=payload, headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def detect(text, lang, fast_mode, label=""):
    chunks, pos = [], 0
    while pos < len(text):
        end = min(pos + CHUNK_SIZE, len(text))
        if end < len(text):
            split = text.rfind("\n", pos + int(CHUNK_SIZE * 0.8), end)
            end = split if split > pos else end
        chunks.append(text[pos:end])
        pos = end + 1
    chunks = [c for c in chunks if c.strip()]

    pfx = f"[{label}] " if label else ""
    chunk_results = []
    for i, chunk in enumerate(chunks):
        for attempt in range(3):
            try:
                r = _detect_chunk(chunk, lang, fast_mode)
                chunk_results.append((chunk, r))
                print(f"  {pfx}chunk {i+1}/{len(chunks)} → {r.get('score_global', 0):.1f}%")
                break
            except Exception as e:
                if attempt < 2:
                    time.sleep(8)
                else:
                    print(f"  {pfx}chunk {i+1} FAIL: {e}")
                    chunk_results.append((chunk, {"score_global": 50, "zones": [], "signals": {}}))

    total = sum(len(c) for c, _ in chunk_results) or 1
    score = sum(r.get("score_global", 0) * len(c) / total for c, r in chunk_results)
    signals = {}
    for _, r in chunk_results:
        for k, v in (r.get("signals") or {}).items():
            if isinstance(v, (int, float)):
                signals[k] = max(signals.get(k, 0), v)
    zones = []
    for _, r in chunk_results:
        zones.extend(r.get("zones") or [])

    return {"score_global": round(score, 1), "signals": signals,
            "zones": zones, "chunk_results": chunk_results}

def get_text_items(content):
    """Retourne liste (idx_in_content, text) pour items textuels."""
    result = []
    for i, item in enumerate(content):
        if item["type"] in ("body", "caption") and len(item["text"]) >= MIN_PARA_LEN:
            result.append((i, item["text"]))
    return result

def find_ai_items(text_items, chunk_results, threshold):
    """Retourne set d'indices dans content[] à humaniser."""
    offsets, pos = [], 0
    for _, txt in text_items:
        offsets.append(pos)
        pos += len(txt) + 1

    high, chunk_pos = set(), 0
    for chunk_text, result in chunk_results:
        chunk_end = chunk_pos + len(chunk_text)
        if result.get("score_global", 0) > threshold:
            for j, (pstart, (_, txt)) in enumerate(zip(offsets, text_items)):
                if pstart < chunk_end and (pstart + len(txt)) > chunk_pos:
                    high.add(j)
        chunk_pos = chunk_end + 1
    return high

# ─── Prompt builder ──────────────────────────────────────────────────────────

def build_signals_prompt(signals):
    def sig(k, d=0):
        v = signals.get(k, d)
        return v if isinstance(v, (int, float)) else d

    rules = [
        "• PAS de tirets longs (—), PAS de guillemets typographiques (« »)",
        "• PAS de connecteurs IA : 'de plus', 'par ailleurs', 'ainsi', 'en outre', 'néanmoins'",
        "• PAS de listes de 3 éléments — utilise 2 ou reformule en prose",
    ]
    if sig("near_zero_typos_score") > 30:
        rules.append("• AJOUTE des marqueurs oraux : 'En fait,', 'Bref,', 'Concrètement,'")
    if sig("human_markers", 10) < 8:
        rules.append("• Commence 2-3 phrases par 'Je', 'Mon', 'Pour moi'")
    if sig("burstiness", 1.0) < 0.7:
        rules.append("• VARIE la longueur : mélange phrases courtes (8-12 mots) et longues (20-25 mots)")
    if sig("sentence_length_mean") > 28:
        rules.append("• COUPE les phrases > 30 mots en 2")
    if sig("semantic_classifier_score") > 30:
        rules.append("• STYLE trop formel — commence par 'Je' ou un fait concret vécu")
    return "\n".join(rules)

# ─── LLM rewriter ────────────────────────────────────────────────────────────

def rewrite_batch(paragraphs, signals_prompt, lang, offset=0):
    numbered = "\n\n".join(f"[{offset+i+1}]\n{p}" for i, p in enumerate(paragraphs))
    prompt = f"""Réécris ces {len(paragraphs)} passages en {lang} pour qu'ils sonnent écrits par un étudiant en alternance (DPP Master Gestion de Patrimoine).

RÈGLES (toutes obligatoires) :
{signals_prompt}

CONTRAINTES ABSOLUES :
• Conserve EXACTEMENT les faits, chiffres, noms propres, dates, références
• Une seule ligne par passage (pas de \\n)
• UNIQUEMENT le JSON array en réponse, rien d'autre

FORMAT : [{{"i": 1, "t": "texte réécrit"}}, ...]

{numbered}"""

    for attempt in range(MAX_RETRIES + 1):
        try:
            r = subprocess.run(
                ["claude", "--print", "--model", "claude-sonnet-4-6"],
                input=prompt, capture_output=True, text=True, timeout=CLAUDE_TIMEOUT
            )
            m = re.search(r'\[\s*\{.*?\}\s*\]', r.stdout.strip(), re.DOTALL)
            if not m:
                if attempt < MAX_RETRIES:
                    time.sleep(5)
                    continue
                return list(paragraphs)
            items = json.loads(m.group(0))
            result = list(paragraphs)
            for item in items:
                idx = item.get("i", 0) - offset - 1
                t = item.get("t", "")
                if 0 <= idx < len(result) and t and len(t) > 5:
                    t = t.replace(" — ", ", ").replace("— ", ", ").replace(" —", ",")
                    result[idx] = t.replace("\n\n", " ").replace("\n", " ").strip()
            return result
        except subprocess.TimeoutExpired:
            if attempt < MAX_RETRIES:
                continue
            return list(paragraphs)
        except Exception:
            if attempt < MAX_RETRIES:
                time.sleep(5)
                continue
            return list(paragraphs)
    return list(paragraphs)

def humanize_content(content, target_jdx, signals_prompt, lang):
    """target_jdx = indices dans text_items list."""
    text_items = get_text_items(content)
    if not target_jdx:
        return content

    texts = [text_items[j][1] for j in target_jdx]
    batches = [(off, texts[off:off+BATCH_SIZE]) for off in range(0, len(texts), BATCH_SIZE)]
    n_workers = min(WORKERS, len(batches))
    print(f"  {len(batches)} batch(es), {n_workers} workers, {len(texts)} items")

    rewrites = list(texts)
    with ThreadPoolExecutor(max_workers=n_workers) as ex:
        futures = {
            ex.submit(rewrite_batch, batch, signals_prompt, lang, off): (off, len(batch))
            for off, batch in batches
        }
        for fut in as_completed(futures):
            off, blen = futures[fut]
            res = fut.result()
            changed = sum(1 for k in range(blen) if res[k] != texts[off+k])
            for k, rw in enumerate(res):
                rewrites[off+k] = rw
            print(f"  [{off}..{off+blen-1}] ✓ {changed}/{blen} modifiés")

    for j_pos, j in enumerate(target_jdx):
        content_idx = text_items[j][0]
        new_t = rewrites[j_pos]
        if new_t and len(new_t) > 5:
            content[content_idx]["text"] = new_t
    return content

# ─── HTML builder ────────────────────────────────────────────────────────────

CSS = """
@charset "UTF-8";
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #000000;
    background: white;
}

.content-wrapper {
    width: 165mm;
    margin: 0 auto;
    padding: 25mm 0 20mm 0;
}

h1 {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 13pt;
    font-weight: 700;
    color: #000000;
    margin-top: 32px;
    margin-bottom: 10px;
    page-break-before: always;
    page-break-after: avoid;
}

h2 {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #000000;
    margin-top: 24px;
    margin-bottom: 8px;
    page-break-after: avoid;
}

h3 {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11pt;
    font-weight: 600;
    color: #000000;
    font-style: italic;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
}

p {
    margin: 8px 0;
    text-align: justify;
    hyphens: auto;
    -webkit-hyphens: auto;
}

p.caption {
    font-size: 9.5pt;
    font-style: italic;
    color: #333;
    margin: 5px 0 12px 0;
    text-align: center;
}

p.source {
    font-size: 9.5pt;
    font-style: italic;
    color: #333;
    margin: 5px 0;
}

.table-wrapper {
    margin: 14px 0 18px 0;
    overflow-x: auto;
    page-break-inside: avoid;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    font-family: 'Arial', 'Helvetica', sans-serif;
}

thead tr {
    background-color: #f0f0f0;
    color: #000000;
}

thead th {
    padding: 7px 10px;
    text-align: left;
    font-weight: 700;
    border: 1px solid #999999;
    line-height: 1.4;
}

tbody tr:nth-child(even) {
    background-color: #fafafa;
}

tbody tr:nth-child(odd) {
    background-color: #ffffff;
}

tbody td {
    padding: 5px 10px;
    border: 1px solid #aaaaaa;
    vertical-align: top;
    line-height: 1.5;
}

@media print {
    @page {
        size: A4;
        margin: 25mm 20mm 20mm 25mm;
    }
    body { background: white; }
    .content-wrapper { padding: 0; }
    .table-wrapper { page-break-inside: avoid; }
    h1, h2, h3 { page-break-after: avoid; }
}
"""

def escape(text):
    return html_lib.escape(str(text) if text else "")

def is_header_row(row):
    """Heuristique : première ligne = en-tête si courte et pas de vide."""
    return all(cell and len(cell.strip()) < 60 for cell in row if cell)

def build_table_html(data):
    if not data or not data[0]:
        return ""
    rows_html = []
    header = data[0]
    body_rows = data[1:]

    thead = "<thead><tr>" + "".join(
        f"<th>{escape(cell)}</th>" for cell in header
    ) + "</tr></thead>"

    tbody_rows = []
    for row in body_rows:
        if not any(cell and cell.strip() for cell in row):
            continue
        cells = "".join(f"<td>{escape(cell)}</td>" for cell in row)
        tbody_rows.append(f"<tr>{cells}</tr>")

    if not tbody_rows:
        return ""

    tbody = "<tbody>" + "\n".join(tbody_rows) + "</tbody>"
    return f'<div class="table-wrapper"><table>{thead}{tbody}</table></div>'

def content_to_html(content):
    parts = []
    for item in content:
        t = item["type"]
        txt = item.get("text", "").strip()

        if t == "h1" and txt:
            parts.append(f"<h1>{escape(txt)}</h1>")
        elif t == "h2" and txt:
            parts.append(f"<h2>{escape(txt)}</h2>")
        elif t == "h3" and txt:
            parts.append(f"<h3>{escape(txt)}</h3>")
        elif t == "body" and txt:
            # Détecter source/citation
            if re.match(r"^(source|sources)\s*[:·]", txt, re.IGNORECASE):
                parts.append(f'<p class="source">{escape(txt)}</p>')
            else:
                parts.append(f"<p>{escape(txt)}</p>")
        elif t == "caption" and txt:
            parts.append(f'<p class="caption">{escape(txt)}</p>')
        elif t == "table" and item.get("data"):
            thtml = build_table_html(item["data"])
            if thtml:
                parts.append(thtml)

    inner = "\n".join(parts)
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
{CSS}
</style>
</head>
<body>
<div class="content-wrapper">
{inner}
</div>
</body>
</html>"""

# ─── PDF generation ──────────────────────────────────────────────────────────

def html_to_pdf(html_content, pdf_path):
    chrome = next((p for p in CHROME_PATHS if os.path.exists(p)), None)
    if not chrome:
        print("  ERREUR : Chrome introuvable")
        return False

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as f:
        f.write(html_content)
        html_file = f.name

    try:
        subprocess.run(
            [
                chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
                f"--print-to-pdf={pdf_path}",
                "--print-to-pdf-no-header",
                "--no-pdf-header-footer",
                f"file://{html_file}",
            ],
            capture_output=True, timeout=90
        )
        return os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000
    except Exception as e:
        print(f"  Chrome error: {e}")
        return False
    finally:
        try:
            os.unlink(html_file)
        except Exception:
            pass

# ─── Garde-fou ───────────────────────────────────────────────────────────────

def count_pdf_pages(pdf_path):
    try:
        import fitz
        doc = fitz.open(pdf_path)
        n = doc.page_count
        doc.close()
        return n
    except Exception:
        return None

def run_guardrail(pdf_path, content, original_pages, lang, threshold=TARGET_SCORE):
    import fitz
    print(f"\n[GARDE-FOU] Vérifications finales...")
    checks = []

    # 1. Nombre de pages
    final_pages = count_pdf_pages(pdf_path)
    min_pages = max(1, int(original_pages * 0.7))
    pages_ok = final_pages is not None and final_pages >= min_pages
    checks.append(("Pages", pages_ok,
                   f"{final_pages}/{original_pages} pages ({'OK' if pages_ok else f'< {min_pages} attendu'})"))

    # 2. Tableaux présents si originaux avaient des tableaux
    orig_tables = sum(1 for item in content if item["type"] == "table")
    if orig_tables > 0:
        try:
            doc = fitz.open(pdf_path)
            pdf_tables = sum(len(try_find_tables(doc[i])) for i in range(doc.page_count))
            doc.close()
        except Exception:
            pdf_tables = 0
        tables_ok = pdf_tables > 0
        checks.append(("Tableaux", tables_ok,
                       f"{pdf_tables} tableaux PDF / {orig_tables} dans la source"))
    else:
        checks.append(("Tableaux", True, "Aucun tableau attendu"))

    # 3. Score Seora
    text_items = get_text_items(content)
    full_text = "\n".join(t for _, t in text_items)
    slow_result = detect(full_text, lang, fast_mode=False, label="guard")
    score = slow_result["score_global"]
    score_ok = score <= threshold
    checks.append(("Score Seora", score_ok, f"{score:.1f}% ({'✅' if score_ok else '❌ > ' + str(threshold) + '%'})"))

    print(f"\n  Rapport garde-fou :")
    all_ok = True
    for name, ok, detail in checks:
        emoji = "✅" if ok else "❌"
        print(f"  {emoji} {name} : {detail}")
        if not ok:
            all_ok = False

    return all_ok, score, slow_result

# ─── Full text helper ────────────────────────────────────────────────────────

def content_full_text(content):
    parts = []
    for item in content:
        if item["type"] in ("h1", "h2", "h3", "body", "caption"):
            parts.append(item["text"])
        elif item["type"] == "table" and item["data"]:
            for row in item["data"]:
                parts.append(" | ".join(cell for cell in row if cell))
    return "\n".join(parts)

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="humanize-v10 — humanisation + rehaussement visuel")
    parser.add_argument("input", help="Fichier PDF source")
    parser.add_argument("--lang", default="fr")
    parser.add_argument("--threshold", type=float, default=25.0)
    parser.add_argument("--output", help="Chemin PDF de sortie (optionnel)")
    args = parser.parse_args()

    if not args.input.lower().endswith(".pdf"):
        print("ERREUR : humanize-v10 accepte uniquement des PDF en entrée")
        sys.exit(1)

    if not DETECTOR_TOKEN:
        print("ERREUR : SEORA_DETECTOR_TOKEN manquant. Créer /tmp/seora-env.tmp avec le token.")
        sys.exit(1)

    t0 = time.time()
    base = os.path.splitext(args.input)[0]
    out_path = args.output or f"{base}_humanise_v10.pdf"

    print(f"\n{'='*60}")
    print(f"  humanize-v10 | {os.path.basename(args.input)}")
    print(f"  Seuil: {args.threshold}% | Langue: {args.lang}")
    print(f"{'='*60}")

    # 1. Extraction structurée
    print(f"\n[1/6] Extraction structurée (PyMuPDF)...")
    content, original_pages = extract_structured_content(args.input)
    text_items = get_text_items(content)
    n_tables = sum(1 for item in content if item["type"] == "table")
    print(f"  {len(content)} blocs | {len(text_items)} paragraphes corps | {n_tables} tableaux | {original_pages} pages source")

    # 2. Nettoyage direct
    print(f"\n[2/6] Nettoyage direct (sans LLM)...")
    before_texts = [item.get("text", "") for item in content]
    content = clean_content(content)
    n_fixed = sum(1 for a, b in zip(before_texts, [item.get("text", "") for item in content]) if a != b)
    print(f"  {n_fixed} blocs nettoyés")

    # 3. Fast detect
    print(f"\n[3/6] Fast detect...")
    t1 = time.time()
    text_items = get_text_items(content)
    full_text = "\n".join(t for _, t in text_items)
    fast_result = detect(full_text, args.lang, fast_mode=True, label="fast")
    fast_score = fast_result["score_global"]
    print(f"  Score fast : {fast_score:.1f}% ({time.time()-t1:.0f}s)")

    # 4. Humanisation LLM
    if fast_score <= TARGET_SCORE:
        print(f"\n[4/6] Déjà sous {TARGET_SCORE}% — humanisation ignorée")
        ai_jdx = set()
    else:
        effective_threshold = min(args.threshold, max(fast_score * 0.6, TARGET_SCORE))
        print(f"  Threshold effectif : {effective_threshold:.1f}%")
        ai_jdx = find_ai_items(text_items, fast_result["chunk_results"], effective_threshold)
        if not ai_jdx:
            ai_jdx = set(range(len(text_items)))
            print(f"  Aucune zone ciblée → humanise tous les paragraphes")
        signals_prompt = build_signals_prompt(fast_result.get("signals") or {})
        print(f"\n[4/6] Humanisation ciblée — {len(ai_jdx)}/{len(text_items)} paragraphes...")
        print(f"  Signaux:\n{signals_prompt}")
        t2 = time.time()
        content = humanize_content(content, sorted(ai_jdx), signals_prompt, args.lang)
        print(f"  Durée : {time.time()-t2:.0f}s")

    # Passe 2 si besoin
    text_items = get_text_items(content)
    full_text = "\n".join(t for _, t in text_items)
    slow_result = detect(full_text, args.lang, fast_mode=False, label="slow-p1")
    current_score = slow_result["score_global"]
    print(f"\n  Score après passe 1 : {current_score:.1f}%")

    if current_score > TARGET_SCORE:
        from_slow = find_ai_items(text_items, slow_result["chunk_results"], TARGET_SCORE + 5)
        if from_slow:
            print(f"\n  Passe 2 : {len(from_slow)} paragraphes slow-ciblés...")
            sp2 = build_signals_prompt(slow_result.get("signals") or {})
            content = humanize_content(content, sorted(from_slow), sp2, args.lang)
            text_items = get_text_items(content)
            full_text = "\n".join(t for _, t in text_items)

    # 5. Reconstruction HTML → PDF
    print(f"\n[5/6] Reconstruction HTML/CSS professionnel → PDF...")
    html_content = content_to_html(content)
    ok = html_to_pdf(html_content, out_path)
    if not ok:
        # Fallback : sauvegarder HTML
        html_fallback = out_path.replace(".pdf", ".html")
        with open(html_fallback, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"  PDF non généré → HTML sauvegardé : {html_fallback}")
        out_path = html_fallback
    else:
        print(f"  PDF généré : {out_path}")

    # 6. Garde-fou
    if out_path.endswith(".pdf"):
        all_ok, final_score, _ = run_guardrail(out_path, content, original_pages, args.lang)
    else:
        final_score = current_score
        all_ok = True

    dt = time.time() - t0
    status = "✅ OBJECTIF ATTEINT" if final_score <= TARGET_SCORE else f"⚠️  {final_score:.1f}% (plancher ~15% pour DPP académique)"

    print(f"\n{'='*60}")
    print(f"  Score FINAL : {final_score:.1f}%  {status}")
    print(f"  Durée       : {dt:.0f}s ({dt/60:.1f} min)")
    print(f"  Output      : {out_path}")
    print(f"{'='*60}\n")
    return out_path, final_score

if __name__ == "__main__":
    main()
