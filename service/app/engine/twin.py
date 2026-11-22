"""Digital Twin: replay stored case fact-sets under a draft rule set and show what would change.

Preview only. Nothing is written. Cost uses the truth label when the case has one (synthetic or
labelled history); otherwise it uses the expected cost from p_eligible.
"""
from __future__ import annotations

from typing import Any

from .decide import DecisionCard, RuleSetData, decide_safe
from .model import ProbModel, get_model


def _cost(card: DecisionCard, truth: bool | None, costs: dict) -> float:
    wa, wr, rv, pf = costs["wrong_approve"], costs["wrong_reject"], costs["review"], costs["proof"]
    if card.result == "APPROVE":
        return wa if truth is False else (0.0 if truth is True else (1 - card.p_eligible) * wa)
    if card.result == "REJECT":
        return wr if truth is True else (0.0 if truth is False else card.p_eligible * wr)
    if card.zone == "ASK_MORE":
        return pf
    return rv


def prepare_history(facts: dict) -> dict:
    """Stored history facts have no consent/scam/duplicate keys: history cases were already consented, so fill them in."""
    from .facts import make_facts
    f = make_facts(facts or {})
    f["consent"] = {"active": True, "detail": "history case"}
    if f["household"].get("size_match") is None:
        f["household"]["size_match"] = True     # history cases were checked when they were made
    if f["scam"]["flag"] is None:
        f["scam"]["flag"] = False
    if f["identity"]["duplicate"] is None:
        f["identity"]["duplicate"] = False
    if f["payout"]["changed_within_days"] is not None and f["payout"]["changed_within_days"] >= 999:
        f["payout"]["changed_within_days"] = None
    return f


def replay(cases: list[dict], base: RuleSetData, draft: RuleSetData, model: ProbModel | None = None,
           max_examples: int = 8) -> dict[str, Any]:
    """cases: [{id, facts, truth_eligible (optional)}]. Facts keep their own data; only the rules change."""
    model = model or get_model()
    moves: dict[str, int] = {}
    changed = approvals_changed = 0
    before_cost = after_cost = 0.0
    examples: list[dict] = []
    for c in cases:
        facts = c.get("facts") or {}
        if c.get("history"):
            facts = prepare_history(facts)
        truth = c.get("truth_eligible")
        a = decide_safe(facts, base, model)
        b = decide_safe(facts, draft, model)
        before_cost += _cost(a, truth, base.params.costs.model_dump())
        after_cost += _cost(b, truth, draft.params.costs.model_dump())
        if (a.zone, a.result, a.reason_code) != (b.zone, b.result, b.reason_code):
            changed += 1
            if a.zone != b.zone:
                k = f"{a.zone}->{b.zone}"
                moves[k] = moves.get(k, 0) + 1
            if (a.result == "APPROVE") != (b.result == "APPROVE"):
                approvals_changed += 1
            if len(examples) < max_examples:
                examples.append({"case_id": c.get("id"),
                                 "before": {"zone": a.zone, "result": a.result, "reason_code": a.reason_code},
                                 "after": {"zone": b.zone, "result": b.result, "reason_code": b.reason_code},
                                 "pmt_score": (facts.get("household") or {}).get("pmt_score")})
    return {"cases": len(cases), "changed": changed, "moves": moves, "approvals_changed": approvals_changed,
            "cost_before": round(before_cost, 2), "cost_after": round(after_cost, 2), "examples": examples,
            "base_version": base.version, "draft_version": draft.version, "preview_only": True}
