import { absoluteUrl } from "./site.ts";

/**
 * The goal is reach, so every search and AI crawler is welcome. Only the API and the
 * click-logging redirects are kept out. The Content-Signal line states our AI preferences.
 */
export function robotsTxt(origin: URL | string): string {
  return [
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /go/",
    "",
    `Sitemap: ${absoluteUrl("/sitemap-index.xml", origin)}`,
    "",
  ].join("\n");
}
