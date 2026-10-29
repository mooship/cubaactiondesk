import { defineMdastPlugin } from "satteri";
import { CITATION, citationMarkup, citationNumber } from "./citations.ts";

export type Part = { type: "text" | "html"; value: string };

/**
 * Splits text around `[[source-id]]` markers. A marker whose id is not in
 * `sources` stays as visible text, so the content check can turn it into a CI error.
 */
export function splitCitations(value: string, sources: readonly string[]): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of value.matchAll(CITATION)) {
    const n = citationNumber(match[1]!, sources);
    if (n === null) continue;
    if (match.index > last) parts.push({ type: "text", value: value.slice(last, match.index) });
    parts.push({ type: "html", value: citationMarkup(n) });
    last = match.index + match[0].length;
  }
  if (last < value.length || parts.length === 0) parts.push({ type: "text", value: value.slice(last) });
  return parts;
}

/**
 * Sätteri mdast plugin: turns `[[source-id]]` into a numbered superscript link,
 * numbered by the id's position in the article's frontmatter `sources` list.
 * Code is a different node type, so it is never touched.
 */
export const satteriCitations = defineMdastPlugin({
  name: "citations",
  text(node, ctx) {
    const frontmatter = (ctx.data as { astro?: { frontmatter?: { sources?: unknown } } }).astro?.frontmatter;
    const sources = frontmatter?.sources;
    if (!Array.isArray(sources) || sources.length === 0) return;
    const parts = splitCitations(node.value, sources as string[]);
    if (parts.length === 1 && parts[0]!.type === "text") return;
    ctx.replaceNode(node, parts);
  },
});
