import { SITE, absoluteUrl } from "./site.ts";

export interface FeedItem {
  title: string;
  url: string;
  summary: string;
  date: Date;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const escapeXml = (text: string) => text.replaceAll(/[&<>"']/g, (c) => ESCAPES[c]!);

/** RSS 2.0 for new articles and actions, newest first. */
export function rssFeed(items: FeedItem[], origin: URL | string): string {
  const sorted = items.toSorted((a, b) => b.date.getTime() - a.date.getTime());
  const lastBuild = sorted[0]?.date ?? new Date(0);
  const entries = sorted.map(
    (item) =>
      `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>
      <description>${escapeXml(item.summary)}</description>
    </item>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(absoluteUrl("/", origin))}</link>
    <description>${escapeXml(SITE.tagline)}</description>
    <language>en-za</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
${entries.join("\n")}
  </channel>
</rss>
`;
}
