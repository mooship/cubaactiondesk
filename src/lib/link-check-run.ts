import type { Db } from "../db/client.ts";
import { recordCheck } from "./link-checks.ts";
import { REVIEW_AFTER } from "./linkstate.ts";
import { SITE } from "./site.ts";

/** A donation link to check: the listing's id and its donate URL. */
export interface CheckedLink {
  id: string;
  url: string;
}

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const USER_AGENT = `CubaActionDesk-LinkChecker (+${SITE.repo})`;
const TIMEOUT_MS = 10_000;

const request = (fetchImpl: FetchLike, url: string, method: "HEAD" | "GET") =>
  fetchImpl(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

/**
 * HTTP status of the final page, or null when the site cannot be reached.
 * Sends a HEAD first; many servers refuse HEAD, so any failure is retried once with GET.
 */
export async function checkUrl(url: string, fetchImpl: FetchLike = fetch): Promise<number | null> {
  try {
    const head = await request(fetchImpl, url, "HEAD");
    if (head.status < 400) return head.status;
  } catch {
    // Fall through to GET.
  }
  try {
    const get = await request(fetchImpl, url, "GET");
    await get.body?.cancel();
    return get.status;
  } catch {
    return null;
  }
}

export interface RunInput {
  links: CheckedLink[];
  db: Db;
  fetchImpl?: FetchLike;
  now?: Date;
  /** Called once per link, on the run where it first goes under review (not again while it stays broken). */
  onReview: (link: CheckedLink) => Promise<unknown>;
}

/** Checks every link and records the result. One link failing, or reporting failing, never stops the rest. */
export async function runChecks({ links, db, fetchImpl = fetch, now = new Date(), onReview }: RunInput): Promise<void> {
  for (const link of links) {
    try {
      const status = await checkUrl(link.url, fetchImpl);
      const result = await recordCheck(db, link.url, status, now);
      // Exactly the run that reaches the threshold, so a link that stays broken is not reported weekly.
      if (result.consecutiveFail === REVIEW_AFTER) await onReview(link);
    } catch (error) {
      console.error(`Link check failed for ${link.id}:`, error);
    }
  }
}
