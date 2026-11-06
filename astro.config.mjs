import { defineConfig, fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriCitations } from "./src/lib/satteri-citations.ts";
import { loadSiteContent } from "./src/lib/content-files.ts";
import { siteUrl } from "./src/lib/site.ts";

// The public origin: SITE_URL if set, otherwise the default in src/lib/site.ts.
const site = siteUrl();

// Action pages are rendered on demand, so the sitemap integration cannot see them. List the live ones.
const liveActionPages = loadSiteContent()
  .set.actions.filter((a) => a.data.status === "live")
  .map((a) => `${site}/act/${a.id}`);

// Two variable fonts, Latin only and cut to the weights in use (about 51 KB together). They live in src/assets/fonts,
// where a README says how they were made. Astro hashes them and builds fallback fonts from the real font metrics, so
// the swap moves nothing on any operating system.
const fonts = [
  {
    provider: fontProviders.local(),
    name: "Source Serif 4",
    cssVariable: "--font-body",
    fallbacks: ["Georgia", "serif"],
    options: {
      variants: [{ src: ["./src/assets/fonts/source-serif-4.woff2"], weight: "400 700", style: "normal" }],
    },
  },
  {
    provider: fontProviders.local(),
    name: "Big Shoulders Display",
    cssVariable: "--font-display",
    fallbacks: ["Arial Narrow", "sans-serif"],
    options: {
      variants: [{ src: ["./src/assets/fonts/big-shoulders-display.woff2"], weight: "700 900", style: "normal" }],
    },
  },
];

export default defineConfig({
  site,
  fonts,
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
