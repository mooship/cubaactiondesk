/**
 * Which actions this device has marked done, kept in localStorage and nowhere else. A separate module so the home and
 * /act pages (which only show a star) do not load the rest of the Action Desk code.
 */
const DONE_KEY = "cad:done";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "getItem" | "setItem">;

/** localStorage, or null when the browser blocks it (private windows, blocked site data). */
export function getStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Slugs this device has marked done. Storage can be missing, blocked or corrupt; that is never an error. */
export function readDone(storage: ReadableStorage | null): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(DONE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function addDone(storage: WritableStorage | null, slug: string): string[] {
  const done = readDone(storage);
  if (done.includes(slug)) return done;
  const next = [...done, slug];
  try {
    storage?.setItem(DONE_KEY, JSON.stringify(next));
  } catch {
    // Blocked site data: the star simply will not persist.
  }
  return next;
}

/** First action this device has not done, other than the one being viewed. */
export function nextAction<T extends { slug: string }>(
  done: readonly string[],
  actions: readonly T[],
  currentSlug: string,
): T | null {
  return actions.find((a) => a.slug !== currentSlug && !done.includes(a.slug)) ?? null;
}
