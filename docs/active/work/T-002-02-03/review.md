# Review — T-002-02-03 one-command-integration-check

## Outcome

The epic-level integration contract is delivered through one documented command:

```sh
npm run integration:check
```

It now performs the whole preflight lifecycle:

1. generates or accepts an out-of-band signing key;
2. creates an isolated temporary Wrangler config containing that key and the
   requested deliberate fault mode;
3. builds the deployable Astro/Cloudflare bundle;
4. starts one owned local server;
5. runs the existing receipt operation probe;
6. runs the real Chromium audience flow through Playwright;
7. scans browser assets and the raw receipt response for the key;
8. prints one normalized summary and writes a JSON report; and
9. terminates the server and deletes transient configuration in every handled
   outcome.

The same package command was verified live in healthy, broken, stalled, and leak
modes. Healthy is green. Every fault is red with `receipt` and the expected failure
kind, and every measured run is below the 45-second parent budget.

## Operator contract

Healthy:

```sh
npm run integration:check
```

Fault proof:

```sh
DEMO_FAULT=broken npm run integration:check
DEMO_FAULT=stalled npm run integration:check
DEMO_FAULT=leak npm run integration:check
```

Optional controls:

```sh
INTEGRATION_CHECK_TIMEOUT_MS=60000 npm run integration:check
INTEGRATION_CHECK_PORT=5432 npm run integration:check
```

The full runbook is `docs/knowledge/integration-check.md`. The stable structured
output is `test-results/integration-report.json`; Playwright JSON, error context,
and retained traces stay in their existing `test-results` locations.

## Acceptance matrix

| Mode | Exit | Wall time | Required normalized evidence | Result |
|---|---:|---:|---|---|
| healthy/off | 0 | 4.69s (final rerun 3.96s) | three receipt passes | met |
| broken | 1 | 4.33s | `receipt [operation]` | met |
| stalled | 1 | 12.06s | `receipt [timeout]` | met |
| leak | 1 | 3.94s | `receipt [leak]` | met |

All measurements are process wall time from `/usr/bin/time -p`, including npm
startup and cleanup. The command's own monotonic durations were 3.6s healthy,
3.2s broken, 10.9s stalled, and 2.8s leak. The final post-review healthy rerun also
recorded 2.8s internally and 3.96s wall.

## What each fault proved

### Broken

- The owned real route returned a valid-looking HTTP 200 receipt with its signature
  deliberately corrupted.
- The operation probe held the out-of-band generated key and rejected the response:
  `signature did not verify against the out-of-band key`.
- The normalized aggregate named `receipt [operation]` and exited 1.
- The command did not short-circuit: Playwright and leak checks still ran and
  passed, which is the correct specialization boundary.

### Stalled

- The real server route remained unresolved rather than using Playwright's
  synthetic interception project.
- Operation evidence failed at 2004.9ms against its 2000ms local budget with
  `[timeout]`.
- Chromium reached the named receipt step; its 4000ms expectation failed while the
  loading status remained visible.
- Playwright retained the error context and trace.
- Leak response evidence failed within its 2000ms read budget rather than hanging.
- The normalized summary included `receipt [timeout]`; process wall time was
  12.06s, far inside 45s.

### Leak

- The operation probe passed and verified the receipt signature.
- The real browser flow passed.
- The disclosure checker found the actual generated key in the raw response and
  named its exact surface URL.
- The normalized aggregate named `receipt [leak]` and exited 1.
- Neither specialized nor parent output printed the key.

## Files created

| File | Purpose |
|---|---|
| `src/lib/integration-check.ts` | Pure ordered aggregation, parent deadline race, failure normalization, formatter, report/redaction |
| `scripts/integration-check.ts` | Build/server/process/config/report lifecycle edge |
| `test/integration-check.test.mjs` | Deterministic aggregation, timeout, classification, formatting, and redaction coverage |
| `docs/knowledge/integration-check.md` | Copy/paste operator and agent runbook |
| `docs/active/work/T-002-02-03/research.md` | Codebase and constraint map |
| `docs/active/work/T-002-02-03/design.md` | Options, decisions, and rationale |
| `docs/active/work/T-002-02-03/structure.md` | File/interface/lifecycle blueprint |
| `docs/active/work/T-002-02-03/plan.md` | Ordered implementation and verification plan |
| `docs/active/work/T-002-02-03/progress.md` | Execution ledger and live evidence |
| `docs/active/work/T-002-02-03/review.md` | This handoff |

## Files modified

| File | Change |
|---|---|
| `astro.config.mjs` | Optional private platformProxy config-path seam for the isolated harness server |
| `package.json` | Working tree adds `integration:check` and registers the aggregation suite |
| `.dev.vars.example` | Working tree points operators to the combined command/runbook |

No file was deleted. Existing operation, leak, fault, receipt, browser-flow, and
Playwright core files were consumed without changes by this ticket.

## Aggregation behavior

`src/lib/integration-check.ts` owns the stable result contract rather than parsing
subprocess prose in the main script.

- Fixed order: operation → flow → leak.
- Exit 0 from a child is passed.
- Ordinary non-zero/throw is recorded and later checks continue.
- A shared remaining deadline is raced against every runner Promise.
- A runner that ignores abort cannot delay the aggregate.
- When the deadline wins, the current check records `overall-timeout` and remaining
  checks are skipped.
- The total duration can begin before core entry, allowing build and server startup
  to consume the same overall budget.

Normalized kinds are deliberately small:

- operation probe: `operation` or `timeout` from its structured heading;
- Playwright: `timeout` for timeout evidence, otherwise `flow`;
- disclosure check: `leak` for a matching surface, otherwise `evidence`;
- process runner: `execution`;
- parent deadline: `overall-timeout`.

Every normalized record carries `boundary: "receipt"`.

## Process and cleanup behavior

The process edge uses `spawn` argument arrays with `shell: false`. On POSIX it owns
child process groups so terminating npm also terminates its Astro/Playwright
descendants.

One abort controller is created before build. Its timer covers build, readiness,
the three checks, and ordinary child teardown. SIGINT/SIGTERM feed the same abort
path.

The server is stopped in `finally`. Review identified one edge where readiness
could throw before `main` received the server handle; `startServer` now terminates
that child locally before rethrowing. Spawn errors are observed and retained as
safe diagnostics.

Post-run checks found:

- no listener on TCP 4324;
- no `demo-runway-integration-*` temp directory;
- a complete healthy JSON report;
- no ticket/example/diagnostic key markers in that report.

## Configuration and security review

- Default overall budget: 45,000ms, positive finite validation.
- Default port: 4324, integer/range validation.
- Generated signing key: 24 random bytes rendered as hex.
- Temporary Wrangler file mode: 0600.
- Temporary config is outside the repository and removed recursively.
- Ordinary `npm run dev` keeps existing Wrangler + `.dev.vars` behavior because the
  config override is absent.
- Fault selection remains server configuration, not a request header/query or
  public UI control.
- Captured output is bounded to a 32,000-character tail per child.
- Parent capture and report generation exact-replace the known key with
  `[REDACTED]` as defense in depth.
- The parent never logs config contents.
- Leak mode remains explicitly documented as local-only and deliberately unsafe.

## Automated test coverage

Final `npm test`: **38/38 pass**, zero skipped/failing.

The new suite contributes 10 contract tests:

1. healthy run executes all checks in order and passes;
2. ordinary failure does not short-circuit;
3. operation/flow/leak kinds normalize correctly;
4. generic flow and unavailable leak evidence remain distinct;
5. runner rejection becomes execution evidence and later checks continue;
6. abort-ignoring runner is cut off and later checks skip;
7. already-consumed setup budget invokes no runner;
8. formatter includes aggregate, budget, receipt, and kind;
9. report metadata is correct and supplied secret is redacted;
10. invalid budgets reject before execution.

The existing 28 prerequisite tests still cover operation semantics, operation
adapter behavior, broken/stalled fault primitives, asset/response leak detection,
real leak-payload composition, evidence unavailability, and local timeouts.

## Other verification

- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `npx playwright test --list`: pass; healthy and stalled projects collected.
- Real healthy Playwright invocation: 1 Chromium test passed.
- Real stalled Playwright invocation: expected non-zero at named receipt wait,
  retained trace and error context.
- `git diff --check`: pass.
- Ticket frontmatter diff: empty.
- Final report contract assertion: pass.
- Secret-marker report scan: clean.

## Coverage gaps

### Parent deadline over a real child process

The parent deadline is proven deterministically against an abort-ignoring injected
runner, and all live fault runs stayed far below it. There is no committed test that
spawns a deliberately immortal OS process and asserts process-group termination.
The live stalled route exercises nested child timeouts and cleanup, but it completes
before the parent deadline. This is a reasonable remaining process-level gap.

### Cross-platform process groups

Live verification occurred on macOS/POSIX. The script selects `npm.cmd` and direct
child termination on Windows, but Windows behavior was not exercised. If Windows
becomes a supported primary host, add a platform CI smoke run.

### Setup failure report

Build/startup failures print explicit setup diagnostics and exit non-zero, but the
normalized JSON report is currently written only after the three-check aggregation
begins. The ticket requires agent-readable stdout or a report, so the contract is
met; a future schema can include setup stages if machine-only setup diagnosis is
needed.

## Open concerns and process notes

### Shared prerequisite package hunks

The checkout began with uncommitted prerequisite-ticket changes in `package.json`,
`.dev.vars.example`, lock metadata, fault/leak files, Playwright files, and tests.
This ticket preserved and composed them.

The working `package.json` is correct and was the file used for every passing live
run. It contains:

- prerequisite Playwright and leak script/dependency changes;
- this ticket's `integration:check` script;
- this ticket's aggregation test registration.

The package and `.dev.vars.example` working changes were deliberately not staged as
ticket-only commits because their diff hunks also contain prerequisite work that
would be falsely attributed. This is a process/commit-boundary concern, not a
runtime or acceptance failure. A branch integrator should commit the prerequisite
working changes in dependency order, then commit the two remaining T-002-02-03
lines/pointer cleanly. Do not discard the current working files.

### Generated report location

`test-results/integration-report.json` is intentionally ignored evidence, not a
source artifact. The final workspace report is healthy/off because the healthy run
was repeated after cleanup hardening. Fault evidence and exact measurements are
preserved in `progress.md` and this Review.

## Commit inventory

| Commit | Unit |
|---|---|
| `d408f5b` | Research and Design |
| `f37edf8` | Structure and Plan |
| `2941b88` | Pure aggregator, deterministic tests, initial progress |
| `9dd962a` | Process edge, Astro seam, runbook, live evidence |
| `c908dac` | Readiness/spawn cleanup hardening |
| final Review commit | Progress completion and this handoff |

Commits used explicit paths and did not stage unrelated Lisa/Vend/governance or
prerequisite-ticket working files.

## Final assessment

The acceptance criterion is met with live evidence, not only mocks:

- one documented command runs operation, Playwright, and leak checks together;
- healthy exits zero;
- broken, stalled, and leak each exit non-zero;
- each failure summary names `receipt` and the appropriate kind;
- all measured modes complete inside the explicit parent budget;
- stdout and JSON are agent-readable;
- the secret remains out of emitted evidence;
- server and temporary configuration cleanup are confirmed.

No critical product or implementation issue remains. The only material handoff note
is commit attribution for shared prerequisite package/template hunks; the working
integration itself is complete and green.
