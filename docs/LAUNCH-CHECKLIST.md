# Launch checklist

Everything here needs a person, an account or a live deployment, so it cannot be done from the code. The code, the tests
and the content checks are finished and pass locally (see the README for the commands). Tick items off as you go.

## 1. Decisions only the owner can make

- [ ] **Cuba Vive / Cuba Solidarity Campaign.** You approved it, but check 1 of the vetting rules (a registration number)
      cannot be met: Companies House and the Charity Commission show no such body, and its own pages name no legal entity.
      Either ask the campaign for its legal status and add it, or decide to list it anyway. If you do, the rule in
      `src/lib/content-check.ts` has to allow a written exception; do not just set `approved: true`, because the content check
      refuses it.
- [ ] **Cuba Solidarity Now (the South African option).** Not approved, and I recommend waiting. Its NPC number could not be
      checked (the CIPC search needs a login), it launched in February 2026 so it is under 12 months old, and its delivery
      claims have no dates or named Cuban recipients. Re-check it in 2027.
- [x] **mediCuba-Suisse.** Approved. Its own annual report says some banks refused transfers that named "mediCuba", so a
      payment from South Africa could be blocked; the listing says to ask the bank first.
- [ ] **Catholic Relief Services.** Removed from the site at your request (`approved: false`). Its file and notes stay in
      case you want it back: the page funds Cuba, Haiti and Jamaica together, and its large Cuba programme is paid for by a
      US government award.
- [ ] **Global Health Partners.** Approved. The donate page is a year-end campaign page (`/sutures/`); check it again after
      the new year.
- [x] **The responsible party under POPIA.** Timothy Brits, named on the privacy page. Section 18 of POPIA also expects a
      way to contact the responsible party, which is the `hello@` address; it must exist before launch.
- [x] **How long contact-address emails are kept.** Deleted as soon as the matter is dealt with.
- [ ] A short legal read of the privacy notice and the "before you donate" wording (US persons, payment providers).

## 2. Cloudflare setup (a person, once)

The deploy account is a personal one. Run `npx wrangler whoami` and check it before you pin anything.

1. [x] Logged in with `npx wrangler login` (check with `npx wrangler whoami`). The account id is not committed; with more
       than one account, set `CLOUDFLARE_ACCOUNT_ID` when deploying from a script or CI.
2. [x] Created the database `cubaactiondesk` (WEUR) and put its id in both wrangler configs.
3. [x] Applied the migration: `npx wrangler d1 migrations apply DB --remote`.
4. [x] Deployed the link checker: `npx wrangler deploy -c workers/link-checker/wrangler.jsonc`. It runs on Mondays at
       03:00 UTC and has no public address.
5. [x] Deployed the site to `cuba.timothybrits.co.za` with `npm run deploy` (content check, remote migration, build, deploy).
6. [x] Enabled Analytics Engine (a one-time dashboard step) and redeployed with the `EVENTS` binding, dataset
       `cuba_action_desk_events`. Without it the deploy fails with error 10089.
7. [ ] Optional: connect the repository in the dashboard (Workers Builds) with build
       `npm ci && npm run build` and deploy `npx wrangler deploy`. Its API token needs permission to edit D1 if you also
       want it to run the migration.

### The zone is shared, so scope the settings

`timothybrits.co.za` presumably serves other sites. Zone-wide settings below would change those too. Use Configuration Rules
or Page Rules that match only `cuba.timothybrits.co.za`, or wait until the project has its own domain.

- [ ] **Email Address Obfuscation: off.** It rewrites `mailto:` links and injects JavaScript, which breaks the Action Desk.
- [ ] **Rocket Loader: off.**
- [ ] **Bot Fight Mode: off.** It injects challenges and can block AI crawlers. Abuse is handled by rate limiting.
- [ ] **AI crawler blocking: off** for this host, and **managed robots.txt: off** so ours (with the content signals) is served.
- [ ] **WAF managed rules: on.** Early Hints and HTTP/3: on.
- [ ] **Web Analytics: automatic setup on.** Do not add the snippet by hand, or views are counted twice.
- [ ] After the first deploy, open the browser console on a few pages and confirm the analytics beacon is not blocked by
      the content security policy. If it is, adjust `security.csp` in `astro.config.mjs`.

## 3. When the project gets its own domain (cubaactiondesk.org.za)

- [ ] Register the `.org.za` domain and point its nameservers at Cloudflare.
- [ ] **Set up Email Routing so `hello@cubaactiondesk.org.za` really exists.** It is printed in the footer, on About, Privacy,
      Accessibility and Corrections, and in the structured data. Until it works, change `contactEmail` in `src/lib/site.ts`.
- [ ] Set `SITE_URL=https://cubaactiondesk.org.za` for the build (or change the default in `astro.config.mjs`), then run
      `npm run build:images` so the preview images show the new host.
- [ ] Add the domain as a custom domain on the Worker, then turn on HSTS preload once everything is stable.

## 4. Check before the site goes public

- [ ] Run `LHCI_BASE_URL=https://<your-preview> npm run lhci` and `npm run lhci:desktop` against the deployed preview. The
      targets are 100 for accessibility, best practices and SEO, and 95 or more for performance. Also look at the largest
      contentful paint on mobile (the aim is 1.5 s; the local run measured 1.4 to 1.8 s). The font fallback sizes in
      `src/styles/fonts.css` are estimates; tune them if layout shift shows up.
- [ ] Check that Worker CPU per request is under 5 ms at the median (Workers dashboard).
- [ ] **Re-check every contact.** The addresses came from each organisation's own page on 29 October 2026: DIRCO,
      the seven newspaper letters desks (Daily Maverick, Sunday Times, TimesLIVE, Business Day, The Citizen, Daily Dispatch,
      IOL) and the Portfolio Committee secretary. The MP action links to the People's Assembly home page; open its MP finder
      and confirm it still works.
- [x] **The US Embassy action is live as a posted letter.** The embassy publishes no general email or form for Pretoria,
      only a postal address. Re-check <https://za.usembassy.gov/contact/> before launch in case it adds one.
- [ ] **Check the quoted phrases against the live pages.** The research tool summarises pages, so a short quotation may not be
      word for word. This matters most for the quotes by Waltz, Rodríguez Parrilla and Ramaphosa, the Parliament committee
      statement, and phrases from the US executive orders.
- [ ] South Africa's 2026 UN vote is confirmed in the UN's own record (meeting A/81/PV.28). Its 2025 vote comes from the UN
      Project database, which is not the UN itself; confirm it in the UN record too.
- [ ] Review the source `origin` labels that were judgement calls: `scoop-rubio-cuba-policy-2025` (US government),
      `eo-14380-2026` (academic), SAHO (academic) and PMG (NGO).
- [ ] Archive links: every `archiveUrl` is empty. Look each page up with the Wayback Machine's read-only availability API
      (`https://archive.org/wayback/available?url=...`). Do not use Save Page Now.
- [ ] `npm audit` in `tools/lint` shows 3 low advisories in a Markdown plugin's math dependency (`katex`). It is a development
      tool and never runs on the site.

## 5. Accessibility testing (people)

Automated checks cannot replace these. Record the results and update `src/pages/accessibility.astro` afterwards.

- [ ] Keyboard-only walkthrough of every page type.
- [ ] TalkBack on Android, which is the most common setup in South Africa.
- [ ] NVDA with Firefox or Chrome on Windows.
- [ ] VoiceOver on iPhone.
- [ ] 400% zoom, text spacing overrides, Windows high contrast, and reduced motion.
- [ ] A session with at least two people who have disabilities. An SA disability organisation could help find them.

## 6. After launch

- [ ] Publish the first six Instagram posts. The story card image is `public/cards/sa-and-cuba-in-60-seconds.png`.
- [ ] Review each article by 29 April 2027 (every six months). `npm run check:content` warns when one is overdue.
- [ ] Once a quarter, ask three AI assistants the target questions ("Cuba blockade South Africa", "donate to Cuba from South
      Africa", "help Cuba from South Africa", "Cuba embargo explained") and note whether the site is found and summarised
      accurately.
- [ ] Turn on branch protection for `main` and require the three CI checks (check, e2e, lighthouse).
- [ ] Add anything fixed after publication to `src/lib/corrections.ts`.
- [ ] Optional: tell FOCUS the site exists. Nothing depends on them.
