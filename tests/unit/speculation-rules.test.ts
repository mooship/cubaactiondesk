import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { speculationRulesHash, speculationRulesJson } from "../../src/lib/speculation-rules.ts";

describe("speculation rules", () => {
  it("never prerenders the routes that log or change state, or the Markdown twins", () => {
    const text = speculationRulesJson;
    for (const excluded of ["/go/*", "/api/*", "/*.md"]) {
      expect(text).toContain(`{"not":{"href_matches":"${excluded}"}}`);
    }
  });

  it("publishes the SHA-256 hash of exactly the JSON the page inlines", () => {
    const expected = createHash("sha256").update(speculationRulesJson).digest("base64");
    expect(speculationRulesHash).toBe(`sha256-${expected}`);
  });
});
