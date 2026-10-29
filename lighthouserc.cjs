// Lighthouse CI, mobile profile (Lighthouse's default: simulated slow 4G, 4x CPU slowdown, mid-range phone).
//
// `npm run lhci` starts the built Worker locally with `wrangler dev` and measures six pages, including the
// server-rendered Action Desk and Give. Each run is repeated three times and the median is asserted.
// Set LHCI_BASE_URL to measure a deployed preview instead (no local server is started).
//
// Accessibility, best practices and SEO must be exactly 100: they do not vary from run to run. Performance only has
// to stay at 95 or above. Its score moves between 97 and 100 on the same page from one run to the next, because
// total blocking time depends on the CPU of the machine, so a hard 100 would fail on noise and not on a regression.
const external = process.env.LHCI_BASE_URL?.replace(/\/$/, "");
const base = external ?? "http://127.0.0.1:8799";
const pages = ["/", "/learn", "/learn/un-votes", "/act", "/act/ask-your-mp-un-vote", "/give"];

module.exports = {
  ci: {
    collect: {
      ...(external
        ? {}
        : {
            startServerCommand: "npx wrangler dev --port 8799 --ip 127.0.0.1",
            startServerReadyPattern: "Ready on",
            startServerReadyTimeout: 90000,
          }),
      url: pages.map((path) => base + path),
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        // Lighthouse's robots.txt check does not know the `Content-Signal` directive, which states that AI
        // crawlers may use the site (search=yes, ai-input=yes, ai-train=yes), and fails the whole file for it.
        // The directive is deliberate, so this audit is skipped. Everything else in SEO is still scored.
        skipAudits: ["robots-txt"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 1, aggregationMethod: "median" }],
        "categories:best-practices": ["error", { minScore: 1, aggregationMethod: "median" }],
        "categories:seo": ["error", { minScore: 1, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.02, aggregationMethod: "median" }],
        // Google's "good" threshold. The aim on the deployed site is 1.5 s, which is a launch-checklist measurement.
        "largest-contentful-paint": ["error", { maxNumericValue: 2500, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/mobile" },
  },
};
