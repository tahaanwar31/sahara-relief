"""Refresh the generated appendix data from the live database and the real API routes.
   python docs/gen/gen_appendix.py      (needs DATABASE_URL; run from the repo root with service/ importable)
"""
import json
import os
import sys
from pathlib import Path

import psycopg

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "service"))
os.environ.setdefault("AUTH_MODE", "local")

# ---------------------------------------------------------------- database part
with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as c:
    old = json.load(open(HERE / "schema.json", encoding="utf-8"))
    pol = c.execute("select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public' order by tablename, policyname").fetchall()
    json.dump([list(r) for r in pol], open(HERE / "policies.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
    sc = dict(old)
    sc["policies"] = [[r[0], r[1], r[2], "{authenticated}"] for r in pol]
    sc["counts"] = {t: c.execute(f'select count(*) from public."{t}"').fetchone()[0] for t in old["tables"]}
    sc["triggers"] = [list(r) for r in c.execute(
        "select event_object_table, trigger_name, action_timing, event_manipulation from information_schema.triggers where trigger_schema='public' order by 1,2,4")]
    json.dump(sc, open(HERE / "schema.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("policies", len(pol), "triggers", len(sc["triggers"]))

# ---------------------------------------------------------------- routes part
from app.main import app  # noqa: E402

routes = []
for r in app.routes:
    methods = getattr(r, "methods", None)
    if not methods or not getattr(r, "path", None) or r.path in ("/openapi.json", "/docs", "/redoc", "/docs/oauth2-redirect"):
        continue
    roles, scope = None, None
    for d in r.dependant.dependencies:
        call = d.call
        if getattr(call, "_guard", False):
            roles = list(call._roles)
    if r.path.startswith("/public"):
        scope = "X-API-Key"
    mod = r.endpoint.__module__.split(".")[-1]
    for m in sorted(methods - {"HEAD", "OPTIONS"}):
        routes.append([m, r.path, roles, scope, f"routers\\{mod}.py"])
routes.sort(key=lambda x: (x[4], x[1], x[0]))
json.dump(routes, open(HERE / "routes.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print("routes", len(routes))
