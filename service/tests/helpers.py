"""Shared builders for engine tests."""
from app.engine.decide import default_ruleset, rule_checksum
from app.engine.facts import make_facts


def good_facts(**over):
    """A clean, clearly eligible household. Override pieces by section name."""
    base = {
        "person": {"gender": "F", "cnic_valid": True, "cnic_expired": False, "deceased": False, "age": 45},
        "household": {"size_match": True, "pmt_score": 10, "members": 5,
                      "flags": {"gov_employee": False, "owns_vehicle": False, "tax_filer": False, "foreign_trips": 0,
                                "high_phone_bill": False}},
        "payout": {"shared_with_other_households": False, "changed_within_days": None, "owner_is_helper": False},
        "doc": {"required_missing": False, "any_blurry": False, "any_edited": False, "min_confidence": 0.9},
        "identity": {"band": "SAME", "score": 0.97, "duplicate": False},
        "claim": {"amount": 13500, "ask_more_count": 0},
        "consent": {"active": True, "detail": "active consent #1"},
        "scam": {"flag": False},
    }
    for k, v in over.items():
        if isinstance(v, dict):
            base[k].update(v)
        else:
            base[k] = v
    return make_facts(base)


def ruleset(cutoff=30, **params):
    rs = default_ruleset()
    rs.params = rs.params.model_copy(update={"cutoff": cutoff, **params})
    rs.checksum = rule_checksum(rs.params, rs.rules)
    return rs
