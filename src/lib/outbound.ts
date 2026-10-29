import { isDonateEnabled, statusFromRow } from "./linkstate.ts";

export type Outbound =
  | { kind: "redirect"; url: string }
  /** The link failed two checks in a row; send the visitor back to the Give page. */
  | { kind: "review" }
  | { kind: "missing" };

/**
 * Decides where /go/[id] sends a visitor. The destination only ever comes from
 * an approved listing's donateUrl, never from the request, so this cannot be an open redirect.
 */
export function resolveOutbound(
  listings: readonly { id: string; donateUrl: string }[],
  rows: ReadonlyMap<string, { consecutiveFail: number }>,
  id: string | undefined,
): Outbound {
  const listing = id === undefined ? undefined : listings.find((l) => l.id === id);
  if (!listing) return { kind: "missing" };
  if (!isDonateEnabled(statusFromRow(rows.get(listing.donateUrl)))) return { kind: "review" };
  return { kind: "redirect", url: listing.donateUrl };
}
