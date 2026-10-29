import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json } from "../../lib/http.ts";

export const prerender = false;

/** Status for uptime checks. 200 when the database answers, 503 when it does not. */
export const ALL: APIRoute = async ({ request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD" });
  }
  try {
    await env.DB.prepare("select 1").first();
    return json({ status: "ok", database: true });
  } catch {
    return json({ status: "degraded", database: false }, 503);
  }
};
