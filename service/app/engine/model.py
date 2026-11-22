"""p_eligible: a small calibrated logistic regression on the check results.

HONEST LIMIT: trained on SYNTHETIC cases made by synth.py. The numbers show the machinery
works. They say nothing about how it would do on real households.
"""
from __future__ import annotations

import hashlib
import logging
from functools import lru_cache

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression

from ..paths import models_dir
from .facts import flags_count, missing_count
from .jsonlogic import get_var

log = logging.getLogger("sahara.model")

FEATURES = ["id_same", "id_maybe", "id_diff", "id_score", "id_known", "doc_conf", "doc_blurry", "doc_edited",
            "doc_missing", "pmt_margin", "pmt_missing", "flags", "payout_risk", "cnic_bad", "deceased", "scam",
            "duplicate", "missing_fields", "any_visible_problem", "pmt_clear_below", "pmt_clear_above"]
TRAIN_N = 12000
TRAIN_SEED = 20261121
FEATURE_SET = "v1"


def _recent(days) -> bool:
    return isinstance(days, (int, float)) and not isinstance(days, bool) and days <= 30


def feature_vector(facts: dict, cutoff: float) -> np.ndarray:
    """Turn facts into numbers. cutoff comes from the ACTIVE rule set so a rule change moves p too."""
    band = get_var(facts, "identity.band")
    idscore = get_var(facts, "identity.score")
    pmt = get_var(facts, "household.pmt_score")
    conf = get_var(facts, "doc.min_confidence")
    req = get_var(facts, "doc.required_missing")
    pmt_ok = isinstance(pmt, (int, float)) and not isinstance(pmt, bool)
    x = [
        1.0 if band == "SAME" else 0.0,
        1.0 if band == "MAYBE" else 0.0,
        1.0 if band == "DIFFERENT" else 0.0,
        float(idscore) if isinstance(idscore, (int, float)) else 0.5,
        1.0 if band else 0.0,
        float(conf) if isinstance(conf, (int, float)) else 0.7,
        1.0 if get_var(facts, "doc.any_blurry") else 0.0,
        1.0 if get_var(facts, "doc.any_edited") else 0.0,
        1.0 if req else 0.0,
        float(np.clip((cutoff - pmt) / 15.0, -2.5, 2.5)) if pmt_ok else 0.0,
        0.0 if pmt_ok else 1.0,
        float(flags_count(facts)),
        1.0 if (get_var(facts, "payout.shared_with_other_households") or get_var(facts, "payout.owner_is_helper")
                or _recent(get_var(facts, "payout.changed_within_days"))) else 0.0,
        1.0 if (get_var(facts, "person.cnic_valid") is False or get_var(facts, "person.cnic_expired")) else 0.0,
        1.0 if get_var(facts, "person.deceased") else 0.0,
        1.0 if get_var(facts, "scam.flag") else 0.0,
        1.0 if get_var(facts, "identity.duplicate") else 0.0,
        float(missing_count(facts)) / 7.0,
    ]
    # one summary flag: any visible problem at all (lets a linear model separate clean cases sharply)
    x.append(1.0 if (x[6] or x[7] or x[8] or x[12] or x[13] or x[14] or x[15] or x[16] or x[2] or x[1] or x[11]) else 0.0)
    d = (cutoff - pmt) if pmt_ok else 0.0
    x.append(1.0 if (pmt_ok and d > 6) else 0.0)
    x.append(1.0 if (pmt_ok and d < -6) else 0.0)
    return np.array(x, dtype=float)


class ProbModel:
    def __init__(self, clf, version: str, meta: dict) -> None:
        self.clf = clf
        self.version = version
        self.meta = meta

    def predict_vec(self, X: np.ndarray) -> np.ndarray:
        X = np.atleast_2d(X)
        p = self.clf.predict_proba(X)[:, 1]
        return np.clip(p, 0.001, 0.999)

    def predict(self, facts: dict, cutoff: float) -> float:
        return float(self.predict_vec(feature_vector(facts, cutoff))[0])


def _version() -> str:
    h = hashlib.sha256(f"{FEATURE_SET}|{TRAIN_N}|{TRAIN_SEED}|{','.join(FEATURES)}".encode()).hexdigest()[:8]
    return f"logreg-synth-{FEATURE_SET}-{h}"


def train() -> ProbModel:
    from .synth import generate_cases  # local import: synth does not import this module, but keep it lazy

    cases = generate_cases(TRAIN_N, TRAIN_SEED)
    X = np.array([feature_vector(c["facts"], c["cutoff"]) for c in cases])
    y = np.array([1 if c["truth_eligible"] else 0 for c in cases])
    base = LogisticRegression(C=100.0, max_iter=2000, random_state=TRAIN_SEED)
    clf = CalibratedClassifierCV(base, method="isotonic", cv=5)
    clf.fit(X, y)
    meta = {"trained_on": len(cases), "synthetic": True, "positive_rate": float(y.mean()), "features": FEATURES,
            "seed": TRAIN_SEED}
    return ProbModel(clf, _version(), meta)


@lru_cache(maxsize=1)
def get_model() -> ProbModel:
    path = models_dir() / "prob_model.joblib"
    ver = _version()
    try:
        if path.exists():
            obj = joblib.load(path)
            if obj.get("version") == ver:
                return ProbModel(obj["clf"], ver, obj["meta"])
    except Exception as e:  # corrupt or old file: retrain
        log.warning("model file ignored: %s", type(e).__name__)
    m = train()
    try:
        models_dir().mkdir(parents=True, exist_ok=True)
        joblib.dump({"clf": m.clf, "version": m.version, "meta": m.meta}, path)
    except Exception as e:
        log.warning("could not save model: %s", type(e).__name__)
    return m
