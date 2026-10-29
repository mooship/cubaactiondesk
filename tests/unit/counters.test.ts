import { describe, expect, it } from "vitest";
import { getActionCount, getActionCounts, incrementAction } from "../../src/lib/counters.ts";
import { testDb } from "../helpers/d1.ts";

describe("incrementAction", () => {
  it("creates the counter at 1 on first use", async () => {
    const { db } = testDb();
    expect(await incrementAction(db, "ask-your-mp")).toBe(1);
  });

  it("increments an existing counter", async () => {
    const { db } = testDb();
    await incrementAction(db, "ask-your-mp");
    expect(await incrementAction(db, "ask-your-mp")).toBe(2);
  });

  it("keeps slugs independent", async () => {
    const { db } = testDb();
    await incrementAction(db, "a");
    await incrementAction(db, "a");
    await incrementAction(db, "b");
    expect(await getActionCounts(db)).toEqual({ a: 2, b: 1 });
  });

  it("loses no counts under concurrent requests", async () => {
    const { db } = testDb();
    await Promise.all(Array.from({ length: 25 }, () => incrementAction(db, "busy")));
    expect((await getActionCounts(db)).busy).toBe(25);
  });

  it("records when the counter last changed", async () => {
    const { db, sqlite } = testDb();
    await incrementAction(db, "x", new Date("2026-10-29T10:00:00.000Z"));
    await incrementAction(db, "x", new Date("2026-10-30T11:30:00.000Z"));
    const row = sqlite.prepare("select updated_at from action_counts where slug = 'x'").get();
    expect(row).toEqual({ updated_at: "2026-10-30T11:30:00.000Z" });
  });
});

describe("getActionCount", () => {
  it("is 0 for an action nobody has done yet", async () => {
    const { db } = testDb();
    expect(await getActionCount(db, "nobody-yet")).toBe(0);
  });

  it("returns the count for one action", async () => {
    const { db } = testDb();
    await incrementAction(db, "a");
    await incrementAction(db, "a");
    await incrementAction(db, "b");
    expect(await getActionCount(db, "a")).toBe(2);
  });
});

describe("getActionCounts", () => {
  it("is empty when nothing has been counted", async () => {
    const { db } = testDb();
    expect(await getActionCounts(db)).toEqual({});
  });
});
