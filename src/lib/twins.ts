import {
  getApprovedFundraisers,
  getLiveActions,
  getLiveArticles,
  getRelatedLiveActions,
  getSourcesInOrder,
  getTargets,
  targetName,
  type ActionEntry,
  type ArticleEntry,
  type SourceEntry,
} from "./content.ts";
import { actionTwin, articleTwin, giveTwin, llmsFullTxt, llmsTxt, type TwinSource } from "./markdown-twin.ts";
import { fillTemplate } from "./action-desk.ts";
import { absoluteUrl } from "./site.ts";

/** Builds Markdown twins from the content collections. The formatting itself is in markdown-twin.ts. */

const toTwinSource = (s: SourceEntry): TwinSource => ({
  title: s.data.title,
  publisher: s.data.publisher,
  url: s.data.url,
  published: s.data.published,
  origin: s.data.origin,
});

export async function articleTwinFor(entry: ArticleEntry, origin: URL | string): Promise<string> {
  const sources = await getSourcesInOrder(entry.data.sources);
  const related = await getRelatedLiveActions(entry.data.relatedActions);
  return articleTwin(
    {
      id: entry.id,
      title: entry.data.title,
      summary: entry.data.summary,
      answer: entry.data.answer,
      body: entry.body ?? "",
      counterarguments: entry.data.counterarguments,
      sourceIds: entry.data.sources,
      sources: sources.map(toTwinSource),
      published: entry.data.published,
      reviewed: entry.data.reviewed,
      related: related.map((a) => ({ title: a.data.title, url: absoluteUrl(`/act/${a.id}`, origin) })),
    },
    origin,
  );
}

export async function actionTwinFor(entry: ActionEntry, origin: URL | string): Promise<string> {
  const sources = await getSourcesInOrder(entry.data.sources);
  const targets = await getTargets();
  const link = entry.data.shareArticle ? absoluteUrl(`/learn/${entry.data.shareArticle}`, origin) : undefined;
  return actionTwin(
    {
      id: entry.id,
      title: entry.data.title,
      summary: entry.data.summary,
      context: entry.data.context,
      targetName: targetName(targets, entry.data.target),
      timeMinutes: entry.data.timeMinutes,
      subject: entry.data.subject,
      template: fillTemplate(entry.body ?? "", {}, link),
      sources: sources.map(toTwinSource),
      sourceIds: entry.data.sources,
      reviewed: entry.data.reviewed,
    },
    origin,
  );
}

export async function giveTwinFor(origin: URL | string): Promise<string> {
  const fundraisers = await getApprovedFundraisers();
  return giveTwin(
    fundraisers.map((f) => ({
      name: f.data.name,
      country: f.data.country,
      delivers: f.data.delivers,
      recipientsInCuba: f.data.recipientsInCuba,
      howMoneyReaches: f.data.howMoneyReaches,
      registration: f.data.registration ? `${f.data.registration.number} (${f.data.registration.body})` : null,
      website: f.data.website,
      lastVerified: f.data.lastVerified,
    })),
    origin,
  );
}

export async function llmsTxtFor(origin: URL | string): Promise<string> {
  const [articles, actions] = await Promise.all([getLiveArticles(), getLiveActions()]);
  return llmsTxt(
    {
      articles: articles.map((a) => ({ id: a.id, title: a.data.title, summary: a.data.summary })),
      actions: actions.map((a) => ({ id: a.id, title: a.data.title, summary: a.data.summary })),
    },
    origin,
  );
}

export async function llmsFullTxtFor(origin: URL | string): Promise<string> {
  const [articles, actions] = await Promise.all([getLiveArticles(), getLiveActions()]);
  const pages = [
    ...(await Promise.all(articles.map((a) => articleTwinFor(a, origin)))),
    ...(await Promise.all(actions.map((a) => actionTwinFor(a, origin)))),
    await giveTwinFor(origin),
  ];
  return llmsFullTxt(pages, origin);
}
