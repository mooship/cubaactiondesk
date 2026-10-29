/** Content types the site answers with, so the charset suffix is written once. */
export const MARKDOWN_TYPE = "text/markdown; charset=utf-8";
export const TEXT_TYPE = "text/plain; charset=utf-8";
export const RSS_TYPE = "application/rss+xml; charset=utf-8";

export const textResponse = (body: string, type: string): Response =>
  new Response(body, { headers: { "Content-Type": type } });

/** JSON that must never be cached: counters, health checks and their errors. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
