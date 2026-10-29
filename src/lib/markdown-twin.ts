import { plainCitations } from "./citations.ts";
import { formatDate, isoDate, minutes } from "./format.ts";
import { ORIGIN_LABELS } from "./origins.ts";
import { SITE, absoluteUrl } from "./site.ts";
import type { SourceData } from "../content/schemas.ts";

/**
 * Markdown twins of the HTML pages, built from the same content.
 * Everything here is pure so it can be tested without a build.
 */

export interface TwinSource {
  title: string;
  publisher: string;
  url: string;
  published: Date | null;
  origin: SourceData["origin"];
}

const LICENSE = "CC BY 4.0";

const SITE_SUMMARY =
  "Cuba Action Desk SA is an independent South African site about the US blockade (embargo) of Cuba. " +
  "It has ready-to-send emails and messages, short sourced explainers, and a checked list of organisations that deliver aid.";

/** Site-relative Markdown links become absolute, so a twin still works when read out of context. */
export function absolutizeLinks(markdown: string, origin: URL | string): string {
  return markdown.replaceAll(/\]\((\/[^)]*)\)/g, (_, path: string) => `](${absoluteUrl(path, origin)})`);
}

function frontMatter(fields: Record<string, string | Date>): string {
  const lines = Object.entries(fields).map(([key, value]) =>
    value instanceof Date ? `${key}: ${isoDate(value)}` : `${key}: ${JSON.stringify(value)}`,
  );
  return `---\n${lines.join("\n")}\n---\n`;
}

function sourceLine(source: TwinSource, index: number): string {
  const date = source.published ? `, ${formatDate(source.published)}` : "";
  return `${index + 1}. ${source.title}. ${source.publisher}${date}. ${source.url} (${ORIGIN_LABELS[source.origin]})`;
}

const finish = (markdown: string) => `${markdown.trimEnd()}\n`;

export interface ArticleTwinInput {
  id: string;
  title: string;
  summary: string;
  answer: string;
  body: string;
  counterarguments: string[];
  /** Ordered ids; `[[id]]` markers are numbered by position here. */
  sourceIds: string[];
  /** Same order as `sourceIds`. */
  sources: TwinSource[];
  published: Date;
  reviewed: Date;
  related: { title: string; url: string }[];
}

export function articleTwin(a: ArticleTwinInput, origin: URL | string): string {
  const text = (value: string) => absolutizeLinks(plainCitations(value, a.sourceIds), origin);
  const parts = [
    frontMatter({
      title: a.title,
      summary: a.summary,
      published: a.published,
      reviewed: a.reviewed,
      canonical: absoluteUrl(`/learn/${a.id}`, origin),
      license: LICENSE,
    }),
    `# ${a.title}\n`,
    `> ${text(a.answer)}\n`,
    `${text(a.body).trim()}\n`,
  ];
  if (a.counterarguments.length > 0) {
    parts.push(`## Main counterarguments\n\n${a.counterarguments.map((c) => `- ${text(c)}`).join("\n")}\n`);
  }
  parts.push(`## Sources\n\n${a.sources.map(sourceLine).join("\n")}\n`);
  if (a.related.length > 0) {
    parts.push(`## What you can do\n\n${a.related.map((r) => `- [${r.title}](${r.url})`).join("\n")}\n`);
  }
  return finish(parts.join("\n"));
}

export interface ActionTwinInput {
  id: string;
  title: string;
  summary: string;
  context: string[];
  targetName: string;
  timeMinutes: number;
  subject?: string | undefined;
  template: string;
  sources: TwinSource[];
  sourceIds: string[];
  reviewed: Date;
}

export function actionTwin(a: ActionTwinInput, origin: URL | string): string {
  const parts = [
    frontMatter({
      title: a.title,
      summary: a.summary,
      reviewed: a.reviewed,
      canonical: absoluteUrl(`/act/${a.id}`, origin),
      license: LICENSE,
    }),
    `# ${a.title}\n`,
    `${a.summary}\n`,
    `${a.context.map((line) => `- ${line}`).join("\n")}\n`,
    `Goes to: ${a.targetName}. Takes about ${minutes(a.timeMinutes)}.\n`,
    "You fill in the blanks, then send the message from your own email app or WhatsApp. " +
      "The site never sees the message or who sends it.\n",
  ];
  if (a.subject) parts.push(`Subject: ${a.subject}\n`);
  parts.push(`## Message template\n\n\`\`\`text\n${a.template.trim()}\n\`\`\`\n`);
  if (a.sources.length > 0) parts.push(`## Sources\n\n${a.sources.map(sourceLine).join("\n")}\n`);
  return finish(parts.join("\n"));
}

export interface GiveTwinEntry {
  name: string;
  country: string;
  delivers: string;
  recipientsInCuba: string | null;
  howMoneyReaches: string | null;
  payNote: string | null;
  /** "number (registering body)" */
  registration: string | null;
  website: string;
  lastVerified: Date | null;
}

export function giveTwin(entries: GiveTwinEntry[], origin: URL | string): string {
  const parts = [
    frontMatter({
      title: "Give",
      summary:
        "Organisations that deliver aid to Cuba, checked by us. You pay them directly; this site never handles money.",
      canonical: absoluteUrl("/give", origin),
      license: LICENSE,
    }),
    "# Give\n",
    "These organisations deliver aid to Cuba. You pay them directly, and this site never collects money. " +
      `How they are checked: ${absoluteUrl("/give/how-we-vet", origin)}\n`,
  ];
  if (entries.length === 0) {
    parts.push("No organisations are listed yet. We will not list one until we have finished checking it.\n");
  }
  for (const e of entries) {
    const facts = [
      `- Country: ${e.country}`,
      `- What they deliver: ${e.delivers}`,
      e.recipientsInCuba && `- Who receives it in Cuba: ${e.recipientsInCuba}`,
      e.howMoneyReaches && `- How money reaches Cuba: ${e.howMoneyReaches}`,
      e.payNote && `- Paying: ${e.payNote}`,
      e.registration && `- Registration: ${e.registration}`,
      `- Website: ${e.website}`,
      e.lastVerified && `- Last checked by us: ${formatDate(e.lastVerified)}`,
    ].filter(Boolean);
    parts.push(`## ${e.name}\n\n${facts.join("\n")}\n`);
  }
  parts.push(
    "## Before you donate\n\n" +
      "- Some payment providers block or delay payments that mention Cuba. If a payment fails, try the organisation's other payment method.\n" +
      "- If you are a US citizen or resident, extra US rules may apply. Ask the organisation how it follows them.\n" +
      "- This is not financial or legal advice.\n",
  );
  return finish(parts.join("\n"));
}

interface IndexItem {
  id: string;
  title: string;
  summary: string;
}

/** The llms.txt convention: h1, blockquote summary, then sections of links to Markdown pages. */
export function llmsTxt(content: { articles: IndexItem[]; actions: IndexItem[] }, origin: URL | string): string {
  const link = (item: IndexItem, section: string) =>
    `- [${item.title}](${absoluteUrl(`/${section}/${item.id}.md`, origin)}): ${item.summary}`;
  return finish(
    [
      `# ${SITE.name}\n`,
      `> ${SITE_SUMMARY}\n`,
      "Every page links its sources. Pages are reviewed at least every six months and carry a review date. " +
        `Text is licensed ${LICENSE}; please credit ${SITE.name}.\n`,
      `## Learn\n\n${content.articles.map((a) => link(a, "learn")).join("\n")}\n`,
      `## Act\n\n${content.actions.map((a) => link(a, "act")).join("\n")}\n`,
      `## Give\n\n- [Give: organisations that deliver aid to Cuba](${absoluteUrl("/give.md", origin)}): organisations we have checked.\n`,
      "## About\n\n" +
        [
          ["About", "/about", "who runs this site and its independence"],
          ["Sources", "/sources", "the master list of sources"],
          ["Glossary", "/glossary", "plain-English definitions"],
          ["Corrections", "/corrections", "public log of corrections"],
          ["Privacy", "/privacy", "what is and is not collected"],
        ]
          .map(([name, path, note]) => `- [${name}](${absoluteUrl(path!, origin)}): ${note}`)
          .join("\n") +
        "\n",
    ].join("\n"),
  );
}

/** llms-full.txt: a header plus the full Markdown of every live page. */
export function llmsFullTxt(pages: string[], origin: URL | string): string {
  const header = `# ${SITE.name}\n\n> ${SITE_SUMMARY}\n\nFull text of every live page. Index: ${absoluteUrl("/llms.txt", origin)}\n`;
  return finish([header, ...pages.map((p) => p.trim())].join("\n\n---\n\n"));
}
