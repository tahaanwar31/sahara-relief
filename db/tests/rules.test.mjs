// Rule versions, activation, immutability, decisions that never change.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDb, as, count, USERS as U } from "./lib.mjs";

let db;
before(async () => { db = await buildDb(); });
after(async () => { await db.close(); });
const sudo = (fn) => as(db, null, fn);

const GOOD = { programme: "x", cutoff: 28, borderline_band: 5, amount: 14000, payout_cap: 29000, auto_reject_enabled: false, second_approver_over: 20000,
  costs: { wrong_approve: 100, wrong_reject: 20, review: 3, proof: 1 } };
const RULE = (code, expression) => ({ code, expression, outcome: "HOLD", reason_code: "R_PMT_BORDERLINE", reason_en: "e", reason_ur: "u" });
const OK_RULES = [RULE("A", { ">": [{ var: "household.pmt_score" }, 30] })];

test("seed: v1 active with 9 rules and checksum, v2 draft", async () => {
  await sudo(async (q) => {
    const v = await q(`select version, status, params->>'cutoff' cutoff, params->>'amount' amount, checksum, effective_from from rule_sets order by version`);
    assert.deepEqual(v.map((r) => [r.version, r.status, r.cutoff, r.amount]), [[1, "active", "30", "13500"], [2, "draft", "25", "14500"]]);
    assert.match(v[0].checksum, /^sha256-[0-9a-f]{64}$/);
    assert.ok(v[0].effective_from);
    assert.equal(v[1].checksum, null);
    assert.equal(await count(q, "rules", "rule_set_id=(select id from rule_sets where version=1)"), 9);
    const p = (await q(`select params from rule_sets where version=1`))[0].params;
    assert.deepEqual(p.costs, { wrong_approve: 100, wrong_reject: 20, review: 3, proof: 1 });
    assert.equal(p.second_approver_over, 20000); assert.equal(p.payout_cap, 29000); assert.equal(p.borderline_band, 5); assert.equal(p.auto_reject_enabled, false);
    assert.equal((await q(`select app.validate_rule_set(id) v from rule_sets where version=2`))[0].v.length, 0);
    // every rule has a reason code and both texts
    assert.equal(await count(q, "rules", "reason_code is null or reason_en = '' or reason_ur = ''"), 0);
  });
});

test("only ONE rule set can be active (unique index), also against direct updates", async () => {
  await sudo(async (q) => {
    const r = await q.try(`update rule_sets set status='active' where version=2`);
    assert.equal(r.ok, false);
    const ins = await q.try(`insert into rule_sets (version, status, params) values (9,'active','{}')`);
    assert.equal(ins.ok, false, "new rows must start as drafts");
  });
});

test("activation retires the old version and activates the new one in one step", async () => {
  await as(db, U.admin, async (q) => {
    const v2 = (await q(`select id from rule_sets where version=2`))[0].id;
    const res = (await q(`select app.activate_rule_set($1) r`, [v2]))[0].r;
    assert.equal(res.activated_version, 2);
    assert.equal(res.retired_version, 1);
    const rows = await q(`select version, status, effective_from, effective_to, checksum from rule_sets order by version`);
    assert.equal(rows[0].status, "retired");
    assert.ok(rows[0].effective_to);
    assert.equal(rows[1].status, "active");
    assert.ok(rows[1].effective_from);
    assert.equal(rows[1].effective_to, null);
    assert.equal(rows[0].effective_to.getTime(), rows[1].effective_from.getTime(), "no gap, no overlap");
    assert.match(rows[1].checksum, /^sha256-/);
    assert.equal(await count(q, "rule_sets", "status='active'"), 1);
    // a new decision picks up the new version
    // (as admin we cannot insert; check the function used by decisions)
    assert.equal((await q(`select app.activate_rule_set($1)`, [v2]).catch(() => "refused")), "refused", "cannot activate twice");
  }).catch((e) => { assert.match(String(e.message), /only a draft/); });
});

test("activation: non-admins refused, invalid sets refused", async () => {
  const v2 = await sudo(async (q) => (await q(`select id from rule_sets where version=2`))[0].id);
  for (const who of ["zainab", "yousuf"]) {
    await as(db, U[who], async (q) => assert.equal((await q.try(`select app.activate_rule_set($1)`, [v2])).ok, false, who));
  }
  await as(db, U.admin, async (q) => {
    const cases = {
      "unknown variable": [GOOD, [RULE("B", { ">": [{ var: "household.secret" }, 1] })]],
      "unknown operator": [GOOD, [RULE("B", { evil: [1, 2] })]],
      "bare value": [GOOD, [RULE("B", true)]],
      "no rules": [GOOD, []],
      "missing cutoff": [{ ...GOOD, cutoff: undefined }, OK_RULES],
      "cap below amount": [{ ...GOOD, payout_cap: 100 }, OK_RULES],
      "bad costs": [{ ...GOOD, costs: { wrong_approve: 1, wrong_reject: 20, review: 3, proof: 1 } }, OK_RULES],
      "wrong arity": [GOOD, [RULE("B", { "==": [1] })]],
      "reject flag not boolean": [{ ...GOOD, auto_reject_enabled: "no" }, OK_RULES],
    };
    for (const [name, [params, rules]] of Object.entries(cases)) {
      const id = (await q(`select app.create_rule_set($1::jsonb, $2::jsonb) id`, [JSON.stringify(params), JSON.stringify(rules)]))[0].id;
      const r = await q.try(`select app.activate_rule_set($1)`, [id]);
      assert.equal(r.ok, false, name);
      assert.match(r.error, /validation/, name);
      assert.equal((await q(`select status from rule_sets where id=$1`, [id]))[0].status, "draft");
    }
    // a valid one does activate
    const id = (await q(`select app.create_rule_set($1::jsonb, $2::jsonb, 1) id`, [JSON.stringify(GOOD), JSON.stringify(OK_RULES)]))[0].id;
    assert.equal((await q.try(`select app.activate_rule_set($1)`, [id])).ok, true);
    assert.equal((await q(`select id from rule_sets where status='active'`))[0].id, id);
  });
});

test("saved rule sets and rules are immutable", async () => {
  await sudo(async (q) => {
    for (const sql of [
      `update rule_sets set params = jsonb_set(params,'{cutoff}','99') where version=1`,
      `update rule_sets set params = jsonb_set(params,'{cutoff}','99') where version=2`,
      `update rule_sets set version = 7 where version=1`,
      `update rule_sets set checksum = 'x' where version=1`,
      `update rule_sets set status='draft' where version=1`,
      `delete from rule_sets where version=1`,
      `update rules set outcome='PASS'`,
      `update rules set expression='{}'::jsonb where rule_set_id=(select id from rule_sets where version=2)`,
      `delete from rules where rule_set_id=(select id from rule_sets where version=1)`,
      `insert into rules (rule_set_id, code, expression, outcome, reason_code, reason_en, reason_ur)
         select id,'X','{"==":[1,1]}','HOLD','R_X','e','u' from rule_sets where version=1`,
    ]) {
      assert.equal((await q.try(sql)).ok, false, sql);
    }
    // status/effective dates may change; drafts can be deleted together with their rules
    assert.equal((await q.try(`update rule_sets set effective_to = now() + interval '1 day' where version=1`)).ok, true);
    assert.equal((await q.try(`delete from rule_sets where version=2`)).ok, true);
    assert.equal(await count(q, "rules", "rule_set_id not in (select id from rule_sets)"), 0);
  });
});

test("rule edits are admin-only and citizens read only the active set", async () => {
  await as(db, U.zainab, async (q) => {
    assert.equal((await q.try(`insert into rule_sets (version, params) values (5,'{}')`)).ok, false);
    assert.equal(await count(q, "rules"), 9);
  });
  await as(db, U.zainab, async (q) => assert.equal(await count(q, "rule_sets", "status='active'"), 1));
  await as(db, U.yousuf, async (q) => assert.equal(await count(q, "rule_sets"), 0));
  await as(db, U.admin, async (q) => {
    assert.equal(await count(q, "rule_sets"), 2);
    assert.equal((await q.try(`insert into rule_sets (version, params) values (5,'{"a":1}')`)).ok, true);
  });
});

test("expression checker accepts the contract subset", async () => {
  await sudo(async (q) => {
    const ok = (e) => q(`select app.expr_problem($1::jsonb) p`, [JSON.stringify(e)]).then((r) => r[0].p);
    assert.equal(await ok({ and: [{ "!": { missing: ["household.pmt_score"] } }, { in: [{ var: "identity.band" }, ["MAYBE", "DIFFERENT"]] }, { or: [{ "==": [{ var: "doc.any_blurry" }, true] }, { "<": [{ var: "doc.min_confidence" }, 0.6] }] }] }), null);
    assert.match(await ok({ var: "nope" }), /unknown variable/);
    assert.match(await ok({ "+": [1, 2] }), /unknown operator/);
  });
});

// ------------------------------------------------------------------ decisions
test("decisions are never updated or deleted (superuser included)", async () => {
  await sudo(async (q) => {
    for (const sql of [`update decisions set reason_code='R_LOW_CONFIDENCE'`, `update decisions set note='x' where id=(select id from decisions limit 1)`, `delete from decisions`, `truncate decisions`]) {
      const r = await q.try(sql);
      assert.equal(r.ok, false, sql);
      assert.match(r.error, /append-only|cannot truncate/);
    }
  });
  for (const who of ["officer1", "admin", "zainab"]) {
    await as(db, U[who], async (q) => {
      for (const sql of [`update decisions set note='x'`, `delete from decisions`]) {
        const r = await q.try(sql);
        assert.ok(!r.ok || r.count === 0, `${who} ${sql}`);
      }
    });
  }
});

test("a decision needs a reason code, valid zone/result, and records the rule version", async () => {
  await sudo(async (q) => {
    const ac = (await q(`select id from cases where owner_user_id=$1`, [U.asim]))[0].id;
    const base = (extra) => q.try(`insert into decisions (case_id, actor_type, zone, result, reason_code ${extra.cols || ""}) values ($1,'ai',$2,$3,$4 ${extra.vals || ""})`,
      [ac, extra.zone || "HUMAN", extra.result || "HUMAN_REVIEW", extra.code === undefined ? "R_LOW_CONFIDENCE" : extra.code]);
    assert.equal((await base({ code: null })).ok, false, "reason code required");
    assert.equal((await base({ code: "bad code" })).ok, false);
    assert.equal((await base({ zone: "AUTO", result: "HOLD" })).ok, false, "AUTO can only approve or reject");
    assert.equal((await base({ zone: "NOPE" })).ok, false);
    assert.equal((await base({ zone: "ASK_MORE", result: "ASK_PROOF" })).ok, true);
    const d = (await q(`select rule_version, rule_checksum, rule_set_id from decisions where case_id=$1 order by created_at desc limit 1`, [ac]))[0];
    assert.equal(d.rule_version, 1);
    assert.match(d.rule_checksum, /^sha256-/);
    const snap = await q.try(`insert into decisions (case_id, actor_type, zone, result, reason_code, input_snapshot) values ($1,'ai','HUMAN','HUMAN_REVIEW','R_LOW_CONFIDENCE','{"a":1}') returning input_hash`, [ac]);
    assert.match(snap.rows[0].input_hash, /^[0-9a-f]{64}$/);
    const wrong = await q.try(`insert into decisions (case_id, actor_type, zone, result, reason_code, rule_version) values ($1,'ai','HUMAN','HUMAN_REVIEW','R_LOW_CONFIDENCE', 99)`, [ac]);
    assert.equal(wrong.ok, false);
    assert.equal((await q.try(`insert into decisions (case_id, actor_type, zone, result, reason_code) values ($1,'user','HUMAN','APPROVE','R_X1')`, [ac])).ok, false, "user decision needs actor");
  });
  // a user cannot sign a decision as somebody else, nor as the AI
  const ac = await sudo(async (q) => (await q(`select id from cases where owner_user_id=$1`, [U.asim]))[0].id);
  await as(db, U.officer1, async (q) => {
    assert.equal((await q.try(`insert into decisions (case_id, actor_type, actor_id, zone, result, reason_code) values ($1,'user',$2,'HUMAN','APPROVE','R_AUTO_APPROVED')`, [ac, U.officer2])).ok, false);
    assert.equal((await q.try(`insert into decisions (case_id, actor_type, zone, result, reason_code) values ($1,'ai','HUMAN','APPROVE','R_AUTO_APPROVED')`, [ac])).ok, false);
    assert.equal((await q.try(`insert into decisions (case_id, actor_type, zone, result, reason_code) values ($1,'user','HUMAN','APPROVE','R_AUTO_APPROVED') returning actor_id`, [ac])).rows[0].actor_id, U.officer1);
  });
});

test("an old decision keeps pointing at the rule version it used after a new version goes live", async () => {
  await sudo(async (q) => {
    const before_ = (await q(`select count(*)::int n from decisions where rule_version=1`))[0].n;
    const v2 = (await q(`select id from rule_sets where version=2`))[0].id;
    await q(`select app.activate_rule_set($1)`, [v2]);
    assert.equal((await q(`select count(*)::int n from decisions where rule_version=1`))[0].n, before_);
    const ac = (await q(`select id from cases limit 1`))[0].id;
    await q(`insert into decisions (case_id, actor_type, zone, result, reason_code) values ($1,'ai','HUMAN','HUMAN_REVIEW','R_LOW_CONFIDENCE')`, [ac]);
    assert.equal((await q(`select rule_version from decisions order by created_at desc limit 1`))[0].rule_version, 2);
    assert.equal(await count(q, "decisions", "rule_checksum is null or rule_checksum <> (select checksum from rule_sets s where s.id = decisions.rule_set_id)"), 0);
  });
});

test("seed decisions all carry zone, result, reason code and the v1 checksum", async () => {
  await sudo(async (q) => {
    assert.equal(await count(q, "decisions", "zone is null or result is null or reason_code is null"), 0);
    assert.ok((await count(q, "decisions")) >= 200);
    assert.equal(await count(q, "decisions", "rule_version <> 1"), 0);
  });
});
