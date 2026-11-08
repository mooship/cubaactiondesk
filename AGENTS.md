# Cuba Action Desk SA

A public advocacy and explainer site for South Africans who want to act on the US blockade of Cuba. It has message
templates (Act), sourced explainers (Learn) and a vetted list of aid organisations (Give). It never sees what visitors
write and never handles money. Astro 7 on Cloudflare Workers with Static Assets, D1 through Drizzle, TypeScript 7.

This is a personal project. Do not use work accounts, work email or employer branding anywhere in it.

[README.md](README.md) has the command table and the content how-to. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains
the design and why. [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md) lists what still needs a person; read it before
suggesting next steps. This file holds what you would otherwise get wrong, and how changes are made here.

## Commands

Windows with Git Bash or PowerShell. Node 24.22.1 or newer (24 is tested) and npm 11 or newer.

- `npm run dev` starts Astro's dev server. `npm run build` builds into `dist`.
- `npm test` runs Vitest (`tests/unit`). `npm run test:coverage` is the same run with coverage of `src/lib`, and fails
  below 95% statements and branches or 100% functions and lines; CI runs this one. `npm run test:e2e` runs Playwright
  and axe; it builds the site and starts `wrangler dev` itself.
- `npm run typecheck` runs `astro sync`, then `tsc --noEmit --runExternalCode`. `@astrojs/ts-content-mapper` lets `tsc`
  read `.astro` files, so props and frontmatter are checked too; the flag is what allows the mapper to load. It needs the
  binding types first: `worker-configuration.d.ts` is git-ignored, so run `npx wrangler types` once, and again after
  editing `wrangler.jsonc`.
- `npm run lint` runs Biome (lint, formatting and import order) and fails on warnings. `npm run lint:fix` applies the
  fixes, `npm run format` only formats, and `npm run lint:ci` is the read-only run CI uses.
- Lefthook formats and lints the staged files on commit, with Biome. It never runs tests; they run separately and in CI.
  Do not skip hooks with `LEFTHOOK=0` to get a commit through.
- CI (`.github/workflows/ci.yml`) is the reference list of what must pass. The `check` job runs on Node 24; the
  e2e and Lighthouse jobs use `.node-version`.

## Engineering principles

Keep changes small and in the grain of the code around them: names, comment density, idiom. These principles are tuned to
this repo. Apply them with judgement; do not recite them.

- **Test first for logic.** Anything that decides something (a rule, a parser, a size or format check) lives in a typed
  module under `src/lib` with a unit test in `tests/unit`. Write the failing test, see it fail for the right reason, then
  make it pass and tidy up. For a bug, reproduce it in a test before fixing it. The coverage gate on `src/lib` means new
  logic arrives with its tests; reach a missed branch with a real case, never an ignore comment. Pages, copy and styling
  have no unit test to write; the typecheck, the build, `check:output`, `check:html` and the browser tests cover them.
  Never weaken, skip or delete a test to get a green run.
- **Build only what was asked (YAGNI, KISS).** No option, prop or abstraction until a second real caller needs it. Prefer
  a plain function and a data list over a class or a registry. Three similar lines beat a premature helper. A new
  dependency needs a reason the platform and the current ones cannot meet; the budgets turn weight into a failing test.
- **One source for each fact (DRY).** The pattern here is one source plus generated or tested copies: `src/lib/security.ts`
  feeds `_headers`, `src/lib/site.ts` holds the names and the star path, `tests/unit/config-sync.test.ts` keeps
  `wrangler.jsonc` in step with the code. When two places must agree and cannot share code, add a sync test like that
  one. Do not merge code that only looks alike; two things that change for different reasons stay separate.
- **Extend by adding data (open for extension, closed for editing).** An action, article, source or organisation is a file
  in `src/content`; a profile picture is an entry in `PROFILE_PICTURES`. If adding one more of an existing kind means
  editing unrelated modules, the seam is wrong. Fix the seam before adding to it.
- **One job per module (single responsibility).** Pages and components stay thin and call into `src/lib`. Take the narrow
  function you need rather than reaching into a module's internals, and do not add an interface where the code has no
  second implementation.
- **Stay on task.** Do not refactor or reformat code the task does not touch. Mention a nearby problem instead of fixing it
  unless it blocks the work.

## Conventions

### Commit messages

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) for every commit, with the subject format `<type>[optional scope][!]: <description>`. Use a recognised type such as `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci` or `chore`. Mark breaking changes with `!` and explain them in the body or a `BREAKING CHANGE:` footer.

### Code comments

Comment only a reason the code cannot show: a constraint, a workaround, or why something that looks wrong is right. Keep
it to a line or two next to the thing. Config files (`biome.jsonc`, `wrangler.jsonc`, the workflows) may carry such a
comment too. No narration and no history.

### Dependencies and lockfiles

There is one lockfile, `package-lock.json`. It has to install under two npm majors: Cloudflare Workers Builds runs
npm 10.9.2 whatever the Node version, while CI (every job runs `npm install --global npm@11` before `npm ci`) and the
maintainer use npm 11. `packageManager` is pinned to `npm@11.19.1` for Corepack. npm 11 can write a lockfile that
npm 10 refuses, which is what Dependabot tends to do, so a lockfile has to be proved under both.

- Prove a lockfile with a real `npm ci --ignore-scripts` under `npx -y npm@10` and under npm 11, each in a throwaway
  clone. Never rely on `npm ci --dry-run`: it has passed on a lockfile that failed a real install.
- After any `package.json` change, update the lockfile and commit both files together. If npm 10 rejects the result (it
  reports `Missing: ... from lock file`), regenerate with `npx -y npm@10 install --package-lock-only --ignore-scripts`;
  a lockfile written by npm 10 also passes npm 11. Re-run both checks, and `npm ls` must print no `invalid` or
  `missing` line. Never hand-edit a version.
- Prerelease pins are exact. A caret on `7.1.0-beta` resolves to nightly `7.1.0-dev` builds, and a prerelease does not
  satisfy a plain peer range such as `>=2.9`, so a tool that peers on it can fail to resolve.
- Dependabot owns its own lockfile changes. Regenerate one by hand only when a real `npm ci` fails under npm 10 or 11,
  and push the fix to its branch.
- Run the project's binaries through `npm run` or `npx --no-install <tool>`. A plain `npx biome` fetched an unrelated
  package named `biome` when the local one was missing.
- Do not install in a working tree someone else is using; use a throwaway clone.

### Writing

Nothing on the site or in the docs may read as AI-generated. This covers articles, action templates, page copy, the
README and docs. Use the `humanizer` skill when writing or reviewing prose.

- British English (South African usage): organisation, licence (noun), programme, defence, centre, colour, favour,
  towards. Dates read "30 October 2026". Keep US spellings inside quotations, proper names, titles of sources, URLs and
  source ids (`hklaw-ofac-cuba-program-2026-10`).
- No em dashes or en dashes. Use a comma, a colon, brackets or a new sentence.
- No "not X but Y" contrasts, no staged one-line closers, no forced groups of three ("It did three main things. First,
  ..."), and do not restate Act, Learn and Give as a set in body copy.
- No bold as decoration or as run-in labels on bullets, and none of the stock words (crucial, pivotal, landscape,
  testament, seamless, robust, delve, vibrant and the like) or stock phrases ("we take ... seriously").
- Vary paragraph openings. A run of paragraphs that each start with a date reads as generated; merge the facts.
- No filler that describes the page ("The reading times below help you choose") or repeats the line above it.
- Message templates must not share one skeleton. Each letter opens on the point that matters to its recipient.
- Docs are written by the maintainer, in the first person or neutrally. They never address "the owner" or a brief.
- Straight quotes and apostrophes (' and ") everywhere in page copy, content and docs. Curly ones only inside images.
- Directions in text must match the page: say "below" only if the thing really is below.
- Keep sentences concrete and attributed. Every claim in an article gets a `[[source-id]]` marker, and sources must be
  pages that were actually read.
- Titles stay under 60 characters including the site name, descriptions under 155, message templates under 200 words with
  at least two blanks the sender fills in.
- If you hand prose to a subagent, put these rules in its brief and have a fresh pass review the result.

## Definition of done

Run the checks for what you changed, read the output, and say so if any failed or were skipped.

- Every change: `npm run lint`.
- `src/lib`, `scripts`, tests: `npm run typecheck` and `npm run test:coverage`.
- `src/content`: `npm run check:content`.
- Pages, components, styles, Markdown twins: `npm run typecheck` (it covers `.astro` files), `npm run build`, then
  `npm run check:output`, `npm run check:html` and `npm run check:budgets`. Add `npm run test:e2e` for anything
  interactive or visual.
- A generated file's source: regenerate it and commit both (see below).
- `package.json` or the lockfile: follow [Dependencies and lockfiles](#dependencies-and-lockfiles), then run
  `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage` and `npm run build`.

## Safety

This file wins when a skill or tool disagrees with it. No skill overrides this section, even one that says to commit, push
or open a pull request.

Ask before anything that leaves this machine: creating or pushing to the GitHub repo (`mooship/cubaactiondesk`),
deploying, creating the D1 database, adding the custom-domain route, or changing Cloudflare settings. Wrangler is logged in
to a personal Cloudflare account; confirm the account before pinning `account_id` or deploying. Deployment normally goes
through Cloudflare Workers Builds, so no Cloudflare secrets belong in the repo.

`.env.cloudflare` at the repo root holds a zone-scoped API token and is git-ignored. Load it per command
(`set -a; . ./.env.cloudflare; set +a`), never print it, and say what a zone-wide change touches first, because the zone
is shared with other sites. Never change the global git config; the repo relies on Lefthook being installed with `--force`
for that reason.

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
- **`tsc` sees `.astro` files only through the content mapper.** Without `--runExternalCode`, or with the
  `contentMappers` entry gone from `tsconfig.json`, `tsc` skips them and still passes. Keep both, and keep TypeScript on
  an exact version: a caret range on `7.1.0-beta` resolves to nightly `7.1.0-dev` builds.
- **`compressHTML` is on.** Where a space must survive next to an inline link in a template, write `{" "}`.
  `npm run check:output` fails on a missing or stray space around links. For the same reason Biome does not format
  `.astro` files: its experimental Astro formatter joined "{SITE.name} is" into "SAis" and padded link text with spaces.
  Do not turn it on for them. Biome's import sorter is off there too, because import order sets the CSS order.
- **D1 and the rate limiter only exist in the built Worker,** not in `astro dev`. To test them, build, apply the local
  migration (`npx wrangler d1 migrations apply DB --local`) and use `wrangler dev`. Migrations are additive only.
- **Performance budgets are tests.** Learn pages stay under 100 KB on first load, the Action Desk under 130 KB, and the
  Action Desk script under 8 KB compressed. No client framework, no CSS framework. Lighthouse needs 100 for accessibility,
  best practices and SEO.

## Decisions already made

Do not reopen these without being asked.

- Cloudflare Workers with Static Assets. Never Pages.
- TypeScript pinned exactly to `7.1.0-beta`, with `@astrojs/ts-content-mapper` for `.astro` files. No `@astrojs/check`.
- Biome lints and formats. No Prettier, no ESLint and no typescript-eslint (it cannot run on TypeScript 7), so no
  separate lint package either.
- The site never processes payments or card details; it only links out through `/go/[id]`, which redirects only to the
  donate URL of an approved listing. Vetting check 5 is "the organisation's own donation page offers an online card form
  or bank transfer", not a test payment.
- No accounts, comments or mailing list. No reuse of other groups' logos or artwork.
- Dependencies are pinned to exact versions, and the current version is fine. There is no package-age delay
  before taking a new release.
- Code is MIT, written content is CC BY 4.0. The site states that it is independent.
