// Fails when a page is over the performance budgets. Prerendered pages are read from dist/client.
// Server-rendered pages (/act/[slug], /give) are fetched when BUDGET_BASE_URL is set, for example
// a `wrangler dev` or preview URL. Worker CPU per request cannot be measured here: see docs/LAUNCH-CHECKLIST.md.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkPage, measurePage, type PageKind } from "../src/lib/budgets.ts";
import { listDist } from "./dist.ts";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist", "client");
const read = (path: string) => {
  const file = join(dist, path.replace(/^\//, ""));
  return existsSync(file) ? readFileSync(file) : undefined;
};

function kindOf(path: string): PageKind {
  if (path.startsWith("/learn")) return "learn";
  if (path === "/give") return "give";
  return path.startsWith("/act") ? "action" : "other";
}

const pages: { path: string; html: string }[] = [];
for (const name of listDist(dist)) {
  if (!name.endsWith(".html") || name === "404.html") continue;
  const path = `/${name.replace(/\.html$/, "")}`;
  pages.push({ path: path === "/index" ? "/" : path, html: readFileSync(join(dist, name), "utf8") });
}

const base = process.env.BUDGET_BASE_URL?.replace(/\/$/, "");
if (base) {
  // The sitemap lists the server-rendered pages: /act, /give and every live action.
  const sitemap = await (await fetch(`${base}/sitemap-0.xml`)).text();
  const serverPaths = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)]
    .map((m) => m[1] ?? "")
    .filter((path) => path === "/act" || path === "/give" || path.startsWith("/act/"));
  for (const path of serverPaths) {
    const res = await fetch(`${base}${path}`);
    pages.push({ path, html: await res.text() });
  }
} else {
  console.log("BUDGET_BASE_URL not set: skipping server-rendered pages (/act, /act/[slug], /give).");
}

let failed = 0;
for (const { path, html } of pages) {
  const m = measurePage(html, read);
  const problems = checkPage(kindOf(path), m);
  const kb = (n: number) => `${(n / 1024).toFixed(1)}`.padStart(5);
  console.log(
    `${problems.length > 0 ? "FAIL" : "ok  "} ${path.padEnd(38)} total ${kb(m.total)} KB  html ${kb(m.htmlGz)}  css ${kb(m.cssGz)}  fonts ${kb(m.fontBytes)}  js ${kb(m.jsGz)}`,
  );
  for (const p of problems) console.log(`       ${p}`);
  if (problems.length > 0) failed++;
}
console.log(`${pages.length} page(s), ${failed} over budget`);
process.exit(failed ? 1 : 0);
