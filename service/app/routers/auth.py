"""Login, /me, healthz."""
from __future__ import annotations

import hashlib
import logging

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field

from .. import ratelimit, security, service_writes as sw
from ..config import get_settings
from ..db import user_tx, whoami
from ..deps import Principal, _client_ip, require, signing_secret
from ..errors import ApiError

router = APIRouter()
log = logging.getLogger("sahara.auth")


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=200)
    secret: str = Field(min_length=1, max_length=200)


class MeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")   # a body with "role" is refused (mass assignment)
    language: str | None = Field(default=None, pattern="^(ur|en)$")
    full_name: str | None = Field(default=None, min_length=1, max_length=120)


def _fail() -> ApiError:
    return ApiError("UNAUTHENTICATED", message="The email or secret is not right.", message_ur="ای میل یا خفیہ نمبر درست نہیں۔")


@router.post("/auth/login", tags=["auth"])
def login(body: LoginIn, request: Request):
    ip = _client_ip(request)
    ratelimit.check("login", ip, 40)
    ratelimit.check("login-user", hashlib.sha256(body.email.lower().encode()).hexdigest()[:16], 8)
    s = get_settings()
    email_hash = hashlib.sha256(body.email.lower().encode()).hexdigest()[:12]
    if s.auth_mode == "supabase":
        if not s.supabase_url:
            raise ApiError("INTERNAL")
        try:
            r = httpx.post(f"{s.supabase_url}/auth/v1/token?grant_type=password", json={"email": body.email, "password": body.secret},
                           headers={"apikey": s.supabase_anon_key}, timeout=10)
        except httpx.HTTPError:
            raise ApiError("INTERNAL", message="The sign-in service is not reachable. Please try again.")
        if r.status_code != 200:
            sw.job_diary("auth.login_failed", {"email_hash": email_hash})
            raise _fail()
        data = r.json()
        token, ttl = data["access_token"], int(data.get("expires_in", 3600))
        try:
            claims = security.decode(token, s.supabase_jwt_secret)
        except security.TokenError:
            raise ApiError("INTERNAL")
        uid = claims["sub"]
    else:
        uid = sw.local_login(body.email, body.secret)
        if not uid:
            sw.job_diary("auth.login_failed", {"email_hash": email_hash})
            raise _fail()
        token, ttl = security.make_user_token(uid, body.email.lower(), signing_secret(), s.token_ttl_seconds)
    me = whoami(uid)
    if not me:
        raise _fail()
    sw.job_diary("auth.login_ok", {"user_id": uid, "role": me["role"]}, "user", uid)
    return {"access_token": token, "expires_in": ttl,
            "user": {"id": me["id"], "role": me["role"], "name": me["name"], "language": me["language"], "office": me["office"]}}


def _user(p: Principal) -> dict:
    return {"id": p.id, "role": p.role, "name": p.name, "language": p.language, "office": p.office, "person_id": p.person_id}


@router.get("/me", tags=["auth"])
def me(p: Principal = Depends(require())):
    return _user(p)


@router.patch("/me", tags=["auth"])
def update_me(body: MeUpdate, p: Principal = Depends(require())):
    sets, args = [], []
    for k in ("language", "full_name"):
        v = getattr(body, k)
        if v is not None:
            sets.append(f"{k} = %s")
            args.append(v)
    if sets:
        with user_tx(p.id) as cur:
            cur.execute(f"update public.profiles set {', '.join(sets)} where user_id = app.current_user_id()", args)
    out = whoami(p.id) or {}
    return {k: out.get(k) for k in ("id", "role", "name", "language", "office", "person_id")}


@router.get("/healthz", tags=["system"])
def healthz():
    ok = True
    try:
        from ..db import connect
        c = connect()
        c.execute("select 1")
        c.close()
    except Exception:
        ok = False
    return {"status": "ok" if ok else "degraded", "database": ok, "auth_mode": get_settings().auth_mode}
