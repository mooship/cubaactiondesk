import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import siteConfig from "../../cloudflare.config.ts";
import { NEGOTIABLE } from "../../src/lib/negotiate.ts";
import { siteUrl } from "../../src/lib/site.ts";
import { RETRY_AFTER_SECONDS } from "../../src/lib/taken.ts";

// Values that two files must agree on, and that nothing else would notice drifting apart. The package.json scripts
// cannot import cloudflare.config.ts, so these tests are what keep the two in step with it and with the code.

interface ResolvedConfig {
  worker: {
    compatibilityDate: string;
    domains?: string[];
    env: Record<string, { type: string; id?: string; name?: string; simple?: { limit: number; period: number } }>;
    assets?: { runWorkerFirst?: string[] };
  };
}

type ConfigFn = (ctx: { mode: string | undefined; isPreview: boolean }) => ResolvedConfig | Promise<ResolvedConfig>;

/** The configuration the Vite plugin sees for a mode (a config can be a plain object or a function of the mode). */
async function resolve(config: unknown, mode: string): Promise<ResolvedConfig> {
  return typeof config === "function"
    ? await (config as ConfigFn)({ mode, isPreview: false })
    : (config as ResolvedConfig);
}

const site = await resolve(siteConfig, "production");
const e2e = await resolve(siteConfig, "e2e");
const scripts = (
  JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }
).scripts;

/** Cloudflare's `run_worker_first` patterns: `*` matches anything, and a leading `!` excludes. */
function runsWorkerFirst(patterns: string[], path: string): boolean {
  const matches = (pattern: string) =>
    new RegExp(`^${pattern.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`).replaceAll("*", ".*")}$`).test(path);
  const excluded = patterns.filter((p) => p.startsWith("!")).some((p) => matches(p.slice(1)));
  return !excluded && patterns.filter((p) => !p.startsWith("!")).some(matches);
}

describe("cloudflare.config.ts and the code agree", () => {
  it("serves the custom domain the site builds its URLs for", () => {
    expect(site.worker.domains).toEqual([new URL(siteUrl()).host]);
  });

  it("answers a rate-limited caller with the length of the rate limit window", () => {
    expect(site.worker.env.COUNTER_LIMITER?.simple?.period).toBe(RETRY_AFTER_SECONDS);
  });

  it("runs the Worker first for every page that can answer with Markdown, but not for the static twins", () => {
    const patterns = site.worker.assets?.runWorkerFirst ?? [];
    for (const path of ["/learn/un-votes", "/act/ask-your-mp-un-vote", "/give"]) {
      expect(NEGOTIABLE.test(path), `${path} is negotiable`).toBe(true);
      expect(runsWorkerFirst(patterns, path), `${path} runs the Worker first`).toBe(true);
    }
    for (const path of ["/learn/un-votes.md", "/act/ask-your-mp-un-vote.md"]) {
      expect(runsWorkerFirst(patterns, path), `${path} is served straight from assets`).toBe(false);
    }
  });

  it("runs the Worker first for the server-rendered routes", () => {
    const patterns = site.worker.assets?.runWorkerFirst ?? [];
    for (const path of ["/api/health", "/go/global-health-partners", "/act", "/give"]) {
      expect(runsWorkerFirst(patterns, path), path).toBe(true);
    }
  });
});

describe("the e2e mode stays apart from production", () => {
  it("has its own database and no custom domain, so a test run cannot touch the real one", () => {
    expect(e2e.worker.env.DB?.id).not.toBe(site.worker.env.DB?.id);
    expect(e2e.worker.env.DB?.name).not.toBe(site.worker.env.DB?.name);
    expect(e2e.worker.domains).toEqual([]);
  });

  it("is otherwise the same Worker, so the tests exercise what is deployed", () => {
    const { domains: _d, env: _e, ...rest } = e2e.worker;
    const { domains: _sd, env: _se, ...siteRest } = site.worker;
    expect(rest).toEqual(siteRest);
    expect(Object.keys(e2e.worker.env)).toEqual(Object.keys(site.worker.env));
  });
});

describe("the package.json scripts use the database ids in cloudflare.config.ts", () => {
  // `cf d1 migrations` takes a database id, not a binding name, so the scripts repeat it.
  it("applies the migrations to the production database on deploy", () => {
    expect(scripts["deploy:ci"]).toContain(`cf d1 migrations apply ${site.worker.env.DB?.id} `);
    expect(scripts["deploy:ci"]).not.toContain("--local");
  });

  it("applies the migrations to the local e2e database only", () => {
    expect(scripts["d1:migrate:e2e"]).toContain(`cf d1 migrations apply ${e2e.worker.env.DB?.id} --local --mode e2e `);
  });

  it("points every migrations command at the migrations folder", () => {
    for (const name of ["deploy:ci", "d1:migrate:e2e"]) expect(scripts[name], name).toContain("--dir migrations");
  });
});
