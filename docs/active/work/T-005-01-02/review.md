# T-005-01-02 — playwright-labeled-action-assertion — Review

Handoff self-assessment: what changed, how it was proven, what a human
should look at.

## What changed

**Two test files, one commit (`3f30941`, +122/−6).** No `src/`, config,
script, or backstage-spec changes; ticket frontmatter untouched.

- **`tests/support/flow-contract.ts`** — three additions, no existing key
  touched:
  - `PRIMARY_ACTION_NAME = 'Ask for a fresh note'` — the accessible-name
    contract for the index page's one primary action, placed beside
    `BACKSTAGE_PASSCODE` (the file's existing both-ends-contract
    precedent). Its comment names `index.astro`'s `PRIMARY_ACTION_LABEL`
    slot as the authoring side: renaming the slot without updating this
    const fails the suite on a named step — deliberately.
  - `FLOW_STEP.activateAction` / `FLOW_STEP.observeStall` — plain-language
    step names in the file's existing voice.
  - `FLOW_BUDGET_MS.actionStep: 5_000` — bounds one activation round
    trip; worst-case step sums still equal the unchanged 20s `test` cap.
- **`tests/demo-flow.spec.ts`** — reorganized from one branching test to
  two linear, project-guarded tests (the guard idiom
  `backstage-flow.spec.ts` already uses):
  - Test 1 (title unchanged, healthy-only): `loadDemo` and `awaitReceipt`
    step bodies verbatim from before; new boxed `activateAction` step —
    locates the button **by role + accessible name only** (never
    `#primary-action`, so the assertion proves the label, not the
    plumbing), asserts visible+enabled, clicks, and observes the response
    as a changed-but-still-32-hex nonce plus the button re-arming.
  - Test 2 (new, stalled-only): stalls `/api/receipt` via route
    interception (moved from test 1's old branch), then asserts the
    observable truth of a hung boundary: shell parsed, `#receipt-status`
    narrating, `#receipt-body` hidden (`observeStall`), and the labeled
    action still answering its activation — click → disabled, narration
    holds (`activateAction`). Nothing in it waits on the stalled response,
    so it settles in milliseconds.
  - File-level comment documents the stalled project's history and the
    deliberate contract change (below) — closing T-005-01-01 review
    concern #2 (the variant's purpose needed a comment).

## Acceptance criterion — clause by clause

| Clause | Status |
| --- | --- |
| `npx playwright test` passes on all projects **including stalled** | ✓ 3 passed, 2 skipped (each demo-flow test skips the other's project — skips are the guard working, not missing coverage), 0 failed; twice consecutively (7.7s, 6.3s), agent env stripped per the daemonization memory |
| Existing signed-receipt steps stay green against the new copy | ✓ step bodies verbatim; no selector updates were needed — T-005-01-01 kept the h1 ('Demo Runway') and all `#receipt-*` ids |
| New budgeted step locates the primary action by accessible verb-forward name | ✓ `getByRole('button', { name: PRIMARY_ACTION_NAME })` inside a boxed step with its own `actionStep` (5s) budget, on both projects |
| …and observes a response when activated | ✓ healthy: fresh nonce + re-armed button; stalled: synchronous disable + narration holds |
| Existence and response only, no convincingness claim | ✓ no copy-quality/layout/persuasion assertions; loading-copy *text* deliberately unpinned (only the action label is contract) |

## The one deliberate contract change a reviewer should ratify

The stalled project was born as an **always-red** demonstration
(T-002-02-01: "the run fails at the configured timeout and the report
names the awaited step") — which is why CI/`npm run verify` never ran it.
This ticket's AC requires it to pass, so the by-construction failure is
replaced with green assertions of the same property (failure stays
narrated and bounded). The repo therefore no longer contains a
deliberately failing run; if the red-run demo is ever wanted back, it is
one assertion flip away. Judged faithful to the AC's plain text — but it
retires a T-002 behavior, so it merits a human nod. Full rationale in
design.md Q1.

## Test coverage

- **Ran green:** full three-project Playwright suite twice (cold server
  each, retries=0/workers=1), `npm test` (unit suite, fail 0),
  `npm run typecheck` (astro check + tsc + worker types),
  `npx playwright test --list` (5 entries, guards resolve at runtime).
- **Negative-path evidence (uncommitted by design):** with the contract
  const deliberately wrong, the healthy run fails on the named
  `activate the labeled primary action` step showing the role/name
  locator, at its own 5s budget — the check demonstrably detects label
  drift; it isn't theater.
- **Gaps, known and accepted:**
  - `#backstage-link` has no automated assertion (outside this AC; the
    cold-read ticket T-005-01-03 covers that surface manually).
  - The fetch-failure copy path ("The server didn't answer just now…",
    reached on a *rejected* fetch rather than a stalled one) is untested —
    would need an aborted/500 route variant; noted as a cheap future
    project if wanted, not in this AC.
  - CI parity assumed, not proven from here: local runs need the
    agent-env strip (Astro 7 daemonization); CI lacks that env entirely.
    Risk judged low — same invocation, and the baseline reproduced the
    documented behavior exactly.

## Open concerns / TODOs

1. **`npm run verify` still runs only healthy + backstage**
   (`test:flow`/`test:flow:backstage`); now that stalled is green it
   *could* be promoted into `verify`/CI for free (~0.2s). `package.json`
   was out of scope here — small follow-up ticket if wanted.
2. **Label duplication is load-bearing:** 'Ask for a fresh note' exists in
   `index.astro` (slot) and `flow-contract.ts` (contract), by design
   (design.md Q4 — a spec can't import `.astro` frontmatter; the legible
   failure on drift is the feature). Generated demos renaming the slot
   must touch both; both sides carry comments saying so.
3. No TODO comments introduced; no known limitations in the shipped files
   beyond the coverage gaps above.

## Handoff pointers

- Diff to read: `git show 3f30941` (~120 lines; the spec reads
  top-to-bottom as two linear tests).
- Run it yourself: `npx playwright test` — under a coding agent, strip the
  env first (exact incantation in plan.md's preamble; kill any orphan on
  port 4323).
- Siblings can rely on: `PRIMARY_ACTION_NAME`, `FLOW_STEP.activateAction`,
  `FLOW_STEP.observeStall`, `FLOW_BUDGET_MS.actionStep` — all additive;
  every pre-existing contract export is byte-identical.
