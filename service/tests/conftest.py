import os
os.environ["AUTO_SETTLE"] = "0"   # the older tests walk an approved case through payment by hand; test_auto_settle covers the automatic path
os.environ["DB_SERIALIZE"] = "1"   # the local test database serves one connection at a time (a .env for Supabase must not change that)
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

SERVICE = Path(__file__).resolve().parent.parent
REPO = SERVICE.parent
for p in (str(SERVICE), str(SERVICE / "tests")):
    if p not in sys.path:
        sys.path.insert(0, p)

TEST_PORT = int(os.environ.get("TEST_PG_PORT", "5461"))
TEST_DSN = f"postgresql://postgres:postgres@127.0.0.1:{TEST_PORT}/postgres"
JWT = "unit-test-signing-secret-which-is-long-enough"


def _port_open(port: int) -> bool:
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


@pytest.fixture(scope="session")
def pg():
    """A fresh in-memory Postgres (PGlite) with the migrations and seed applied. Skips if node is missing."""
    if os.environ.get("TEST_DATABASE_URL"):
        yield os.environ["TEST_DATABASE_URL"]
        return
    proc = None
    if not _port_open(TEST_PORT):
        try:
            proc = subprocess.Popen(["node", str(REPO / "scripts" / "local_pg.mjs"), "--memory"],
                                    env={**os.environ, "LOCAL_PG_PORT": str(TEST_PORT)}, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, cwd=str(REPO))
        except FileNotFoundError:
            pytest.skip("node is not installed: cannot start the local Postgres")
        for _ in range(60):
            if _port_open(TEST_PORT):
                break
            time.sleep(0.5)
        else:
            proc.kill()
            pytest.skip("local Postgres did not start")
    r = subprocess.run([sys.executable, str(REPO / "db" / "apply_migrations.py"), "--local", "--seed", "--dsn", TEST_DSN],
                       capture_output=True, text=True, cwd=str(REPO), timeout=240)
    if r.returncode != 0:
        pytest.fail("could not prepare the database:\n" + r.stdout[-800:] + r.stderr[-800:])
    # the demo seed leaves Zainab WITHOUT a helper permission (she gives it by PIN in the app); the tests start after she did.
    # test_18 at the end of test_api_zz_flow covers the PIN step itself.
    import psycopg
    with psycopg.connect(TEST_DSN, autocommit=True) as c:
        c.execute("insert into consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status) "
                  "select p.user_id,'helper','a0000000-0000-4000-8000-000000000002','claim_help',array['*'],p.user_id,'granted' from people p where p.record_no=1")
    yield TEST_DSN
    if proc:
        proc.kill()


@pytest.fixture(scope="session")
def app(pg):
    os.environ.update(DATABASE_URL=pg, JWT_SECRET=JWT, AUTH_MODE="local", RATE_LIMIT_PER_MIN="100000", LLM_PROVIDER="none")
    os.environ.pop("MASTER_DATABASE_URL", None)
    from app.main import create_app
    return create_app()


@pytest.fixture(scope="session")
def client(app):
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_limits():
    try:
        from app import ratelimit
        ratelimit.reset()
    except Exception:
        pass
    yield


USERS = {
    "zainab": ("zainab@citizens.sahara.test", "246810"), "yousuf": ("yousuf@helpers.sahara.test", "246810"),
    "asim": ("asim@citizens.sahara.test", "246810"), "officer1": ("admin1@gov.sahara.test", "Admin#2026"),
    "officer2": ("admin2@gov.sahara.test", "Admin#2026"), "admin": ("admin@gov.sahara.test", "Admin#2026"),
}
IDS = {k: f"a0000000-0000-4000-8000-00000000000{i}" for i, k in enumerate(USERS, start=1)}


@pytest.fixture(scope="session")
def tok(client):
    out = {}
    for k, (e, s) in USERS.items():
        r = client.post("/auth/login", json={"email": e, "secret": s})
        assert r.status_code == 200, (k, r.text)
        out[k] = {"Authorization": "Bearer " + r.json()["access_token"]}
    return out


@pytest.fixture()
def sql(pg):
    """Direct superuser SQL for test set-up only (never used by the service code)."""
    import psycopg
    from psycopg.rows import dict_row

    def run(q, args=None):
        with psycopg.connect(pg, row_factory=dict_row) as c:
            cur = c.execute(q, args or [])
            rows = cur.fetchall() if cur.description else []
            c.commit()
            return rows
    return run
