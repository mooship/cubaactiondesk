import type { Db } from "../db/client.ts";
import { incrementAction } from "./counters.ts";
import { json } from "./http.ts";
import { isSlug } from "./slug.ts";

/** The rate limit window in wrangler.jsonc (ratelimits.simple.period); a test keeps the two equal. */
export const RETRY_AFTER_SECONDS = 60;

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface TakenRequest {
  method: string;
  slug: string | undefined;
  /** Caller IP. Only used as a rate-limit key; never stored by us. */
  ip: string | null;
  limiter: RateLimiter;
  db: Db;
  isLiveAction: (slug: string) => boolean | Promise<boolean>;
}

/**
 * POST /api/actions/[slug]/taken. Bodiless: nothing the visitor wrote or typed
 * reaches us. The slug must be a live action so counters cannot be created at will.
 */
export async function handleTaken({ method, slug, ip, limiter, db, isLiveAction }: TakenRequest): Promise<Response> {
  if (method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  if (!slug || !isSlug(slug)) return json({ error: "Invalid action" }, 400);

  const { success } = await limiter.limit({ key: ip ?? "unknown" });
  if (!success) return json({ error: "Too many requests" }, 429, { "Retry-After": String(RETRY_AFTER_SECONDS) });

  if (!(await isLiveAction(slug))) return json({ error: "Unknown action" }, 404);

  return json({ slug, count: await incrementAction(db, slug) });
}
