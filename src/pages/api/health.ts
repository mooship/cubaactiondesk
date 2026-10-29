import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

/** Status for uptime checks. 200 when the database answers, 503 when it does not. */
export const ALL: APIRoute = async ({ request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Response.json(
      { error: "Method not allowed" },
      {
        status: 405,
        headers: { ...headers, Allow: "GET, HEAD" },
      },
    );
  }
  try {
    await env.DB.prepare("select 1").first();
    return Response.json({ status: "ok", database: true }, { status: 200, headers });
  } catch {
    return Response.json({ status: "degraded", database: false }, { status: 503, headers });
  }
};
