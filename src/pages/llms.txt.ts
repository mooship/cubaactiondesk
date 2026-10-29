import type { APIRoute } from "astro";
import { TEXT_TYPE, textResponse } from "../lib/http.ts";
import { llmsTxtFor } from "../lib/twins.ts";

export const GET: APIRoute = async ({ site }) => textResponse(await llmsTxtFor(site!), TEXT_TYPE);
