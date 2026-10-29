import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriCitations } from "./src/lib/satteri-citations.ts";
import { loadSiteContent } from "./src/lib/content-files.ts";
import { DEFAULT_SITE_URL } from "./src/lib/site.ts";

// The public origin. Moving to cubaactiondesk.org.za later is one change: DEFAULT_SITE_URL in src/lib/site.ts
// (or SITE_URL at build time).
const site = process.env.SITE_URL ?? DEFAULT_SITE_URL;

// Action pages are rendered on demand, so the sitemap integration cannot see them. List the live ones.
const liveActionPages = loadSiteContent()
  .set.actions.filter((a) => a.data.status === "live")
  .map((a) => `${site}/act/${a.id}`);

export default defineConfig({
  site,
  trailingSlash: "never",
  markdown: {
    processor: satteri({ mdastPlugins: [satteriCitations] }),
  },
  build: {
    format: "file",
    inlineStylesheets: "always",
  },
  security: {
    // Astro writes this as a <meta> on static pages and a header on server-rendered ones, with hashes for the
    // inlined CSS and scripts.
    csp: {
      scriptDirective: {
        // The Cloudflare Web Analytics beacon is the only third-party script.
        // Our one speculationrules block is allowed by hash (see Base.astro), not by keyword.
        resources: ["'self'", "https://static.cloudflareinsights.com"],
      },
      styleDirective: { resources: ["'self'"] },
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        // A form on this site can never post to another origin, so card details cannot leave via a form.
        "form-action 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self' https://cloudflareinsights.com",
      ],
    },
  },
  // No sessions: stops the adapter wiring a KV namespace we would never use.
  session: false,
  adapter: cloudflare({
    imageService: "compile",
  }),
  integrations: [
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith("/api"),
      customPages: liveActionPages,
    }),
  ],
  devToolbar: { enabled: false },
});
