"""Checks anyone signed in may run: identity match, document analysis, scam check and report, policy search."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field

from .. import pipeline, ratelimit
from ..config import get_settings
from ..db import jsonb, user_tx
from ..deps import Principal, require
from ..docs import analyze as DA
from ..errors import ApiError
from ..identity.match import match_records
from ..policy_search import search as policy_search
from ..scam.classifier import check_message

router = APIRouter()


class Rec(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Any = None
    father: Any = None
    cnic: Any = None
    dob: Any = None
    district: Any = None


class MatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    a: Rec
    b: Rec


@router.post("/identity/match", tags=["checks"])
def identity_match(body: MatchIn, p: Principal = Depends(require())):
    return match_records(body.a.model_dump(), body.b.model_dump())


@router.post("/docs/analyze", tags=["checks"], openapi_extra={
    "requestBody": {"content": {"multipart/form-data": {"schema": {"type": "object", "properties": {
        "file": {"type": "string", "format": "binary"}, "doc_type": {"type": "string"}}}}}}})
async def docs_analyze(request: Request, p: Principal = Depends(require())):
    ratelimit.check("upload", p.id, 20)
    body = await pipeline.read_limited_body(request, get_settings().max_upload_bytes)
    parsed = pipeline.parse_multipart(request.headers.get("content-type", ""), body)
    if "file" not in parsed["files"]:
        raise ApiError("VALIDATION", message="Send the photo in a field called 'file'.")
    fname, data = parsed["files"]["file"]
    ok, why, _ = DA.validate_upload(fname, data, get_settings().max_upload_bytes)
    if not ok:
        raise ApiError("VALIDATION", message=why)
    res = await run_in_threadpool(DA.analyze_image, data, parsed["fields"].get("doc_type"))
    res["signals"].pop("ahash", None)
    return res


class ScamIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(max_length=5000)
    sender: str | None = Field(default=None, max_length=60)


@router.post("/scam/check", tags=["checks"])
def scam_check(body: ScamIn, p: Principal = Depends(require())):
    ratelimit.check("scam", p.id, 30)
    return check_message(body.text, body.sender)


class ScamReportIn(ScamIn):
    district: str | None = Field(default=None, max_length=80)


@router.post("/scam/report", tags=["checks"])
def scam_report(body: ScamReportIn, p: Principal = Depends(require("citizen", "helper", "admin"))):
    ratelimit.check("scam", p.id, 30)
    r = check_message(body.text, body.sender)
    with user_tx(p.id) as cur:
        cur.execute("insert into public.scam_reports (text, sender, label, score, reasons, district, reported_by) "
                    "values (%s,%s,%s,%s,%s,%s,%s) returning id",
                    [body.text[:2000], body.sender, r["label"], r["score"], jsonb(r["reasons"]), body.district, p.id])
        rid = cur.fetchone()["id"]
    return {"id": str(rid), "label": r["label"], "score": r["score"], "reasons": r["reasons"], "advice": r["advice"], "reported": True}


@router.get("/policy/search", tags=["policy"])
def policy_find(q: str, p: Principal = Depends(require())):
    """Plain-language question over the MOCK programme policy. Returns clauses with their source, no generated text."""
    if not q.strip() or len(q) > 300:
        raise ApiError("VALIDATION", message="Ask a short question.")
    return {"query": q, "results": policy_search(q), "note": "MOCK programme policy. Retrieval only: the answer is the policy text itself."}
