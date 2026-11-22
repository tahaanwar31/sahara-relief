"""Reason codes (id, zone hint, English, Urdu) loaded once from shared/reasons.json."""
from __future__ import annotations

import json
from functools import lru_cache

from ..paths import shared_dir


@lru_cache(maxsize=1)
def _load() -> dict:
    with open(shared_dir() / "reasons.json", encoding="utf-8") as f:
        return json.load(f)


def decision_reasons() -> dict:
    return _load()["decision"]


def scam_reasons() -> dict:
    return _load()["scam"]


def is_known(code: str) -> bool:
    return code in decision_reasons()


def explain(code: str) -> dict:
    """{'en': ..., 'ur': ...} for a decision reason code. Unknown code -> R_LOW_CONFIDENCE text."""
    r = decision_reasons().get(code) or decision_reasons()["R_LOW_CONFIDENCE"]
    return {"en": r["en"], "ur": r["ur"]}


def zone_hint(code: str) -> str | None:
    r = decision_reasons().get(code)
    return r["zone"] if r else None
