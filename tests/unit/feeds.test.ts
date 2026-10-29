import { describe, expect, it } from "vitest";
import { rssFeed } from "../../src/lib/rss.ts";
import { parseFeed } from "../helpers/rss-parse.ts";
import { robotsTxt } from "../../src/lib/robots.ts";

const origin = "https://example.org";

describe("robotsTxt", () => {
  const txt = robotsTxt(origin);

  it("allows every crawler, including AI crawlers, and states our content signals", () => {
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Allow: /");
    expect(txt).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=yes");
  });

  it("keeps crawlers out of the API and the click-logging redirects only", () => {
    const disallowed = txt.split("\n").filter((l) => l.startsWith("Disallow:"));
    expect(disallowed).toEqual(["Disallow: /api/", "Disallow: /go/"]);
  });

  it("points at the sitemap with an absolute URL", () => {
    expect(txt).toContain("Sitemap: https://example.org/sitemap-index.xml");
  });
});

describe("rssFeed", () => {
  const xml = rssFeed(
    [
      {
        title: "An article & more",
        url: "https://example.org/learn/a",
        summary: "About <things>.",
        date: new Date("2026-10-29T10:00:00Z"),
      },
      {
        title: "Older",
        url: "https://example.org/act/b",
        summary: "Older item.",
        date: new Date("2026-10-01T00:00:00Z"),
      },
    ],
    origin,
  );

  it("is a valid RSS 2.0 document with the channel details", () => {
    const feed = parseFeed(xml);
    expect(feed.version).toBe("2.0");
    expect(feed.title).toBe("Cuba Action Desk SA");
    expect(feed.link).toBe("https://example.org/");
  });

  it("escapes XML special characters", () => {
    expect(xml).toContain("An article &amp; more");
    expect(xml).toContain("About &lt;things&gt;.");
    expect(xml).not.toContain("<things>");
  });

  it("lists newest first with RFC 822 dates and stable GUIDs", () => {
    const items = parseFeed(xml).items;
    expect(items.map((i) => i.title)).toEqual(["An article &amp; more", "Older"]);
    expect(items[0]!.pubDate).toBe("Thu, 29 Oct 2026 10:00:00 GMT");
    expect(items[0]!.guid).toBe("https://example.org/learn/a");
  });
});
