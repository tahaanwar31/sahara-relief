import pytest

from app.engine import reasons as R
from app.engine.decide import RuleDef, build_case_notes, decide
from app.engine.policy import Costs, approve_line, lines, reject_line
from app.engine.synth import generate_cases
from helpers import good_facts, ruleset


def test_cost_maths_defaults():
    c = Costs()
    assert approve_line(c) == 0.97
    assert round(reject_line(c), 2) == 0.15


def test_cost_maths_slider():
    assert approve_line(Costs(wrong_approve=500)) == pytest.approx(0.994)
    a, r = lines(Costs(wrong_approve=100, review=3, wrong_reject=2))
    assert r <= a


def test_costs_validation():
    with pytest.raises(Exception):
        Costs(wrong_approve=2, review=3)
    with pytest.raises(Exception):
        Costs(wrong_approve=-1)


def test_clean_case_auto_approves_and_card_shape():
    d = decide(good_facts(), ruleset(30))
    assert (d.zone, d.result, d.reason_code) == ("AUTO", "APPROVE", "R_AUTO_APPROVED")
    assert d.p_eligible >= d.approve_line == 0.97
    assert d.explain_citizen["en"] and d.explain_citizen["ur"]
    assert d.trace and d.rule_version == 1 and d.rule_checksum.startswith("sha256-")
    assert d.model_version.startswith("logreg")
    assert {c.name for c in d.checks} >= {"consent", "identity_match", "eligibility", "documents", "model"}
    assert d.costs_used["wrong_approve"] == 100


def _expect(facts, reason, zone="HUMAN", rs=None):
    d = decide(facts, rs or ruleset(30))
    assert d.reason_code == reason, (d.reason_code, [t for t in d.trace if t.get("fired")])
    assert d.zone == zone
    assert R.is_known(d.reason_code)
    assert d.result != "APPROVE"
    return d


def test_every_hard_rule_beats_a_perfect_score():
    _expect(good_facts(consent={"active": False}), "R_CONSENT_MISSING")
    _expect(good_facts(person={"cnic_valid": False}), "R_CNIC_INVALID", zone="ASK_MORE")
    _expect(good_facts(person={"cnic_expired": True}), "R_CNIC_EXPIRED")
    _expect(good_facts(person={"deceased": True}), "R_DECEASED")
    _expect(good_facts(identity={"duplicate": True}), "R_DUPLICATE_IDENTITY")
    _expect(good_facts(claim={"amount": 30000}), "R_PAYOUT_OVER_CAP")
    _expect(good_facts(payout={"shared_with_other_households": True}), "R_PAYOUT_ACCOUNT_SHARED")
    _expect(good_facts(payout={"changed_within_days": 5}), "R_PAYOUT_ACCOUNT_CHANGED")
    _expect(good_facts(payout={"owner_is_helper": True}), "R_PAYOUT_HELPER_OWNED")
    _expect(good_facts(scam={"flag": True}), "R_SCAM_FLAG")
    _expect(good_facts(doc={"any_edited": True}), "R_DOC_EDITED")
    _expect(good_facts(doc={"any_blurry": True}), "R_DOC_BLURRY", zone="ASK_MORE")
    _expect(good_facts(doc={"required_missing": True}), "R_DOC_MISSING", zone="ASK_MORE")
    _expect(good_facts(identity={"band": "MAYBE", "score": 0.6}), "R_NAME_AMBIGUOUS")
    _expect(good_facts(household={"pmt_score": None}), "R_PMT_MISSING")


def test_pmt_zones_and_cutoff_follow_the_rule_set():
    _expect(good_facts(household={"pmt_score": 60}), "R_PMT_ABOVE_CUTOFF")
    _expect(good_facts(household={"pmt_score": 28}), "R_PMT_BORDERLINE")
    assert decide(good_facts(household={"pmt_score": 14}), ruleset(30)).zone == "AUTO"
    assert decide(good_facts(household={"pmt_score": 14}), ruleset(18)).reason_code == "R_PMT_BORDERLINE"


def test_exclusion_rule_from_rule_set_and_broken_rule_is_not_skipped():
    d = decide(good_facts(household={"flags": {"owns_vehicle": True}}), ruleset(30))
    assert d.reason_code == "R_EXCLUSION_HIT" and d.result == "HOLD"
    rs = ruleset(30)
    rs.rules = rs.rules + [RuleDef(code="BROKEN", expression={"eval": 1}, outcome="HOLD")]
    assert decide(good_facts(), rs).zone == "HUMAN"  # a rule that cannot run sends the case to a person


def test_auto_reject_is_off_by_default():
    bad = good_facts(household={"pmt_score": 80})
    d = decide(bad, ruleset(30))
    assert d.result != "REJECT" and d.zone != "AUTO"
    assert decide(bad, ruleset(30, auto_reject_enabled=True)).zone == "HUMAN"  # hard rules still win


def test_reject_never_happens_with_default_params_on_any_synthetic_case():
    for c in generate_cases(600, 5):
        assert decide(c["facts"], ruleset(c["cutoff"])).result != "REJECT"


def test_two_disagreeing_checks_go_to_human():
    d = decide(good_facts(household={"pmt_score": 70}), ruleset(30))
    votes = [t for t in d.trace if t["what"] == "disagreement"][0]
    assert votes["fired"] is True and d.zone == "HUMAN"


def test_second_approver_flag_and_no_auto_above_threshold():
    d = decide(good_facts(claim={"amount": 25000}), ruleset(30))
    assert d.zone == "HUMAN" and d.next_step.second_approver_required is True


def test_missing_data_is_not_silently_ok():
    assert decide({}, ruleset(30)).reason_code == "R_CONSENT_MISSING"
    f = good_facts()
    f["household"]["flags"] = {k: None for k in f["household"]["flags"]}
    assert decide(f, ruleset(30)).zone == "HUMAN"


def test_ask_more_twice_goes_to_human():
    d = decide(good_facts(doc={"any_blurry": True}, claim={"ask_more_count": 2}), ruleset(30))
    assert d.zone == "HUMAN"


def test_every_decision_has_zone_result_reason_and_hard_rules_win():
    for c in generate_cases(300, 3):
        d = decide(c["facts"], ruleset(c["cutoff"]))
        assert d.zone in ("AUTO", "ASK_MORE", "HUMAN") and d.result and R.is_known(d.reason_code)
        assert (d.zone == "AUTO") == (d.result in ("APPROVE", "REJECT"))
        if d.result == "APPROVE":
            assert not [t for t in d.trace if t["what"] == "hard_rule" and t["fired"]]


def test_case_notes_for_human():
    d = decide(good_facts(identity={"band": "MAYBE", "score": 0.6}), ruleset(30))
    n = build_case_notes(d, good_facts(identity={"band": "MAYBE"}))
    assert n["why_unsure"] and n["versions"]["rule_version"] == 1 and n["sla"]


def test_twin_diff_and_cost_curve():
    from app.engine.costcurve import cost_curve
    from app.engine.twin import replay
    cases = generate_cases(300, 11, cutoffs=(30.0,))
    out = replay(cases, ruleset(30), ruleset(20))
    assert out["cases"] == 300 and out["preview_only"] is True
    assert out["changed"] >= 0 and set(out) >= {"moves", "approvals_changed", "cost_before", "cost_after", "examples"}
    cc = cost_curve(Costs())
    assert cc["approve_line"] == 0.97 and cc["points"] and cc["lowest_cost_point"]
    assert cost_curve(Costs(wrong_approve=500))["approve_line"] == pytest.approx(0.994)
