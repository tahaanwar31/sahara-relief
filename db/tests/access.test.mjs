// Row locks: role x table matrix, IDOR, helper isolation, officer isolation, consent take-back,
// admin cannot decide, separation of duties, role escalation, mass assignment.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDb, as, count, USERS as U } from "./lib.mjs";

let db;
before(async () => {
  db = await buildDb();
  // the demo seed leaves Zainab WITHOUT a helper permission (she gives it by PIN in the app); these tests start after she did
  await db.query(`insert into consents (subject_id, grantee_type, grantee_id, purpose, fields, granted_by, status)
    select p.user_id,'helper',$1::text,'claim_help',array['*'],p.user_id,'granted' from people p where p.record_no=1`, [U.yousuf]);
});
after(async () => { await db.close(); });

const caseOf = async (q, owner) => (await q(`select id from cases where owner_user_id=$1`, [owner]))[0]?.id;
const sudo = (fn) => as(db, null, fn);
const caseId = (owner) => sudo((q) => caseOf(q, owner));

// ---------------------------------------------------------------- matrix
const TABLES = ["profiles","user_roles","people","person_links","households","cases","case_events","documents","decisions",
  "case_notes","case_flags","consents","consent_events","helper_assignments","rule_sets","rules","api_keys","audit_log",
  "scam_reports","eval_runs","labelled_cases","data_quality_queue","schema_migrations"];

// expected: number | "some" (>0) | "all" (= total) | 0
const MATRIX = {
  zainab:   { cases: 1, api_keys: 0, rule_sets: 1, user_roles: 1, profiles: 1, consents: 3, case_notes: 0, case_flags: 0, labelled_cases: 0, data_quality_queue: 0, audit_log: "some", helper_assignments: 1 },
  asim:     { cases: 1, api_keys: 0, rule_sets: 1, user_roles: 1, consents: 2, case_notes: 0, labelled_cases: 0, scam_reports: "some", audit_log: "some" },
  yousuf:   { cases: 0, people: 1, households: 1, consents: 0, api_keys: 0, rule_sets: 0, documents: 0, decisions: 0, helper_assignments: 1, audit_log: "some", labelled_cases: 0 },
  admin:    { api_keys: 2, rule_sets: 2, audit_log: "some", labelled_cases: 120, cases: "some", case_notes: "some", consents: "all" },
};

for (const [who, exp] of Object.entries(MATRIX)) {
  test(`matrix: ${who} sees the expected rows`, async () => {
    const totals = {};
    for (const t of TABLES) totals[t] = await sudo((s) => count(s, t));
    await as(db, U[who], async (q) => {
      for (const t of TABLES) {
        if (!(t in exp)) continue;
        const n = await count(q, t);
        const total = totals[t];
        const e = exp[t];
        if (e === "some") assert.ok(n > 0, `${who}.${t} should see some rows, saw ${n}`);
        else if (e === "all") assert.equal(n, total, `${who}.${t} should see all ${total}, saw ${n}`);
        else assert.equal(n, e, `${who}.${t} expected ${e}, saw ${n}`);
      }
    });
  });
}

test("mock schema is closed to every user role", async () => {
  for (const who of Object.keys(U)) {
    await as(db, U[who], async (q) => {
      for (const t of ["mock.nadra", "mock.nser", "mock.raast_accounts", "mock.raast_payments"]) {
        const r = await q.try(`select * from ${t} limit 1`);
        assert.equal(r.ok, false, `${who} must not read ${t}`);
      }
    });
  }
});

test("people: only the person, never other citizens; admin via masked view only", async () => {
  await as(db, U.asim, async (q) => {
    assert.deepEqual((await q(`select record_no from people order by 1`)).map((r) => r.record_no), [5, 6][0] ? [5] : []);
  });
  // asim owns record 5; record 6 is a linked variant but asim is a citizen so not visible
  await as(db, U.admin, async (q) => {
    const rows = await q(`select cnic_masked from people_masked where cnic_masked is not null limit 3`);
    assert.ok(rows.every((r) => /^\d{5}\*{5}\d$/.test(r.cnic_masked)));
    assert.equal((await q.try(`select cnic from people_masked`)).ok, false);
  });
  await as(db, U.zainab, async (q) => assert.equal(await count(q, "people_masked"), 0));
});

// ---------------------------------------------------------------- IDOR
test("IDOR: citizen cannot read or change another citizen's case, documents, consents", async () => {
  const zc = await caseId(U.zainab);
  await as(db, U.asim, async (q) => {
    assert.equal((await q(`select * from cases where id=$1`, [zc])).length, 0);
    assert.equal((await q(`select * from documents where case_id=$1`, [zc])).length, 0);
    assert.equal((await q(`select * from decisions where case_id=$1`, [zc])).length, 0);
    assert.equal((await q(`select * from consents where subject_id=$1`, [U.zainab])).length, 0);
    assert.equal((await q(`select * from people where user_id=$1`, [U.zainab])).length, 0);
    const u = await q.try(`update cases set step = 9 where id=$1`, [zc]);
    assert.equal(u.count, 0);
    const w = await q.try(`update consents set status='withdrawn' where subject_id=$1`, [U.zainab]);
    assert.equal(w.count, 0);
    const d = await q.try(`select app.save_draft($1, 2, '{}'::jsonb)`, [zc]);
    assert.equal(d.ok, false);
    assert.equal((await q(`select * from app.resume_draft('482913')`)).length, 0);
  });
  await as(db, U.zainab, async (q) => assert.equal((await q(`select * from app.resume_draft('482913')`)).length, 1));
});

// ---------------------------------------------------------------- helper
test("helper isolation: nothing without a session, only the active family with it, nothing after it ends", async () => {
  const zp = await sudo(async (q) => (await q(`select id from people where record_no=1`))[0].id);
  await as(db, U.yousuf, async (q) => {
    assert.equal(await count(q, "cases"), 0);
    assert.equal(await count(q, "people"), 1, "only his own record");
    await q(`select app.helper_start_session($1)`, [zp]);
    assert.equal(await count(q, "cases"), 1);
    assert.equal((await q(`select owner_user_id from cases`))[0].owner_user_id, U.zainab);
    assert.ok((await count(q, "people")) <= 5, "only Zainab's household");
    assert.equal(await count(q, "people", "household_id is not null and record_no is null"), 0);
    assert.equal(await count(q, "consents"), 3);
    await q(`select app.helper_end_session()`);
    assert.equal(await count(q, "cases"), 0);
    assert.equal(await count(q, "people"), 1);
  });
});

test("helper cannot open a family without its consent, or one he does not serve", async () => {
  const fam = await sudo(async (s) => (await s(`select p.id from people p where p.record_no is null
       and not exists (select 1 from helper_assignments a where a.person_id=p.id) limit 1`))[0].id);
  const other = await sudo(async (s) => (await s(`select id from people where record_no=5`))[0].id);
  await as(db, U.yousuf, async (q) => {
    const r = await q.try(`select app.helper_start_session($1)`, [fam]);
    assert.equal(r.ok, false);
    const r2 = await q.try(`select app.helper_start_session($1)`, [other]);
    assert.equal(r2.ok, false);
    assert.equal(await count(q, "cases"), 0);
  });
});

test("helper can start a claim for the active family only, as that family's owner", async () => {
  const fam = await sudo(async (s) => (await s(`select p.id, p.user_id from people p join helper_assignments a on a.person_id=p.id where a.helper_user_id=$1 limit 1`, [U.yousuf]))[0]);
  await as(db, U.yousuf, async (q) => {
    const bad = await q.try(`insert into cases (owner_user_id, helper_user_id, person_id, office, quarter) values ($1,$2,$3,'KHI-EAST','2027-Q1')`, [fam.user_id, U.yousuf, fam.id]);
    assert.equal(bad.ok, false, "no session open yet");
    await q(`select app.helper_start_session($1)`, [fam.id]);
    const ok = await q.try(`insert into cases (owner_user_id, helper_user_id, person_id, office, quarter, amount) values ($1,$2,$3,'LHR-CENTRAL','2027-Q1',99999) returning amount, office`, [fam.user_id, U.yousuf, fam.id]);
    assert.equal(ok.ok, true, ok.error);
    assert.equal(Number(ok.rows[0].amount), 13500, "amount comes from the active rule set");
    assert.equal(ok.rows[0].office, "KHI-EAST", "office comes from the profile");
  });
});

// ---------------------------------------------------------------- consent take-back
test("consent take-back: officer loses sight, case stopped, helper session closed, receipt written", async () => {
  const ac = await caseId(U.asim);
  await as(db, U.officer1, async (q) => assert.equal((await q(`select * from cases where id=$1`, [ac])).length, 1));
  await as(db, U.asim, async (q) => {
    const cid = (await q(`select id from consents where grantee_type='office' and subject_id=$1`, [U.asim]))[0].id;
    const receipt = (await q(`select app.withdraw_consent($1) r`, [cid]))[0].r;
    assert.match(receipt, /^[0-9a-f]{64}$/);
    const ev = await q(`select kind, receipt_hash from consent_events where consent_id=$1 order by at`, [cid]);
    assert.deepEqual(ev.map((e) => e.kind), ["granted", "withdrawn"]);
    assert.equal(ev[1].receipt_hash, receipt);
    assert.equal((await q(`select status from cases where id=$1`, [ac]))[0].status, "stopped");
    assert.equal((await q.try(`select app.withdraw_consent($1)`, [cid])).ok, false, "second take-back refused");
  });
  await as(db, null, async (q) => {
    // (rolled back above, so redo as one transaction to also check the officer view)
  });
});

test("consent take-back is visible to the officer at once (same transaction chain)", async () => {
  const ac = await caseId(U.asim);
  await db.transaction(async (tx) => {
    await tx.query(`set local role authenticated`);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.asim })]);
    await tx.query(`update consents set status='withdrawn' where subject_id=$1 and grantee_type='office'`, [U.asim]);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.officer1 })]);
    const r = await tx.query(`select count(*)::int n from cases where id=$1`, [ac]);
    assert.equal(r.rows[0].n, 0);
    assert.equal((await tx.query(`select count(*)::int n from people where record_no in (5,6)`)).rows[0].n, 0);
    await tx.query(`rollback`);
  });
});

test("withdrawal closes the helper session and stops pending payment", async () => {
  const zp = await sudo(async (q) => (await q(`select id from people where record_no=1`))[0].id);
  await db.transaction(async (tx) => {
    const as_ = (u) => tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: u })]);
    await tx.query(`set local role authenticated`);
    await as_(U.yousuf);
    await tx.query(`select app.helper_start_session($1)`, [zp]);
    assert.equal((await tx.query(`select count(*)::int n from cases`)).rows[0].n, 1);
    await as_(U.zainab);
    await tx.query(`update consents set status='withdrawn' where subject_id=$1 and grantee_type='helper'`, [U.zainab]);
    await as_(U.yousuf);
    assert.equal((await tx.query(`select count(*)::int n from cases`)).rows[0].n, 0);
    assert.equal((await tx.query(`select count(*)::int n from helper_assignments where active`)).rows[0].n, 0);
    await tx.query(`rollback`);
  });
  // a payment queued for an approved case is stopped
  await sudo(async (q) => {
    // (the seed has no payments, so make one: an approved case, its account, and a queued payment)
    const c = (await q(`select c.id, c.owner_user_id from cases c where c.status='approved' limit 1`))[0];
    await q(`insert into mock.raast_accounts (account_id, title, kind) values ('03009990001','Test Holder','wallet') on conflict do nothing`);
    await q(`insert into mock.raast_payments (case_id, account_id, amount, status, reference) values ($1,'03009990001',13500,'queued','T-1')`, [c.id]);
    await q(`update consents set status='withdrawn' where subject_id=$1 and grantee_type='service'`, [c.owner_user_id]);
    assert.equal((await q(`select status from cases where id=$1`, [c.id]))[0].status, "stopped");
    assert.equal((await q(`select status from mock.raast_payments where case_id=$1`, [c.id]))[0].status, "stopped");
  });
});

test("consent rows cannot be edited, only taken back; consent_events are append-only", async () => {
  await as(db, U.zainab, async (q) => {
    assert.equal((await q.try(`update consents set purpose='x' where subject_id=$1`, [U.zainab])).ok, false);
    assert.equal((await q.try(`update consents set status='granted', fields='{a}' where subject_id=$1`, [U.zainab])).ok, false);
    assert.equal((await q.try(`delete from consents where subject_id=$1`, [U.zainab])).count, 0);
    assert.equal((await q.try(`update consent_events set kind='granted'`)).ok, false);
    assert.equal((await q.try(`insert into consents (subject_id, grantee_type, grantee_id, purpose) values ($1,'office','LHR-CENTRAL','claim_processing')`, [U.asim])).ok, false, "cannot grant for someone else");
    assert.equal((await q.try(`insert into consents (subject_id, grantee_type, grantee_id, purpose, granted_by) values ($1,'office','LHR-CENTRAL','claim_processing',$1)`, [U.zainab])).ok, true);
  });
});

// ---------------------------------------------------------------- officer
test("officer sees only own-office, non-draft cases with consent", async () => {
  await as(db, U.officer1, async (q) => {
    const rows = await q(`select office, status from cases`);
    assert.ok(rows.length > 10);
    assert.ok(rows.every((r) => r.office === "KHI-EAST" && r.status !== "draft"));
    assert.equal((await q(`select count(*)::int n from cases where office <> 'KHI-EAST'`))[0].n, 0);
    assert.equal(await count(q, "people", "user_id = '" + U.zainab + "'"), 0);
  });
  const total = await sudo((q) => count(q, "cases", "office <> 'KHI-EAST'"));
  assert.ok(total > 10, "seed has other-office cases");
});

test("officer cannot edit what is not theirs to edit", async () => {
  const ac = await caseId(U.asim);
  await as(db, U.officer1, async (q) => {
    assert.equal((await q.try(`update cases set amount=1 where id=$1`, [ac])).ok, false);
    assert.equal((await q.try(`update cases set office='LHR-CENTRAL' where id=$1`, [ac])).ok, false);
    assert.equal((await q.try(`update cases set status='paid' where id=$1`, [ac])).ok, false);
    assert.equal((await q.try(`update cases set priority=5 where id=$1`, [ac])).ok, true);
    assert.equal((await q.try(`delete from cases where id=$1`, [ac])).ok, false);
  });
});

// ---------------------------------------------------------------- admin
test("admin edits rules", async () => {
  await as(db, U.admin, async (q) => {
    const n = (await q(`select app.create_rule_set('{}'::jsonb,'[]'::jsonb) id`)).length;
    assert.equal(n, 1);
  });
  await as(db, U.zainab, async (q) => assert.equal((await q.try(`select app.create_rule_set('{}'::jsonb,'[]'::jsonb)`)).ok, false));
});

// ---------------------------------------------------------------- separation of duties and approval gates
async function officerApprove(q, who, caseUuid, result = "APPROVE") {
  const rs = (await q(`select id from rule_sets where status='active'`))[0].id;
  await q(`insert into decisions (case_id, actor_type, actor_id, zone, result, reason_code, rule_set_id) values ($1,'user',$2,'HUMAN',$3,'R_AUTO_APPROVED',$4)`, [caseUuid, who, result, rs]);
}

test("officer approves a clean case (decision first, then status)", async () => {
  const ac = await caseId(U.asim);
  await as(db, U.officer1, async (q) => {
    const early = await q.try(`update cases set status='approved' where id=$1`, [ac]);
    assert.equal(early.ok, false, "no APPROVE decision yet");
    await officerApprove(q, U.officer1, ac);
    const r = await q.try(`update cases set status='approved' where id=$1 returning status, decided_at`, [ac]);
    assert.equal(r.ok, true, r.error);
  });
});

test("separation of duties: a person who helped with a case cannot approve it", async () => {
  const ac = await caseId(U.asim);
  await sudo(async (q) => {
    await q(`insert into documents (case_id, doc_type, storage_path, uploaded_by) values ($1,'other','x/y.png',$2)`, [ac, U.officer1]);
  });
  // the doc insert above is rolled back by as(); redo inside one transaction
  await as(db, null, async (q) => {
    await q(`insert into documents (case_id, doc_type, storage_path, uploaded_by) values ($1,'other','x/y.png',$2)`, [ac, U.officer1]);
    await q(`set local role authenticated`);
    await q.claims({ sub: U.officer1 });
    await officerApprove(q, U.officer1, ac);
    const r = await q.try(`update cases set status='approved' where id=$1`, [ac]);
    assert.equal(r.ok, false);
    assert.match(r.error, /separation of duties/);
  });
});

test("separation of duties: nobody approves a case they own", async () => {
  await as(db, null, async (q) => {
    const ac = await caseOf(q, U.asim);
    await q(`update cases set owner_user_id=owner_user_id where id=$1`, [ac]);
    // make officer1 the owner of a copy of the situation: owner = officer1 via master key
    await q(`update people set user_id=$1 where record_no=7`, [U.officer1]);
    const own = (await q(`select id from cases where person_id=(select id from people where record_no=7)`))[0].id;
    await q(`update cases set owner_user_id=$1, status='submitted', office='KHI-EAST' where id=$2`, [U.officer1, own]);
    await q(`insert into consents (subject_id, grantee_type, grantee_id, purpose) values ($1,'office','KHI-EAST','claim_processing') on conflict do nothing`, [U.officer1]);
    await q(`set local role authenticated`);
    await q.claims({ sub: U.officer1 });
    await officerApprove(q, U.officer1, own);
    const r = await q.try(`update cases set status='approved' where id=$1`, [own]);
    assert.equal(r.ok, false);
  });
});

test("a hard flag blocks approval until an officer resolves it", async () => {
  const dup = await sudo(async (q) => (await q(`select c.id from cases c join case_flags f on f.case_id=c.id where f.status='open' and f.kind='duplicate_identity'`))[0].id);
  await as(db, U.officer2, async (q) => {
    assert.equal((await q(`select open_flags from cases where id=$1`, [dup]))[0].open_flags, 1);
    await officerApprove(q, U.officer2, dup);
    const blocked = await q.try(`update cases set status='approved' where id=$1`, [dup]);
    assert.equal(blocked.ok, false);
    assert.match(blocked.error, /hard flag/);
    assert.equal((await q.try(`update case_flags set status='resolved' where case_id=$1`, [dup])).ok, false, "needs a note");
    const ok = await q.try(`update case_flags set status='resolved', resolution_note='Checked with NADRA, one person' where case_id=$1 returning resolved_by`, [dup]);
    assert.equal(ok.ok, true, ok.error);
    assert.equal(ok.rows[0].resolved_by, U.officer2);
    assert.equal((await q(`select open_flags from cases where id=$1`, [dup]))[0].open_flags, 0);
    const done = await q.try(`update cases set status='approved' where id=$1`, [dup]);
    assert.equal(done.ok, true, done.error);
  });
});

test("above second_approver_over two different officers must approve", async () => {
  await as(db, null, async (q) => {
    const ac = await caseOf(q, U.asim);
    await q(`update cases set amount=25000 where id=$1`, [ac]);
    await q(`set local role authenticated`);
    await q.claims({ sub: U.officer1 });
    await officerApprove(q, U.officer1, ac);
    const one = await q.try(`update cases set status='approved' where id=$1`, [ac]);
    assert.equal(one.ok, false);
    assert.match(one.error, /second approver/);
    await q.claims({ sub: U.officer2 });
    await officerApprove(q, U.officer2, ac);
    const two = await q.try(`update cases set status='approved' where id=$1`, [ac]);
    assert.equal(two.ok, true, two.error);
  });
});

// ---------------------------------------------------------------- escalation and mass assignment
test("role escalation fails: citizen, officer and admin cannot change their own role", async () => {
  for (const who of ["zainab", "officer1", "admin"]) {
    await as(db, U[who], async (q) => {
      const a = await q.try(`update user_roles set role='admin' where user_id=$1`, [U[who]]);
      assert.ok(!a.ok || a.count === 0, `${who} update`);
      const b = await q.try(`insert into user_roles (user_id, role) values ($1,'admin') on conflict (user_id) do update set role='admin'`, [U[who]]);
      assert.equal(b.ok, false, `${who} upsert`);
      const c = await q.try(`delete from user_roles where user_id=$1`, [U[who]]);
      assert.ok(!c.ok || c.count === 0, `${who} delete`);
    });
  }
  await sudo(async (q) => assert.equal((await q(`select role from user_roles where user_id=$1`, [U.zainab]))[0].role, "citizen"));
});

test("a role claimed in the token is ignored: the database table decides", async () => {
  await as(db, U.zainab, async (q) => {
    await q.claims({ sub: U.zainab, role: "authenticated", app_metadata: { role: "admin" }, user_role: "admin" });
    assert.equal((await q(`select app.current_role() r`))[0].r, "citizen");
    assert.equal(await count(q, "api_keys"), 0);
    assert.equal(await count(q, "cases"), 1);
  });
});

test("admin can change another user's role but not their own", async () => {
  await as(db, U.admin, async (q) => {
    assert.equal((await q.try(`update user_roles set role='citizen' where user_id=$1`, [U.officer2])).count, 1);
    assert.ok(!(await q.try(`update user_roles set role='citizen' where user_id=$1`, [U.admin])).count);
  });
});

test("mass assignment on a case and on a profile is refused", async () => {
  const zc = await caseId(U.zainab);
  const zp = await sudo(async (q) => (await q(`select id from people where record_no=1`))[0].id);
  await as(db, U.zainab, async (q) => {
    for (const set of ["amount=999999", "status='approved'", "zone='AUTO', result='APPROVE'", "assigned_officer='" + U.zainab + "'", "office='LHR-CENTRAL'", "owner_user_id='" + U.asim + "'", "open_flags=5", "priority=9"]) {
      const r = await q.try(`update cases set ${set} where id=$1`, [zc]);
      assert.ok(!r.ok || r.count === 0, set);
    }
    const bad = await q.try(`insert into cases (owner_user_id, person_id, office, quarter, status, amount) values ($1,$2,'KHI-EAST','2027-Q1','approved',99999)`, [U.zainab, zp]);
    assert.equal(bad.ok, false);
    const good = await q.try(`insert into cases (owner_user_id, person_id, office, quarter, amount) values ($1,$2,'LHR-CENTRAL','2027-Q1',99999) returning amount, office, status`, [U.zainab, zp]);
    assert.equal(good.ok, true, good.error);
    assert.equal(Number(good.rows[0].amount), 13500);
    assert.equal(good.rows[0].office, "KHI-EAST");
    assert.equal((await q.try(`update profiles set office='LHR-CENTRAL' where user_id=$1`, [U.zainab])).ok, false);
    assert.equal((await q.try(`update profiles set person_id=null where user_id=$1`, [U.zainab])).ok, false);
    assert.equal((await q.try(`update profiles set language='en', full_name='Zainab B' where user_id=$1`, [U.zainab])).count, 1);
    const own = await q.try(`update cases set step=4, draft='{"a":1}' where id=$1`, [zc]);
    assert.equal(own.ok, true, own.error);
  });
});

test("drafts: resume code is stable, same key twice returns the first result", async () => {
  const zc = await caseId(U.zainab);
  await as(db, U.zainab, async (q) => {
    const a = (await q(`select app.save_draft($1, 4, '{"x":1}'::jsonb, 'key-1') r`, [zc]))[0].r;
    assert.equal(a.resume_code, "482913");
    const b = (await q(`select app.save_draft($1, 5, '{"x":2}'::jsonb, 'key-1') r`, [zc]))[0].r;
    assert.equal(b.repeat, true);
    assert.equal(b.saved_at, a.saved_at);
    assert.equal((await q(`select step from cases where id=$1`, [zc]))[0].step, 4);
  });
});

test("scam reports: citizens write and read their own; staff read all", async () => {
  await as(db, U.asim, async (q) => {
    assert.equal((await q.try(`insert into scam_reports (text,label,reported_by) values ('x','scam',$1)`, [U.asim])).ok, true);
    assert.equal((await q.try(`insert into scam_reports (text,label,reported_by) values ('x','scam',$1)`, [U.zainab])).ok, false);
    assert.ok((await count(q, "scam_reports")) >= 1);
  });
  await as(db, U.zainab, async (q) => assert.equal(await count(q, "scam_reports"), 0));
  await as(db, U.officer1, async (q) => assert.equal(await count(q, "scam_reports"), 40));
});
