"""Cases: create, list, detail, draft, resume, documents, submit, decide, decisions, queue, officer decision,
assign / escalate / close / events / notes, identity check."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

import psycopg
from fastapi import APIRouter, Depends, Header, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field

from .. import pipeline, ratelimit, service_writes as sw
from ..config import get_settings
from ..db import jsonb, user_tx, whoami
from ..deps import Principal, _client_ip, bearer_claims, idem_get, idem_put, require
from ..docs import analyze as DA, ocr
from ..engine import reasons as R
from ..errors import ApiError
from ..identity.match import match_records
from ..paths import storage_dir

router = APIRouter()

DOC_TYPES = {"cnic_front", "cnic_back", "death_certificate", "utility_bill", "b_form", "other"}


def _quarter() -> str:
    n = datetime.now(timezone.utc)
    return f"{n.year}-Q{(n.month - 1) // 3 + 1}"


def _iso(v):
    return v.isoformat().replace("+00:00", "Z") if hasattr(v, "isoformat") else v


def _case_row(r: dict) -> dict:
    keys = ("id", "status", "zone", "result", "amount", "quarter", "step", "resume_code", "office", "payout_account",
            "payout_account_title", "draft", "owner_user_id", "helper_user_id", "assigned_officer", "person_id")
    out = {k: r.get(k) for k in keys if k in r}
    for k in ("id", "owner_user_id", "helper_user_id", "assigned_officer", "person_id"):
        if out.get(k) is not None:
            out[k] = str(out[k])
    for k in ("created_at", "updated_at"):
        if k in r:
            out[k] = _iso(r[k])
    out["priority"] = float(r["priority"]) if r.get("priority") is not None else 0
    return out


def _second_limit() -> int:
    got = sw.fetch_rule_set()
    return got[1].params.second_approver_over if got else 10**9


# ---------------------------------------------------------------- create / list / detail
class CaseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    person_id: str | None = None


@router.post("/cases", tags=["cases"])
def create_case(body: CaseIn, p: Principal = Depends(require("citizen", "helper")),
                idempotency_key: str | None = Header(default=None)):
    prev = idem_get(p.id, "POST /cases", idempotency_key)
    if prev:
        return prev
    with user_tx(p.id) as cur:
        if p.role == "citizen":
            pid = p.person_id
            if body.person_id and body.person_id != pid:
                raise ApiError("FORBIDDEN")
            owner, helper = p.id, None
        else:
            if not body.person_id:
                raise ApiError("VALIDATION", message="A helper must say which family (person_id).")
            pid = body.person_id
            cur.execute("select app.person_user(%s) as u", [pid])
            owner, helper = cur.fetchone()["u"], p.id
        if not pid or not owner:
            raise ApiError("CONFLICT", message="This account is not linked to a person record.")
        cur.execute("select household_id from public.people where id = %s", [pid])
        pr = cur.fetchone()
        if not pr:
            raise ApiError("FORBIDDEN")   # a helper without an open family session cannot even see the person
        cur.execute("savepoint c1")
        try:
            cur.execute("insert into public.cases (owner_user_id, helper_user_id, person_id, household_id, office, quarter, status) "
                        "values (%s,%s,%s,%s,'-',%s,'draft') returning *", [owner, helper, pid, pr["household_id"], _quarter()])
            row = cur.fetchone()
            cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'created',%s,'{}')", [row["id"], p.id])
        except psycopg.errors.UniqueViolation:
            cur.execute("rollback to savepoint c1")
            cur.execute("select * from public.cases where person_id = %s and quarter = %s and status not in ('closed','stopped','rejected')",
                        [pid, _quarter()])
            row = cur.fetchone()
            if not row:
                raise ApiError("CONFLICT")
        out = _case_row(row)
    if p.role == "helper":
        sw.carry_helper_proof(str(row["id"]), p.id, str(pid))
    idem_put(p.id, "POST /cases", idempotency_key, out)
    return out


@router.get("/cases/{case_id}/documents/{doc_id}/image", tags=["cases"])
def document_image(case_id: str, doc_id: str, p: Principal = Depends(require("admin", "citizen", "helper"))):
    """The photo a person sent, for the people who may see the claim (an admin: own office and active consent, decided by the row locks).
    Sent as base64 inside JSON like the rest of the API. Each view is written to the diary."""
    import base64
    if not (_isuuid(case_id) and _isuuid(doc_id)):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select d.storage_path, d.doc_type from public.documents d where d.id = %s and d.case_id = %s", [doc_id, case_id])
        row = cur.fetchone()
    if not row:
        raise ApiError("NOT_FOUND")
    root = storage_dir().resolve()
    path = (root / row["storage_path"]).resolve()
    if root not in path.parents or not path.is_file():
        raise ApiError("NOT_FOUND", message="The file is not available.")
    ctype = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(path.suffix.lower(), "application/octet-stream")
    sw.audit_document_view(p.id, case_id, doc_id, p.role)
    return {"content_type": ctype, "doc_type": row["doc_type"], "data": base64.b64encode(path.read_bytes()).decode()}


@router.post("/demo/restart-claim", tags=["demo"])
def demo_restart_claim(p: Principal = Depends(require("citizen"))):
    """Demo control: close this person's live claim so the registration can be shown again (e.g. a right card, then a wrong card)."""
    if not get_settings().demo_restart:
        raise ApiError("FORBIDDEN", message="This control is switched off.")
    return {"closed": sw.demo_restart(p.id)}


@router.post("/demo/reset-helper", tags=["demo"])
def demo_reset_helper(p: Principal = Depends(require("helper"))):
    """Demo control for the helper: everything he changed goes back to the start and his session closes (he returns to his lobby)."""
    if not get_settings().demo_restart:
        raise ApiError("FORBIDDEN", message="This control is switched off.")
    return sw.demo_reset_helper(p.id)


@router.get("/cases", tags=["cases"])
def list_cases(status: str | None = None, p: Principal = Depends(require())):
    with user_tx(p.id) as cur:
        cur.execute("select c.*, pe.name_roman, pe.name_ur from public.cases c left join public.people pe on pe.id = c.person_id "
                    "where (%s::text is null or c.status = %s) order by c.updated_at desc limit 200", [status, status])
        out = []
        for r in cur.fetchall():
            d = _case_row(r)
            d["person_name"], d["person_name_ur"] = r["name_roman"], r["name_ur"]
            out.append(d)
        return out


def _detail(cur, p: Principal, case_id: str, lim: int) -> dict:
    try:
        uuid.UUID(case_id)
    except ValueError:
        raise ApiError("NOT_FOUND")
    cur.execute("select * from public.cases where id = %s", [case_id])
    c = cur.fetchone()
    if not c:
        raise ApiError("NOT_FOUND")
    out = _case_row(c)
    cur.execute("select * from public.people where id = %s", [c["person_id"]])
    pe = cur.fetchone()
    if pe:
        out["person"] = {"id": str(pe["id"]), "name_roman": pe["name_roman"], "name_ur": pe["name_ur"],
                         "cnic_masked": pipeline.mask_cnic(pe["cnic"]), "district": pe["district"],
                         "father_or_husband": pe["father_or_husband"], "gender": pe["gender"]}
    hh = None
    if c["household_id"]:
        cur.execute("select id, members, district, pmt_score from public.households where id = %s", [c["household_id"]])
        hh = cur.fetchone()
    if hh:
        out["household"] = {"id": str(hh["id"]), "members": hh["members"], "district": hh["district"],
                            "pmt_score": float(hh["pmt_score"]) if hh["pmt_score"] is not None else None}
    cur.execute("select id, doc_type, verdict, signals, created_at from public.documents where case_id = %s order by created_at", [case_id])
    out["documents"] = [{"id": str(d["id"]), "doc_type": d["doc_type"], "verdict": d["verdict"], "signals": d["signals"],
                         "uploaded_at": _iso(d["created_at"])} for d in cur.fetchall()]
    cur.execute("select * from public.decisions where case_id = %s order by created_at desc limit 1", [case_id])
    d = cur.fetchone()
    out["latest_decision"] = pipeline.card_from_row(d) if d else None
    cur.execute("select status from public.consents where subject_id = %s and grantee_id = 'service' and purpose = 'claim_processing' "
                "order by granted_at desc limit 1", [c["owner_user_id"]]) if p.role != "admin" else cur.execute(
        "select case when active then 'granted' else 'withdrawn' end as status from public.consent_flags "
        "where subject_id = %s and purpose = 'claim_processing' limit 1", [c["owner_user_id"]])
    cs = cur.fetchone()
    out["consent_status"] = cs["status"] if cs else "none"
    out["needs_second_approver"] = bool(c["amount"] > lim)
    if str(c["owner_user_id"]) != p.id:   # somebody else is looking at a citizen's data: write it in the diary
        cur.execute("select app.log_access('case', %s, 'claim_review', %s)", [case_id, c["owner_user_id"]])
    return out


@router.get("/cases/{case_id}", tags=["cases"])
def get_case(case_id: str, p: Principal = Depends(require())):
    lim = _second_limit()   # master read first: only one database connection is open at a time
    with user_tx(p.id) as cur:
        return _detail(cur, p, case_id, lim)


# ---------------------------------------------------------------- draft / resume
class DraftIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step: int = Field(ge=0, le=50)
    draft: dict[str, Any]


@router.put("/cases/{case_id}/draft", tags=["cases"])
def save_draft(case_id: str, body: DraftIn, p: Principal = Depends(require("citizen", "helper")),
               idempotency_key: str | None = Header(default=None)):
    import json
    if len(json.dumps(body.draft)) > 60_000:
        raise ApiError("VALIDATION", message="The draft is too large.")
    try:
        uuid.UUID(case_id)
    except ValueError:
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select app.save_draft(%s,%s,%s,%s) as r", [case_id, body.step, jsonb(body.draft), (idempotency_key or None) and idempotency_key[:120]])
        r = cur.fetchone()["r"]
    return {"saved_at": r["saved_at"], "resume_code": r["resume_code"], "repeat": r.get("repeat", False)}


@router.get("/drafts/resume/{code}", tags=["cases"])
def resume(code: str, request: Request, authorization: str | None = Header(default=None)):
    ratelimit.check("resume", _client_ip(request), 20)
    if not (code.isdigit() and len(code) == 6):
        raise ApiError("NOT_FOUND")
    if authorization:
        claims = bearer_claims(authorization)
        with user_tx(claims["sub"]) as cur:
            cur.execute("select * from app.resume_draft(%s)", [code])
            r = cur.fetchone()
        if r:
            return {"case_id": str(r["case_id"]), "step": r["step"], "draft": r["draft"], "status": r["status"]}
    # no login (or not yours): nothing personal is returned, only that the code is real
    found = sw.resume_exists(code)
    if not found:
        raise ApiError("NOT_FOUND")
    return {"case_id": found["case_id"], "step": found["step"], "draft": {}, "status": found["status"], "requires_login": True}


# ---------------------------------------------------------------- documents
@router.post("/cases/{case_id}/documents", tags=["cases"], openapi_extra={
    "requestBody": {"content": {"multipart/form-data": {"schema": {"type": "object", "properties": {
        "file": {"type": "string", "format": "binary"}, "doc_type": {"type": "string", "enum": sorted(DOC_TYPES)}}}}}}})
async def upload_document(case_id: str, request: Request, p: Principal = Depends(require("citizen", "helper"))):
    ratelimit.check("upload", p.id, 20)
    body = await pipeline.read_limited_body(request, get_settings().max_upload_bytes)
    parsed = pipeline.parse_multipart(request.headers.get("content-type", ""), body)
    return await run_in_threadpool(_store_document, case_id, p, parsed)


def _store_document(case_id: str, p: Principal, parsed: dict) -> dict:
    doc_type = parsed["fields"].get("doc_type", "other")
    if doc_type not in DOC_TYPES:
        raise ApiError("VALIDATION", message="Unknown document type.", details={"allowed": sorted(DOC_TYPES)})
    if "file" not in parsed["files"]:
        raise ApiError("VALIDATION", message="Send the photo in a field called 'file'.")
    fname, data = parsed["files"]["file"]
    ok, why, kind = DA.validate_upload(fname, data, get_settings().max_upload_bytes)
    if not ok:
        raise ApiError("VALIDATION", message=why)
    try:
        uuid.UUID(case_id)
    except ValueError:
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:   # row locks decide who may add a document
        cur.execute("select id, status, owner_user_id from public.cases where id = %s", [case_id])
        c = cur.fetchone()
        if not c:
            raise ApiError("NOT_FOUND")
        if c["status"] not in ("draft", "awaiting_proof"):
            raise ApiError("CONFLICT", message="Documents can only be added while the claim is a draft or waiting for proof.")
        cur.execute("select app.has_consent('service', %s, 'claim_processing', null) as ok", [c["owner_user_id"]])
        if not cur.fetchone()["ok"]:
            raise ApiError("CONSENT_REQUIRED", message="Documents cannot be checked until the person gives permission.")
    sha = DA.sha256_hex(data)
    other = sw.other_case_documents(case_id, sha)
    res = DA.analyze_image(data, doc_type, None, other["exact"], other["ahash"])
    ext = {"png": "png", "jpeg": "jpg", "pdf": "pdf"}[kind or "png"]
    folder = storage_dir() / case_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uuid.uuid4().hex}.{ext}"
    path.write_bytes(data)
    sig = res["signals"]
    if doc_type == "cnic_front" and kind in ("jpeg", "png"):   # computer vision: read the printed name and number off the card
        sig["card"] = ocr.read_card_front(data)
        if sig["card"].get("read") is False and res["verdict"] == "ok":
            res["verdict"] = "ask_better_photo"
            if sig["card"].get("side") == "back":
                sig["card"]["wrong_side"] = "back"            # the BACK was sent where the front belongs
    elif doc_type == "cnic_back" and kind in ("jpeg", "png"):
        sig["card"] = ocr.read_card_back(data)
        if sig["card"].get("read") is False and res["verdict"] == "ok":
            res["verdict"] = "ask_better_photo"
            if sig["card"].get("side") == "front":
                sig["card"]["wrong_side"] = "front"           # the FRONT was sent where the back belongs
    with user_tx(p.id) as cur:
        cur.execute("insert into public.documents (case_id, doc_type, storage_path, sha256, signals, verdict, uploaded_by) "
                    "values (%s,%s,%s,%s,%s,%s,%s) returning id",
                    [case_id, doc_type, f"{case_id}/{path.name}", sha, jsonb(sig), res["verdict"], p.id])
        did = cur.fetchone()["id"]
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'proof_uploaded',%s,%s)",
                    [case_id, p.id, jsonb({"doc_type": doc_type, "verdict": res["verdict"]})])
    return {"id": str(did), "signals": {k: v for k, v in sig.items() if k not in ("sha256", "ahash")}, "verdict": res["verdict"]}


# ---------------------------------------------------------------- submit / decide
@router.post("/cases/{case_id}/submit", tags=["decisions"])
def submit(case_id: str, p: Principal = Depends(require("citizen", "helper")), idempotency_key: str | None = Header(default=None)):
    prev = idem_get(p.id, f"submit {case_id}", idempotency_key)
    if prev:
        return prev
    try:
        uuid.UUID(case_id)
    except ValueError:
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select * from public.cases where id = %s", [case_id])
        c = cur.fetchone()
        if not c:
            raise ApiError("NOT_FOUND")
        if c["status"] not in ("draft", "awaiting_proof"):
            raise ApiError("CONFLICT", message="This claim was already submitted.")
        d = c["draft"] or {}
        acct = d.get("payout_account") or c["payout_account"]
        if acct:
            acct = "".join(ch for ch in str(acct) if ch.isdigit()) or acct   # store digits only, so "0300-123" and "0300123" are one account
        title = d.get("payout_title") or d.get("payout_account_title") or c["payout_account_title"]
        cur.execute("update public.cases set payout_account = %s, payout_account_title = %s, status = 'submitted' where id = %s",
                    [str(acct)[:40] if acct else None, str(title)[:120] if title else None, case_id])
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'submitted',%s,'{}')", [case_id, p.id])
    card = _decide_and_pay(case_id)
    idem_put(p.id, f"submit {case_id}", idempotency_key, card)
    return card


def _decide_and_pay(case_id: str) -> dict:
    card = pipeline.run_decision(case_id)
    if card["result"] == "APPROVE" and card.get("case_status") == "approved":
        try:
            pay = sw.release_payment(case_id)
            # mock Raast pays at once: an automatic approval ends with the money sent to the person's account
            try:
                if get_settings().auto_settle:
                    pay = sw.settle_payment(case_id)
                    card["case_status"] = "paid"
            except ApiError:
                pass
            card["next_step"]["payment"] = pay
        except ApiError:
            pass
    return card


@router.post("/cases/{case_id}/decide", tags=["decisions"])
def decide(case_id: str, p: Principal = Depends(require("admin"))):
    with user_tx(p.id) as cur:   # may this person see the case at all?
        cur.execute("select status from public.cases where id = %s", [case_id] if _isuuid(case_id) else [str(uuid.UUID(int=0))])
        c = cur.fetchone()
        if not c:
            raise ApiError("NOT_FOUND")
        if c["status"] in ("draft", "paid", "closed"):
            raise ApiError("CONFLICT", message="This case cannot be decided again in its current state.")
    return _decide_and_pay(case_id)


def _isuuid(s: str) -> bool:
    try:
        uuid.UUID(s)
        return True
    except ValueError:
        return False


@router.get("/cases/{case_id}/decisions", tags=["decisions"])
def decisions(case_id: str, p: Principal = Depends(require())):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select id from public.cases where id = %s", [case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
        cur.execute("select d.*, (select n.id from public.case_notes n where n.decision_id = d.id limit 1) as notes_id "
                    "from public.decisions d where d.case_id = %s order by d.created_at desc", [case_id])
        return [pipeline.card_from_row(r, str(r["notes_id"]) if r["notes_id"] else None) for r in cur.fetchall()]


# ---------------------------------------------------------------- officer queue and decision
@router.get("/queue", tags=["officer"])
def queue(p: Principal = Depends(require("admin"))):
    lim = _second_limit()
    with user_tx(p.id) as cur:
        cur.execute(
            "select c.*, pe.name_roman, pe.name_ur, d.reason_code, d.confidence, "
            "(select case when f.active then 'granted' else 'withdrawn' end from public.consent_flags f "
            "  where f.subject_id = c.owner_user_id and f.purpose = 'claim_processing' limit 1) as consent "
            "from public.cases c left join public.people pe on pe.id = c.person_id "
            "left join lateral (select reason_code, confidence from public.decisions x where x.case_id = c.id order by x.created_at desc limit 1) d on true "
            "where c.zone = 'HUMAN' and c.status in ('submitted','in_review') "
            "order by c.priority desc, d.confidence asc nulls first, c.created_at limit 200")
        out = []
        for r in cur.fetchall():
            out.append({"id": str(r["id"]), "status": r["status"], "zone": r["zone"], "result": r["result"],
                        "reason_code": r["reason_code"] or "R_LOW_CONFIDENCE",
                        "confidence": float(r["confidence"]) if r["confidence"] is not None else 0.0,
                        "priority": float(r["priority"]), "amount": r["amount"], "quarter": r["quarter"],
                        "person_name": r["name_roman"], "person_name_ur": r["name_ur"], "office": r["office"],
                        "created_at": _iso(r["created_at"]), "consent_status": r["consent"] or "none",
                        "needs_second_approver": r["amount"] > lim})
        return out


class OfficerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: str = Field(pattern="^(approve|reject|ask_more|hold)$")
    note: str = Field(min_length=3, max_length=1000)
    # for "ask for more proof": which paper she must send again (cnic_front, cnic_back, cnic_both, or empty = any paper)
    doc_type: str | None = Field(default=None, pattern="^(cnic_front|cnic_back|cnic_both|other)$")


# the four standard "send it again" messages, in both languages (the voice files for them are recorded ahead of time)
_STD_ASK = {"cnic_front": ("Please upload the front of your ID card again.", "براہ کرم اپنے شناختی کارڈ کے سامنے والے حصے کی تصویر دوبارہ بھیجیں۔"),
            "cnic_back": ("Please upload the back of your ID card again.", "براہ کرم اپنے شناختی کارڈ کے پچھلے حصے کی تصویر دوبارہ بھیجیں۔"),
            "cnic_both": ("Please upload the front and the back of your ID card again.", "براہ کرم اپنے شناختی کارڈ کے دونوں حصوں، سامنے اور پیچھے، کی تصویر دوبارہ بھیجیں۔"),
            "other": ("Please send one more paper.", "براہ کرم ایک اور کاغذ بھیجیں۔")}
_OFFICER_MAP = {"approve": ("HUMAN", "APPROVE", "R_AUTO_APPROVED", "approved"),
                "reject": ("HUMAN", "REJECT", "R_LIKELY_NOT_ELIGIBLE", "rejected"),
                "ask_more": ("ASK_MORE", "ASK_PROOF", "R_DOC_MISSING", "awaiting_proof"),
                "hold": ("HUMAN", "HOLD", None, "in_review")}


def _ask_text(body) -> dict:
    """What she reads and hears. A standard message comes in both languages with a voice recording; words the admin typed
    are shown exactly as typed in both (no translation is made for them)."""
    key = body.doc_type or "other"
    en, ur = _STD_ASK[key]
    if body.note.strip().lower() == en.lower():
        return {"en": en, "ur": ur, "officer": "1", "std": key}
    return {"en": body.note, "ur": body.note, "officer": "1"}


@router.post("/cases/{case_id}/officer-decision", tags=["officer"])
def officer_decision(case_id: str, body: OfficerIn, p: Principal = Depends(require("admin")),
                     idempotency_key: str | None = Header(default=None)):
    prev = idem_get(p.id, f"officer {case_id}", idempotency_key)
    if prev:
        return prev
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    zone, result, reason, target = _OFFICER_MAP[body.decision]
    lim = _second_limit()
    with user_tx(p.id) as cur:
        cur.execute("select * from public.cases where id = %s", [case_id])
        c = cur.fetchone()
        if not c:
            raise ApiError("NOT_FOUND")
        cur.execute("select * from public.decisions where case_id = %s order by created_at desc limit 1", [case_id])
        last = cur.fetchone()
        if not last:
            raise ApiError("CONFLICT", message="There is no decision on this case yet.")
        reason = reason or last["reason_code"]
        cur.execute("insert into public.decisions (case_id, actor_type, actor_id, zone, result, reason_code, confidence, rule_set_id, "
                    "model_version, checks, explain_citizen, trace, next_step, costs_used, note) "
                    "values (%s,'user',%s,%s,%s,%s,1,%s,%s,%s,%s,%s,%s,%s,%s) returning *",
                    [case_id, p.id, zone, result, reason, last["rule_set_id"], last["model_version"], jsonb(last["checks"]),
                     # when staff ask for more proof, the person reads THEIR message (the standard text would not say which paper)
                     jsonb(_ask_text(body) if body.decision == "ask_more" else R.explain(reason)),
                     jsonb([{"step": 1, "what": "officer_decision", "decision": body.decision}]),
                     jsonb({"type": "upload", "doc_type": body.doc_type or "other"} if body.decision == "ask_more"
                           else {"type": "release_payment" if result == "APPROVE" else "human"}), jsonb(last["costs_used"]), body.note])
        row = cur.fetchone()
        needs_second = False
        status = c["status"]
        if target != c["status"]:
            cur.execute("savepoint mv")
            try:
                cur.execute("update public.cases set status = %s, zone = %s, result = %s where id = %s", [target, zone, result, case_id])
                status = target
            except psycopg.errors.CheckViolation as e:
                if "second approver" in str(e):
                    cur.execute("rollback to savepoint mv")
                    needs_second = True    # first approval is recorded; the case waits for a second officer
                else:
                    raise
        else:
            cur.execute("update public.cases set zone = %s, result = %s where id = %s", [zone, result, case_id])
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'officer_decision',%s,%s)",
                    [case_id, p.id, jsonb({"decision": body.decision, "note": body.note[:300], "needs_second_approver": needs_second})])
        card = pipeline.card_from_row(row)
    pay = None
    if status == "approved" and body.decision == "approve":
        try:
            pay = sw.release_payment(case_id)
            if get_settings().auto_settle:
                pay = sw.settle_payment(case_id)
        except ApiError:
            pay = None
    msg = ("Recorded. A second admin must also approve because the amount is over the limit." if needs_second
           else "Recorded.")
    out = {"case_id": case_id, "status": status, "needs_second_approver": needs_second or (c["amount"] > lim and status != "approved"),
           "decision": card, "message": msg, **({"payment": pay} if pay else {})}
    idem_put(p.id, f"officer {case_id}", idempotency_key, out)
    return out


# ---------------------------------------------------------------- notes, events, assign, escalate, close
@router.get("/cases/{case_id}/notes", tags=["officer"])
def notes(case_id: str, p: Principal = Depends(require("admin"))):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select id from public.cases where id = %s", [case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
        cur.execute("select * from public.case_notes where case_id = %s order by created_at desc limit 1", [case_id])
        n = cur.fetchone()
        if not n:
            raise ApiError("NOT_FOUND", message="There are no notes for this case.")
        pk = n["package"] or {}
        reason = None
        cur.execute("select reason_code from public.decisions where id = %s", [n["decision_id"]]) if n["decision_id"] else None
        rr = cur.fetchone() if n["decision_id"] else None
        reason = rr["reason_code"] if rr else "R_LOW_CONFIDENCE"
        pkg = {
            "summary": R.explain(reason),
            "why_unsure": [pk.get("why_unsure", "")] if pk.get("why_unsure") else [],
            "checked": [{"name": c["name"], "verdict": c["verdict"], "detail": c.get("detail")} for c in pk.get("checks", [])],
            "missing": pk.get("missing_proof", []),
            "suggested": [pk["suggested_question"]] if pk.get("suggested_question") else [],
            "compare": pk.get("compare", []),
            "similar_cases": pk.get("similar_cases", []), "versions": pk.get("versions"), "sla": pk.get("sla"),
            "second_approver_required": pk.get("second_approver_required", False),
        }
        return {"id": str(n["id"]), "case_id": case_id, "decision_id": str(n["decision_id"]) if n["decision_id"] else None,
                "created_at": _iso(n["created_at"]), "package": pkg}


@router.get("/cases/{case_id}/events", tags=["officer"])
def events(case_id: str, p: Principal = Depends(require())):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select id from public.cases where id = %s", [case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
        cur.execute("select id, kind, actor_id, data, at from public.case_events where case_id = %s order by at", [case_id])
        return [{"id": str(r["id"]), "kind": r["kind"], "actor_id": str(r["actor_id"]) if r["actor_id"] else None,
                 "data": r["data"], "at": _iso(r["at"])} for r in cur.fetchall()]


class AssignIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    officer_id: str | None = None
    priority: float | None = Field(default=None, ge=0, le=1000)


@router.post("/cases/{case_id}/assign", tags=["officer"])
def assign(case_id: str, body: AssignIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        officer = body.officer_id or (p.id if p.role == "admin" else None)
        sets, args = [], []
        if officer:
            sets.append("assigned_officer = %s")
            args.append(officer)
        if body.priority is not None:
            sets.append("priority = %s")
            args.append(body.priority)
        if not sets:
            raise ApiError("VALIDATION", message="Say who to assign or a priority.")
        cur.execute(f"update public.cases set {', '.join(sets)} where id = %s returning id", args + [case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'assigned',%s,%s)",
                    [case_id, p.id, jsonb({"officer_id": officer, "priority": body.priority})])
    return {"case_id": case_id, "assigned_officer": officer, "priority": body.priority}


class NoteIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: str = Field(min_length=3, max_length=1000)


@router.post("/cases/{case_id}/escalate", tags=["officer"])
def escalate(case_id: str, body: NoteIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("update public.cases set priority = priority + 50 where id = %s returning id, priority", [case_id])
        r = cur.fetchone()
        if not r:
            raise ApiError("NOT_FOUND")
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'escalated',%s,%s)",
                    [case_id, p.id, jsonb({"note": body.note})])
    return {"case_id": case_id, "priority": float(r["priority"]), "escalated": True}


@router.post("/cases/{case_id}/close", tags=["officer"])
def close(case_id: str, body: NoteIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("update public.cases set status = 'closed' where id = %s returning id", [case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
        cur.execute("insert into public.case_events (case_id, kind, actor_id, data) values (%s,'closed',%s,%s)",
                    [case_id, p.id, jsonb({"note": body.note})])
    return {"case_id": case_id, "status": "closed"}


class IdCheckIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cnic: str = Field(max_length=40)
    name: str | None = Field(default=None, max_length=200)
    dob: str | None = Field(default=None, max_length=40)
    father: str | None = Field(default=None, max_length=200)


class IdLookupIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cnic: str = Field(max_length=40)


class HouseholdIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    members: int = Field(ge=0, le=60)


@router.post("/cases/{case_id}/household-check", tags=["cases"])
def household_check(case_id: str, body: HouseholdIn, p: Principal = Depends(require("citizen", "helper"))):
    """She says how many people live in her household; we answer only whether it matches the survey record (never the number)."""
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    return sw.household_size_check(case_id, p.id, body.members)


@router.post("/cases/{case_id}/identity-lookup", tags=["cases"])
def identity_lookup(case_id: str, body: IdLookupIn, p: Principal = Depends(require("citizen", "helper"))):
    """Step "Is this you?": the person types the ID number, we look it up in the government record (mock NADRA)
    and show the record's details. Details are shown ONLY if the number is the one linked to this claim's person;
    for any other number we only say it is not theirs (no one can browse other people's records)."""
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    digits = "".join(ch for ch in body.cnic if ch.isdigit())
    with user_tx(p.id) as cur:
        cur.execute("select pe.cnic from public.cases c join public.people pe on pe.id = c.person_id where c.id = %s", [case_id])
        pe = cur.fetchone()
        if not pe:
            raise ApiError("NOT_FOUND")
    if len(digits) != 13:
        return {"found": False, "same_person": False, "record": None}
    rec = sw.mock_nadra(digits)
    if not rec:
        return {"found": False, "same_person": False, "record": None}
    same = bool(pe.get("cnic")) and "".join(ch for ch in pe["cnic"] if ch.isdigit()) == digits
    if not same:   # someone else's number: only the NAME is shown, nothing else
        return {"found": True, "same_person": False, "record": {"name_roman": rec["name_roman"], "name_ur": rec["name_ur"]}}
    return {"found": True, "same_person": True, "record": {
        "name_roman": rec["name_roman"], "name_ur": rec["name_ur"], "father_or_husband": rec["father_or_husband"],
        "dob": rec["dob_iso"], "gender": rec["gender"], "district": rec["district"], "cnic_masked": pipeline.mask_cnic(rec["cnic"])}}


@router.post("/cases/{case_id}/identity-check", tags=["cases"])
def identity_check(case_id: str, body: IdCheckIn, p: Principal = Depends(require("citizen", "helper"))):
    """Compares what was typed with the stored record on the server; the stored CNIC never leaves the server."""
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select pe.* from public.cases c join public.people pe on pe.id = c.person_id where c.id = %s", [case_id])
        pe = cur.fetchone()
        if not pe:
            raise ApiError("NOT_FOUND")
    a = {"name": body.name or pe["name_roman"], "father": body.father or pe["father_or_husband"], "cnic": body.cnic,
         "dob": body.dob or pe["dob_iso"], "district": pe["district"]}
    b = {"name": pe["name_roman"], "father": pe["father_or_husband"], "cnic": pe["cnic"], "dob": pe["dob_iso"], "district": pe["district"]}
    r = match_records(a, b)
    for e in r["evidence"]:
        if e["field"] == "cnic":
            e["a"], e["b"] = pipeline.mask_cnic(body.cnic if len(body.cnic) == 13 else None), pipeline.mask_cnic(pe["cnic"])
    return r
