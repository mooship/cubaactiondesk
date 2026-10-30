# Cuba Action Desk SA

A public advocacy and explainer site for South Africans who want to act on the US blockade of Cuba. It has message
templates (Act), sourced explainers (Learn) and a vetted list of aid organisations (Give). It never sees what visitors
write and never handles money. Astro 7 on Cloudflare Workers with Static Assets, D1 through Drizzle, TypeScript 7.

This is a personal project. Do not use work accounts, work email or employer branding anywhere in it.

[README.md](README.md) has the command table and the content how-to. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains
the design and why. [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md) lists what still needs a person; read it before
suggesting next steps. This file holds what you would otherwise get wrong, and how changes are made here.

## Commands

Windows with Git Bash or PowerShell. Node 22.23.4 or newer.

- `npm test` runs Vitest (`tests/unit`). `npm run test:e2e` runs Playwright and axe; it builds the site and starts
  `wrangler dev` itself.
- `npm run typecheck` needs the binding types first. `worker-configuration.d.ts` is git-ignored, so run `npx wrangler types`
  once, and again after editing `wrangler.jsonc`.
- `npm run lint` needs `npm run lint:setup` once, because ESLint lives in its own package, `tools/lint`. That package pins
  TypeScript 6 because typescript-eslint cannot use TypeScript 7. The root `eslint.config.js` only re-exports it.
- Lefthook runs Prettier, ESLint and the unit tests on commit. Do not skip it with `LEFTHOOK=0` to get a commit through.
- CI (`.github/workflows/ci.yml`) is the reference list of what must pass.

## How to work here

Keep changes small and in the grain of the code around them: names, comment density, idiom. These principles are tuned to
this repo. Apply them with judgement; do not recite them.

- **Test first for logic.** Anything that decides something (a rule, a parser, a size or format check) lives in a typed
  module under `src/lib` with a unit test in `tests/unit`. Write the failing test, see it fail for the right reason, then
  make it pass. For a bug, reproduce it in a test before fixing it. Pages, copy and styling have no unit test to write;
  the build, `check:output`, `check:html` and the browser tests cover them.
- **Build only what was asked (YAGNI, KISS).** No option, hook or abstraction until a second real caller needs it. Prefer
  a plain function and a data list over a class or a registry. Three similar lines beat a premature helper. A new
  dependency needs a reason the platform and the current ones cannot meet; the budgets turn weight into a failing test.
- **One source for each fact (DRY).** The pattern here is one source plus generated or tested copies: `src/lib/security.ts`
  feeds `_headers`, `src/lib/site.ts` holds the names and the star path, `tests/unit/config-sync.test.ts` keeps
  `wrangler.jsonc` in step with the code. When two places must agree and cannot share code, add a sync test like that
  one. Do not merge code that only looks alike; two things that change for different reasons stay separate.
- **Extend by adding data (open for extension, closed for editing).** An action, article, source or organisation is a file
  in `src/content`; a profile picture is an entry in `PROFILE_PICTURES`. If adding one more of an existing kind means
  editing unrelated modules, the seam is wrong. Fix the seam before adding to it.
- **One job per module.** Pages and components stay thin and call into `src/lib`. Take the narrow function you need
  rather than reaching into a module's internals.
- **Stay on task.** Do not refactor or reformat code the task does not touch. Mention a nearby problem instead of fixing it
  unless it blocks the work.

## Done means

Run the checks for what you changed, read the output, and say so if any failed or were skipped.

- `src/lib`, `scripts`, tests: `npm run typecheck`, `npm test`, `npm run lint`.
- `src/content`: `npm run check:content`.
- Pages, components, styles, Markdown twins: `npm run build`, then `npm run check:output`, `npm run check:html` and
  `npm run check:budgets`. Add `npm run test:e2e` for anything interactive or visual.
- A generated file's source: regenerate it and commit both (see below).

## Things that break quietly

- **Generated files are committed and drift tests fail on them.** `public/_headers` (`npm run build:headers`),
  `workers/link-checker/links.generated.json` (`npm run build:links`), icons and images (`npm run build:icons`,
  `npm run build:images`), profile pictures (`npm run build:avatars`), and `migrations/` (`npm run db:generate`). Change the source, regenerate, commit both.
- **Security headers have one source,** `src/lib/security.ts`. Edit it and rebuild `_headers`; never edit `_headers` by hand.
- **`wrangler.jsonc` `run_worker_first` lists the routes the Worker handles.** A server-rendered route missing from it
  returns the static 404 page. Adding a route under `src/pages` that renders on demand means adding it there too.
- **Cross-collection content rules (`src/lib/content-check.ts`) run in tests, CI and `check:content`, not in `astro build`.**
  This is deliberate: some rules depend on today's date, and a calendar must not break a deploy.
- **A live action needs a target with an address, a source page and a verification date.** An organisation stays
  `approved: false` until all five checks on `/give/how-we-vet` are met, and `check:content` refuses otherwise. After
  approving one, run `npm run build:links`.
- **Whatever a page imports is bundled into the Worker.** Node-only modules such as `sharp` break the build there. Keep
  them in `scripts/` or in a file that only scripts and tests import, as `src/lib/profile-pictures-render.ts` does.
- **`tsc` does not read `.astro` files.** Put logic that matters in typed `.ts` modules under `src/lib`; Astro frontmatter
  is covered only by ESLint, the build and the browser tests.
- **`compressHTML` is on.** Where a space must survive next to an inline link in a template, write `{" "}`.
  `npm run check:output` fails on a missing or stray space around links.
- **D1 and the rate limiter only exist in the built Worker,** not in `astro dev`. To test them, build, apply the local
  migration (`npx wrangler d1 migrations apply DB --local`) and use `wrangler dev`. Migrations are additive only.
- **Performance budgets are tests.** Learn pages stay under 100 KB on first load, the Action Desk under 130 KB, and the
  Action Desk script under 8 KB compressed. No client framework, no CSS framework. Lighthouse needs 100 for accessibility,
  best practices and SEO.

## Decisions already made

Do not reopen these without being asked.

- Cloudflare Workers with Static Assets. Never Pages.
- TypeScript 7. No `@astrojs/check`.
- The site never processes payments or card details; it only links out through `/go/[id]`, which redirects only to the
  donate URL of an approved listing. Vetting check 5 is "the organisation's own donation page offers an online card form
  or bank transfer", not a test payment.
- No accounts, comments or mailing list. No reuse of other groups' logos or artwork.
- Dependencies are pinned to exact versions, and the current version is fine. The usual 7-day package-age rule does not
  apply to this project.
- Code is MIT, written content is CC BY 4.0. The site states that it is independent.

## Writing

Nothing on the site or in the docs may read as AI-generated. This covers articles, action templates, page copy, the
README and docs. Use the `humanizer` skill when writing or reviewing prose.

- No em dashes or en dashes.
- No "not X but Y" contrasts, no staged one-line closers, no forced groups of three.
- No bold as decoration, and none of the stock words (crucial, pivotal, landscape, testament and the like).
- Keep sentences concrete and attributed. Every claim in an article gets a `[[source-id]]` marker, and sources must be
  pages that were actually read.
- Titles stay under 60 characters including the site name, descriptions under 155, message templates under 200 words with
  at least two blanks the sender fills in.
- If you hand prose to a subagent, put these rules in its brief and have a fresh pass review the result.

## External actions

Ask before anything that leaves this machine: creating or pushing to the GitHub repo (`mooship/cubaactiondesk`),
deploying, creating the D1 database, adding the custom-domain route, or changing Cloudflare settings. Wrangler is logged in
to a personal Cloudflare account; confirm the account before pinning `account_id` or deploying. Deployment normally goes
through Cloudflare Workers Builds, so no Cloudflare secrets belong in the repo.

`.env.cloudflare` at the repo root holds a zone-scoped API token and is git-ignored. Load it per command
(`set -a; . ./.env.cloudflare; set +a`), never print it, and say what a zone-wide change touches first, because the zone
is shared with other sites. Never change the global git config; the repo relies on Lefthook being installed with `--force`
for that reason.
