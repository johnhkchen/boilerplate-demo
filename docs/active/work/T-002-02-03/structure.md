# Structure — T-002-02-03 one-command-integration-check

## Architectural shape

The implementation adds one pure aggregation module and one Node process edge.
Existing operation, browser, and leak implementations remain unchanged and are
invoked through their current npm commands.

```text
npm run integration:check
  └─ scripts/integration-check.ts        lifecycle + process I/O
       ├─ temporary Wrangler config      run key + DEMO_FAULT
       ├─ npm run build                  client evidence
       ├─ npm run dev                    one owned server
       └─ src/lib/integration-check.ts   aggregate three command results
            ├─ npm run ops:check
            ├─ npm run test:flow
            └─ npm run leak:check
```

The script writes normalized evidence to:

```text
test-results/integration-report.json
```

That directory is already ignored and also contains Playwright evidence.

## Files created

### `src/lib/integration-check.ts`

Role: framework-free orchestration core for the three finite check commands.

Responsibilities:

- define stable check/result/report types;
- validate the positive finite overall budget;
- execute `operation`, `flow`, and `leak` in order through an injected runner;
- continue after ordinary non-zero results;
- race each invocation against the shared remaining deadline;
- abort and mark later checks skipped when the deadline wins;
- classify child exit/output into normalized failure kinds;
- compute aggregate pass/fail and total duration;
- render the compact final stdout summary;
- build a key-redacted serializable report.

No responsibilities:

- environment reads;
- filesystem access;
- process spawning or killing;
- server startup;
- stdout/stderr writes;
- secret generation;
- HTTP readiness polling.

Public types:

```ts
type IntegrationCheckName = 'operation' | 'flow' | 'leak';
type IntegrationOutcome = 'passed' | 'failed';
type IntegrationCheckOutcome = 'passed' | 'failed' | 'skipped';

interface CommandEvidence {
  exitCode: number;
  output: string;
  durationMs: number;
}

type IntegrationCommandRunner = (
  check: IntegrationCheckName,
  signal: AbortSignal,
) => Promise<CommandEvidence>;

interface IntegrationCheckResult {
  check: IntegrationCheckName;
  boundary: 'receipt';
  outcome: IntegrationCheckOutcome;
  durationMs: number;
  exitCode?: number;
  failureKind?: string;
  output: string;
}

interface IntegrationRunResult {
  outcome: IntegrationOutcome;
  durationMs: number;
  timeBudgetMs: number;
  timedOut: boolean;
  checks: IntegrationCheckResult[];
}
```

Public functions:

```ts
runIntegrationChecks(options): Promise<IntegrationRunResult>
formatIntegrationSummary(result): string
createIntegrationReport(result, options): IntegrationReport
```

`runIntegrationChecks` accepts an optional clock for deterministic tests only if
needed; production defaults to `performance.now()`.

Classification rules stay private to prevent callers depending on child prose.
The public stability is the normalized result.

### `scripts/integration-check.ts`

Role: executable edge and owner of all external state.

Top-level constants:

- default overall budget: `45_000` ms;
- default server port: `4324`;
- server startup ceiling: `10_000` ms;
- report path: `test-results/integration-report.json`;
- temporary config selector: `DEMO_WRANGLER_CONFIG_PATH`.

Internal configuration shape:

```ts
interface IntegrationConfig {
  faultMode: FaultMode;
  requestedFault: string | undefined;
  timeBudgetMs: number;
  port: number;
  baseUrl: string;
  signingKey: string;
}
```

Internal process result shape aligns with `CommandEvidence`.

Internal boundaries:

1. `resolveConfig()` reads env, parses fault through `parseFaultMode`, validates
   budget/port, and generates a key when needed.
2. `createTemporaryWranglerConfig(config)` creates a temp directory and JSON file,
   returning its path plus cleanup callback.
3. `runCommand(args, options)` spawns a finite child, streams/captures output, and
   terminates on abort.
4. `startServer(configPath, config, signal)` spawns Astro dev, retains bounded logs,
   and waits for HTTP readiness.
5. `stopServer(handle)` performs graceful then forced cleanup.
6. `writeReport(report, secret)` creates `test-results` and writes redacted JSON.
7. `main()` owns the parent deadline, setup sequence, injected three-check runner,
   summary, report, exit code, and `finally` cleanup.

Child command mapping:

| Core check | npm invocation | Required env |
|---|---|---|
| operation | `npm run ops:check` | `DEMO_BASE_URL`, `OPS_CHECK_URL`, key |
| flow | `npm run test:flow` | `PLAYWRIGHT_BASE_URL` |
| leak | `npm run leak:check` | `DEMO_BASE_URL`, `LEAK_CHECK_URL`, key |

All finite children receive the shared overall abort signal. The server receives
the temporary config path and is separately retained for cleanup.

### `test/integration-check.test.mjs`

Role: deterministic contract tests for aggregation and reporting.

Test groups:

- healthy sequence and order;
- continuation after normal failure;
- operation failure classification (`operation`, `timeout`);
- flow classification (`timeout`, `flow`);
- leak classification (`leak`, `evidence`);
- deadline against an abort-ignoring runner;
- skipped remainder after timeout;
- final summary includes boundary, kind, outcome, and budget;
- JSON report metadata and redaction.

Tests use injectable runner stubs. They do not spawn npm, bind a socket, launch a
browser, or create a real leak.

### `docs/knowledge/integration-check.md`

Role: operator/agent runbook for the combined gate.

Sections:

- prerequisite (`npm install`, Playwright Chromium installed);
- healthy command;
- deliberate broken/stalled/leak commands;
- overall timeout and port overrides;
- expected exit semantics;
- stdout summary and JSON/Playwright evidence locations;
- reminder that leak mode is deliberately unsafe and local verification only;
- note that the combined command owns its server and does not use `.dev.vars`.

## Files modified

### `package.json`

Changes:

- add `integration:check` pointing to `scripts/integration-check.ts` through Node
  TypeScript stripping;
- append `test/integration-check.test.mjs` to the existing `test` command.

No dependency is added. Existing prerequisite script entries remain intact.

### `astro.config.mjs`

Changes:

- read `DEMO_WRANGLER_CONFIG_PATH` from `process.env`;
- construct `platformProxy` with `enabled: true` and `configPath` only when set;
- preserve current `.dev.vars` behavior when it is absent;
- document that the override is private harness plumbing, not application config.

The selector contains only a file path. The secret remains in the temporary config
and never enters Astro's public environment.

### `.dev.vars.example`

Changes:

- keep the existing local dev key/fault guidance;
- add a short pointer to `npm run integration:check` and the runbook;
- clarify that combined checks inject a disposable key/fault config and do not
  require editing `.dev.vars` between modes.

No real key is added.

### `docs/active/work/T-002-02-03/progress.md`

Role: implementation ledger required by RDSPI.

Contents:

- phase artifact completion;
- implementation steps and commit boundaries;
- commands run and exact outcomes;
- live four-mode evidence where the host permits it;
- deviations and rationale;
- remaining review work.

### `docs/active/work/T-002-02-03/review.md`

Role: final human handoff.

Contents:

- outcome and operator contract;
- files created/modified/deleted;
- behavior by healthy/broken/stalled/leak mode;
- test and verification evidence;
- coverage gaps and environment blockers;
- open concerns and required reviewer action;
- commit status.

## Files explicitly unchanged

- `src/lib/operation-runner.ts`
- `src/lib/ops-check.ts`
- `scripts/ops-check.ts`
- `src/lib/leak-check.ts`
- `scripts/leak-check.ts`
- `tests/demo-flow.spec.ts`
- `tests/support/flow-contract.ts`
- `playwright.config.ts`
- `src/pages/api/receipt.ts`
- `src/lib/fault.ts`
- ticket frontmatter

The combined layer consumes all of these contracts without rewriting them.

## Process lifecycle

```text
resolve config
  ↓
start overall timer + install signal bridge
  ↓
create temp Wrangler config
  ↓
build dist ──failure──→ setup failure summary/report
  ↓
start dev server + readiness wait ──failure──→ setup failure summary/report
  ↓
operation → flow → leak
  │          │      │
  └──────── normalize, continue while deadline remains
  ↓
aggregate + stdout + JSON
  ↓
finally: stop server, remove temp directory, clear timer
```

Ctrl-C, SIGTERM, deadline, spawn error, and unexpected exceptions all converge on
the same `finally` cleanup path.

## Deadline ownership

The script creates one parent `AbortController` and timer before setup.

- Build and server-readiness helpers observe the signal directly.
- `runIntegrationChecks` receives the same signal plus the original absolute
  deadline or remaining budget.
- Each child command is terminated when the signal aborts.
- The core also races the runner Promise so a buggy injected runner cannot delay
  the aggregate beyond budget.
- The overall timer is cleared only during final cleanup.
- Timing uses `performance.now()`, not wall-clock timestamps.

## Output ownership

Child sections:

```text
── build ──
── operation ──
── flow ──
── leak ──
```

The final normalized section is the stable agent interface. Child prose is retained
for diagnosis but is not required for aggregation correctness.

The JSON report is written atomically enough for this local tool: create directory,
write one complete JSON string. A failed report write makes the command non-zero and
is stated on stderr; stdout evidence still remains available.

## Security boundaries

- The generated key uses `randomBytes`, not a fixed fixture.
- It appears only in process env for checks and a temporary local config.
- The temp directory is removed recursively in `finally`.
- Child output and reports undergo exact secret replacement before storage/printing
  by the parent capture path.
- The parent never logs config objects or the temporary config contents.
- `DEMO_FAULT=leak` remains clearly labeled unsafe and is intended only for the
  owned local server.
- No network-accessible control selects a fault.

## Commit boundaries

1. Structure and Plan artifacts.
2. Pure aggregation core plus tests and package test registration.
3. Process orchestrator plus Astro temporary-config seam and npm command.
4. Operator documentation, live verification adjustments, and progress evidence.
5. Review artifact.

Every commit stages explicit ticket paths because the worktree contains concurrent
prerequisite changes.

## Verification map

| Requirement | Primary evidence |
|---|---|
| one command | package script + runbook + live invocation |
| all three checks run | stub sequence test + child section output/report |
| healthy exit zero | aggregate unit test + live healthy run |
| broken exit non-zero | live run + report `receipt/operation` |
| stalled bounded | core deadline test + live run `receipt/timeout` |
| leak exit non-zero | live run + report `receipt/leak` |
| agent-readable evidence | formatter assertions + JSON schema |
| overall budget | abort-ignoring runner test + measured live runs |
| no secret disclosure | report redaction test + output inspection |
| existing commands preserved | full existing suite + build + flow collection |
