export const SITE = {
  name: "Cuba Action Desk SA",
  shortName: "Cuba Action Desk",
  tagline: "Understand the US blockade of Cuba, and do something about it from South Africa.",
  instagram: "https://www.instagram.com/cubaactiondesk/",
  instagramHandle: "@cubaactiondesk",
  repo: "https://github.com/mooship/cubaactiondesk",
  // Must exist (Cloudflare Email Routing) before launch: see docs/LAUNCH-CHECKLIST.md.
  contactEmail: "hello@cubaactiondesk.org.za",
  locale: "en-ZA",
} as const;

export const NAV_ITEMS = [
  { label: "Act", href: "/act", icon: "act" },
  { label: "Learn", href: "/learn", icon: "learn" },
  { label: "Give", href: "/give", icon: "give" },
  { label: "About", href: "/about", icon: "about" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];

/** "Page title, Cuba Action Desk SA", except the home page which uses the bare name. */
export function pageTitle(title?: string): string {
  return title ? `${title}, ${SITE.name}` : SITE.name;
}

/** Absolute URL on the public origin. `origin` is `Astro.site`. */
export function absoluteUrl(path: string, origin: URL | string): string {
  return new URL(path, origin).href;
}

/**
 * Clean public path. Builds use `format: "file"`, so a prerendered page can
 * report "/index.html" or "/learn/x.html"; the public URL has neither.
 */
export function normalizePath(pathname: string): string {
  const clean = pathname.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
  if (clean === "" || clean === "/") return "/";
  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

/** True when `pathname` is `href` or sits under it ("/act/x" is under "/act"). */
export function isCurrent(pathname: string, href: string): boolean {
  const path = normalizePath(pathname);
  return path === href || path.startsWith(`${href}/`);
}

/** The public origin when SITE_URL is not set. One place to change when the project moves to its own domain. */
const DEFAULT_SITE_URL = "https://cuba.timothybrits.co.za";

/** The public origin for builds and scripts: SITE_URL if set, otherwise the default. */
export const siteUrl = (): string => process.env.SITE_URL ?? DEFAULT_SITE_URL;

/** Search results cut a page title off at about 60 characters, including ", Cuba Action Desk SA". */
export const TITLE_MAX = 60;
/** ...and a description at about 155. */
export const DESCRIPTION_MAX = 155;

/** The five-point star of the logo, in a 32 x 32 box. */
export const STAR_PATH =
  "M16 7 18.116 13.088 24.559 13.219 19.424 17.112 21.29 23.281 16 19.6 10.71 23.281 12.576 17.112 7.441 13.219 13.884 13.088Z";
