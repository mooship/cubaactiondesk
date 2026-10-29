import type { APIRoute } from "astro";
import { getLiveActions, getLiveArticles } from "../lib/content.ts";
import { RSS_TYPE, textResponse } from "../lib/http.ts";
import { rssFeed } from "../lib/rss.ts";
import { absoluteUrl } from "../lib/site.ts";

export const GET: APIRoute = async ({ site }) => {
  const [articles, actions] = await Promise.all([getLiveArticles(), getLiveActions()]);
  const xml = rssFeed(
    [
      ...articles.map((a) => ({
        title: a.data.title,
        url: absoluteUrl(`/learn/${a.id}`, site!),
        summary: a.data.summary,
        date: a.data.published,
      })),
      ...actions.map((a) => ({
        title: `Action: ${a.data.title}`,
        url: absoluteUrl(`/act/${a.id}`, site!),
        summary: a.data.summary,
        date: a.data.reviewed,
      })),
    ],
    site!,
  );
  return textResponse(xml, RSS_TYPE);
};
