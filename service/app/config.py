"""Settings from environment variables (CONTRACT section 9). Read on each call so tests can change them.

A .env file in the repo root is read once if present (it never overrides real environment variables).
Secrets are never printed or logged: see redact().
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .paths import REPO_DIR

_loaded = False


def _load_dotenv() -> None:
    global _loaded
    if _loaded:
        return
    _loaded = True
    f = REPO_DIR / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class Settings:
    auth_mode: str
    database_url: str
    master_database_url: str
    jwt_secret: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    supabase_jwt_secret: str
    storage_mode: str
    llm_provider: str
    cors_origins: list[str]
    rate_limit_per_min: int
    token_ttl_seconds: int
    max_upload_bytes: int
    db_serialize: bool
    debug_docs: bool
    demo_restart: bool
    auto_settle: bool


def get_settings() -> Settings:
    _load_dotenv()
    e = os.environ.get
    dsn = e("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5433/postgres")
    return Settings(
        auth_mode=(e("AUTH_MODE", "local") or "local").lower(),
        database_url=dsn,
        master_database_url=e("MASTER_DATABASE_URL") or dsn,
        jwt_secret=e("JWT_SECRET", "") or "",
        supabase_url=(e("SUPABASE_URL", "") or "").rstrip("/"),
        supabase_anon_key=e("SUPABASE_ANON_KEY", "") or "",
        supabase_service_key=e("SUPABASE_SERVICE_KEY", "") or "",
        supabase_jwt_secret=e("SUPABASE_JWT_SECRET", "") or "",
        storage_mode=(e("STORAGE_MODE", "local") or "local").lower(),
        llm_provider=(e("LLM_PROVIDER", "none") or "none").lower(),
        cors_origins=[o.strip() for o in (e("CORS_ORIGINS", "http://localhost:5173") or "").split(",") if o.strip()],
        rate_limit_per_min=int(e("RATE_LIMIT_PER_MIN", "120") or 120),
        token_ttl_seconds=int(e("TOKEN_TTL_SECONDS", "28800") or 28800),
        max_upload_bytes=int(e("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)) or 8 * 1024 * 1024),
        db_serialize=(e("DB_SERIALIZE", "1") or "1") != "0",
        debug_docs=False,
        auto_settle=(e("AUTO_SETTLE", "1") or "1") != "0",   # mock Raast pays at once after an automatic approval; AUTO_SETTLE=0 leaves the payment pending for an admin
        demo_restart=(e("DEMO_RESTART", "1") or "1") != "0",   # the small 'start over' control used in the demo; set DEMO_RESTART=0 for a real deployment
    )


def secrets_to_hide() -> list[str]:
    s = get_settings()
    out = [s.database_url, s.master_database_url, s.jwt_secret, s.supabase_service_key, s.supabase_jwt_secret,
           s.supabase_anon_key]
    # also the password part of a DSN on its own
    for d in (s.database_url, s.master_database_url):
        try:
            pw = d.split("://", 1)[1].split("@", 1)[0].split(":", 1)[1]
            out.append(pw)
        except Exception:
            pass
    return [x for x in out if x and len(x) >= 6]


def redact(text: str) -> str:
    for sec in secrets_to_hide():
        text = text.replace(sec, "[hidden]")
    return text
