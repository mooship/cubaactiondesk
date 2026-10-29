import { handle } from "@astrojs/cloudflare/handler";
import { MARKDOWN_TYPE } from "./lib/http.ts";
import { NEGOTIABLE, wantsMarkdown } from "./lib/negotiate.ts";
import { withSecurityHeaders } from "./lib/security.ts";

/**
 * wrangler.jsonc `run_worker_first` runs this Worker for the server-rendered routes and the
 * negotiable paths only; every other request is served straight from static assets (which get
 * their security headers from public/_headers).
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const negotiable = (request.method === "GET" || request.method === "HEAD") && NEGOTIABLE.test(url.pathname);

    if (negotiable && wantsMarkdown(request.headers.get("accept"))) {
      const twin = new URL(`${url.pathname}.md`, url);
      const res = await env.ASSETS.fetch(new Request(twin, request));
      if (res.ok) {
        const headers = new Headers(res.headers);
        headers.set("Content-Type", MARKDOWN_TYPE);
        headers.append("Vary", "Accept");
        return withSecurityHeaders(new Response(res.body, { status: res.status, headers }));
      }
    }

    const res = await handle(request, env, ctx);
    if (!negotiable) return withSecurityHeaders(res);
    const headers = new Headers(res.headers);
    headers.append("Vary", "Accept");
    return withSecurityHeaders(new Response(res.body, { status: res.status, statusText: res.statusText, headers }));
  },
} satisfies ExportedHandler<Env>;
