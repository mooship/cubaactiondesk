// Checks the built site in dist/client: internal links and anchors, Markdown twins, llms.txt, sitemap,
// page basics, and missing spaces around links. Run after `npm run build`. Errors exit 1.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkOutput } from "../src/lib/output-check.ts";
import { siteUrl } from "../src/lib/site.ts";
import { DIST as dist, listDist } from "./dist.ts";

const origin = siteUrl().replace(/\/$/, "");

const files = new Map<string, string>();
for (const path of listDist(dist)) {
  files.set(path, /\.(html|md|txt|xml)$/.test(path) ? readFileSync(join(dist, path), "utf8") : "");
}

// Routes the Worker renders on demand: not files, but real pages. A live /act/<slug> is recognised by its Markdown twin.
const serverRoutes = [/^\/act$/, /^\/give$/, /^\/go\/[^/]+$/, /^\/api\//];

const issues = checkOutput({ origin, files, serverRoutes });
for (const issue of issues) console.log(`ERROR ${issue.where}: ${issue.message}`);
const pages = [...files.keys()].filter((f) => f.endsWith(".html")).length;
console.log(`${pages} pages checked, ${issues.length} problem(s)`);
process.exit(issues.length > 0 ? 1 : 0);
