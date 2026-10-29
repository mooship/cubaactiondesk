import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSiteContent } from "../../src/lib/content-files.ts";
import { linkList } from "../../src/lib/link-list.ts";

const root = join(import.meta.dirname, "..", "..");

describe("linkList", () => {
  const listing = (id: string, approved: boolean, donateUrl = `https://${id}.example/donate`) =>
    ({ id, data: { approved, donateUrl } }) as never;

  it("includes approved listings only, sorted by id", () => {
    const links = linkList({
      fundraisers: [listing("b-org", true), listing("a-org", true), listing("candidate", false)],
    });
    expect(links).toEqual([
      { id: "a-org", url: "https://a-org.example/donate" },
      { id: "b-org", url: "https://b-org.example/donate" },
    ]);
  });

  it("is empty when nothing is approved", () => {
    expect(linkList({ fundraisers: [listing("candidate", false)] })).toEqual([]);
  });
});

describe("links.generated.json", () => {
  it("matches the approved fundraisers in src/content, so the weekly checker tests the right links", () => {
    const { set } = loadSiteContent();
    const onDisk = JSON.parse(readFileSync(join(root, "workers", "link-checker", "links.generated.json"), "utf8"));
    expect(onDisk).toEqual(linkList(set));
  });
});
