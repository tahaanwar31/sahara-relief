// Local Postgres for development and tests, with no Docker.
// It is real Postgres (PGlite, compiled to WebAssembly) served on a normal Postgres port.
//
//   node scripts/local_pg.mjs                 persistent data in ./.local-pg  (port 5433)
//   node scripts/local_pg.mjs --memory        throw-away data (tests)
//   LOCAL_PG_PORT=5444 node scripts/local_pg.mjs
//
// Connect with:  postgresql://postgres:postgres@127.0.0.1:5433/postgres
// Same migration files run here and on Supabase. Known limit: PGlite serves one
// connection at a time, so keep the service's connection pool small.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { fuzzystrmatch } from "@electric-sql/pglite/contrib/fuzzystrmatch";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const inMemory = process.argv.includes("--memory");
const port = Number(process.env.LOCAL_PG_PORT || 5433);
const dataDir = inMemory ? undefined : path.join(here, "..", ".local-pg");

const db = await PGlite.create({ dataDir, extensions: { pgcrypto, pg_trgm, fuzzystrmatch } });
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`local Postgres ready on 127.0.0.1:${port} (${inMemory ? "memory" : "persistent"})`);

const stop = async () => { await server.stop(); await db.close(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
