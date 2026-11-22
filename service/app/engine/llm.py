"""OPTIONAL language-model helper. Off by default (LLM_PROVIDER=none). Every feature works without it.

Rules for the model output (it is untrusted text):
- It is parsed and checked with Pydantic. Garbage, empty, or huge output is NOT used.
- It can never make an approval easier. It can only add a doubt (a check that disagrees) or stay silent.
- If the call itself fails (no internet), the engine behaves as if there were no LLM.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError

log = logging.getLogger("sahara.llm")
MAX_RAW_CHARS = 4000


class LLMAdvice(BaseModel):
    eligible_hint: Literal["likely", "unlikely", "unsure"]
    confidence: float = Field(ge=0.0, le=1.0)
    note: str = Field(default="", max_length=300)

    model_config = {"extra": "forbid"}


def provider() -> str:
    p = (os.environ.get("LLM_PROVIDER") or "none").strip().lower()
    return p if p in ("none", "claude", "ollama") else "none"


def enabled() -> bool:
    return provider() != "none"


def parse_output(raw: Any) -> tuple[LLMAdvice | None, str | None]:
    """Validate whatever came back. Returns (advice, None) or (None, why_it_was_refused)."""
    if raw is None:
        return None, "empty"
    if isinstance(raw, LLMAdvice):
        return raw, None
    if isinstance(raw, (bytes, bytearray)):
        raw = bytes(raw)[:MAX_RAW_CHARS + 1].decode("utf-8", "replace")
    if isinstance(raw, str):
        if not raw.strip():
            return None, "empty"
        if len(raw) > MAX_RAW_CHARS:
            return None, "too long"
        try:
            raw = json.loads(raw)
        except Exception:
            return None, "not json"
    if not isinstance(raw, dict):
        return None, "not an object"
    try:
        return LLMAdvice.model_validate(raw), None
    except ValidationError:
        return None, "wrong shape"


def ask_llm(facts: dict) -> Any | None:
    """Return the raw model reply, or None when disabled or unreachable. Never raises."""
    prov = provider()
    if prov == "none":
        return None
    try:  # pragma: no cover - needs a network or a local model
        import httpx

        prompt = ("Return only JSON {\"eligible_hint\":\"likely|unlikely|unsure\",\"confidence\":0-1,\"note\":\"short\"} "
                  "for this anonymised relief case: " + json.dumps(_anonymise(facts))[:3000])
        if prov == "ollama":
            r = httpx.post(os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434") + "/api/generate",
                           json={"model": os.environ.get("OLLAMA_MODEL", "llama3.2"), "prompt": prompt, "stream": False},
                           timeout=8)
            return r.json().get("response")
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            return None
        r = httpx.post("https://api.anthropic.com/v1/messages",
                       headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                       json={"model": os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5"), "max_tokens": 200,
                             "messages": [{"role": "user", "content": prompt}]}, timeout=8)
        return r.json()["content"][0]["text"]
    except Exception as e:
        log.warning("llm unavailable: %s", type(e).__name__)
        return None


def _anonymise(facts: dict) -> dict:
    """No names, no CNIC: only the numbers and flags the rules already use."""
    keep = ("household", "payout", "doc", "identity", "claim")
    return {k: facts.get(k) for k in keep}
