# Cuba Action Desk SA

A website for South Africans who want to understand the US blockade of Cuba and do something about it. It has
ready-to-send emails and messages, short sourced explainers, and a list of aid organisations that have been checked.
The site never sees what visitors write and never handles money.

Live site (for now): https://cuba.timothybrits.co.za. Instagram: [@cubaactiondesk](https://www.instagram.com/cubaactiondesk/).

## What is in it

| Section | What it does                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Act     | Templates for an MP, DIRCO, newspapers and friends. Visitors fill in the blanks and send from their own email app or WhatsApp. |
| Learn   | Eight explainers. Every claim links to a source, and every article ends with the strongest counterargument.                    |
| Give    | Organisations that deliver aid. Donations go straight to them through a plain redirect.                                        |

## Stack

- [Astro](https://astro.build) 7 on Cloudflare Workers with Static Assets. Content pages are prerendered. The Action Desk,
  Give and the API render on demand.
- Content is Markdown and YAML in `src/content`, validated by Zod schemas and by `npm run check:content`.
- Cloudflare D1 through Drizzle holds two tables: anonymous action counters and donation-link check results.
- CSS Modules and global tokens. No CSS framework and no client framework. The Action Desk script is about 2 KB.
- TypeScript 7 compiles the project. Vitest runs the unit tests and Playwright runs the browser tests.

How it fits together, and why, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). What still has to be done by a person
before launch is in [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## Getting started

You need Node 22.23.4 or newer (24 is what CI uses).

```sh
npm install        # also installs the git hooks
npm run dev        # Astro dev server
```

The Cloudflare bindings (D1, the rate limiter) only exist in the built Worker. To run the real thing locally:

```sh
npm run build
npx wrangler d1 migrations apply DB --local
npx wrangler dev --port 8799
```

## Commands

| Command                 | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm test`              | Unit tests (Vitest).                                                                 |
| `npm run test:e2e`      | Browser tests and accessibility scans against the built Worker (Playwright and axe). |
| `npm run typecheck`     | Syncs Astro's types, then `tsc --noEmit`.                                            |
| `npm run lint`          | ESLint. `npm run lint:fix` fixes what it can.                                        |
| `npm run format`        | Prettier, writing changes. `npm run format:check` only checks.                       |
| `npm run lint:ci`       | What CI runs: installs the lint tools, checks formatting, then lints.                |
| `npm run check:content` | Cross-collection content rules. Run it after editing anything in `src/content`.      |
| `npm run build`         | Production build into `dist`.                                                        |
| `npm run check:output`  | Links, anchors, Markdown twins, `llms.txt`, sitemap and spacing in the built pages.  |
| `npm run check:budgets` | Performance budgets. Set `BUDGET_BASE_URL` to include the server-rendered pages.     |
| `npm run check:html`    | HTML validity.                                                                       |
| `npm run lhci`          | Lighthouse, mobile. `npm run lhci:desktop` runs the desktop profile.                 |

Generated files are committed and a test or CI step fails if they drift: `public/_headers`
(`npm run build:headers`), `workers/link-checker/links.generated.json` (`npm run build:links`),
the icons and images (`npm run build:icons`, `npm run build:images`), the profile pictures
(`npm run build:avatars`) and the migrations in `migrations/`
(`npm run db:generate`).

## Adding content

All of it is files. After any change, run `npm run check:content`; it explains what is wrong.

- **An action** is `src/content/actions/<slug>.md`: frontmatter plus the message template. An action can only be
  `live` if its target has a verified contact (an address, a source page and a verification date).
- **An article** is `src/content/articles/<slug>.md`. Put `[[source-id]]` after each claim. The numbers come from the
  order of `sources` in the frontmatter. Every article needs a direct answer, counterarguments and a live related action.
- **A source** is `src/content/sources/<id>.yaml`. Use only pages that were actually read.
- **An organisation** is `src/content/fundraisers/<id>.yaml`. It stays `approved: false` until all five checks on
  `/give/how-we-vet` are met. `npm run check:content` refuses to accept `approved: true` otherwise. After approving one, run
  `npm run build:links` so the weekly link checker tests it.

Write plainly. No page should read as if a machine wrote it.

## Lint and format

Prettier formats everything except `src/content`, `docs` and generated files. ESLint uses the flat config with
typescript-eslint, `eslint-plugin-astro` (with its accessibility rules), Unicorn, and the JSON, Markdown and CSS language
plugins.

ESLint lives in its own package, `tools/lint`, because typescript-eslint needs TypeScript's JavaScript API and
TypeScript 7 does not have one. That package pins TypeScript 6 while the site compiles with 7. `npm run lint:ci` installs it.
The root `eslint.config.js` re-exports the real config so editors find it.

Lefthook runs on every commit: Prettier (writing), ESLint (fixing) and the unit tests. Skip it once with
`LEFTHOOK=0 git commit`.

## Deploying

Deployment goes through Cloudflare Workers Builds, so there are no Cloudflare secrets in this repository. The build
command applies D1 migrations before it builds. Step by step, with the dashboard settings that cannot be set from code, in
[docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## Contributing

Corrections, new organisations, recipients and code are all welcome. [CONTRIBUTING.md](CONTRIBUTING.md) says how to help,
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) sets out how we treat each other, and [SECURITY.md](SECURITY.md) explains how to
report a vulnerability privately.

## Licence

Code is [MIT](LICENSE). Written content (articles, action templates, glossary) is
[CC BY 4.0](LICENSE-CONTENT): reuse it and credit Cuba Action Desk SA. Fonts come from Fontsource under their own open
licences. Source documents and quotations belong to their publishers.
