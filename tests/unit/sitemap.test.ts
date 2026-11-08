import { describe, expect, it } from "vitest";
import { sitemapPaths } from "../../src/lib/sitemap.ts";

describe("sitemapPaths", () => {
  it("returns the path of every <loc>, whatever origin it carries", () => {
    const xml =
      "<urlset><url><loc>https://cubaactiondesk.co.za/</loc></url>" +
      "<url><loc>http://localhost:8799/learn/the-laws</loc></url></urlset>";
    expect(sitemapPaths(xml)).toEqual(["/", "/learn/the-laws"]);
  });

  it("returns nothing for a sitemap without entries", () => {
    expect(sitemapPaths("<urlset></urlset>")).toEqual([]);
  });
});
