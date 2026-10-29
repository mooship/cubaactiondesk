import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db/client.ts";
import { getLiveAction } from "../../../../lib/content.ts";
import { handleTaken } from "../../../../lib/taken.ts";

export const prerender = false;

/** Every method comes here; handleTaken answers 405 to anything but POST. */
export const ALL: APIRoute = ({ request, params }) =>
  handleTaken({
    method: request.method,
    slug: params.slug,
    ip: request.headers.get("cf-connecting-ip"),
    limiter: env.COUNTER_LIMITER,
    db: getDb(env.DB),
    isLiveAction: async (slug) => (await getLiveAction(slug)) !== undefined,
  });
