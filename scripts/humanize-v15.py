#!/usr/bin/env python3
"""
humanize-v14.py — Humanisation DIRECTEMENT dans le PDF via PyMuPDF.
- Pas de DOCX, pas d'HTML, pas de Chrome.
- Mise en page préservée à 100% : seul le texte IA change.
- v13 : strip invisible chars globalement, em-dashes + AI-vocab sur TOUS les blocs.
- v14 : normalisation homoglyphes cyrilliques/grecs → latin (Fix 6).
         Les DPP IA insèrent des chars cyrilliques (а,е,о,с) qui corrompaient
         le PDF de sortie (→ '?') et boostaient le score Seora homoglyph.

Usage:
  python3 humanize-v14.py input.pdf [--output out.pdf] [--threshold 25] [--lang fr]
"""

import sys, os, json, re, time, argparse, subprocess, difflib
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
MIN_BLOCK_LEN  = 50
BATCH_SIZE     = 25   # v15: bigger batches = fewer subprocess launches
WORKERS        = 4    # v15: 4 instead of 8 — avoids claude CLI contention/timeouts
CLAUDE_TIMEOUT = 200  # v15: more time per batch (bigger batches + less contention)
MAX_RETRIES    = 2

# Pattern chars invisibles (Fix 1 + Fix 4)
INVIS_RE = re.compile(
    r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f"
    r"​‌‍‎‏"
    r"‪‫‬‭‮"
    r"⁠⁡⁢⁣⁤"
    r"­﻿︀-️￾￿]"
)

# Fix 6 (v14): Homoglyphes cyrilliques/grecs → Latin
# Les DPP générés par IA insèrent des chars cyrilliques visuellement identiques aux latins
# pour tromper les détecteurs. PyMuPDF les extrait correctement mais Helvetica ne sait
# pas les encoder → '?' dans le PDF de sortie. On les remplace par leurs équivalents latins.
HOMOGLYPH_MAP = {
    # Cyrillique minuscule
    'а': 'a',  # а → a
    'е': 'e',  # е → e
    'о': 'o',  # о → o
    'с': 'c',  # с → c
    'р': 'p',  # р → p
    'у': 'y',  # у → y (rare)
    'х': 'x',  # х → x
    'і': 'i',  # і → i (Ukrainien)
    'ј': 'j',  # ј → j
    # Cyrillique majuscule
    'А': 'A',  # А → A
    'В': 'B',  # В → B
    'С': 'C',  # С → C
    'Е': 'E',  # Е → E
    'М': 'M',  # М → M
    'Н': 'H',  # Н → H
    'О': 'O',  # О → O
    'Р': 'P',  # Р → P
    'Т': 'T',  # Т → T
    'Х': 'X',  # Х → X
    'І': 'I',  # І → I
    'Ј': 'J',  # Ј → J
    # Grec
    'ο': 'o',  # ο (omicron) → o
    'α': 'a',  # α → a
    'ε': 'e',  # ε → e (rare)
    'Ο': 'O',  # Ο → O
    'Α': 'A',  # Α → A
    'Β': 'B',  # Β → B
    'Ε': 'E',  # Ε → E
    'Κ': 'K',  # Κ → K
    'Μ': 'M',  # Μ → M
    'Ν': 'N',  # Ν → N
    'Ρ': 'P',  # Ρ → P
    'Τ': 'T',  # Τ → T
    'Χ': 'X',  # Χ → X
    # Latin look-alikes hors Basic Latin
    'ɡ': 'g',  # ɡ → g
    'ɑ': 'a',  # ɑ → a
    'ɥ': 'h',  # ɥ → h (rare)
    # Guillemets/apostrophes typographiques → ASCII
    '\u2019': "'",   # RIGHT SINGLE QUOTATION MARK '
    '\u2018': "'",   # LEFT SINGLE QUOTATION MARK '
    '\u201c': '"',   # LEFT DOUBLE QUOTATION MARK "
    '\u201d': '"',   # RIGHT DOUBLE QUOTATION MARK "
    '\u2014': '-',   # EM DASH --
    '\u2013': '-',   # EN DASH -
    '\u00ab': '"',   # GUILLEMET GAUCHE <<
    '\u00bb': '"',   # GUILLEMET DROIT >>
    # Symboles hors WinAnsiEncoding de Helvetica
    '\u25cf': '-',      # BLACK CIRCLE bullet
    '\u25cb': '-',      # WHITE CIRCLE sub-bullet
    '\u25aa': '-',      # BLACK SMALL SQUARE
    '\u25ba': '>',      # BLACK RIGHT-POINTING POINTER
    '\u2022': '-',      # BULLET
    '\u20ac': 'euros',  # EURO SIGN
    '\u2122': '(TM)',   # TRADE MARK SIGN
    '\u00ae': '(R)',    # REGISTERED SIGN
    '\u2026': '...',    # HORIZONTAL ELLIPSIS
    '\u2003': ' ',      # EM SPACE
    '\u2002': ' ',      # EN SPACE
    '\u00a0': ' ',      # NON-BREAKING SPACE
    '\u200b': '',       # ZERO-WIDTH SPACE
}

def normalize_homoglyphs(text: str) -> str:
    """Remplace les homoglyphes cyrilliques/grecs par leurs équivalents ASCII latins."""
    if not any(c in HOMOGLYPH_MAP for c in text):
        return text
    return ''.join(HOMOGLYPH_MAP.get(c, c) for c in text)

# Patterns IA à corriger directement (sans LLM)
# Fix 2 : ajout des ai_favorite_hits + tripartite buster (Fix 5)
DIRECT_FIXES = [
    (r" — ", ", "), (r"— ", ", "), (r" —", ","), (r"–", "-"),
    (r"«\s*", '"'), (r"\s*»", '"'),
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
    (r"\bEn outre,?\s*", "Et "), (r"\bPar ailleurs,?\s*", "Aussi, "),
    (r"\bIl convient de noter que\b", "Notons que"),
    (r"\bDans ce contexte,?\s*", "Ainsi "),
    (r"\bDe plus,?\s*", "Aussi, "), (r"\bEn effet,?\s*", ""),
    (r"\bNéanmoins,?\s*", "Mais "), (r"\bCependant,?\s*", "Mais "),
    (r"\bToutefois,?\s*", "Mais "), (r"\bEn conclusion,?\s*", "Pour finir, "),
    (r"\bPour conclure,?\s*", "Pour finir, "), (r"\bEn résumé,?\s*", "Bref, "),
    (r"\bAinsi,?\s*", "Du coup, "),
    # Fix 2 : ai_favorite_hits de Seora
    (r"\bsignificatif\b", "important"), (r"\bsignificative\b", "importante"),
    (r"\bsignificatifs\b", "importants"), (r"\bsignificatives\b", "importantes"),
    (r"\bparticulièrement\b", "vraiment"),
    (r"\bd'une part\b", "d'abord"),
    (r"\breprésentent\b", "forment"), (r"\breprésentait\b", "était"),
    (r"\bsouligne\b", "montre"), (r"\bsoulignent\b", "montrent"),
    (r"\bfondamental\b", "essentiel"), (r"\bfondamentale\b", "essentielle"),
    (r"\bfondamentaux\b", "essentiels"), (r"\bfondamentales\b", "essentielles"),
    (r"\bnotamment\b", "par exemple"),
    (r"\ben premier lieu\b", "d'abord"),
    (r"\ben second lieu\b", "ensuite"),
    (r"\bà cet égard\b", "là-dessus"),
    (r"\bforce est de constater\b", "on voit bien"),
    (r"\bil importe de\b", "il faut"),
    (r"\bà l'instar de\b", "comme"),
    (r"\ben l'occurrence\b", "ici"),
    # Fix 5 : tripartite buster — casser "A, B et C" → "A et B"
    # Cible les listes de 3 groupes de mots entre virgules avant "et"
    (r",\s+(?:[^,]{2,30})\s+et\s+([^,.]{2,40})(\.)", r" et \1\2"),
]

SKIP_PREFIXES = (
    "source", "sources", "bibliographie", "références", "référence",
    "annexe", "annexes", "table des", "sommaire", "copyright", "©",
    "attestation", "déclaration anti-plagiat",
)

# Pages entières à ignorer : si un bloc-titre sur la page commence par l'un de ces préfixes,
# TOUTE la page est exclue du traitement LLM (remerciements, table des matières, etc.)
SKIP_WHOLE_PAGE_PREFIXES = (
    "remerciements", "remerciement",
    "table des matières", "table des", "sommaire",
    "bibliographie", "sources", "références", "référence",
    "annexe", "annexes", "attestation",
)

# ─── Text fixes ──────────────────────────────────────────────────────────────

def apply_direct_fixes(text: str) -> str:
    text = normalize_homoglyphs(text)
    for pat, repl in DIRECT_FIXES:
        text = re.sub(pat, repl, text, flags=re.IGNORECASE)
    text = INVIS_RE.sub("", text)
    text = re.sub(r";([a-zA-ZÀ-ÿ])", r"\1", text)
    text = re.sub(r"  +", " ", text)
    text = re.sub(r" ,", ",", text)
    return text.strip()

def should_skip(text: str) -> bool:
    tl = text.strip().lower()
    return any(tl.startswith(p) for p in SKIP_PREFIXES) or len(text.strip()) < MIN_BLOCK_LEN

# ─── PyMuPDF extraction ──────────────────────────────────────────────────────

def extract_text_blocks(pdf_path: str) -> list:
    import fitz
    doc = fitz.open(pdf_path)
    blocks = []
    for page_num, page in enumerate(doc):
        page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            lines = block.get("lines", [])
            if not lines:
                continue

            full_text = ""
            for line in lines:
                line_text = "".join(s.get("text", "") for s in line.get("spans", []))
                full_text += line_text + " "
            full_text = normalize_homoglyphs(full_text.strip())

            if not full_text or len(full_text) < 10:
                continue

            sizes = []
            for line in lines:
                for span in line.get("spans", []):
                    sizes.append(span.get("size", 11))
            font_size = max(set(sizes), key=sizes.count) if sizes else 11.0

            blocks.append({
                "page": page_num,
                "bbox": tuple(block["bbox"]),
                "text": full_text,
                "font_size": font_size,
                "lines": lines,
            })
    doc.close()
    return blocks

# ─── Detector ────────────────────────────────────────────────────────────────

def _detect_chunk(text: str, lang: str, fast_mode: bool) -> dict:
    payload = json.dumps({"text": text, "language": lang, "fast_mode": fast_mode}).encode()
    headers = {"Content-Type": "application/json"}
    if DETECTOR_TOKEN:
        headers["Authorization"] = f"Bearer {DETECTOR_TOKEN}"
    req = urllib.request.Request(
        f"{DETECTOR_URL}/detect", data=payload, headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def detect(text: str, lang: str, fast_mode: bool, label: str = "") -> dict:
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

    def _detect_with_retry(args):
        i, chunk = args
        for attempt in range(3):
            try:
                r = _detect_chunk(chunk, lang, fast_mode)
                print(f"  {pfx}chunk {i+1}/{len(chunks)} → {r.get('score_global', 0):.1f}%")
                return (i, chunk, r)
            except Exception as e:
                if attempt < 2:
                    time.sleep(8)
                else:
                    print(f"  {pfx}chunk {i+1} FAIL: {e}")
                    return (i, chunk, {"score_global": 50, "zones": [], "signals": {}})

    # v15: all Seora chunks in parallel
    with ThreadPoolExecutor(max_workers=len(chunks)) as ex:
        raw_results = list(ex.map(_detect_with_retry, enumerate(chunks)))
    raw_results.sort(key=lambda x: x[0])
    chunk_results = [(c, r) for _, c, r in raw_results]

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

def find_ai_blocks(blocks: list, chunk_results: list, threshold: float) -> set:
    texts = [b["text"] for b in blocks]
    offsets, pos = [], 0
    for t in texts:
        offsets.append(pos)
        pos += len(t) + 1

    high = set()
    chunk_pos = 0
    for chunk_text, result in chunk_results:
        chunk_end = chunk_pos + len(chunk_text)
        if result.get("score_global", 0) > threshold:
            for i, (pstart, t) in enumerate(zip(offsets, texts)):
                if len(t) >= MIN_BLOCK_LEN:
                    if pstart < chunk_end and (pstart + len(t)) > chunk_pos:
                        high.add(i)
        chunk_pos = chunk_end + 1
    return high

# ─── Prompt builder ──────────────────────────────────────────────────────────

def build_signals_prompt(signals: dict) -> str:
    def sig(k, d=0):
        v = signals.get(k, d)
        return v if isinstance(v, (int, float)) else d

    rules = [
        "• PAS de tirets longs (—), PAS de guillemets typographiques (« »)",
        "• PAS de connecteurs IA : 'de plus', 'par ailleurs', 'ainsi', 'en outre', 'néanmoins', 'à travers', 'constitue', 'traduit', 'en effet'",
        "• PAS de listes de 3 éléments (A, B et C) — utilise 2 ou reformule en prose",
        # Fix 3 : règles supplémentaires semantic_classifier + tripartite + POS
        "• REMPLACE toutes les structures 'A, B et C' par 'A et B' ou reformule en prose",
        "• AJOUTE des verbes d'action à la 1ère personne : 'j'ai géré', 'j'ai travaillé sur', 'j'ai découvert que', 'je me suis rendu compte que'",
        "• RÉDUIS les noms abstraits en faveur de verbes : 'la gestion de X' → 'gérer X', 'la mise en place de' → 'mettre en place'",
        "• Phrases de longueur variée : alterne 8 mots / 22 mots / 12 mots / 30 mots",
        "• EVITE absolument : significatif, particulièrement, d'une part, représente, souligne, fondamental, notamment, en premier lieu, en second lieu",
    ]
    if sig("near_zero_typos_score") > 30:
        rules.append("• AJOUTE des marqueurs oraux : 'En fait,', 'Bref,', 'Concrètement,', 'Du coup,'")
    if sig("human_markers", 10) < 8:
        rules.append("• Commence 2-3 phrases par 'Je', 'Mon', 'Pour moi'")
    if sig("burstiness", 1.0) < 0.7:
        rules.append("• VARIE la longueur : mélange phrases courtes (8-12 mots) et longues (20-25 mots)")
    if sig("sentence_length_mean") > 28:
        rules.append("• COUPE les phrases > 30 mots en 2")
    if sig("semantic_classifier_score") > 30:
        rules.append("• STYLE trop formel — commence par 'Je' ou un fait concret vécu")
    return "\n".join(rules)

# ─── LLM rewriter ─────────────────────────────────────────────────────────────

def _parse_llm_json(raw: str) -> list:
    try:
        items = json.loads(raw)
        if isinstance(items, list):
            return items
    except Exception:
        pass

    m = re.search(r'\[[\s\S]*\]', raw)
    if m:
        try:
            items = json.loads(m.group(0))
            if isinstance(items, list):
                return items
        except Exception:
            pass
        try:
            items = json.loads(m.group(0) + ']')
            if isinstance(items, list):
                return items
        except Exception:
            pass

    return []

def rewrite_batch(paragraphs: list, signals_prompt: str, lang: str, offset: int = 0) -> list:
    numbered = "\n\n".join(f"[{offset+i+1}]\n{p}" for i, p in enumerate(paragraphs))
    prompt = f"""ATTENTION : Tu DOIS réécrire CHAQUE passage de manière DIFFÉRENTE du texte original. Si tu retournes exactement le même texte qu'en entrée, c'est un ÉCHEC. Même si le texte te semble déjà correct, tu dois le réécrire avec tes propres mots, en changeant la structure des phrases.

Réécris ces {len(paragraphs)} passages en {lang} pour qu'ils sonnent écrits par un étudiant en alternance (DPP Master Gestion de Patrimoine).

RÈGLES (toutes obligatoires) :
{signals_prompt}

CONTRAINTES ABSOLUES :
• Conserve EXACTEMENT les faits, chiffres, noms propres, dates, références
• Une seule ligne par passage (pas de \\n)
• Texte récrit de longueur SIMILAIRE à l'original (±20% max)

RAPPEL : JSON uniquement, AUCUN texte autour. Commence directement par `[` et termine par `]`.

FORMAT : [{{"i": 1, "t": "texte réécrit"}}, ...]

{numbered}"""

    for attempt in range(MAX_RETRIES + 1):
        try:
            r = subprocess.run(
                ["claude", "--print", "--model", "claude-sonnet-4-6"],
                input=prompt, capture_output=True, text=True, timeout=CLAUDE_TIMEOUT
            )
            raw = r.stdout.strip()
            items = _parse_llm_json(raw)

            if not items:
                reason = f"parse JSON échoué (raw[:200]={raw[:200]!r})"
                if attempt < MAX_RETRIES:
                    print(f"  [retry {attempt+1}] {reason}")
                    time.sleep(5)
                    continue
                print(f"  [FAIL] {reason} — retour originaux")
                return list(paragraphs)

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
                print(f"  [retry {attempt+1}] timeout Claude")
                continue
            print(f"  [FAIL] timeout Claude — retour originaux")
            return list(paragraphs)
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"  [retry {attempt+1}] exception: {e}")
                time.sleep(5)
                continue
            print(f"  [FAIL] exception: {e} — retour originaux")
            return list(paragraphs)

    return list(paragraphs)

def humanize_blocks_targeted(blocks: list, target_idx: list, signals_prompt: str, lang: str) -> tuple:
    if not target_idx:
        return blocks, []

    texts = [blocks[i].get("new_text", blocks[i]["text"]) for i in target_idx]
    batches = [(off, texts[off:off+BATCH_SIZE]) for off in range(0, len(texts), BATCH_SIZE)]
    n_workers = min(WORKERS, len(batches))
    print(f"  {len(batches)} batch(es), {n_workers} workers, {len(texts)} blocs")

    rewrites = list(texts)
    with ThreadPoolExecutor(max_workers=n_workers) as ex:
        futures = {
            ex.submit(rewrite_batch, batch, signals_prompt, lang, off): (off, len(batch))
            for off, batch in batches
        }
        for fut in as_completed(futures):
            off, blen = futures[fut]
            res = fut.result()
            changed = sum(1 for j in range(blen) if res[j] != texts[off+j])
            for j, rw in enumerate(res):
                rewrites[off+j] = rw
            print(f"  [{off}..{off+blen-1}] ✓ {changed}/{blen} modifiés")

    result = [dict(b) for b in blocks]
    diff_log = []
    for j, i in enumerate(target_idx):
        new_t = rewrites[j]
        orig_t = blocks[i]["text"]
        src_t = blocks[i].get("new_text", orig_t)
        if new_t and new_t != src_t and len(new_t) > 5:
            ratio = len(new_t) / max(len(src_t), 1)
            if 0.5 <= ratio <= 1.8:
                result[i]["new_text"] = new_t
                diff_log.append({"page": blocks[i]["page"], "before": orig_t, "after": new_t})
            else:
                print(f"  Bloc {i} : ratio hors limites ({ratio:.1f}x), garde src_t")
                result[i]["new_text"] = src_t
        else:
            result[i]["new_text"] = src_t
    return result, diff_log

# ─── PDF in-place replacement ────────────────────────────────────────────────

def get_dominant_font(block: dict) -> str:
    fonts = {}
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            f = span.get("font", "")
            if f:
                fonts[f] = fonts.get(f, 0) + len(span.get("text", ""))
    if not fonts:
        return "helv"
    name = max(fonts, key=fonts.get)
    nl = name.lower()
    if "bold" in nl and ("italic" in nl or "oblique" in nl):
        return "hebi"
    elif "bold" in nl:
        return "hebo"
    elif "italic" in nl or "oblique" in nl:
        return "heit"
    return "helv"

def get_text_alignment(block: dict) -> int:
    x0, y0, x1, y1 = block["bbox"]
    width = x1 - x0
    if width < 200 and x0 > 100:
        return 1
    return 0

def _clean_text_for_pdf(text: str) -> str:
    """Strip invisible chars + homoglyphes + IA patterns from text before inserting into PDF."""
    text = normalize_homoglyphs(text)
    text = INVIS_RE.sub("", text)
    text = re.sub(r"[​‌‍­﻿⁠\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = re.sub(r"  +", " ", text)
    return text.strip()

def apply_replacements_to_pdf(pdf_path: str, blocks: list, output_path: str, skip_pages: set = None):
    """
    Remplace le texte in-place dans le PDF.
    Fix 1 (v13) : passe globale sur TOUS les blocs pour strip invisible chars + em-dashes.
    Fix 2 (v13) : DIRECT_FIXES appliqués globalement à tous les blocs >= 15 chars.
    """
    import fitz

    doc = fitz.open(pdf_path)

    # ── Fix 1+2 : passe globale sur tous les blocs (invisible chars + AI vocab) ──
    print(f"  [Fix1+2] Scan global invisible chars + AI vocab sur toutes les pages...")
    global_fixed = 0
    blocks_set = blocks  # référence pour éviter redoublement

    for page_num in range(doc.page_count):
        # v15: skip pages excluded from processing (remerciements, TdM, bibliographie…)
        if skip_pages and page_num in skip_pages:
            continue
        page = doc[page_num]
        page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        fix_list = []

        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            lines = block.get("lines", [])
            if not lines:
                continue
            full_text = ""
            for line in lines:
                full_text += "".join(s.get("text", "") for s in line.get("spans", []))
                full_text += " "
            full_text = full_text.strip()

            if len(full_text) < 15:
                continue

            # Check if it has invisible chars OR AI vocab
            has_invis = bool(INVIS_RE.search(full_text))
            cleaned = apply_direct_fixes(full_text) if has_invis or re.search(
                r"—|«|»|\bsignificatif\b|\bparticulièrement\b|\bnotamment\b|\bfondamental\b|\bsouligne\b",
                full_text, re.IGNORECASE
            ) else None

            if cleaned is not None and cleaned != full_text:
                fix_list.append((fitz.Rect(block["bbox"]), full_text, cleaned,
                                  block.get("lines", [])))

        # Apply fixes for this page
        for rect, orig, cleaned, blines in fix_list:
            # Get font size from first span
            font_size = 11.0
            fontname = "helv"
            for line in blines:
                for span in line.get("spans", []):
                    font_size = span.get("size", 11.0)
                    fname = span.get("font", "helv").lower()
                    if "bold" in fname and ("italic" in fname or "oblique" in fname):
                        fontname = "hebi"
                    elif "bold" in fname:
                        fontname = "hebo"
                    elif "italic" in fname or "oblique" in fname:
                        fontname = "heit"
                    break
                break

            rect_exp = rect + (-1, -1, 1, 1)
            page.add_redact_annot(rect_exp, fill=(1, 1, 1), text="")

        if fix_list:
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            for rect, orig, cleaned, blines in fix_list:
                font_size = 11.0
                fontname = "helv"
                align = 0
                for line in blines:
                    for span in line.get("spans", []):
                        font_size = span.get("size", 11.0)
                        fname = span.get("font", "helv").lower()
                        if "bold" in fname and ("italic" in fname or "oblique" in fname):
                            fontname = "hebi"
                        elif "bold" in fname:
                            fontname = "hebo"
                        elif "italic" in fname or "oblique" in fname:
                            fontname = "heit"
                        break
                    break
                x0, y0, x1, y1 = rect
                if (x1 - x0) < 200 and x0 > 100:
                    align = 1

                rc = page.insert_textbox(
                    rect, _clean_text_for_pdf(cleaned),
                    fontsize=font_size, fontname=fontname,
                    color=(0, 0, 0), align=align,
                )
                if rc < 0:
                    page.insert_textbox(
                        rect, _clean_text_for_pdf(cleaned),
                        fontsize=max(font_size - 0.5, 8.0),
                        fontname=fontname, color=(0, 0, 0), align=align,
                    )
            global_fixed += len(fix_list)
            try:
                page.clean_contents()
            except Exception:
                pass

    print(f"  [Fix1+2] {global_fixed} blocs nettoyés globalement")

    # ── Passe principale : blocs humanisés par LLM ──
    by_page = {}
    for b in blocks:
        new_t = b.get("new_text", b["text"])
        if new_t != b["text"]:
            p = b["page"]
            if p not in by_page:
                by_page[p] = []
            by_page[p].append(b)

    n_replaced = 0
    for page_num, page_blocks in by_page.items():
        page = doc[page_num]

        for b in page_blocks:
            rect = fitz.Rect(b["bbox"])
            rect_exp = rect + (-1, -1, 1, 1)
            page.add_redact_annot(rect_exp, fill=(1, 1, 1), text="")

        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

        for b in page_blocks:
            rect = fitz.Rect(b["bbox"])
            new_t = _clean_text_for_pdf(b.get("new_text", b["text"]))
            font_size = b.get("font_size", 11.0)
            fontname = get_dominant_font(b)
            align = get_text_alignment(b)

            rc = page.insert_textbox(
                rect, new_t,
                fontsize=font_size, fontname=fontname,
                color=(0, 0, 0), align=align,
            )
            n_replaced += 1
            if rc < 0:
                print(f"  ⚠️  Bloc p{page_num} : texte tronqué (rc={rc:.1f}), font_size réduite")
                page.insert_textbox(
                    rect, new_t,
                    fontsize=max(font_size - 0.5, 8.0),
                    fontname=fontname, color=(0, 0, 0), align=align
                )

        try:
            page.clean_contents()
        except Exception:
            pass

    print(f"  {n_replaced} blocs LLM remplacés in-place")
    doc.save(output_path, deflate=True, garbage=4, clean=True)
    doc.close()

    # Fix 4 : vérification post-save des chars invisibles
    import fitz as fitz2
    doc2 = fitz2.open(output_path)
    invis_count = sum(len(INVIS_RE.findall(page.get_text())) for page in doc2)
    doc2.close()
    print(f"  Chars invisibles restants après save: {invis_count}")

# ─── Rapport pré-analyse IA ──────────────────────────────────────────────────

def generate_analysis_report(blocks: list, detect_result: dict, ai_idx: set, out_path: str) -> str:
    report_path = os.path.splitext(out_path)[0] + "_analyse_ia.html"
    now = time.strftime("%d/%m/%Y %H:%M")
    fname = os.path.basename(out_path)
    score = detect_result.get("score_global", 0)

    if score >= 30:
        score_color = "#c00"; score_bg = "#fff0f0"; score_label = "ÉLEVÉ"
    elif score >= 15:
        score_color = "#b85c00"; score_bg = "#fff8f0"; score_label = "MOYEN"
    else:
        score_color = "#050"; score_bg = "#f0fff0"; score_label = "BAS"

    rows = []
    for idx, b in enumerate(blocks):
        text = b.get("new_text", b["text"])
        page = b["page"] + 1
        is_ai = idx in ai_idx
        if is_ai:
            bg = "#fff0f0"
            badge = '<span style="background:#c00;color:white;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:bold">IA DÉTECTÉ</span>'
        else:
            bg = "#f9f9f9"
            badge = '<span style="background:#ccc;color:#444;padding:2px 6px;border-radius:3px;font-size:10px">OK</span>'

        rows.append(f"""
<div class="block" style="background:{bg}">
  <div class="block-header">Bloc {idx+1} — Page {page} &nbsp; {badge}</div>
  <div class="text">{text[:400]}{'...' if len(text) > 400 else ''}</div>
</div>""")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Analyse IA — {fname}</title>
<style>
body {{ font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 30px; }}
h1 {{ font-size: 18px; margin-bottom: 4px; }}
.meta {{ color: #666; margin-bottom: 16px; font-size: 11px; }}
.score-box {{ background:{score_bg}; border:2px solid {score_color}; border-radius:6px; padding:12px 20px; display:inline-block; margin-bottom:24px; }}
.score-num {{ font-size:36px; font-weight:bold; color:{score_color}; }}
.score-lbl {{ font-size:13px; color:{score_color}; font-weight:bold; margin-left:8px; }}
.stats {{ color:#444; font-size:12px; margin-top:4px; }}
.block {{ border:1px solid #ddd; border-radius:4px; margin-bottom:12px; padding:10px 14px; }}
.block-header {{ font-weight:bold; font-size:11px; color:#666; margin-bottom:6px; }}
.text {{ line-height:1.5; color:#333; }}
</style>
</head>
<body>
<h1>Rapport d'analyse IA — {fname}</h1>
<div class="meta">Généré le {now} | Seora slow mode</div>
<div class="score-box">
  <span class="score-num">{score:.1f}%</span>
  <span class="score-lbl">{score_label}</span>
  <div class="stats">{len(ai_idx)} blocs ciblés pour humanisation sur {len(blocks)} éligibles</div>
</div>
{''.join(rows)}
</body>
</html>"""

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html)
    return report_path

# ─── Diff report ─────────────────────────────────────────────────────────────

def word_diff_html(before: str, after: str) -> tuple:
    bw = before.split()
    aw = after.split()
    matcher = difflib.SequenceMatcher(None, bw, aw, autojunk=False)

    before_parts, after_parts = [], []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            before_parts.append(" ".join(bw[i1:i2]))
            after_parts.append(" ".join(aw[j1:j2]))
        elif tag in ("replace", "delete"):
            chunk = " ".join(bw[i1:i2])
            before_parts.append(f'<strong style="background:#ffd0d0">{chunk}</strong>')
            if tag == "replace":
                chunk2 = " ".join(aw[j1:j2])
                after_parts.append(f'<strong style="background:#c6f6c6">{chunk2}</strong>')
        elif tag == "insert":
            chunk2 = " ".join(aw[j1:j2])
            after_parts.append(f'<strong style="background:#c6f6c6">{chunk2}</strong>')

    return " ".join(before_parts), " ".join(after_parts)


def generate_diff_report(diff_log: list, out_path: str, score_before: float, score_after: float) -> str:
    report_path = os.path.splitext(out_path)[0] + "_rapport_diff.html"
    now = time.strftime("%d/%m/%Y %H:%M")
    fname = os.path.basename(out_path)
    n = len(diff_log)

    rows = []
    for k, entry in enumerate(diff_log, 1):
        page = entry.get("page", 0) + 1
        before = entry.get("before", "")
        after = entry.get("after", "")
        bhtml, ahtml = word_diff_html(before, after)
        rows.append(f"""
<div class="block">
  <div class="block-header">Bloc {k} — Page {page}</div>
  <div class="label avant-label">AVANT</div>
  <div class="text avant">{bhtml}</div>
  <div class="label apres-label">APRÈS</div>
  <div class="text apres">{ahtml}</div>
</div>""")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport diff — {fname}</title>
<style>
body {{ font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 30px; }}
h1 {{ font-size: 18px; margin-bottom: 4px; }}
.meta {{ color: #666; margin-bottom: 20px; font-size: 11px; }}
.score {{ font-weight: bold; font-size: 14px; margin-bottom: 24px; }}
.block {{ border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px; padding: 12px; }}
.block-header {{ font-weight: bold; font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; }}
.label {{ font-size: 10px; font-weight: bold; margin-top: 8px; margin-bottom: 3px; text-transform: uppercase; }}
.avant-label {{ color: #c00; }}
.apres-label {{ color: #050; margin-top: 12px; }}
.text {{ padding: 8px 10px; border-radius: 3px; line-height: 1.6; }}
.avant {{ background: #fff0f0; color: #800; }}
.apres {{ background: #f0fff0; color: #040; }}
</style>
</head>
<body>
<h1>Rapport humanisation — {fname}</h1>
<div class="meta">Généré le {now}</div>
<div class="score">Score : {score_before:.1f}% → {score_after:.1f}% &nbsp;|&nbsp; {n} bloc(s) modifié(s)</div>
{''.join(rows) if rows else '<p>Aucun bloc modifié.</p>'}
</body>
</html>"""

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html)
    return report_path


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="humanize-v13 — remplacement PDF in-place")
    parser.add_argument("input", help="Fichier PDF source")
    parser.add_argument("--lang", default="fr")
    parser.add_argument("--threshold", type=float, default=25.0)
    parser.add_argument("--output", help="Chemin de sortie PDF")
    args = parser.parse_args()

    if not args.input.lower().endswith(".pdf"):
        print("ERREUR : humanize-v13 accepte uniquement des fichiers PDF")
        sys.exit(1)

    if not DETECTOR_TOKEN:
        print("ERREUR : SEORA_DETECTOR_TOKEN manquant dans /tmp/seora-env.tmp")
        sys.exit(1)

    t0 = time.time()
    base = os.path.splitext(args.input)[0]
    out_path = args.output or f"{base}_humanise_v15.pdf"

    print(f"\n{'='*60}")
    print(f"  humanize-v13 | {os.path.basename(args.input)} → {os.path.basename(out_path)}")
    print(f"  Seuil: {args.threshold}% | Langue: {args.lang}")
    print(f"  Mode: PDF in-place (PyMuPDF redact + insert)")
    print(f"  Fixes: invisible chars globaux, AI vocab global, prompt renforcé")
    print(f"{'='*60}")

    # 1. Extraction blocs
    print(f"\n[1/7] Extraction blocs PDF...")
    blocks = extract_text_blocks(args.input)

    # Pages à exclure entièrement (remerciements, tables des matières, etc.)
    skip_pages = set()
    for b in blocks:
        tl = b["text"].strip().lower()
        if any(tl.startswith(p) for p in SKIP_WHOLE_PAGE_PREFIXES):
            skip_pages.add(b["page"])
    if skip_pages:
        print(f"  Pages exclues entières (remerciements/TdM) : {sorted(p+1 for p in skip_pages)}")

    eligible = [b for b in blocks if b["page"] not in skip_pages and not should_skip(b["text"])]
    print(f"  {len(blocks)} blocs total | {len(eligible)} éligibles à humanisation")

    # 2. Fixes directs (déterministe, sans LLM)
    print(f"\n[2/7] Nettoyage direct (sans LLM)...")
    n_fixed = 0
    for b in eligible:
        new = apply_direct_fixes(b["text"])
        if new != b["text"]:
            b["new_text"] = new
            n_fixed += 1
    print(f"  {n_fixed} blocs nettoyés par regex")

    def block_text(b):
        return b.get("new_text", b["text"])

    all_text = "\n".join(block_text(b) for b in eligible)

    # 3. Slow detect → ciblage (mode précis)
    print(f"\n[3/7] Slow detect (mode précis)...")
    t1 = time.time()
    init_result = detect(all_text, args.lang, fast_mode=False, label="slow")
    init_score = init_result["score_global"]
    print(f"  Score slow : {init_score:.1f}% ({time.time()-t1:.0f}s)")

    if init_score <= TARGET_SCORE:
        print(f"  Déjà sous {TARGET_SCORE}% — pas de LLM nécessaire")
        ai_idx = set()
        signals_prompt = ""
    else:
        effective_threshold = min(args.threshold, max(init_score * 0.6, TARGET_SCORE))
        print(f"  Threshold effectif : {effective_threshold:.1f}%")
        ai_idx = find_ai_blocks(eligible, init_result["chunk_results"], effective_threshold)
        if not ai_idx:
            ai_idx = set(range(len(eligible)))
            print(f"  Aucune zone ciblée → humanise tous les blocs éligibles")
        signals_prompt = build_signals_prompt(init_result.get("signals") or {})
        print(f"  Zones IA : {len(ai_idx)}/{len(eligible)} blocs")

    # 3b. Rapport pré-analyse IA
    print(f"\n[3b/7] Génération rapport pré-analyse...")
    analysis_path = generate_analysis_report(eligible, init_result, ai_idx, out_path)
    print(f"  Rapport analyse : {analysis_path}")

    # 4. Humanisation LLM ciblée
    diff_log = []
    if ai_idx:
        print(f"\n[4/7] Humanisation ciblée (LLM)...")
        t2 = time.time()
        eligible, diff_log = humanize_blocks_targeted(eligible, sorted(ai_idx), signals_prompt, args.lang)
        print(f"  Durée LLM : {time.time()-t2:.0f}s")
    else:
        print(f"\n[4/7] Humanisation : rien à faire (LLM)")

    # 5. Remplacement in-place dans le PDF (Fix 1+2 inclus)
    print(f"\n[5/7] Remplacement in-place dans le PDF...")
    all_text_after = "\n".join(block_text(b) for b in eligible)
    apply_replacements_to_pdf(args.input, eligible, out_path, skip_pages=skip_pages)
    print(f"  PDF sauvegardé : {out_path}")

    # 6. Slow rescore (précis)
    print(f"\n[6/7] Slow rescore...")
    t3 = time.time()
    slow_result = detect(all_text_after, args.lang, fast_mode=False, label="slow")
    final_score = slow_result["score_global"]
    print(f"  Score FINAL : {final_score:.1f}% ({time.time()-t3:.0f}s)")

    # Passe 2 si encore trop haut
    if final_score > TARGET_SCORE:
        from_slow = find_ai_blocks(eligible, slow_result["chunk_results"], TARGET_SCORE + 5)
        if from_slow:
            import shutil
            print(f"\n  Passe 2 : {len(from_slow)} blocs slow-ciblés...")
            sp2 = build_signals_prompt(slow_result.get("signals") or {})
            eligible, diff_log2 = humanize_blocks_targeted(eligible, sorted(from_slow), sp2, args.lang)
            diff_log.extend(diff_log2)
            all_text_p2 = "\n".join(block_text(b) for b in eligible)
            tmp_p2 = out_path + ".pass2.pdf"
            apply_replacements_to_pdf(out_path, eligible, tmp_p2, skip_pages=skip_pages)
            shutil.move(tmp_p2, out_path)
            slow2 = detect(all_text_p2, args.lang, fast_mode=False, label="slow-p2")
            final_score = slow2["score_global"]
            print(f"  Score passe 2 : {final_score:.1f}%")

    # 7. Rapport garde-fou + rapports
    import fitz
    doc = fitz.open(out_path)
    n_pages_out = doc.page_count
    doc.close()
    doc_in = fitz.open(args.input)
    n_pages_in = doc_in.page_count
    doc_in.close()

    dt = time.time() - t0
    status = "✅ OBJECTIF ATTEINT" if final_score <= TARGET_SCORE else f"⚠️  {final_score:.1f}% (plancher ~15% pour DPP)"

    report_path = generate_diff_report(diff_log, out_path, init_score, final_score)

    print(f"\n{'='*60}")
    print(f"  Score FINAL : {final_score:.1f}%  {status}")
    print(f"  Pages       : {n_pages_out}/{n_pages_in} {'✅' if n_pages_out == n_pages_in else '⚠️ '}")
    print(f"  Durée       : {dt:.0f}s ({dt/60:.1f} min)")
    print(f"  Output      : {out_path}")
    print(f"  Analyse IA  : {analysis_path}")
    print(f"  Rapport diff: {report_path}")
    print(f"{'='*60}\n")
    return out_path, final_score, report_path

if __name__ == "__main__":
    main()
