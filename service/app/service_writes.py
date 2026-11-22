"""THE ONLY MODULE THAT USES THE MASTER CONNECTION (superuser / service role).

It exposes a short allow-list of functions. Nothing else in the service may open a master connection
(a test greps the code base for this). The DSN and keys are never returned, logged or put in an error.

Allow-list (read functions are marked "read"):
  local_login            check an email + secret with app.local_login (only the master role may call it)
  fetch_rule_set         read: the active (or a given) rule set with its rules (helpers and the engine need it)
  read_case_facts        read: build the engine's facts for one case. THE CONSENT GATE IS HERE: without an
                         active consent nothing else is read.
  write_decision         write the AI decision row, the case notes, hard flags, and move the case status
  release_payment        queue a mock payment after approval (checks consent again)
  settle_payment         mark the mock payment settled and the case paid (checks consent again)
  run_scheduled_jobs     expire consents; write job diary entries
  job_diary              one diary line written by a job
  resume_exists          read: does a resume code exist (for the no-login lookup, returns almost nothing)
  api_key_lookup         read: find an API key by its hash (public API)
  public_case_status     read: status of one case for the public API (consent checked)
  mock_nadra / mock_nser / mock_raast_verify    read: the private mock services
  labelled_history       read: stored, labelled history cases for the Digital Twin and evaluation
  analytics              read: counts for the dashboard (no personal data)
Rule activation is NOT here: an admin activates as themselves (the database checks the role and the
diary names the admin).
"""
from __future__ import annotations

import hashlib
import json
import re
import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

from .config import get_settings
from .db import connect, lock, map_db_error
from .engine.decide import DecisionCard, RuleDef, RuleSetData
from .engine.facts import make_facts
from .engine.policy import RuleParams
from .errors import ApiError
from .docs import face, ocr
from .paths import storage_dir
from .identity.match import match_records
from .identity.normalize import validate_cnic

log = logging.getLogger("sahara.writes")

ALLOWED = ("local_login", "fetch_rule_set", "read_case_facts", "write_decision", "release_payment", "settle_payment",
           "run_scheduled_jobs", "job_diary", "resume_exists", "api_key_lookup", "public_case_status", "mock_nadra",
           "mock_nser", "mock_raast_verify", "labelled_history", "analytics", "store_eval_run", "other_case_documents",
           "helper_families", "create_local_user", "registry_consent_ok")


class _Master:
    """Context manager: one short master transaction. Tags the diary with who is acting."""

    def __init__(self, actor_type: str = "system", actor_name: str = "service") -> None:
        self.actor_type, self.actor_name = actor_type, actor_name

    def __enter__(self):
        self._lock = lock()
        self._lock.__enter__()
        try:
            self.conn = connect(get_settings().master_database_url)
            self.cur = self.conn.cursor()
            self.cur.execute("select set_config('app.actor_type', %s, true), set_config('app.actor_name', %s, true)",
                             [self.actor_type, self.actor_name])
            return self.cur
        except BaseException:
            self._lock.__exit__(None, None, None)
            raise

    def __exit__(self, et, ev, tb):
        try:
            if et is None:
                self.conn.commit()
            else:
                self.conn.rollback()
        finally:
            try:
                self.conn.close()
            finally:
                self._lock.__exit__(et, ev, tb)
        if et is not None and isinstance(ev, psycopg.Error):
            raise map_db_error(ev) from None
        return False


# ------------------------------------------------------------------ login
def local_login(email: str, secret: str) -> str | None:
    with _Master("system", "login") as cur:
        cur.execute("select app.local_login(%s, %s) as uid", [email[:200], secret[:200]])
        r = cur.fetchone()
        return str(r["uid"]) if r and r["uid"] else None


# ------------------------------------------------------------------ rule sets
def fetch_rule_set(rule_set_id: str | None = None) -> tuple[str, RuleSetData] | None:
    with _Master("system", "engine") as cur:
        if rule_set_id:
            cur.execute("select * from public.rule_sets where id = %s", [rule_set_id])
        else:
            cur.execute("select * from public.rule_sets where status = 'active'")
        s = cur.fetchone()
        if not s:
            return None
        cur.execute("select code, expression, outcome, reason_code, reason_en, reason_ur from public.rules "
                    "where rule_set_id = %s order by code", [s["id"]])
        rules = [RuleDef(**r) for r in cur.fetchall()]
        return str(s["id"]), rs_from_row(s, rules)


def rs_from_row(s: dict, rules: list[RuleDef]) -> RuleSetData:
    return RuleSetData(id=str(s["id"]), version=s["version"], checksum=s["checksum"],
                       params=RuleParams.model_validate(s["params"]), rules=rules)


# ------------------------------------------------------------------ facts (the consent gate lives here)
def _has_consent(cur, grantee: str, subject: Any, purpose: str) -> bool:
    cur.execute("select app.has_consent(%s, %s, %s, null) as ok", [grantee, subject, purpose])
    return bool(cur.fetchone()["ok"])


def consent_state(cur, case: dict) -> tuple[bool, str]:
    subject = case["owner_user_id"]
    if not _has_consent(cur, "service", subject, "claim_processing"):
        return False, "no active consent for the service"
    if case.get("helper_user_id") and not _has_consent(cur, str(case["helper_user_id"]), subject, "claim_help"):
        return False, "no active consent for the helper"
    cur.execute("select id from public.consents where subject_id = %s and grantee_id = 'service' and purpose = 'claim_processing' "
                "and status = 'granted' order by granted_at desc limit 1", [subject])
    c = cur.fetchone()
    return True, f"active consent #{str(c['id'])[:8]}" if c else "active consent"


def read_case_facts(case_id: str, params: RuleParams) -> dict:
    """Facts for the engine plus context. Returns {'facts', 'context', 'consent_id'}.

    If consent is missing, ONLY the consent part is filled. No personal data is read at all."""
    with _Master("ai", "engine") as cur:
        cur.execute("select * from public.cases where id = %s", [case_id])
        case = cur.fetchone()
        if not case:
            raise ApiError("NOT_FOUND")
        ok, detail = consent_state(cur, case)
        if not ok:
            return {"facts": make_facts({"consent": {"active": False, "detail": detail}}),
                    "context": {"case_id": case_id, "consent": detail}, "consent_id": None}
        cur.execute("select id from public.consents where subject_id = %s and grantee_id = 'service' and purpose = 'claim_processing' "
                    "and status = 'granted' order by granted_at desc limit 1", [case["owner_user_id"]])
        crow = cur.fetchone()
        cur.execute("select * from public.people where id = %s", [case["person_id"]])
        person = cur.fetchone() or {}
        nadra = None
        if person.get("cnic"):
            cur.execute("select * from mock.nadra where cnic = %s", [person["cnic"]])
            nadra = cur.fetchone()
        # the person typed, in step 3, an ID number that is NOT the one on their account (someone else's record):
        # the papers are then compared with THAT record, and the claim goes to a person
        claimed = "".join(ch for ch in str((case.get("draft") or {}).get("claimed_cnic") or "") if ch.isdigit())
        own = "".join(ch for ch in str(person.get("cnic") or "") if ch.isdigit())
        claimed_other, nadra_for_card = False, None
        if len(claimed) == 13 and claimed != own:
            cur.execute("select * from mock.nadra where cnic = %s", [claimed])
            other = cur.fetchone()
            if other:
                claimed_other, nadra_for_card = True, other
        hh = None
        hid = case["household_id"] or person.get("household_id")
        if hid:
            cur.execute("select * from mock.nser where household_id = %s", [hid])
            hh = cur.fetchone()
            if not hh:
                cur.execute("select id as household_id, pmt_score, members, flags from public.households where id = %s", [hid])
                hh = cur.fetchone()
        cur.execute("insert into public.audit_log (actor_type, action, entity_type, entity_id, details) values ('ai','engine.read_facts','case',%s,%s)",
                    [case_id, Jsonb({'subject_id': str(case['owner_user_id']), 'purpose': 'claim_processing'})])
        today = date.today()
        v = validate_cnic(person.get("cnic"), person.get("gender"), person.get("cnic_expiry"), today)
        n_status = (nadra or {}).get("status")
        expired = bool(v["expired"]) or n_status == "expired" or bool(nadra and nadra.get("expiry") and nadra["expiry"] < today)
        deceased = bool(person.get("deceased")) or n_status == "deceased"
        age = None
        if person.get("dob_iso") and person.get("dob_precision", "day") != "missing":
            d = person["dob_iso"]
            age = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
        # identity: the application record against the (mock) NADRA record
        ident_band = ident_score = None
        ident_ev: list = []
        if nadra:
            a = {"name": person.get("name_roman") or person.get("name_ur"), "father": person.get("father_or_husband"),
                 "cnic": person.get("cnic"), "district": person.get("district"),
                 # an application that only knew the year of birth is compared by year (the registry always has the full date)
                 "dob": (str(person["dob_iso"].year) if person.get("dob_iso") and person.get("dob_precision") == "year" else person.get("dob_iso"))}
            b = {"name": nadra["name_roman"], "father": nadra["father_or_husband"], "cnic": nadra["cnic"],
                 "dob": nadra["dob_iso"], "district": nadra["district"]}
            m = match_records(a, b)
            ident_band, ident_score = m["band"], m["score"]
            ident_ev = [{"field": e["field"], "record_a": e["a"], "record_b": e["b"], "agree": e["agree"]} for e in m["evidence"]]
        # duplicate candidates: linked records with another CNIC, superseded card, or an open flag
        cur.execute("select count(*) as n from public.person_links l join public.people o on o.id = case when l.a_id = %s then l.b_id else l.a_id end "
                    "where (l.a_id = %s or l.b_id = %s) and l.band in ('SAME','MAYBE') and o.cnic is distinct from %s",
                    [person.get("id"), person.get("id"), person.get("id"), person.get("cnic")])
        dup = cur.fetchone()["n"] > 0 or n_status == "superseded"
        cur.execute("select kind from public.case_flags where case_id = %s and status = 'open' and severity = 'hard'", [case_id])
        open_kinds = {r["kind"] for r in cur.fetchall()}
        dup = dup or "duplicate_identity" in open_kinds
        # payout account
        acct = None
        shared = changed_days = helper_owned = None
        if case.get("payout_account"):
            cur.execute("select * from mock.raast_accounts where account_id = %s", [case["payout_account"]])
            acct = cur.fetchone()
            cur.execute("select count(distinct coalesce(household_id, person_id)) as n from public.cases "
                        "where payout_account = %s and coalesce(household_id, person_id) is distinct from coalesce(%s, %s)",
                        [case["payout_account"], case["household_id"], case["person_id"]])
            shared = cur.fetchone()["n"] > 0 or "payout_account" in open_kinds
            ch = case.get("payout_changed_at") or (acct or {}).get("changed_at")
            changed_days = (datetime.now(timezone.utc) - ch).days if ch else None
            helper_owned = False
            if acct and acct.get("owner_user_id"):
                cur.execute("select exists (select 1 from public.helper_assignments where helper_user_id = %s) as h", [acct["owner_user_id"]])
                rr = cur.fetchone()
                helper_owned = bool(rr and rr["h"]) or str(acct["owner_user_id"]) == str(case.get("helper_user_id"))
            # the payout account is a helper's own number (any helper's registered phone): the money would go to a helper, not to her.
            # This does not depend on the registry (which starts empty), so a helper cannot slip his own number through.
            cur.execute("select exists (select 1 from public.people p join public.user_roles r on r.user_id = p.user_id "
                        "where r.role = 'helper' and regexp_replace(coalesce(p.phone_mock, ''), '[^0-9]', '', 'g') = %s) as h",
                        ["".join(ch for ch in str(case["payout_account"]) if ch.isdigit())])
            helper_owned = helper_owned or bool(cur.fetchone()["h"])
        # documents
        cur.execute("select id, doc_type, verdict, signals, storage_path from public.documents where case_id = %s order by created_at", [case_id])
        latest: dict = {}
        for d_ in cur.fetchall():          # only the newest photo of each paper counts (a retake replaces the blurry one)
            latest[d_["doc_type"]] = d_
        docs = list(latest.values())
        types = {d["doc_type"] for d in docs}
        missing_types = [t for t in ("cnic_front", "cnic_back") if t not in types]
        confs = [float((d["signals"] or {}).get("confidence")) for d in docs if (d["signals"] or {}).get("confidence") is not None]
        blurry_types = [d["doc_type"] for d in docs if d["verdict"] == "ask_better_photo"]
        edited = any(d["verdict"] == "suspicious" for d in docs) or "forgery" in open_kinds
        cur.execute("select count(*) as n from public.case_events where case_id = %s and kind = 'proof_requested'", [case_id])
        asked = cur.fetchone()["n"]
        # the card photo as read by computer vision, against the registry record (the government record, not what was typed)
        card_facts = {"read": None, "number_match": None, "name_match": None, "face_found": None, "face_match": None}
        front = latest.get("cnic_front")
        if front:
            record = nadra_for_card or nadra or person
            if (front["signals"] or {}).get("card", {}).get("available"):
                card_facts.update(ocr.compare_with_record(front["signals"]["card"], {"cnic": record.get("cnic"), "name_roman": record.get("name_roman")}))
            reg_photo = (nadra_for_card or nadra or {}).get("photo")
            if reg_photo and face.available():
                try:
                    fr = face.compare((storage_dir() / front["storage_path"]).read_bytes(), bytes(reg_photo))
                except OSError:
                    fr = {"checked": False}
                if fr.get("checked"):
                    card_facts["face_found"], card_facts["face_match"] = fr["face_found"], fr["match"]
        # what the card photo says, next to the government record, so the admin can SEE where they differ
        cardsig = ((front or {}).get("signals") or {}).get("card") or {}
        if ident_ev and cardsig.get("read") is True:
            from rapidfuzz import fuzz
            nm = lambda s: ocr._norm_name(s)
            for row in ident_ev:
                f_, gov = row["field"], row["record_b"]
                if f_ in ("name", "father"):
                    seen = cardsig.get(f_)
                    ok = bool(seen and gov) and fuzz.ratio(nm(seen), nm(gov)) >= 88
                elif f_ == "cnic":
                    seen = cardsig.get("cnic_digits")
                    ok = bool(seen) and re.sub(r"\D", "", str(gov or "")) == re.sub(r"\D", "", str(seen))
                elif f_ == "dob":
                    seen = cardsig.get("dob")
                    g = str(gov or "")
                    sd = re.sub(r"\D", "", str(seen or ""))
                    ok = bool(sd) and len(sd) == 8 and len(g) >= 10 and sd == g[8:10] + g[5:7] + g[0:4]
                else:
                    continue
                row["card"], row["card_agree"] = (gov if (ok and f_ in ("name", "father")) else seen), ("yes" if ok else "no")   # the reader drops spaces: show the clean words when they match
            if card_facts.get("face_found") is not None:
                row_face = {"field": "face", "record_a": "", "record_b": "photo on the government record"}
                if card_facts["face_found"] is False:
                    row_face.update(card="no face found on the card", card_agree="no")
                else:
                    ok_f = bool(card_facts.get("face_match"))
                    row_face.update(card="same face" if ok_f else "a different face", card_agree="yes" if ok_f else "no")
                ident_ev.append(row_face)
        # the household size she told us: True once it matched, False once three tries failed, otherwise not asked yet (None)
        cur.execute("select (data->>'ok') as ok, count(*) as n from public.case_events where case_id = %s and kind = 'household_check' group by 1", [case_id])
        hc = {r_["ok"]: r_["n"] for r_ in cur.fetchall()}
        size_match = True if hc.get("true") else (False if hc.get("false", 0) >= 3 else None)
        flags = dict((hh or {}).get("flags") or {})
        facts = make_facts({
            "person": {"gender": person.get("gender"), "cnic_valid": v["valid"] if person.get("cnic") else False,
                       "cnic_expired": expired, "deceased": deceased, "age": age},
            "household": {"size_match": size_match, "pmt_score": float(hh["pmt_score"]) if hh and hh.get("pmt_score") is not None else None,
                          "members": (hh or {}).get("members"),
                          "flags": {k: flags.get(k) for k in ("gov_employee", "owns_vehicle", "tax_filer", "foreign_trips", "high_phone_bill")}
                          if hh else {}},
            "payout": {"shared_with_other_households": shared, "changed_within_days": changed_days, "owner_is_helper": helper_owned},
            "doc": {"required_missing": bool(missing_types), "any_blurry": bool(blurry_types), "any_edited": edited,
                    "min_confidence": min(confs) if confs else None, "missing_types": missing_types, "blurry_types": blurry_types},
            "identity": {"band": ident_band, "score": ident_score, "duplicate": dup, "claimed_other": claimed_other},
            "claim": {"amount": case["amount"], "ask_more_count": asked},
            "consent": {"active": True, "detail": detail},
            "scam": {"flag": "scam" in open_kinds},
            "card": card_facts,
        })
        # up to 3 similar history cases (labelled), for the officer's notes
        similar = []
        try:
            pmt = facts["household"]["pmt_score"]
            if pmt is not None:
                cur.execute("select l.case_id, l.category, l.truth, l.outcome, (l.facts->'household'->>'pmt_score')::numeric as pmt "
                            "from public.labelled_cases l where l.facts->'household'->>'pmt_score' is not null "
                            "order by abs((l.facts->'household'->>'pmt_score')::numeric - %s) limit 3", [pmt])
                similar = [{"category": r["category"], "truth": r["truth"], "outcome": r["outcome"], "pmt_score": float(r["pmt"])} for r in cur.fetchall()]
        except Exception:
            similar = []
        ctx = {"case_id": case_id, "person_id": str(person.get("id")), "name": person.get("name_roman"),
               "office": case["office"], "helper": str(case["helper_user_id"]) if case.get("helper_user_id") else None,
               "consent": detail, "similar": similar, "identity_evidence": ident_ev, "owner": str(case["owner_user_id"]), "status": case["status"],
               "quarter": case["quarter"]}
        return {"facts": facts, "context": ctx, "consent_id": str(crow["id"]) if crow else None}


# ------------------------------------------------------------------ decisions
_ALLOWED_MOVES = {
    "draft": {"submitted", "closed"},
    "submitted": {"awaiting_proof", "in_review", "approved", "rejected", "stopped"},
    "awaiting_proof": {"submitted", "in_review", "rejected", "stopped"},
    "in_review": {"awaiting_proof", "approved", "rejected", "stopped"},
    "approved": {"paid", "stopped", "in_review"},
    "rejected": {"closed", "in_review"}, "paid": {"closed"}, "stopped": {"submitted", "in_review", "closed"},
}
_FLAG_FOR = {"R_SCAM_FLAG": "scam", "R_DOC_EDITED": "forgery", "R_DUPLICATE_IDENTITY": "duplicate_identity",
             "R_PAYOUT_ACCOUNT_SHARED": "payout_account", "R_PAYOUT_HELPER_OWNED": "payout_account"}
_SEVERITY = {"R_CONSENT_MISSING": 90, "R_SCAM_FLAG": 85, "R_DOC_EDITED": 80, "R_DUPLICATE_IDENTITY": 80, "R_DECEASED": 75,
             "R_PAYOUT_ACCOUNT_SHARED": 70, "R_PAYOUT_HELPER_OWNED": 70, "R_PAYOUT_ACCOUNT_CHANGED": 60, "R_PAYOUT_OVER_CAP": 55,
             "R_CNIC_EXPIRED": 50, "R_NAME_AMBIGUOUS": 40, "R_EXCLUSION_HIT": 35, "R_PMT_BORDERLINE": 20}


def priority_for(card: DecisionCard, amount: int) -> float:
    return round(_SEVERITY.get(card.reason_code, 10) + amount / 1000.0, 2)


def _target_status(card: DecisionCard) -> str:
    if card.reason_code == "R_CONSENT_MISSING":
        return "stopped"
    return {"APPROVE": "approved", "REJECT": "rejected", "ASK_PROOF": "awaiting_proof"}.get(card.result, "in_review")


def write_decision(case_id: str, card: DecisionCard, rule_set_id: str, snapshot: dict, notes: dict | None,
                   consent_id: str | None, facts_hash_only: bool = True) -> dict:
    """Write the AI decision FIRST, then (optionally) the notes and flags, then move the case status."""
    with _Master("ai", "engine") as cur:
        cur.execute("select status, amount from public.cases where id = %s for update", [case_id])
        c = cur.fetchone()
        if not c:
            raise ApiError("NOT_FOUND")
        cur.execute(
            "insert into public.decisions (case_id, actor_type, zone, result, reason_code, confidence, approve_line, reject_line, "
            "rule_set_id, rule_version, rule_checksum, model_version, checks, explain_citizen, trace, next_step, input_snapshot, "
            "consent_snapshot_id, costs_used) values (%s,'ai',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
            "returning id, created_at",
            [case_id, card.zone, card.result, card.reason_code, card.confidence, card.approve_line, card.reject_line,
             rule_set_id, card.rule_version, card.rule_checksum, card.model_version,
             Jsonb([x.model_dump() for x in card.checks]), Jsonb(card.explain_citizen), Jsonb(card.trace),
             Jsonb(card.next_step.model_dump()), Jsonb(snapshot), consent_id, Jsonb(card.costs_used)])
        d = cur.fetchone()
        notes_id = None
        if notes is not None:
            cur.execute("insert into public.case_notes (case_id, decision_id, package) values (%s,%s,%s) returning id",
                        [case_id, d["id"], Jsonb(notes)])
            notes_id = str(cur.fetchone()["id"])
        kind = _FLAG_FOR.get(card.reason_code)
        if kind:
            cur.execute("select 1 from public.case_flags where case_id = %s and kind = %s and status = 'open'", [case_id, kind])
            if not cur.fetchone():
                cur.execute("insert into public.case_flags (case_id, kind, severity, note) values (%s,%s,'hard',%s)",
                            [case_id, kind, f"opened by the engine: {card.reason_code}"])
        target = _target_status(card)
        sets = ["zone = %s", "result = %s", "priority = %s"]
        args: list[Any] = [card.zone, card.result, priority_for(card, c["amount"])]
        if target != c["status"] and target in _ALLOWED_MOVES.get(c["status"], set()):
            sets.append("status = %s")
            args.append(target)
        else:
            target = c["status"]
        cur.execute(f"update public.cases set {', '.join(sets)} where id = %s", args + [case_id])
        if card.zone == "ASK_MORE":
            cur.execute("insert into public.case_events (case_id, kind, data) values (%s,'proof_requested',%s)",
                        [case_id, Jsonb({"reason_code": card.reason_code})])
        return {"decision_id": str(d["id"]), "created_at": d["created_at"].astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                "case_notes_id": notes_id, "status": target}


# ------------------------------------------------------------------ mock payment
def release_payment(case_id: str) -> dict:
    """Queue the mock payment for an approved case. Consent is checked again, here."""
    with _Master("system", "payments") as cur:
        cur.execute("select * from public.cases where id = %s", [case_id])
        case = cur.fetchone()
        if not case:
            raise ApiError("NOT_FOUND")
        ok, detail = consent_state(cur, case)
        if not ok:
            raise ApiError("CONSENT_REQUIRED", message="Payment cannot be released: the person has not given permission (or took it back).")
        if case["status"] != "approved":
            raise ApiError("CONFLICT", message="Only an approved case can be paid.")
        if not case.get("payout_account"):
            raise ApiError("CONFLICT", message="The case has no payout account.")
        # the payout account enters the government registry only now, after approval (it was never in it before)
        cur.execute("select name_roman, cnic from public.people where id = %s", [case["person_id"]])
        who = cur.fetchone() or {}
        cur.execute("insert into mock.raast_accounts (account_id, title, owner_cnic, kind) values (%s,%s,%s,'wallet') on conflict (account_id) do nothing",
                    [case["payout_account"], (who.get("name_roman") or "ACCOUNT HOLDER")[:120], who.get("cnic")])
        cur.execute("select id from mock.raast_payments where case_id = %s and status in ('queued','pending','settled')", [case_id])
        ex = cur.fetchone()
        if ex:
            return {"payment_id": str(ex["id"]), "status": "already_queued"}
        ref = "MOCK-" + hashlib.sha256(f"{case_id}{uuid.uuid4()}".encode()).hexdigest()[:10].upper()
        cur.execute("insert into mock.raast_payments (case_id, account_id, amount, status, reference) values (%s,%s,%s,'pending',%s) returning id",
                    [case_id, case["payout_account"], case["amount"], ref])
        return {"payment_id": str(cur.fetchone()["id"]), "status": "pending", "reference": ref, "mock": True}


def settle_payment(case_id: str) -> dict:
    with _Master("system", "payments") as cur:
        cur.execute("select * from public.cases where id = %s for update", [case_id])
        case = cur.fetchone()
        if not case:
            raise ApiError("NOT_FOUND")
        ok, _ = consent_state(cur, case)
        if not ok:
            raise ApiError("CONSENT_REQUIRED", message="Payment cannot be released: the person has not given permission (or took it back).")
        cur.execute("update mock.raast_payments set status = 'settled', settled_at = now() where case_id = %s and status in ('queued','pending') returning id, reference",
                    [case_id])
        p = cur.fetchone()
        if not p:
            raise ApiError("CONFLICT", message="There is no pending payment for this case.")
        cur.execute("update public.cases set status = 'paid' where id = %s and status = 'approved'", [case_id])
        return {"payment_id": str(p["id"]), "status": "settled", "reference": p["reference"], "mock": True}


# ------------------------------------------------------------------ jobs and diary
def job_diary(action: str, details: dict | None = None, entity_type: str | None = None, entity_id: str | None = None) -> None:
    with _Master("job", "scheduler") as cur:
        cur.execute("insert into public.audit_log (actor_type, action, entity_type, entity_id, details) values ('job',%s,%s,%s,%s)",
                    [action[:80], entity_type, entity_id, Jsonb(details or {})])


def run_scheduled_jobs() -> dict:
    with _Master("job", "scheduler") as cur:
        cur.execute("select app.expire_consents() as n")
        n = cur.fetchone()["n"]
        cur.execute("insert into public.audit_log (actor_type, action, details) values ('job','job.expire_consents',%s)",
                    [Jsonb({"expired": n})])
        return {"expired_consents": n}


# ------------------------------------------------------------------ small reads
def resume_exists(code: str) -> dict | None:
    with _Master("system", "resume") as cur:
        cur.execute("select id, step, status from public.cases where resume_code = %s and status in ('draft','awaiting_proof')", [code])
        r = cur.fetchone()
        return {"case_id": str(r["id"]), "step": r["step"], "status": r["status"]} if r else None


def api_key_lookup(key_hash: str) -> dict | None:
    with _Master("system", "public-api") as cur:
        cur.execute("select id, name, scopes, rate_limit_per_min, revoked from public.api_keys where key_hash = %s", [key_hash])
        k = cur.fetchone()
        if k and not k["revoked"]:
            cur.execute("update public.api_keys set last_used_at = now() where id = %s", [k["id"]])
        return k


def public_case_status(case_id: str) -> dict | None:
    """Status of a case for the public API. Needs the person's active consent for the service."""
    with _Master("system", "public-api") as cur:
        cur.execute("select id, status, zone, quarter, owner_user_id, helper_user_id, updated_at from public.cases where id = %s", [case_id])
        c = cur.fetchone()
        if not c:
            return None
        ok, _ = consent_state(cur, c)
        if not ok:
            raise ApiError("CONSENT_REQUIRED")
        return {"case_id": str(c["id"]), "status": c["status"], "quarter": c["quarter"], "updated_at": c["updated_at"].isoformat()}


def mock_nadra(cnic: str) -> dict | None:
    with _Master("system", "mock-nadra") as cur:
        cur.execute("select cnic, name_roman, name_ur, father_or_husband, dob_iso, gender, district, expiry, status from mock.nadra where cnic = %s", [cnic])
        r = cur.fetchone()
        return json.loads(json.dumps(r, default=str)) if r else None


def mock_nser(household_id: str) -> dict | None:
    with _Master("system", "mock-nser") as cur:
        cur.execute("select household_id, pmt_score, members, flags, survey_date, district from mock.nser where household_id = %s", [household_id])
        r = cur.fetchone()
        return json.loads(json.dumps(r, default=str)) if r else None


def mock_raast_verify(account: str) -> dict:
    """The government registry holds NO payout accounts up front. A typed number is only checked for the right shape
    (a Pakistani mobile account: 11 digits starting 03) and against the claims already on file (shared with another household?).
    The account is written to the registry only after a claim is approved (see release_payment). No name is returned."""
    digits = re.sub(r"\D", "", account or "")
    if not re.fullmatch(r"03\d{9}", digits):
        return {"valid": False, "title": None, "shared_with_other_households": False}
    with _Master("system", "mock-raast") as cur:
        cur.execute("select count(distinct coalesce(household_id, person_id)) as n from public.cases where payout_account = %s", [digits])
        n = cur.fetchone()["n"]
        cur.execute("select status from mock.raast_accounts where account_id = %s", [digits])
        a = cur.fetchone()
        return {"valid": not a or a["status"] == "active", "title": None, "shared_with_other_households": n > 1}


def labelled_history(limit: int = 500) -> list[dict]:
    with _Master("system", "twin") as cur:
        cur.execute("select case_id, truth, facts, category from public.labelled_cases limit %s", [max(1, min(limit, 2000))])
        return [{"id": str(r["case_id"]), "facts": r["facts"], "truth_eligible": r["truth"] == "eligible", "category": r["category"]}
                for r in cur.fetchall()]


def analytics() -> dict:
    with _Master("system", "analytics") as cur:
        cur.execute("select count(*) as n from public.cases")
        total = cur.fetchone()["n"]
        cur.execute("select coalesce(zone,'none') as z, count(*) as n from public.cases group by 1")
        by_zone = {r["z"]: r["n"] for r in cur.fetchall() if r["z"] != "none"}
        cur.execute("select status, count(*) as n from public.cases group by 1")
        by_status = {r["status"]: r["n"] for r in cur.fetchall()}
        cur.execute("select count(*) as n from public.cases where zone = 'HUMAN' and status in ('submitted','in_review')")
        queue = cur.fetchone()["n"]
        cur.execute("select count(*) as n from public.scam_reports")
        scams = cur.fetchone()["n"]
        cur.execute("select count(*) filter (where actor_type='user') as users, count(*) as n from public.decisions")
        d = cur.fetchone()
        return {"cases_total": total, "by_zone": by_zone, "by_status": by_status, "queue_open": queue, "scam_checked": scams,
                "override_rate": round(d["users"] / d["n"], 3) if d["n"] else 0.0}


# ------------------------------------------------------------------ evaluation store, duplicates, helper list, users
def store_eval_run(user_id: str, metrics: dict, rule_set_id: str | None, model_version: str, cases: list[dict]) -> str:
    with _Master("job", "evaluation") as cur:
        cur.execute("insert into public.eval_runs (triggered_by, rule_set_id, model_version, metrics) values (%s,%s,%s,%s) returning id",
                    [user_id, rule_set_id, model_version, Jsonb(metrics)])
        rid = cur.fetchone()["id"]
        for c in cases[:200]:
            cur.execute("insert into public.eval_cases (run_id, case_text, truth, predicted, zone, correct, cost) values (%s,%s,%s,%s,%s,%s,%s)",
                        [rid, c.get("case"), c.get("truth"), c.get("predicted"), c.get("zone"), c.get("correct"), c.get("cost")])
        cur.execute("insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, details) values (%s,'job','eval.run','eval_run',%s,%s)",
                    [user_id, rid, Jsonb({"model_version": model_version})])
        return str(rid)


def other_case_documents(case_id: str, sha: str) -> dict:
    """Duplicate check across DIFFERENT people (the same paper sent by two families is the red flag).
    A person's own earlier claim does not count: a retry or a restarted claim re-uses the same papers.
    Returns only ids and hashes, never content or owners."""
    mine = "(select c2.id from public.cases c2 where c2.person_id is not distinct from (select c3.person_id from public.cases c3 where c3.id = %s))"
    with _Master("system", "documents") as cur:
        cur.execute(f"select id from public.documents where sha256 = %s and case_id <> %s and case_id not in {mine} limit 1", [sha, case_id, case_id])
        r = cur.fetchone()
        cur.execute(f"select id, signals->>'ahash' as ah from public.documents where case_id <> %s and case_id not in {mine} and signals ? 'ahash' limit 500", [case_id, case_id])
        return {"exact": {sha: str(r["id"])} if r else {}, "ahash": {x["ah"]: str(x["id"]) for x in cur.fetchall() if x["ah"]}}


def helper_families(helper_id: str, person_ids: list[str]) -> list[dict]:
    """Names are shown only where the family's consent for this helper is active; otherwise masked.
    One query for all families (a far-away database makes one call per family far too slow)."""
    if not person_ids:
        return []
    with _Master("system", "helper") as cur:
        cur.execute(
            """
            select p.id, p.name_roman, p.name_ur, p.cnic, p.district, p.user_id,
                   c.status as cstatus,
                   (case when p.user_id is not null then app.has_consent(%(h)s, p.user_id, 'claim_help', null) else false end) as ok,
                   k.id as case_id, k.status as case_status
            from unnest(%(ids)s::uuid[]) with ordinality as w(pid, ord)
            join public.people p on p.id = w.pid
            left join lateral (select status from public.consents x
                               where x.subject_id = p.user_id and x.grantee_id = %(h)s and x.purpose = 'claim_help'
                               order by x.granted_at desc limit 1) c on true
            left join lateral (select id, status from public.cases y where y.person_id = p.id order by y.created_at desc limit 1) k on true
            order by w.ord
            """, {"h": helper_id, "ids": person_ids})
        out = []

        def mask(n):
            return " ".join((w[0] + "***") for w in (n or "").split()) or "—"
        for p in cur.fetchall():
            status = (p["cstatus"] or "none") if p["user_id"] else "none"
            if status == "granted" and not p["ok"]:
                status = "expired"
            show = status == "granted"
            out.append({"person_id": str(p["id"]), "name_roman": p["name_roman"] if show else mask(p["name_roman"]),
                        "name_ur": p["name_ur"] if show else None, "cnic_last4": (p["cnic"] or "")[-4:] if show else "****",
                        "district": p["district"] if show else None, "consent_status": status,
                        "case_status": p["case_status"] if show and p["case_id"] else None,
                        "case_id": str(p["case_id"]) if show and p["case_id"] else None})
        return out


def create_local_user(user_id: str, email: str, secret: str) -> None:
    with _Master("system", "users") as cur:
        cur.execute("insert into public.local_users (user_id, email, password_hash) values (%s, lower(%s), crypt(%s, gen_salt('bf')))",
                    [user_id, email, secret])
        cur.execute("insert into public.audit_log (actor_type, action, entity_type, entity_id, details) values ('system','user.local_login_created','user',%s,%s)",
                    [user_id, Jsonb({"email_domain": email.split('@')[-1]})])


def registry_consent_ok(kind: str, key: str) -> tuple[bool, bool]:
    """For the mock NADRA / NSER lookups: (person_found, consent_active). Consent of the person who owns the record."""
    with _Master("system", "registry") as cur:
        if kind == "cnic":
            cur.execute("select user_id from public.people where cnic = %s and user_id is not null", [key])
        else:
            cur.execute("select user_id from public.people where household_id = %s and user_id is not null", [key])
        rows = cur.fetchall()
        if not rows:
            return False, False
        return True, any(_has_consent(cur, "service", r["user_id"], "claim_processing") for r in rows)


def grant_consent_with_pin(helper_id: str, person_id: str, pin: str, gtype: str, gid: str, purpose: str, fields: list[str]) -> dict | None:
    """Helper Mode: the citizen types her own PIN on the shared phone, so the consent is really hers.
    Returns the new consent row, or None if the PIN is wrong / the helper is not assigned to this family."""
    with _Master("user", f"helper:{helper_id}") as cur:
        cur.execute("select 1 from public.helper_assignments where helper_user_id = %s and person_id = %s", [helper_id, person_id])
        if not cur.fetchone():
            return None
        cur.execute("select user_id from public.people where id = %s", [person_id])
        r = cur.fetchone()
        if not r or not r["user_id"]:
            return None
        subject = str(r["user_id"])
        cur.execute("select email from public.local_users where user_id = %s", [subject])
        e = cur.fetchone()
        if not e:
            return None
        cur.execute("select app.local_login(%s, %s) as uid", [e["email"], pin[:200]])
        ok = cur.fetchone()
        if not ok or str(ok["uid"] or "") != subject:
            return None
        # the PIN proves it is really her. Two permissions are recorded as hers: the office (to process the claim) and
        # THIS helper (to help her). Without the helper one the helper could never open her family.
        for g_type, g_id, g_purpose, g_fields in ((gtype, gid, purpose, fields), ("helper", helper_id, "claim_help", ["name", "cnic"])):
            cur.execute("select 1 from public.consents where subject_id=%s and grantee_type=%s and grantee_id=%s and purpose=%s and status='granted'",
                        [subject, g_type, g_id, g_purpose])
            if not cur.fetchone():
                cur.execute("insert into public.consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
                            "values (%s,%s,%s,%s,%s,%s,'granted')", [subject, g_type, g_id, g_purpose, g_fields, helper_id])
        cur.execute("select * from public.consents where subject_id=%s and grantee_type=%s and grantee_id=%s and purpose=%s and status='granted' "
                    "order by granted_at desc limit 1", [subject, gtype, gid, purpose])
        row = cur.fetchone()
        cur.execute("insert into public.audit_log (actor_type, actor_id, action, entity_type, entity_id, details) "
                    "values ('user', %s, 'consent.granted_with_pin', 'consent', %s, %s)",
                    [helper_id, str(row["id"]), Jsonb({"subject_id": subject, "by_helper": helper_id, "proof": "citizen_pin"})])
        return row


# ------------------------------------------------------------------ "tell us and we check" proofs (nothing is ever shown back)
def _digits(x: object) -> str:
    return "".join(ch for ch in str(x or "") if ch.isdigit())


def household_size_check(case_id: str, user_id: str, members: int) -> dict:
    """The person types how many people live in her household. The server compares it with the survey record and answers
    only yes or no (the number is never shown). Three wrong tries lock it; each try is a line on the claim's timeline."""
    with _Master("user", f"household-check:{user_id}") as cur:
        cur.execute("select c.household_id, c.owner_user_id, c.helper_user_id from public.cases c where c.id = %s", [case_id])
        c = cur.fetchone()
        if not c or str(user_id) not in (str(c["owner_user_id"]), str(c["helper_user_id"] or "")):
            raise ApiError("NOT_FOUND")
        cur.execute("select count(*) as n from public.case_events where case_id = %s and kind = 'household_check' and (data->>'ok') = 'false'", [case_id])
        failed = cur.fetchone()["n"]
        cur.execute("select count(*) as n from public.case_events where case_id = %s and kind = 'household_check' and (data->>'ok') = 'true'", [case_id])
        if cur.fetchone()["n"]:
            return {"match": True, "locked": False, "tries_left": 3 - failed}
        if failed >= 3:
            return {"match": False, "locked": True, "tries_left": 0}
        cur.execute("select members from mock.nser where household_id = %s", [c["household_id"]])
        n = cur.fetchone()
        if not n:
            cur.execute("select members from public.households where id = %s", [c["household_id"]])
            n = cur.fetchone()
        ok = bool(n) and int(n["members"]) == int(members)
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'household_check',%s,%s)",
                    [case_id, user_id, Jsonb({"ok": ok})])
        left = 3 - (failed + (0 if ok else 1))
        return {"match": ok, "locked": (not ok) and left <= 0, "tries_left": max(left, 0)}


def verify_family_for_helper(helper_id: str, cnic: str, dob: str, members: int, office: str | None) -> dict:
    """Helper Mode consent. The woman tells the helper her ID number, her date of birth and the number of people in her household.
    The server checks them against the government records and answers yes or no, so the helper never sees the record.
    Right answers record HER permission (to the office and to this helper). Three wrong tries lock the family for 30 minutes."""
    from .identity.normalize import parse_date
    digits = _digits(cnic)
    with _Master("user", f"helper:{helper_id}") as cur:
        cur.execute("select p.id, p.user_id from public.people p join public.helper_assignments a on a.person_id = p.id "
                    "where a.helper_user_id = %s and p.cnic = %s", [helper_id, digits])
        fam = cur.fetchone()
        if not fam or not fam["user_id"]:
            return {"ok": False, "locked": False}          # the same answer for an unknown number and a family that is not his
        pid, subject = str(fam["id"]), str(fam["user_id"])
        # wrong tries count for 30 minutes, but the demo reset (diary line 'demo.reset_helper') starts the count again
        cur.execute("select count(*) as n from public.audit_log where actor_id = %s and action = 'helper.verify_failed' and entity_id = %s "
                    "and ts > now() - interval '30 minutes' "
                    "and ts > coalesce((select max(ts) from public.audit_log where actor_id = %s and action = 'demo.reset_helper'), '-infinity')",
                    [helper_id, pid, helper_id])
        failed_before = cur.fetchone()["n"]
        if failed_before >= 3:
            return {"ok": False, "locked": True}
        cur.execute("select dob_iso from mock.nadra where cnic = %s", [digits])
        g = cur.fetchone()
        cur.execute("select n.members from public.people p join mock.nser n on n.household_id = p.household_id where p.id = %s", [pid])
        h = cur.fetchone()
        if not h:
            cur.execute("select h.members from public.people p join public.households h on h.id = p.household_id where p.id = %s", [pid])
            h = cur.fetchone()
        pd = parse_date(dob)
        dob_ok = False
        if g and g["dob_iso"]:
            iso = g["dob_iso"].isoformat()
            dob_ok = iso in pd["candidates"] or (pd["precision"] == "year" and pd["year"] == g["dob_iso"].year)
        size_ok = bool(h) and int(h["members"]) == int(members)
        ok = dob_ok and size_ok
        if not ok:
            cur.execute("insert into public.audit_log (actor_type, actor_id, action, entity_type, entity_id, details) "
                        "values ('user', %s, 'helper.verify_failed', 'person', %s, %s)", [helper_id, pid, Jsonb({"dob_ok": dob_ok, "size_ok": size_ok})])
            return {"ok": False, "locked": False, "tries_left": max(0, 2 - failed_before)}
        gid = office or "-"
        for g_type, g_id, g_purpose in (("office", gid, "claim_processing"), ("helper", helper_id, "claim_help")):
            cur.execute("select 1 from public.consents where subject_id=%s and grantee_type=%s and grantee_id=%s and purpose=%s and status='granted'",
                        [subject, g_type, g_id, g_purpose])
            if not cur.fetchone():
                cur.execute("insert into public.consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
                            "values (%s,%s,%s,%s,%s,%s,'granted')", [subject, g_type, g_id, g_purpose, ["*"], helper_id])
        cur.execute("insert into public.audit_log (actor_type, actor_id, action, entity_type, entity_id, details) "
                    "values ('user', %s, 'consent.granted_with_details', 'person', %s, %s)",
                    [helper_id, pid, Jsonb({"by_helper": helper_id, "proof": "id_number_dob_household_size"})])
        return {"ok": True, "locked": False, "person_id": pid}


def demo_reset_helper(helper_id: str) -> dict:
    """Demo only: puts everything THIS helper changed back to its initial state, and closes his session (he goes back to his lobby).
    For each family assigned to him: her claims are closed and her payout side emptied (see demo_restart), and the permission
    she gave HIM (by her three details) is taken back, so the next demo starts at the three-detail check again.
    Her own permission to the office stays (the seed gave it). Claims, decisions and the diary stay as history."""
    reset = 0
    with _Master("system", "demo_reset_helper") as cur:
        cur.execute("select p.user_id from public.helper_assignments a join public.people p on p.id = a.person_id where a.helper_user_id = %s", [helper_id])
        users = [str(r["user_id"]) for r in cur.fetchall() if r["user_id"]]
        cur.execute("update public.helper_assignments set active = false where helper_user_id = %s", [helper_id])
    for u in users:
        demo_restart(u)
        reset += 1
    with _Master("system", "demo_reset_helper") as cur:
        for u in users:
            cur.execute("update public.consents set status = 'withdrawn' where subject_id = %s and grantee_type = 'helper' and grantee_id = %s and status = 'granted'",
                        [u, helper_id])
        cur.execute("insert into public.audit_log (actor_type, actor_id, action, entity_type, details) values ('user', %s, 'demo.reset_helper', 'helper', %s)",
                    [helper_id, Jsonb({"families": reset})])
    return {"families_reset": reset}


def carry_helper_proof(case_id: str, helper_id: str, person_id: str) -> None:
    """A helper opens a claim only after her ID number, date of birth and household size matched the government records
    (verify_family_for_helper). That check IS the household-size check for this claim, so she is not asked again:
    the claim gets its 'household_check ok' line, written here by the server (never by the client)."""
    with _Master("system", "helper-proof") as cur:
        cur.execute("select c.id from public.consents c join public.people p on p.user_id = c.subject_id "
                    "where p.id = %s and c.grantee_type = 'helper' and c.grantee_id = %s and c.purpose = 'claim_help' and c.status = 'granted' "
                    "and c.granted_by = %s limit 1", [person_id, helper_id, helper_id])
        if not cur.fetchone():
            return                                  # no proof on file: the normal steps stay required
        cur.execute("select 1 from public.case_events where case_id = %s and kind = 'household_check' and (data->>'ok') = 'true'", [case_id])
        if not cur.fetchone():
            cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'household_check',%s,%s)",
                        [case_id, helper_id, Jsonb({"ok": True, "via": "helper_proof"})])


def audit_document_view(user_id: str, case_id: str, doc_id: str, role: str) -> None:
    """Every time someone opens a paper, the diary says who, which paper and which claim."""
    with _Master("user", f"doc-view:{user_id}") as cur:
        cur.execute("insert into public.audit_log (actor_type, actor_id, actor_role, action, entity_type, entity_id, details) "
                    "values ('user', %s, %s, 'document.viewed', 'document', %s, %s)", [user_id, role, doc_id, Jsonb({"case_id": case_id})])


# the legal paths a case may take to "closed" (the database guard allows only these)
_TO_CLOSED = {"draft": ["closed"], "submitted": ["stopped", "closed"], "awaiting_proof": ["stopped", "closed"], "in_review": ["stopped", "closed"],
              "approved": ["stopped", "closed"], "paid": ["closed"], "rejected": ["closed"], "stopped": ["closed"]}


def demo_restart(owner_user_id: str) -> int:
    """Demo only: puts THIS person back to her initial state. Her live claim(s) are closed, and her payout side is emptied:
    no account number on any of her claims, none in the payout registry, no payment given. The claims, papers, decisions and the
    diary lines all stay (they are append-only history; closing is the normal, legal end of a claim).
    Returns how many claims were closed."""
    n = 0
    with _Master("system", "demo_restart") as cur:
        cur.execute("select id, status from public.cases where owner_user_id = %s and status not in ('closed')", [owner_user_id])
        for row in cur.fetchall():
            for nxt in _TO_CLOSED.get(row["status"], ["closed"]):
                cur.execute("update public.cases set status = %s where id = %s", [nxt, row["id"]])
            cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'demo_restart',%s,%s)",
                        [row["id"], owner_user_id, Jsonb({"from": row["status"]})])
            n += 1
        # her payout side back to empty: payments given, the account in the registry, and the account number on her claims
        cur.execute("select id, payout_account from public.cases where owner_user_id = %s", [owner_user_id])
        mine = cur.fetchall()
        ids = [r["id"] for r in mine]
        accts = [r["payout_account"] for r in mine if r["payout_account"]]
        cur.execute("select cnic from public.people where user_id = %s", [owner_user_id])
        pe = cur.fetchone()
        if ids:
            cur.execute("delete from mock.raast_payments where case_id = any(%s)", [ids])
        cur.execute("delete from mock.raast_accounts where account_id = any(%s) or owner_cnic = %s", [accts, (pe or {}).get("cnic")])
        # two steps: clearing an account stamps "changed" (a different account was entered); the second step clears that stamp
        cur.execute("update public.cases set payout_account = null, payout_account_title = null where owner_user_id = %s", [owner_user_id])
        cur.execute("update public.cases set payout_changed_at = null where owner_user_id = %s", [owner_user_id])
        cur.execute("insert into public.audit_log (actor_type, actor_id, action, entity_type, details) values ('user', %s, 'demo.reset_person', 'person', %s)",
                    [owner_user_id, Jsonb({"payments_removed": True, "accounts_removed": len(accts)})])
    return n
