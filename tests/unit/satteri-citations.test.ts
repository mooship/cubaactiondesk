import { describe, expect, it } from "vitest";
import { defineMdastPlugin, markdownToHtml } from "satteri";
import { citationMarkup, inlineWithCitations } from "../../src/lib/citations.ts";
import { satteriCitations, splitCitations } from "../../src/lib/satteri-citations.ts";

describe("citationMarkup", () => {
  it("is a numbered superscript link to the source list, labelled for screen readers", () => {
    expect(citationMarkup(2)).toBe('<sup><a href="#source-2" aria-label="Source 2" data-cite>2</a></sup>');
  });
});

describe("inlineWithCitations", () => {
  it("escapes HTML and replaces markers", () => {
    expect(inlineWithCitations("A <b>& B [[x]]", ["x"])).toBe(`A &lt;b&gt;&amp; B ${citationMarkup(1)}`);
  });

  it("leaves an unknown marker visible", () => {
    expect(inlineWithCitations("Claim [[nope]]", ["x"])).toBe("Claim [[nope]]");
  });
});

describe("splitCitations", () => {
  it("splits text around a marker into text, html, text", () => {
    expect(splitCitations("Before [[b]] after", ["a", "b"])).toEqual([
      { type: "text", value: "Before " },
      { type: "html", value: citationMarkup(2) },
      { type: "text", value: " after" },
    ]);
  });

  it("handles several markers, including back to back", () => {
    expect(splitCitations("[[a]][[b]] and [[a]]", ["a", "b"]).map((p) => p.type)).toEqual([
      "html",
      "html",
      "text",
      "html",
    ]);
  });

  it("returns the text unchanged when there is nothing to replace", () => {
    expect(splitCitations("No markers here.", ["a"])).toEqual([{ type: "text", value: "No markers here." }]);
  });

  it("leaves a marker whose source is not listed, so the content check can catch it", () => {
    expect(splitCitations("Fact [[ghost]].", ["a"])).toEqual([{ type: "text", value: "Fact [[ghost]]." }]);
  });
});

/** Runs real Markdown through the real Sätteri pipeline, with frontmatter supplied as Astro would. */
function render(markdown: string, sources: string[]): string {
  const withFrontmatter = defineMdastPlugin({
    name: "test-frontmatter",
    before(_root, ctx) {
      (ctx.data as Record<string, unknown>).astro = { frontmatter: { sources } };
    },
  });
  return markdownToHtml(markdown, { mdastPlugins: [withFrontmatter, satteriCitations] }).html;
}

describe("satteriCitations (end to end)", () => {
  it("numbers markers by position in the article's sources list", () => {
    const html = render("Fact one [[b]]. Fact two [[a]].", ["a", "b"]);
    expect(html).toContain(`Fact one ${citationMarkup(2)}.`);
    expect(html).toContain(`Fact two ${citationMarkup(1)}.`);
  });

  it("reaches markers inside emphasis and links", () => {
    const html = render("*Fact [[a]]* and [a link [[b]]](/x)", ["a", "b"]);
    expect(html).toContain(citationMarkup(1));
    expect(html).toContain(citationMarkup(2));
  });

  it("does not touch inline code or fenced code", () => {
    const html = render("Use `[[a]]` here.\n\n```\n[[a]]\n```", ["a"]);
    expect(html).not.toContain("<sup>");
    expect(html).toContain("[[a]]");
  });

  it("leaves a marker for an unlisted source visible", () => {
    expect(render("Fact [[ghost]].", ["a"])).toContain("[[ghost]]");
  });

  it("does nothing for a page with no sources", () => {
    const html = markdownToHtml("Fact [[a]].", { mdastPlugins: [satteriCitations] }).html;
    expect(html).toContain("[[a]]");
  });
});
