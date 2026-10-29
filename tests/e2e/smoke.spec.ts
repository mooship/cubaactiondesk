import { expect, test } from "@playwright/test";
import { findGluedInline } from "../../src/lib/html-check.ts";
import { ACTION_PATH, horizontalOverflow, MISSING_PATH, pagesToVisit, sitePaths } from "./routes.ts";

test("every page loads with no console errors, no failed requests, and no horizontal scroll", async ({
  page,
  request,
}) => {
  const paths = await pagesToVisit(request);
  expect(paths.length).toBeGreaterThan(10);

  const problems: string[] = [];
  page.on("console", (msg) => {
    // The browser logs a failed-load error for the 404 page itself; that is the point of the page.
    const isMissingPage = new URL(msg.location().url || "http://x").pathname === MISSING_PATH;
    if (msg.type() === "error" && !isMissingPage) problems.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (req) => problems.push(`failed: ${req.url()}`));
  page.on("response", (res) => {
    const url = new URL(res.url());
    if (res.status() >= 400 && url.pathname !== MISSING_PATH) problems.push(`${res.status()} ${url.pathname}`);
  });

  for (const path of paths) {
    await page.goto(path);
    expect(await horizontalOverflow(page), `horizontal scroll on ${path}`).toBeLessThanOrEqual(0);
    await expect(page.locator("h1")).toHaveCount(1);
  }
  expect(problems).toEqual([]);
});

test("no page has a missing or stray space around a link, including the server-rendered pages", async ({ request }) => {
  const problems: string[] = [];
  for (const path of await sitePaths(request)) {
    const html = await (await request.get(path)).text();
    for (const found of findGluedInline(html)) problems.push(`${path}: ${found}`);
  }
  expect(problems).toEqual([]);
});

test("no page is rewritten by Cloudflare: email addresses stay as written and no Rocket Loader markup appears", async ({
  request,
}) => {
  // Email Address Obfuscation breaks mailto links without JavaScript, and Rocket Loader fights the CSP.
  // They are zone settings, so this guards the deployed site against someone else's change.
  const problems: string[] = [];
  for (const path of await sitePaths(request)) {
    const html = await (await request.get(path)).text();
    if (/email-protection|\[email&#160;protected\]|\[email protected\]/.test(html))
      problems.push(`${path}: email obfuscated`);
    if (/rocket-loader|data-cf-settings/.test(html)) problems.push(`${path}: Rocket Loader markup`);
  }
  expect(problems).toEqual([]);
});

test("the skip link is the first focusable element and moves focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("the bottom nav is on screen, 56px tall, has four labelled links, and marks the current page", async ({
  page,
}) => {
  await page.goto("/learn");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.getByRole("link", { name: "Learn" })).toHaveAttribute("aria-current", "page");
  const box = await nav.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y + box!.height).toBeCloseTo(viewport.height, 0);
  expect(box!.height).toBeGreaterThanOrEqual(56);
});

test("nav targets are at least 44 by 44 pixels", async ({ page }) => {
  await page.goto("/");
  for (const link of await page.getByRole("navigation", { name: "Main" }).getByRole("link").all()) {
    const box = (await link.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("a focused field is never hidden behind the fixed bottom nav (WCAG 2.4.11)", async ({ page }) => {
  await page.goto(ACTION_PATH);
  await page.locator("#f-town").focus();
  const field = (await page.locator("#f-town").boundingBox())!;
  const nav = (await page.getByRole("navigation", { name: "Main" }).boundingBox())!;
  expect(field.y + field.height).toBeLessThanOrEqual(nav.y);
});
