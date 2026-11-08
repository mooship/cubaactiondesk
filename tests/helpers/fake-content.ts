/**
 * An in-memory stand-in for the `astro:content` virtual module, which only exists inside an Astro build. Tests fill
 * `collections` and register it with `vi.mock("astro:content", () => import("../helpers/fake-content.ts"))`.
 */
type Entry = { id: string; data: Record<string, unknown>; body?: string };

export const collections = new Map<string, Entry[]>();

export const getCollection = async (name: string, filter?: (entry: Entry) => boolean) =>
  (collections.get(name) ?? []).filter((entry) => (filter ? filter(entry) : true));

export const getEntry = async (name: string, id: string) => collections.get(name)?.find((entry) => entry.id === id);
