"""API keys, users, metrics, the public API (API key + scopes) and the mock registry services."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field

from .. import metrics, pipeline, service_writes as sw
from ..config import get_settings
from ..db import jsonb, user_tx
from ..deps import Principal, api_key_auth, require
from ..engine.decide import decide_safe
from ..engine.facts import make_facts
from ..engine.model import get_model
from ..errors import ApiError
from ..scam.classifier import check_message

router = APIRouter()


def _isuuid(s) -> bool:
    try:
        uuid.UUID(str(s))
        return True
    except ValueError:
        return False


def _iso(v):
    return v.isoformat().replace("+00:00", "Z") if hasattr(v, "isoformat") else v


# ---------------------------------------------------------------- API keys (admin)
SCOPES = ("status:read", "scam:check", "eligibility:precheck")


class KeyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=80)
    scopes: list[str] = Field(min_length=1, max_length=5)
    rate_limit_per_min: int = Field(default=60, ge=1, le=6000)


def _key_out(r: dict) -> dict:
    return {"id": str(r["id"]), "name": r["name"], "scopes": r["scopes"], "rate_limit_per_min": r["rate_limit_per_min"],
            "revoked": r["revoked"], "created_at": _iso(r["created_at"]), "last_used_at": _iso(r["last_used_at"])}


@router.get("/api-keys", tags=["admin"])
def list_keys(p: Principal = Depends(require("admin"))):
    with user_tx(p.id) as cur:
        cur.execute("select id, name, scopes, rate_limit_per_min, revoked, created_at, last_used_at from public.api_keys order by created_at desc")
        return [_key_out(r) for r in cur.fetchall()]


@router.post("/api-keys", tags=["admin"])
def create_key(body: KeyIn, p: Principal = Depends(require("admin"))):
    bad = [s for s in body.scopes if s not in SCOPES]
    if bad:
        raise ApiError("VALIDATION", message="Unknown scope.", details={"allowed": list(SCOPES)})
    key = "sahara_" + secrets.token_urlsafe(24)
    with user_tx(p.id) as cur:
        cur.execute("insert into public.api_keys (name, key_hash, scopes, rate_limit_per_min, created_by) values (%s,%s,%s,%s,%s) "
                    "returning id, name, scopes, rate_limit_per_min, revoked, created_at, last_used_at",
                    [body.name, hashlib.sha256(key.encode()).hexdigest(), body.scopes, body.rate_limit_per_min, p.id])
        out = _key_out(cur.fetchone())
    out["key"] = key
    out["note"] = "Copy the key now. It is stored only as a hash and cannot be shown again."
    return out


@router.delete("/api-keys/{key_id}", tags=["admin"])
def revoke_key(key_id: str, p: Principal = Depends(require("admin"))):
    if not _isuuid(key_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("update public.api_keys set revoked = true, revoked_at = now() where id = %s returning id", [key_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
    return {"id": key_id, "revoked": True}


# ---------------------------------------------------------------- users (admin)
class UserIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=5, max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    full_name: str = Field(min_length=1, max_length=120)
    role: str = Field(pattern="^(citizen|helper|admin)$")
    language: str = Field(default="ur", pattern="^(ur|en)$")
    office: str | None = Field(default=None, max_length=40)
    secret: str = Field(min_length=6, max_length=100)


@router.get("/users", tags=["admin"])
def list_users(p: Principal = Depends(require("admin"))):
    with user_tx(p.id) as cur:
        cur.execute("select pr.user_id, pr.full_name, pr.language, pr.office, ur.role from public.profiles pr "
                    "left join public.user_roles ur on ur.user_id = pr.user_id order by pr.full_name limit 500")
        return [{"id": str(r["user_id"]), "name": r["full_name"], "language": r["language"], "office": r["office"], "role": r["role"]}
                for r in cur.fetchall()]


@router.post("/users", tags=["admin"])
def create_user(body: UserIn, p: Principal = Depends(require("admin"))):
    if get_settings().auth_mode != "local":
        raise ApiError("CONFLICT", message="In Supabase mode, create users in Supabase Auth.")
    uid = str(uuid.uuid4())
    with user_tx(p.id) as cur:   # the database refuses unless the caller is an admin (and never for their own role)
        cur.execute("insert into public.profiles (user_id, full_name, language, office) values (%s,%s,%s,%s)",
                    [uid, body.full_name, body.language, body.office])
        cur.execute("insert into public.user_roles (user_id, role) values (%s,%s)", [uid, body.role])
    try:
        sw.create_local_user(uid, body.email.lower(), body.secret)
    except ApiError:
        raise
    except Exception:
        raise ApiError("CONFLICT", message="That email is already used.")
    return {"id": uid, "email": body.email.lower(), "role": body.role, "name": body.full_name}


# ---------------------------------------------------------------- metrics
@router.get("/metrics", tags=["system"])
def get_metrics(p: Principal = Depends(require("admin"))):
    return {**metrics.snapshot(), "decision_ms": pipeline.latency_stats()}


# ---------------------------------------------------------------- public API (API key)
class PublicScam(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(max_length=5000)
    sender: str | None = Field(default=None, max_length=60)


class Precheck(BaseModel):
    """Answers typed by the person themselves. Nothing stored about anybody is read."""
    model_config = ConfigDict(extra="forbid")
    pmt_score: float | None = Field(default=None, ge=0, le=100)
    gov_employee: bool | None = None
    owns_vehicle: bool | None = None
    tax_filer: bool | None = None
    foreign_trips: int | None = Field(default=None, ge=0, le=50)
    high_phone_bill: bool | None = None
    age: int | None = Field(default=None, ge=0, le=120)


@router.get("/public/v1/cases/{case_id}/status", tags=["public"])
def public_status(case_id: str, key: dict = Depends(api_key_auth("status:read"))):
    if not _isuuid(case_id):
        raise ApiError("NOT_FOUND")
    r = sw.public_case_status(case_id)
    if not r:
        raise ApiError("NOT_FOUND")
    return r


@router.post("/public/v1/scam/check", tags=["public"])
def public_scam(body: PublicScam, key: dict = Depends(api_key_auth("scam:check"))):
    return check_message(body.text, body.sender)


@router.post("/public/v1/eligibility/precheck", tags=["public"])
def public_precheck(body: Precheck, key: dict = Depends(api_key_auth("eligibility:precheck"))):
    got = sw.fetch_rule_set()
    if not got:
        raise ApiError("CONFLICT", message="No active rule set.")
    _, rs = got
    facts = make_facts({
        "person": {"age": body.age, "cnic_valid": True, "cnic_expired": False, "deceased": False, "gender": "F"},
        "household": {"size_match": True, "pmt_score": body.pmt_score, "members": 1, "flags": {
            "gov_employee": bool(body.gov_employee), "owns_vehicle": bool(body.owns_vehicle), "tax_filer": bool(body.tax_filer),
            "foreign_trips": bool(body.foreign_trips and body.foreign_trips > 1), "high_phone_bill": bool(body.high_phone_bill)}},
        "payout": {"shared_with_other_households": False, "changed_within_days": None, "owner_is_helper": False},
        "doc": {"required_missing": False, "any_blurry": False, "any_edited": False, "min_confidence": 0.9},
        "identity": {"band": "SAME", "score": 0.95, "duplicate": False},
        "claim": {"amount": rs.params.amount},
        "consent": {"active": True, "detail": "person's own answers"}, "scam": {"flag": False}})
    d = decide_safe(facts, rs, get_model())
    likely = d.zone == "AUTO" and d.result == "APPROVE"
    return {"precheck": "likely_eligible" if likely else ("needs_review" if d.zone != "ASK_MORE" else "needs_more_information"),
            "reason_code": d.reason_code, "explain": d.explain_citizen, "rule_version": d.rule_version,
            "note": "A pre-check from the answers you typed. It is not an approval. Apply to get a real decision."}


# ---------------------------------------------------------------- mock registry services (private data: consent checked)
@router.get("/mock/nadra/{cnic}", tags=["mock"])
def mock_nadra(cnic: str, p: Principal = Depends(require("admin"))):
    if not (cnic.isdigit() and len(cnic) == 13):
        raise ApiError("VALIDATION", message="A CNIC is 13 digits.")
    found, consent = sw.registry_consent_ok("cnic", cnic)
    if found and not consent:
        raise ApiError("CONSENT_REQUIRED")
    r = sw.mock_nadra(cnic)
    if not r:
        raise ApiError("NOT_FOUND")
    r["cnic"] = pipeline.mask_cnic(r["cnic"])
    return {**r, "mock": True}


@router.get("/mock/nser/{household_id}", tags=["mock"])
def mock_nser(household_id: str, p: Principal = Depends(require("admin"))):
    if not _isuuid(household_id):
        raise ApiError("NOT_FOUND")
    found, consent = sw.registry_consent_ok("household", household_id)
    if found and not consent:
        raise ApiError("CONSENT_REQUIRED")
    r = sw.mock_nser(household_id)
    if not r:
        raise ApiError("NOT_FOUND")
    return {**r, "mock": True}


class AccountIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    account: str = Field(min_length=3, max_length=40)


@router.post("/mock/raast/verify", tags=["mock"])
def raast_verify(body: AccountIn, p: Principal = Depends(require("citizen", "helper", "admin"))):
    return {**sw.mock_raast_verify(body.account), "mock": True}


class ReleaseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_id: str


@router.post("/mock/raast/release", tags=["mock"])
def raast_release(body: ReleaseIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(body.case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:   # may this person see the case?
        cur.execute("select status from public.cases where id = %s", [body.case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
    return sw.release_payment(body.case_id)


@router.post("/mock/raast/settle", tags=["mock"])
def raast_settle(body: ReleaseIn, p: Principal = Depends(require("admin"))):
    if not _isuuid(body.case_id):
        raise ApiError("NOT_FOUND")
    with user_tx(p.id) as cur:
        cur.execute("select status from public.cases where id = %s", [body.case_id])
        if not cur.fetchone():
            raise ApiError("NOT_FOUND")
    return sw.settle_payment(body.case_id)
