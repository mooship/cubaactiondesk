import { describe, expect, it } from "vitest";
import { resolveOutbound } from "../../src/lib/outbound.ts";

const listings = [
  { id: "org-one", donateUrl: "https://one.example/donate" },
  { id: "org-two", donateUrl: "https://two.example/give" },
];

describe("resolveOutbound", () => {
  it("redirects to the donate URL of an approved listing", () => {
    expect(resolveOutbound(listings, "org-one")).toEqual({
      kind: "redirect",
      url: "https://one.example/donate",
    });
  });

  it("is missing for an id that is not an approved listing, so nothing arbitrary is ever redirected to", () => {
    for (const id of ["nope", "", "ORG-ONE", "https://evil.example", "//evil.example", "org-one/../x"]) {
      expect(resolveOutbound(listings, id)).toEqual({ kind: "missing" });
    }
  });

  it("is missing when there is no id", () => {
    expect(resolveOutbound(listings, undefined)).toEqual({ kind: "missing" });
  });
});
