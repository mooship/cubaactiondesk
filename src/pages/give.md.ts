import type { APIRoute } from "astro";
import { MARKDOWN_TYPE, textResponse } from "../lib/http.ts";
import { giveTwinFor } from "../lib/twins.ts";

export const GET: APIRoute = async ({ site }) => textResponse(await giveTwinFor(site!), MARKDOWN_TYPE);
