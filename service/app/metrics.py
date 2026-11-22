"""Tiny in-process request counters for GET /metrics."""
from __future__ import annotations

import threading
from collections import defaultdict

_lock = threading.Lock()
_status: dict[str, int] = defaultdict(int)
_route_ms: dict[str, list] = defaultdict(lambda: [0, 0.0])
_started = __import__("time").time()


def record(route: str, status: int, ms: float) -> None:
    with _lock:
        _status[str(status)] += 1
        r = _route_ms[route]
        r[0] += 1
        r[1] += ms


def snapshot() -> dict:
    with _lock:
        import time
        return {"uptime_seconds": int(time.time() - _started), "requests_by_status": dict(_status),
                "routes": {k: {"count": v[0], "avg_ms": round(v[1] / v[0], 2)} for k, v in sorted(_route_ms.items(), key=lambda x: -x[1][0])[:40]}}
