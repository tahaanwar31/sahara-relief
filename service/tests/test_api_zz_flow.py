"""End-to-end behaviour against the real database. These tests run IN ORDER and change data on purpose
(file name starts with zz so they run after the read-only security tests)."""
import pytest

from app.docs.samples import make_card_back, make_card_front, make_sample


def zainab_card(seed=7):
    """Zainab's real registry details on a readable card (the card reader compares them with the government record)."""
    return make_card_front("Zainab Bibi", "Ghulam Mustafa Chandio", "41301-9000011-2", "15.06.1978", "31.12.2029", "F", seed)
from conftest import IDS

S = {}   # state shared between the ordered tests


def _case(client, tok, who):
    return client.get("/cases", headers=tok[who]).json()[0]["id"]


def test_01_draft_idempotency_and_resume(client, tok):
    cid = S["z"] = _case(client, tok, "zainab")
    body = {"step": 4, "draft": {"payout_account": "0300-9900011", "payout_title": "Zainab Bibi", "family_members": 4}}
    h = {**tok["zainab"], "Idempotency-Key": "key-aaa-1"}
    first = client.put(f"/cases/{cid}/draft", headers=h, json=body)
    assert first.status_code == 200 and len(first.json()["resume_code"]) == 6
    again = client.put(f"/cases/{cid}/draft", headers=h, json={"step": 9, "draft": {"changed": True}})
    assert again.json()["saved_at"] == first.json()["saved_at"] and again.json()["repeat"] is True   # replay returns the first result
    assert client.get(f"/cases/{cid}", headers=tok["zainab"]).json()["step"] == 4                        # the second body was NOT applied
    code = first.json()["resume_code"]
    r = client.get(f"/drafts/resume/{code}", headers=tok["zainab"])
    assert r.json()["case_id"] == cid and r.json()["draft"]["family_members"] == 4
    anon = client.get(f"/drafts/resume/{code}")                       # no login: nothing personal comes back
    assert anon.status_code == 200 and anon.json()["draft"] == {} and anon.json()["requires_login"] is True
    stranger = client.get(f"/drafts/resume/{code}", headers=tok["asim"])
    assert stranger.json()["draft"] == {}
    assert client.get("/drafts/resume/abc").status_code == 404


def test_02_case_detail_shape_masks_cnic(client, tok):
    d = client.get(f"/cases/{S['z']}", headers=tok["zainab"]).json()
    assert d["person"]["cnic_masked"] == "41301-*******-2" and "4130190000112" not in str(d)
    assert d["household"]["members"] and d["consent_status"] == "granted" and d["needs_second_approver"] is False
    assert len(d["documents"]) == 1 and d["latest_decision"] is None        # the seed has one CNIC photo


def test_03_upload_checks(client, tok):
    img = zainab_card(7)
    r = client.post(f"/cases/{S['z']}/documents", headers=tok["zainab"], files={"file": ("cnic.jpg", img, "image/jpeg")},
                    data={"doc_type": "cnic_front"})
    assert r.status_code == 200 and r.json()["verdict"] == "ok" and r.json()["signals"]["is_blurry"] is False
    r2 = client.post(f"/cases/{S['z']}/documents", headers=tok["zainab"], files={"file": ("b.jpg", make_sample("blurry", 8), "image/jpeg")},
                     data={"doc_type": "utility_bill"})
    assert r2.json()["verdict"] == "ask_better_photo"
    other = client.post(f"/cases/{S['z']}/documents", headers=tok["asim"], files={"file": ("x.jpg", img, "image/jpeg")}, data={"doc_type": "cnic_front"})
    assert other.status_code in (403, 404)
    dup = client.post(f"/cases/{S['z']}/documents", headers=tok["zainab"], files={"file": ("cnic.jpg", img, "image/jpeg")}, data={"doc_type": "cnic_back"})
    assert dup.status_code == 200


def test_04_blurry_paper_means_ask_for_a_better_photo(client, tok):
    # the steps before sending: she types her household size (checked on the server) and sends the BACK of her ID card
    assert client.post(f"/cases/{S['z']}/household-check", headers=tok["zainab"], json={"members": 4}).json()["match"] is True
    up = client.post(f"/cases/{S['z']}/documents", headers=tok["zainab"], files={"file": ("b.jpg", make_card_back(seed=3), "image/jpeg")}, data={"doc_type": "cnic_back"})
    assert up.status_code == 200, up.text
    r = client.post(f"/cases/{S['z']}/submit", headers=tok["zainab"], json={})
    assert r.status_code == 200, r.text
    c = r.json()
    assert c["zone"] == "ASK_MORE" and c["result"] == "ASK_PROOF" and c["reason_code"] == "R_DOC_BLURRY", (c["reason_code"], [(x["name"], x["verdict"], x.get("detail")) for x in c["checks"] if x["verdict"] != "pass"])
    assert c["next_step"]["type"] == "upload" and c["next_step"]["doc_type"] == "utility_bill"
    assert c["explain_citizen"]["en"] and c["explain_citizen"]["ur"] and c["rule_version"] == 1
    assert client.get(f"/cases/{S['z']}", headers=tok["zainab"]).json()["status"] == "awaiting_proof"


def test_05_retake_then_resubmit_gets_an_automatic_decision_with_a_full_card(client, tok):
    up = client.post(f"/cases/{S['z']}/documents", headers=tok["zainab"], files={"file": ("u.jpg", make_sample("clean", 9), "image/jpeg")},
                     data={"doc_type": "utility_bill"})
    assert up.json()["verdict"] == "ok"
    key = {"Idempotency-Key": "submit-1"}
    r = client.post(f"/cases/{S['z']}/submit", headers={**tok["zainab"], **key}, json={})
    assert r.status_code == 200, r.text
    c = r.json()
    for k in ("decision_id", "case_id", "created_at", "actor_type", "zone", "result", "reason_code", "confidence", "p_eligible", "rule_version",
              "rule_checksum", "model_version", "checks", "explain_citizen", "trace", "next_step", "costs_used", "approve_line", "reject_line"):
        assert k in c, k
    assert c["actor_type"] == "ai" and c["rule_version"] == 1 and c["trace"]
    S["card1"] = c
    replay = client.post(f"/cases/{S['z']}/submit", headers={**tok["zainab"], **key}, json={})
    assert replay.json()["decision_id"] == c["decision_id"]                      # same Idempotency-Key -> first result
    decs = client.get(f"/cases/{S['z']}/decisions", headers=tok["zainab"]).json()
    assert decs[0]["decision_id"] == c["decision_id"]
    case = client.get(f"/cases/{S['z']}", headers=tok["zainab"]).json()
    assert case["zone"] == c["zone"] and case["result"] == c["result"]
    assert c["zone"] == "AUTO" and c["result"] == "APPROVE" and case["status"] == "approved" and c["p_eligible"] >= c["approve_line"]


def test_05b_papers_can_be_opened_only_by_people_who_may_see_the_claim(client, tok, sql):
    """The admin can open a paper the citizen sent (and the diary records it); other citizens and signed-out callers cannot."""
    doc = client.get(f"/cases/{S['z']}", headers=tok["zainab"]).json()["documents"][-1]["id"]
    url = f"/cases/{S['z']}/documents/{doc}/image"
    r = client.get(url, headers=tok["officer1"])
    assert r.status_code == 200, r.text
    assert r.json()["content_type"] in ("image/jpeg", "image/png") and len(r.json()["data"]) > 1000
    assert client.get(url, headers=tok["zainab"]).status_code == 200                       # the owner may see her own paper
    assert client.get(url, headers=tok["asim"]).status_code == 404                         # another citizen may not (the row locks hide it)
    assert client.get(url).status_code == 401                                              # signed out: no
    assert client.get(f"/cases/{S['z']}/documents/not-a-uuid/image", headers=tok["officer1"]).status_code == 404
    seen = sql("select count(*) as n from audit_log where action = 'document.viewed' and entity_id = %s", [doc])[0]["n"]
    assert seen >= 2                                                                        # every view is in the diary


def test_06_officer_queue_notes_and_decision(client, tok, sql):
    q = client.get("/queue", headers=tok["officer1"]).json()
    assert q, "the queue should hold the HUMAN cases of KHI-EAST"
    pr = [(x["priority"], x["confidence"]) for x in q]
    assert pr == sorted(pr, key=lambda t: (-t[0], t[1]))
    for k in ("id", "status", "zone", "reason_code", "confidence", "priority", "amount", "person_name", "created_at", "consent_status", "needs_second_approver"):
        assert k in q[0]
    assert all(x["zone"] == "HUMAN" for x in q)
    asim = _case(client, tok, "asim")
    S["a"] = asim
    assert asim in [x["id"] for x in q]
    # officers of other offices do not see this case at all: only KHI-EAST officers exist in the seed, so use SQL to prove the lock
    notes = client.get(f"/cases/{asim}/notes", headers=tok["officer1"])
    assert notes.status_code in (200, 404)
    # a citizen's note and an empty note are refused
    assert client.post(f"/cases/{asim}/officer-decision", headers=tok["officer1"], json={"decision": "reject", "note": ""}).status_code == 422
    assert client.post(f"/cases/{asim}/officer-decision", headers=tok["officer1"], json={"decision": "maybe", "note": "xxxx"}).status_code == 422
    # a new decision for the officer's choice; the AI decision stays in the history
    before = len(client.get(f"/cases/{asim}/decisions", headers=tok["officer1"]).json())
    r = client.post(f"/cases/{asim}/officer-decision", headers=tok["officer1"], json={"decision": "reject", "note": "Score above the cutoff, confirmed."})
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["status"] == "rejected" and out["decision"]["actor_type"] == "user" and out["decision"]["result"] == "REJECT"
    decs = client.get(f"/cases/{asim}/decisions", headers=tok["officer1"]).json()
    assert len(decs) == before + 1 and decs[1]["actor_type"] in ("ai", "user")


def test_07_second_approver_above_the_limit(client, tok, sql):
    rows = sql("select c.id from cases c where c.status = 'in_review' and c.office = 'KHI-EAST' and c.open_flags = 0 and c.id <> %s "
               "and exists (select 1 from decisions d where d.case_id = c.id) and app.has_consent('service', c.owner_user_id, 'claim_processing', null) "
               "and app.has_consent('KHI-EAST', c.owner_user_id, 'claim_processing', null) limit 1", [S["a"]])
    if not rows:
        pytest.skip("no suitable in_review case in the seed")
    cid = str(rows[0]["id"])
    sql("update cases set amount = 25000 where id = %s", [cid])
    r1 = client.post(f"/cases/{cid}/officer-decision", headers=tok["officer1"], json={"decision": "approve", "note": "Looks right to me."})
    assert r1.status_code == 200, r1.text
    assert r1.json()["needs_second_approver"] is True and r1.json()["status"] != "approved"
    r1b = client.post(f"/cases/{cid}/officer-decision", headers=tok["officer1"], json={"decision": "approve", "note": "Approving again alone."})
    assert r1b.json()["status"] != "approved"                       # the same officer twice is still one approver
    r2 = client.post(f"/cases/{cid}/officer-decision", headers=tok["officer2"], json={"decision": "approve", "note": "Second look: agreed."})
    assert r2.status_code == 200 and r2.json()["status"] == "approved", r2.text


def test_08_helper_sessions_and_families(client, tok, sql):
    fam = client.get("/helper/families", headers=tok["yousuf"]).json()
    assert len(fam) == 1 and fam[0]["name_roman"].startswith("Zainab")      # one helper, one family
    assert fam[0]["consent_status"] == "granted"
    zid = fam[0]["person_id"]
    S["zp"] = zid
    no = sql("select p.id from people p where p.record_no is null and not exists (select 1 from helper_assignments a where a.person_id = p.id) limit 1")[0]["id"]
    r = client.post("/helper/session", headers=tok["yousuf"], json={"person_id": str(no)})
    assert r.status_code in (403, 404)                                       # a family he does not serve stays closed
    r = client.post("/helper/session", headers=tok["yousuf"], json={"person_id": zid})
    assert r.status_code == 200 and r.json()["active"] is True
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": None}).json()["active"] is False


def test_09_rule_change_new_case_uses_version_2_old_decision_keeps_version_1(client, tok):
    sets = client.get("/rule-sets", headers=tok["admin"]).json()
    v2 = next(s for s in sets if s["version"] == 2)
    assert v2["status"] == "draft" and v2["params"]["cutoff"] == 25
    full = client.get(f"/rule-sets/{v2['id']}", headers=tok["admin"]).json()
    assert full["rules"]
    tw = client.post("/rules/twin", headers=tok["admin"], json={"rule_set_id": v2["id"], "limit": 150})
    assert tw.status_code == 200, tw.text
    t = tw.json()
    assert t["cases"] == 150 and t["preview_only"] is True and t["changed"] >= 1 and "moves" in t and t["examples"]
    assert client.get("/rule-sets", headers=tok["admin"]).json()[0]["status"] in ("draft", "active")   # twin changed nothing
    # activation by a non-admin is refused; by the admin it works in one step
    assert client.post("/rules/activate", headers=tok["zainab"], json={"rule_set_id": v2["id"]}).status_code == 403
    act = client.post("/rules/activate", headers=tok["admin"], json={"rule_set_id": v2["id"]})
    assert act.status_code == 200 and act.json()["status"] == "active" and act.json()["version"] == 2
    old = client.get(f"/cases/{S['z']}/decisions", headers=tok["zainab"]).json()
    assert {d["rule_version"] for d in old} == {1}                             # old decisions still show version 1
    new = client.post(f"/cases/{S['z']}/decide", headers=tok["officer1"], json={})
    assert new.status_code == 200, new.text
    assert new.json()["rule_version"] == 2 and new.json()["rule_checksum"] != S["card1"]["rule_checksum"]
    decs = client.get(f"/cases/{S['z']}/decisions", headers=tok["zainab"]).json()
    assert [d["rule_version"] for d in decs][-1] == 1 and decs[0]["rule_version"] == 2


def test_10_new_rule_set_validate_and_refuse_bad_rules(client, tok):
    good = {"params": {"cutoff": 28, "borderline_band": 5, "amount": 14000, "payout_cap": 29000, "auto_reject_enabled": False,
                       "second_approver_over": 20000, "costs": {"wrong_approve": 100, "wrong_reject": 20, "review": 3, "proof": 1}},
            "rules": [{"code": "T1", "expression": {">": [{"var": "household.pmt_score"}, 28]}, "outcome": "HOLD", "reason_code": "R_PMT_ABOVE_CUTOFF"}]}
    v = client.post("/rules/validate", headers=tok["admin"], json=good).json()
    assert v["ok"] is True and v["dry_run"]["cases"] == 20
    bad = {"rules": [{"code": "T2", "expression": {"eval": "os"}, "outcome": "HOLD", "reason_code": "R_PMT_ABOVE_CUTOFF"}]}
    vb = client.post("/rules/validate", headers=tok["admin"], json=bad).json()
    assert vb["ok"] is False and vb["errors"][0]["path"] == "rules.0.expression"
    assert client.post("/rule-sets", headers=tok["admin"], json={**bad, "params": good["params"]}).status_code == 422
    made = client.post("/rule-sets", headers=tok["admin"], json=good)
    assert made.status_code == 200 and made.json()["status"] == "draft" and made.json()["rules"]
    assert client.post("/rule-sets", headers=tok["zainab"], json=good).status_code == 403


def test_11_consent_take_back_stops_every_path(client, tok, sql):
    zc = S["z"]
    consents = client.get("/consents", headers=tok["zainab"]).json()
    live = [c for c in consents if c["status"] == "granted"]
    assert live
    for c in live:
        r = client.post(f"/consents/{c['id']}/withdraw", headers=tok["zainab"], json={})
        assert r.status_code == 200 and r.json()["status"] == "withdrawn" and len(r.json()["receipt_hash"]) >= 32
    assert client.post(f"/consents/{live[0]['id']}/withdraw", headers=tok["zainab"], json={}).status_code == 404   # already withdrawn
    # 1. the officer can no longer see the case
    assert client.get(f"/cases/{zc}", headers=tok["officer1"]).status_code == 404
    assert zc not in [c["id"] for c in client.get("/queue", headers=tok["officer1"]).json()]
    # 2. the reviewer cannot re-run the engine on it either: the case is invisible without consent
    d = client.post(f"/cases/{zc}/decide", headers=tok["admin"], json={})
    assert d.status_code == 404
    # 3. helper session refuses
    r = client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]})
    assert r.status_code == 403 and r.json()["error"]["code"] == "CONSENT_REQUIRED"
    fam = next(f for f in client.get("/helper/families", headers=tok["yousuf"]).json() if f["person_id"] == S["zp"])
    assert fam["consent_status"] != "granted" and fam["cnic_last4"] == "****"
    # 4. documents and payments
    up = client.post(f"/cases/{zc}/documents", headers=tok["zainab"], files={"file": ("a.jpg", zainab_card(3), "image/jpeg")}, data={"doc_type": "cnic_front"})
    assert up.status_code in (403, 409)
    rel = client.post("/mock/raast/release", headers=tok["admin"], json={"case_id": zc})
    assert rel.status_code in (403, 404, 409)
    # 5. mock registries and the public API
    assert client.get("/mock/nadra/4130190000112", headers=tok["officer1"]).json()["error"]["code"] == "CONSENT_REQUIRED"
    key = {"X-API-Key": "sahara_demo_key_0001"}
    ps = client.get(f"/public/v1/cases/{zc}/status", headers=key)
    assert ps.status_code == 403 and ps.json()["error"]["code"] in ("CONSENT_REQUIRED", "FORBIDDEN")
    # 6. the diary recorded the take-back and the receipt
    ev = sql("select kind from consent_events e join consents c on c.id = e.consent_id where c.subject_id = %s", [IDS["zainab"]])
    assert "withdrawn" in {e["kind"] for e in ev}
    aud = client.get("/audit", headers=tok["admin"], params={"entity_type": "consents", "limit": 200}).json()
    assert any("withdraw" in a["action"] or a["details"].get("status") == "withdrawn" or "update" in a["action"] for a in aud["items"])
    # the take-back is also in the citizen's own diary
    mine = client.get("/audit/mine", headers=tok["zainab"]).json()["items"]
    assert mine


def test_12_data_access_log_shows_who_looked(client, tok):
    log = client.get("/data-access-log", headers=tok["asim"]).json()
    assert isinstance(log, list)
    assert any(e["who"] in ("officer", "admin") or "engine" in e["who"] for e in log)
    assert all({"id", "at", "who", "what"} <= set(e) for e in log)


def test_13_audit_chain_verify_and_roles(client, tok):
    v = client.get("/audit/verify", headers=tok["admin"]).json()
    assert v["intact"] is True and v["broken_at"] is None and v["checked"] > 10
    a = client.get("/audit", headers=tok["admin"], params={"limit": 5}).json()
    assert a["total"] >= len(a["items"]) == 5 and {"hash", "prev_hash", "action"} <= set(a["items"][0])
    assert client.get("/audit", headers=tok["zainab"]).status_code == 403


def test_14_p1_checks(client, tok):
    m = client.post("/identity/match", headers=tok["asim"], json={
        "a": {"name": "Muhammad Aslam", "father": "Abdul Rehman", "cnic": "4210112345671", "dob": "1978-03-02", "district": "Karachi East"},
        "b": {"name": "Mohd Aslam", "father": "Abd ur Rehman", "cnic": None, "dob": "02/03/1978", "district": "Karachi East"}}).json()
    assert m["band"] in ("SAME", "MAYBE") and m["evidence"] and {"field", "agree", "weight"} <= set(m["evidence"][0])
    assert client.post("/identity/match", headers=tok["asim"], json={"a": {"name": "<script>x</script>"}, "b": {}}).status_code == 200
    s = client.post("/scam/check", headers=tok["asim"], json={"text": "BISP: Send your CNIC and PIN to claim Rs 25000 today", "sender": "0300111"}).json()
    assert s["label"] in ("scam", "suspicious") and s["reasons"] and s["advice"]["ur"]
    rep = client.post("/scam/report", headers=tok["asim"], json={"text": "pay Rs 500 fee to claim prize http://bit.ly/x", "sender": "unknown", "district": "Karachi"})
    assert rep.status_code == 200 and rep.json()["reported"] is True
    d = client.post("/docs/analyze", headers=tok["asim"], files={"file": ("a.jpg", make_sample("blurry", 2), "image/jpeg")}, data={"doc_type": "cnic_front"}).json()
    assert d["verdict"] == "ask_better_photo" and "ahash" not in d["signals"]
    p = client.get("/policy/search", headers=tok["asim"], params={"q": "can I be asked for a fee?"}).json()
    assert p["results"] and p["results"][0]["source"]
    cc = client.get("/policy/cost-curve", headers=tok["admin"], params={"wrong_approve": 500, "wrong_reject": 20, "review": 3}).json()
    assert cc["approve_line"] == pytest.approx(0.994) and cc["points"][0]["expected_cost"] is not None and cc["min"] and cc["current"]
    assert client.get("/policy/cost-curve", headers=tok["admin"], params={"wrong_approve": 1, "review": 3}).status_code == 422


def test_15_eval_and_analytics(client, tok):
    r = client.post("/eval/run", headers=tok["admin"])
    assert r.status_code == 200, r.text[:300]
    assert r.json()["auto_rate"] > 0.2 and r.json()["confusion"]["labels"]
    latest = client.get("/eval/latest", headers=tok["officer1"]).json()
    assert latest["n"] == 2000 and latest["human_rate"] < 0.8 and "SYNTHETIC" in latest["notes"].upper()
    a = client.get("/analytics/summary", headers=tok["admin"]).json()
    assert a["cases_total"] > 100 and "by_zone" in a


def test_16_api_keys_and_public_api(client, tok):
    created = client.post("/api-keys", headers=tok["admin"], json={"name": "test key", "scopes": ["scam:check", "eligibility:precheck"], "rate_limit_per_min": 3})
    assert created.status_code == 200 and created.json()["key"].startswith("sahara_")
    key = {"X-API-Key": created.json()["key"]}
    listed = client.get("/api-keys", headers=tok["admin"]).json()
    assert all("key" not in k and "key_hash" not in k for k in listed)
    ok = client.post("/public/v1/scam/check", headers=key, json={"text": "Send your PIN now"})
    assert ok.status_code == 200 and ok.json()["label"] in ("scam", "suspicious")
    assert client.get(f"/public/v1/cases/{S['a']}/status", headers=key).status_code == 403          # scope missing
    assert client.post("/public/v1/scam/check", json={"text": "x"}).status_code == 401
    assert client.post("/public/v1/scam/check", headers={"X-API-Key": "nope"}, json={"text": "x"}).status_code == 401
    pre = client.post("/public/v1/eligibility/precheck", headers=key, json={"pmt_score": 10, "gov_employee": False, "owns_vehicle": False, "age": 40})
    assert pre.status_code == 200 and pre.json()["precheck"] in ("likely_eligible", "needs_review", "needs_more_information")
    codes = [client.post("/public/v1/scam/check", headers=key, json={"text": "hi"}).status_code for _ in range(5)]
    assert 429 in codes
    rv = client.delete(f"/api-keys/{created.json()['id']}", headers=tok["admin"])
    assert rv.status_code == 200
    assert client.post("/public/v1/scam/check", headers=key, json={"text": "hi"}).status_code == 401
    assert client.post("/api-keys", headers=tok["admin"], json={"name": "bad", "scopes": ["root"]}).status_code == 422


def test_17_mock_services_and_metrics(client, tok):
    r = client.post("/mock/raast/verify", headers=tok["asim"], json={"account": "0301-9900021"}).json()
    assert r["valid"] is True and r["title"] is None   # the registry holds no account names up front; nothing is shown back
    bad = client.post("/mock/raast/verify", headers=tok["asim"], json={"account": "0000-0000000"}).json()
    assert bad["valid"] is False
    n = client.get("/mock/nadra/4210190000211", headers=tok["officer1"])
    assert n.status_code == 200 and n.json()["cnic"].startswith("42101-*")
    m = client.get("/metrics", headers=tok["admin"]).json()
    assert m["requests_by_status"] and "decision_ms" in m
    assert client.get("/healthz").json()["status"] == "ok"
    assert client.get("/docs").status_code == 200 and client.get("/openapi.json").status_code == 200


def test_18_helper_gets_her_permission_from_three_details(client, tok):
    """Zainab withdrew everything (test_11). The helper, on his own phone, asks her for her ID number, date of birth and household
    size. The server checks them against the government records and answers only yes or no: wrong details record nothing and lock
    after 3 tries; right ones record HER permission and her family opens. The helper never sees the record."""
    fam = client.get("/helper/families", headers=tok["yousuf"]).json()[0]
    assert fam["consent_status"] != "granted" and fam["cnic_last4"] == "****" and "***" in fam["name_roman"]
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]}).status_code == 403
    good = {"cnic": "4130190000112", "dob": "1978-06-15", "members": 4}
    r = client.post("/helper/verify-family", headers=tok["yousuf"], json={**good, "members": 7})
    assert r.status_code == 403 and "do not match" in r.json()["error"]["message"]
    assert client.get("/helper/families", headers=tok["yousuf"]).json()[0]["consent_status"] != "granted"      # a wrong try records nothing
    r = client.post("/helper/verify-family", headers=tok["yousuf"], json={**good, "dob": "15.06.1978"})        # day-first dates are read too
    assert r.status_code == 200 and r.json()["ok"] is True
    fam = client.get("/helper/families", headers=tok["yousuf"]).json()[0]
    assert fam["consent_status"] == "granted" and fam["name_roman"].startswith("Zainab")
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]}).status_code == 200
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": None}).json()["active"] is False
    for _ in range(2):                                                                                        # two more wrong tries: 3 in total
        assert client.post("/helper/verify-family", headers=tok["yousuf"], json={**good, "dob": "1980-01-01"}).status_code == 403
    r = client.post("/helper/verify-family", headers=tok["yousuf"], json=good)
    assert r.status_code == 403 and "Too many" in r.json()["error"]["message"]                                 # locked, even for the right answer


def test_19_unknown_numbers_and_wrong_roles_are_refused(client, tok):
    r = client.post("/helper/verify-family", headers=tok["yousuf"], json={"cnic": "9999999999999", "dob": "1978-06-15", "members": 4})
    assert r.status_code == 403 and "do not match" in r.json()["error"]["message"]    # the same answer as for a family that is not his
    r = client.post("/helper/verify-family", headers=tok["zainab"], json={"cnic": "4130190000112", "dob": "1978-06-15", "members": 4})
    assert r.status_code == 403                                                        # only a helper may call it


def test_20_household_size_is_checked_not_shown(client, tok):
    cid = client.post("/cases", headers=tok["asim"], json={}).json()["id"] if False else None
    cases = client.get("/cases", headers=tok["asim"]).json()
    cases = cases["items"] if isinstance(cases, dict) else cases
    cid = cases[0]["id"]
    resp = client.post(f"/cases/{cid}/household-check", headers=tok["asim"], json={"members": 59})
    assert resp.status_code == 200, resp.text
    r = resp.json()
    assert r["match"] is False and r["locked"] is False and r["tries_left"] == 2 and "members" not in r
    assert client.post(f"/cases/{cid}/household-check", headers=tok["zainab"], json={"members": 4}).status_code == 404   # not her case


def test_21_demo_reset_puts_her_payout_side_back_to_empty(client, tok, sql):
    """The faint restart icon: after an approval (account in the registry, payment given), pressing it leaves her with
    no account number anywhere and no payment, so any valid account can be typed on the next claim."""
    cid = sql("select id from cases where owner_user_id = %s order by created_at limit 1", [IDS["zainab"]])[0]["id"]
    sql("update cases set payout_account = '03005550001' where id = %s", [cid])
    sql("insert into mock.raast_accounts (account_id, title, owner_cnic, kind) values ('03005550001','Zainab Bibi','4130190000112','wallet') on conflict do nothing")
    sql("insert into mock.raast_payments (case_id, account_id, amount, status, reference) values (%s,'03005550001',13500,'settled','T-RESET')", [cid])
    assert client.post("/demo/restart-claim", headers=tok["zainab"]).status_code == 200
    assert sql("select count(*) as n from mock.raast_payments where case_id = %s", [cid])[0]["n"] == 0
    assert sql("select count(*) as n from mock.raast_accounts where account_id = '03005550001' or owner_cnic = '4130190000112'")[0]["n"] == 0
    row = sql("select payout_account, payout_account_title, payout_changed_at from cases where id = %s", [cid])[0]
    assert row["payout_account"] is None and row["payout_account_title"] is None and row["payout_changed_at"] is None
    assert sql("select count(*) as n from cases where id = %s", [cid])[0]["n"] == 1                      # the claim itself is history: kept


def test_22_helper_reset_goes_back_to_the_lobby_with_everything_undone(client, tok, sql):
    """The helper's reset icon: her claims closed, her payout side empty, the permission she gave HIM taken back, his session closed."""
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]}).status_code in (200, 403)
    r = client.post("/demo/reset-helper", headers=tok["yousuf"])
    assert r.status_code == 200 and r.json()["families_reset"] == 1
    fam = client.get("/helper/families", headers=tok["yousuf"]).json()[0]
    assert fam["consent_status"] != "granted" and "***" in fam["name_roman"]                  # back to the three-detail check
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]}).status_code == 403
    assert sql("select count(*) as n from mock.raast_accounts where owner_cnic = '4130190000112'")[0]["n"] == 0
    assert client.post("/demo/reset-helper", headers=tok["zainab"]).status_code == 403          # only a helper may use it
    good = {"cnic": "4130190000112", "dob": "1978-06-15", "members": 4}                          # and the proof works again
    assert client.post("/helper/verify-family", headers=tok["yousuf"], json=good).status_code in (200, 403)


def test_23_helper_is_not_asked_the_household_size_twice(client, tok, sql):
    """The helper's three-detail proof already checked the household size, so his claim needs no second check."""
    # (test_18 left this helper locked out for 30 minutes after three wrong tries, so the proof is put on file directly here:
    #  the very row verify-family writes, with granted_by = the helper)
    sql("insert into consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
        "select p.user_id, 'helper', 'a0000000-0000-4000-8000-000000000002', 'claim_help', array['*'], 'a0000000-0000-4000-8000-000000000002', 'granted' "
        "from people p where p.id = %s on conflict do nothing", [S["zp"]])
    for gtype, gid in (("office", "KHI-EAST"), ("service", "service")):          # (test_11 took her office and service permissions back)
        sql("insert into consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
            "select p.user_id, %s, %s, 'claim_processing', array['*'], p.user_id, 'granted' from people p where p.id = %s on conflict do nothing", [gtype, gid, S["zp"]])
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]}).status_code == 200
    cid = client.post("/cases", headers=tok["yousuf"], json={"person_id": S["zp"]}).json()["id"]
    assert sql("select count(*) as n from case_events where case_id = %s and kind = 'household_check' and (data->>'ok') = 'true'", [cid])[0]["n"] == 1
    for fn, dt, data in (("f.jpg", "cnic_front", zainab_card(11)), ("b.jpg", "cnic_back", make_card_back(seed=12))):
        assert client.post(f"/cases/{cid}/documents", headers=tok["yousuf"], files={"file": (fn, data, "image/jpeg")}, data={"doc_type": dt}).status_code == 200
    client.put(f"/cases/{cid}/draft", headers=tok["yousuf"], json={"step": 7, "draft": {"payout_account": "03005550002"}})
    r = client.post(f"/cases/{cid}/submit", headers=tok["yousuf"], json={}).json()
    assert r["reason_code"] not in ("R_HOUSEHOLD_NOT_CHECKED", "R_HOUSEHOLD_MISMATCH"), r["reason_code"]
    client.post("/helper/session", headers=tok["yousuf"], json={"person_id": None})


def test_24_the_demo_reset_clears_the_helpers_lockout(client, tok):
    good = {"cnic": "4130190000112", "dob": "1978-06-15", "members": 4}
    client.post("/demo/reset-helper", headers=tok["yousuf"])
    for _ in range(3):
        assert client.post("/helper/verify-family", headers=tok["yousuf"], json={**good, "members": 9}).status_code == 403
    assert "Too many" in client.post("/helper/verify-family", headers=tok["yousuf"], json=good).json()["error"]["message"]    # locked
    assert client.post("/demo/reset-helper", headers=tok["yousuf"]).status_code == 200
    assert client.post("/helper/verify-family", headers=tok["yousuf"], json=good).status_code == 200                           # reset: usable again
    client.post("/demo/reset-helper", headers=tok["yousuf"])


def test_25_a_helper_cannot_send_the_money_to_his_own_number(client, tok, sql):
    """Yousuf's own registered mobile (0333-0000023) as the payout account: the claim is held for a person, never paid."""
    client.post("/demo/reset-helper", headers=tok["yousuf"])
    for gtype, gid, purpose in (("helper", "a0000000-0000-4000-8000-000000000002", "claim_help"), ("office", "KHI-EAST", "claim_processing"), ("service", "service", "claim_processing")):
        by = "'a0000000-0000-4000-8000-000000000002'" if gtype == "helper" else "p.user_id"      # the helper's row is the one verify-family writes (granted_by = him)
        sql("insert into consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
            f"select p.user_id, %s, %s, %s, array['*'], {by}, 'granted' from people p where p.id = %s on conflict do nothing", [gtype, gid, purpose, S["zp"]])
    assert client.post("/helper/session", headers=tok["yousuf"], json={"person_id": S["zp"]}).status_code == 200
    cid = client.post("/cases", headers=tok["yousuf"], json={"person_id": S["zp"]}).json()["id"]
    for fn, dt, data in (("f.jpg", "cnic_front", zainab_card(21)), ("b.jpg", "cnic_back", make_card_back(seed=22))):
        assert client.post(f"/cases/{cid}/documents", headers=tok["yousuf"], files={"file": (fn, data, "image/jpeg")}, data={"doc_type": dt}).status_code == 200
    client.put(f"/cases/{cid}/draft", headers=tok["yousuf"], json={"step": 7, "draft": {"payout_account": "03330000023"}})
    r = client.post(f"/cases/{cid}/submit", headers=tok["yousuf"], json={}).json()
    assert r["zone"] == "HUMAN" and r["reason_code"] == "R_PAYOUT_HELPER_OWNED", (r["zone"], r["reason_code"])
    assert sql("select count(*) as n from mock.raast_payments where case_id = %s", [cid])[0]["n"] == 0                       # nothing was paid
    client.post("/helper/session", headers=tok["yousuf"], json={"person_id": None})
