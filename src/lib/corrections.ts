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
export const CORRECTIONS: Correction[] = [
  {
    date: "2026-11-05",
    page: "/give/how-we-vet",
    was: "The page said a South African Visa or Mastercard works on any international card form.",
    now: "We check the published payment options without making a payment. A listed method does not guarantee that a bank or provider will accept a donation from South Africa.",
  },
  {
    date: "2026-11-05",
    page: "/privacy",
    was: "The notice said names, towns and action messages never reach our server.",
    now: "With JavaScript off, filled-in fields reach the server in the web address to render the message. The notice now distinguishes this from browser-only editing and explains the browser-history risk.",
  },
  {
    date: "2026-11-05",
    page: "/accessibility",
    was: "The page said only the completion star animates.",
    now: "Loading placeholders also animate. Both respect the device's reduced-motion setting.",
  },
  {
    date: "2026-11-05",
    page: "/give",
    was: "The page said the donate button is paused if a link stops working.",
    now: "The button is paused after two failed weekly checks in a row, as the vetting page already explained.",
  },
];
