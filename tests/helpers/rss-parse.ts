// Tiny reader for the RSS we generate, so tests assert on structure rather than on string layout.

export interface ParsedFeed {
  version: string | undefined;
  title: string | undefined;
  link: string | undefined;
  items: { title?: string; pubDate?: string; guid?: string }[];
}

const tag = (xml: string, name: string) =>
  new RegExp(String.raw`<${name}(?:\s[^>]*)?>([\s\S]*?)</${name}>`).exec(xml)?.[1];

export function parseFeed(xml: string): ParsedFeed {
  const channel = tag(xml, "channel") ?? "";
  const head = channel.replaceAll(/<item>[\s\S]*?<\/item>/g, "");
  return {
    version: /<rss[^>]*\sversion="([^"]+)"/.exec(xml)?.[1],
    title: tag(head, "title"),
    link: tag(head, "link"),
    items: [...channel.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
      title: tag(m[1]!, "title"),
      pubDate: tag(m[1]!, "pubDate"),
      guid: tag(m[1]!, "guid"),
    })),
  };
}
