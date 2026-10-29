import { describe, expect, it } from "vitest";
import { getLinkRows, recordCheck } from "../../src/lib/link-checks.ts";
import { statusFromRow } from "../../src/lib/linkstate.ts";
import { testDb } from "../helpers/d1.ts";

const T1 = new Date("2026-10-29T03:00:00.000Z");
const T2 = new Date("2026-11-05T03:00:00.000Z");
const T3 = new Date("2026-11-12T03:00:00.000Z");
const URL_A = "https://example.org/donate";

describe("recordCheck", () => {
  it("records a first pass as verified", async () => {
    const { db } = testDb();
    expect(await recordCheck(db, URL_A, 200, T1)).toEqual({ consecutiveFail: 0, lastStatus: 200 });
  });

  it("one failure is a warning, two in a row is under review", async () => {
    const { db } = testDb();
    expect(statusFromRow(await recordCheck(db, URL_A, 500, T1))).toBe("warning");
    expect(statusFromRow(await recordCheck(db, URL_A, 404, T2))).toBe("review");
  });

  it("a pass after failures clears the streak", async () => {
    const { db } = testDb();
    await recordCheck(db, URL_A, 500, T1);
    await recordCheck(db, URL_A, 500, T2);
    expect(await recordCheck(db, URL_A, 200, T3)).toEqual({ consecutiveFail: 0, lastStatus: 200 });
  });

  it("treats a network error (null status) as a failure", async () => {
    const { db } = testDb();
    expect(await recordCheck(db, URL_A, null, T1)).toEqual({ consecutiveFail: 1, lastStatus: null });
  });

  it("tracks URLs independently", async () => {
    const { db } = testDb();
    await recordCheck(db, URL_A, 500, T1);
    await recordCheck(db, "https://other.example/give", 200, T1);
    const rows = await getLinkRows(db);
    expect(rows.get(URL_A)?.consecutiveFail).toBe(1);
    expect(rows.get("https://other.example/give")?.consecutiveFail).toBe(0);
  });
});

describe("getLinkRows", () => {
  it("is empty before any check", async () => {
    const { db } = testDb();
    expect((await getLinkRows(db)).size).toBe(0);
  });

  it("returns when each link was last checked", async () => {
    const { db } = testDb();
    await recordCheck(db, URL_A, 200, T1);
    await recordCheck(db, URL_A, 200, T2);
    expect((await getLinkRows(db)).get(URL_A)?.checkedAt).toBe(T2.toISOString());
  });
});
