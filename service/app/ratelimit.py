"""A small in-process rate limiter (sliding window). Good for one process; a real deployment would use Redis.

Friendly 429 with a Retry-After header. Buckets: login, scam, upload, public, general.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from .errors import ApiError

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)


def reset() -> None:
    with _lock:
        _hits.clear()


def check(bucket: str, who: str, limit: int, window: float = 60.0) -> None:
    now = time.monotonic()
    key = f"{bucket}:{who}"
    with _lock:
        q = _hits[key]
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            retry = max(1, int(window - (now - q[0])) + 1)
            raise ApiError("RATE_LIMITED", details={"retry_after_seconds": retry, "bucket": bucket},
                           headers={"Retry-After": str(retry)})
        q.append(now)
        if len(_hits) > 20000:   # keep memory bounded
            for k in list(_hits)[:5000]:
                _hits.pop(k, None)
