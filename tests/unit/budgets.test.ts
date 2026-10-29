import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { BUDGETS, checkPage, measurePage, referencedAssets } from "../../src/lib/budgets.ts";

const kb = (n: number) => n * 1024;
const noise = (bytes: number) => {
  // Incompressible text, so gzip size is close to the byte count.
  let out = "";
  let seed = 7;
  while (out.length < bytes) {
    seed = (seed * 1_103_515_245 + 12_345) & 0x7f_ff_ff_ff;
    out += seed.toString(36);
  }
  return out.slice(0, bytes);
};

const page = (head: string, body = "<main><h1>Hi</h1></main>") =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

describe("referencedAssets", () => {
  it("finds fonts in CSS and preload links, and first-party scripts, once each", () => {
    const html = page(
      '<link rel="preload" href="/_astro/body.abc.woff2" as="font">' +
        "<style>@font-face{src:url(/_astro/body.abc.woff2)}@font-face{src:url(/_astro/display.def.woff2)}</style>" +
        '<script type="module" src="/_astro/app.js"></script>' +
        '<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>',
    );
    const found = referencedAssets(html);
    expect(found.fonts.toSorted((a, b) => a.localeCompare(b))).toEqual([
      "/_astro/body.abc.woff2",
      "/_astro/display.def.woff2",
    ]);
    expect(found.scripts).toEqual(["/_astro/app.js"]);
  });
});

describe("measurePage", () => {
  const assets: Record<string, string> = {
    "/_astro/app.js": 'import"./shared.js";console.log("app");',
    "/_astro/shared.js": "export const x = 1;",
    "/_astro/body.woff2": noise(kb(27)),
    "/_astro/display.woff2": noise(kb(28)),
  };
  const read = (path: string) => (assets[path] === undefined ? undefined : Buffer.from(assets[path]!));

  it("sums HTML, inlined CSS, fonts and scripts, following script imports", () => {
    const html = page(
      "<style>body{margin:0}</style>" +
        '<link rel="preload" href="/_astro/body.woff2" as="font">' +
        "<style>@font-face{src:url(/_astro/display.woff2)}</style>" +
        '<script type="module" src="/_astro/app.js"></script>',
    );
    const m = measurePage(html, read);
    expect(m.htmlGz).toBe(gzipSync(html, { level: 9 }).length);
    expect(m.fontBytes).toBe(kb(27) + kb(28));
    expect(m.scripts.toSorted((a, b) => a.localeCompare(b))).toEqual(["/_astro/app.js", "/_astro/shared.js"]);
    expect(m.jsGz).toBeGreaterThan(0);
    expect(m.total).toBe(m.htmlGz + m.fontBytes + m.jsGz);
    expect(m.cssGz).toBeGreaterThan(0);
  });

  it("reports an asset it cannot read instead of ignoring it", () => {
    const m = measurePage(page('<script src="/_astro/missing.js"></script>'), read);
    expect(m.missing).toEqual(["/_astro/missing.js"]);
  });
});

describe("checkPage", () => {
  const ok = { htmlGz: kb(9), cssGz: kb(3), fontBytes: kb(55), jsGz: 0, scripts: [], missing: [], total: kb(64) };

  it("passes a page inside every budget", () => {
    expect(checkPage("learn", ok)).toEqual([]);
    expect(checkPage("action", { ...ok, jsGz: kb(3), scripts: ["/a.js"], total: kb(70) })).toEqual([]);
  });

  it("fails a Learn page over 100 KB, but not an Action Desk page at the same size", () => {
    const heavy = { ...ok, total: kb(110) };
    expect(checkPage("learn", heavy).join("\n")).toMatch(/total transfer/);
    expect(checkPage("action", heavy)).toEqual([]);
    expect(checkPage("action", { ...ok, total: kb(131) }).join("\n")).toMatch(/total transfer/);
  });

  it("fails HTML over 20 KB and CSS over 12 KB", () => {
    expect(checkPage("learn", { ...ok, htmlGz: kb(21) }).join("\n")).toMatch(/HTML/);
    expect(checkPage("learn", { ...ok, cssGz: kb(13) }).join("\n")).toMatch(/CSS/);
  });

  it("fails fonts over 60 KB", () => {
    expect(checkPage("learn", { ...ok, fontBytes: kb(61) }).join("\n")).toMatch(/fonts/);
  });

  it("allows no first-party JavaScript on Learn and Give pages", () => {
    expect(checkPage("learn", { ...ok, scripts: ["/a.js"], jsGz: 300 }).join("\n")).toMatch(/JavaScript/);
    expect(checkPage("give", { ...ok, scripts: ["/a.js"], jsGz: 300 }).join("\n")).toMatch(/JavaScript/);
  });

  it("caps Action Desk JavaScript at 8 KB", () => {
    expect(checkPage("action", { ...ok, scripts: ["/a.js"], jsGz: kb(9) }).join("\n")).toMatch(/JavaScript/);
  });

  it("fails when an asset a page uses cannot be found", () => {
    expect(checkPage("learn", { ...ok, missing: ["/_astro/x.js"] }).join("\n")).toMatch(/x\.js/);
  });

  it("holds the agreed budgets", () => {
    expect(BUDGETS.learnTotal).toBe(kb(100));
    expect(BUDGETS.actionTotal).toBe(kb(130));
    expect(BUDGETS.html).toBe(kb(20));
    expect(BUDGETS.css).toBe(kb(12));
    expect(BUDGETS.fonts).toBe(kb(60));
    expect(BUDGETS.actionJs).toBe(kb(8));
  });
});
