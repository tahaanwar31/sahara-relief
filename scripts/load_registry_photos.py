"""Put the demo photos into the (mock) government record, so the face check has something to compare with.
   python scripts/load_registry_photos.py [--dsn postgresql://...]      (default: DATABASE_URL from .env)
A photo file named <13-digit CNIC>.jpg in db/seed/photos/ becomes that person's record photo. The faces are AI-generated (nobody real).
"""
import os
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent.parent
if "--dsn" in sys.argv:
    dsn = sys.argv[sys.argv.index("--dsn") + 1]
else:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))
    dsn = os.environ["DATABASE_URL"]

with psycopg.connect(dsn, autocommit=True) as c:
    n = 0
    for f in sorted((ROOT / "db" / "seed" / "photos").glob("[0-9]" * 13 + ".jpg")):
        cur = c.execute("update mock.nadra set photo = %s where cnic = %s", [f.read_bytes(), f.stem])
        n += cur.rowcount
    print(f"registry photos loaded: {n}")
