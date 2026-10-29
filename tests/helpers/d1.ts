import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { join } from "node:path";
import { getDb, type Db } from "../../src/db/client.ts";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "migrations");

/** SQL text of every migration, in order, exactly as `wrangler d1 migrations apply` runs them. Read once per test file. */
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .toSorted((a, b) => a.localeCompare(b))
  .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8") }));

export const migrationFiles = (): { name: string; sql: string }[] => MIGRATIONS;

/** An in-memory SQLite with every migration applied. */
export function migratedSqlite(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  for (const { sql } of migrationFiles()) sqlite.exec(sql);
  return sqlite;
}

/**
 * The slice of the D1 API that drizzle-orm/d1 uses, backed by node:sqlite, so
 * tests run real queries against real SQLite with no Workers runtime.
 */
function d1Over(sqlite: DatabaseSync): D1Database {
  const prepare = (sql: string, params: SQLInputValue[] = []) => {
    const stmt = {
      bind: (...values: SQLInputValue[]) => prepare(sql, values),
      run: async () => {
        const info = sqlite.prepare(sql).run(...params);
        return { success: true, results: [], meta: { changes: Number(info.changes) } };
      },
      all: async () => {
        const results = sqlite.prepare(sql).all(...params);
        return { success: true, results, meta: {} };
      },
      raw: async () => {
        const s = sqlite.prepare(sql);
        s.setReturnArrays(true);
        return s.all(...params);
      },
      first: async () => sqlite.prepare(sql).get(...params) ?? null,
    };
    return stmt;
  };
  return {
    prepare,
    batch: async (stmts: { run: () => Promise<unknown> }[]) => Promise.all(stmts.map((s) => s.run())),
  } as unknown as D1Database;
}

export function testDb(): { db: Db; sqlite: DatabaseSync } {
  const sqlite = migratedSqlite();
  return { db: getDb(d1Over(sqlite)), sqlite };
}
