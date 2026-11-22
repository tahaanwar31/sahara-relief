"""Who is calling? Deny by default.

Every route must depend on `require(...)` (people) or `api_key_auth` (public API). A test walks
the route table and fails if a route has neither (the only open routes are the listed ones).
The role is read from the DATABASE on each request (app.current_role()); the token only says who you are.
"""
from __future__ import annotations

import hashlib
import json
import logging
import secrets
import threading
from collections import OrderedDict
from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, Header, Request

from . import ratelimit, security
from .config import get_settings
from .db import whoami
from .errors import ApiError

log = logging.getLogger("sahara.auth")

OPEN_ROUTES = {"/auth/login", "/healthz", "/docs", "/openapi.json", "/redoc", "/docs/oauth2-redirect", "/drafts/resume/{code}"}

_ephemeral = secrets.token_urlsafe(48)


def signing_secret() -> str:
    s = get_settings()
    if s.auth_mode == "supabase":
        return s.supabase_jwt_secret
    if s.jwt_secret and s.jwt_secret != "change-me-to-a-long-random-string":
        return s.jwt_secret
    if s.jwt_secret:   # the example value from .env.example: works, but is warned about once
        return s.jwt_secret
    return _ephemeral   # no secret configured: tokens last only as long as this process


@dataclass
class Principal:
    id: str
    role: str
    office: str | None
    person_id: str | None
    name: str
    language: str
    claims: dict


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def bearer_claims(authorization: str | None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError("UNAUTHENTICATED")
    token = authorization[7:].strip()
    try:
        return security.decode(token, signing_secret())
    except security.TokenError:
        raise ApiError("UNAUTHENTICATED", message="Your sign-in is not valid or has expired. Please sign in again.")


def principal(request: Request, authorization: str | None = Header(default=None)) -> Principal:
    claims = bearer_claims(authorization)
    me = whoami(claims["sub"])
    if not me:
        raise ApiError("UNAUTHENTICATED", message="This account has no access.")
    request.state.user_id = me["id"]
    request.state.role = me["role"]
    return Principal(id=me["id"], role=me["role"], office=me["office"], person_id=me["person_id"], name=me["name"],
                     language=me["language"], claims=claims)


def require(*roles: str) -> Callable:
    """Dependency factory: the caller must be signed in AND have one of these roles. No roles = any signed-in user."""
    allowed = set(roles)

    def dep(p: Principal = Depends(principal)) -> Principal:
        if allowed and p.role not in allowed:
            raise ApiError("FORBIDDEN")
        return p

    dep._guard = True          # type: ignore[attr-defined]
    dep._roles = sorted(allowed)  # type: ignore[attr-defined]
    return dep


def api_key_auth(scope: str) -> Callable:
    def dep(request: Request, x_api_key: str | None = Header(default=None)) -> dict:
        if not x_api_key or len(x_api_key) > 200:
            raise ApiError("UNAUTHENTICATED", message="An API key is needed (X-API-Key header).")
        from . import service_writes as sw
        k = sw.api_key_lookup(hashlib.sha256(x_api_key.encode()).hexdigest())
        if not k or k.get("revoked"):
            raise ApiError("UNAUTHENTICATED", message="That API key is not valid or was revoked.")
        if scope not in (k["scopes"] or []):
            raise ApiError("FORBIDDEN", message=f"This API key does not have the '{scope}' permission.")
        ratelimit.check("public", str(k["id"]), int(k["rate_limit_per_min"]))
        request.state.api_key_id = str(k["id"])
        return k

    dep._guard = True  # type: ignore[attr-defined]
    dep._roles = ["api_key:" + scope]  # type: ignore[attr-defined]
    return dep


# ---- idempotency (in-process; drafts are also protected by the database) -------------
_idem_lock = threading.Lock()
_idem: "OrderedDict[str, dict]" = OrderedDict()


def idem_get(user_id: str, route: str, key: str | None):
    if not key:
        return None
    with _idem_lock:
        return _idem.get(f"{user_id}|{route}|{key[:120]}")


def idem_put(user_id: str, route: str, key: str | None, value: dict) -> None:
    if not key:
        return
    with _idem_lock:
        _idem[f"{user_id}|{route}|{key[:120]}"] = json.loads(json.dumps(value, default=str))
        while len(_idem) > 3000:
            _idem.popitem(last=False)
