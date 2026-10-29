import { describe, expect, it } from "vitest";
import { absoluteUrl, isCurrent, normalizePath, pageTitle } from "../../src/lib/site.ts";

describe("normalizePath", () => {
  it.each([
    ["/", "/"],
    ["", "/"],
    ["/index.html", "/"],
    ["/act", "/act"],
    ["/act/", "/act"],
    ["/act.html", "/act"],
    ["/learn/what-is-the-blockade.html", "/learn/what-is-the-blockade"],
    ["/learn/index.html", "/learn"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});

describe("isCurrent", () => {
  it("matches the section and anything beneath it", () => {
    expect(isCurrent("/act", "/act")).toBe(true);
    expect(isCurrent("/act/ask-your-mp", "/act")).toBe(true);
    expect(isCurrent("/act.html", "/act")).toBe(true);
  });

  it("does not match a different section or a shared prefix", () => {
    expect(isCurrent("/actually", "/act")).toBe(false);
    expect(isCurrent("/learn", "/act")).toBe(false);
    expect(isCurrent("/", "/act")).toBe(false);
  });
});

describe("pageTitle", () => {
  it("appends the site name", () => {
    expect(pageTitle("Learn")).toBe("Learn, Cuba Action Desk SA");
  });

  it("uses the bare name when there is no title", () => {
    expect(pageTitle()).toBe("Cuba Action Desk SA");
  });
});

describe("absoluteUrl", () => {
  it("resolves against the public origin", () => {
    expect(absoluteUrl("/learn/x", "https://example.org")).toBe("https://example.org/learn/x");
    expect(absoluteUrl("/", new URL("https://example.org/ignored"))).toBe("https://example.org/");
  });
});
