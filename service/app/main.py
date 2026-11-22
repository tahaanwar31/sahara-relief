"""Sahara Relief Platform service (FastAPI). Everything is mock and synthetic. Swagger is at /docs."""
from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import errors, metrics, ratelimit
from .config import get_settings, redact
from .errors import ApiError
from .paths import REPO_DIR, SERVICE_DIR
from .routers import admin, auth, cases, people, rules, tools


class RedactingFilter(logging.Filter):
    """No secret or connection string ever reaches a log line."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.msg = redact(record.getMessage())
            record.args = ()
        except Exception:
            pass
        return True


def _setup_logging() -> None:
    root = logging.getLogger()
    if getattr(root, "_sahara", False):
        return
    h = logging.StreamHandler(sys.stderr)
    h.setFormatter(logging.Formatter('{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}'))
    h.addFilter(RedactingFilter())
    root.addHandler(h)
    root.setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    root._sahara = True  # type: ignore[attr-defined]


_setup_logging()
access = logging.getLogger("sahara.access")

DESCRIPTION = """
**SYNTHETIC / PROTOTYPE.** Every person, CNIC, message and document here is invented.
Sign in with `POST /auth/login`, then press *Authorize* and paste the token.
Errors always look like `{"error": {"code", "message", "message_ur", "details", "request_id"}}`.
"""


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="Sahara Relief Platform API", version="0.1.0", description=DESCRIPTION)
    errors.install(app)
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_origins, allow_credentials=False,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                       allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-API-Key", "Accept", "X-Request-ID"],
                       expose_headers=["X-Request-ID", "Retry-After"], max_age=600)

    @app.middleware("http")
    async def request_wrapper(request: Request, call_next):
        rid = (request.headers.get("x-request-id") or "")[:64] or uuid.uuid4().hex[:16]
        request.state.request_id = rid
        t0 = time.perf_counter()
        try:
            if request.method != "OPTIONS":
                ratelimit.check("general", request.client.host if request.client else "unknown", get_settings().rate_limit_per_min)
            response = await call_next(request)
        except ApiError as e:   # raised by the limiter above
            response = JSONResponse(errors.body(e, rid), status_code=e.status, headers=e.headers)
        ms = (time.perf_counter() - t0) * 1000
        response.headers["X-Request-ID"] = rid
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        route = request.scope.get("route")
        path = getattr(route, "path", request.url.path)
        metrics.record(f"{request.method} {path}", response.status_code, ms)
        access.info(json.dumps({"rid": rid, "method": request.method, "path": request.url.path, "status": response.status_code,
                                "ms": round(ms, 1), "user": getattr(request.state, "user_id", None)}))
        return response

    for r in (auth.router, cases.router, people.router, rules.router, tools.router, admin.router):
        app.include_router(r)

    # the built web app, when present (Docker image): one link for everything
    for cand in (REPO_DIR / "web" / "dist", SERVICE_DIR / "web_dist"):
        if (cand / "index.html").exists():
            from fastapi.staticfiles import StaticFiles
            app.mount("/", StaticFiles(directory=str(cand), html=True), name="web")
            break
    return app


app = create_app()
