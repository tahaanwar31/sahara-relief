"""Apply the SQL files in db/ to a Postgres database. Safe to run again.

  python db/apply_migrations.py --local            # shim + local login + migrations (plain Postgres / PGlite)
  python db/apply_migrations.py                    # migrations only (Supabase)
  python db/apply_migrations.py --local --seed     # ... and load db/seed/seed.sql

Connection: --dsn or the DATABASE_URL environment variable.
Each migration runs once; its name is stored in schema_migrations.
"""
import argparse
import os
import sys
from pathlib import Path

import psycopg

HERE = Path(__file__).resolve().parent


def run_file(conn, path: Path) -> None:
    conn.execute(path.read_text(encoding="utf-8"))  # no parameters, so several statements are allowed
    print(f"  ran {path.relative_to(HERE)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--local", action="store_true", help="also run db/local/*.sql (Supabase look-alike + local login)")
    ap.add_argument("--seed", action="store_true", help="load db/seed/seed.sql afterwards")
    args = ap.parse_args()
    if not args.dsn:
        print("Set DATABASE_URL or pass --dsn", file=sys.stderr)
        return 2

    with psycopg.connect(args.dsn, autocommit=True) as conn:
        if args.local:
            for f in sorted((HERE / "local").glob("*.sql")):
                run_file(conn, f)
        conn.execute("create table if not exists public.schema_migrations "
                     "(filename text primary key, applied_at timestamptz not null default now())")
        done = {r[0] for r in conn.execute("select filename from public.schema_migrations")}
        todo = [f for f in sorted((HERE / "migrations").glob("*.sql")) if f.name not in done]
        if not todo:
            print("migrations: nothing to do")
        for f in todo:
            run_file(conn, f)
            conn.execute("insert into public.schema_migrations (filename) values (%s)", (f.name,))
        if args.seed:
            run_file(conn, HERE / "seed" / "seed.sql")
            if (HERE / "seed" / "consistent_names.sql").exists():
                run_file(conn, HERE / "seed" / "consistent_names.sql")
            if (HERE / "seed" / "family_logins.sql").exists() and args.local:
                run_file(conn, HERE / "seed" / "family_logins.sql")
        bad = conn.execute("select app.verify_audit_chain()").fetchone()[0]
        print("diary chain:", "OK" if bad is None else f"BROKEN at row {bad}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
