"""Database access for everything a PERSON does.

Every user-driven call runs in ONE transaction that does
    SET LOCAL ROLE authenticated
    select set_config('request.jwt.claims', '{"sub": ..., "role": "authenticated"}', true)
so the database row locks (RLS) apply even if our own code has a bug. The role of the user is read
by the database (app.current_role()), never taken from the token.

The master connection is NOT here. It lives only in service_writes.py.

A lock keeps one transaction at a time (the local test database serves one connection at a time).
Connections are short-lived: opened, used, closed.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg import errors as pgerr
from psycopg.rows import dict_row

from .config import get_settings, redact
from .errors import ApiError

log = logging.getLogger("sahara.db")
_LOCK = threading.RLock()


class _NoLock:
    def __enter__(self): return self
    def __exit__(self, *a): return False


def lock():
    return _LOCK if get_settings().db_serialize else _NoLock()


def map_db_error(e: Exception) -> ApiError:
    """Turn a database refusal into the contract error format. Messages from our own triggers are plain English."""
    state = getattr(e, "sqlstate", None) or ""
    msg = str(e).split("\n")[0]
    msg = redact(msg)
    if state == "SR403" or msg.startswith("CONSENT_REQUIRED"):
        return ApiError("CONSENT_REQUIRED", message=msg.split(":", 1)[-1].strip() or None)
    if state == "42501":
        # row lock refused or a trigger said "not allowed"
        text = msg.split(":", 1)[-1].strip() if msg.startswith("FORBIDDEN") else None
        if text and len(text) < 200 and "row-level security" not in text:
            return ApiError("FORBIDDEN", message=text.capitalize() if text[:1].islower() else text)
        return ApiError("FORBIDDEN")
    if state == "P0002":
        return ApiError("NOT_FOUND")
    if state in ("23514", "23505", "23503", "55000"):
        clean = msg if len(msg) < 220 else msg[:220]
        return ApiError("CONFLICT", message=clean)
    if state in ("22P02", "22007", "22003", "22023"):
        return ApiError("VALIDATION", message="One of the values is not in the right format.")
    log.error("database error %s %s", type(e).__name__, state)
    return ApiError("INTERNAL")


_POOL: dict[str, list] = {}
_POOL_LOCK = threading.Lock()
_POOL_MAX = 6


class _Pooled:
    """A connection that goes back to a small pool on close(). Saves the slow connect when the database is far away."""

    def __init__(self, conn, key):
        self._c, self._key = conn, key

    def __getattr__(self, name):
        return getattr(self._c, name)

    def close(self):
        c = self._c
        try:
            if c.closed or c.info.transaction_status != psycopg.pq.TransactionStatus.IDLE:
                if not c.closed:
                    c.rollback()
            if not c.closed:
                with _POOL_LOCK:
                    q = _POOL.setdefault(self._key, [])
                    if len(q) < _POOL_MAX:
                        q.append(c)
                        return
        except Exception:
            pass
        try:
            c.close()
        except Exception:
            pass


def _open(dsn: str):
    last: Exception | None = None
    for i in range(6):
        try:
            return psycopg.connect(dsn, row_factory=dict_row, connect_timeout=8, prepare_threshold=None)
        except psycopg.OperationalError as e:
            last = e
            time.sleep(0.05 * (i + 1))
    raise last  # type: ignore[misc]


def connect(dsn: str | None = None):
    """Open a connection. Far-away databases (Supabase) reuse connections; the one-at-a-time local test database does not."""
    s = get_settings()
    dsn = dsn or s.database_url
    if s.db_serialize:
        return _open(dsn)
    while True:
        with _POOL_LOCK:
            q = _POOL.get(dsn)
            c = q.pop() if q else None
        if c is None:
            return _Pooled(_open(dsn), dsn)
        try:
            if not c.closed:
                c.execute("select 1")
                c.rollback()
                return _Pooled(c, dsn)
        except Exception:
            try:
                c.close()
            except Exception:
                pass


@contextmanager
def user_tx(user_id: str) -> Iterator[psycopg.Cursor]:
    """Run as the person. Commits on success, rolls back on any error. DB refusals become ApiError."""
    with lock():
        conn = None
        try:
            conn = connect()
            cur = conn.cursor()
            cur.execute("SET LOCAL ROLE authenticated")
            cur.execute("select set_config('request.jwt.claims', %s, true)",
                        [json.dumps({"sub": str(user_id), "role": "authenticated"})])
            yield cur
            conn.commit()
        except ApiError:
            if conn:
                conn.rollback()
            raise
        except psycopg.Error as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise map_db_error(e) from None
        except Exception:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass


def jsonb(v: Any):
    from psycopg.types.json import Jsonb
    return Jsonb(v)


def whoami(user_id: str) -> dict | None:
    """Role, office, name and language of a user, as the DATABASE sees them. None if the user has no role."""
    with user_tx(user_id) as cur:
        cur.execute("select app.current_role() as role, app.current_office() as office, app.current_person_id() as person_id")
        r = cur.fetchone()
        if not r or not r["role"]:
            return None
        cur.execute("select full_name, language from public.profiles where user_id = app.current_user_id()")
        p = cur.fetchone() or {}
        return {"id": str(user_id), "role": r["role"], "office": r["office"], "person_id": str(r["person_id"]) if r["person_id"] else None,
                "name": p.get("full_name") or "", "language": p.get("language") or "ur"}
