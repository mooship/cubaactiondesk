The site is for South Africans who want to understand the US blockade of Cuba and decide what they can do, often on a phone with limited data. Its voice is plain, sourced and independent, with the visual character of a newspaper and a personal letter. It helps visitors write to a recipient or find an aid organisation, while leaving their messages and payments in their own hands.

# Visitor experience audit

8 November 2026. Read-only source review covered the shared layout, styles, navigation, action forms, reading pages, donation listings, existing content and browser tests. Browser checks used the built local Worker, not the deployed site. The humanizer review followed the existing writing rules.

## Findings

| ID | Area | Location | Issue | Severity | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| A1 | Forms | `src/components/ActionDesk.astro:93` | Empty multiline blanks contain indentation spaces; prefilled answers are indented. Confirmed in the browser. | major | Place the value directly between the textarea tags; test empty and prefilled values with and without JavaScript. |
| A2 | Feedback and copy | `src/components/ActionDesk.astro:158`, `src/scripts/action-desk.ts:73` | Missing-field feedback exposes internal names such as `{mp_name}` and changes without an announcement. | major | Use the existing field labels and announce changes between complete and incomplete messages without announcing every keystroke. |
| A3 | Keyboard and state | `src/components/ActionDesk.astro:231`, `src/scripts/action-desk.ts:137` | Completion is presented as a toggle although it cannot be undone. | minor | Use a normal button and mark it unavailable after completion, preserving keyboard focus and the existing once-only counter. |
| A4 | Repeated feedback | `src/scripts/action-desk.ts:127` | Copying again sets the same live-region text, which may not be announced. | minor | Clear the copy announcement when its button label resets, without clearing a newer announcement. |
| A5 | Motion | `src/styles/base.css:139` | Loading placeholders shimmer indefinitely. Reduced motion is supported, but ordinary motion has no five-second limit. | minor | Stop the shimmer within five seconds and keep the reserved image/count space. |
| H1 | Short screens | `src/components/ActionDesk.module.css:219` | A tall Instagram send panel is sticky even when it is taller than the viewport. | major | Keep the two-column layout but leave image panels in normal flow; retain sticky behaviour only where the controls fit. |
| H2 | Text enlargement | `src/components/Logo.module.css:25`, `src/components/Nav.module.css:2` | The name cannot wrap under text enlargement; fixed mobile navigation consumes much of a very short zoomed viewport. | major | Verify in the browser, allow the name to wrap, and place navigation in the header on short screens only. |
| H3 | Reading hierarchy | `src/styles/prose.module.css:121` | Source and related-action headings are larger than the article's own section headings. | minor | Match their size to the reading-page section headings. |
| C1 | Donation decisions | `/give`, `src/pages/give/index.astro:56` | Payment and US-rules cautions follow all the donation buttons. | major | Move the existing cautions before the listings and keep the Markdown version in the same order. |
| C2 | Accessibility statement | `src/pages/accessibility.astro:19` | The 7:1 contrast claim and blanket 44px target claim exceed what the styles actually guarantee. | minor | State the AA text contrast target and distinguish controls from inline links. Keep assistive-technology testing explicitly unfinished. |
| C3 | Link clarity | `/act`, `/give`, footer and MP action | DIRCO is unexplained on the action index; register and lookup links are vague outside their surrounding sentence. | minor | Make small, factual label changes, using the organisation and field names already present. |
| T1 | Test coverage | `tests/e2e/a11y.spec.ts:77` | Reflow covers only seven routes and text spacing only one; there is no full-site 200% reflow check. | minor | Extend the existing tests to all discovered routes at 320 and 640 CSS pixels, and check text spacing across the same routes. |

No blocker was found. Text, links, borders and focus colours reviewed in light and dark themes pass AA. The existing skip link, language declaration, labels, image dimensions and alternative text, heading order, native controls and forced-colour rules are sound. No meaningful audio or video requires captions.

## Baseline

- Whole-site axe tests: saved baseline run passed, with no failed tests. A fresh full-suite run remains required after changes.
- Fresh Lighthouse mobile and desktop: six pages per profile, three runs per page, all assertions passed. Accessibility, best practices and SEO are 100. Performance, layout shift and largest contentful paint meet the existing gates.
- Browser confirmation: the MP action's two empty multiline fields contain spaces and a newline; the missing-fields notice displays internal keys.

## Ordered implementation

### 1. Make letters and feedback clear

Address A1 to A5. Start with failing tests in the existing action test files. Keep field labels as the single source for missing-field names, preserve the no-JavaScript form and never send message contents to the server. Retain the once-only completion behaviour, but describe its state correctly. Keep loading space stable and stop decorative motion within five seconds.

Commit: `fix(act): make message blanks and completion feedback clearer`.

### 2. Keep pages readable on small and enlarged screens

Address H1 to H3 and T1. Reproduce text enlargement before editing the shared header. Preserve the existing desktop columns and ordinary mobile bottom navigation; change only the conditions that make them obstruct reading. Match supporting article headings to the established reading scale. Add focused regressions alongside the existing layout and accessibility tests.

Commit: `fix(layout): keep action controls and reading pages accessible at zoom`.

### 3. Put cautions and useful words where visitors need them

Address C1 to C3. Move existing donation advice without adding legal or financial claims. Correct the accessibility statement and its review date, without claiming screen-reader or participant testing. Clarify only the identified labels. Review every edited sentence with the humanizer rules and keep the relevant Markdown copies consistent.

Commit: `fix(copy): show donation cautions before links and clarify guidance`.

## Deliberately unchanged

- Keep the flag colours, paper and ink, square ruled rows, local fonts, letter motif and real card artwork. They are specific to this site and already work together; a new palette or card system would be an unrelated redesign.
- Keep the articles, sourced claims, letters' factual content, aid approvals and contact details. This audit supplies no new evidence for changing them.
- Keep the independent site's collective voice. A single maintainer can write on behalf of the site; changing every "we" to "I" would add churn without resolving a visitor barrier.
- Keep native disabled donation buttons with nearby pause explanations. They perform no action and need not add a dead stop to the keyboard order.
- Keep the current landmarks and letter excerpt markup unless a browser check demonstrates confusion. Renaming regions purely for stylistic consistency would affect existing tests without a demonstrated benefit.
- Do not touch dependencies, infrastructure, deployment configuration, security headers or databases. Existing local test fixtures are sufficient.

## Verification and shipping

After each group, run its focused regressions. Before finishing, run lint, typecheck, unit coverage, content checks, build, output checks, HTML validation, budgets and the full browser suite, including axe. Repeat both Lighthouse profiles. Walk representative page types in the browser at 320, 768 and 1280px, test keyboard navigation, 200% enlargement and reduced motion, and review screenshots and the diff.

Commit each passing group locally with hooks enabled. A push requires separate confirmation under AGENTS.md, so stop before pushing or deploying even if all checks pass. Assistive-technology testing and testing with people remain the personal checks listed in the launch checklist.

## Progress

- Read-only audit and baseline: complete.
- Group 1: complete. The new cases failed against the unchanged site, then all 20 action browser tests passed. Lint, typecheck, 352 unit tests and coverage, build, output, HTML and static-page budgets passed. Server-rendered budgets remain part of final verification.
- Group 2: pending.
- Group 3: pending.
- Final verification and fresh-eyes review: pending.
- Push: awaiting separate confirmation; no remote change made.