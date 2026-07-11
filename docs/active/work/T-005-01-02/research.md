# T-005-01-02 — playwright-labeled-action-assertion — Research

Descriptive map of everything the ticket touches. No solutions proposed here.

## Ticket in one line

Make `npx playwright test` pass on **all** projects — including the
`stalled` variant — against the T-005-01-01 recomposed index, and add a
budgeted step that finds the primary action by its accessible verb-forward
name and observes a response when activated. Existence + response only; no
convincingness claim.

## Scope boundary (from S-005-01)

Writable surface: `tests/demo-flow.spec.ts` and
`tests/support/flow-contract.ts` — "a new labeled-action assertion lands
there." Everything else (`src/pages/index.astro`, `src/lib/*`,
`backstage.astro`, tokens, `playwright.config.ts`) is read-only context.
`tests/backstage-flow.spec.ts` belongs to an earlier story and already
passes; nothing in this ticket's AC requires touching it.

## The surface under test (post-T-005-01-01)

`src/pages/index.astro` (commit `c6a8045`, reviewed in
`docs/active/work/T-005-01-01/review.md`):

- Frontmatter template slots: `DEMO_NAME = 'Demo Runway'`,
  `PRIMARY_ACTION_LABEL = 'Ask for a fresh note'`.
- `h1` text is still `Demo Runway` — the existing
  `getByRole('heading', { name: 'Demo Runway' })` assertion still matches.
- Receipt card ids unchanged: `#receipt-status` (loading text "Asking the
  server…"), `#receipt-body` (hidden until a receipt arrives),
  `#receipt-nonce` (32 hex), `#receipt-signature` (64 hex).
- **New hooks exported for this ticket**: `#primary-action` — the page's
  only `clay-button`, a real `<button>` whose accessible name is the slot
  label "Ask for a fresh note" — and `#backstage-link` (owned by the
  sibling cold-read ticket, not asserted here).
- Client script: `loadReceipt()` runs once on load and again per button
  click. On click the button is `disabled = true` for the duration of the
  round trip (re-enabled in `finally`), status resets to "Asking the
  server…", body hides, then fills on success. On fetch failure the status
  reads "The server didn't answer just now — try a refresh."
- Each successful `/api/receipt` GET returns a **fresh nonce** (random per
  request, `src/lib/receipt.ts` via `src/pages/api/receipt.ts`), so a
  replayed request is distinguishable from the first by nonce text alone.

## Current spec and contract

`tests/demo-flow.spec.ts` (41 lines): one test, two named steps —
`FLOW_STEP.loadDemo` (goto with `waitUntil: 'commit'`, heading visible;
budget `action` = 10s) and `FLOW_STEP.awaitReceipt` (`#receipt-body`
visible, `#receipt-status` hidden, nonce/signature hex; budget
`receiptStep` = 5s). When the project is `stalled` it intercepts
`page.route('**/api/receipt', () => {})` — the request is never continued,
fulfilled, or aborted, so the page stays in its loading state forever.

`tests/support/flow-contract.ts` (43 lines): `FLOW_PROJECT`
(healthy/stalled/backstage), `FLOW_STEP`, `BACKSTAGE_STEP`,
`BACKSTAGE_PASSCODE`, `FLOW_BUDGET_MS` (assertion 8s, action 10s,
receiptStep 5s, test 20s, serverStartup 30s, run 40s), `LOCAL_BASE_URL`
(port 4323). The contract file is the established home for strings shared
between config, server env, and specs (see `BACKSTAGE_PASSCODE`: "the
single value … so the gate and the form cannot drift").

`playwright.config.ts` (read-only): three projects — `healthy` and
`stalled` both match `demo-flow.spec.ts` on Desktop Chrome; `backstage`
matches its own spec on Pixel 5. Workers = 1, retries = 0, `globalTimeout`
= `run` (40s), owned webServer on 4323 with D1 migration + pinned
`DEMO_PASSCODE`/`DEMO_SIGNING_KEY`.

## Baseline run (today, unchanged tree)

`npx playwright test` with coding-agent env stripped (see memory note
below): **healthy ✓, backstage ✓, stalled ✗**, 12.5s total. The stalled
failure is `#receipt-body` expected visible / received hidden — failing
**by construction**: the spec stalls the boundary and then asserts the
receipt appears anyway.

## Why the stalled variant exists, and the contract change buried in the AC

T-002-02-01 (done) defined the stalled variant's original purpose: "with
the boundary response stalled via route interception, the run **fails** at
the configured timeout and the report names the awaited step." It was a
deliberate always-red demonstration of bounded failure — which is why
`npm run verify` and CI run only `test:flow` (healthy) and
`test:flow:backstage`, never `test:flow:stalled`, and why T-005-01-01's
review flagged it as a pre-existing failure worth an explanatory comment
("could ride along with T-005-01-02 since it owns that spec file").

This ticket's AC changes that contract: `npx playwright test` must now
**pass on all projects including the stalled-receipt variant**. So the
stalled project can no longer assert "receipt appears"; it must instead
assert something true and observable about the stalled page. What is
observably true when `/api/receipt` never answers: the static HTML parsed
(heading visible), `#receipt-status` stays visible reading "Asking the
server…", `#receipt-body` stays hidden, and the primary action button
exists under its accessible name; activating it disables the button and
keeps the narrated loading state (the click handler runs synchronously —
`disabled` flips before the stalled fetch ever settles).

## Accessible-name facts for the new step

- `#primary-action` is `<button type="button">` with text content from
  `PRIMARY_ACTION_LABEL` → role `button`, accessible name
  "Ask for a fresh note". `getByRole('button', { name: … })` is the
  idiomatic locator; the backstage spec already uses exactly this pattern
  (`getByRole('button', { name: 'Send it over' })`).
- The label string lives only in `index.astro` frontmatter. A `.astro`
  frontmatter const cannot be imported by a spec; the repo's established
  pattern for cross-file string contracts is a const in
  `flow-contract.ts` with a comment naming the counterpart location.
- Healthy-path "observes a response": each click yields a new nonce, so
  "nonce text changes from its pre-click value" is a page-visible response
  signal with negligible collision odds (32 random hex chars). The
  T-005-01-01 review explicitly points here: "T-005-01-02 should assert
  via `#primary-action` and expect a changed nonce within the flow
  budget."

## Budget arithmetic (constraints on any added step)

`test` = 20s caps one test; current worst case loadDemo 10s +
awaitReceipt 5s leaves ≤5s for a new step. `expect.timeout` (8s) already
exceeds the receiptStep box timeout (5s) — the step box wins, so a 5s-class
budget for the new step behaves the same way. `globalTimeout` 40s covers
server startup + all three tests; baseline uses 12.5s including a full 5s
stalled burn, so a passing stalled project (no timeout burn) plus one extra
round trip on healthy stays comfortably inside.

## Environment / reproduction constraints

- Astro 7 daemonizes its dev server under coding-agent env; Playwright's
  webServer then reports "Process from config.webServer exited early". To
  run locally under Claude Code, strip the agent env
  (`env -u CLAUDECODE -u AI_AGENT -u CLAUDE_CODE_CHILD_SESSION
  -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_EXECPATH
  -u CLAUDE_CODE_SESSION_ID -u CLAUDE_EFFORT npx playwright test`) and
  clear any orphan on port 4323 first. CI has none of this env.
- Local D1 state: `.wrangler/state` (dev server) and
  `tests/support/.wrangler` (test migration).
- `retries: 0`, `workers: 1`, `reuseExistingServer: false` — every run is
  cold and serial; flakiness has nowhere to hide.

## Assumptions surfaced

1. "Passes on all projects" means the default `npx playwright test`
   invocation — exactly the three configured projects.
2. "Existing signed-receipt steps stay green against the new copy" is
   already true for the healthy project (h1 unchanged, receipt ids
   unchanged); the parenthetical "(role/name selectors updated where labels
   changed)" is conditional and currently a no-op.
3. "No convincingness claim" constrains assertions to existence, state,
   and response — no copy-quality, layout, or persuasion assertions.
4. The stalled variant's always-red demonstration role is superseded by
   this AC; preserving its *observability* purpose (the page narrates the
   stall within budget) is the faithful translation.
