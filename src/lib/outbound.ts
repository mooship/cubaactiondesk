export type Outbound = { kind: "redirect"; url: string } | { kind: "missing" };

/**
 * Decides where /go/[id] sends a visitor. The destination only ever comes from
 * an approved listing's donateUrl, never from the request, so this cannot be an open redirect.
 */
export function resolveOutbound(
  listings: readonly { id: string; donateUrl: string }[],
  id: string | undefined,
): Outbound {
  const listing = id === undefined ? undefined : listings.find((l) => l.id === id);
  if (!listing) return { kind: "missing" };
  return { kind: "redirect", url: listing.donateUrl };
}
