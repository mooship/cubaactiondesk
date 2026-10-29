import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { ZodType } from "astro/zod";
import {
  actionSchema,
  articleSchema,
  fundraiserSchema,
  glossarySchema,
  sourceSchema,
  targetSchema,
} from "../content/schemas.ts";
import type { ContentSet, Entry, Issue } from "./content-check.ts";

/** Node-only loader for CI and tests. The site itself reads content through Astro's collections. */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function listFiles(dir: string, extensions: string[]): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => extensions.includes(extname(name)) && !name.startsWith("_"))
        .toSorted((a, b) => a.localeCompare(b))
    : [];
}

function load<T>(
  root: string,
  collection: string,
  extensions: string[],
  schema: ZodType<T>,
  issues: Issue[],
): Entry<T>[] {
  const dir = join(root, collection);
  const entries: Entry<T>[] = [];
  for (const file of listFiles(dir, extensions)) {
    const id = basename(file, extname(file));
    const where = `${collection}/${file}`;
    const raw = readFileSync(join(dir, file), "utf8");
    let rawData: unknown;
    let body: string | undefined;
    try {
      if (extname(file) === ".md") {
        const match = FRONTMATTER.exec(raw);
        if (!match) {
          issues.push({ level: "error", where, message: "missing YAML frontmatter" });
          continue;
        }
        rawData = parseYaml(match[1] ?? "");
        body = match[2] ?? "";
      } else {
        rawData = parseYaml(raw);
      }
    } catch (error) {
      issues.push({ level: "error", where, message: `invalid YAML: ${(error as Error).message}` });
      continue;
    }
    const result = schema.safeParse(rawData);
    if (!result.success) {
      for (const problem of result.error.issues) {
        issues.push({ level: "error", where, message: `${problem.path.join(".") || "(root)"}: ${problem.message}` });
      }
      continue;
    }
    entries.push({ id, data: result.data, ...(body !== undefined && { body }) });
  }
  return entries;
}

/** Reads and schema-validates every content file. Problems come back as issues, never thrown. */
export function loadContent(root: string): { set: ContentSet; issues: Issue[] } {
  const issues: Issue[] = [];
  const set: ContentSet = {
    actions: load(root, "actions", [".md"], actionSchema, issues),
    articles: load(root, "articles", [".md"], articleSchema, issues),
    targets: load(root, "targets", [".yaml"], targetSchema, issues),
    fundraisers: load(root, "fundraisers", [".yaml"], fundraiserSchema, issues),
    sources: load(root, "sources", [".yaml"], sourceSchema, issues),
    glossary: load(root, "glossary", [".yaml"], glossarySchema, issues),
  };
  return { set, issues };
}

/** The site's own content folder. `fileURLToPath` keeps this right on Windows and when loaded through Astro's config. */
export const CONTENT_DIR = fileURLToPath(new URL("../content", import.meta.url));

export const loadSiteContent = () => loadContent(CONTENT_DIR);
