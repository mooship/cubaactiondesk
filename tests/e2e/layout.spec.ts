import { expect, test } from "@playwright/test";
import { ACTION_PATH } from "./routes.ts";

// Desktop layout (1024 px and up): top bar, two-column Action Desk, single-column articles.

test("on desktop the nav moves to the top bar beside the logo", async ({ page }) => {
  await page.goto("/");
  const nav = (await page.getByRole("navigation", { name: "Main" }).boundingBox())!;
  const logo = (await page.getByRole("link", { name: /Cuba Action Desk SA, home/ }).boundingBox())!;
  expect(nav.y).toBeLessThan(120);
  expect(nav.x).toBeGreaterThan(logo.x + logo.width);
});

test("the Action Desk is two columns with a sticky send panel", async ({ page }) => {
  await page.goto(ACTION_PATH);
  const compose = (await page.getByRole("heading", { name: "1. Fill in the blanks" }).boundingBox())!;
  const send = (await page.getByRole("heading", { name: "3. Send it" }).boundingBox())!;
  expect(send.x).toBeGreaterThan(compose.x + 300);
  const position = await page.getByRole("complementary").evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe("sticky");
});

test("articles stay a readable single column, under 70 characters wide", async ({ page }) => {
  await page.goto("/learn/what-is-the-blockade");
  const width = await page
    .locator("article")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(900);
});

test("letters print on their own, without the page chrome", async ({ page }) => {
  await page.goto(`${ACTION_PATH}?name=Thandi&town=Gqeberha`);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.locator("[data-print]")).toBeVisible();
  await expect(page.locator("[data-print]")).toContainText("Thandi");
  await expect(page.getByRole("button", { name: "Update message" })).toBeHidden();
});
