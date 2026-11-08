# Cuba Action Desk SA

A website for South Africans who want to understand the US blockade of Cuba and do something about it. It has
ready-to-send emails and messages, short sourced explainers, and a list of aid organisations that have been checked.
The site does not store visitors' messages and never handles money. Visitors send messages from their own apps.

Live site (for now): https://cuba.timothybrits.co.za. Instagram: [@cubaactiondesk](https://www.instagram.com/cubaactiondesk/).

## What is in it

Act has message templates for an MP, DIRCO, newspapers and friends. Visitors fill in the blanks and send from their own
email app or WhatsApp. Learn has eight explainers with sources, other views and qualifications. Give lists organisations
that deliver aid; donations go straight to them through a plain redirect.

## Stack

- [Astro](https://astro.build) 7 on Cloudflare Workers with Static Assets. Content pages are prerendered. The Action Desk,
  Give and the API render on demand.
- Content is Markdown and YAML in `src/content`, validated by Zod schemas and by `npm run check:content`.
- Cloudflare D1 through Drizzle holds two tables: anonymous action counters and donation-link check results.
- CSS Modules and global tokens. No CSS framework and no client framework. The Action Desk script is about 2.2 KB gzipped (4.8 KB raw).
- TypeScript 7 compiles the project. Vitest runs the unit tests and Playwright runs the browser tests.

How it fits together, and why, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). What still has to be done by a person
before launch is in [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## Getting started

You need Node 24.22.1 or newer (24 and 26 are supported) and npm 11 or newer. `.node-version` says `24`, and `packageManager` pins npm 11.19.1 for Corepack. The lockfile must also install under npm 10, which Cloudflare Workers Builds uses (see AGENTS.md).

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
| `npm run test:coverage` | Unit tests with coverage of `src/lib`. Fails below 95% statements and branches.      |
| `npm run test:e2e`      | Browser tests and accessibility scans against the built Worker (Playwright and axe). |
| `npm run typecheck`     | Syncs Astro's types, then `tsc`, which checks `.astro` files too (see below).        |
| `npm run lint`          | Biome: lint, formatting and import order. `npm run lint:fix` fixes what it can.      |
| `npm run format`        | Biome's formatter, writing changes.                                                  |
| `npm run lint:ci`       | What CI runs: the same Biome checks, read-only.                                      |
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

Actions live in `src/content/actions/<slug>.md`: frontmatter plus the message template. An action can only be `live` if
its target has a verified contact (an address, a source page and a verification date).

Articles live in `src/content/articles/<slug>.md`. Put `[[source-id]]` after each claim. The numbers come from the order
of `sources` in the frontmatter. Every article needs a direct answer, counterarguments and a live related action.

Sources live in `src/content/sources/<id>.yaml`. Use only pages that were actually read.

Organisations live in `src/content/fundraisers/<id>.yaml`. One stays `approved: false` until all five checks on
`/give/how-we-vet` are met, and `npm run check:content` refuses `approved: true` otherwise. After approving one, run
`npm run build:links` so the weekly link checker tests it.

Write plainly, in short sentences a 13-year-old can follow. The Writing section of [AGENTS.md](AGENTS.md#writing) has the house style and lists what to avoid.

## Lint, format and type checking

[Biome](https://biomejs.dev) lints and formats the TypeScript, JavaScript, CSS and JSON, and lints the `.astro`
templates, including their accessibility rules. Its config is `biome.jsonc`. It leaves `src/content`, `docs`, Markdown,
YAML and generated files alone. Warnings fail the check.

Biome does not format `.astro` files. Its Astro formatter is still experimental, and with `compressHTML` on it changed
the rendered text: it joined "{SITE.name} is" into "SAis" and put spaces inside link text. It also leaves their import
order alone, because in a component that order is the order the CSS loads in.

TypeScript is pinned to `7.1.0-beta`, because content mappers need 7.1 or later.
`@astrojs/ts-content-mapper` (registered in `tsconfig.json`) lets `tsc` read `.astro` files, so component props and
frontmatter are type-checked with everything else. A mapper runs code from `node_modules`, which is why the typecheck
script passes `--runExternalCode`.

Lefthook runs on every commit: Biome formats the staged files, then lints and fixes them. Unit tests run separately and in
CI, never in the hook. Fix any failing check before committing; do not bypass the hooks.

## Deploying

Deployment goes through Cloudflare Workers Builds, so there are no Cloudflare secrets in this repository. The build
command applies D1 migrations before it builds. Step by step, with the dashboard settings that cannot be set from code, in
[docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## Contributing

Corrections, new organisations, recipients and code are all welcome. [CONTRIBUTING.md](.github/CONTRIBUTING.md) says how to help,
[CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md) sets out how we treat each other, and [SECURITY.md](.github/SECURITY.md) explains how to
report a vulnerability privately.

## Licence

Code is [MIT](LICENSE). Written content (articles, action templates, glossary) is
[CC BY 4.0](LICENSE-CONTENT): reuse it and credit Cuba Action Desk SA. The fonts, Big Shoulders Display and Source Serif 4,
are under the SIL Open Font License; see `src/assets/fonts`. Source documents and quotations belong to their publishers.
