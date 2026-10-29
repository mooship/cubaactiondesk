import { expect, test } from "@playwright/test";
import { MAILTO_MAX_LENGTH } from "../../src/lib/mailto.ts";
import { ACTION_PATH as ACTION, stubCounter } from "./routes.ts";

test.describe("with JavaScript", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("typing in a blank updates the message live, and unfilled blanks stay visible", async ({ page }) => {
    await page.goto(ACTION);
    const message = page.getByLabel("Your message");
    await expect(message).toHaveValue(/\{mp_name\}/);
    await page.getByLabel("Your name").fill("Thandi Nkosi");
    await page.getByLabel("Your town").fill("Gqeberha");
    await expect(message).toHaveValue(/I am a constituent in Gqeberha/);
    await expect(message).toHaveValue(/Thandi Nkosi/);
    await expect(page.getByText("Still to fill in:")).toContainText("{mp_name}");
  });

  test("Copy puts the message on the clipboard and says so", async ({ page }) => {
    await page.goto(ACTION);
    await page.getByLabel("Your name").fill("Sipho");
    await page.getByRole("button", { name: "Copy message" }).click();
    await expect(page.getByRole("button", { name: "Message copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Sipho");
    await expect(page.getByRole("status")).toHaveText("Message copied");
  });

  test("editing by hand is respected, and the template can be restored", async ({ page }) => {
    await page.goto(ACTION);
    const message = page.getByLabel("Your message");
    await message.fill("My own words only.");
    await page.getByLabel("Your town").fill("Durban");
    await expect(message).toHaveValue("My own words only.");
    await expect(page.getByText("You edited the message by hand")).toBeVisible();
    await page.getByRole("button", { name: "Start again from the template" }).click();
    await expect(message).toHaveValue(/Durban/);
  });

  test("the Email button is replaced by an explanation when the message is too long, and returns when it is shorter", async ({
    page,
  }) => {
    await page.goto(ACTION);
    const email = page.getByRole("link", { name: "Open in email" });
    await expect(email).toBeVisible();
    const message = page.getByLabel("Your message");
    await message.fill("word ".repeat(500));
    await expect(email).toBeHidden();
    await expect(page.locator("[data-email-note]")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("too long");
    await message.fill("Short.");
    await expect(email).toBeVisible();
  });

  test("the email link carries the subject and the message, encoded", async ({ page }) => {
    await page.goto(ACTION);
    await page.getByLabel("Your name").fill("Thandi & Sons");
    const href = (await page.getByRole("link", { name: "Open in email" }).getAttribute("href"))!;
    expect(href.startsWith("mailto:")).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get("subject")).toMatch(/constituent/i);
    expect(url.searchParams.get("body")).toContain("Thandi & Sons");
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
  });

  test("Mark as done counts once, shows the star state, and survives a reload without counting again", async ({
    page,
  }) => {
    await stubCounter(page, { count: 41 });
    await page.goto(ACTION);
    const done = page.locator("[data-done]");
    await expect(done).toHaveAttribute("aria-pressed", "false");
    let posts = 0;
    page.on("request", (req) => req.method() === "POST" && req.url().includes("/taken") && posts++);
    await done.click();
    await expect(done).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("41 people took this action.")).toBeVisible();
    await expect(page.getByText(/Next:/)).toBeVisible();
    expect(posts).toBe(1);

    await page.reload();
    await expect(page.getByRole("button", { name: /Done/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Done/ }).click();
    expect(posts).toBe(1);
  });

  test("a fast counter never shows a placeholder", async ({ page }) => {
    await stubCounter(page, { count: 7 });
    await page.goto(ACTION);
    await page.getByRole("button", { name: /Mark as done/ }).click();
    await expect(page.locator("[data-total-text]")).toHaveText("7 people took this action.");
    await expect(page.locator("[data-total-text].skeleton")).toHaveCount(0);
  });

  test("a slow counter shows a placeholder line that the count then replaces", async ({ page }) => {
    await stubCounter(page, { count: 7, delay: 700 });
    await page.goto(ACTION);
    const text = page.locator("[data-total-text]");
    await page.getByRole("button", { name: /Mark as done/ }).click();
    await expect(text).toHaveClass(/skeleton/);
    await expect(page.locator("[data-total]")).toHaveAttribute("aria-busy", "true");
    await expect(text).toHaveText("7 people took this action.");
    await expect(text).not.toHaveClass(/skeleton/);
    await expect(page.locator("[data-total]")).not.toHaveAttribute("aria-busy", /.*/);
  });

  test("a counter that fails leaves no placeholder behind", async ({ page }) => {
    await stubCounter(page, { fail: true });
    await page.goto(ACTION);
    await page.getByRole("button", { name: /Mark as done/ }).click();
    await expect(page.getByRole("button", { name: /Done/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-total-text]")).not.toHaveText("Counting…");
    await expect(page.locator("[data-total]")).not.toHaveAttribute("aria-busy", /.*/);
    await expect(page.locator("[data-total-text].skeleton")).toHaveCount(0);
  });

  test("the done star shows on the action card on the index and home page", async ({ page }) => {
    await stubCounter(page);
    await page.goto(ACTION);
    await page.getByRole("button", { name: /Mark as done/ }).click();
    await page.goto("/act");
    await expect(page.locator('[data-action-card="ask-your-mp-un-vote"] [data-done-mark]')).toBeVisible();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the template is plain text, the form fills the blanks, and Email and Update still work", async ({ page }) => {
    await page.goto(ACTION);
    await expect(page.getByRole("button", { name: "Update message" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy message" })).toBeHidden();

    await page.getByLabel("Your name").fill("Thandi Nkosi");
    await page.getByLabel("Your town").fill("Gqeberha");
    await page.getByRole("button", { name: "Update message" }).click();
    await expect(page).toHaveURL(/name=Thandi\+Nkosi|name=Thandi%20Nkosi/);
    await expect(page.getByLabel("Your message")).toHaveValue(/Thandi Nkosi/);
    await expect(page.getByRole("link", { name: "Open in email" })).toHaveAttribute("href", /mailto:.*Thandi/);
  });

  test("a page with personal values in its address is never cached", async ({ request }) => {
    const res = await request.get(`${ACTION}?name=Thandi`);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });
});

test("the Instagram action offers the card image to download, with alt text, and no broken image", async ({ page }) => {
  await page.goto("/act/post-instagram-explainer-card");
  const image = page.locator("figure img");
  await expect(image).toHaveAttribute("alt", /.+/);
  // The frame holds the image's shape while it downloads, so nothing jumps when it arrives.
  const frame = page.locator("[data-image-frame]");
  await expect(frame).toHaveClass(/skeleton/);
  const box = (await frame.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(1080 / 1350, 1);
  // The image is lazy, so give it time to scroll in and download.
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole("link", { name: "Download the image" })).toHaveAttribute("download", "");
});

test("the WhatsApp action offers a WhatsApp link that carries the article link", async ({ page }) => {
  await page.goto("/act/share-sa-and-cuba-in-60-seconds");
  const href = (await page.getByRole("link", { name: "Share on WhatsApp" }).getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/?text=")).toBe(true);
  expect(decodeURIComponent(href)).toContain("/learn/sa-and-cuba-in-60-seconds");
});

test("an unknown action is a 404 with the site's not-found page", async ({ request }) => {
  const res = await request.get("/act/made-up");
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain("We could not find that page");
});

test("the US Embassy action is a posted letter: print layout, and no email button", async ({ page }) => {
  await page.goto("/act/write-us-embassy-pretoria");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("US Embassy");
  await expect(page.getByRole("link", { name: "Open in email" })).toHaveCount(0);
  await expect(page.locator("[data-print]")).toBeAttached();
});
