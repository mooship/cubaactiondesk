import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the built Worker (`wrangler dev`) with a local D1, so the server-rendered routes, the
 * Markdown negotiation and the headers are the real thing. Set E2E_BASE_URL to test a deployed preview instead,
 * or E2E_PORT to run beside another server.
 */
const port = process.env.E2E_PORT ?? "8799";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

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
        command: `npm run build && npx wrangler d1 migrations apply DB --local && npx wrangler dev --port ${port} --ip 127.0.0.1`,
        url: `http://127.0.0.1:${port}/api/health`,
        // A built server can be stale or belong to another run, so one already on the port is an error.
        reuseExistingServer: false,
        timeout: 240_000,
      },
});
