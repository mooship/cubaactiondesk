import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getApprovedFundraisers } from "../../lib/content.ts";
import { resolveOutbound } from "../../lib/outbound.ts";

export const prerender = false;

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * Server-side 302 to a fundraiser's donate page, logging one outbound-click event.
 * Works without JavaScript. The destination comes only from approved content.
 */
export const GET: APIRoute = async ({ params }) => {
  const listings = (await getApprovedFundraisers()).map((f) => ({ id: f.id, donateUrl: f.data.donateUrl }));

  const outbound = resolveOutbound(listings, params.fundraiser);
  if (outbound.kind === "missing") return new Response("Not found", { status: 404, headers });

  try {
    // Anonymous: the organisation id only. No IP, no user agent.
    env.EVENTS.writeDataPoint({
      blobs: ["outbound_click", params.fundraiser ?? ""],
      indexes: [params.fundraiser ?? ""],
    });
  } catch {
    // A logging problem must never stop a donation.
  }
  return new Response(null, { status: 302, headers: { ...headers, Location: outbound.url } });
};
