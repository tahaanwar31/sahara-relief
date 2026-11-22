"""The decision engine: hard rules, rule-set rules, checks, probability, zone, explanation.

Order of thought (CONTRACT section 7):
 1. No consent -> stop. Nothing else is read.
 2. Hard rules and the active rule set run FIRST. A high score never beats them.
 3. The probability model gives p_eligible. It is one input among several.
 4. Any two disagreeing checks send the case to a person.
 5. AUTO + APPROVE only if p >= approve_line, no rule fired, no check is unsure or failing.
 6. Below reject_line the case goes to a person ("likely not eligible") unless auto-reject is
    switched on in the rule set. It is OFF by default.
Every decision has a zone, a result and a reason code from shared/reasons.json. Never empty.
"""
from __future__ import annotations

import copy
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field

from . import llm as llm_mod
from . import reasons as R
from .facts import flags_count, make_facts, missing_count
from .jsonlogic import RuleError, evaluate, get_var, truthy, validate
from .model import ProbModel, get_model
from .policy import Costs, RuleParams, lines

Zone = Literal["AUTO", "ASK_MORE", "HUMAN"]
Result = Literal["APPROVE", "HOLD", "ASK_PROOF", "HUMAN_REVIEW", "REJECT"]


# ---- data shapes -------------------------------------------------------------------
class RuleDef(BaseModel):
    code: str
    expression: Any
    outcome: Literal["PASS", "HOLD", "ASK_MORE"] = "HOLD"
    reason_code: str = "R_EXCLUSION_HIT"
    reason_en: str | None = None
    reason_ur: str | None = None


class RuleSetData(BaseModel):
    id: str | None = None
    version: int = 1
    checksum: str | None = None
    params: RuleParams = RuleParams()
    rules: list[RuleDef] = Field(default_factory=list)


class Check(BaseModel):
    name: str
    verdict: Literal["pass", "fail", "unsure", "skip"]
    confidence: float = Field(ge=0, le=1)
    detail: str = ""
    reason_code: str | None = None


class NextStep(BaseModel):
    type: Literal["release_payment", "upload", "human", "stop"]
    doc_type: str | None = None
    second_approver_required: bool = False


class DecisionCard(BaseModel):
    decision_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    actor_type: Literal["ai"] = "ai"
    zone: Zone
    result: Result
    reason_code: str
    confidence: float = Field(ge=0, le=1)
    p_eligible: float = Field(ge=0, le=1)
    rule_version: int
    rule_checksum: str
    model_version: str
    checks: list[Check]
    explain_citizen: dict[str, str]
    trace: list[dict]
    next_step: NextStep
    case_notes_id: str | None = None
    costs_used: dict[str, float]
    approve_line: float
    reject_line: float


# Exclusion rules used when the caller supplies no rules (mirrors the seeded rule set v1).
DEFAULT_RULES: list[RuleDef] = [
    RuleDef(code="EXCL_GOV_EMPLOYEE", expression={"==": [{"var": "household.flags.gov_employee"}, True]}, outcome="HOLD"),
    RuleDef(code="EXCL_OWNS_VEHICLE", expression={"==": [{"var": "household.flags.owns_vehicle"}, True]}, outcome="HOLD"),
    RuleDef(code="EXCL_TAX_FILER", expression={"==": [{"var": "household.flags.tax_filer"}, True]}, outcome="HOLD"),
    RuleDef(code="EXCL_FOREIGN_TRIPS", expression={"or": [{"==": [{"var": "household.flags.foreign_trips"}, True]}, {">": [{"var": "household.flags.foreign_trips"}, 1]}]}, outcome="HOLD"),
    RuleDef(code="EXCL_HIGH_PHONE_BILL", expression={"==": [{"var": "household.flags.high_phone_bill"}, True]}, outcome="HOLD"),
]


def default_ruleset() -> RuleSetData:
    rs = RuleSetData(version=1, params=RuleParams(), rules=list(DEFAULT_RULES))
    rs.checksum = rule_checksum(rs.params, rs.rules)
    return rs


def rule_checksum(params: RuleParams, rules: list[RuleDef]) -> str:
    body = json.dumps({"params": params.model_dump(), "rules": [r.model_dump(exclude={"reason_en", "reason_ur"}) for r in
                                                                 sorted(rules, key=lambda r: r.code)]},
                      sort_keys=True, separators=(",", ":"))
    return "sha256-" + hashlib.sha256(body.encode()).hexdigest()


# Hard rules in code: (name, reason code, outcome). They cannot be edited away by a rule set.
# Priority order for choosing the reason shown (earlier = more serious).
# which parts of the card disagree with the record -> the reason shown
CARD_REASON = {frozenset({"number"}): "R_CARD_NUMBER_MISMATCH", frozenset({"name"}): "R_CARD_NAME_MISMATCH", frozenset({"face"}): "R_CARD_FACE_MISMATCH",
               frozenset({"name", "number"}): "R_CARD_BOTH_MISMATCH", frozenset({"face", "number"}): "R_CARD_FACE_NUMBER_MISMATCH",
               frozenset({"face", "name"}): "R_CARD_FACE_NAME_MISMATCH", frozenset({"face", "name", "number"}): "R_CARD_ALL_MISMATCH"}
PRIORITY = ["R_CONSENT_MISSING", "R_DECEASED", "R_DUPLICATE_IDENTITY", "R_SCAM_FLAG", "R_DOC_EDITED", "R_CNIC_EXPIRED", "R_ID_NOT_YOURS", "R_HOUSEHOLD_MISMATCH", "R_HOUSEHOLD_NOT_CHECKED",
            "R_PAYOUT_ACCOUNT_SHARED", "R_PAYOUT_ACCOUNT_CHANGED", "R_PAYOUT_HELPER_OWNED", "R_PAYOUT_OVER_CAP",
            "R_CARD_ALL_MISMATCH", "R_CARD_FACE_NUMBER_MISMATCH", "R_CARD_FACE_NAME_MISMATCH", "R_CARD_BOTH_MISMATCH", "R_CARD_FACE_MISMATCH",
            "R_CARD_NUMBER_MISMATCH", "R_CARD_NAME_MISMATCH", "R_NAME_AMBIGUOUS", "R_EXCLUSION_HIT", "R_PMT_MISSING", "R_PMT_ABOVE_CUTOFF", "R_PMT_BORDERLINE",
            "R_MISSING_FIELDS", "R_CHECKS_DISAGREE", "R_LIKELY_NOT_ELIGIBLE", "R_LOW_CONFIDENCE"]
ASK_PRIORITY = ["R_CNIC_INVALID", "R_CARD_UNREADABLE", "R_DOC_MISSING", "R_DOC_BLURRY", "R_DOC_LOW_CONFIDENCE"]


def _rank(code: str) -> int:
    return PRIORITY.index(code) if code in PRIORITY else 50


def _num(x: Any) -> float | None:
    return float(x) if isinstance(x, (int, float)) and not isinstance(x, bool) else None


def _changed_recently(f: dict, days: int) -> bool:
    d = _num(get_var(f, "payout.changed_within_days"))
    return d is not None and d <= days


def _confidence_pass(dist: float, band: float) -> float:
    return round(min(1.0, 0.5 + dist / (4 * band + 1e-9)), 3) if band > 0 else (1.0 if dist > 0 else 0.5)


# ---- the engine ----------------------------------------------------------------------
def decide(facts: dict, rs: RuleSetData | None = None, model: ProbModel | None = None, case_id: str | None = None,
           llm_raw: Callable[[dict], Any] | None = None) -> DecisionCard:
    """Run one decision. `facts` follows CONTRACT section 6. Never raises on odd facts."""
    rs = rs or default_ruleset()
    if rs.checksum is None:
        rs = rs.model_copy(update={"checksum": rule_checksum(rs.params, rs.rules)})
    p = rs.params
    costs: Costs = p.costs
    approve_line, reject_line = lines(costs)
    f = make_facts(facts)  # defaults for anything not supplied; keeps unknown as None
    f["params"] = {"cutoff": p.cutoff, "borderline_band": p.borderline_band, "amount": p.amount,
                   "payout_cap": p.payout_cap, "second_approver_over": p.second_approver_over}
    model = model or get_model()
    trace: list[dict] = []
    checks: list[Check] = []

    def step(what: str, **kw: Any) -> None:
        trace.append({"step": len(trace) + 1, "what": what, **kw})

    def card(zone: Zone, result: Result, reason: str, confidence: float, p_elig: float, next_step: NextStep) -> DecisionCard:
        if not R.is_known(reason):
            reason = "R_LOW_CONFIDENCE"
        return DecisionCard(
            zone=zone, result=result, reason_code=reason, confidence=round(max(0.0, min(1.0, confidence)), 4),
            p_eligible=round(max(0.0, min(1.0, p_elig)), 4), rule_version=rs.version, rule_checksum=rs.checksum or "",
            model_version=model.version, checks=checks, explain_citizen=R.explain(reason), trace=trace,
            next_step=next_step, case_id=case_id, costs_used=costs.model_dump(),
            approve_line=approve_line, reject_line=reject_line)

    # 1. consent gate: nothing else is read
    consent_ok = bool(get_var(f, "consent.active"))
    step("hard_rule", rule="NO_CONSENT", fired=not consent_ok)
    if not consent_ok:
        checks.append(Check(name="consent", verdict="fail", confidence=1.0, detail="no active consent",
                            reason_code="R_CONSENT_MISSING"))
        return card("HUMAN", "HOLD", "R_CONSENT_MISSING", 1.0, 0.0, NextStep(type="stop"))
    checks.append(Check(name="consent", verdict="pass", confidence=1.0, detail=str(get_var(f, "consent.detail") or "active consent")))

    fired: list[dict] = []  # {code, reason, outcome, rule}

    def fire(rule: str, reason: str, outcome: str, **kw: Any) -> None:
        fired.append({"rule": rule, "reason": reason, "outcome": outcome, **kw})

    def hard(rule: str, cond: bool, reason: str, outcome: str, **kw: Any) -> None:
        step("hard_rule", rule=rule, fired=bool(cond), **kw)
        if cond:
            fire(rule, reason, outcome)

    # 2. hard rules (in code, always on)
    cnic_valid = get_var(f, "person.cnic_valid")
    hard("CNIC_INVALID", cnic_valid is False, "R_CNIC_INVALID", "ASK_MORE")
    hard("CNIC_EXPIRED", bool(get_var(f, "person.cnic_expired")), "R_CNIC_EXPIRED", "HOLD")
    hard("DECEASED", bool(get_var(f, "person.deceased")), "R_DECEASED", "HOLD")
    hard("DUPLICATE_IDENTITY", bool(get_var(f, "identity.duplicate")), "R_DUPLICATE_IDENTITY", "HOLD")
    amount = _num(get_var(f, "claim.amount"))
    hard("PAYOUT_OVER_CAP", amount is not None and amount > p.payout_cap, "R_PAYOUT_OVER_CAP", "HOLD")
    hard("PAYOUT_ACCOUNT_SHARED", bool(get_var(f, "payout.shared_with_other_households")), "R_PAYOUT_ACCOUNT_SHARED", "HOLD")
    hard("PAYOUT_ACCOUNT_CHANGED", _changed_recently(f, p.payout_change_days), "R_PAYOUT_ACCOUNT_CHANGED", "HOLD")
    hard("PAYOUT_HELPER_OWNED", bool(get_var(f, "payout.owner_is_helper")), "R_PAYOUT_HELPER_OWNED", "HOLD")
    hard("SCAM_FLAG", bool(get_var(f, "scam.flag")), "R_SCAM_FLAG", "HOLD")
    hard("DOC_EDITED", bool(get_var(f, "doc.any_edited")), "R_DOC_EDITED", "HUMAN")
    hard("DOC_MISSING", bool(get_var(f, "doc.required_missing")), "R_DOC_MISSING", "ASK_MORE")
    hard("DOC_BLURRY", bool(get_var(f, "doc.any_blurry")), "R_DOC_BLURRY", "ASK_MORE")
    dconf = _num(get_var(f, "doc.min_confidence"))
    hard("DOC_LOW_CONFIDENCE", dconf is not None and dconf < 0.5 and not get_var(f, "doc.any_blurry"),
         "R_DOC_LOW_CONFIDENCE", "ASK_MORE")
    # the card photo, read by computer vision, against the registry record (None = that part did not run)
    card_read = get_var(f, "card.read")
    face_found = get_var(f, "card.face_found")
    num_ok, name_ok, face_ok = get_var(f, "card.number_match"), get_var(f, "card.name_match"), get_var(f, "card.face_match")
    hard("CARD_UNREADABLE", card_read is False or face_found is False, "R_CARD_UNREADABLE", "ASK_MORE")
    bad = {"number": num_ok is False, "name": name_ok is False, "face": face_ok is False}
    bad_list = [k for k in ("face", "name", "number") if bad[k]]
    card_reason = CARD_REASON.get(frozenset(bad_list), "R_CARD_NAME_MISMATCH")
    card_what = " and ".join(bad_list) if len(bad_list) < 3 else "face, name and number"
    hard("HOUSEHOLD_MISMATCH", get_var(f, "household.size_match") is False, "R_HOUSEHOLD_MISMATCH", "HUMAN")
    hard("HOUSEHOLD_NOT_CHECKED", get_var(f, "household.size_match") is None, "R_HOUSEHOLD_NOT_CHECKED", "HUMAN")
    hard("ID_NOT_YOURS", bool(get_var(f, "identity.claimed_other")), "R_ID_NOT_YOURS", "HUMAN")
    hard("CARD_MISMATCH", bool(bad_list), card_reason, "HUMAN", mismatched=bad_list)
    band = get_var(f, "identity.band")
    hard("IDENTITY_NOT_SAME", band in ("MAYBE", "DIFFERENT"), "R_NAME_AMBIGUOUS", "HUMAN", band=band)
    miss = missing_count(f)
    hard("TOO_MANY_MISSING_FIELDS", miss > p.max_missing_fields, "R_MISSING_FIELDS", "HUMAN", missing=miss)
    # even one missing core field means a person looks (the hard rule above is for "too many"; this is "any")
    hard("ANY_MISSING_FIELD", 0 < miss <= p.max_missing_fields, "R_MISSING_FIELDS", "HUMAN", missing=miss)

    # 3. eligibility from the survey score and the active cutoff
    pmt = _num(get_var(f, "household.pmt_score"))
    if pmt is None:
        elig = Check(name="eligibility", verdict="unsure", confidence=0.0, detail="household score not found",
                     reason_code="R_PMT_MISSING")
        fire("PMT_MISSING", "R_PMT_MISSING", "HUMAN")
    else:
        dist = abs(pmt - p.cutoff)
        if dist <= p.borderline_band:
            elig = Check(name="eligibility", verdict="unsure", confidence=0.5,
                         detail=f"score {pmt:g} is close to the cutoff {p.cutoff:g} (only {abs(pmt - p.cutoff):g} points away)",
                         reason_code="R_PMT_BORDERLINE")
            fire("PMT_BORDERLINE", "R_PMT_BORDERLINE", "HUMAN")
        elif pmt > p.cutoff:
            elig = Check(name="eligibility", verdict="fail", confidence=_confidence_pass(dist - p.borderline_band, p.borderline_band),
                         detail=f"score {pmt:g} is {abs(pmt - p.cutoff):g} points above the cutoff {p.cutoff:g}", reason_code="R_PMT_ABOVE_CUTOFF")
            fire("PMT_ABOVE_CUTOFF", "R_PMT_ABOVE_CUTOFF", "HUMAN")
        else:
            elig = Check(name="eligibility", verdict="pass", confidence=_confidence_pass(dist - p.borderline_band, p.borderline_band),
                         detail=f"score {pmt:g} is {abs(pmt - p.cutoff):g} points below the cutoff {p.cutoff:g}, so eligible")
    step("check", name="eligibility", verdict=elig.verdict, detail=elig.detail)

    # 4. rule-set rules (admin-editable, versioned)
    rules = rs.rules if rs.rules is not None else []
    any_excl_data = flags_count(f) > 0 or any(v is not None for v in (get_var(f, "household.flags") or {}).values())
    for r in rules:
        try:
            validate(r.expression)
            hit = truthy(evaluate(r.expression, f))
            step("rule", rule=r.code, fired=bool(hit), outcome=r.outcome)
        except RuleError:
            # a broken rule must never be skipped silently: it sends the case to a person
            step("rule", rule=r.code, fired=True, outcome="HOLD", error="invalid expression")
            fire(r.code, "R_LOW_CONFIDENCE", "HOLD")
            continue
        if hit and r.outcome != "PASS":
            fire(r.code, r.reason_code if R.is_known(r.reason_code) else "R_EXCLUSION_HIT", r.outcome, source="rule_set")

    # 5. the remaining checks
    cnic_chk = (Check(name="cnic", verdict="fail", confidence=0.95, detail="CNIC format or expiry problem",
                      reason_code="R_CNIC_INVALID" if cnic_valid is False else "R_CNIC_EXPIRED")
                if (cnic_valid is False or get_var(f, "person.cnic_expired"))
                else Check(name="cnic", verdict="pass", confidence=1.0, detail="format valid, not expired")
                if cnic_valid is True else Check(name="cnic", verdict="unsure", confidence=0.3, detail="CNIC not checked"))
    checks.append(cnic_chk)
    score = _num(get_var(f, "identity.score"))
    if band == "SAME":
        checks.append(Check(name="identity_match", verdict="pass", confidence=round(score if score is not None else 0.9, 3), detail="same person"))
    elif band == "MAYBE":
        checks.append(Check(name="identity_match", verdict="unsure", confidence=round(score if score is not None else 0.5, 3),
                            detail="may be the same person", reason_code="R_NAME_AMBIGUOUS"))
    elif band == "DIFFERENT":
        checks.append(Check(name="identity_match", verdict="fail", confidence=round(1 - (score or 0.0), 3),
                            detail="looks like a different person", reason_code="R_NAME_AMBIGUOUS"))
    else:
        checks.append(Check(name="identity_match", verdict="unsure", confidence=0.3, detail="no identity match result"))
    checks.append(elig)
    flag_hits = [x["rule"] for x in fired if x.get("source") == "rule_set"]
    if flag_hits:
        checks.append(Check(name="exclusions", verdict="fail", confidence=0.9, detail="fired: " + ", ".join(flag_hits),
                            reason_code="R_EXCLUSION_HIT"))
    elif any_excl_data:
        checks.append(Check(name="exclusions", verdict="pass", confidence=0.9, detail="no exclusion flag"))
    else:
        checks.append(Check(name="exclusions", verdict="unsure", confidence=0.3, detail="no exclusion data"))
    doc_known = any(get_var(f, k) is not None for k in ("doc.any_edited", "doc.any_blurry", "doc.min_confidence", "doc.required_missing"))
    if not doc_known:
        checks.append(Check(name="documents", verdict="unsure", confidence=0.3, detail="no document information"))
    elif get_var(f, "doc.any_edited"):
        checks.append(Check(name="documents", verdict="fail", confidence=0.8, detail="edit signs found", reason_code="R_DOC_EDITED"))
    elif get_var(f, "doc.any_blurry") or get_var(f, "doc.required_missing") or (dconf is not None and dconf < 0.5):
        checks.append(Check(name="documents", verdict="unsure", confidence=round(dconf if dconf is not None else 0.3, 3),
                            detail="blurry, missing or low confidence", reason_code="R_DOC_LOW_CONFIDENCE"))
    else:
        checks.append(Check(name="documents", verdict="pass", confidence=round(dconf if dconf is not None else 0.7, 3), detail="documents readable"))
    if card_read is True or face_ok is not None:
        if bad_list:
            checks.append(Check(name="card_vs_record", verdict="fail", confidence=0.9, detail=f"the {card_what} on the card does not match the record",
                                reason_code=card_reason))
        else:
            ok_list = [x for x, v in (("face", face_ok), ("name", name_ok), ("number", num_ok)) if v is True]
            seen = ("face, name and number" if len(ok_list) == 3 else " and ".join(ok_list)) or "details"
            checks.append(Check(name="card_vs_record", verdict="pass", confidence=0.9, detail=f"the {seen} on the card match the record"))
    elif card_read is False or face_found is False:
        checks.append(Check(name="card_vs_record", verdict="unsure", confidence=0.3, detail="the card could not be read",
                            reason_code="R_CARD_UNREADABLE"))
    payout_known = any(get_var(f, k) is not None for k in ("payout.shared_with_other_households", "payout.owner_is_helper",
                                                              "payout.changed_within_days"))
    payout_bad = (get_var(f, "payout.shared_with_other_households") or get_var(f, "payout.owner_is_helper")
                  or _changed_recently(f, p.payout_change_days))
    checks.append(Check(name="payout_account", verdict="fail" if payout_bad else ("pass" if payout_known else "unsure"),
                        confidence=0.9 if payout_known else 0.3,
                        detail="shared, helper-owned or recently changed" if payout_bad else ("looks normal" if payout_known else "no account data"),
                        reason_code="R_PAYOUT_ACCOUNT_SHARED" if payout_bad else None))
    sc = get_var(f, "scam.flag")
    checks.append(Check(name="scam", verdict="fail" if sc else ("pass" if sc is False else "unsure"),
                        confidence=0.9 if sc is not None else 0.3, detail="scam flag" if sc else "no scam flag"))

    # 6. probability (one input; cannot beat hard rules)
    p_elig = model.predict(f, p.cutoff)
    if p_elig >= approve_line:
        mchk = Check(name="model", verdict="pass", confidence=round(p_elig, 3), detail=f"the model puts her chance of being eligible at {p_elig * 100:.0f}%, above the {approve_line * 100:.0f}% needed to approve without a person")
    elif p_elig <= reject_line:
        mchk = Check(name="model", verdict="fail", confidence=round(1 - p_elig, 3), detail=f"the model puts her chance of being eligible at only {p_elig * 100:.0f}% (below {reject_line * 100:.0f}%)")
    else:
        mchk = Check(name="model", verdict="unsure", confidence=round(max(p_elig, 1 - p_elig), 3),
                     detail=f"the model puts her chance of being eligible at {p_elig * 100:.0f}%, too unsure to decide alone", reason_code="R_LOW_CONFIDENCE")
    checks.append(mchk)
    step("model", p_eligible=round(p_elig, 4), approve_line=approve_line, reject_line=reject_line, version=model.version)

    # 7. optional language model: can only add doubt, never remove it
    if llm_raw is not None:
        try:
            raw = llm_raw(f)
        except Exception:
            raw = None
        if raw is not None:
            advice, why = llm_mod.parse_output(raw)
            if advice is None:
                checks.append(Check(name="llm_advice", verdict="unsure", confidence=0.0, detail=f"model output refused: {why}",
                                    reason_code="R_LOW_CONFIDENCE"))
                step("llm", ok=False, why=why)
            else:
                v = "fail" if advice.eligible_hint == "unlikely" else ("pass" if advice.eligible_hint == "likely" else "unsure")
                checks.append(Check(name="llm_advice", verdict=v, confidence=round(advice.confidence, 3), detail="advisory only"))
                step("llm", ok=True, hint=advice.eligible_hint)

    # 8. disagreement between independent checks
    by = {c.name: c for c in checks}
    voters = [by[n].verdict for n in ("identity_match", "eligibility", "documents", "model", "llm_advice") if n in by]
    disagree = "pass" in voters and "fail" in voters
    step("disagreement", fired=disagree, votes=voters)

    # 9. choose the outcome
    human = [x for x in fired if x["outcome"] in ("HOLD", "HUMAN")]
    ask = [x for x in fired if x["outcome"] == "ASK_MORE"]
    asked_before = int(get_var(f, "claim.ask_more_count") or 0)
    second = amount is not None and amount > p.second_approver_over

    def doc_for(reason: str) -> str:
        if reason == "R_DOC_BLURRY":
            lst = get_var(f, "doc.blurry_types")
        elif reason == "R_DOC_MISSING":
            lst = get_var(f, "doc.missing_types")
        else:
            lst = None
        return (lst[0] if isinstance(lst, list) and lst else None) or "cnic_front"

    if human:
        top = min(human, key=lambda x: _rank(x["reason"]))
        result: Result = "HOLD" if any(x["outcome"] == "HOLD" and x["reason"] == top["reason"] for x in human) else "HUMAN_REVIEW"
        step("zone", zone="HUMAN", because=top["rule"])
        return card("HUMAN", result, top["reason"], _human_conf(checks, p_elig), p_elig, NextStep(type="human", second_approver_required=second))
    if ask:
        top = min(ask, key=lambda x: ASK_PRIORITY.index(x["reason"]) if x["reason"] in ASK_PRIORITY else 9)
        if asked_before >= 2:  # two failed attempts in a row: a person takes over
            step("zone", zone="HUMAN", because="ASK_MORE_REPEATED", asked_before=asked_before)
            return card("HUMAN", "HUMAN_REVIEW", top["reason"], _human_conf(checks, p_elig), p_elig, NextStep(type="human"))
        step("zone", zone="ASK_MORE", because=top["rule"])
        return card("ASK_MORE", "ASK_PROOF", top["reason"], _human_conf(checks, p_elig), p_elig,
                    NextStep(type="upload", doc_type=doc_for(top["reason"])))
    if disagree:
        step("zone", zone="HUMAN", because="CHECKS_DISAGREE")
        return card("HUMAN", "HUMAN_REVIEW", "R_CHECKS_DISAGREE", _human_conf(checks, p_elig), p_elig, NextStep(type="human", second_approver_required=second))
    doubtful = [c for c in checks if c.verdict in ("unsure", "fail")]
    if doubtful and p_elig > reject_line:
        step("zone", zone="HUMAN", because="UNSURE_CHECK", checks=[c.name for c in doubtful])
        return card("HUMAN", "HUMAN_REVIEW", "R_LOW_CONFIDENCE", _human_conf(checks, p_elig), p_elig, NextStep(type="human", second_approver_required=second))
    if p_elig >= approve_line and not doubtful:
        if second:  # a big payment always needs two people
            step("zone", zone="HUMAN", because="SECOND_APPROVER_REQUIRED", amount=amount)
            return card("HUMAN", "HUMAN_REVIEW", "R_PAYOUT_OVER_CAP", p_elig, p_elig, NextStep(type="human", second_approver_required=True))
        step("zone", zone="AUTO", because="p_eligible >= approve_line")
        return card("AUTO", "APPROVE", "R_AUTO_APPROVED", p_elig, p_elig, NextStep(type="release_payment"))
    if p_elig <= reject_line:
        if p.auto_reject_enabled and not doubtful:
            step("zone", zone="AUTO", because="p_eligible <= reject_line and auto_reject_enabled")
            return card("AUTO", "REJECT", "R_LIKELY_NOT_ELIGIBLE", 1 - p_elig, p_elig, NextStep(type="stop"))
        step("zone", zone="HUMAN", because="below reject line, auto-reject is off")
        return card("HUMAN", "HUMAN_REVIEW", "R_LIKELY_NOT_ELIGIBLE", 1 - p_elig, p_elig, NextStep(type="human"))
    step("zone", zone="HUMAN", because="between the lines")
    return card("HUMAN", "HUMAN_REVIEW", "R_LOW_CONFIDENCE", _human_conf(checks, p_elig), p_elig, NextStep(type="human", second_approver_required=second))


def _human_conf(checks: list[Check], p_elig: float) -> float:
    """Confidence for a hand-off = how sure the system is about its own answer (lowest wins)."""
    base = max(p_elig, 1 - p_elig)
    weak = [c.confidence for c in checks if c.verdict == "unsure" and c.name != "model"]
    return min([base] + weak) if weak else base


# ---- the "I am not sure" package for officers --------------------------------------
def build_case_notes(card: DecisionCard, facts: dict, case_summary: dict | None = None) -> dict:
    """What an officer needs on one screen. Similar past cases are added by the service from the database."""
    f = make_facts(facts)
    fired = [t for t in card.trace if t.get("what") in ("hard_rule", "rule") and t.get("fired")]
    unsure = [c for c in card.checks if c.verdict in ("unsure", "fail")]
    why = R.explain(card.reason_code)["en"]
    missing: list[str] = []
    if get_var(f, "doc.required_missing"):
        missing.append("a required document")
    if get_var(f, "doc.any_blurry"):
        missing.append("a clearer photo")
    if get_var(f, "household.pmt_score") is None:
        missing.append("household survey score")
    if get_var(f, "identity.band") in ("MAYBE", None):
        missing.append("a second identifier (CNIC, date of birth or father's name)")
    return {
        "case_summary": case_summary or {"case_id": card.case_id},
        "inputs": {"household.pmt_score": {"value": get_var(f, "household.pmt_score"), "source": "mock NSER"},
                   "identity": {"band": get_var(f, "identity.band"), "score": get_var(f, "identity.score"), "source": "identity matcher"},
                   "documents": {"min_confidence": get_var(f, "doc.min_confidence"), "source": "document checks"},
                   "payout": {"shared": get_var(f, "payout.shared_with_other_households"), "source": "mock Raast"}},
        "checks": [c.model_dump() for c in card.checks],
        "what_fired": [{"rule": t.get("rule"), "step": t["step"]} for t in fired],
        "why_unsure": why + (" Doubtful checks: " + ", ".join(c.name for c in unsure) + "." if unsure else ""),
        "missing_proof": missing,
        "suggested_question": ("Can you send a clearer photo of your CNIC?" if get_var(f, "doc.any_blurry")
                               else "Can you confirm your father's or husband's name and date of birth?"),
        "similar_cases": [],
        "versions": {"rule_version": card.rule_version, "rule_checksum": card.rule_checksum, "model_version": card.model_version},
        "sla": "3 working days",
        "second_approver_required": card.next_step.second_approver_required,
    }


def decide_safe(facts: Any, rs: RuleSetData | None = None, model: ProbModel | None = None, case_id: str | None = None,
                llm_raw: Callable[[dict], Any] | None = None) -> DecisionCard:
    """decide(), but a crash inside the engine becomes a HUMAN hand-off, never a 500 or a silent guess."""
    try:
        return decide(facts if isinstance(facts, dict) else {}, rs, model, case_id, llm_raw)
    except Exception as e:  # pragma: no cover - defensive
        rs = rs or default_ruleset()
        a, r = lines(rs.params.costs)
        m = model or get_model()
        return DecisionCard(
            zone="HUMAN", result="HUMAN_REVIEW", reason_code="R_LOW_CONFIDENCE", confidence=0.0, p_eligible=0.0,
            rule_version=rs.version, rule_checksum=rs.checksum or "", model_version=m.version,
            checks=[Check(name="engine", verdict="unsure", confidence=0.0, detail=f"engine error: {type(e).__name__}")],
            explain_citizen=R.explain("R_LOW_CONFIDENCE"), trace=[{"step": 1, "what": "engine_error", "error": type(e).__name__}],
            next_step=NextStep(type="human"), case_id=case_id, costs_used=rs.params.costs.model_dump(), approve_line=a, reject_line=r)
