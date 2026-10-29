/** A placeholder is a lower-case word in braces, such as `{name}` or `{mp_name}`. */
const PLACEHOLDER = /\{([a-z][a-z0-9_]*)\}/g;

/**
 * Fills placeholders from `values` in a single pass. A placeholder with no
 * value (missing, empty or only spaces) stays visible in the text so the
 * sender sees what is left to write.
 */
export function renderTemplate(body: string, values: Record<string, string | undefined>): string {
  return body.replaceAll(PLACEHOLDER, (match, key: string) => {
    const value = values[key]?.trim();
    return value || match;
  });
}

/** Unique placeholder keys, in order of first appearance. */
export function extractPlaceholders(text: string): string[] {
  const keys = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    const key = match[1];
    if (key) keys.add(key);
  }
  return [...keys];
}
