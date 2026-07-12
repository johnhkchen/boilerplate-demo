# Progress — T-010-03-01

## Status

- Phase: Implement.
- Planned source steps complete: 10 of 10.
- Remaining workflow phase: Review only.

## Baseline

- Read `CLAUDE.md`, `AGENTS.md`, the complete private assignment, ticket,
  RDSPI workflow, and copy voice/length standard.
- Confirmed the ticket phase was `research` at assignment start.
- Confirmed dependency `T-010-01-01` was complete.
- Read the predecessor contract source, focused tests, and RDSPI artifacts.
- Confirmed phase artifacts belong in the private attempt directory.
- Confirmed Lisa owns publication and ticket phase/status transitions.
- Confirmed ticket source commits require `lisa commit-ticket` with exact paths.
- No ordinary `git add` or `git commit` has been used.

## Pre-existing working-tree state

Before this ticket changed source, unrelated modifications existed in:

- `.codex/hooks.json`;
- `.lisa.toml`;
- `.lisa/.gitignore`;
- `.lisa/hooks/on-heartbeat.sh`;
- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-010-02-01.md`;
- `docs/active/tickets/T-010-03-01.md`.

Untracked Lisa infrastructure existed in:

- `.lisa-commit.lock`;
- `.lisa/hooks/on-ack.sh`;
- `.lisa/hooks/on-start.sh`.

During implementation, the concurrently active `T-010-02-01` ticket also
modified its source/test paths and materialized its work artifacts. Those paths
are unrelated to this ticket and are excluded from its source commit.

Lisa detected this ticket's private phase artifacts and materialized a shared
`docs/active/work/T-010-03-01/` directory. This attempt wrote only the private
artifact path and does not include the shared path in the source commit.

## Completed phase artifacts

- `research.md` maps the portable declaration, flow support, healthy/stalled
  behavior, literal duplication, test configuration, and constraints.
- `design.md` chooses a grouped browser contract with explicit heading/action
  aliases and a checked declaration-driven freshness witness.
- `structure.md` defines the two-file source unit, exports, consumers, and data
  flow.
- `plan.md` sequences implementation, exact source checks, browser verification,
  and Lisa commit handling.

## Implementation log

### Step 1 — flow adapter

- Status: complete.
- Modified `tests/support/flow-contract.ts`.
- Imported `receiptBoundary` from the portable source declaration.
- Added `DEMO_FLOW_BOUNDARY` with a derived any-origin route glob and the original
  landmark object.
- Added `DEMO_HEADING` as a property-derived named re-export.
- Preserved the public name `PRIMARY_ACTION_NAME` while changing its initializer
  from a duplicate literal to the declared primary-action name.
- Changed no project, step, backstage, budget, passcode, or base-URL values.

### Step 2 — shared spec setup

- Status: complete.
- Modified `tests/demo-flow.spec.ts`.
- Imported the grouped boundary and heading from flow support.
- Bound the declared landmark once.
- Added `requireFreshnessEvidence()`.
- The helper throws a clear configuration error if no evidence is declared.
- The helper avoids casts and receipt field-name knowledge.

### Step 3 — healthy flow

- Status: complete.
- Heading role lookup now reads `DEMO_HEADING`.
- Body/status locators now read declared selectors.
- The receipt step iterates through every declared evidence record and checks its
  selector against its declared regex.
- Assertion diagnostics include the evidence record's declared name.
- The activation step uses the first declared evidence record as its freshness
  witness.
- It checks changed text, the declared format, and action re-enablement.
- Existing step names and timeout budgets remain unchanged.

### Step 4 — stalled flow

- Status: complete.
- Route interception now reads the derived declared path glob.
- Heading, status, and body lookups now read flow-contract exports.
- The unresolved route handler and before/after activation observations are
  unchanged behaviorally.
- Concrete endpoint and selector literals were removed from comments.

### Step 5 — architectural source checks

- Status: complete.
- Exact command:
  `grep -En 'Demo Runway|#receipt-|/api/receipt' tests/demo-flow.spec.ts`.
- Result: **no output**, as required.
- A scoped literal definition search found:
  - `Demo Runway` only at `src/lib/boundary-contract.ts:74`;
  - `Ask for a fresh note` only at `src/lib/boundary-contract.ts:89`.
- Neither literal occurs in flow support or the demo flow spec.

### Step 6 — focused static verification

- Status: complete.
- `npm run typecheck`: **passed**.
- Astro checked 63 files with 0 errors, 0 warnings, and 0 hints.
- TypeScript `--noEmit`: passed.
- Wrangler worker type check: generated types are up to date.
- `node --experimental-strip-types --test test/boundary-contract.test.mjs`:
  **7 passed, 0 failed**.
- Astro emitted the existing deprecated `session.driver` signature notice.
- The notice is unrelated to this ticket and did not affect results.

### Step 7 — healthy browser acceptance

- Status: complete.
- `npm run test:flow`: **passed**.
- Healthy active test: 1 passed.
- Stalled project-guarded test: 1 skipped as expected.
- Active test duration: 321 ms.
- Total command duration reported by Playwright: 3.7 seconds.
- The three named steps all completed: load, receipt response, and activation.

### Step 8 — stalled browser acceptance

- Status: complete.
- `npm run test:flow:stalled`: **passed**.
- Stalled active test: 1 passed.
- Healthy project-guarded test: 1 skipped as expected.
- Active test duration: 180 ms.
- Total command duration reported by Playwright: 2.4 seconds.
- The three named steps all completed: load, stalled narration, and activation.

### Step 9 — diff and repository inspection

- Status: complete.
- `git diff --check` for both ticket paths: passed.
- The ticket source diff contains only the planned support adapter and spec
  consumer changes.
- Playwright generated no visible untracked artifacts.
- Concurrent ticket source changes remain present and untouched.
- The ordinary index has not been used by this ticket.
- `lisa commit-ticket --help` confirmed repeated `--include` arguments and exact
  repository-relative path syntax.

### Step 10 — Lisa source commit

- Status: complete.
- Used `lisa commit-ticket` with the exact include set:
  - `tests/support/flow-contract.ts`;
  - `tests/demo-flow.spec.ts`.
- Commit: `6ff7a6270e22c7c88547d71b1ce6dcc591e2429e`.
- Message: `test: read demo flow from boundary declaration`.
- Commit stat: 2 files changed, 56 insertions, 23 deletions.
- Post-commit inspection confirms the commit contains only the two exact paths.
- Both ticket-owned source paths are clean.
- Unrelated automation and concurrent-ticket paths remain dirty or untracked and
  were not included.
- No ordinary-index command was used.

## Deviations

- No design or source-scope deviation.
- The plan expected unrelated automation dirt; a concurrent dependent-free
  ticket also changed its own source files during the browser runs. Exact-path
  Lisa commit isolation handles this safely.
- Lisa materialized private artifacts under the shared work path as part of its
  detection loop. This attempt did not directly author or include that path.

## Remaining

1. Write `review.md`.
2. Stop on this ticket for Lisa publication and completion handling.
