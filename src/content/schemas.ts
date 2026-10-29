import { z } from "astro/zod";
import { DESCRIPTION_MAX } from "../lib/site.ts";
import { SLUG, SLUG_MAX_LENGTH } from "../lib/slug.ts";

/**
 * Single-entry shape only. Rules that span collections (live action needs a
 * verified target, every source exists, staleness) live in
 * src/lib/content-check.ts so the calendar can never break a production build.
 */

const slug = z.string().regex(SLUG, "lowercase words joined by hyphens").max(SLUG_MAX_LENGTH);
const date = z.coerce.date();
const nullableDate = z.coerce.date().nullable().default(null);
const httpsUrl = z.string().url().startsWith("https://", "must be https");

export const status = z.enum(["draft", "live", "retired"]);
export const channel = z.enum(["email", "letter", "whatsapp", "social"]);

/** Where a source comes from, so readers see what kind of source it is. */
export const sourceOrigin = z.enum([
  "un",
  "us-government",
  "sa-government",
  "cuban-government",
  "academic",
  "news",
  "ngo",
]);

export const placeholderSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  hint: z.string().optional(),
  /** identity: name, town. own_words: the sender writes it. target: facts about the recipient, such as their MP's name. */
  kind: z.enum(["identity", "own_words", "target"]),
  multiline: z.boolean().default(false),
});

export const actionSchema = z.object({
  slug,
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(DESCRIPTION_MAX),
  /** Three short lines shown before the template: what this is, who gets it, why. */
  context: z.array(z.string().min(1)).min(1).max(3),
  target: slug,
  channel,
  timeMinutes: z.number().int().min(1).max(30),
  subject: z.string().optional(),
  placeholders: z.array(placeholderSchema),
  /** Learn article this action shares or points to; its URL fills the reserved `{link}` placeholder. */
  shareArticle: slug.optional(),
  /** Public path of an own-made image to copy or save alongside a social post. */
  image: z.string().startsWith("/").optional(),
  imageAlt: z.string().optional(),
  sources: z.array(slug).default([]),
  /** Shown on the home page. The first featured live action wins. */
  featured: z.boolean().default(false),
  status,
  reviewed: date,
});

/** One recipient the sender can choose, such as a single newspaper's letters desk. */
export const contactOptionSchema = z.object({
  id: slug,
  name: z.string().min(1),
  address: z.string().nullable().default(null),
  postal: z.string().nullable().default(null),
  sourceUrl: httpsUrl.nullable().default(null),
  lastVerified: nullableDate,
  /** Anything the sender should know, such as a word limit. */
  note: z.string().optional(),
});

export const targetSchema = z.object({
  id: slug,
  name: z.string().min(1),
  channel,
  /** Whether the site must know a contact address for this target. False when the sender supplies it. */
  addressRequired: z.boolean().default(true),
  address: z.string().nullable().default(null),
  postal: z.string().nullable().default(null),
  /** Where the sender looks up the address, for targets such as "your MP". */
  lookupUrl: httpsUrl.optional(),
  sourceUrl: httpsUrl.nullable().default(null),
  lastVerified: nullableDate,
  /** Several possible recipients. When present, each is verified on its own and only verified ones are shown. */
  options: z.array(contactOptionSchema).default([]),
  notes: z.string().optional(),
});

export const articleSchema = z.object({
  title: z.string().min(1).max(70),
  summary: z.string().min(1).max(DESCRIPTION_MAX),
  /** The two or three sentence direct answer the article opens with. */
  answer: z.string().min(1),
  published: date,
  reviewed: date,
  /** Ordered. `[[id]]` markers are numbered by position in this list. */
  sources: z.array(slug).min(1),
  relatedActions: z.array(slug).default([]),
  /** "Main counterarguments" box. Plain text; `[[id]]` markers allowed. */
  counterarguments: z.array(z.string().min(1)).default([]),
  status,
});

export const fundraiserSchema = z.object({
  id: slug,
  name: z.string().min(1),
  country: z.string().min(1),
  category: z.enum(["solidarity", "humanitarian", "faith-based"]),
  website: httpsUrl,
  donateUrl: httpsUrl,
  registration: z
    .object({ number: z.string().min(1), body: z.string().min(1), url: httpsUrl.optional() })
    .nullable()
    .default(null),
  delivers: z.string().min(1),
  howMoneyReaches: z.string().nullable().default(null),
  recipientsInCuba: z.string().nullable().default(null),
  activeSince: nullableDate,
  /** id of an already-listed organisation that runs this one (criterion 3). */
  runBy: slug.optional(),
  evidence: z.array(z.object({ label: z.string().min(1), url: httpsUrl })).default([]),
  /**
   * How a South African donor can pay from abroad, as shown on the organisation's own donation page:
   * an online card form (South African Visa and Mastercard cards work internationally) or bank transfer.
   * We do not make test payments. "unconfirmed" until someone has read the donation page.
   */
  onlinePayment: z.enum(["card", "bank-transfer", "unconfirmed"]).default("unconfirmed"),
  paymentNotes: z.string().optional(),
  approved: z.boolean().default(false),
  lastVerified: nullableDate,
});

export const sourceSchema = z.object({
  id: slug,
  title: z.string().min(1),
  publisher: z.string().min(1),
  origin: sourceOrigin,
  url: httpsUrl,
  published: nullableDate,
  accessed: date,
  /** Wayback Machine snapshot. Looked up read-only; never created by us. */
  archiveUrl: httpsUrl.nullable().default(null),
});

export const glossarySchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1).max(400),
  sources: z.array(slug).default([]),
});

export type ActionData = z.infer<typeof actionSchema>;
export type TargetData = z.infer<typeof targetSchema>;
export type ContactOptionData = z.infer<typeof contactOptionSchema>;
export type ArticleData = z.infer<typeof articleSchema>;
export type FundraiserData = z.infer<typeof fundraiserSchema>;
export type SourceData = z.infer<typeof sourceSchema>;
export type GlossaryData = z.infer<typeof glossarySchema>;
