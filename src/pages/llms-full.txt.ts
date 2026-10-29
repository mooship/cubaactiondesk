import type { APIRoute } from "astro";
import { llmsFullTxtFor } from "../lib/twins.ts";

export const GET: APIRoute = async ({ site }) =>
  new Response(await llmsFullTxtFor(site!), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
