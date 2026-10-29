import type { APIRoute, GetStaticPaths } from "astro";
import { getLiveArticles } from "../../lib/content.ts";
import { MARKDOWN_TYPE, textResponse } from "../../lib/http.ts";
import { articleTwinFor } from "../../lib/twins.ts";

export const getStaticPaths = (async () => {
  const articles = await getLiveArticles();
  return articles.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) =>
  textResponse(await articleTwinFor(props.entry, site!), MARKDOWN_TYPE);
