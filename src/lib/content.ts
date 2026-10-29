import { getCollection, getEntry, type CollectionEntry } from "astro:content";

export type ActionEntry = CollectionEntry<"actions">;
export type ArticleEntry = CollectionEntry<"articles">;
type TargetEntry = CollectionEntry<"targets">;
type FundraiserEntry = CollectionEntry<"fundraisers">;
export type SourceEntry = CollectionEntry<"sources">;

/** Live actions, featured first, then by title. */
export async function getLiveActions(): Promise<ActionEntry[]> {
  const actions = await getCollection("actions", ({ data }) => data.status === "live");
  return actions.toSorted(
    (a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.title.localeCompare(b.data.title),
  );
}

/** Live articles, newest first. */
export async function getLiveArticles(): Promise<ArticleEntry[]> {
  const articles = await getCollection("articles", ({ data }) => data.status === "live");
  return articles.toSorted(
    (a, b) => b.data.published.getTime() - a.data.published.getTime() || a.id.localeCompare(b.id),
  );
}

/** Fundraisers that passed vetting. Unapproved candidates never reach the site. */
export async function getApprovedFundraisers(): Promise<FundraiserEntry[]> {
  const all = await getCollection("fundraisers", ({ data }) => data.approved);
  return all.toSorted((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function getTargets(): Promise<Map<string, TargetEntry>> {
  return new Map((await getCollection("targets")).map((t) => [t.id, t]));
}

/** A target's display name, or its id when the target is missing. */
export function targetName(targets: ReadonlyMap<string, TargetEntry>, id: string): string {
  return targets.get(id)?.data.name ?? id;
}

/** Sources in the order given, which is the article's citation order. A missing source fails the build. */
export async function getSourcesInOrder(ids: readonly string[]): Promise<SourceEntry[]> {
  return Promise.all(
    ids.map(async (id) => {
      const source = await getEntry("sources", id);
      if (!source) throw new Error(`Unknown source "${id}". Run "npm run check:content".`);
      return source;
    }),
  );
}

/** Live actions an article points to, in the order the article lists them. */
export async function getRelatedLiveActions(ids: readonly string[]): Promise<ActionEntry[]> {
  const found = await Promise.all(ids.map((id) => getEntry("actions", id)));
  return found.filter((a): a is ActionEntry => a?.data.status === "live");
}
