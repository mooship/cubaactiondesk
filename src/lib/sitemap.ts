/** Site paths listed in a sitemap file, from its <loc> entries, whatever origin they carry. */
export const sitemapPaths = (xml: string): string[] =>
  [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1] ?? "");
