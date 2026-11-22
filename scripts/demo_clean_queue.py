"""Start the demo with an EMPTY admin review queue.

The seed data holds invented claims that are waiting for a staff member (they are test fixtures for the admin screens, the
Digital Twin and the tests). For a live demo the admin should see nobody until the demo person (Zainab) sends a claim that the
system cannot approve. This closes those seeded waiting claims through the normal legal path (in review -> stopped -> closed).
Nothing is deleted: the claims, their papers and decisions stay as history, and each gets a timeline line 'demo_clean'.

    python scripts/demo_clean_queue.py              # uses DATABASE_URL from .env
reset_supabase.py runs this at the end; pass --keep-queue to reset_supabase.py to keep the seeded waiting claims.
"""
import json
import os
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent.parent
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"'))
dsn = os.environ["DATABASE_URL"]
ZAINAB = "a0000000-0000-4000-8000-000000000001"     # the demo person's own claims are never touched

with psycopg.connect(dsn, autocommit=True) as c:
    rows = c.execute("select id, status from public.cases where status in ('submitted','in_review') and owner_user_id <> %s", [ZAINAB]).fetchall()
    for cid, status in rows:
        for nxt in ("stopped", "closed"):
            c.execute("update public.cases set status = %s where id = %s", [nxt, cid])
        c.execute("insert into public.case_events (case_id, kind, data) values (%s, 'demo_clean', %s)", [cid, json.dumps({"from": status})])
    left = c.execute("select count(*) from public.cases where zone = 'HUMAN' and status in ('submitted','in_review')").fetchone()[0]
    print(f"closed {len(rows)} seeded waiting claims; the admin queue now holds {left}")
