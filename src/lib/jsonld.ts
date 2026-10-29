import { isoDate } from "./format.ts";
import { SITE, absoluteUrl } from "./site.ts";

type Origin = URL | string;

/** schema.org BreadcrumbList. `path` is a site path; the last item is the current page. */
export function breadcrumbList(items: { name: string; path: string }[], origin: Origin) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, origin),
    })),
  };
}

export interface ArticleLdInput {
  title: string;
  description: string;
  path: string;
  published: Date;
  modified: Date;
  /** URLs of the sources the article cites. */
  citations: string[];
}

/** schema.org Article with citations, free to read. */
export function articleLd(input: ArticleLdInput, origin: Origin) {
  const url = absoluteUrl(input.path, origin);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    datePublished: isoDate(input.published),
    dateModified: isoDate(input.modified),
    inLanguage: SITE.locale,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: SITE.name, url: absoluteUrl("/", origin) },
    publisher: { "@type": "Organization", name: SITE.name, url: absoluteUrl("/", origin) },
    citation: input.citations,
  };
}
