// Test helpers: build a fresh in-memory Postgres (PGlite), apply the shim, the migrations and the seed,
// and run SQL AS a given user (SET LOCAL ROLE authenticated + JWT claims), exactly like the service does.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_DIR = path.resolve(here, "..");
const nm = path.resolve(DB_DIR, "..", "scripts", "node_modules", "@electric-sql", "pglite", "dist");
const load = (p) => import(pathToFileURL(path.join(nm, p)).href);

export const USERS = {
  zainab:   "a0000000-0000-4000-8000-000000000001",
  yousuf:   "a0000000-0000-4000-8000-000000000002",
  asim:     "a0000000-0000-4000-8000-000000000003",
  officer1: "a0000000-0000-4000-8000-000000000004",
  officer2: "a0000000-0000-4000-8000-000000000005",
  admin:    "a0000000-0000-4000-8000-000000000006",
};

export const read = (...p) => fs.readFileSync(path.join(DB_DIR, ...p), "utf8");
export const listSql = (dir) =>
  fs.readdirSync(path.join(DB_DIR, dir)).filter((f) => f.endsWith(".sql")).sort();

export async function rawDb() {
  const { PGlite } = await load("index.js");
  const { pgcrypto } = await load("contrib/pgcrypto.js");
  const { pg_trgm } = await load("contrib/pg_trgm.js");
  const { fuzzystrmatch } = await load("contrib/fuzzystrmatch.js");
  return PGlite.create({ extensions: { pgcrypto, pg_trgm, fuzzystrmatch } });
}

/** Same logic as apply_migrations.py: skip files already recorded in schema_migrations. */
export async function applyMigrations(db) {
  await db.exec(`create table if not exists public.schema_migrations (filename text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await db.query(`select filename from public.schema_migrations`)).rows.map((r) => r.filename));
  const applied = [];
  for (const f of listSql("migrations")) {
    if (done.has(f)) continue;
    await db.exec(read("migrations", f));
    await db.query(`insert into public.schema_migrations(filename) values ($1)`, [f]);
    applied.push(f);
  }
  return applied;
}

export async function buildDb({ migrations = true, seed = true } = {}) {
  const db = await rawDb();
  for (const f of listSql("local")) await db.exec(read("local", f));
  if (migrations) await applyMigrations(db);
  if (migrations && seed) await db.exec(read("seed", "seed.sql"));
  return db;
}

/**
 * Run fn(q) inside a transaction as `uid` (role authenticated, JWT claims set).
 * q(sql, params) throws on error. q.try(sql, params) returns {ok, rows, error, code} and keeps going.
 * The transaction is always rolled back, so tests do not disturb each other.
 * uid = null -> the master connection (superuser, no JWT).
 */
export async function as(db, uid, fn) {
  const sentinel = new Error("rollback");
  let result;
  try {
    await db.transaction(async (tx) => {
      if (uid) {
        await tx.query(`set local role authenticated`);
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: uid, role: "authenticated" }),
        ]);
      }
      const q = async (sql, params) => (await tx.query(sql, params)).rows;
      let n = 0;
      q.try = async (sql, params) => {
        const sp = `sp_${n++}`;
        await tx.query(`savepoint ${sp}`);
        try {
          const r = await tx.query(sql, params);
          await tx.query(`release savepoint ${sp}`);
          return { ok: true, rows: r.rows, count: r.affectedRows ?? r.rows.length };
        } catch (e) {
          await tx.query(`rollback to savepoint ${sp}`);
          return { ok: false, rows: [], count: 0, error: e.message, code: e.code };
        }
      };
      q.claims = async (obj) => tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(obj)]);
      result = await fn(q);
      throw sentinel;
    });
  } catch (e) {
    if (e !== sentinel) throw e;
  }
  return result;
}

export const count = async (q, table, where = "true") =>
  Number((await q(`select count(*)::int n from ${table} where ${where}`))[0].n);
