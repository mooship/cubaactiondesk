/**
 * Finds spacing mistakes around inline elements: a letter, digit, comma, semicolon or colon stuck
 * straight onto one ("licensed<a>CC BY</a>", "<a>this</a>page"), or a space between one and the
 * punctuation after it ("<a>Title</a> , Publisher"). Astro's HTML compression drops the whitespace at the
 * edge of an element when it holds a line break, so a template that relies on a line break loses its space and one
 * that writes {" "} keeps it; this guards both mistakes. Returns short excerpts.
 */
export function findGluedInline(html: string): string[] {
  const body = /<body[\s\S]*<\/body>/.exec(html)?.[0] ?? "";
  const text = body.replaceAll(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, "");
  const glued =
    /[A-Za-z0-9,;:](<a[ >]|<strong>|<em>|<time[ >])|(<\/a>|<\/strong>|<\/em>|<\/time>)[A-Za-z0-9]|(<\/a>|<\/strong>|<\/em>|<\/time>)\s+[,.;:!?](?=\s|$|<)/g;
  return [...text.matchAll(glued)].map((m) =>
    text.slice(Math.max(0, m.index - 25), m.index + 35).replaceAll(/\s+/g, " "),
  );
}
