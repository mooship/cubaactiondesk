import { describe, expect, it } from "vitest";
import { NEGOTIABLE, wantsMarkdown } from "../../src/lib/negotiate.ts";

describe("wantsMarkdown", () => {
  it("is true for an explicit text/markdown request", () => {
    expect(wantsMarkdown("text/markdown")).toBe(true);
  });

  it("is false for browsers, wildcards and a missing header", () => {
    expect(wantsMarkdown("text/html,application/xhtml+xml,*/*;q=0.8")).toBe(false);
    expect(wantsMarkdown("*/*")).toBe(false);
    expect(wantsMarkdown(null)).toBe(false);
    expect(wantsMarkdown("")).toBe(false);
  });

  it("prefers markdown only when it ranks at least as high as html", () => {
    expect(wantsMarkdown("text/markdown, text/html;q=0.5")).toBe(true);
    expect(wantsMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
    expect(wantsMarkdown("text/markdown;q=0.9, text/html;q=0.9")).toBe(true);
  });

  it("honours q=0 as a refusal", () => {
    expect(wantsMarkdown("text/markdown;q=0")).toBe(false);
  });

  it("is case-insensitive and tolerant of spacing and bad q values", () => {
    expect(wantsMarkdown("Text/Markdown ; q=1")).toBe(true);
    expect(wantsMarkdown("text/markdown;q=abc")).toBe(true);
  });
});

describe("NEGOTIABLE", () => {
  it.each(["/learn/what-is-the-blockade", "/act/ask-your-mp-un-vote", "/give"])("matches %s", (path) => {
    expect(NEGOTIABLE.test(path)).toBe(true);
  });

  it.each([
    "/",
    "/learn",
    "/act",
    "/learn/what-is-the-blockade.md",
    "/give.md",
    "/give/how-we-vet",
    "/api/health",
    "/go/some-org",
  ])("does not match %s", (path) => {
    expect(NEGOTIABLE.test(path)).toBe(false);
  });
});
