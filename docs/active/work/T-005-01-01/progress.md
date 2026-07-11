# T-005-01-01 — verb-forward-index-recomposition — Progress

## Completed

- **Step 1 — frontmatter template slots.** Fenced `// ─── Template slots ───`
  block with `DEMO_NAME = 'Demo Runway'` and `PRIMARY_ACTION_LABEL = 'Ask for
  a fresh note'`; `title` now derives from `DEMO_NAME`; `description`
  reworded visitor-first. Old `name` const removed (h1 renders `DEMO_NAME`,
  same string).
- **Step 2 — markup recomposition.** Identity eyebrow → "Start here", lede
  rewritten visitor-first (names the page's two moves; agent-facing copy
  removed). Receipt eyebrow → "Watch the server answer", lede trimmed,
  `#primary-action` clay-button added after the untouched well. New third
  card: eyebrow "Leave a note", h2 "Pass the team a thought",
  `#backstage-link` plain anchor → `/backstage`, labeled "Leave a note for
  the team".
- **Step 3 — script.** Fetch/validate/fill wrapped in `loadReceipt()` with a
  status-reset preamble; `#primary-action` click wired (disabled while in
  flight, `finally` re-enable), wired *before* the initial `await
  loadReceipt()` so the button works during a stalled first fetch.
- **Step 4 — styles.** `.primary-action` (margin only) and `.backstage-link`
  (accent, bold, underline, 44px tap target) — token-only values.
- **Steps 5–7 — verification.** All run; results below.

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` | ✓ succeeds |
| clay-button in `dist/client/index.html` | ✓ exactly **1 element** (`class="clay-button primary-action"`); 3 further string hits are inlined base.css selectors, not elements |
| `href="/backstage"` anchor, "Leave a note for the team" label | ✓ present once |
| Verb labels in built HTML ("Start here", "Watch the server answer", "Leave a note", "Pass the team a thought") | ✓ all present |
| `<h1>` | ✓ still exactly "Demo Runway" |
| `npm run typecheck` | ✓ 0 errors (astro check 52 files, tsc, worker types) |
| `npm test` (unit, 148 tests) | ✓ pass |
| Playwright `--project=healthy` | ✓ pass (run with coding-agent env stripped per memory note) |
| Playwright `--project=stalled` | ✗ fails — **pre-existing by design**, verified identical on stashed main; it demonstrates the receipt step's 5s budget cutting off a stalled flow and is excluded from `npm run verify` |
| `npm run leak:check` (`LEAK_CHECK_DIR=dist/client`) | ✓ passed — 3 client assets + `/api/receipt` body, no signing key; no passcode mention anywhere on the public page |
| Live browser click check (chromium against `wrangler dev`) | ✓ `#primary-action` click produced a **fresh nonce** (button genuinely responds); `#backstage-link` click navigated `/backstage` → 307 → `/backstage/` → 200 |

## Deviations from plan

1. **Built HTML path.** The plan's greps assumed `dist/index.html`; the
   Cloudflare adapter emits `dist/client/index.html`. Greps adjusted; the
   clay-button count was refined to count `class=` attributes (the page
   inlines base.css, whose selectors also contain the string).
2. **Leak check default dir is stale (pre-existing, not fixed here).** With
   the default `LEAK_CHECK_DIR=dist`, the check flags `server/.dev.vars` —
   the adapter's copy of local dev vars inside the *server* half of `dist`,
   which is never served to a browser. Verified the identical failure on
   stashed main (pre-existing; `verify` doesn't run `leak:check` in CI, so
   it never surfaced). Ran the check scoped to the real browser bundle
   (`dist/client`): passed. Fixing the default (or the adapter copy) is
   flagged in review.md as follow-up outside this ticket's file scope.
3. **Stalled-project status.** Plan step 6 expected healthy + stalled green;
   stalled turns out to fail by construction (before and after the change,
   bit-identical cause). Documented rather than "fixed" — tests are
   T-005-01-02's file scope.

## Remaining

Nothing — review.md is the next and final artifact.

## Commits

- `feat(index): verb-forward recomposition with primary action and backstage
  path (T-005-01-01)` — src/pages/index.astro + RDSPI artifacts through
  progress.md.
- `docs(demo): T-005-01-01 review handoff` — review.md.
