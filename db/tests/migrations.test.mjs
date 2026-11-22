// Migrations apply on a fresh database, apply again without error, and the seed is idempotent and complete.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rawDb, applyMigrations, listSql, read, buildDb, as, count, USERS as U } from "./lib.mjs";

test("fresh database: shim + all migrations + seed; migrations run a second time unchanged", async () => {
  const db = await rawDb();
  for (const f of listSql("local")) await db.exec(read("local", f));
  const first = await applyMigrations(db);
  assert.deepEqual(first, listSql("migrations"));
  assert.deepEqual(await applyMigrations(db), [], "recorded in schema_migrations, nothing to do");
  // force-run every file again (they are written to be re-runnable)
  for (const f of listSql("migrations")) await db.exec(read("migrations", f));
  const t = (await db.query(`select count(*)::int n from information_schema.tables where table_schema in ('public','mock')`)).rows[0].n;
  assert.ok(t >= 30);
  await db.exec(read("seed", "seed.sql"));
  const snap = async () => (await db.query(`select
     (select count(*) from people)::int people, (select count(*) from cases)::int cases, (select count(*) from decisions)::int decisions,
     (select count(*) from consents)::int consents, (select count(*) from consent_events)::int events, (select count(*) from audit_log)::int audit,
     (select count(*) from rules)::int rules, (select count(*) from mock.nadra)::int nadra, (select count(*) from scam_reports)::int scams,
     (select string_agg(password_hash, ',' order by email) from local_users) hashes`)).rows[0];
  const a = await snap();
  await db.exec(read("seed", "seed.sql"));
  const b = await snap();
  assert.deepEqual(b, a, "second seed run changes nothing (not even the password hashes or the diary)");
  assert.equal((await db.query(`select app.verify_audit_chain() v`)).rows[0].v, null);
  await db.close();
});

test("seed content: users, roles, people, families, cases, mock services", async () => {
  const db = await buildDb();
  const n = async (sql) => (await db.query(sql)).rows[0].n;
  assert.equal(await n(`select count(*)::int n from user_roles where user_id::text like 'a0000000-%'`), 6);
  assert.equal(await n(`select count(*)::int n from local_users`), 6);
  const roles = (await db.query(`select p.full_name, r.role from user_roles r join profiles p using (user_id) where r.user_id::text like 'a0000000-%' order by r.user_id`)).rows.map((r) => r.role);
  assert.deepEqual(roles, ["citizen", "helper", "citizen", "admin", "admin", "admin"]);
  assert.equal(await n(`select count(*)::int n from profiles where office='KHI-EAST' and user_id in ('${U.officer1}','${U.officer2}')`), 2);
  // login function
  const login = async (e, s) => (await db.query(`select app.local_login($1,$2) u`, [e, s])).rows[0].u;
  assert.equal(await login("zainab@citizens.sahara.test", "246810"), U.zainab);
  assert.equal(await login("yousuf@helpers.sahara.test", "246810"), U.yousuf);
  assert.equal(await login("asim@citizens.sahara.test", "246810"), U.asim);
  assert.equal(await login("admin1@gov.sahara.test", "Admin#2026"), U.officer1);
  assert.equal(await login("ADMIN2@gov.sahara.test", "Admin#2026"), U.officer2);
  assert.equal(await login("admin@gov.sahara.test", "Admin#2026"), U.admin);
  assert.equal(await login("zainab@citizens.sahara.test", "000000"), null);
  assert.equal(await login("nobody@x.test", "246810"), null);
  assert.equal(await n(`select count(*)::int n from local_users where password_hash like '$2%'`), 6, "bcrypt hashes only");
  assert.equal(await n(`select count(*)::int n from local_users where password_hash like '%246810%'`), 0);
  // lock-out after 5 wrong tries
  for (let i = 0; i < 5; i++) await login("asim@citizens.sahara.test", "bad");
  assert.equal(await login("asim@citizens.sahara.test", "246810"), null, "locked for a short time");

  assert.equal(await n(`select count(*)::int n from people where synthetic`), await n(`select count(*)::int n from people`));
  assert.equal(await n(`select count(*)::int n from people where record_no between 1 and 28`), 28);
  assert.equal(await n(`select count(*)::int n from helper_assignments where helper_user_id='${U.yousuf}'`), 1);
  assert.equal(await n(`select count(*)::int n from labelled_cases`), 120);
  const cats = (await db.query(`select category, count(*)::int n from labelled_cases group by 1 order by 1`)).rows;
  assert.deepEqual(Object.fromEntries(cats.map((c) => [c.category, c.n])), { bad_data: 15, borderline: 20, clearly_eligible: 40, clearly_ineligible: 35, scam: 10 });
  assert.equal(await n(`select count(*)::int n from scam_reports`), 40);
  assert.ok(await n(`select count(*)::int n from households where pmt_score is null`) >= 3);
  assert.ok(await n(`select count(*)::int n from households where pmt_score between 26 and 34`) >= 10);
  assert.ok(await n(`select count(*)::int n from people where cnic_expiry < '2026-11-20'`) >= 3);
  assert.ok(await n(`select count(*)::int n from people where deceased`) >= 2);
  assert.equal(await n(`select count(*)::int n from people where cnic is not null and cnic !~ '^[0-9]{13}$'`), 0);
  // Zainab's 3 spellings share one CNIC
  assert.equal(await n(`select count(distinct name_roman)::int n from people where cnic='4130190000112'`), 3);
  // odd last digit on a woman is in the data (record 9)
  assert.equal(await n(`select count(*)::int n from people where gender='F' and cnic is not null and right(cnic,1)::int % 2 = 1 and record_no between 1 and 28`), 1);
  // mock services consistent with the people
  assert.equal(await n(`select count(*)::int n from mock.nadra where status='deceased'`) >= 2 ? 1 : 0, 1);
  // the payout side starts EMPTY: no account number anywhere, no payment for anybody
  assert.equal(await n(`select count(*)::int n from mock.raast_accounts`), 0, "no account in the registry");
  assert.equal(await n(`select count(*)::int n from mock.raast_payments`), 0, "nobody has been paid");
  assert.equal(await n(`select count(*)::int n from cases where payout_account is not null`), 0, "no case holds an account");
  assert.equal(await n(`select count(*)::int n from people where wallet_name is not null or bank_name is not null`), 0, "no person holds an account");
  assert.ok(await n(`select count(*)::int n from mock.nser`) > 100);
  // every live-quarter helper case belongs to Yousuf's families
  assert.ok(await n(`select count(*)::int n from cases where helper_user_id='${U.yousuf}'`) >= 12);
  // zones are never empty
  assert.equal(await n(`select count(*)::int n from cases where status not in ('draft','submitted') and zone is null`), 0);
  assert.equal(await n(`select count(*)::int n from cases where open_flags > 0`) > 0 ? 1 : 0, 1);
  // service role / users cannot touch mock
  await as(db, U.officer1, async (q) => assert.equal((await q.try(`select 1 from mock.nadra`)).ok, false));
  await as(db, null, async (q) => {
    await q(`set local role service_role`);
    assert.ok((await q(`select count(*)::int n from mock.nadra`))[0].n > 100);
  });
  await db.close();
});
