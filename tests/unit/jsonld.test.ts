import { describe, expect, it } from "vitest";
import { articleLd, breadcrumbList } from "../../src/lib/jsonld.ts";

const origin = "https://example.org";

describe("breadcrumbList", () => {
  it("numbers items from 1 and uses absolute URLs", () => {
    const ld = breadcrumbList(
      [
        { name: "Home", path: "/" },
        { name: "Learn", path: "/learn" },
      ],
      origin,
    );
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://example.org/" },
      { "@type": "ListItem", position: 2, name: "Learn", item: "https://example.org/learn" },
    ]);
  });
});

describe("articleLd", () => {
  const ld = articleLd(
    {
      title: "What it is",
      description: "A summary.",
      path: "/learn/what-it-is",
      published: new Date("2026-10-01T00:00:00Z"),
      modified: new Date("2026-10-29T12:00:00Z"),
      citations: ["https://example.org/a", "https://example.org/b"],
    },
    origin,
  );

  it("has the fields search and AI systems rely on", () => {
    expect(ld["@type"]).toBe("Article");
    expect(ld.url).toBe("https://example.org/learn/what-it-is");
    expect(ld.datePublished).toBe("2026-10-01");
    expect(ld.dateModified).toBe("2026-10-29");
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.inLanguage).toBe("en-ZA");
  });

  it("lists the cited source URLs", () => {
    expect(ld.citation).toEqual(["https://example.org/a", "https://example.org/b"]);
  });

  it("round-trips through JSON", () => {
    // The point of this test is JSON serialisation, so structuredClone would test the wrong thing.
    // eslint-disable-next-line unicorn/prefer-structured-clone
    expect(JSON.parse(JSON.stringify(ld))).toEqual(ld);
  });
});
