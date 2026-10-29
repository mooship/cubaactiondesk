import type {
  ActionData,
  ArticleData,
  FundraiserData,
  GlossaryData,
  SourceData,
  TargetData,
} from "../content/schemas.ts";
import { citedIds } from "./citations.ts";
import { TITLE_MAX, pageTitle } from "./site.ts";
import { contactProblems, contactsOf, verifiedContacts } from "./targets.ts";
import { extractPlaceholders } from "./template.ts";
import { countWords } from "./text.ts";

export interface Entry<T> {
  /** File name without extension. */
  id: string;
  data: T;
  /** Markdown body, for collections that have one. */
  body?: string;
}

export interface ContentSet {
  actions: Entry<ActionData>[];
  articles: Entry<ArticleData>[];
  targets: Entry<TargetData>[];
  fundraisers: Entry<FundraiserData>[];
  sources: Entry<SourceData>[];
  glossary: Entry<GlossaryData>[];
}

export interface Issue {
  level: "error" | "warning";
  where: string;
  message: string;
}

/** Contacts verified longer ago than this warn the editor. */
const TARGET_STALE_DAYS = 90;
/** Articles are re-reviewed every six months. */
const ARTICLE_REVIEW_DAYS = 183;
/** One ask, plain English, under 200 words. */
const ACTION_MAX_WORDS = 200;
/** Vetting check 3: an organisation must have been active for at least 12 months. */
const FUNDRAISER_MIN_ACTIVE_DAYS = 365;
/** The one placeholder the site fills itself (with the article link), so it needs no input. */
const LINK_PLACEHOLDER = "link";

const DAY_MS = 86_400_000;
const ageInDays = (date: Date, today: Date) => Math.floor((today.getTime() - date.getTime()) / DAY_MS);

/**
 * Rules that span collections. Errors fail CI; warnings are for the editor.
 * Takes `today` so tests are deterministic. This runs in CI and in tests, never
 * inside `astro build`, so the calendar cannot break a production deploy.
 */
export function checkContent(set: ContentSet, today: Date): Issue[] {
  const issues: Issue[] = [];
  const error = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });

  const sourceIds = new Set(set.sources.map((s) => s.id));
  const targets = new Map(set.targets.map((t) => [t.id, t.data]));
  const actions = new Map(set.actions.map((a) => [a.id, a.data]));
  const articleIds = new Set(set.articles.map((a) => a.id));
  const approvedFundraisers = new Set(set.fundraisers.filter((f) => f.data.approved).map((f) => f.id));

  const missingSources = (where: string, ids: readonly string[]) => {
    for (const id of ids) if (!sourceIds.has(id)) error(where, `source "${id}" does not exist`);
  };

  for (const { id, data } of set.targets) {
    if (data.id !== id) error(`targets/${id}`, `id "${data.id}" does not match file name "${id}"`);
    for (const contact of contactsOf(data)) {
      if (contact.lastVerified && ageInDays(contact.lastVerified, today) > TARGET_STALE_DAYS) {
        warn(`targets/${id}`, `${contact.name}: contact last verified over ${TARGET_STALE_DAYS} days ago; re-check it`);
      }
    }
  }

  const titleLength = (where: string, title: string) => {
    const length = pageTitle(title).length;
    if (length > TITLE_MAX)
      warn(where, `page title is ${length} characters with the site name; keep it under ${TITLE_MAX + 1}`);
  };

  for (const { id, data, body = "" } of set.actions) {
    const where = `actions/${id}`;
    titleLength(where, data.title);
    if (data.slug !== id) error(where, `slug "${data.slug}" does not match file name "${id}"`);

    const target = targets.get(data.target);
    if (!target) error(where, `target "${data.target}" does not exist`);
    missingSources(where, data.sources);
    if (data.shareArticle && !articleIds.has(data.shareArticle)) {
      error(where, `shareArticle "${data.shareArticle}" does not exist`);
    }

    const declared = new Set(data.placeholders.map((p) => p.key));
    const used = extractPlaceholders(body);
    for (const key of used) {
      if (!declared.has(key) && key !== LINK_PLACEHOLDER) {
        error(where, `placeholder {${key}} is in the text but has no input defined`);
      }
    }
    for (const key of declared) {
      if (!used.includes(key)) warn(where, `input "${key}" is defined but not used in the text`);
    }
    if (data.placeholders.filter((p) => p.kind === "own_words").length < 2) {
      error(where, "needs at least two blanks the sender writes in their own words");
    }

    const words = countWords(body);
    if (words > ACTION_MAX_WORDS) error(where, `text is over ${ACTION_MAX_WORDS} words (${words})`);

    const isMessage = data.channel === "email" || data.channel === "letter";
    if (isMessage && !data.subject) {
      error(where, "needs a subject");
    }
    if (isMessage && data.sources.length === 0) {
      error(where, "needs at least one source");
    }

    if (data.status === "live" && target?.addressRequired && verifiedContacts(target).length === 0) {
      const reason =
        target.options.length > 0 ? "no verified contact option" : contactProblems(contactsOf(target)[0]!).join(", ");
      error(where, `live action needs a verified target ("${data.target}"): ${reason}`);
    }
  }

  for (const { id, data, body = "" } of set.articles) {
    const where = `articles/${id}`;
    titleLength(where, data.title);
    missingSources(where, data.sources);

    const cited = new Set(citedIds([data.answer, body, ...data.counterarguments].join("\n")));
    for (const marker of cited) {
      if (!data.sources.includes(marker)) {
        error(where, `cites [[${marker}]] which is not in this article's sources`);
      }
    }
    for (const listed of data.sources) {
      if (!cited.has(listed)) warn(where, `source "${listed}" is listed but never cited`);
    }

    for (const related of data.relatedActions) {
      if (!actions.has(related)) error(where, `related action "${related}" does not exist`);
    }

    if (data.status === "live") {
      if (data.counterarguments.length === 0)
        error(where, "needs a Main counterarguments box (counterarguments is empty)");
      if (data.relatedActions.every((a) => actions.get(a)?.status !== "live")) {
        error(where, "must link to at least one live action");
      }
      const age = ageInDays(data.reviewed, today);
      if (age > ARTICLE_REVIEW_DAYS) {
        warn(where, `last reviewed ${age} days ago; articles are reviewed every 6 months`);
      }
    }
  }

  for (const { id, data } of set.fundraisers) {
    const where = `fundraisers/${id}`;
    if (data.id !== id) error(where, `id "${data.id}" does not match file name "${id}"`);
    if (!data.approved) continue;

    if (!data.registration) error(where, "approved but has no registration number");
    if (data.evidence.length === 0) error(where, "approved but has no evidence of delivery");
    if (!data.recipientsInCuba) error(where, "approved but recipients in Cuba are not stated");
    if (!data.howMoneyReaches) error(where, "approved but does not say how money reaches Cuba");
    if (!data.lastVerified) error(where, "approved but has not been verified (no lastVerified date)");
    if (data.onlinePayment === "unconfirmed") {
      error(where, "approved but its donation page has not been confirmed to take an online card or bank transfer");
    }

    if (data.runBy) {
      if (!approvedFundraisers.has(data.runBy)) {
        error(where, `runBy "${data.runBy}" is not a listed (approved) organisation`);
      }
    } else if (!data.activeSince || ageInDays(data.activeSince, today) < FUNDRAISER_MIN_ACTIVE_DAYS) {
      error(where, "needs 12 months of activity, or to be run by an already-listed organisation");
    }
  }

  for (const { id, data } of set.glossary) missingSources(`glossary/${id}`, data.sources);

  return issues;
}
