"""The 'facts' object: everything a decision is based on (CONTRACT section 6), with safe defaults.

Missing values stay None (unknown). They are never silently turned into "fine".
"""
from __future__ import annotations

import copy
from typing import Any

from .jsonlogic import get_var

TEMPLATE: dict[str, Any] = {
    "person": {"gender": None, "cnic_valid": None, "cnic_expired": None, "deceased": None, "age": None},
    "household": {"size_match": None, "pmt_score": None, "members": None,
                  "flags": {"gov_employee": None, "owns_vehicle": None, "tax_filer": None, "foreign_trips": None,
                            "high_phone_bill": None}},
    "payout": {"shared_with_other_households": None, "changed_within_days": None, "owner_is_helper": None},
    "doc": {"required_missing": None, "any_blurry": None, "any_edited": None, "min_confidence": None,
            "missing_types": [], "blurry_types": []},
    "identity": {"band": None, "score": None, "duplicate": None, "claimed_other": None},
    "claim": {"amount": None, "ask_more_count": 0},
    "consent": {"active": False, "detail": None},
    "scam": {"flag": None},
    # what the card photo said, compared with the registry record (yes/no only, no personal data). None = not checked
    "card": {"read": None, "number_match": None, "name_match": None, "face_found": None, "face_match": None},
}

# fields counted as "missing" when None (pmt_score has its own reason code too)
CORE_FIELDS = ["person.cnic_valid", "person.age", "household.pmt_score", "household.members", "identity.band",
               "payout.shared_with_other_households", "payout.owner_is_helper"]


def _merge(base: dict, extra: dict) -> dict:
    for k, v in (extra or {}).items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _merge(base[k], v)
        elif k in base:
            base[k] = v
    return base


def make_facts(partial: dict | None = None) -> dict:
    """Template with defaults, overlaid by whatever the caller knows. Unknown keys are ignored."""
    return _merge(copy.deepcopy(TEMPLATE), partial or {})


def flags_count(f: dict) -> int:
    fl = get_var(f, "household.flags") or {}
    n = 0
    for k in ("gov_employee", "owns_vehicle", "tax_filer", "high_phone_bill"):
        n += 1 if fl.get(k) else 0
    ft = fl.get("foreign_trips")
    n += 1 if (ft is True or (isinstance(ft, (int, float)) and not isinstance(ft, bool) and ft > 1)) else 0
    return n


def missing_count(f: dict) -> int:
    return sum(1 for p in CORE_FIELDS if get_var(f, p) is None)
