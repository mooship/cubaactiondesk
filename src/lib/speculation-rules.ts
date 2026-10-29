/** Same-site prerender on hover. /go/ and /api/ are excluded because they log or change state. */
const rules = {
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          { not: { href_matches: "/go/*" } },
          { not: { href_matches: "/api/*" } },
          { not: { href_matches: "/*.md" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
};

export const speculationRulesJson = JSON.stringify(rules);

/**
 * The CSP hash of the inline block above. An inline script needs its hash in the page's policy: the
 * `'inline-speculation-rules'` keyword alone is not enough, and Chrome still blocks the block and logs a console error.
 * Computed once when the module loads, not on every request.
 */
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(speculationRulesJson));
export const speculationRulesHash = `sha256-${btoa(String.fromCodePoint(...new Uint8Array(digest)))}`;
