"""Normalisers for names, relations (S/O, W/O, D/O), dates and CNIC numbers.

Everything here is total: odd input (None, numbers, 10,000 characters, Urdu-only,
<script> tags) gives a harmless result, never an exception.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime

MAX_FIELD_CHARS = 500  # longer input is cut off before any work is done

# --- names ------------------------------------------------------------------------

MUHAMMAD_VARIANTS = {
    "muhammad", "mohammad", "mohammed", "muhammed", "mohamed", "muhamad", "mohamad", "mahomed",
    "mohd", "muhd", "mhd", "md", "mohmmad", "muhamed", "muhammid", "mehmood_m", "mohamd", "muhmmad",
}
# Titles / honorifics: they are dropped when comparing, because they come and go
# ("Zainab Bibi" / "Zainab Begum" / "Syed Ali" / "Sayyid Ali").
HONORIFICS = {
    "bibi", "bibee", "bi", "begum", "begam", "khatoon", "khatun", "mst", "musammat", "mussammat",
    "mrs", "mr", "ms", "late", "shaheed", "marhoom", "marhooma", "syed", "sayyid", "sayed", "saiyed",
    "saiyad", "sayad", "sayyed", "seyed", "haji", "hajji", "mian",
}
RELATION_WORDS = {"so", "wo", "do", "s", "w", "d", "son", "wife", "daughter", "of", "bint", "walad", "zawja"}

URDU_RE = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
LATIN_RE = re.compile(r"[A-Za-z]")

URDU_TO_ROMAN = {
    "ا": "a", "آ": "a", "أ": "a", "إ": "a", "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ث": "s", "ج": "j",
    "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ڈ": "d", "ذ": "z", "ر": "r", "ڑ": "r", "ز": "z",
    "ژ": "zh", "س": "s", "ش": "sh", "ص": "s", "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh",
    "ف": "f", "ق": "q", "ک": "k", "ك": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n", "ں": "n",
    "و": "u", "ہ": "h", "ھ": "h", "ه": "h", "ۃ": "h", "ء": "", "ی": "i", "ي": "i", "ى": "i", "ے": "e",
    "ئ": "i", "ؤ": "u", "ۓ": "e",
}
# A few very common Urdu words go straight to their Roman form.
URDU_WORDS = {
    "محمد": "muhammad", "مہاجر": "muhajir", "بی": "bibi", "بیگم": "begum", "سید": "syed", "زینب": "zainab",
    "فاطمہ": "fatima", "علی": "ali", "احمد": "ahmad", "حسین": "hussain", "خان": "khan",
}


def clean_text(x: object, limit: int = MAX_FIELD_CHARS) -> str:
    """Turn anything into a short, safe single-line string."""
    if x is None:
        return ""
    if not isinstance(x, str):
        try:
            x = str(x)
        except Exception:  # pragma: no cover
            return ""
    x = x[:limit]
    x = unicodedata.normalize("NFKC", x)
    x = "".join(ch for ch in x if ch.isprintable() or ch in " \t")
    return re.sub(r"\s+", " ", x).strip()


def strip_markup(s: str) -> str:
    """Remove <tags>; names are plain text, never HTML."""
    return re.sub(r"<[^>]*>?", " ", s)


def script_of(s: str) -> str:
    """'ur' if only Urdu/Arabic script letters, 'en' if only Latin, 'mixed' or 'none'."""
    has_ur = bool(URDU_RE.search(s))
    has_en = bool(LATIN_RE.search(s))
    if has_ur and has_en:
        return "mixed"
    if has_ur:
        return "ur"
    if has_en:
        return "en"
    return "none"


def _strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def canon_roman_token(t: str) -> str:
    """One Roman-script token to a canonical spelling."""
    t = _strip_diacritics(t.lower())
    t = re.sub(r"[^a-z]", "", t)
    if not t:
        return ""
    if t in MUHAMMAD_VARIANTS or re.fullmatch(r"m[uoa]h?[ao]?m+[ae]?d+", t):
        return "muhammad"
    t = t.replace("ee", "i").replace("oo", "u").replace("ou", "u").replace("ei", "ai")
    t = t.replace("ph", "f").replace("aa", "a").replace("ey", "ai")
    t = re.sub(r"(.)\1+", r"\1", t)  # collapse repeated letters
    if len(t) > 3 and t.endswith("ah"):
        t = t[:-1]
    t = t.replace("e", "a")  # Ahmed/Ahmad, Rehman/Rahman
    return t


_HONORIFICS_CANON = {canon_roman_token(h) for h in HONORIFICS}

_SKEL_DIGRAPHS =(("sh", "S"), ("kh", "K"), ("gh", "G"), ("ch", "C"), ("zh", "Z"))


def skeleton(token: str) -> str:
    """Consonant skeleton, used to compare Urdu script with Roman script (approximate)."""
    t = token
    for a, b in _SKEL_DIGRAPHS:
        t = t.replace(a, b)
    t = re.sub(r"[aeiouyw]", "", t)
    t = t.replace("z", "s").replace("q", "k").replace("v", "")
    return re.sub(r"(.)\1+", r"\1", t)


def urdu_token_to_roman(tok: str) -> str:
    tok = re.sub(r"[ً-ٰٟ]", "", tok)  # harakat
    if tok in URDU_WORDS:
        return URDU_WORDS[tok]
    return "".join(URDU_TO_ROMAN.get(ch, "") for ch in tok)


def name_tokens(raw: object) -> dict:
    """Normalise a person name.

    Returns {'tokens': [...], 'key': 'zainab', 'script': 'en|ur|mixed|none',
             'initials': [...], 'truncated': bool}
    """
    s0 = raw if isinstance(raw, str) else ("" if raw is None else str(raw))
    truncated = len(s0) > MAX_FIELD_CHARS
    s = strip_markup(clean_text(s0))
    sc = script_of(s)
    words = re.findall(r"[\w؀-ۿ]+", s.replace("_", " "))
    toks: list[str] = []
    for w in words:
        if URDU_RE.search(w):
            r = urdu_token_to_roman(w)
            # mark as transliterated so Roman vs Urdu comparison knows it is approximate
            toks.append(canon_roman_token(r) if r else "")
        else:
            toks.append(canon_roman_token(w))
    toks = [t for t in toks if t]
    # "abd ur rehman" -> "abdul rahman"
    out: list[str] = []
    i = 0
    while i < len(toks):
        if toks[i] in ("abd", "abdu") and i + 1 < len(toks) and toks[i + 1] in ("ur", "ul", "al", "us", "ud", "u"):
            out.append("abdul")
            i += 2
            continue
        if toks[i] in ("abdur", "abdus", "abdud", "abdal"):
            out.append("abdul")
        else:
            out.append(toks[i])
        i += 1
    toks = out
    # drop honorific words (kept only if nothing else is left)
    core = [t for t in toks if t not in _HONORIFICS_CANON]
    if core:
        toks = core
    initials = [t for t in toks if len(t) == 1]
    return {"tokens": toks, "key": " ".join(toks), "script": sc, "initials": initials, "truncated": truncated}


# --- relation (father / husband) ---------------------------------------------------

REL_RE = re.compile(r"^\s*(s\s*/\s*o|w\s*/\s*o|d\s*/\s*o|c\s*/\s*o|son\s+of|wife\s+of|daughter\s+of|ولد|بنت|زوجہ)\s*[:.\-]*\s*", re.I)


def parse_relation(raw: object) -> dict:
    """'W/O Late Ghulam Mustafa' -> {'relation': 'W/O', 'name': 'Ghulam Mustafa', 'late': True}"""
    s = strip_markup(clean_text(raw))
    rel = None
    m = REL_RE.match(s)
    if m:
        r = m.group(1).lower().replace(" ", "")
        rel = {"s/o": "S/O", "w/o": "W/O", "d/o": "D/O", "c/o": "C/O", "sonof": "S/O", "wifeof": "W/O",
               "daughterof": "D/O", "ولد": "S/O", "بنت": "D/O", "زوجہ": "W/O"}.get(r, None)
        s = s[m.end():]
    late = False
    m2 = re.match(r"^\s*(late|marhoom|مرحوم|شہید)\s+", s, re.I)
    if m2:
        late = True
        s = s[m2.end():]
    return {"relation": rel, "name": s.strip(), "late": late}


# --- dates -------------------------------------------------------------------------

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def _valid(y: int, m: int, d: int) -> date | None:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def parse_date(raw: object) -> dict:
    """Parse a date written in many ways.

    Returns {'candidates': [ISO dates, best first], 'year': int|None, 'precision': 'day'|'year'|None,
             'ambiguous': bool, 'placeholder': bool}.  Day-first (DD/MM/YYYY) is the preferred reading.
    """
    out = {"candidates": [], "year": None, "precision": None, "ambiguous": False, "placeholder": False}
    if isinstance(raw, (date, datetime)):
        d = raw.date() if isinstance(raw, datetime) else raw
        out.update(candidates=[d.isoformat()], year=d.year, precision="day")
        return out
    s = clean_text(raw, 60).lower()
    if not s:
        return out
    s = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", s)
    cands: list[date] = []
    m = re.fullmatch(r"(\d{4})", s)
    if m:
        y = int(m.group(1))
        if 1850 <= y <= 2100:
            out.update(year=y, precision="year")
        return out
    m = re.fullmatch(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)  # ISO-like Y-M-D
    if m:
        d = _valid(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if d:
            cands.append(d)
    m = re.fullmatch(r"(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})", s)
    if m and not cands:
        a, b, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        first = _valid(y, b, a)   # day-first
        second = _valid(y, a, b)  # month-first
        if first:
            cands.append(first)
        if second and second != first:
            cands.append(second)
            out["ambiguous"] = first is not None
        if a == 1 and b == 1:
            out["placeholder"] = True
    m = re.fullmatch(r"(\d{2})(\d{2})(\d{4})", s)
    if m and not cands:
        d = _valid(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        if d:
            cands.append(d)
    if not cands:
        m = re.fullmatch(r"(\d{1,2})[ \-,.]*([a-z]{3,9})[ \-,.]*(\d{4})", s)
        if m and m.group(2)[:3] in _MONTHS:
            d = _valid(int(m.group(3)), _MONTHS[m.group(2)[:3]], int(m.group(1)))
            if d:
                cands.append(d)
        m = re.fullmatch(r"([a-z]{3,9})[ \-,.]*(\d{1,2})[ \-,.]*(\d{4})", s)
        if m and not cands and m.group(1)[:3] in _MONTHS:
            d = _valid(int(m.group(3)), _MONTHS[m.group(1)[:3]], int(m.group(2)))
            if d:
                cands.append(d)
    if cands:
        out.update(candidates=[c.isoformat() for c in cands], year=cands[0].year, precision="day")
        if cands[0].month == 1 and cands[0].day == 1:
            out["placeholder"] = True
    else:
        m = re.search(r"(1[89]\d\d|20\d\d)", s)  # last resort: a year hiding in the text
        if m:
            out.update(year=int(m.group(1)), precision="year")
    return out


# --- CNIC --------------------------------------------------------------------------

PROVINCE = {"1": "KP", "2": "FATA (legacy)", "3": "Punjab", "4": "Sindh", "5": "Balochistan",
            "6": "Islamabad", "7": "Gilgit-Baltistan", "8": "AJK"}
CNIC_IN_TEXT = re.compile(r"(?<!\d)(\d{5}-?\d{7}-?\d)(?!\d)")


def normalize_cnic(raw: object) -> str | None:
    """Digits only; returns 13 digits or None."""
    s = clean_text(raw, 40)
    digits = re.sub(r"\D", "", s)
    return digits if len(digits) == 13 else None


def format_cnic(c: str) -> str:
    return f"{c[:5]}-{c[5:12]}-{c[12]}"


def validate_cnic(raw: object, gender: str | None = None, expiry: object = None, today: date | None = None) -> dict:
    """Format checks only. No check digit is claimed because none is public.

    Returns {'valid': bool, 'problems': [...], 'province': str|None, 'gender_from_digit': 'M'|'F'|None,
             'expired': bool|None}
    """
    problems: list[str] = []
    c = normalize_cnic(raw)
    prov = None
    g = None
    if c is None:
        problems.append("not_13_digits")
    else:
        prov = PROVINCE.get(c[0])
        if prov is None:
            problems.append("unknown_province_digit")
        if len(set(c)) == 1:
            problems.append("all_same_digit")
        g = "M" if int(c[-1]) % 2 == 1 else "F"
        gg = (gender or "").strip().upper()[:1]
        if gg in ("M", "F") and gg != g:
            problems.append("gender_digit_mismatch")
    expired = None
    if expiry:
        ed = parse_date(str(expiry) if not isinstance(expiry, (date, datetime)) else expiry)
        if ed["candidates"]:
            expired = date.fromisoformat(ed["candidates"][0]) < (today or date.today())
        elif ed["year"]:
            expired = date(ed["year"], 12, 31) < (today or date.today())
    return {"valid": not problems, "problems": problems, "province": prov, "gender_from_digit": g,
            "expired": expired, "cnic": c}


def normalize_district(raw: object) -> str:
    s = strip_markup(clean_text(raw, 100)).lower()
    return " ".join(re.findall(r"[a-z؀-ۿ]+", _strip_diacritics(s)))
