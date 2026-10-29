const longDate = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "29 October 2026". Always an absolute date. */
export function formatDate(date: Date): string {
  return longDate.format(date);
}

/** "2026-10-29" for `<time datetime>` and structured data. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Domain of a URL, shown as text beside every donate button. */
export function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** "1 minute", "2 minutes". */
export function minutes(n: number): string {
  return `${n} ${n === 1 ? "minute" : "minutes"}`;
}

/** "1 person", "3 people". */
export function peopleCount(n: number): string {
  return n === 1 ? "1 person" : `${n.toLocaleString("en-ZA")} people`;
}
