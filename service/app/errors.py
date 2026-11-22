"""One error format everywhere (CONTRACT section 8). Never a stack trace.

{ "error": { "code", "message", "message_ur", "details", "request_id" } }
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import redact

log = logging.getLogger("sahara.errors")

DEFAULTS = {
    "UNAUTHENTICATED": (401, "Please sign in.", "براہ کرم لاگ ان کریں۔"),
    "FORBIDDEN": (403, "You are not allowed to do this.", "آپ کو اس کی اجازت نہیں ہے۔"),
    "NOT_FOUND": (404, "We could not find that.", "یہ نہیں ملا۔"),
    "VALIDATION": (422, "Some of the details are not valid.", "کچھ تفصیلات درست نہیں ہیں۔"),
    "CONFLICT": (409, "This cannot be done right now.", "یہ اس وقت نہیں ہو سکتا۔"),
    "RATE_LIMITED": (429, "Too many requests. Please wait a little and try again.", "بہت زیادہ درخواستیں۔ تھوڑا انتظار کریں اور دوبارہ کوشش کریں۔"),
    "CONSENT_REQUIRED": (403, "The person has not given permission for this.", "اس کے لیے متعلقہ شخص کی اجازت موجود نہیں۔"),
    "INTERNAL": (500, "Something went wrong on our side. Please try again.", "ہماری طرف سے کوئی مسئلہ ہوا۔ براہ کرم دوبارہ کوشش کریں۔"),
}


class ApiError(Exception):
    def __init__(self, code: str, message: str | None = None, details: Any = None, message_ur: str | None = None,
                 headers: dict | None = None):
        status, msg, msg_ur = DEFAULTS[code]
        self.code, self.status = code, status
        self.message = message or msg
        self.message_ur = message_ur or msg_ur
        self.details = details if details is not None else {}
        self.headers = headers or {}
        super().__init__(self.message)


def body(err: ApiError, request_id: str | None) -> dict:
    return {"error": {"code": err.code, "message": err.message, "message_ur": err.message_ur,
                      "details": err.details, "request_id": request_id}}


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(request: Request, exc: ApiError):
        return JSONResponse(body(exc, _rid(request)), status_code=exc.status, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _val(request: Request, exc: RequestValidationError):
        problems = [{"field": ".".join(str(x) for x in e.get("loc", []) if x != "body"), "problem": e.get("msg", "")[:120]}
                    for e in exc.errors()[:10]]
        return JSONResponse(body(ApiError("VALIDATION", details={"fields": problems}), _rid(request)), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        code = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "NOT_FOUND", 409: "CONFLICT",
                422: "VALIDATION", 429: "RATE_LIMITED"}.get(exc.status_code, "INTERNAL" if exc.status_code >= 500 else "VALIDATION")
        err = ApiError(code)
        if exc.status_code == 405:
            err.status = 405
            err.message = "That method is not allowed here."
        elif exc.status_code in (400, 413, 415):
            err.status = exc.status_code
        return JSONResponse(body(err, _rid(request)), status_code=err.status)

    @app.exception_handler(Exception)
    async def _any(request: Request, exc: Exception):
        # log the type only (never the text: it could contain a connection string)
        log.error("unhandled %s on %s %s", type(exc).__name__, request.method, request.url.path,
                  extra={"request_id": _rid(request)})
        return JSONResponse(body(ApiError("INTERNAL"), _rid(request)), status_code=500)
