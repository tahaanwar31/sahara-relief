"""HS256 tokens written by hand (hmac, hashlib, base64). No PyJWT needed.

Claims we sign in local mode: sub, role ("authenticated"), email, iat, exp.
The role in the token is NOT the application role: that comes from the database (app.current_role()).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import uuid


class TokenError(Exception):
    pass


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def encode(claims: dict, secret: str) -> str:
    if not secret:
        raise TokenError("no signing secret configured")
    head = _b64e(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64e(json.dumps(claims, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{_b64e(sig)}"


def decode(token: str, secret: str, now: float | None = None) -> dict:
    """Verify signature (constant time), algorithm, expiry and subject. Raises TokenError."""
    if not secret or not isinstance(token, str) or len(token) > 4096:
        raise TokenError("bad token")
    parts = token.split(".")
    if len(parts) != 3:
        raise TokenError("bad token")
    try:
        head = json.loads(_b64d(parts[0]))
        claims = json.loads(_b64d(parts[1]))
        sig = _b64d(parts[2])
    except Exception:
        raise TokenError("bad token")
    if not isinstance(head, dict) or head.get("alg") != "HS256":   # refuses "none" and other algorithms
        raise TokenError("bad token")
    good = hmac.new(secret.encode(), f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(good, sig):
        raise TokenError("bad signature")
    if not isinstance(claims, dict):
        raise TokenError("bad token")
    exp = claims.get("exp")
    if not isinstance(exp, (int, float)) or isinstance(exp, bool) or exp < (now if now is not None else time.time()):
        raise TokenError("token expired")
    sub = claims.get("sub")
    try:
        uuid.UUID(str(sub))
    except Exception:
        raise TokenError("bad subject")
    return claims


def make_user_token(user_id: str, email: str | None, secret: str, ttl: int) -> tuple[str, int]:
    now = int(time.time())
    claims = {"sub": user_id, "role": "authenticated", "email": email, "iat": now, "exp": now + ttl}
    return encode(claims, secret), ttl
