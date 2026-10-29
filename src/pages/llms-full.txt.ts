import type { APIRoute } from "astro";
import { TEXT_TYPE, textResponse } from "../lib/http.ts";
import { llmsFullTxtFor } from "../lib/twins.ts";

export const GET: APIRoute = async ({ site }) => textResponse(await llmsFullTxtFor(site!), TEXT_TYPE);
