export interface Correction {
  /** ISO date the fix was published. */
  date: string;
  /** Site path of the page that was fixed. */
  page: string;
  /** What it said before. */
  was: string;
  /** What it says now, and why. */
  now: string;
}

/** The public corrections log. Newest first. Add an entry whenever a published error is fixed. */
export const CORRECTIONS: Correction[] = [];
