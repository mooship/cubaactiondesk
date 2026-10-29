import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  actionSchema,
  articleSchema,
  fundraiserSchema,
  glossarySchema,
  sourceSchema,
  targetSchema,
} from "./content/schemas.ts";

const base = "./src/content";

export const collections = {
  actions: defineCollection({
    loader: glob({ pattern: "*.md", base: `${base}/actions` }),
    schema: actionSchema,
  }),
  articles: defineCollection({
    loader: glob({ pattern: "*.md", base: `${base}/articles` }),
    schema: articleSchema,
  }),
  targets: defineCollection({
    loader: glob({ pattern: "*.yaml", base: `${base}/targets` }),
    schema: targetSchema,
  }),
  fundraisers: defineCollection({
    loader: glob({ pattern: "*.yaml", base: `${base}/fundraisers` }),
    schema: fundraiserSchema,
  }),
  sources: defineCollection({
    loader: glob({ pattern: "*.yaml", base: `${base}/sources` }),
    schema: sourceSchema,
  }),
  glossary: defineCollection({
    loader: glob({ pattern: "*.yaml", base: `${base}/glossary` }),
    schema: glossarySchema,
  }),
};
