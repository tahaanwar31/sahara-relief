"""Wipe and rebuild the demo database named by DATABASE_URL in .env (schemas public, app, mock only).
   python scripts/reset_supabase.py
"""
import os
import subprocess
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent.parent
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"'))
dsn = os.environ["DATABASE_URL"]

with psycopg.connect(dsn, autocommit=True) as c:
    for sch in ("mock", "app", "public"):
        c.execute(f"drop schema if exists {sch} cascade")
    c.execute("create schema public")
    c.execute("grant usage on schema public to postgres, anon, authenticated, service_role")
    c.execute("alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role")
    c.execute("alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role")
    c.execute("alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role")

py = sys.executable
subprocess.run([py, str(ROOT / "db" / "apply_migrations.py"), "--dsn", dsn], check=True)
with psycopg.connect(dsn, autocommit=True) as c:
    for f in ["local/01_local_auth.sql", "seed/seed.sql", "seed/consistent_names.sql", "seed/family_logins.sql"]:
        c.execute((ROOT / "db" / f).read_text(encoding="utf-8"))
        print("  ran", f)
    subprocess.run([py, str(ROOT / "scripts" / "load_registry_photos.py"), "--dsn", dsn], check=True)
    for t in ("user_roles", "local_users", "people", "cases", "consents", "audit_log"):
        print(t, c.execute(f"select count(*) from public.{t}").fetchone()[0])
    print("roles:", c.execute("select role, count(*) from public.user_roles group by 1 order by 1").fetchall())
    print("chain:", c.execute("select app.verify_audit_chain()").fetchone()[0])

# the demo starts with an EMPTY admin queue (the seeded waiting claims are closed, not deleted); --keep-queue leaves them
if "--keep-queue" not in sys.argv:
    subprocess.run([py, str(ROOT / "scripts" / "demo_clean_queue.py")], check=True)
