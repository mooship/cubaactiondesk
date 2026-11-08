import { describe, expect, it } from "vitest";
import { articleReadingMinutes } from "../../src/lib/text.ts";

describe("articleReadingMinutes", () => {
  it("counts the opening answer together with the body", () => {
    const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
    expect(articleReadingMinutes(words(150), words(100))).toBe(2);
  });

  it("reads the answer alone when there is no body, and never goes below a minute", () => {
    expect(articleReadingMinutes("A short answer.", undefined)).toBe(1);
  });
});
