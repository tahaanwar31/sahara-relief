// The diary: every change writes a row, the chain verifies, nobody can edit it, tampering is detected.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDb, as, count, USERS as U } from "./lib.mjs";

let db;
before(async () => { db = await buildDb(); });
after(async () => { await db.close(); });
const sudo = (fn) => as(db, null, fn);

test("the seeded chain verifies and starts at GENESIS", async () => {
  await sudo(async (q) => {
    assert.equal((await q(`select app.verify_audit_chain() v`))[0].v, null);
    assert.equal((await q(`select prev_hash from audit_log order by id limit 1`))[0].prev_hash, "GENESIS");
    const h = (await q(`select * from app.audit_head()`))[0];
    assert.equal(Number(h.total), await count(q, "audit_log"));
    assert.match(h.last_hash, /^[0-9a-f]{64}$/);
  });
});

test("every insert, update and delete on the watched tables writes a diary row", async () => {
  await sudo(async (q) => {
    const n0 = await count(q, "audit_log");
    const ac = (await q(`select id from cases where owner_user_id=$1`, [U.asim]))[0].id;
    await q(`update cases set priority=7 where id=$1`, [ac]);
    assert.equal(await count(q, "audit_log"), n0 + 1);
    const row = (await q(`select * from audit_log order by id desc limit 1`))[0];
    assert.equal(row.action, "cases.update");
    assert.equal(row.entity_id, ac);
    assert.equal(row.details.changed.priority.new, 7);
    assert.equal(row.details.subject_id, U.asim);

    await q(`insert into api_keys (name, key_hash) values ('t','abc123')`);
    const k = (await q(`select * from audit_log where entity_type='api_keys' order by id desc limit 1`))[0];
    assert.equal(k.action, "api_keys.insert");
    assert.equal(k.details.new.key_hash, "[redacted]", "key hashes never reach the diary");

    await q(`update api_keys set revoked=true where key_hash='abc123'`);
    assert.equal((await q(`select action from audit_log where entity_type='api_keys' order by id desc limit 1`))[0].action, "api_keys.update");

    await q(`insert into consents (subject_id, grantee_type, grantee_id, purpose) values ($1,'office','LHR-CENTRAL','claim_processing')`, [U.asim]);
    const acts = (await q(`select action from audit_log where id > (select max(id)-2 from audit_log) order by id`)).map((r) => r.action);
    assert.ok(acts.includes("consents.insert") && acts.includes("consent_events.insert"), acts.join());

    const zc = (await q(`select id from cases where owner_user_id=$1`, [U.zainab]))[0].id;
    await q(`insert into documents (case_id, doc_type, storage_path) values ($1,'other','a/b')`, [zc]);
    await q(`insert into helper_assignments (helper_user_id, person_id) select $1, id from people where record_no=7`, [U.yousuf]);
    await q(`update rule_sets set effective_to = effective_to where version=2`);
    const types = new Set((await q(`select distinct entity_type from audit_log`)).map((r) => r.entity_type));
    for (const t of ["cases", "decisions", "documents", "consents", "consent_events", "rule_sets", "rules", "api_keys", "helper_assignments"]) {
      assert.ok(types.has(t), `diary has rows for ${t}`);
    }
    assert.equal((await q(`select app.verify_audit_chain() v`))[0].v, null);
  });
});

test("actor is recorded: user from the token, ai/job/system when there is none", async () => {
  await as(db, U.officer1, async (q) => {
    const ac = (await q(`select id from cases where owner_user_id=$1`, [U.asim]))[0].id;
    await q(`update cases set priority=3 where id=$1`, [ac]);
    const r = (await q(`select actor_id, actor_type, actor_role from audit_log order by id desc limit 1`))[0];
    assert.deepEqual([r.actor_id, r.actor_type, r.actor_role], [U.officer1, "user", "admin"]);
  });
  await sudo(async (q) => {
    await q(`select set_config('app.actor_type','ai',true), set_config('app.actor_name','engine',true)`);
    await q(`insert into api_keys (name, key_hash) values ('t2','zzz')`);
    const r = (await q(`select actor_id, actor_type, details from audit_log order by id desc limit 1`))[0];
    assert.equal(r.actor_type, "ai");
    assert.equal(r.actor_id, null);
    assert.equal(r.details.actor_name, "engine");
    await q(`select set_config('app.actor_type','',true)`);
    await q(`insert into api_keys (name, key_hash) values ('t3','yyy')`);
    assert.equal((await q(`select actor_type from audit_log order by id desc limit 1`))[0].actor_type, "system");
  });
  // a decision keeps its own actor
  await sudo(async (q) => {
    const ac = (await q(`select id from cases where owner_user_id=$1`, [U.asim]))[0].id;
    await q(`insert into decisions (case_id, actor_type, zone, result, reason_code) values ($1,'ai','HUMAN','HUMAN_REVIEW','R_LOW_CONFIDENCE')`, [ac]);
    const r = (await q(`select actor_type, result, rule_version from audit_log where entity_type='decisions' order by id desc limit 1`))[0];
    assert.equal(r.actor_type, "ai");
    assert.equal(r.result, "HUMAN_REVIEW");
    assert.equal(r.rule_version, 1);
  });
});

test("the diary cannot be changed: UPDATE, DELETE, TRUNCATE refused even for the superuser", async () => {
  await sudo(async (q) => {
    for (const sql of [`update audit_log set action='x'`, `update audit_log set hash='x' where id=1`, `delete from audit_log`, `delete from audit_log where id=1`, `truncate audit_log`]) {
      const r = await q.try(sql);
      assert.equal(r.ok, false, sql);
      assert.match(r.error, /append-only/);
    }
    assert.equal((await q(`select app.verify_audit_chain() v`))[0].v, null);
  });
});

test("users and the service role cannot write to audit_log directly", async () => {
  for (const who of ["admin", "zainab", "officer1"]) {
    await as(db, U[who], async (q) => {
      for (const sql of [`insert into audit_log (id, actor_type, action, prev_hash, hash) values (999999,'user','x','','')`, `update audit_log set action='x'`, `delete from audit_log`, `truncate audit_log`]) {
        const r = await q.try(sql);
        assert.ok(!r.ok || r.count === 0, `${who}: ${sql}`);
      }
    });
  }
  await sudo(async (q) => {
    await q(`set local role service_role`);
    for (const sql of [`insert into audit_log (id, actor_type, action, prev_hash, hash) values (999999,'user','x','','')`, `update audit_log set action='x'`, `delete from audit_log`]) {
      assert.equal((await q.try(sql)).ok, false, sql);
    }
  });
});

test("tampering is detected by verify_audit_chain (edited row, deleted row, forged row)", async () => {
  const bypass = `set local session_replication_role = replica`;    // what a database admin could do
  await sudo(async (q) => {
    await q(bypass);
    await q(`update audit_log set details = '{"forged":true}'::jsonb where id = 100`);
    assert.equal(Number((await q(`select app.verify_audit_chain() v`))[0].v), 100);
  });
  await sudo(async (q) => {
    await q(bypass);
    await q(`delete from audit_log where id = 50`);
    assert.equal(Number((await q(`select app.verify_audit_chain() v`))[0].v), 51);
  });
  await sudo(async (q) => {
    await q(bypass);
    await q(`update audit_log set result = 'APPROVE' where id = (select max(id) from audit_log)`);
    assert.equal(Number((await q(`select app.verify_audit_chain() v`))[0].v), Number((await q(`select max(id) m from audit_log`))[0].m));
  });
  await sudo(async (q) => {                       // swapping hashes of two rows
    await q(bypass);
    await q(`update audit_log set prev_hash = 'GENESIS' where id = 10`);
    assert.equal(Number((await q(`select app.verify_audit_chain() v`))[0].v), 10);
  });
});

test("only the admin may run the verifier; log_access feeds the data-access log", async () => {
  await as(db, U.zainab, async (q) => assert.equal((await q.try(`select app.verify_audit_chain()`)).ok, false));
  await as(db, U.yousuf, async (q) => assert.equal((await q.try(`select app.verify_audit_chain()`)).ok, false));
  await as(db, U.admin, async (q) => assert.equal((await q(`select app.verify_audit_chain() v`))[0].v, null));

  await as(db, U.officer1, async (q) => {
    const ac = (await q(`select id from cases where owner_user_id=$1`, [U.asim]))[0].id;
    await q(`select app.log_access('cases', $1, 'review', $2)`, [ac, U.asim]);
  });
  await as(db, U.zainab, async (q) => assert.equal((await q.try(`select app.log_access('cases', gen_random_uuid(), 'x', null)`)).ok, false));
  // log_access above rolled back; do it and read in one transaction chain
  await db.transaction(async (tx) => {
    const use = (u) => tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: u })]);
    await tx.query(`set local role authenticated`);
    await use(U.officer1);
    await tx.query(`select app.log_access('cases', gen_random_uuid(), 'review', $1)`, [U.asim]);
    await use(U.asim);
    const mine = (await tx.query(`select actor_id, action from audit_log where action='data.read'`)).rows;
    assert.equal(mine.length, 1);
    assert.equal(mine[0].actor_id, U.officer1);
    await use(U.zainab);
    assert.equal((await tx.query(`select count(*)::int n from audit_log where action='data.read'`)).rows[0].n, 0);
    await tx.query(`rollback`);
  });
});

test("a citizen reads only diary rows they caused or that are about them", async () => {
  await as(db, U.zainab, async (q) => {
    const rows = await q(`select actor_id, details->>'subject_id' s from audit_log`);
    assert.ok(rows.length > 0);
    assert.ok(rows.every((r) => r.actor_id === U.zainab || r.s === U.zainab));
  });
});

test("concurrent-style bursts keep one straight chain (ids strictly increase and every row links to the one before)", async () => {
  await sudo(async (q) => {
    for (let i = 0; i < 25; i++) await q(`insert into api_keys (name, key_hash) values ('burst', 'b${i}')`);
    const bad = await q(`select count(*)::int n from (select id, lag(id) over (order by id) p, prev_hash, lag(hash) over (order by id) ph from audit_log) t where p is not null and (id <= p or prev_hash <> ph)`);
    assert.equal(bad[0].n, 0);
    assert.equal((await q(`select app.verify_audit_chain() v`))[0].v, null);
  });
});
