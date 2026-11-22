"""Identity matching: compare two person records field by field.

Rules that matter (Build Plan section 5, challenge 3):
- Names are normalised first (Muhammad/Mohammad/Muhammed/Mohd -> one form).
- A missing field is NEUTRAL: it is left out of the average, it does not count for or against.
- NEVER "SAME" on name alone. SAME needs a strong identifier to agree (equal CNIC, or equal
  birth date AND equal father/husband name) and no hard disagreement on CNIC, date or father.
- Two records with a different CNIC but everything else equal are a possible duplicate: MAYBE,
  never merged.
- The scorer never raises on empty, huge, Urdu-only or <script> input.

Weights are fixed and returned in the evidence so a reviewer can see them.
"""
from __future__ import annotations

import html
from typing import Any

try:  # rapidfuzz is optional; difflib is the fallback
    from rapidfuzz import fuzz as _fuzz

    def _ratio(a: str, b: str) -> float:
        return _fuzz.ratio(a, b) / 100.0

    def _token_sort(a: str, b: str) -> float:
        return _fuzz.token_sort_ratio(a, b) / 100.0

    ENGINE = "rapidfuzz"
except Exception:  # pragma: no cover - exercised only when rapidfuzz is missing
    from difflib import SequenceMatcher

    def _ratio(a: str, b: str) -> float:
        return SequenceMatcher(None, a, b).ratio()

    def _token_sort(a: str, b: str) -> float:
        return _ratio(" ".join(sorted(a.split())), " ".join(sorted(b.split())))

    ENGINE = "difflib"

from .normalize import (clean_text, name_tokens, normalize_cnic, normalize_district, parse_date, parse_relation,
                        skeleton, strip_markup)

WEIGHTS = {"name": 0.30, "father": 0.20, "cnic": 0.30, "dob": 0.15, "district": 0.05}
YES_AT = 0.95
CLOSE_AT = 0.82


def _echo(v: Any) -> str | None:
    """A safe, short copy of an input value for the evidence list (HTML-escaped)."""
    s = strip_markup(clean_text(v, 120))
    return html.escape(s) if s else None


def _name_sim(a: dict, b: dict) -> tuple[float | None, str]:
    ta, tb = list(a["tokens"]), list(b["tokens"])
    if not ta or not tb:
        return None, ""
    note = ""
    # expand initials ("M. Ahmed Khan") against a token of the other name
    penalty = 1.0
    for X, Y in ((ta, tb), (tb, ta)):
        for i, t in enumerate(X):
            if len(t) == 1:
                match = next((u for u in Y if len(u) > 1 and u[0] == t), None)
                if match:
                    X[i] = match
                    penalty = 0.9
                    note = "initial expanded"
    cross_script = (a["script"] == "ur") != (b["script"] == "ur")
    if cross_script:
        # Urdu script vs Roman: only the consonant skeleton is comparable, so it is capped
        sa = " ".join(skeleton(t) for t in ta)
        sb = " ".join(skeleton(t) for t in tb)
        sim = min(_ratio(sa, sb), 0.9)
        return sim * 0.95, "urdu vs roman (approximate)"
    ka, kb = " ".join(ta), " ".join(tb)
    sim = _ratio(ka, kb)
    swapped = _token_sort(ka, kb) * 0.97  # order changed: slightly less certain
    if swapped > sim:
        sim, note = swapped, note or "word order differs"
    sa, sb = set(ta), set(tb)
    if (sa < sb or sb < sa) and min(len(sa), len(sb)) >= 1:
        sim = max(sim, 0.85)  # one name is a shorter form of the other (missing surname)
        note = note or "one name is shorter"
    return min(1.0, sim * penalty), note


def _agree_from_sim(sim: float | None) -> str:
    if sim is None:
        return "missing"
    if sim >= YES_AT:
        return "yes"
    if sim >= CLOSE_AT:
        return "close"
    return "no"


def _dob_compare(a_raw: Any, b_raw: Any) -> tuple[str, float, str]:
    a, b = parse_date(a_raw), parse_date(b_raw)
    if a["precision"] is None or b["precision"] is None:
        return "missing", 0.0, ""
    if a["precision"] == "day" and b["precision"] == "day":
        if a["candidates"][0] == b["candidates"][0]:
            # equal on the preferred (day-first) reading; a placeholder 01-01 date is weaker
            if a["placeholder"] or b["placeholder"]:
                return "close", 0.7, "01-01 looks like a placeholder date"
            return "yes", 1.0, ""
        if set(a["candidates"]) & set(b["candidates"]):
            return "close", 0.75, "day and month could be swapped"
        if a["year"] == b["year"]:
            return "no", 0.0, "different day or month"
        return "no", 0.0, "different year"
    # one side only has a year
    if a["year"] == b["year"]:
        return "close", 0.7, "only the year can be compared"
    return "no", 0.0, "different year"


def _district_compare(a_raw: Any, b_raw: Any) -> tuple[str, float]:
    a, b = normalize_district(a_raw), normalize_district(b_raw)
    if not a or not b:
        return "missing", 0.0
    if a == b:
        return "yes", 1.0
    if a in b or b in a:
        return "close", 0.8
    return ("close", 0.7) if _ratio(a, b) >= 0.88 else ("no", 0.0)


def _cnic_compare(a_raw: Any, b_raw: Any) -> tuple[str, float, str]:
    a, b = normalize_cnic(a_raw), normalize_cnic(b_raw)
    # a value that is present but not 13 digits is treated as missing evidence, not as a mismatch
    if a is None or b is None:
        return "missing", 0.0, ""
    if a == b:
        return "yes", 1.0, ""
    diff = sum(x != y for x, y in zip(a, b))
    return "no", 0.0, "differs by one digit (typo or reissued card?)" if diff == 1 else "different numbers"


def match_records(a: dict | None, b: dict | None) -> dict:
    """Compare two records. Returns {band, score, evidence[], reason_code, notes[], engine}."""
    try:
        return _match(a if isinstance(a, dict) else {}, b if isinstance(b, dict) else {})
    except Exception:  # last line of defence: never crash a request on odd input
        return {"band": "MAYBE", "score": 0.0, "evidence": [], "reason_code": "R_MISSING_FIELDS",
                "notes": ["could not compare these records"], "engine": ENGINE}


def _match(a: dict, b: dict) -> dict:
    ev: list[dict] = []
    s: dict[str, float] = {}
    agree: dict[str, str] = {}
    notes: list[str] = []

    # name
    na, nb = name_tokens(a.get("name")), name_tokens(b.get("name"))
    sim, nnote = _name_sim(na, nb)
    agree["name"] = _agree_from_sim(sim)
    s["name"] = sim or 0.0
    ev.append({"field": "name", "a": _echo(a.get("name")), "b": _echo(b.get("name")), "agree": agree["name"],
               "weight": WEIGHTS["name"], "similarity": None if sim is None else round(sim, 3),
               "normalised_a": na["key"] or None, "normalised_b": nb["key"] or None,
               **({"note": nnote} if nnote else {})})
    if na["truncated"] or nb["truncated"]:
        notes.append("a very long name was cut to 500 characters")

    # father / husband
    fa, fb = parse_relation(a.get("father")), parse_relation(b.get("father"))
    fta, ftb = name_tokens(fa["name"]), name_tokens(fb["name"])
    fsim, fnote = _name_sim(fta, ftb)
    agree["father"] = _agree_from_sim(fsim)
    s["father"] = fsim or 0.0
    ev.append({"field": "father", "a": _echo(a.get("father")), "b": _echo(b.get("father")),
               "agree": agree["father"], "weight": WEIGHTS["father"],
               "similarity": None if fsim is None else round(fsim, 3), **({"note": fnote} if fnote else {})})

    # cnic
    ag, sc, cnote = _cnic_compare(a.get("cnic"), b.get("cnic"))
    agree["cnic"], s["cnic"] = ag, sc
    ev.append({"field": "cnic", "a": _echo(a.get("cnic")), "b": _echo(b.get("cnic")), "agree": ag,
               "weight": WEIGHTS["cnic"], **({"note": cnote} if cnote else {})})

    # dob
    ag, sc, dnote = _dob_compare(a.get("dob"), b.get("dob"))
    agree["dob"], s["dob"] = ag, sc
    ev.append({"field": "dob", "a": _echo(a.get("dob")), "b": _echo(b.get("dob")), "agree": ag,
               "weight": WEIGHTS["dob"], **({"note": dnote} if dnote else {})})

    # district
    ag, sc = _district_compare(a.get("district"), b.get("district"))
    agree["district"], s["district"] = ag, sc
    ev.append({"field": "district", "a": _echo(a.get("district")), "b": _echo(b.get("district")), "agree": ag,
               "weight": WEIGHTS["district"]})

    present = [f for f in WEIGHTS if agree[f] != "missing"]
    present_w = sum(WEIGHTS[f] for f in present)
    if present_w == 0:
        return {"band": "MAYBE", "score": 0.0, "evidence": ev, "reason_code": "R_MISSING_FIELDS",
                "notes": notes + ["nothing to compare"], "engine": ENGINE}

    score = sum(WEIGHTS[f] * s[f] for f in present) / present_w

    strong = agree["cnic"] == "yes" or (agree["dob"] == "yes" and agree["father"] == "yes")
    hard_disagree = [f for f in ("cnic", "dob", "father") if agree[f] == "no"]
    if not strong:
        score = min(score, 0.69)  # no strong identifier agrees: evidence is weak whatever the name says
        if agree["name"] in ("yes", "close") and len(present) == 1:
            notes.append("name is the only field available: never enough to say SAME")

    if (strong and not hard_disagree and agree["name"] != "no" and present_w >= 0.5 and score >= 0.85):
        band = "SAME"
    elif (agree["cnic"] == "no" and agree["name"] == "no") or score < 0.40:
        band = "DIFFERENT"
    else:
        band = "MAYBE"
    if band == "MAYBE" and agree["cnic"] == "no" and agree["name"] in ("yes", "close"):
        notes.append("different CNIC but similar person: possible duplicate, do not merge")
    if hard_disagree and band != "DIFFERENT":
        notes.append("disagreement on " + ", ".join(hard_disagree) + ": a person must decide")

    return {"band": band, "score": round(score, 3), "evidence": ev,
            "reason_code": "R_NAME_AMBIGUOUS" if band == "MAYBE" else None, "notes": notes, "engine": ENGINE}
