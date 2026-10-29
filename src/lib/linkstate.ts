/**
 * Donation-link health.
 *  - unchecked: no check has run yet
 *  - verified:  the last check passed
 *  - warning:   one failure; still shown, watched
 *  - review:    two consecutive failures; the donate button is disabled
 */
export type LinkStatus = "unchecked" | "verified" | "warning" | "review";

/** Failures in a row before a listing goes under review. */
export const REVIEW_AFTER = 2;

/** A check passes on any 2xx or 3xx final status. No status means a network error. */
function passed(httpStatus: number | null): boolean {
  return httpStatus !== null && httpStatus >= 200 && httpStatus < 400;
}

export function nextCheckState(
  previousConsecutiveFail: number,
  httpStatus: number | null,
): { lastStatus: number | null; consecutiveFail: number } {
  return {
    lastStatus: httpStatus,
    consecutiveFail: passed(httpStatus) ? 0 : previousConsecutiveFail + 1,
  };
}

export function statusFromRow(row: { consecutiveFail: number } | undefined): LinkStatus {
  if (!row) return "unchecked";
  if (row.consecutiveFail >= REVIEW_AFTER) return "review";
  if (row.consecutiveFail > 0) return "warning";
  return "verified";
}

export function isDonateEnabled(status: LinkStatus): boolean {
  return status !== "review";
}
