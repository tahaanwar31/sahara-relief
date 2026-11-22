"""The decision pipeline for one case, and helpers to turn database rows into response shapes.

run_decision(): load the active rules, build the facts (consent gate inside), run the engine,
write the decision (master, allow-listed), return the decision card.
"""
from __future__ import annotations

import logging
import threading
import time
from email.parser import BytesParser
from email import policy as email_policy
from typing import Any

from . import service_writes as sw
from .engine import llm as llm_mod
from .engine import reasons as R
from .engine.decide import DecisionCard, build_case_notes, decide_safe
from .engine.model import get_model
from .errors import ApiError

log = logging.getLogger("sahara.pipeline")

_stat_lock = threading.Lock()
_lat: list[float] = []


def record_latency(ms: float) -> None:
    with _stat_lock:
        _lat.append(ms)
        del _lat[:-500]


def latency_stats() -> dict:
    with _stat_lock:
        xs = sorted(_lat)
    if not xs:
        return {"avg": None, "p50": None, "p95": None}
    return {"avg": round(sum(xs) / len(xs), 2), "p50": round(xs[len(xs) // 2], 2), "p95": round(xs[min(len(xs) - 1, int(len(xs) * 0.95))], 2)}


def run_decision(case_id: str) -> dict:
    """Returns the decision card as a dict (with the real decision id and time from the database)."""
    t0 = time.perf_counter()
    got = sw.fetch_rule_set()
    if not got:
        raise ApiError("CONFLICT", message="There is no active rule set.")
    rs_id, rs = got
    data = sw.read_case_facts(case_id, rs.params)
    facts, ctx = data["facts"], data["context"]
    raw = llm_mod.ask_llm(facts) if llm_mod.enabled() else None
    card = decide_safe(facts, rs, get_model(), case_id, (lambda f, r=raw: r) if raw is not None else None)
    notes = None
    if card.zone == "HUMAN" and card.reason_code != "R_CONSENT_MISSING":
        notes = build_case_notes(card, facts, {"case_id": case_id, "office": ctx.get("office"), "quarter": ctx.get("quarter"),
                                               "person": mask_name(ctx.get("name")), "consent": ctx.get("consent")})
        notes["similar_cases"] = ctx.get("similar", [])
        notes["compare"] = ctx.get("identity_evidence", [])
    # the snapshot keeps numbers and flags only: no names, no CNIC
    snapshot = {k: facts.get(k) for k in ("household", "payout", "doc", "identity", "claim", "consent", "scam")}
    snapshot["person"] = {k: facts["person"].get(k) for k in ("gender", "cnic_valid", "cnic_expired", "deceased", "age")}
    out = sw.write_decision(case_id, card, rs_id, snapshot, notes, data.get("consent_id"))
    d = card.model_dump()
    d["decision_id"], d["created_at"], d["case_notes_id"] = out["decision_id"], out["created_at"], out["case_notes_id"]
    d["case_status"] = out["status"]
    d["next_step"]["due_date"] = None
    record_latency((time.perf_counter() - t0) * 1000)
    return d


def mask_name(n: str | None) -> str | None:
    if not n:
        return n
    return " ".join(w[0] + "*" * (len(w) - 1) if len(w) > 1 else w for w in n.split())


def mask_cnic(c: str | None) -> str | None:
    if not c or len(c) != 13:
        return None
    return f"{c[:5]}-*******-{c[12]}"


def card_from_row(r: dict, notes_id: str | None = None) -> dict:
    """A decisions row -> the decision card shape (CONTRACT section 7)."""
    p = None
    for t in (r.get("trace") or []):
        if isinstance(t, dict) and t.get("what") == "model":
            p = t.get("p_eligible")
    return {
        "decision_id": str(r["id"]), "case_id": str(r["case_id"]),
        "created_at": r["created_at"].isoformat().replace("+00:00", "Z"), "actor_type": r["actor_type"],
        "zone": r["zone"], "result": r["result"], "reason_code": r["reason_code"],
        "confidence": float(r["confidence"]) if r["confidence"] is not None else 0.0,
        "p_eligible": p if p is not None else (float(r["confidence"]) if r["confidence"] is not None else None),
        "rule_version": r["rule_version"], "rule_checksum": r["rule_checksum"], "model_version": r["model_version"],
        "checks": r["checks"] or [], "explain_citizen": r["explain_citizen"] or R.explain(r["reason_code"]),
        "trace": r["trace"] or [], "next_step": r["next_step"], "case_notes_id": notes_id,
        "costs_used": r["costs_used"], "approve_line": float(r["approve_line"]) if r["approve_line"] is not None else None,
        "reject_line": float(r["reject_line"]) if r["reject_line"] is not None else None,
        "note": r.get("note"),
    }


# ---- multipart parsing without python-multipart -------------------------------------
async def read_limited_body(request, limit: int) -> bytes:
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > limit + 4096:
        raise ApiError("VALIDATION", message=f"The upload is larger than {limit // (1024 * 1024)} MB.", details={"max_bytes": limit})
    buf = bytearray()
    async for chunk in request.stream():
        buf.extend(chunk)
        if len(buf) > limit + 4096:
            raise ApiError("VALIDATION", message=f"The upload is larger than {limit // (1024 * 1024)} MB.", details={"max_bytes": limit})
    return bytes(buf)


def parse_multipart(content_type: str, body: bytes) -> dict[str, Any]:
    """Returns {'fields': {name: str}, 'files': {name: (filename, bytes)}}."""
    if not content_type or "multipart/form-data" not in content_type.lower():
        raise ApiError("VALIDATION", message="Send the file as multipart/form-data.")
    msg = BytesParser(policy=email_policy.HTTP).parsebytes(b"Content-Type: " + content_type.encode() + b"\r\nMIME-Version: 1.0\r\n\r\n" + body)
    fields: dict[str, str] = {}
    files: dict[str, tuple[str, bytes]] = {}
    if not msg.is_multipart():
        raise ApiError("VALIDATION", message="The upload could not be read.")
    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if not name:
            continue
        fn = part.get_filename()
        payload = part.get_payload(decode=True) or b""
        if fn is not None:
            files[name] = (fn, payload)
        else:
            fields[name] = payload.decode("utf-8", "replace")[:2000]
    return {"fields": fields, "files": files}
