"""Evaluation: honest numbers on SYNTHETIC data.

Run:  python -m app.eval.run      (from the service folder)

Everything here uses invented data written for this prototype. The numbers show the machinery
works and is repeatable. They do not show how it would do on real people or real SMS traffic.
"""
from __future__ import annotations

import json
import sys
import time
from collections import Counter
from pathlib import Path

import numpy as np

from ..docs import analyze as DA
from ..docs.samples import PIL_OK as SAMPLES_OK, make_sample
from ..engine.costcurve import cost_curve
from ..engine.decide import decide_safe, default_ruleset
from ..engine.model import get_model
from ..engine.policy import Costs
from ..engine.synth import generate_cases
from ..identity.match import match_records
from ..scam import classifier as SC
from ..scam import data as SD

DISCLAIMER = ("All data here is SYNTHETIC. These numbers show the machinery works. They do not show how it would "
              "perform on real people or real SMS traffic.")


def _prf(tp: int, fp: int, fn: int) -> dict:
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    return {"precision": None if p is None else round(p, 3), "recall": None if r is None else round(r, 3)}


def eval_scam() -> dict:
    rows = SD.HELD_OUT
    t = time.perf_counter()
    preds = [SC.check_message(r["text"], r["sender"]) for r in rows]
    ms = (time.perf_counter() - t) * 1000 / len(rows)
    labels = SC.LABELS
    cm = {a: {b: 0 for b in labels} for a in labels}
    for r, p in zip(rows, preds):
        cm[r["label"]][p["label"]] += 1
    # "flagged" = suspicious or scam. A real person wrongly flagged is a FALSE ALARM.
    tp = sum(1 for r, p in zip(rows, preds) if r["label"] == "scam" and p["label"] != "safe")
    fn = sum(1 for r, p in zip(rows, preds) if r["label"] == "scam" and p["label"] == "safe")
    fa = [(r, p) for r, p in zip(rows, preds) if r["label"] == "safe" and p["label"] != "safe"]
    fp_hard = sum(1 for r, p in zip(rows, preds) if r["label"] == "safe" and p["label"] == "scam")
    safe_n = sum(1 for r in rows if r["label"] == "safe")
    missed = [(r, p) for r, p in zip(rows, preds) if r["label"] == "scam" and p["label"] == "safe"]
    exact = sum(1 for r, p in zip(rows, preds) if r["label"] == p["label"]) / len(rows)
    flagged_scam = _prf(tp, len(fa), fn)
    return {
        "data": "held-out hand-written SYNTHETIC messages (different wording from the training templates)",
        "train_messages": SC.get_model().trained_on, "test_messages": len(rows),
        "confusion_matrix(true->predicted)": cm, "three_way_accuracy": round(exact, 3),
        "scam_flagged": flagged_scam,
        "false_alarm_rate_on_safe": round(len(fa) / safe_n, 3), "safe_messages": safe_n,
        "safe_called_scam": fp_hard, "scams_missed_as_safe": len(missed),
        "false_alarms": [{"text": r["text"][:120], "predicted": p["label"], "score": p["score"],
                          "reasons": [x["code"] for x in p["reasons"]]} for r, p in fa],
        "missed_scams": [{"text": r["text"][:120], "predicted": p["label"], "score": p["score"]} for r, p in missed],
        "ms_per_message": round(ms, 2), "model_version": SC.MODEL_VERSION,
        "cost_note": "A false alarm only shows a warning (warn, never block); a missed scam can cost a family a quarter's money.",
    }


def eval_decisions(n: int = 2000, seed: int = 777) -> dict:
    rs = default_ruleset()
    costs = rs.params.costs
    m = get_model()
    cases = generate_cases(n, seed)
    zones, results = Counter(), Counter()
    by_cat: dict = {}
    lat = []
    wrong_approve = wrong_reject = approved = 0
    cost_engine = 0.0
    naive_cost = 0.0
    ps, ys = [], []
    t = time.perf_counter()
    for c in cases:
        rs.params.cutoff = c["cutoff"]
        t1 = time.perf_counter()
        d = decide_safe(c["facts"], rs, m)
        lat.append((time.perf_counter() - t1) * 1000)
        zones[d.zone] += 1
        bc = by_cat.setdefault(c["category"], {"cases": 0, "AUTO": 0, "ASK_MORE": 0, "HUMAN": 0, "wrong_approvals": 0})
        bc["cases"] += 1
        bc[d.zone] += 1
        if d.result == "APPROVE" and not c["truth_eligible"]:
            bc["wrong_approvals"] += 1
        results[d.result] += 1
        truth = c["truth_eligible"]
        ps.append(d.p_eligible)
        ys.append(truth)
        if d.result == "APPROVE":
            approved += 1
            if not truth:
                wrong_approve += 1
                cost_engine += costs.wrong_approve
        elif d.result == "REJECT":
            if truth:
                wrong_reject += 1
                cost_engine += costs.wrong_reject
        elif d.zone == "ASK_MORE":
            cost_engine += costs.proof
        else:
            cost_engine += costs.review
        # naive baseline: approve if p >= 0.5, else reject, no humans
        if d.p_eligible >= 0.5 and not truth:
            naive_cost += costs.wrong_approve
        if d.p_eligible < 0.5 and truth:
            naive_cost += costs.wrong_reject
    secs = time.perf_counter() - t
    ps_a, ys_a = np.array(ps), np.array(ys, dtype=float)
    brier = float(np.mean((ps_a - ys_a) ** 2))
    bins = []
    for lo, hi in [(0, .1), (.1, .3), (.3, .5), (.5, .7), (.7, .9), (.9, .97), (.97, 1.0001)]:
        sel = (ps_a >= lo) & (ps_a < hi)
        if sel.sum():
            bins.append({"p_range": f"{lo:.2f}-{min(hi, 1):.2f}", "cases": int(sel.sum()),
                         "mean_p": round(float(ps_a[sel].mean()), 3), "actually_eligible": round(float(ys_a[sel].mean()), 3)})
    return {
        "data": f"{n} SYNTHETIC cases (seed {seed}), truth label hidden from the engine",
        "zones": dict(zones), "results": dict(results),
        "by_category": {k: {**v, "share_auto": round(v["AUTO"] / v["cases"], 3), "share_ask_more": round(v["ASK_MORE"] / v["cases"], 3),
                            "share_human": round(v["HUMAN"] / v["cases"], 3)} for k, v in sorted(by_cat.items())},
        "mix_note": "case mix is OUR assumption (see synth.DEFAULT_MIX); a different mix gives different shares",
        "latency_ms": {"p50": round(sorted(lat)[len(lat) // 2], 2), "p95": round(sorted(lat)[int(len(lat) * 0.95)], 2)},
        "share": {k: round(v / n, 3) for k, v in zones.items()},
        "auto_approved": approved, "wrong_approvals": wrong_approve,
        "wrong_approval_rate_among_auto": round(wrong_approve / approved, 4) if approved else None,
        "wrong_rejections": wrong_reject, "auto_reject_enabled": rs.params.auto_reject_enabled,
        "total_cost_engine": round(cost_engine, 1), "total_cost_naive_0.5_rule": round(naive_cost, 1),
        "brier_score": round(brier, 4), "calibration": bins,
        "ms_per_decision": round(secs * 1000 / n, 2), "model_version": m.version, "costs": costs.model_dump(),
    }


def eval_identity() -> dict:
    """Labelled pairs: same person written differently, and different people who look alike."""
    base = {"name": "Muhammad Aslam", "father": "S/O Nazeer Ahmed", "cnic": "4210190000211", "dob": "1985-04-12",
            "district": "Karachi East"}
    same = [
        ({"name": "Mohammad Aslam", "father": "S/O Nazir Ahmad", "cnic": "42101-9000021-1", "dob": "12/04/1985", "district": "Karachi East"}),
        ({"name": "Mohd Aslam", "father": "Nazeer Ahmad", "cnic": None, "dob": "12-04-1985", "district": "Karachi"}),
        ({"name": "Muhammed Aslam", "father": "S/O Nazir Ahmed", "cnic": "4210190000211", "dob": "1985", "district": None}),
        ({"name": "محمد اسلم", "father": None, "cnic": "4210190000211", "dob": "April 12, 1985", "district": "Karachi East"}),
        ({"name": "Mohamed Aslam", "father": "Nazeer Ahmed", "cnic": None, "dob": "12 Apr 1985", "district": "Karachi East"}),
    ]
    different = [
        {"name": "Mohd Aslam", "father": "S/O Nazeer Ahmad", "cnic": "4220190000221", "dob": "1985", "district": "Karachi West"},
        {"name": "Muhammad Aslam", "father": "S/O Rashid Mehmood", "cnic": None, "dob": "1990-01-01", "district": "Lahore"},
        {"name": "Muhammad Asif", "father": "S/O Nazeer Ahmed", "cnic": None, "dob": None, "district": "Karachi East"},
        {"name": "Muhammad Aslam", "father": None, "cnic": None, "dob": None, "district": None},
        {"name": "Ali Raza", "father": None, "cnic": "3520290000513", "dob": "1979", "district": "Lahore"},
    ]
    bands_same = Counter(match_records(base, s)["band"] for s in same)
    bands_diff = Counter(match_records(base, d)["band"] for d in different)
    return {
        "data": "10 labelled SYNTHETIC pairs (small; says so)",
        "same_person_pairs": dict(bands_same), "different_person_pairs": dict(bands_diff),
        "false_merges_in_SAME_band": bands_diff.get("SAME", 0),
        "same_person_called_DIFFERENT": bands_same.get("DIFFERENT", 0),
        "note": "A false merge (two different people called SAME) must be 0. MAYBE goes to a person.",
    }


def eval_docs() -> dict:
    if not (DA.PIL_OK and SAMPLES_OK):
        return {"available": False, "note": "Pillow is not installed: document image checks are unavailable"}
    plan = [("clean", "ok"), ("clean_png", "ok"), ("blurry", "ask_better_photo"), ("blurry_png", "ask_better_photo"),
            ("tiny", "ask_better_photo"), ("edited", "suspicious"), ("edited_software", "suspicious")]
    out, right, total = [], 0, 0
    for kind, want in plan:
        for seed in (1, 2, 3):
            v = DA.analyze_image(make_sample(kind, seed))["verdict"]
            total += 1
            right += v == want
            out.append((kind, v == want))
    return {"available": True, "data": f"{total} SYNTHETIC card images (tiny sample)", "verdict_matches_expected": f"{right}/{total}",
            "clean_called_suspicious": sum(1 for k, ok in out if k.startswith("clean") and not ok),
            "note": "ELA and metadata checks are heuristics tested on a handful of invented images."}


def run_all() -> dict:
    t = time.perf_counter()
    res = {"disclaimer": DISCLAIMER, "scam_classifier": eval_scam(), "decision_engine": eval_decisions(),
           "identity_matching": eval_identity(), "documents": eval_docs(),
           "cost_curve_default": cost_curve(Costs())}
    res["seconds"] = round(time.perf_counter() - t, 2)
    return res


if __name__ == "__main__":
    out = run_all()
    Path(__file__).resolve().parents[2].joinpath("eval_latest.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    s = out["scam_classifier"]
    d = out["decision_engine"]
    print(DISCLAIMER)
    print("SCAM  : 3-way accuracy", s["three_way_accuracy"], "| scam flagged", s["scam_flagged"], "| false-alarm rate on safe",
          s["false_alarm_rate_on_safe"], "| missed", s["scams_missed_as_safe"], "| ms/msg", s["ms_per_message"])
    print("        confusion", json.dumps(s["confusion_matrix(true->predicted)"]))
    print("ENGINE: zones", d["zones"], "| auto-approved", d["auto_approved"], "wrong", d["wrong_approvals"],
          "| cost engine", d["total_cost_engine"], "vs naive", d["total_cost_naive_0.5_rule"], "| brier", d["brier_score"],
          "| ms/decision", d["ms_per_decision"])
    for k, v in d["by_category"].items():
        print("   ", k, v)
    print("IDENT : false merges", out["identity_matching"]["false_merges_in_SAME_band"], out["identity_matching"])
    print("DOCS  :", out["documents"])
    sys.exit(0)
