import type { Db } from "../db/client.ts";
import { incrementAction } from "./counters.ts";
import { isSlug } from "./slug.ts";

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

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

/**
 * POST /api/actions/[slug]/taken. Bodiless: nothing the visitor wrote or typed
 * reaches us. The slug must be a live action so counters cannot be created at will.
 */
export async function handleTaken({ method, slug, ip, limiter, db, isLiveAction }: TakenRequest): Promise<Response> {
  if (method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  if (!slug || !isSlug(slug)) return json({ error: "Invalid action" }, 400);

  const { success } = await limiter.limit({ key: ip ?? "unknown" });
  if (!success) return json({ error: "Too many requests" }, 429, { "Retry-After": "60" });

  if (!(await isLiveAction(slug))) return json({ error: "Unknown action" }, 404);

  return json({ slug, count: await incrementAction(db, slug) });
}
