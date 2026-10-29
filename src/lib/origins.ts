import type { SourceData } from "../content/schemas.ts";

/** How a source's origin is labelled to readers. Government sources of every country are named. */
export const ORIGIN_LABELS: Record<SourceData["origin"], string> = {
  un: "United Nations",
  "us-government": "US government",
  "sa-government": "South African government",
  "cuban-government": "Cuban government",
  academic: "Academic",
  news: "News",
  ngo: "NGO",
};
