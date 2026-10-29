import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { actionCounts, linkChecks } from "../../src/db/schema.ts";
import { migratedSqlite, migrationFiles } from "../helpers/d1.ts";

interface PragmaColumn {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

function schemaColumns(table: typeof actionCounts | typeof linkChecks) {
  return getTableConfig(table).columns.map((c) => ({
    name: c.name,
    type: c.getSQLType().toUpperCase(),
    notnull: c.notNull,
    pk: c.primary,
    hasDefault: c.hasDefault,
  }));
}

describe("migrations", () => {
  const sqlite = migratedSqlite();

  it.each([
    ["action_counts", actionCounts],
    ["link_checks", linkChecks],
  ] as const)("a fresh database from migrations/ matches schema.ts for %s", (name, table) => {
    const actual = (sqlite.prepare(`pragma table_info(${name})`).all() as unknown as PragmaColumn[]).map((c) => ({
      name: c.name,
      type: c.type.toUpperCase(),
      notnull: c.notnull === 1,
      pk: c.pk > 0,
      hasDefault: c.dflt_value !== null,
    }));
    expect(actual).toEqual(schemaColumns(table));
  });

  it("creates no tables beyond the schema", () => {
    const tables = sqlite
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(tables).toEqual(["action_counts", "link_checks"]);
  });

  it("is additive only: no migration drops or renames anything", () => {
    for (const { name, sql } of migrationFiles()) {
      expect(sql, name).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i);
      expect(sql, name).not.toMatch(/\bRENAME\b/i);
    }
  });
});
