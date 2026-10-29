import { describe, expect, it } from "vitest";
import { handleTaken } from "../../src/lib/taken.ts";
import { getActionCounts } from "../../src/lib/counters.ts";
import { testDb } from "../helpers/d1.ts";

const allow = { limit: async () => ({ success: true }) };
const deny = { limit: async () => ({ success: false }) };
const live = (slug: string) => slug === "ask-your-mp";

function setup(overrides: Partial<Parameters<typeof handleTaken>[0]> = {}) {
  const { db } = testDb();
  const call = (extra: Partial<Parameters<typeof handleTaken>[0]> = {}) =>
    handleTaken({
      method: "POST",
      slug: "ask-your-mp",
      ip: "203.0.113.7",
      limiter: allow,
      db,
      isLiveAction: live,
      ...overrides,
      ...extra,
    });
  return { db, call };
}

describe("handleTaken", () => {
  it("increments the counter and returns the new count", async () => {
    const { call } = setup();
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ slug: "ask-your-mp", count: 1 });
    expect(await (await call()).json()).toEqual({ slug: "ask-your-mp", count: 2 });
  });

  it("is never cached", async () => {
    const { call } = setup();
    expect((await call()).headers.get("cache-control")).toBe("no-store");
  });

  it.each(["GET", "PUT", "DELETE", "HEAD"])("rejects %s with 405 and Allow: POST", async (method) => {
    const { db, call } = setup();
    const res = await call({ method });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(await getActionCounts(db)).toEqual({});
  });

  it("is rate limited and does not count the rejected request", async () => {
    const { db, call } = setup({ limiter: deny });
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(await getActionCounts(db)).toEqual({});
  });

  it("keys the limiter on the caller's IP", async () => {
    const keys: string[] = [];
    const { call } = setup({ limiter: { limit: async ({ key }) => (keys.push(key), { success: true }) } });
    await call({ ip: "198.51.100.9" });
    expect(keys).toEqual(["198.51.100.9"]);
  });

  it("still limits callers whose IP is unknown", async () => {
    const keys: string[] = [];
    const { call } = setup({ limiter: { limit: async ({ key }) => (keys.push(key), { success: true }) } });
    await call({ ip: null });
    expect(keys).toEqual(["unknown"]);
  });

  it("404s a slug that is not a live action, so counters cannot be created at will", async () => {
    const { db, call } = setup();
    const res = await call({ slug: "made-up" });
    expect(res.status).toBe(404);
    expect(await getActionCounts(db)).toEqual({});
  });

  it.each([undefined, "", "Has Space", "UPPER", "a/b", "x".repeat(81)])("400s a malformed slug (%s)", async (slug) => {
    const { call } = setup();
    expect((await call({ slug })).status).toBe(400);
  });
});
