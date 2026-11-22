"""Reads the printed fields off a CNIC front photo (computer vision) and compares them with the registry record.

The card follows ONE agreed layout (the Sahara demo card, see docs/CARD_FORMAT.md): a label line, then its value on the next line.
    Name / Father Name / Gender / Date of Birth / Date of Expiry / Identity Number

The reading uses RapidOCR (ONNX models, runs on the CPU, no internet needed after install). If it is not installed the
functions say "not available" and the claim carries on without this check (a person looks instead); nothing is guessed.
"""
from __future__ import annotations

import io
import re
from typing import Any

try:
    from rapidocr_onnxruntime import RapidOCR  # type: ignore

    OCR_OK = True
except Exception:  # pragma: no cover - depends on the machine
    RapidOCR = None  # type: ignore
    OCR_OK = False

_engine: Any = None

CNIC_RE = re.compile(r"(\d{5})\s*[-–—_.]?\s*(\d{7})\s*[-–—_.]?\s*(\d)")
LABELS = {
    "name": re.compile(r"^\s*name\s*$", re.I),
    "father": re.compile(r"father", re.I),
    "dob": re.compile(r"date\s*of\s*birth", re.I),
    "expiry": re.compile(r"date\s*of\s*expiry", re.I),
    "number": re.compile(r"identity\s*number|id\s*number", re.I),
    "gender": re.compile(r"^\s*gender\s*$", re.I),
}


BACK_WORDS = re.compile(r"permanent\s*address|present\s*address|date\s*of\s*issue", re.I)
FRONT_WORDS = re.compile(r"identity\s*number|date\s*of\s*birth|date\s*of\s*expiry", re.I)


def available() -> bool:
    return OCR_OK


def side_of(texts: list[str]) -> str:
    """'front' (name / birth / identity-number labels), 'back' (address / issue-date labels) or 'unknown'. Never guesses from one stray word."""
    back = sum(1 for t in texts if BACK_WORDS.search(t))
    front = sum(1 for t in texts if FRONT_WORDS.search(t))
    if back >= 2 and back > front:
        return "back"
    if front >= 2 and front > back:
        return "front"
    return "unknown"


def _get_engine() -> Any:
    global _engine
    if _engine is None:
        _engine = RapidOCR()
    return _engine


def _lines(data: bytes) -> list[tuple[float, float, str]]:
    """(y, x, text) for every text line, in reading order."""
    import numpy as np
    from PIL import Image

    img = Image.open(io.BytesIO(data)).convert("RGB")
    if max(img.size) > 1600:  # keep it quick
        img.thumbnail((1600, 1600))
    result, _ = _get_engine()(np.asarray(img))
    out: list[tuple[float, float, str]] = []
    for box, text, _conf in result or []:
        ys = [p[1] for p in box]
        xs = [p[0] for p in box]
        out.append((sum(ys) / len(ys), min(xs), str(text).strip()))
    out.sort(key=lambda t: (round(t[0] / 12), t[1]))
    return out


def _digits_fix(s: str) -> str:
    return s.translate(str.maketrans({"O": "0", "o": "0", "I": "1", "l": "1", "|": "1", "S": "5", "B": "8"}))


def parse_card(lines: list[tuple[float, float, str]]) -> dict:
    texts = [t for _, _, t in lines]
    found: dict[str, str | None] = {k: None for k in ("name", "father", "dob", "expiry", "gender", "cnic")}
    for i, t in enumerate(texts):
        for key, rx in LABELS.items():
            if rx.search(t):
                value = texts[i + 1] if i + 1 < len(texts) else None
                if key == "number":
                    found["cnic"] = value
                elif key in found:
                    # "Father Name" must not be read as plain "Name"
                    found[key] = value
                break
    # the number: the value under the label, else any 5-7-1 pattern anywhere on the card
    digits = None
    for cand in ([found["cnic"]] if found["cnic"] else []) + texts:
        m = CNIC_RE.search(_digits_fix(cand or ""))
        if m:
            digits = "".join(m.groups())
            break
    return {"name": found["name"], "father": found["father"], "dob": found["dob"], "expiry": found["expiry"],
            "gender": found["gender"], "cnic_digits": digits}


def read_card_front(data: bytes) -> dict:
    """{'available', 'read', 'name', 'father', 'cnic_digits', ...}. Never raises."""
    if not OCR_OK:
        return {"available": False, "read": None}
    try:
        lines = _lines(data)
        got = parse_card(lines)
        side = side_of([t for _, _, t in lines])
    except Exception as e:  # a bad image must not break the upload
        return {"available": True, "read": False, "error": type(e).__name__}
    ok = bool(got["name"]) and bool(got["cnic_digits"])
    return {"available": True, "read": ok, "side": side, **got}


def read_card_back(data: bytes) -> dict:
    """The back of the card: do the address and issue-date lines show? {'available', 'side', 'read'}. Never raises."""
    if not OCR_OK:
        return {"available": False, "read": None, "side": None}
    try:
        side = side_of([t for _, _, t in _lines(data)])
    except Exception as e:
        return {"available": True, "read": False, "side": "unknown", "error": type(e).__name__}
    return {"available": True, "read": side == "back", "side": side}


def _norm_name(s: str | None) -> str:
    """Letters only, no spaces: the reader sometimes drops the gap between words ("ZainabBibi")."""
    return re.sub(r"[^a-z]+", "", (s or "").lower())


def compare_with_record(card: dict, record: dict) -> dict:
    """card = read_card_front(...); record = the registry row (name_roman, cnic). Returns booleans only (no personal data)."""
    if not card or card.get("read") is not True:
        return {"read": card.get("read") if card else None, "number_match": None, "name_match": None}
    from rapidfuzz import fuzz

    num_ok = bool(record.get("cnic")) and card.get("cnic_digits") == re.sub(r"\D", "", record["cnic"])
    a, b = _norm_name(card.get("name")), _norm_name(record.get("name_roman"))
    name_ok = bool(a and b) and fuzz.ratio(a, b) >= 88
    return {"read": True, "number_match": num_ok, "name_match": name_ok}
