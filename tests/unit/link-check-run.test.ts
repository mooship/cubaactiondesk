import { describe, expect, it } from "vitest";
import { checkUrl, runChecks, type FetchLike } from "../../src/lib/link-check-run.ts";
import { getLinkRows } from "../../src/lib/link-checks.ts";
import { testDb } from "../helpers/d1.ts";

const T = new Date("2026-11-02T03:00:00.000Z");
const URL_A = "https://one.example/donate";
const URL_B = "https://two.example/give";

/** A fetch that answers by method and URL, and records what it was asked. */
function fakeFetch(answers: Record<string, number | "error" | { head?: number | "error"; get?: number | "error" }>) {
  const calls: { method: string; url: string }[] = [];
  const fetchImpl: FetchLike = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ method, url });
    const answer = answers[url] ?? 200;
    const value =
      typeof answer === "object" ? (method === "HEAD" ? (answer.head ?? 200) : (answer.get ?? 200)) : answer;
    if (value === "error") throw new TypeError("network down");
    return new Response(null, { status: value });
  };
  return { fetchImpl, calls };
}

describe("checkUrl", () => {
  it("uses a HEAD request and returns its status", async () => {
    const { fetchImpl, calls } = fakeFetch({ [URL_A]: 200 });
    expect(await checkUrl(URL_A, fetchImpl)).toBe(200);
    expect(calls).toEqual([{ method: "HEAD", url: URL_A }]);
  });

  it("falls back to GET when HEAD is refused", async () => {
    const { fetchImpl, calls } = fakeFetch({ [URL_A]: { head: 405, get: 200 } });
    expect(await checkUrl(URL_A, fetchImpl)).toBe(200);
    expect(calls.map((c) => c.method)).toEqual(["HEAD", "GET"]);
  });

  it("falls back to GET when HEAD fails at the network level", async () => {
    const { fetchImpl } = fakeFetch({ [URL_A]: { head: "error", get: 200 } });
    expect(await checkUrl(URL_A, fetchImpl)).toBe(200);
  });

  it("returns the GET status when both fail with a status", async () => {
    const { fetchImpl } = fakeFetch({ [URL_A]: { head: 404, get: 404 } });
    expect(await checkUrl(URL_A, fetchImpl)).toBe(404);
  });

  it("returns null when both attempts fail at the network level", async () => {
    const { fetchImpl } = fakeFetch({ [URL_A]: "error" });
    expect(await checkUrl(URL_A, fetchImpl)).toBeNull();
  });

  it("identifies itself and follows redirects", async () => {
    let init: RequestInit | undefined;
    await checkUrl(URL_A, async (_input, i) => ((init = i), new Response(null, { status: 200 })));
    expect(init?.redirect).toBe("follow");
    expect(String((init?.headers as Record<string, string>)["User-Agent"])).toMatch(/CubaActionDesk/);
  });
});

describe("runChecks", () => {
  it("records every result and reports nothing when links are healthy", async () => {
    const { db } = testDb();
    const { fetchImpl } = fakeFetch({});
    const reviewed: string[] = [];
    await runChecks({
      links: [
        { id: "a", url: URL_A },
        { id: "b", url: URL_B },
      ],
      db,
      fetchImpl,
      now: T,
      onReview: async (l) => void reviewed.push(l.id),
    });
    const rows = await getLinkRows(db);
    expect([...rows.keys()].toSorted((a, b) => a.localeCompare(b))).toEqual([URL_A, URL_B]);
    expect(rows.get(URL_A)?.consecutiveFail).toBe(0);
    expect(reviewed).toEqual([]);
  });

  it("reports a link exactly once, when it first goes under review (two failures in a row)", async () => {
    const { db } = testDb();
    const { fetchImpl } = fakeFetch({ [URL_A]: 500 });
    const reviewed: string[] = [];
    const run = () =>
      runChecks({
        links: [{ id: "a", url: URL_A }],
        db,
        fetchImpl,
        now: T,
        onReview: async (l) => void reviewed.push(l.id),
      });
    await run();
    expect(reviewed).toEqual([]); // one failure is only a warning
    await run();
    expect(reviewed).toEqual(["a"]); // second failure: under review
    await run();
    expect(reviewed).toEqual(["a"]); // still failing: do not open another issue
  });

  it("keeps going when one link's check throws", async () => {
    const { db } = testDb();
    const { fetchImpl } = fakeFetch({ [URL_A]: "error", [URL_B]: 200 });
    await runChecks({
      links: [
        { id: "a", url: URL_A },
        { id: "b", url: URL_B },
      ],
      db,
      fetchImpl,
      now: T,
      onReview: async () => {},
    });
    const rows = await getLinkRows(db);
    expect(rows.get(URL_A)?.consecutiveFail).toBe(1);
    expect(rows.get(URL_B)?.consecutiveFail).toBe(0);
  });

  it("does not let a failing issue report stop the run", async () => {
    const { db } = testDb();
    const { fetchImpl } = fakeFetch({ [URL_A]: 500, [URL_B]: 200 });
    const links = [
      { id: "a", url: URL_A },
      { id: "b", url: URL_B },
    ];
    const onReview = async () => {
      throw new Error("github down");
    };
    await runChecks({ links, db, fetchImpl, now: T, onReview });
    await runChecks({ links, db, fetchImpl, now: T, onReview });
    expect((await getLinkRows(db)).get(URL_B)?.consecutiveFail).toBe(0);
  });
});
