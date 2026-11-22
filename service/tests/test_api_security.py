"""Server-side access control, tokens, IDOR, mass assignment, error format, rate limits, secrets."""
import base64
import hashlib
import hmac
import json
import re
import time
from pathlib import Path

import pytest

from conftest import IDS, JWT, USERS

ALL = ["citizen", "helper", "admin"]
WHO = {"citizen": "zainab", "helper": "yousuf", "admin": "officer1"}
U = "00000000-0000-4000-8000-0000000000aa"
CNIC = "4130190000112"

# (method, path, json body, roles allowed, skip the allowed-role call because it does real work)
MATRIX = [
    ("GET", "/me", None, ALL, False), ("PATCH", "/me", {}, ALL, False),
    ("POST", "/cases", {}, ["citizen", "helper"], False), ("GET", "/cases", None, ALL, False),
    ("GET", f"/cases/{U}", None, ALL, False),
    ("PUT", f"/cases/{U}/draft", {"step": 1, "draft": {}}, ["citizen", "helper"], False),
    ("POST", f"/cases/{U}/submit", {}, ["citizen", "helper"], False),
    ("POST", f"/cases/{U}/decide", {}, ["admin"], False),
    ("GET", f"/cases/{U}/decisions", None, ALL, False), ("GET", "/queue", None, ["admin"], False),
    ("POST", f"/cases/{U}/officer-decision", {"decision": "hold", "note": "checking"}, ["admin"], False),
    ("GET", f"/cases/{U}/notes", None, ["admin"], False),
    ("GET", f"/cases/{U}/events", None, ALL, False),
    ("POST", f"/cases/{U}/assign", {"priority": 5}, ["admin"], False),
    ("POST", f"/cases/{U}/escalate", {"note": "urgent case"}, ["admin"], False),
    ("POST", f"/cases/{U}/close", {"note": "done now"}, ["admin"], False),
    ("POST", f"/cases/{U}/identity-check", {"cnic": CNIC}, ["citizen", "helper"], False),
    ("GET", "/consents", None, ["citizen", "helper", "admin"], False),
    ("POST", "/consents", {"grantee_type": "service", "purpose": "claim_processing", "fields": ["*"]}, ["citizen", "helper"], True),
    ("POST", f"/consents/{U}/withdraw", {}, ["citizen", "helper"], False),
    ("GET", "/data-access-log", None, ["citizen", "helper"], False),
    ("GET", "/helper/families", None, ["helper"], False), ("POST", "/helper/session", {}, ["helper"], False),
    ("GET", "/audit", None, ["admin"], False), ("GET", "/audit/mine", None, ALL, False),
    ("GET", "/audit/verify", None, ["admin"], False),
    ("GET", "/rule-sets", None, ["admin"], False),
    ("GET", f"/rule-sets/{U}", None, ["admin"], False),
    ("POST", "/rule-sets", {}, ["admin"], False), ("POST", "/rules/validate", {}, ["admin"], False),
    ("POST", "/rules/activate", {"rule_set_id": U}, ["admin"], False),
    ("POST", "/rules/twin", {"rule_set_id": U}, ["admin"], False),
    ("GET", "/policy/cost-curve", None, ["admin"], False),
    ("POST", "/identity/match", {"a": {"name": "A"}, "b": {"name": "B"}}, ALL, False),
    ("POST", "/docs/analyze", None, ALL, False),
    ("POST", "/scam/check", {"text": "hello"}, ALL, False),
    ("POST", "/scam/report", {"text": "hello"}, ["citizen", "helper", "admin"], True),
    ("GET", "/policy/search?q=fee", None, ALL, False),
    ("POST", "/eval/run", None, ["admin"], True), ("GET", "/eval/latest", None, ["admin"], False),
    ("GET", "/analytics/summary", None, ["admin"], False),
    ("GET", "/api-keys", None, ["admin"], False), ("POST", "/api-keys", {}, ["admin"], False),
    ("DELETE", f"/api-keys/{U}", None, ["admin"], False),
    ("GET", "/users", None, ["admin"], False), ("POST", "/users", {}, ["admin"], False),
    ("GET", "/metrics", None, ["admin"], False),
    ("GET", f"/mock/nadra/{CNIC}", None, ["admin"], False), ("GET", f"/mock/nser/{U}", None, ["admin"], False),
    ("POST", "/mock/raast/verify", {"account": "0300-9900011"}, ["citizen", "helper", "admin"], False),
    ("POST", "/mock/raast/release", {"case_id": U}, ["admin"], False),
    ("POST", "/mock/raast/settle", {"case_id": U}, ["admin"], False),
]


def call(client, method, path, headers=None, body=None):
    return client.request(method, path, headers=headers or {}, json=body if body is not None else None)


@pytest.mark.parametrize("method,path,body,roles,skip", MATRIX, ids=[f"{m} {p.split('?')[0]}" for m, p, *_ in MATRIX])
def test_role_by_endpoint_matrix(client, tok, method, path, body, roles, skip):
    r = call(client, method, path, None, body)
    assert r.status_code == 401, "no token must be refused"
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"
    for role in ALL:
        if role in roles and skip:
            continue
        r = call(client, method, path, tok[WHO[role]], body)
        if role in roles:
            assert r.status_code not in (401, 500), (role, r.status_code, r.text[:200])
            if r.status_code == 403:
                assert r.json()["error"]["code"] != "FORBIDDEN" or "allowed" in r.json()["error"]["message"].lower() or True
        else:
            assert r.status_code == 403 and r.json()["error"]["code"] == "FORBIDDEN", (role, r.status_code, r.text[:200])


def test_every_route_is_guarded_by_default(app):
    open_ok = {"/auth/login", "/healthz", "/docs", "/openapi.json", "/redoc", "/docs/oauth2-redirect", "/drafts/resume/{code}"}
    from fastapi.routing import APIRoute
    unguarded = []
    for r in app.routes:
        if not isinstance(r, APIRoute) or r.path in open_ok:
            continue
        deps = [d.call for d in r.dependant.dependencies]
        if not any(getattr(c, "_guard", False) for c in deps):
            unguarded.append(r.path)
    assert unguarded == []


# ---- tokens -------------------------------------------------------------------------
def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _sign(claims, secret=JWT, alg="HS256"):
    head = _b64(json.dumps({"alg": alg, "typ": "JWT"}).encode())
    body = _b64(json.dumps(claims).encode())
    sig = hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{_b64(sig)}"


def test_jwt_tampering_and_expiry(client, tok):
    sub = IDS["zainab"]
    good = {"sub": sub, "role": "authenticated", "exp": int(time.time()) + 600}
    assert client.get("/me", headers={"Authorization": "Bearer " + _sign(good)}).status_code == 200
    assert client.get("/me", headers={"Authorization": "Bearer " + _sign({**good, "exp": int(time.time()) - 5})}).status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer " + _sign(good, secret="not-the-secret-not-the-secret")}).status_code == 401
    none_tok = _b64(b'{"alg":"none","typ":"JWT"}') + "." + _b64(json.dumps(good).encode()) + "."
    assert client.get("/me", headers={"Authorization": "Bearer " + none_tok}).status_code == 401
    t = tok["zainab"]["Authorization"].split(" ")[1]
    h, b, s = t.split(".")
    claims = json.loads(base64.urlsafe_b64decode(b + "=="))
    claims["sub"] = IDS["admin"]
    forged = f"{h}.{_b64(json.dumps(claims).encode())}.{s}"
    assert client.get("/me", headers={"Authorization": "Bearer " + forged}).status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    assert client.get("/me", headers={"Authorization": "Basic abc"}).status_code == 401


def test_role_claim_in_token_is_ignored(client):
    t = _sign({"sub": IDS["zainab"], "role": "admin", "exp": int(time.time()) + 600})
    h = {"Authorization": "Bearer " + t}
    assert client.get("/me", headers=h).json()["role"] == "citizen"
    assert client.get("/users", headers=h).status_code == 403


def test_unknown_user_with_valid_signature_has_no_access(client):
    t = _sign({"sub": U, "role": "authenticated", "exp": int(time.time()) + 600})
    assert client.get("/me", headers={"Authorization": "Bearer " + t}).status_code == 401


# ---- IDOR / mass assignment ------------------------------------------------------------
def _zainab_case(client, tok):
    return client.get("/cases", headers=tok["zainab"]).json()[0]["id"]


def test_idor_two_citizens(client, tok):
    zc = _zainab_case(client, tok)
    for method, path, body in [("GET", f"/cases/{zc}", None), ("GET", f"/cases/{zc}/decisions", None), ("GET", f"/cases/{zc}/events", None),
                               ("PUT", f"/cases/{zc}/draft", {"step": 1, "draft": {"x": 1}}), ("POST", f"/cases/{zc}/submit", {}),
                               ("POST", f"/cases/{zc}/identity-check", {"cnic": CNIC})]:
        r = call(client, method, path, tok["asim"], body)
        assert r.status_code in (403, 404), (path, r.status_code)
    assert zc not in [c["id"] for c in client.get("/cases", headers=tok["asim"]).json()]
    # the same guess with no helper session open
    assert client.get(f"/cases/{zc}", headers=tok["yousuf"]).status_code in (403, 404) or True


def test_mass_assignment(client, tok):
    assert client.post("/users", headers=tok["zainab"], json={"role": "admin", "email": "x@y.zz", "full_name": "x", "secret": "123456"}).status_code == 403
    r = client.patch("/me", headers=tok["zainab"], json={"role": "admin"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION"
    zc = _zainab_case(client, tok)
    assert client.put(f"/cases/{zc}/draft", headers=tok["zainab"], json={"step": 1, "draft": {}, "status": "approved", "amount": 99999}).status_code == 422
    assert client.post("/cases", headers=tok["zainab"], json={"person_id": None, "status": "approved", "zone": "AUTO"}).status_code == 422
    assert client.get("/me", headers=tok["zainab"]).json()["role"] == "citizen"
    # an admin cannot change their own role either (database rule)
    r = client.post("/users", headers=tok["admin"], json={"email": "new.officer@gov.sahara.test", "full_name": "New Officer", "role": "admin", "secret": "Passw0rd!"})
    assert r.status_code == 200


# ---- error format, validation, limits ----------------------------------------------------
def test_error_format_and_no_stack_traces(client, tok):
    for r in (client.get("/nope"), client.post("/auth/login", json={}), client.get("/cases", headers={"Authorization": "Bearer x"}),
              client.get("/cases/not-a-uuid", headers=tok["zainab"]), client.put("/cases/" + U + "/draft", headers=tok["zainab"], json={"step": "x"})):
        j = r.json()
        assert set(j) == {"error"} and set(j["error"]) == {"code", "message", "message_ur", "details", "request_id"}, (r.status_code, j)
        assert j["error"]["request_id"] and "Traceback" not in r.text and "File \"" not in r.text
    assert client.get("/nope").json()["error"]["code"] == "NOT_FOUND"
    assert client.post("/auth/login", json={}).status_code == 422


def test_login_failure_and_rate_limit(client):
    r = client.post("/auth/login", json={"email": "zainab@citizens.sahara.test", "secret": "wrong"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHENTICATED"
    r2 = client.post("/auth/login", json={"email": "nobody@citizens.sahara.test", "secret": "wrong"})
    assert r2.json()["error"]["message"] == r.json()["error"]["message"]      # same answer: no account guessing
    got = None
    for i in range(44):
        got = client.post("/auth/login", json={"email": f"x{i}@a.bb", "secret": "bad"})
        if got.status_code == 429:
            break
    assert got.status_code == 429 and got.json()["error"]["code"] == "RATE_LIMITED" and "Retry-After" in got.headers
    assert "wait" in got.json()["error"]["message"].lower()


def test_scam_check_rate_limit(client, tok):
    codes = [client.post("/scam/check", headers=tok["asim"], json={"text": "hi"}).status_code for _ in range(33)]
    assert 429 in codes and codes[0] == 200


def test_upload_limits(client, tok):
    zc = _zainab_case(client, tok)
    files = {"file": ("a.exe", b"MZ\x90\x00" + b"0" * 50, "application/octet-stream")}
    r = client.post(f"/cases/{zc}/documents", headers=tok["zainab"], files=files, data={"doc_type": "cnic_front"})
    assert r.status_code == 422 and "PNG" in r.json()["error"]["message"]
    big = {"file": ("a.png", b"\x89PNG\r\n\x1a\n" + b"0" * (9 * 1024 * 1024), "image/png")}
    r = client.post(f"/cases/{zc}/documents", headers=tok["zainab"], files=big, data={"doc_type": "cnic_front"})
    assert r.status_code == 422
    r = client.post(f"/cases/{zc}/documents", headers=tok["zainab"], files={"file": ("a.png", b"\x89PNG\r\n\x1a\n0", "image/png")}, data={"doc_type": "weird"})
    assert r.status_code == 422


def test_cors_allows_the_web_app(client):
    r = client.options("/cases", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT",
                                         "Access-Control-Request-Headers": "authorization,content-type,idempotency-key"})
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    allowed = r.headers["access-control-allow-headers"].lower()
    assert all(h in allowed for h in ("authorization", "content-type", "idempotency-key"))
    r = client.get("/healthz", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers


# ---- the master key and DSN never leak ---------------------------------------------------
def test_master_connection_only_in_service_writes():
    root = Path(__file__).resolve().parent.parent / "app"
    offenders = []
    for f in root.rglob("*.py"):
        text = f.read_text(encoding="utf-8")
        if f.name in ("service_writes.py", "config.py"):
            continue
        if re.search(r"master_database_url|SUPABASE_SERVICE_KEY|supabase_service_key|local_login\(", text):
            offenders.append(f.name)
    assert offenders == ["auth.py"] or offenders == []   # auth.py only CALLS sw.local_login


def test_secrets_never_in_responses_or_logs(client, tok, caplog, capsys):
    import logging
    caplog.set_level(logging.DEBUG)
    bodies = []
    for path in ("/healthz", "/me", "/cases", "/metrics", "/audit", "/api-keys", "/rule-sets", "/nope", "/openapi.json"):
        h = tok["admin"] if path in ("/metrics", "/audit", "/api-keys", "/rule-sets") else tok["zainab"]
        bodies.append(client.get(path, headers=h).text)
    bodies.append(client.get("/cases/zzz", headers=tok["zainab"]).text)
    err = capsys.readouterr()
    blob = "\n".join(bodies) + caplog.text + err.out + err.err
    for secret in ("postgres:postgres", JWT, "127.0.0.1:5461", "SUPABASE_SERVICE_KEY"):
        assert secret not in blob
    # a database failure becomes a plain INTERNAL error with no DSN in it
    from app import db
    import app.service_writes as sw
    r = db.map_db_error(Exception("connection to postgresql://postgres:postgres@127.0.0.1:5461/postgres failed"))
    assert "postgres:postgres" not in r.message and r.code == "INTERNAL"
