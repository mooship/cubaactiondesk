import type { APIRoute, GetStaticPaths } from "astro";
import { getLiveActions } from "../../lib/content.ts";
import { actionTwinFor } from "../../lib/twins.ts";

// The page itself is rendered on demand (live counters, prefill); its Markdown twin is built once.
export const getStaticPaths = (async () => {
  const actions = await getLiveActions();
  return actions.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) =>
  new Response(await actionTwinFor(props.entry, site!), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
