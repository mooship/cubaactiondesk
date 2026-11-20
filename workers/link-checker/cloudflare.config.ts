import { bindings, defineConfig, triggers } from "cf/config";

export default defineConfig({
  worker: {
    name: "cubaactiondesk-link-checker",
    compatibilityDate: "2026-10-28",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./index.ts",
    // Cron only. There is nothing to serve, so no public workers.dev address.
    workersDev: false,
    placement: { mode: "smart" },
    observability: {
      enabled: true,
      headSamplingRate: 1,
      redactQueryString: false,
      logs: { enabled: true, headSamplingRate: 1, invocationLogs: true, persist: true },
      traces: { enabled: true, headSamplingRate: 1, persist: true },
      issues: { enabled: true },
    },
    // Mondays at 03:00 UTC (05:00 in South Africa).
    triggers: [triggers.scheduled({ schedule: "0 3 * * 1" })],
    env: {
      // Same database as the site.
      DB: bindings.d1({ name: "cubaactiondesk", id: "5ae35ef9-3db5-4260-b1fa-3a7021e2b507" }),
    },
  },
});
