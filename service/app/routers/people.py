"""Consent, helper sessions, the diary ("who has seen my data", audit list and verify)."""
from __future__ import annotations

import uuid
from typing import Any

import psycopg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from .. import service_writes as sw
from ..db import jsonb, user_tx
from ..deps import Principal, require
from ..errors import ApiError
from ..config import get_settings
from .. import ratelimit

router = APIRouter()


def _iso(v):
    return v.isoformat().replace("+00:00", "Z") if hasattr(v, "isoformat") else v


def _isuuid(s) -> bool:
    try:
        uuid.UUID(str(s))
        return True
    except ValueError:
        return False


def _consent_out(r: dict, receipt: str | None = None) -> dict:
    out = {"id": str(r["id"]), "subject_id": str(r["subject_id"]), "grantee_type": r["grantee_type"], "grantee_id": r["grantee_id"],
           "grantee_name": r["grantee_id"] if r["grantee_type"] != "helper" else "helper", "purpose": r["purpose"],
           "fields": r["fields"], "status": r["status"], "granted_at": _iso(r["granted_at"]),
           "withdrawn_at": _iso(r["withdrawn_at"]), "expires_at": _iso(r["expires_at"]), "version": r["version"]}
    if receipt:
        out["receipt_hash"] = receipt
    return out


# ---------------------------------------------------------------- consents
@router.get("/consents", tags=["consent"])
def list_consents(person_id: str | None = None, p: Principal = Depends(require("citizen", "helper", "admin"))):
    with user_tx(p.id) as cur:
        if person_id:
            if not _isuuid(person_id):
                raise ApiError("NOT_FOUND")
            cur.execute("select app.person_user(%s) as u", [person_id])
            subject = cur.fetchone()["u"]
            if not subject:
                return []
            cur.execute("select * from public.consents where subject_id = %s order by granted_at desc", [subject])
        else:
            cur.execute("select * from public.consents order by granted_at desc limit 200")
        return [_consent_out(r) for r in cur.fetchall()]


class ConsentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    grantee_type: str = Field(pattern="^(office|helper|service)$")
    purpose: str = Field(min_length=1, max_length=60)
    fields: list[str] = Field(default_factory=lambda: ["*"], max_length=20)
    person_id: str | None = None
    grantee_id: str | None = Field(default=None, max_length=80)
    subject_pin: str | None = Field(default=None, max_length=40)   # Helper Mode: the citizen's own PIN, typed on the shared phone


class HelperVerifyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cnic: str = Field(max_length=40)
    dob: str = Field(max_length=40)
    members: int = Field(ge=0, le=60)


@router.post("/helper/verify-family", tags=["helper"])
def helper_verify_family(body: HelperVerifyIn, p: Principal = Depends(require("helper"))):
    """Helper Mode: ID number + date of birth + household size, as told by the woman. Checked on the server; nothing is shown back."""
    ratelimit.check("verify-family", p.id, 12)
    r = sw.verify_family_for_helper(p.id, body.cnic, body.dob, body.members, p.office)
    if not r["ok"]:
        left = r.get("tries_left")
        if r["locked"]:
            en, ur = "Too many wrong tries. Try again in 30 minutes.", "بہت زیادہ غلط کوششیں۔ 30 منٹ بعد دوبارہ کوشش کریں۔"
        else:
            en = "These details do not match our records. Please ask her again and check the ID number, the date of birth and the household size."
            ur = "یہ تفصیل ہمارے ریکارڈ سے نہیں ملتی۔ براہ کرم ان سے دوبارہ پوچھیں اور شناختی کارڈ نمبر، تاریخ پیدائش اور گھرانے کے افراد کی تعداد دیکھ لیں۔"
            if left is not None:
                en += f" Tries left: {left}." if left else " No tries left: wait 30 minutes."
                ur += f" باقی کوششیں: {left}۔" if left else " کوئی کوشش باقی نہیں: 30 منٹ انتظار کریں۔"
        raise ApiError("FORBIDDEN", message=en, message_ur=ur, details={"tries_left": left})
    return {"ok": True, "person_id": r["person_id"]}


@router.post("/consents", tags=["consent"])
def grant_consent(body: ConsentIn, p: Principal = Depends(require("citizen", "helper"))):
    if body.person_id and body.subject_pin and p.role == "helper":
        if get_settings().auth_mode != "local":
            raise ApiError("VALIDATION", message="PIN proof is only available in local login mode.")
        if not _isuuid(body.person_id):
            raise ApiError("VALIDATION", message="person_id is not valid.")
        ratelimit.check("pin-consent", p.id, 8)
        gid = body.grantee_id or p.office
        purpose = "claim_processing" if body.purpose in ("claim", "claim_processing") else body.purpose
        if body.grantee_type != "office" or not gid:
            raise ApiError("VALIDATION", message="Helper-assisted consent is for the office.")
        row = sw.grant_consent_with_pin(p.id, body.person_id, body.subject_pin, "office", gid, purpose, body.fields)
        if not row:
            raise ApiError("FORBIDDEN", message="The PIN is wrong, or this family is not yours.",
                           message_ur="پن غلط ہے، یا یہ گھرانہ آپ کا نہیں ہے۔")
        return _consent_out(row)
    with user_tx(p.id) as cur:
        # the person themselves gives consent: the database lets only the subject insert (a helper cannot do it for them)
        subject = p.id
        if body.person_id:
            cur.execute("select app.person_user(%s) as u", [body.person_id])
            u = cur.fetchone()["u"]
            if str(u) != p.id:
                raise ApiError("FORBIDDEN", message="Consent must be given by the person themselves, on their own login.",
                               message_ur="اجازت خود اس شخص کو اپنے لاگ ان سے دینی ہوگی۔")
        purpose = "claim_processing" if body.purpose in ("claim", "claim_processing") else body.purpose
        gtype, gid = body.grantee_type, body.grantee_id
        if gtype == "office":
            gid = gid or p.office
        elif gtype == "service":
            gid = "service"
        elif gtype == "helper":
            purpose = "claim_help" if body.purpose in ("claim", "claim_help") else purpose
            if not gid or not _isuuid(gid):
                raise ApiError("VALIDATION", message="Say which helper (grantee_id).")
        if not gid:
            raise ApiError("VALIDATION", message="Say who the consent is for (grantee_id).")
        cur.execute("select * from public.consents where subject_id = %s and grantee_type = %s and grantee_id = %s and purpose = %s and status = 'granted'",
                    [subject, gtype, gid, purpose])
        ex = cur.fetchone()
        if ex:
            return _consent_out(ex)
        cur.execute("insert into public.consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
                    "values (%s,%s,%s,%s,%s,%s,'granted') returning *", [subject, gtype, gid, purpose, body.fields, p.id])
        return _consent_out(cur.fetchone())


@router.post("/consents/{consent_id}/withdraw", tags=["consent"])
def withdraw(consent_id: str, p: Principal = Depends(require("citizen", "helper"))):
    if not _isuuid(consent_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select app.withdraw_consent(%s) as r", [consent_id])
        receipt = cur.fetchone()["r"]
        cur.execute("select * from public.consents where id = %s", [consent_id])
        return _consent_out(cur.fetchone(), receipt)


@router.get("/data-access-log", tags=["consent"])
def data_access_log(p: Principal = Depends(require("citizen", "helper"))):
    """Who has looked at MY data: diary rows about me, by someone else."""
    with user_tx(p.id) as cur:
        cur.execute("select id, ts, actor_id, actor_type, actor_role, action, entity_type, details from public.audit_log "
                    "where details->>'subject_id' = %s and (actor_id is distinct from %s) order by id desc limit 200", [p.id, p.id])
        out = []
        for r in cur.fetchall():
            who = r["actor_role"] or ("the automatic engine" if r["actor_type"] == "ai" else r["actor_type"])
            out.append({"id": str(r["id"]), "at": _iso(r["ts"]), "who": who, "role": r["actor_role"], "what": r["action"],
                        "purpose": (r["details"] or {}).get("purpose")})
        return out


# ---------------------------------------------------------------- helper
@router.get("/helper/families", tags=["helper"])
def families(p: Principal = Depends(require("helper"))):
    with user_tx(p.id) as cur:
        cur.execute("select person_id from public.helper_assignments where helper_user_id = app.current_user_id() order by created_at")
        ids = [str(r["person_id"]) for r in cur.fetchall()]
    return sw.helper_families(p.id, ids)


class SessionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    person_id: str | None = None


@router.post("/helper/session", tags=["helper"])
def helper_session(body: SessionIn, p: Principal = Depends(require("helper"))):
    with user_tx(p.id) as cur:
        if body.person_id:
            if not _isuuid(body.person_id):
                raise ApiError("NOT_FOUND")
            cur.execute("select app.helper_start_session(%s) as id", [body.person_id])
            cur.execute("select session_started_at from public.helper_assignments where id = %s", [cur.fetchone()["id"]]) if False else None
            cur.execute("select session_started_at from public.helper_assignments where helper_user_id = app.current_user_id() and active")
            r = cur.fetchone()
            return {"person_id": body.person_id, "active": True, "started_at": _iso(r["session_started_at"]) if r else None}
        cur.execute("select app.helper_end_session() as n")
        return {"person_id": None, "active": False, "started_at": None}


# ---------------------------------------------------------------- diary
def _audit_row(r: dict) -> dict:
    return {"id": r["id"], "ts": _iso(r["ts"]), "actor_id": str(r["actor_id"]) if r["actor_id"] else None, "actor_type": r["actor_type"],
            "actor_role": r["actor_role"], "action": r["action"], "entity_type": r["entity_type"],
            "entity_id": str(r["entity_id"]) if r["entity_id"] else None, "rule_version": r["rule_version"],
            "model_version": r["model_version"], "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
            "result": r["result"], "details": r["details"], "prev_hash": r["prev_hash"], "hash": r["hash"]}


@router.get("/audit", tags=["audit"])
def audit(entity_type: str | None = None, action: str | None = None, actor_id: str | None = None, limit: int = 100, offset: int = 0,
          p: Principal = Depends(require("admin"))):
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    if actor_id and not _isuuid(actor_id):
        raise ApiError("VALIDATION", message="actor_id must be an id.")
    where = "(%s::text is null or entity_type = %s) and (%s::text is null or action = %s) and (%s::uuid is null or actor_id = %s::uuid)"
    args = [entity_type, entity_type, action, action, actor_id, actor_id]
    with user_tx(p.id) as cur:
        cur.execute(f"select count(*) as n from public.audit_log where {where}", args)
        total = cur.fetchone()["n"]
        cur.execute(f"select * from public.audit_log where {where} order by id desc limit %s offset %s", args + [limit, offset])
        return {"items": [_audit_row(r) for r in cur.fetchall()], "total": total}


@router.get("/audit/mine", tags=["audit"])
def audit_mine(limit: int = 100, p: Principal = Depends(require())):
    with user_tx(p.id) as cur:
        cur.execute("select * from public.audit_log where actor_id = app.current_user_id() or details->>'subject_id' = app.current_user_id()::text "
                    "order by id desc limit %s", [max(1, min(limit, 300))])
        return {"items": [_audit_row(r) for r in cur.fetchall()]}


@router.get("/audit/verify", tags=["audit"])
def audit_verify(p: Principal = Depends(require("admin"))):
    with user_tx(p.id) as cur:
        cur.execute("select app.verify_audit_chain() as b")
        broken = cur.fetchone()["b"]
        cur.execute("select * from app.audit_head()")
        h = cur.fetchone() or {}
    return {"intact": broken is None, "broken_at": broken, "checked": h.get("total"), "head": {"last_id": h.get("last_id"), "last_hash": h.get("last_hash")}}
