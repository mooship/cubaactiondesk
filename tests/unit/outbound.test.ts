import { describe, expect, it } from "vitest";
import { resolveOutbound } from "../../src/lib/outbound.ts";

const listings = [
  { id: "org-one", donateUrl: "https://one.example/donate" },
  { id: "org-two", donateUrl: "https://two.example/give" },
];

describe("resolveOutbound", () => {
  it("redirects to the donate URL of an approved listing", () => {
    expect(resolveOutbound(listings, new Map(), "org-one")).toEqual({
      kind: "redirect",
      url: "https://one.example/donate",
    });
  });

  it("is missing for an id that is not an approved listing, so nothing arbitrary is ever redirected to", () => {
    for (const id of ["nope", "", "ORG-ONE", "https://evil.example", "//evil.example", "org-one/../x"]) {
      expect(resolveOutbound(listings, new Map(), id)).toEqual({ kind: "missing" });
    }
  });

  it("is missing when there is no id", () => {
    expect(resolveOutbound(listings, new Map(), undefined)).toEqual({ kind: "missing" });
  });

  it("sends the visitor back to the Give page while the link is under review", () => {
    const rows = new Map([["https://one.example/donate", { consecutiveFail: 2 }]]);
    expect(resolveOutbound(listings, rows, "org-one")).toEqual({ kind: "review" });
  });

  it("still redirects after a single failed check", () => {
    const rows = new Map([["https://one.example/donate", { consecutiveFail: 1 }]]);
    expect(resolveOutbound(listings, rows, "org-one").kind).toBe("redirect");
  });
});
