"""Threshold-versus-cost curve (GET /policy/cost-curve). Preview only.

Computed on a held-out SYNTHETIC case set (seed 424242), so it shows how the maths behaves, not
how real households would be treated.
Cost at an approve line L: every case with p >= L is approved (a wrong one costs wrong_approve),
every other case goes to a person (costs review; the person is assumed correct).
The naive baseline "approve above 0.5, reject below" has no humans and pays for every mistake.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np

from .model import feature_vector, get_model
from .policy import Costs, approve_line, reject_line
from .synth import generate_cases

GRID = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.97, 0.98, 0.99, 0.995, 0.999]


@lru_cache(maxsize=1)
def eval_predictions(n: int = 3000, seed: int = 424242) -> tuple[np.ndarray, np.ndarray]:
    m = get_model()
    cases = generate_cases(n, seed)
    X = np.array([feature_vector(c["facts"], c["cutoff"]) for c in cases])
    p = m.predict_vec(X)
    y = np.array([c["truth_eligible"] for c in cases])
    return p, y


def cost_at(line: float, p: np.ndarray, y: np.ndarray, c: Costs) -> dict:
    approve = p >= line
    wrong = int((approve & ~y).sum())
    humans = int((~approve).sum())
    return {"line": round(float(line), 4), "auto_approved": int(approve.sum()), "wrong_approvals": wrong,
            "to_human": humans, "total_cost": round(wrong * c.wrong_approve + humans * c.review, 2)}


def cost_curve(costs: Costs) -> dict:
    p, y = eval_predictions()
    a_line = approve_line(costs)
    lines = sorted(set(GRID + [round(a_line, 4)]))
    points = [cost_at(L, p, y, costs) for L in lines]
    best = min(points, key=lambda r: r["total_cost"])
    chosen = cost_at(a_line, p, y, costs)
    naive_fp = int(((p >= 0.5) & ~y).sum())
    naive_fn = int(((p < 0.5) & y).sum())
    naive = {"rule": "approve above 0.5, reject below", "wrong_approvals": naive_fp, "wrong_rejections": naive_fn,
             "total_cost": round(naive_fp * costs.wrong_approve + naive_fn * costs.wrong_reject, 2)}
    return {"synthetic": True, "cases": int(len(p)), "costs": costs.model_dump(), "approve_line": a_line,
            "reject_line": reject_line(costs), "points": points, "chosen": chosen, "lowest_cost_point": best,
            "naive_baseline": naive,
            "note": "Preview only. Computed on synthetic test cases. Auto-reject stays off unless an admin switches it on."}
