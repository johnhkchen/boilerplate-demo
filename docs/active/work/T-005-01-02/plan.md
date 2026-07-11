# T-005-01-02 — playwright-labeled-action-assertion — Plan

Ordered steps, each independently verifiable. Two files change
(`tests/support/flow-contract.ts`, `tests/demo-flow.spec.ts`); everything
else is verification.

## Commit strategy

**One commit.** The contract additions and the spec that consumes them are
a single atomic contract change; the contract consts alone would be dead
exports. Message shape (repo convention:
`test(flow): … (T-005-01-02)`):

> test(flow): assert the labeled primary action exists and responds;
> stalled variant asserts the narrated stall (T-005-01-02)

The work artifacts (`docs/active/work/T-005-01-02/*`) ride along or land
in a docs commit at the end — matching how T-005-01-01 shipped (feat
commit + docs handoff commit).

## Environment preamble (every Playwright invocation)

Local runs under Claude Code must strip the coding-agent env or Astro 7
daemonizes the webServer ("Process from config.webServer exited early" —
an artifact, not a failure). Canonical invocation used throughout:

```
lsof -ti :4323 | xargs kill -9   # clear any orphaned dev server first
env -u CLAUDECODE -u AI_AGENT -u CLAUDE_CODE_CHILD_SESSION \
    -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_EXECPATH \
    -u CLAUDE_CODE_SESSION_ID -u CLAUDE_EFFORT npx playwright test
```

CI carries none of this env and needs no such wrapper.

## Steps

### 1. Contract additions — `tests/support/flow-contract.ts`

Add, per structure.md: `PRIMARY_ACTION_NAME` (beside
`BACKSTAGE_PASSCODE`, with the both-ends comment naming `index.astro`'s
`PRIMARY_ACTION_LABEL` slot), `FLOW_STEP.activateAction`,
`FLOW_STEP.observeStall`, `FLOW_BUDGET_MS.actionStep: 5_000` (with the
budget-arithmetic comment). No existing key changes.

**Verify:** `npx tsc --noEmit` passes (tests are in the root tsconfig
program; this also proves `playwright.config.ts` still type-checks against
the widened contract).

### 2. Spec reshape — `tests/demo-flow.spec.ts`

Per structure.md's blueprint:

- File-level comment: two projects, two tests; note the deliberate
  contract change (stalled was an always-red demo per T-002-02-01, now a
  green assertion of the same observability property) — this is the
  explanatory comment T-005-01-01's review asked for.
- Test 1 (title unchanged): swap the stalled route-interception branch
  for a healthy-only skip guard; `loadDemo` and `awaitReceipt` step
  bodies stay verbatim; append the `activateAction` step (role/name
  locator from `PRIMARY_ACTION_NAME`; visible+enabled; nonce-before
  capture; click; nonce changed + still 32-hex; button re-enabled; custom
  messages on the non-obvious expects).
- Test 2 (new, stalled-only): route interception (comment moved along
  with it), `loadDemo` body, `observeStall` step (status visible, body
  hidden), `activateAction` step (visible+enabled by accessible name;
  click; disabled; status still visible; body still hidden).
- Budgets: `action` for loadDemo (unchanged), `receiptStep` for
  awaitReceipt (unchanged) and observeStall, `actionStep` for both
  activateAction steps. All boxed.

**Verify:** `npx playwright test --list` shows exactly five entries —
test 1 and test 2 under both `healthy` and `stalled`, backstage under
`backstage` (guards skip at runtime, not list time) — and no TS errors.

### 3. Full-suite run (the AC's own command)

Run the canonical invocation from the preamble. **Pass criteria:** 3
passed, 2 skipped, 0 failed; total wall clock well under the 40s
`globalTimeout`; the JSON report at `test-results/flow-report.json` shows
`activateAction` steps present in both projects' passing tests.

### 4. Negative check — prove the label contract can fail legibly

Temporarily set `PRIMARY_ACTION_NAME` to a wrong value (e.g.
`'Ask for a stale note'`), run only `--project=healthy`, and confirm the
run **fails on the named `activate the labeled primary action` step** with
the role/name locator in the message — that failure mode is the ticket's
entire point, so it gets exercised once. Revert immediately; re-run
healthy to confirm green. Nothing from this step is committed.

### 5. Stability + regression sweep

- Repeat step 3's full run once more (retries=0, workers=1, cold server
  each time — two consecutive green full runs is the flake bar this
  suite can offer locally).
- `npm test` (148 unit tests — should be untouched by a tests/-only
  change, run to prove it).
- `npm run typecheck` (astro check + tsc + worker types).

### 6. Commit

Single commit of the two test files, message per the strategy above.
Do **not** touch `docs/active/tickets/T-005-01-02.md` frontmatter — Lisa
owns phase/status transitions.

### 7. Artifacts

`progress.md` maintained during steps 1–6 (what's done, what remains,
deviations); `review.md` written after — summary of changes, coverage
assessment, open concerns. Commit artifacts as a docs commit
(`docs(demo): T-005-01-02 review handoff`).

## Testing strategy summary

- **No new unit tests.** The change *is* test code; its own execution
  under both projects is the coverage. `src/` is untouched, so the
  existing 148 unit tests are a pure regression gate.
- **Integration surface:** the full three-project Playwright run is the
  AC's literal command and the primary verification.
- **Negative-path evidence:** step 4 proves the new assertion actually
  detects label drift (a check that cannot fail is theater — N4).

## Risks and contingencies

- **Stalled-click disabled-state race:** none expected —
  `primaryAction.disabled = true` is the handler's first synchronous
  statement and the stalled fetch never settles to re-enable it;
  `toBeDisabled()` polls within `assertion` budget. If it flakes anyway,
  the fallback assertion is `#receipt-status` visibility only (drop the
  disabled check, document in progress.md).
- **Healthy nonce-change race:** `not.toHaveText(nonceBefore)` polls until
  the new receipt lands; a slow round trip fails at the `actionStep`
  budget on its own named line — that is the designed failure, not a
  flake.
- **Wrong-skip risk:** guards compare against `FLOW_PROJECT` consts (no
  string literals), so a typo is a type error, not a silent all-skip. The
  `--list` check in step 2 plus "3 passed, 2 skipped" in step 3 catches
  miscounts.
- **Orphaned dev server from prior sessions:** the preamble's
  port-4323 kill handles it; if a run still reports "exited early",
  `npx astro dev stop` then retry (per the project memory note).
