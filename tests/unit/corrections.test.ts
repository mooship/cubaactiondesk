import { describe, expect, it } from "vitest";
import { CORRECTIONS } from "../../src/lib/corrections.ts";

describe("CORRECTIONS", () => {
  it("is newest first, with real ISO dates", () => {
    for (const c of CORRECTIONS) expect(Number.isNaN(Date.parse(`${c.date}T00:00:00Z`))).toBe(false);
    const dates = CORRECTIONS.map((c) => c.date);
    expect(dates).toEqual(dates.toSorted().toReversed());
  });

  it("points every entry at a site path and says what changed", () => {
    for (const c of CORRECTIONS) {
      expect(c.page).toMatch(/^\/[a-z0-9/-]*$/);
      expect(c.was.length).toBeGreaterThan(0);
      expect(c.now.length).toBeGreaterThan(0);
    }
  });
});
