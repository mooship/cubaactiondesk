import type { ContentSet } from "./content-check.ts";
import type { CheckedLink } from "./link-check-run.ts";

/** The donation links the weekly checker tests: approved listings only, in a stable order. */
export function linkList(set: Pick<ContentSet, "fundraisers">): CheckedLink[] {
  return set.fundraisers
    .filter((f) => f.data.approved)
    .map((f) => ({ id: f.id, url: f.data.donateUrl }))
    .toSorted((a, b) => a.id.localeCompare(b.id));
}
