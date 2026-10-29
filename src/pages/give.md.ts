import type { APIRoute } from "astro";
import { giveTwinFor } from "../lib/twins.ts";

export const GET: APIRoute = async ({ site }) =>
  new Response(await giveTwinFor(site!), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
