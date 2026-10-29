/**
 * Source markers. Authors write `[[un-ga-2025-vote]]` after a claim. The marker
 * is numbered by the id's position in the article's frontmatter `sources` list,
 * so the same number appears in the body, the answer, the counterarguments, the
 * source list at the foot and the Markdown twin.
 */
export const CITATION = /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)\]\]/g;

/** Marker ids in order of appearance, including repeats. */
export function citedIds(text: string): string[] {
  return [...text.matchAll(CITATION)].map((m) => m[1]!);
}

/** 1-based number of `id` in `sources`, or null when the article does not list it. */
export function citationNumber(id: string, sources: readonly string[]): number | null {
  const index = sources.indexOf(id);
  return index === -1 ? null : index + 1;
}

/** The superscript link a marker becomes on the page. The number links to the source list at the foot. */
export function citationMarkup(n: number): string {
  return `<sup><a href="#source-${n}" aria-label="Source ${n}" data-cite>${n}</a></sup>`;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** For plain-text fields (answer, counterarguments): escapes HTML, then swaps markers for links. */
export function inlineWithCitations(text: string, sources: readonly string[]): string {
  const escaped = text.replaceAll(/[&<>"]/g, (c) => HTML_ESCAPES[c]!);
  return escaped.replaceAll(CITATION, (marker, id: string) => {
    const n = citationNumber(id, sources);
    return n === null ? marker : citationMarkup(n);
  });
}

/** Markers as `[n]`, for Markdown twins. An unknown marker is left visible. */
export function plainCitations(text: string, sources: readonly string[]): string {
  return text.replaceAll(CITATION, (marker, id: string) => {
    const n = citationNumber(id, sources);
    return n === null ? marker : `[${n}]`;
  });
}
