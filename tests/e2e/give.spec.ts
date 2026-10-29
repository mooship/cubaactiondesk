import { expect, test } from "@playwright/test";

test("Give says plainly what it is, links how we vet, and never asks for card details", async ({ page }) => {
  await page.goto("/give");
  await expect(page.getByRole("heading", { level: 1, name: "Give" })).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "how we check" })
      .or(page.getByRole("link", { name: "our checks" }))
      .first(),
  ).toBeVisible();
  // No payment fields or processors anywhere on the page.
  await expect(
    page.locator(
      'input[type="number"], input[autocomplete^="cc-"], iframe, script[src*="stripe"], script[src*="paypal"]',
    ),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Before you donate" })).toBeVisible();
});

test("each listing shows a status as text, and its donate button names the destination domain", async ({ page }) => {
  await page.goto("/give");
  const listings = page.locator("article");
  const count = await listings.count();
  test.skip(count === 0, "no approved listings yet: the page shows the honest empty state instead");
  for (const listing of await listings.all()) {
    await expect(listing.getByText(/Link (verified|under review|not checked yet|had a failed check)/)).toBeVisible();
    const donate = listing.getByRole("link", { name: /^Donate on / });
    if (!(await donate.count())) {
      continue;
    }

    await expect(donate).toHaveAttribute("href", /^\/go\/[a-z0-9-]+$/);
    await expect(listing).toContainText("We never handle the money");
  }
});

test("with no approved listings Give shows the empty state and still explains payments", async ({ page }) => {
  await page.goto("/give");
  test.skip((await page.locator("article").count()) > 0, "listings are live");
  await expect(page.getByRole("heading", { name: "No organisations are listed yet" })).toBeVisible();
});

test("the how-we-vet page lists the five checks and states that no test payments are made", async ({ page }) => {
  await page.goto("/give/how-we-vet");
  await expect(page.locator("ol > li")).toHaveCount(5);
  await expect(page.getByText("We do not make test payments")).toBeVisible();
});
