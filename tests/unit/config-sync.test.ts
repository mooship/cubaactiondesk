import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NEGOTIABLE } from "../../src/lib/negotiate.ts";
import { siteUrl } from "../../src/lib/site.ts";
import { RETRY_AFTER_SECONDS } from "../../src/lib/taken.ts";

// Values that two files must agree on, and that nothing else would notice drifting apart. wrangler.jsonc cannot import
// TypeScript, so these tests are what keep it in step with the code.

interface WranglerConfig {
  compatibility_date: string;
  routes?: { pattern: string; custom_domain?: boolean }[];
  d1_databases: { database_id: string; database_name: string }[];
  ratelimits?: { simple: { limit: number; period: number } }[];
  assets?: { run_worker_first?: string[] };
}

/** wrangler.jsonc allows comments and trailing commas, which JSON.parse does not. */
function readWrangler(path: string): WranglerConfig {
  const text = readFileSync(join(import.meta.dirname, "..", "..", path), "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .replaceAll(/,(\s*[}\]])/g, "$1");
  return JSON.parse(text) as WranglerConfig;
}

const site = readWrangler("wrangler.jsonc");
const checker = readWrangler("workers/link-checker/wrangler.jsonc");

/** Cloudflare's `run_worker_first` patterns: `*` matches anything, and a leading `!` excludes. */
function runsWorkerFirst(patterns: string[], path: string): boolean {
  const matches = (pattern: string) =>
    new RegExp(`^${pattern.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`).replaceAll("*", ".*")}$`).test(path);
  const excluded = patterns.filter((p) => p.startsWith("!")).some((p) => matches(p.slice(1)));
  return !excluded && patterns.filter((p) => !p.startsWith("!")).some(matches);
}

describe("wrangler.jsonc and the code agree", () => {
  it("serves the custom domain the site builds its URLs for", () => {
    const custom = site.routes?.find((r) => r.custom_domain);
    expect(custom?.pattern).toBe(new URL(siteUrl()).host);
  });

  it("answers a rate-limited caller with the length of the rate limit window", () => {
    expect(site.ratelimits?.[0]?.simple.period).toBe(RETRY_AFTER_SECONDS);
  });

  it("runs the Worker first for every page that can answer with Markdown, but not for the static twins", () => {
    const patterns = site.assets?.run_worker_first ?? [];
    for (const path of ["/learn/un-votes", "/act/ask-your-mp-un-vote", "/give"]) {
      expect(NEGOTIABLE.test(path), `${path} is negotiable`).toBe(true);
      expect(runsWorkerFirst(patterns, path), `${path} runs the Worker first`).toBe(true);
    }
    for (const path of ["/learn/un-votes.md", "/act/ask-your-mp-un-vote.md"]) {
      expect(runsWorkerFirst(patterns, path), `${path} is served straight from assets`).toBe(false);
    }
  });

  it("runs the Worker first for the server-rendered routes", () => {
    const patterns = site.assets?.run_worker_first ?? [];
    for (const path of ["/api/health", "/go/global-health-partners", "/act", "/give"]) {
      expect(runsWorkerFirst(patterns, path), path).toBe(true);
    }
  });
});

describe("the link checker and the site share one database", () => {
  it("uses the same database and compatibility date", () => {
    const pick = ({ database_id, database_name }: WranglerConfig["d1_databases"][number]) => ({
      database_id,
      database_name,
    });
    expect(pick(checker.d1_databases[0]!)).toEqual(pick(site.d1_databases[0]!));
    expect(checker.compatibility_date).toBe(site.compatibility_date);
  });
});
