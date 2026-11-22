"""Rule sets, validation, activation, Digital Twin, cost curve, evaluation, analytics."""
from __future__ import annotations

import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from .. import pipeline, ratelimit, service_writes as sw
from ..db import jsonb, user_tx
from ..deps import Principal, require
from ..engine import jsonlogic as J
from ..engine import reasons as R
from ..engine.costcurve import cost_curve, eval_predictions
from ..engine.decide import RuleDef, RuleSetData, decide_safe, default_ruleset
from ..engine.model import get_model
from ..engine.policy import Costs, RuleParams, approve_line
from ..engine.synth import generate_cases
from ..engine.twin import replay
from ..errors import ApiError

router = APIRouter()

# the variables the DATABASE accepts in a saved rule (CONTRACT section 6)
DB_VARS = frozenset(v for v in J.ALLOWED_VARS if not v.startswith(("params.", "consent.", "scam.")) and v != "identity.duplicate")


def _iso(v):
    return v.isoformat().replace("+00:00", "Z") if hasattr(v, "isoformat") else v


def _isuuid(s) -> bool:
    try:
        uuid.UUID(str(s))
        return True
    except ValueError:
        return False


def _set_out(r: dict, rules: list[dict] | None = None) -> dict:
    out = {"id": str(r["id"]), "version": r["version"], "name": r.get("name"), "status": r["status"], "params": r["params"],
           "checksum": r["checksum"], "parent_version": r["parent_version"],
           "created_by": str(r["created_by"]) if r["created_by"] else None, "created_at": _iso(r["created_at"]),
           "effective_from": _iso(r["effective_from"]), "effective_to": _iso(r["effective_to"])}
    if rules is not None:
        out["rules"] = rules
    return out


def _rules_of(cur, set_id) -> list[dict]:
    cur.execute("select id, code, expression, outcome, reason_code, reason_en, reason_ur from public.rules where rule_set_id = %s order by code", [set_id])
    return [{**r, "id": str(r["id"])} for r in cur.fetchall()]


@router.get("/rule-sets", tags=["rules"])
def list_sets(p: Principal = Depends(require("admin"))):
    with user_tx(p.id) as cur:
        cur.execute("select * from public.rule_sets order by version desc")
        return [_set_out(r) for r in cur.fetchall()]


@router.get("/rule-sets/{set_id}", tags=["rules"])
def get_set(set_id: str, p: Principal = Depends(require("admin"))):
    if not _isuuid(set_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select * from public.rule_sets where id = %s", [set_id])
        r = cur.fetchone()
        if not r:
            raise ApiError("NOT_FOUND")
        return _set_out(r, _rules_of(cur, set_id))


class RuleIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str = Field(min_length=1, max_length=60, pattern=r"^[A-Za-z0-9_\-]+$")
    expression: Any
    outcome: str = Field(pattern="^(PASS|HOLD|ASK_MORE)$")
    reason_code: str = Field(pattern=r"^R_[A-Z0-9_]+$")
    reason_en: str | None = Field(default=None, max_length=300)
    reason_ur: str | None = Field(default=None, max_length=300)


class NewSetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    parent_id: str | None = None
    params: dict[str, Any]
    rules: list[RuleIn] = Field(max_length=100)
    name: str | None = Field(default=None, max_length=80)


def _problems(params: dict | None, rules: list[RuleIn] | None, expression: Any = None, has_expr: bool = False) -> list[dict]:
    errs: list[dict] = []
    if params is not None:
        try:
            RuleParams.model_validate(params)
        except Exception as e:
            for x in getattr(e, "errors", lambda: [])():
                errs.append({"path": "params." + ".".join(str(l) for l in x["loc"]), "message": x["msg"]})
            if not errs:
                errs.append({"path": "params", "message": "not valid"})
        else:
            if params.get("amount", 0) > params.get("payout_cap", 10**12):
                errs.append({"path": "params.amount", "message": "The amount cannot be higher than the payout cap."})
    if has_expr:
        try:
            J.validate(expression, DB_VARS)
        except J.RuleError as e:
            errs.append({"path": "expression", "message": str(e)})
    seen = set()
    for i, r in enumerate(rules or []):
        if r.code in seen:
            errs.append({"path": f"rules.{i}.code", "message": "Two rules have the same code."})
        seen.add(r.code)
        try:
            J.validate(r.expression, DB_VARS)
        except J.RuleError as e:
            errs.append({"path": f"rules.{i}.expression", "message": str(e)})
        if not R.is_known(r.reason_code):
            errs.append({"path": f"rules.{i}.reason_code", "message": "Unknown reason code (see shared/reasons.json)."})
    return errs


def _dry_run(params: dict | None, rules: list[RuleIn] | None) -> dict:
    """Run 20 synthetic cases through the candidate rules to be sure nothing crashes."""
    rs = default_ruleset()
    if params:
        rs.params = RuleParams.model_validate(params)
    if rules is not None:
        rs.rules = [RuleDef(code=r.code, expression=r.expression, outcome=r.outcome, reason_code=r.reason_code) for r in rules]
    counts: dict[str, int] = {}
    for c in generate_cases(20, 99):
        d = decide_safe(c["facts"], rs, get_model())
        counts[d.zone] = counts.get(d.zone, 0) + 1
    return {"cases": 20, "zones": counts, "synthetic": True}


class ValidateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    params: dict[str, Any] | None = None
    rules: list[RuleIn] | None = None
    expression: Any = None


@router.post("/rules/validate", tags=["rules"])
def validate_rules(body: ValidateIn, p: Principal = Depends(require("admin"))):
    errs = _problems(body.params, body.rules, body.expression, "expression" in body.model_fields_set)
    out: dict = {"ok": not errs, "errors": errs}
    if not errs and (body.params or body.rules is not None):
        out["dry_run"] = _dry_run(body.params, body.rules)
    return out


@router.post("/rule-sets", tags=["rules"])
def new_set(body: NewSetIn, p: Principal = Depends(require("admin"))):
    errs = _problems(body.params, body.rules)
    if errs:
        raise ApiError("VALIDATION", message="The rule set has problems.", details={"errors": errs})
    full = RuleParams.model_validate(body.params).model_dump()
    rules = []
    for r in body.rules:
        d = R.decision_reasons().get(r.reason_code, {})
        rules.append({"code": r.code, "expression": r.expression, "outcome": r.outcome, "reason_code": r.reason_code,
                      "reason_en": r.reason_en or d.get("en", ""), "reason_ur": r.reason_ur or d.get("ur", "")})
    with user_tx(p.id) as cur:
        parent_version = None
        if body.parent_id:
            if not _isuuid(body.parent_id):
                raise ApiError("NOT_FOUND")
            cur.execute("select version from public.rule_sets where id = %s", [body.parent_id])
            pr = cur.fetchone()
            if not pr:
                raise ApiError("NOT_FOUND")
            parent_version = pr["version"]
        cur.execute("select app.create_rule_set(%s,%s,%s,%s) as id", [jsonb(full), jsonb(rules), parent_version, body.name])
        sid = cur.fetchone()["id"]
        cur.execute("select * from public.rule_sets where id = %s", [sid])
        r = cur.fetchone()
        return _set_out(r, _rules_of(cur, sid))


class ActivateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rule_set_id: str


@router.post("/rules/activate", tags=["rules"])
def activate(body: ActivateIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(body.rule_set_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:   # the admin themselves activates: the database checks the role and the diary names the admin
        cur.execute("select app.activate_rule_set(%s) as r", [body.rule_set_id])
        cur.fetchone()
        cur.execute("select * from public.rule_sets where id = %s", [body.rule_set_id])
        r = cur.fetchone()
        return _set_out(r, _rules_of(cur, body.rule_set_id))


class TwinIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rule_set_id: str
    limit: int = Field(default=500, ge=1, le=2000)


@router.post("/rules/twin", tags=["rules"])
def twin(body: TwinIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(body.rule_set_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select * from public.rule_sets where id = %s", [body.rule_set_id])
        r = cur.fetchone()
        if not r:
            raise ApiError("NOT_FOUND")
        draft = sw.rs_from_row(r, [RuleDef(**x) for x in [{k: v for k, v in y.items() if k != "id"} for y in _rules_of(cur, body.rule_set_id)]])
        cur.execute("select case_id, truth, facts from public.labelled_cases limit %s", [body.limit])
        cases = [{"id": str(x["case_id"]), "facts": x["facts"], "truth_eligible": x["truth"] == "eligible", "history": True}
                 for x in cur.fetchall()]
    got = sw.fetch_rule_set()
    base = got[1] if got else default_ruleset()
    source = "labelled history cases"
    if len(cases) < body.limit:     # top up with synthetic cases and say so
        extra = generate_cases(body.limit - len(cases), 4242, cutoffs=(base.params.cutoff,))
        cases += [{"id": c["id"], "facts": c["facts"], "truth_eligible": c["truth_eligible"]} for c in extra]
        source += " + synthetic top-up"
    out = replay(cases, base, draft, get_model())
    out["source"] = source
    return out


@router.get("/policy/cost-curve", tags=["policy"])
def curve(wrong_approve: float = 100, wrong_reject: float = 20, review: float = 3, proof: float = 1,
          p: Principal = Depends(require("admin"))):
    try:
        c = Costs(wrong_approve=wrong_approve, wrong_reject=wrong_reject, review=review, proof=proof)
    except Exception:
        raise ApiError("VALIDATION", message="The wrong-approval cost must be larger than the review cost, and all costs positive.")
    out = cost_curve(c)
    pts = [{"approve_line": x["line"], "expected_cost": x["total_cost"], **x} for x in out["points"]]
    out["points"] = pts
    out["min"] = {"approve_line": out["lowest_cost_point"]["line"], "expected_cost": out["lowest_cost_point"]["total_cost"]}
    out["current"] = {"approve_line": out["chosen"]["line"], "expected_cost": out["chosen"]["total_cost"]}
    out["costs"] = c.model_dump()
    return out


# ---------------------------------------------------------------- evaluation and analytics
@router.post("/eval/run", tags=["evaluation"])
def eval_run(p: Principal = Depends(require("admin"))):
    ratelimit.check("eval", p.id, 6)
    from ..eval import run as ev
    full = ev.run_all()
    d, s = full["decision_engine"], full["scam_classifier"]
    labels = list(s["confusion_matrix(true->predicted)"].keys())
    matrix = [[s["confusion_matrix(true->predicted)"][a][b] for b in labels] for a in labels]
    n = int(sum(sum(r) for r in matrix))
    web = {"n": d["zones"] and sum(d["zones"].values()), "accuracy": round(1 - d["wrong_approvals"] / max(1, sum(d["zones"].values())), 4),
           "auto_rate": d["share"].get("AUTO", 0.0), "human_rate": d["share"].get("HUMAN", 0.0),
           "ask_more_rate": d["share"].get("ASK_MORE", 0.0),
           "confusion": {"labels": labels, "matrix": matrix, "what": f"scam classifier, {n} held-out SYNTHETIC messages"},
           "false_alarms": [{"case": f["text"], "truth": "safe", "predicted": f["predicted"], "note": ", ".join(f["reasons"]) or "no reason code"}
                            for f in s["false_alarms"]],
           "speed": {"p50_ms": d["latency_ms"]["p50"], "p95_ms": d["latency_ms"]["p95"], "per_case_ms": d["ms_per_decision"]},
           "cost": d["total_cost_engine"], "notes": full["disclaimer"]}
    got = sw.fetch_rule_set()
    rid = sw.store_eval_run(p.id, {"web": web, "full": full}, got[0] if got else None, d["model_version"], [])
    return {"run_id": rid, **web}


@router.get("/eval/latest", tags=["evaluation"])
def eval_latest(p: Principal = Depends(require("admin"))):
    with user_tx(p.id) as cur:
        cur.execute("select id, created_at, metrics from public.eval_runs where metrics ? 'web' order by created_at desc limit 1")
        r = cur.fetchone()
    if not r:
        raise ApiError("NOT_FOUND", message="No evaluation has been run yet. Run one first (POST /eval/run).")
    return {"run_id": str(r["id"]), "created_at": _iso(r["created_at"]), **r["metrics"]["web"], "full": r["metrics"]["full"]}


@router.get("/analytics/summary", tags=["evaluation"])
def analytics(p: Principal = Depends(require("admin"))):
    out = sw.analytics()
    st = pipeline.latency_stats()
    out["avg_decision_ms"] = st["avg"]
    return out
