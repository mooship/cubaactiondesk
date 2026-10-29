import type { APIRoute } from "astro";
import { llmsTxtFor } from "../lib/twins.ts";

export const GET: APIRoute = async ({ site }) =>
  new Response(await llmsTxtFor(site!), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
