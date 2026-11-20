import { bindings, defineConfig } from "cf/config";

// The e2e mode is the Playwright and Lighthouse build. It has its own local D1 database id (a made-up UUID, never
// created remotely) so a test run cannot touch the real database, and it has no custom domain.
const E2E_DATABASE_ID = "0b6f3d52-8d2e-4f6a-9a41-3c5e7d1f2a90";

export default defineConfig((ctx) => {
  const e2e = ctx.mode === "e2e";

  return {
    worker: {
      name: "cubaactiondesk",
      compatibilityDate: "2026-10-28",
      compatibilityFlags: ["nodejs_compat"],
      entrypoint: "./src/worker.ts",
      workersDev: false,
      previewUrls: true,
      placement: { mode: "smart" },
      observability: {
        enabled: true,
        headSamplingRate: 1,
        // Kept true on purpose: the no-JavaScript Action Desk puts the sender's name and town in the query string, and
        // the privacy notice promises we never see them. Do not turn this off without changing that notice.
        redactQueryString: true,
        logs: { enabled: true, headSamplingRate: 1, invocationLogs: true, persist: true },
        traces: { enabled: true, headSamplingRate: 1, persist: true },
        issues: { enabled: true },
      },
      assets: {
        htmlHandling: "drop-trailing-slash",
        notFoundHandling: "404-page",
        // The Worker runs first only where it has work to do: the server-rendered routes
        // (/api, /go, /act, /give) and the pages that negotiate Markdown (/learn/*, /act/*,
        // /give). Everything else, including the .md twins, is served straight from static
        // assets with no Worker CPU. A path missing from this list gets the static 404 page.
        runWorkerFirst: ["/api/*", "/go/*", "/act", "/act/*", "/give", "/learn/*", "!/learn/*.md", "!/act/*.md"],
      },
      // Moving to cubaactiondesk.org.za later means changing this domain and SITE_URL in src/lib/site.ts.
      domains: e2e ? [] : ["cuba.timothybrits.co.za"],
      env: {
        ASSETS: bindings.assets(),
        DB: bindings.d1({
          name: e2e ? "cubaactiondesk-e2e" : "cubaactiondesk",
          id: e2e ? E2E_DATABASE_ID : "5ae35ef9-3db5-4260-b1fa-3a7021e2b507",
        }),
        COUNTER_LIMITER: bindings.rateLimit({ namespace: "41001", simple: { limit: 10, period: 60 } }),
        EVENTS: bindings.analyticsEngineDataset({ name: "cuba_action_desk_events" }),
      },
    },
  };
});
