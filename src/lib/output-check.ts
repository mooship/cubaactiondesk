import { findGluedInline } from "./html-check.ts";
import type { Issue } from "./content-check.ts";
import { DESCRIPTION_MAX, TITLE_MAX } from "./site.ts";

/** The built site, as files relative to dist/client, plus the routes the Worker renders on demand. */
export interface OutputSite {
  origin: string;
  files: Map<string, string>;
  serverRoutes: RegExp[];
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
/** Search engines measure the visible text, so an escaped apostrophe counts once. */
const decodeEntities = (text: string) => text.replaceAll(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e);

function stripOrigin(url: string, origin: string): string | null {
  return url.startsWith(origin) ? url.slice(origin.length) || "/" : null;
}

/** A site path without its trailing slash; the root stays "/". */
const trimSlash = (path: string) => path.replace(/\/$/, "") || "/";

/** Does a site path resolve to a file or a server route? */
function resolves(site: OutputSite, rawPath: string): boolean {
  const path = trimSlash(rawPath);
  if (site.serverRoutes.some((r) => r.test(path))) return true;
  // /act/<slug> is rendered on demand, but a live action always has a Markdown twin in the build.
  if (/^\/act\/[^/]+$/.test(path) && site.files.has(`${path.slice(1)}.md`)) return true;
  const candidates =
    path === "/" ? ["index.html"] : [`${path.slice(1)}.html`, `${path.slice(1)}/index.html`, path.slice(1)];
  return candidates.some((f) => site.files.has(f));
}

function pageFor(site: OutputSite, rawPath: string): string | undefined {
  const path = trimSlash(rawPath);
  return path === "/"
    ? site.files.get("index.html")
    : (site.files.get(`${path.slice(1)}.html`) ?? site.files.get(`${path.slice(1)}/index.html`));
}

const escapeRegExp = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const hasId = (html: string, id: string) => new RegExp(String.raw`\sid=["']${escapeRegExp(id)}["']`).test(html);

/** Checks the built output the way a visitor, a crawler and an AI reader would meet it. */
export function checkOutput(site: OutputSite): Issue[] {
  const issues: Issue[] = [];
  const error = (where: string, message: string) => issues.push({ level: "error", where, message });
  const pages = [...site.files].filter(([name]) => name.endsWith(".html"));

  for (const [name, html] of pages) {
    const isNotFound = name === "404.html";

    // Page basics.
    if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) error(name, "needs exactly one h1");
    if (!/<html[^>]*\slang=["']en-ZA["']/.test(html)) error(name, 'html needs lang="en-ZA"');
    const title = decodeEntities(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "");
    if (title.length === 0 || title.length > TITLE_MAX)
      error(name, `title is ${title.length} characters (limit ${TITLE_MAX})`);
    const description = decodeEntities(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "");
    if (description.length === 0 || description.length > DESCRIPTION_MAX) {
      error(name, `description is ${description.length} characters (limit ${DESCRIPTION_MAX})`);
    }
    if (!isNotFound && !new RegExp(`<link rel="canonical" href="${site.origin}[^"]*"`).test(html)) {
      error(name, "needs an absolute canonical URL");
    }
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      if (!/\salt=/.test(img)) error(name, `image without alt text: ${img.slice(0, 60)}`);
    }
    for (const glued of findGluedInline(html)) error(name, `missing space next to a link or emphasis: "${glued}"`);

    // Internal links and anchors.
    for (const match of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
      const href = match[1]!;
      if (!href.startsWith("/") && !href.startsWith("#")) continue;
      if (href.startsWith("//")) continue;
      const [rawPath = "", hash] = href.split("#") as [string, string | undefined];
      const path = rawPath.split("?", 1)[0] || "";
      if (path === "") {
        if (hash && !hasId(html, hash)) error(name, `anchor #${hash} does not exist on this page`);
        continue;
      }
      if (/\.(png|svg|ico|xml|txt|md|webmanifest)$/.test(path)) {
        if (!site.files.has(path.slice(1))) error(name, `link to missing file ${path}`);
        continue;
      }
      if (!resolves(site, path)) {
        error(name, `broken internal link ${href}`);
      } else if (hash) {
        const target = pageFor(site, path);
        if (target && !hasId(target, hash)) error(name, `link ${href}: #${hash} does not exist on ${path}`);
      }
    }
  }

  // Markdown twins: every article, every live action and Give.
  const sitemap = site.files.get("sitemap-0.xml") ?? "";
  const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => stripOrigin(m[1]!, site.origin) ?? m[1]!,
  );
  const articles = [...site.files.keys()].filter((f) => /^learn\/[^/]+\.html$/.test(f)).map((f) => f.slice(6, -5));
  const actions = sitemapPaths.filter((p) => /^\/act\/[^/]+$/.test(p)).map((p) => p.slice(5));
  for (const slug of articles)
    if (!site.files.has(`learn/${slug}.md`)) error(`learn/${slug}`, "missing Markdown twin learn/" + slug + ".md");
  for (const slug of actions)
    if (!site.files.has(`act/${slug}.md`)) error(`act/${slug}`, "missing Markdown twin act/" + slug + ".md");
  if (!site.files.has("give.md")) error("give", "missing Markdown twin give.md");

  // Sitemap entries must resolve.
  for (const path of sitemapPaths) if (!resolves(site, path)) error("sitemap", `entry does not resolve: ${path}`);

  // llms.txt: lists every live article and action, and every link resolves.
  const llms = site.files.get("llms.txt");
  if (llms === undefined) {
    error("llms.txt", "missing");
  } else {
    const links = [...llms.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]!);
    for (const url of links) {
      const path = stripOrigin(url, site.origin);
      if (path === null) continue;
      if (!resolves(site, path) && !site.files.has(path.slice(1))) error("llms.txt", `link does not resolve: ${url}`);
    }
    for (const slug of articles)
      if (!llms.includes(`/learn/${slug}.md`)) error("llms.txt", `does not list article ${slug}`);
    for (const slug of actions)
      if (!llms.includes(`/act/${slug}.md`)) error("llms.txt", `does not list action ${slug}`);
  }

  return issues;
}
