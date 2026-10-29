import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ACTION_PATH, horizontalOverflow, pagesToVisit, stubCounter } from "./routes.ts";

// Axe on every route, light and dark, zero violations. Automated checks catch only part
// of real barriers; the manual testing in docs/LAUNCH-CHECKLIST.md is a launch requirement as well.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const scheme of ["light", "dark"] as const) {
  test(`axe finds no violations on any page (${scheme} mode)`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    const failures: string[] = [];
    for (const path of await pagesToVisit(request)) {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of violations) {
        failures.push(
          `${path} [${v.id}] ${v.help}: ${v.nodes
            .slice(0, 2)
            .map((n) => n.target.join(" "))
            .join(" | ")}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });
}

test("axe also passes on an action page with the blanks filled in and an error-state message", async ({ page }) => {
  await page.goto(`${ACTION_PATH}?name=Thandi&town=Gqeberha`);
  await page.getByLabel("Your message").fill("word ".repeat(500));
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("forced colours keeps text, buttons and focus visible", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(ACTION_PATH);
  await expect(page.getByRole("link", { name: "Open in email" })).toBeVisible();
  await page.getByLabel("Your name").focus();
  const outline = await page.getByLabel("Your name").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test("with reduced motion the done star does not animate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stubCounter(page);
  await page.goto(ACTION_PATH);
  await page.getByRole("button", { name: /Mark as done/ }).click();
  const animation = await page
    .locator("[data-done] span")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test("text spacing overrides do not break the layout (WCAG 1.4.12)", async ({ page }) => {
  await page.goto(ACTION_PATH);
  // A constructable stylesheet is allowed by our CSP; an inline <style> element would be blocked.
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }",
    );
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("at 400% zoom (320 CSS pixels wide) nothing needs horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/", "/learn/un-votes", ACTION_PATH, "/give"]) {
    await page.goto(path);
    expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
  }
});
