# T-005-01-01 — verb-forward-index-recomposition — Review

Handoff self-assessment. What changed, how it was proven, what a human
should look at.

## What changed

**One product file: `src/pages/index.astro`** (commit `c6a8045`). No files
created or deleted in `src/`; styles, layout, backstage, `src/lib/*`,
tests, and scripts untouched, per story scope.

- **Frontmatter**: a comment-fenced "Template slots" block now holds the two
  strings every generated demo renames — `DEMO_NAME` ('Demo Runway') and
  `PRIMARY_ACTION_LABEL` ('Ask for a fresh note'). `title` derives from
  `DEMO_NAME`; `description` reworded visitor-first.
- **Markup**: three verb-forward sections. Identity card (eyebrow "Start
  here", h1 = `{DEMO_NAME}`, lede rewritten to tell the visitor the page's
  two moves; the maker-outward "point your coding agent at it" copy is
  gone). Receipt card (eyebrow "Watch the server answer" — the ticket's own
  example — with the page's **only** clay-button, `#primary-action`,
  labeled from the slot, after the untouched receipt well). New note card
  (eyebrow "Leave a note", h2 "Pass the team a thought", plain accent
  anchor `#backstage-link` → `/backstage` labeled "Leave a note for the
  team" — deliberately not a clay-button).
- **Script**: the existing fetch/validate/fill logic is wrapped in
  `loadReceipt()` (with a status-reset preamble so the aria-live card
  narrates each round trip); the button re-invokes it, disabled while in
  flight; listener wired before the initial load so a stalled first fetch
  can't dead-arm the button. Payload validation unchanged; still
  secret-free (relative fetch + DOM writes only).
- **Styles**: two token-only additions — `.primary-action` (rhythm) and
  `.backstage-link` (accent link with a 44px tap target). The file's
  no-literal-values invariant holds.

New DOM hooks exported for the sibling tickets: `#primary-action`,
`#backstage-link`; all receipt ids unchanged.

## Acceptance criteria — status

| AC | Status |
| --- | --- |
| Verb-forward eyebrow/heading per section in built HTML | ✓ ("Start here" / "Watch the server answer" / "Leave a note" + "Pass the team a thought") |
| Exactly one clay-button primary action | ✓ one `class="clay-button …"` element in `dist/client/index.html` (further string hits are inlined base.css *selectors*, verified not elements) |
| Leave-a-note link to /backstage | ✓ `#backstage-link`, label "Leave a note for the team" |
| Name + primary-action label as clearly-marked frontmatter consts | ✓ fenced Template-slots block |
| `npm run build` succeeds; leak check clean on public output | ✓ build clean; leak check passed against the browser bundle + live `/api/receipt` (see caveat below); no passcode or team-internal detail in the copy |

## Test coverage

- **Ran green**: `npm test` (148 unit tests), `npm run typecheck` (astro
  check + tsc + worker types), Playwright `healthy` project, leak check
  (`LEAK_CHECK_DIR=dist/client`), and a live chromium click check: pressing
  the primary action produced a **fresh nonce** (the button demonstrably
  responds), and the backstage link navigated 307 → `/backstage/` → 200.
- **Gap, by design**: no committed automated assertion for the primary
  action or the backstage link yet — that assertion is T-005-01-02's entire
  scope (`tests/demo-flow.spec.ts` + `flow-contract.ts`), so this ticket
  only verified it live and left stable hooks. Until T-005-01-02 lands, a
  regression in the button's replay behavior would not be caught by CI.
- **Pre-existing failure, not a regression**: the `stalled` Playwright
  project fails identically on unchanged main (verified via stash). It
  stalls `/api/receipt` and then asserts the receipt appears, so it fails
  by construction inside its 5s step budget; `npm run verify`/CI never run
  it. Left alone — tests are out of this ticket's file scope.

## Open concerns for a human reviewer

1. **Leak check's default dir is stale** (pre-existing, surfaced here):
   `scripts/leak-check.ts` defaults to scanning `dist`, but the current
   adapter layout splits `dist/client` (browser) from `dist/server`, and
   the build copies `.dev.vars` into `dist/server/` — so the default run
   flags `server/.dev.vars` even though it never reaches a browser.
   Verified identical on unchanged main. Worth a small follow-up ticket:
   default `LEAK_CHECK_DIR` to `dist/client` (or exclude `server/` like
   `_worker.js`), and consider whether the adapter should copy `.dev.vars`
   into build output at all. Out of scope here (`scripts/`, `src/lib/`
   read-only for this ticket).
2. **Stalled project's purpose** could use a comment or an
   expected-to-fail marker so the next person doesn't re-diagnose it; could
   ride along with T-005-01-02 since it owns that spec file.
3. **Copy judgment calls** (cheap to revise if the cold-read pass
   disagrees): identity eyebrow "Start here" and note-card h2 "Pass the
   team a thought" are my verb-forward choices; the ticket only dictated
   the receipt card's example. The h1 stays "Demo Runway" (names are
   wayfinding + pinned by the Playwright heading assertion) with verbs in
   the eyebrows — if a reviewer wants the *headings* verb-forward too,
   that's a copy-only change.
4. **Primary action semantics**: chosen as "ask the server for a fresh
   note" (re-runs the receipt fetch) rather than a navigation — rationale
   in design.md Q1 (genuinely responds; right inheritance for generated
   demos; stalled-safe). T-005-01-02 should assert via `#primary-action`
   and expect a changed nonce within the flow budget.

## Known limitations / TODOs

- None in the shipped file beyond the above. No TODO comments introduced.
- The projector/phone cold-read evidence is T-005-01-03's artifact, not
  produced here.

## Handoff pointers

- Diff to read: `git show c6a8045 -- src/pages/index.astro` (~90 changed
  lines; the script diff is a wrap + one listener, easiest read side by
  side).
- Sibling tickets can rely on: `DEMO_NAME`, `PRIMARY_ACTION_LABEL`
  (frontmatter), `#primary-action`, `#backstage-link`, unchanged receipt
  ids, and the label strings listed in progress.md's grep table.
