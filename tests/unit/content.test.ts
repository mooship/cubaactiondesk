import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getApprovedFundraisers,
  getLiveAction,
  getLiveActions,
  getLiveArticles,
  getRelatedLiveActions,
  getSourcesInOrder,
  getTargets,
  targetName,
} from "../../src/lib/content.ts";
import { collections } from "../helpers/fake-content.ts";

vi.mock("astro:content", () => import("../helpers/fake-content.ts"));

const action = (id: string, title: string, status: string, featured = false) => ({
  id,
  data: { title, status, featured },
});

beforeEach(() => {
  collections.clear();
  collections.set("actions", [
    action("zebra", "Zebra letter", "live"),
    action("draft", "A draft", "draft"),
    action("alpha", "Alpha letter", "live"),
    action("star", "Zulu featured", "live", true),
  ]);
});

describe("getLiveActions", () => {
  it("drops drafts and puts featured actions first, then sorts by title", async () => {
    expect((await getLiveActions()).map((a) => a.id)).toEqual(["star", "alpha", "zebra"]);
  });
});

describe("getLiveAction", () => {
  it("returns a live action", async () => {
    expect((await getLiveAction("alpha"))?.id).toBe("alpha");
  });

  it("hides a draft and an unknown slug", async () => {
    expect(await getLiveAction("draft")).toBeUndefined();
    expect(await getLiveAction("nope")).toBeUndefined();
  });
});

describe("getRelatedLiveActions", () => {
  it("keeps the article's order and skips actions that are not live", async () => {
    const related = await getRelatedLiveActions(["zebra", "draft", "missing", "alpha"]);
    expect(related.map((a) => a.id)).toEqual(["zebra", "alpha"]);
  });
});

describe("getLiveArticles", () => {
  it("sorts newest first and breaks ties by id", async () => {
    const article = (id: string, published: string, status = "live") => ({
      id,
      data: { status, published: new Date(published) },
    });
    collections.set("articles", [
      article("old", "2026-01-01"),
      article("b-new", "2026-10-01"),
      article("a-new", "2026-10-01"),
      article("hidden", "2026-11-01", "draft"),
    ]);
    expect((await getLiveArticles()).map((a) => a.id)).toEqual(["a-new", "b-new", "old"]);
  });
});

describe("getApprovedFundraisers", () => {
  it("lists only approved organisations, by name", async () => {
    collections.set("fundraisers", [
      { id: "z", data: { name: "Zeta Aid", approved: true } },
      { id: "c", data: { name: "Candidate", approved: false } },
      { id: "a", data: { name: "Alpha Aid", approved: true } },
    ]);
    expect((await getApprovedFundraisers()).map((f) => f.id)).toEqual(["a", "z"]);
  });
});

describe("targets", () => {
  beforeEach(() => {
    collections.set("targets", [{ id: "dirco", data: { name: "DIRCO" } }]);
  });

  it("maps targets by id", async () => {
    const targets = await getTargets();
    expect([...targets.keys()]).toEqual(["dirco"]);
  });

  it("names a target, or falls back to its id when it is missing", async () => {
    const targets = await getTargets();
    expect(targetName(targets, "dirco")).toBe("DIRCO");
    expect(targetName(targets, "unknown-office")).toBe("unknown-office");
  });
});

describe("getSourcesInOrder", () => {
  beforeEach(() => {
    collections.set("sources", [
      { id: "a", data: { title: "A" } },
      { id: "b", data: { title: "B" } },
    ]);
  });

  it("returns sources in the order asked for", async () => {
    expect((await getSourcesInOrder(["b", "a"])).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("fails loudly on an unknown source id", async () => {
    await expect(getSourcesInOrder(["a", "ghost"])).rejects.toThrow('Unknown source "ghost"');
  });
});
