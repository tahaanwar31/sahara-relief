"""A deterministic generator of SYNTHETIC claim cases with a hidden truth label and a category.

Used to (1) train the probability model, (2) evaluate the decision engine, (3) draw the cost curve and
(4) feed the Digital Twin when the database has few stored cases. It is invented data. It proves the
machinery, not real-world accuracy.

Categories (default mix, chosen by us, not measured): clearly_eligible 40%, clearly_ineligible 25%,
borderline 15%, bad_data 15%, scam 5%. The mix matters: if most invented applicants were ineligible or
had broken data, almost every case would honestly go to a person. Change DEFAULT_MIX to see that.

Truth: a case is "truly eligible" when the TRUE survey score is at or below the cutoff, there is no true
exclusion flag, the person is the same person as the record, and nothing fraudulent is going on. What the
system SEES is the true value plus noise, so cases near the cutoff are honestly uncertain, and a small
share of clean-looking cases hide a problem (a missed flag, an impostor with a matching record).
"""
from __future__ import annotations

import random

from .facts import make_facts

DEFAULT_MIX = {"clearly_eligible": 0.40, "clearly_ineligible": 0.25, "borderline": 0.15, "bad_data": 0.15, "scam": 0.05}
CATEGORIES = tuple(DEFAULT_MIX)


def _pick(rnd: random.Random, mix: dict) -> str:
    x, acc = rnd.random() * sum(mix.values()), 0.0
    for k, v in mix.items():
        acc += v
        if x <= acc:
            return k
    return "clearly_eligible"


def generate_cases(n: int, seed: int = 1, cutoffs: tuple[float, ...] = (25.0, 30.0), mix: dict | None = None) -> list[dict]:
    rnd = random.Random(seed)
    mix = mix or DEFAULT_MIX
    out = []
    for i in range(n):
        cat = _pick(rnd, mix)
        cutoff = rnd.choice(cutoffs)
        if cat == "clearly_ineligible":
            true_pmt = rnd.uniform(cutoff + 8, 85)
        elif cat == "borderline":
            true_pmt = rnd.uniform(cutoff - 6, cutoff + 6)
        elif cat == "clearly_eligible":
            true_pmt = rnd.uniform(2, cutoff - 10)
        else:
            true_pmt = rnd.uniform(2, cutoff - 8)
        obs_pmt = round(max(0.0, true_pmt + rnd.gauss(0, 2.0)), 1)
        flags = {"gov_employee": False, "owns_vehicle": False, "tax_filer": False, "foreign_trips": False, "high_phone_bill": False}
        seen = dict(flags)
        band, impostor = "SAME", False
        blurry = missing_doc = edited = False
        cnic_ok, expired, deceased = True, False, False
        shared = helper_owned = dup = scam = False
        changed = None
        members_missing = False

        if cat == "clearly_ineligible" and rnd.random() < 0.3:     # ineligible by an exclusion flag instead of the score
            k = rnd.choice(["gov_employee", "owns_vehicle", "tax_filer", "high_phone_bill"])
            flags[k] = True
            seen[k] = True
            true_pmt = rnd.uniform(2, cutoff - 8)
            obs_pmt = round(true_pmt, 1)
        if cat == "clearly_eligible":
            if rnd.random() < 0.015:                                 # hidden: a flag the data missed (true, but not in `seen`)
                flags[rnd.choice(["gov_employee", "owns_vehicle", "tax_filer"])] = True
            if rnd.random() < 0.006:
                impostor = True                                      # an impostor whose record matches: the dangerous case
            elif rnd.random() < 0.04:
                band = "MAYBE"
            blurry = rnd.random() < 0.04
            missing_doc = rnd.random() < 0.02
            if rnd.random() < 0.01:
                changed = rnd.choice([3, 10, 20])
        elif cat == "clearly_ineligible":
            band = rnd.choices(["SAME", "MAYBE"], [0.9, 0.1])[0]
            blurry = rnd.random() < 0.05
        elif cat == "borderline":
            band = rnd.choices(["SAME", "MAYBE"], [0.85, 0.15])[0]
            blurry = rnd.random() < 0.05
        elif cat == "bad_data":
            problem = rnd.choice(["blurry", "missing_doc", "maybe", "no_score", "cnic", "expired", "payout_changed",
                                  "members", "deceased", "dup", "shared", "maybe2"])
            blurry = problem == "blurry"
            missing_doc = problem == "missing_doc"
            band = "MAYBE" if problem in ("maybe", "maybe2") else "SAME"
            if problem == "no_score":
                obs_pmt = None
            cnic_ok = problem != "cnic"
            expired = problem == "expired"
            changed = rnd.choice([2, 7, 15]) if problem == "payout_changed" else None
            members_missing = problem == "members"
            deceased = problem == "deceased"
            dup = problem == "dup"
            shared = problem == "shared"
            if rnd.random() < 0.05:
                band = "DIFFERENT"
        else:  # scam
            what = rnd.choice(["scam", "edited", "helper", "shared"])
            scam, edited, helper_owned, shared = what == "scam", what == "edited", what == "helper", what == "shared"

        doc_conf = max(0.05, min(1.0, rnd.gauss(0.85, 0.08) - (0.45 if blurry else 0.0) - (0.1 if edited else 0.0)))
        idscore = {"SAME": rnd.uniform(0.88, 1.0), "MAYBE": rnd.uniform(0.45, 0.8), "DIFFERENT": rnd.uniform(0.0, 0.3)}[band]

        true_excl = any(flags.values())
        fraud_like = (not cnic_ok) or deceased or dup or shared or helper_owned or scam or edited or impostor
        truth = (not true_excl) and true_pmt <= cutoff and not fraud_like
        if cat == "bad_data" and (obs_pmt is None or expired):
            truth = rnd.random() < 0.5       # unknowable from the data we have
        if cat == "bad_data" and band == "DIFFERENT":
            truth = False

        facts = make_facts({
            "person": {"gender": rnd.choice(["F", "M"]), "cnic_valid": cnic_ok, "cnic_expired": expired,
                       "deceased": deceased, "age": rnd.randint(18, 80)},
            "household": {"size_match": True, "pmt_score": obs_pmt, "members": None if members_missing else rnd.randint(1, 10), "flags": seen},
            "payout": {"shared_with_other_households": shared,
                       "changed_within_days": changed if changed is not None else (rnd.choice([90, 200]) if rnd.random() < 0.2 else None),
                       "owner_is_helper": helper_owned},
            "doc": {"required_missing": missing_doc, "any_blurry": blurry, "any_edited": edited, "min_confidence": round(doc_conf, 3)},
            "identity": {"band": band, "score": round(idscore, 3), "duplicate": dup},
            "claim": {"amount": 13500, "ask_more_count": 0},
            "consent": {"active": True, "detail": "synthetic consent"},
            "scam": {"flag": scam},
        })
        out.append({"id": f"syn-{seed}-{i}", "facts": facts, "cutoff": cutoff, "truth_eligible": bool(truth),
                    "true_pmt": round(true_pmt, 1), "category": cat, "synthetic": True})
    return out
