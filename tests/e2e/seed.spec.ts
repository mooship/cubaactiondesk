import { expect, test } from "@playwright/test";

// Seed for the Playwright planner and generator agents (.claude/agents). Generated tests start from here; keep it minimal.
test("seed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
});
