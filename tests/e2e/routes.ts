import type { APIRequestContext, Page } from "@playwright/test";

/** The action every Action Desk spec drives: it has two blanks, an email target and a counter. */
export const ACTION_PATH = "/act/ask-your-mp-un-vote";

/** A path that is not a page, for checking the 404 page itself. */
export const MISSING_PATH = "/404-does-not-exist";

/** Every page in the sitemap, as site paths. The sitemap lists server-rendered pages too. */
export async function sitePaths(request: APIRequestContext): Promise<string[]> {
  const xml = await (await request.get("/sitemap-0.xml")).text();
  const paths = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]!);
  return [...new Set(paths)];
}

/** Every sitemap page plus the 404 page, for specs that visit the whole site. */
export async function pagesToVisit(request: APIRequestContext): Promise<string[]> {
  return [...(await sitePaths(request)), MISSING_PATH];
}

/** How many pixels the page is wider than the window; anything above zero scrolls sideways. */
export const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Answers the "I did this" counter without touching the database. */
export const stubCounter = (page: Page, count = 1) =>
  page.route("**/api/actions/*/taken", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slug: "x", count }) }),
  );

/** A distinct caller IP per test, so the counter's rate limiter never couples tests together. */
export const callerIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

/**
 * True when the suite runs against a deployed site. Cloudflare's edge rejects a forged `cf-connecting-ip`
 * and the counter writes to the live database, so the tests that need either are for the local Worker only.
 */
export const isDeployed = Boolean(process.env.E2E_BASE_URL);
