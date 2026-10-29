import { describe, expect, it } from "vitest";
import { findGluedInline } from "../../src/lib/html-check.ts";

const page = (body: string) => `<html><body>${body}</body></html>`;

describe("findGluedInline", () => {
  it("passes text with a space before and after an inline element", () => {
    expect(findGluedInline(page("<p>Code is <a href='/x'>MIT</a>, on <strong>GitHub</strong>.</p>"))).toEqual([]);
  });

  it("flags a word glued to the start of a link", () => {
    const found = findGluedInline(page("<p>Written content is licensed<a href='/x'>CC BY 4.0</a>.</p>"));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("licensed");
  });

  it("flags a link glued to the word after it", () => {
    expect(findGluedInline(page("<p>See <a href='/x'>this</a>page.</p>"))).toHaveLength(1);
  });

  it("flags punctuation glued to a link, as in 'corrections:<a>'", () => {
    expect(findGluedInline(page("<p>Questions or corrections:<a href='mailto:x'>x</a></p>"))).toHaveLength(1);
  });

  it("flags a stray space between a link and the comma or full stop after it", () => {
    const found = findGluedInline(page("<p><a href='/x'>Title</a>\n  , Publisher</p>"));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("Publisher");
    expect(findGluedInline(page("<p>See <em>this</em> . Done</p>"))).toHaveLength(1);
  });

  it("allows punctuation after a link and brackets around it", () => {
    expect(findGluedInline(page("<p>(<a href='/x'>find it</a>). Next, <em>this</em>.</p>"))).toEqual([]);
  });

  it("ignores scripts, styles and SVG, and anything outside the body", () => {
    const html =
      "<html><head><title>a<b>x</b></title></head><body><script>var s='a<a>b';</script>" +
      "<style>a<a{}</style><svg><text>a<a>b</a></text></svg><p>Fine.</p></body></html>";
    expect(findGluedInline(html)).toEqual([]);
  });
});
