import { getDb } from "../../src/db/client.ts";
import { runChecks, type CheckedLink } from "../../src/lib/link-check-run.ts";
import links from "./links.generated.json";

/**
 * Weekly Cron Trigger (see wrangler.jsonc). Tests every approved donation link and stores the result in D1. After two
 * failed checks in a row the Give page switches the donate button off by itself. When that first happens the checker
 * also writes one warning to Workers Logs (observability is on), so there is a record without any outside service.
 * All logic is in src/lib/link-check-run.ts.
 */
interface Env {
  DB: D1Database;
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runChecks({
        links: links as CheckedLink[],
        db: getDb(env.DB),
        onReview: async (link) => {
          console.warn(
            `Donation link under review: ${link.id} (${link.url}). The donate button is switched off until it works.`,
          );
        },
      }),
    );
  },
} satisfies ExportedHandler<Env>;
