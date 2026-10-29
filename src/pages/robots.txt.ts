import type { APIRoute } from "astro";
import { TEXT_TYPE, textResponse } from "../lib/http.ts";
import { robotsTxt } from "../lib/robots.ts";

export const GET: APIRoute = ({ site }) => textResponse(robotsTxt(site!), TEXT_TYPE);
