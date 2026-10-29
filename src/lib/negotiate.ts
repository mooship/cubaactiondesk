/** Paths where `Accept: text/markdown` returns the Markdown twin. */
export const NEGOTIABLE = /^\/(learn\/[^/.]+|act\/[^/.]+|give)$/;

/**
 * True when the client prefers Markdown over HTML. A bare `*` or `text/html`
 * request keeps getting HTML; only an explicit `text/markdown` at least as
 * preferred as `text/html` switches to the twin.
 */
export function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const types = accept.split(",").map((part) => {
    const [type, ...params] = part.trim().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const weight = q ? Number(q.slice(2)) : 1;
    return { type: (type ?? "").trim().toLowerCase(), q: Number.isNaN(weight) ? 1 : weight };
  });
  const md = types.find((t) => t.type === "text/markdown");
  if (!md || md.q <= 0) return false;
  const html = types.find((t) => t.type === "text/html");
  return !html || md.q >= html.q;
}
