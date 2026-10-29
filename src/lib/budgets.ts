import { gzipSync } from "node:zlib";

/** The performance budgets. Sizes are compressed (gzip, which is stricter than Brotli). */
const KB = 1024;
export const BUDGETS = {
  learnTotal: 100 * KB,
  actionTotal: 130 * KB,
  html: 20 * KB,
  css: 12 * KB,
  fonts: 60 * KB,
  actionJs: 8 * KB,
} as const;

export type PageKind = "learn" | "give" | "action" | "other";

export interface Measurement {
  htmlGz: number;
  /** Compressed size of all inlined <style> blocks. */
  cssGz: number;
  /** Fonts are already compressed (woff2), so raw bytes. */
  fontBytes: number;
  jsGz: number;
  scripts: string[];
  /** First-party assets the page uses that could not be read. */
  missing: string[];
  /** First-load transfer: HTML + fonts + scripts. */
  total: number;
}

const gz = (data: string | Buffer) => gzipSync(data, { level: 9 }).length;

/** Fonts and first-party scripts a page loads. The Cloudflare analytics beacon is third party and not counted. */
export function referencedAssets(html: string): { fonts: string[]; scripts: string[] } {
  const fonts = new Set<string>();
  for (const m of html.matchAll(/(?:href=["']|url\()(\/[^"')\s]+\.woff2)/g)) fonts.add(m[1]!);
  const scripts = new Set<string>();
  for (const m of html.matchAll(/<script\b[^>]*\ssrc=["'](\/[^"']+)["']/g)) scripts.add(m[1]!);
  return { fonts: [...fonts], scripts: [...scripts] };
}

/** Follows `import "./x.js"` and `from "./x.js"` so shared chunks are counted too. */
function withImports(path: string, read: (p: string) => Buffer | undefined, seen = new Set<string>()): Set<string> {
  if (seen.has(path)) return seen;
  seen.add(path);
  const source = read(path)?.toString("utf8") ?? "";
  for (const m of source.matchAll(/(?:from|import)\s*["'](\.\/[^"']+\.js)["']/g)) {
    const next = path.replace(/[^/]+$/, "") + m[1]!.slice(2);
    withImports(next, read, seen);
  }
  return seen;
}

export function measurePage(html: string, read: (path: string) => Buffer | undefined): Measurement {
  const { fonts, scripts: entry } = referencedAssets(html);
  const missing: string[] = [];

  let fontBytes = 0;
  for (const font of fonts) {
    const data = read(font);
    if (data) fontBytes += data.length;
    else missing.push(font);
  }

  const scripts = new Set<string>();
  for (const e of entry) for (const s of withImports(e, read)) scripts.add(s);
  let jsGz = 0;
  for (const script of scripts) {
    const data = read(script);
    if (data) jsGz += gz(data);
    else missing.push(script);
  }

  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const htmlGz = gz(html);
  return { htmlGz, cssGz: gz(css), fontBytes, jsGz, scripts: [...scripts], missing, total: htmlGz + fontBytes + jsGz };
}

const kb = (bytes: number) => `${(bytes / KB).toFixed(1)} KB`;

/** Budget breaches for one page. Empty means it passes. */
export function checkPage(kind: PageKind, m: Measurement): string[] {
  const problems: string[] = [];
  const over = (label: string, value: number, limit: number) => {
    if (value > limit) problems.push(`${label} is ${kb(value)}, over the ${kb(limit)} budget`);
  };
  over("total transfer", m.total, kind === "action" ? BUDGETS.actionTotal : BUDGETS.learnTotal);
  over("HTML (compressed)", m.htmlGz, BUDGETS.html);
  over("inlined CSS (compressed)", m.cssGz, BUDGETS.css);
  over("fonts", m.fontBytes, BUDGETS.fonts);
  if (kind === "action") over("Action Desk JavaScript (compressed)", m.jsGz, BUDGETS.actionJs);
  else if ((kind === "learn" || kind === "give") && m.scripts.length > 0) {
    problems.push(`first-party JavaScript is not allowed on this page (${m.scripts.join(", ")})`);
  }
  for (const path of m.missing) problems.push(`asset not found: ${path}`);
  return problems;
}
