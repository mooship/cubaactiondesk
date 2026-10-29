import { expect, test } from "@playwright/test";
import { ACTION_PATH, callerIp } from "./routes.ts";

const COUNTER = "/api/actions/ask-your-mp-un-vote/taken";

test.describe("counter endpoint", () => {
  test("POST increments, and the count only goes up", async ({ request }) => {
    const headers = { "cf-connecting-ip": callerIp() };
    const first = await request.post(COUNTER, { headers });
    expect(first.status()).toBe(200);
    const a = (await first.json()) as { slug: string; count: number };
    expect(a.slug).toBe("ask-your-mp-un-vote");
    const b = (await (await request.post(COUNTER, { headers })).json()) as { count: number };
    expect(b.count).toBe(a.count + 1);
    expect(first.headers()["cache-control"]).toBe("no-store");
  });

  test("rejects GET with 405 and an Allow header", async ({ request }) => {
    const res = await request.get(COUNTER);
    expect(res.status()).toBe(405);
    expect(res.headers().allow).toBe("POST");
  });

  test("404s an unknown or draft action and 400s a malformed one, without creating counters", async ({ request }) => {
    const headers = { "cf-connecting-ip": callerIp() };
    expect((await request.post("/api/actions/made-up/taken", { headers })).status()).toBe(404);
    expect((await request.post("/api/actions/write-us-embassy-pretoria/taken", { headers })).status()).toBe(404);
    expect((await request.post("/api/actions/Bad_Slug/taken", { headers })).status()).toBe(400);
  });

  test("is rate limited per caller: one IP is throttled, a different one is not", async ({ request }) => {
    const noisy = { "cf-connecting-ip": callerIp() };
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) statuses.push((await request.post(COUNTER, { headers: noisy })).status());
    expect(statuses).toContain(429);
    expect((await request.post(COUNTER, { headers: noisy })).headers()["retry-after"]).toBe("60");
    expect((await request.post(COUNTER, { headers: { "cf-connecting-ip": callerIp() } })).status()).toBe(200);
  });

  test("health reports the database", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: true });
    expect((await request.post("/api/health")).status()).toBe(405);
  });
});

test.describe("Markdown for AI readers", () => {
  test("Accept: text/markdown on an article returns its twin, with Vary", async ({ request }) => {
    const res = await request.get("/learn/what-is-the-blockade", { headers: { Accept: "text/markdown" } });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
    expect(res.headers().vary).toContain("Accept");
    const body = await res.text();
    expect(body).toMatch(/^---\ntitle: /);
    expect(body).toContain("canonical:");
    const twin = await (await request.get("/learn/what-is-the-blockade.md")).text();
    expect(body).toBe(twin);
  });

  test("a browser's Accept header still gets HTML", async ({ request }) => {
    const res = await request.get("/learn/what-is-the-blockade", {
      headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
    });
    expect(res.headers()["content-type"]).toContain("text/html");
  });

  test("actions and Give negotiate too", async ({ request }) => {
    for (const path of ["/act/letter-to-the-editor", "/give"]) {
      const res = await request.get(path, { headers: { Accept: "text/markdown" } });
      expect(res.headers()["content-type"], path).toBe("text/markdown; charset=utf-8");
    }
  });

  test("every page links its twin, and every twin is served as Markdown", async ({ page, request }) => {
    await page.goto("/learn/un-votes");
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
      "href",
      "/learn/un-votes.md",
    );
    const res = await request.get("/learn/un-votes.md");
    expect(res.headers()["content-type"]).toContain("text/markdown");
  });

  test("llms.txt and llms-full.txt are plain text and mention the articles", async ({ request }) => {
    const index = await request.get("/llms.txt");
    expect(index.headers()["content-type"]).toContain("text/plain");
    expect(await index.text()).toContain("/learn/un-votes.md");
    const full = await (await request.get("/llms-full.txt")).text();
    expect(full).toContain("# How the UN votes");
  });
});

test.describe("headers and policy", () => {
  const required = [
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "strict-transport-security",
  ];

  test("server-rendered, negotiated and static responses all carry the security headers", async ({ request }) => {
    for (const path of [ACTION_PATH, "/give", "/api/health", "/learn/un-votes", "/about", "/learn/un-votes.md"]) {
      const headers = (await request.get(path)).headers();
      for (const name of required) expect(headers[name], `${name} on ${path}`).toBeTruthy();
      expect(headers["x-content-type-options"]).toBe("nosniff");
    }
  });

  test("every HTML page has a CSP that blocks forms posting elsewhere and allows only the analytics beacon off-site", async ({
    request,
  }) => {
    for (const path of ["/", "/learn/un-votes", ACTION_PATH, "/give"]) {
      const res = await request.get(path);
      const html = await res.text();
      // Static pages carry the policy in a <meta>; server-rendered pages send it as a header.
      const csp =
        res.headers()["content-security-policy"] ??
        /<meta http-equiv="content-security-policy" content="([^"]*)"/.exec(html)?.[1] ??
        "";
      expect(csp, path).toContain("default-src 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("object-src 'none'");
      const origins = [...csp.matchAll(/https:\/\/[a-z.]+/g)].map((m) => m[0]);
      expect(new Set(origins)).toEqual(
        new Set(["https://static.cloudflareinsights.com", "https://cloudflareinsights.com"]),
      );
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    }
  });

  test("hashed assets are immutable and HTML revalidates", async ({ request, page }) => {
    await page.goto("/");
    const font = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((n) => n.endsWith(".woff2")),
    );
    expect(font).toBeTruthy();
    const asset = await request.get(font!);
    expect(asset.headers()["cache-control"]).toContain("immutable");
    expect((await request.get("/about")).headers()["cache-control"]).toContain("must-revalidate");
  });
});

test.describe("donate redirects (/go)", () => {
  test("only approved listings redirect; anything else is a 404, including URL-shaped input", async ({ request }) => {
    for (const path of [
      "/go/nobody",
      "/go/https:%2F%2Fevil.example",
      "/go/x?url=https://evil.example",
      "/go/%2F%2Fevil.example",
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
      expect(res.headers().location).toBeUndefined();
    }
  });

  test("an approved listing redirects with a 302 to its own donate page and is never cached", async ({ request }) => {
    const give = await (await request.get("/give.md")).text();
    const approved = [...give.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((h) => h !== "Before you donate");
    test.skip(approved.length === 0, "no approved listings yet");
    const html = await (await request.get("/give")).text();
    const id = /href="\/go\/([a-z0-9-]+)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    const res = await request.get(`/go/${id}`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toMatch(/^https:\/\//);
    expect(res.headers()["cache-control"]).toBe("no-store");
    expect(res.headers()["x-robots-tag"]).toBe("noindex");
  });
});

test("robots.txt welcomes crawlers, states content signals, and keeps only /api and /go out", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  expect(txt).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=yes");
  expect(txt).toContain("Disallow: /api/");
  expect(txt).toContain("Disallow: /go/");
  expect(txt).not.toMatch(/Disallow: \/(learn|act|give)?\s*$/m);
  expect(txt).toMatch(/Sitemap: https:\/\/.+\/sitemap-index\.xml/);
});

test("the feed and manifest are well formed", async ({ request }) => {
  const rss = await (await request.get("/rss.xml")).text();
  expect(rss).toMatch(/<rss version="2.0">/);
  expect((rss.match(/<item>/g) ?? []).length).toBeGreaterThan(5);
  const manifest = await (await request.get("/site.webmanifest")).json();
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
});
