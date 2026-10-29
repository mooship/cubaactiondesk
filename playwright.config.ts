import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the built Worker (`wrangler dev`) with a local D1, so the server-rendered routes, the
 * Markdown negotiation and the headers are the real thing. Set E2E_BASE_URL to test a deployed preview instead.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8799";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    // Smoke tests at 360 px.
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } },
      // The desktop layout is tested in the desktop project.
      testIgnore: /layout/,
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: /a11y|layout/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "npm run build && npx wrangler d1 migrations apply DB --local && npx wrangler dev --port 8799 --ip 127.0.0.1",
        url: "http://127.0.0.1:8799/api/health",
        reuseExistingServer: true,
        timeout: 240_000,
      },
});
