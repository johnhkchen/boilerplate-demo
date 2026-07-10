# Progress — T-002-02-03 one-command-integration-check

## Current state

- Research: complete (`research.md`).
- Design: complete (`design.md`).
- Structure: complete (`structure.md`).
- Plan: complete (`plan.md`).
- Implement: complete.
- Review: pending.

The ticket frontmatter has not been edited.

## Completed implementation units

### Phase artifacts

- Mapped the prerequisite operation, Playwright, leak, fault, server, environment,
  timeout, and reporting contracts.
- Selected a Node child-process orchestrator with a pure aggregation core.
- Defined file-level boundaries, lifecycle, security constraints, tests, and atomic
  implementation steps.
- Commit `d408f5b`: Research and Design.
- Commit `f37edf8`: Structure and Plan.

### Bounded aggregation core

- Added `src/lib/integration-check.ts` with ordered operation/flow/leak execution,
  ordinary-failure continuation, parent-deadline racing, normalized failure kinds,
  receipt-boundary formatting, structured reports, and exact secret redaction.
- Added `test/integration-check.test.mjs` covering healthy aggregation, ordering,
  continuation, classification, runner rejection, abort-ignoring deadline behavior,
  consumed setup budget, summary content, report redaction, and invalid budgets.
- Registered the suite in the working `package.json` while preserving all
  prerequisite suites.
- `npm test`: 38/38 pass, zero skipped/failing.
- `npx tsc --noEmit`: pass.
- Commit `2941b88`: aggregation core, tests, and initial progress ledger. The
  `package.json` hunk is intentionally not in that commit because the same working
  lines include uncommitted prerequisite-ticket script/test additions.

### Process orchestration

- Added `scripts/integration-check.ts`.
- It validates overall budget and port, generates a disposable key when needed,
  creates a mode-specific temporary Wrangler config with file mode 0600, builds,
  starts one process-group-owned Astro server, waits for readiness, and points all
  three existing commands at the same URL.
- It streams and retains bounded redacted child output, terminates active process
  groups on abort, aggregates non-zero results without short-circuiting, writes
  `test-results/integration-report.json`, stops the server, and removes the temp
  directory in `finally`.
- Modified `astro.config.mjs` with an optional private
  `DEMO_WRANGLER_CONFIG_PATH` platformProxy seam. Ordinary `.dev.vars` behavior is
  unchanged when the selector is absent.
- Added the `integration:check` package script in the working `package.json`.
- `npm run build`: pass.
- `npx playwright test --list`: 2 tests collected (`healthy`, `stalled`).

### Operator documentation

- Added `docs/knowledge/integration-check.md` with setup, healthy and fault
  commands, expected kinds/exits, budget/port overrides, evidence locations,
  security warning, and troubleshooting.
- Updated `.dev.vars.example` with the combined command and runbook pointer; no
  secret was added.

## Live acceptance matrix

All runs used the identical `npm run integration:check` package command. Fault runs
changed only `DEMO_FAULT`. The default overall budget was 45 seconds.

| Mode | Aggregate | Wall time | Normalized primary evidence | Other checks |
|---|---:|---:|---|---|
| off | exit 0 | 4.69s | all three `receipt` checks passed | operation, flow, leak all ran |
| broken | exit 1 | 4.33s | `receipt [operation]` | flow and leak ran and passed |
| stalled | exit 1 | 12.06s | `receipt [timeout]` | flow timed out; leak returned evidence failure |
| leak | exit 1 | 3.94s | `receipt [leak]` | operation and flow ran and passed |

### Healthy details

- Build completed.
- Owned server became ready on `127.0.0.1:4324`.
- Operation verified the signature against the out-of-band generated key.
- Chromium ran the real audience flow: 1 test passed.
- Leak assertion checked 2 client assets and 1 response body.
- Final aggregate duration recorded by the command: 3.6s.

### Broken details

- The real route returned a well-shaped but corrupted receipt.
- Operation failed with `signature did not verify against the out-of-band key`.
- The aggregator normalized `[operation]`, then continued.
- Chromium flow passed, as expected because the browser does not cryptographically
  verify the receipt.
- Leak assertion passed.
- Final aggregate duration: 3.2s.

### Stalled details

- Operation failed at 2004.9ms against its 2000ms budget with `[timeout]`.
- Chromium reached the boxed receipt step and failed its 4000ms expectation while
  `#receipt-status` remained visible.
- Playwright retained a trace and error context under `test-results/artifacts/`.
- Leak response read failed within its own 2000ms budget and normalized to
  `evidence`; it did not hang the aggregate.
- Final aggregate duration: 10.9s; measured process wall time 12.06s, well below
  the 45s parent deadline.

### Leak details

- Operation passed and verified the signature.
- Chromium flow passed.
- Leak assertion found the exact browser surface:
  `response body: http://127.0.0.1:4324/api/receipt`.
- The aggregate normalized this to `receipt [leak]`.
- The key itself was not printed.
- Final aggregate duration: 2.8s.

## Remaining implementation units

1. Run final regression, diff, frontmatter, cleanup, port, and secret-hygiene checks.
2. Commit ticket-owned implementation/docs paths without absorbing prerequisite
   worktree changes.
3. Write `review.md`.

## Remaining implementation units

1. Add the bounded aggregation core and deterministic tests.
2. Add the temporary Wrangler config seam and process orchestrator.
3. Add the operator runbook and `.dev.vars.example` pointer.
4. Run the healthy/broken/stalled/leak acceptance matrix where host capabilities
   permit it.
5. Run full regression/hygiene gates and record exact evidence.
6. Write `review.md`.

## Deviations

1. **Package metadata shares prerequisite changes.** `package.json` already carried
   uncommitted Playwright and leak-ticket additions when this ticket began. The
   working file correctly composes all scripts/tests, but commits must not falsely
   attribute prerequisite lines to this ticket. Ticket-only source/docs commits use
   explicit paths; final review records the package hunk state.
2. **Live verification was fully available.** Unlike prerequisite managed sessions,
   this host allowed both socket binding and Chromium IPC, so no planned live gate
   was skipped.
