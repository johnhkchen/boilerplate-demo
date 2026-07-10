# Design — T-002-02-03 one-command-integration-check

## Decision summary

Add a repo-local Node orchestrator behind `npm run integration:check`. It will:

1. create a temporary Wrangler config containing a run-specific signing key and
   the requested fault mode;
2. build the production client bundle;
3. start one Astro dev server on a dedicated port and wait for it to answer;
4. run the existing operation, healthy Playwright, and leak commands sequentially
   against that same server, continuing after ordinary check failures;
5. enforce one parent deadline beginning before setup;
6. terminate the server and remove transient configuration in every outcome; and
7. print and persist a normalized summary naming `receipt` and a failure kind.

The existing specialized checks remain independent and authoritative. The new
layer owns lifecycle, deadline, aggregation, and evidence normalization only.

## Option 1 — npm shell chaining

Example shape:

```sh
npm run build && npm run ops:check && npm run test:flow && npm run leak:check
```

### Advantages

- Almost no new code.
- Each existing command's output is preserved naturally.
- Familiar to contributors reading `package.json`.

### Problems

- There is no server lifecycle owner for ops and leak.
- `&&` stops at the first failure, so it does not compose all evidence.
- `;` continues but loses principled exit aggregation.
- Shell timeout tools are platform-specific and do not reliably terminate process
  trees on macOS, Linux, and Windows.
- No normalized final summary or JSON evidence is produced.
- Fault injection would still require editing `.dev.vars` or external manual setup.

### Decision

Rejected. Shell chaining does not meet lifecycle, continuation, deadline, or
reporting requirements.

## Option 2 — let Playwright own all orchestration

Playwright could add setup projects for build/ops/leak or global setup/teardown that
starts the server and invokes the non-browser checks.

### Advantages

- Playwright already owns server startup and a global timeout.
- Its reporters and trace directory already exist.
- One `playwright test` invocation would be outwardly simple.

### Problems

- Operation and leak checks are not browser tests and would become coupled to the
  Playwright runner.
- Their exit codes and detailed stdout would require custom reporter plumbing.
- A failed setup project can prevent dependent projects from running, conflicting
  with the need to gather all three results.
- The production build and transient Wrangler environment remain awkward.
- Future non-browser consumers would need Playwright installed and configured even
  when only the check aggregator is reused.

### Decision

Rejected. Playwright is one participant in the harness, not its architectural root.

## Option 3 — Node child-process orchestrator

A TypeScript Node script uses `spawn`, an overall `AbortController`, and small pure
aggregation helpers. It invokes the existing npm scripts without duplicating their
core logic.

### Advantages

- One portable lifecycle owner for build, server, checks, cleanup, and deadline.
- Existing commands stay independently runnable and testable.
- Non-zero children can be recorded without throwing away later evidence.
- Child output can be streamed to the operator and captured for JSON.
- The final process exit can reflect the aggregate rather than the last child.
- Pure classification/formatting helpers can be tested without starting browsers or
  sockets.

### Costs

- Adds process-management code that needs careful abort and cleanup handling.
- Full end-to-end verification requires a host capable of binding a socket and
  launching Chromium.
- A temporary configuration channel must be designed so fault mode reaches
  `locals.runtime.env` reliably.

### Decision

Chosen. It matches the repository's existing thin-CLI/pure-core pattern and owns
exactly the missing cross-cutting concerns.

## Decision 1 — command and configuration contract

The documented command is:

```sh
npm run integration:check
```

Supported operator inputs:

- `DEMO_FAULT`: unset/unknown → healthy; `broken`, `stalled`, or `leak` selects the
  deliberate server state through the existing parser contract.
- `INTEGRATION_CHECK_TIMEOUT_MS`: positive finite overall budget; default 45,000.
- `INTEGRATION_CHECK_PORT`: positive TCP port; default 4324.
- `DEMO_SIGNING_KEY`: optional input key. When absent, the orchestrator generates a
  high-entropy per-run key so broken and leak modes remain genuinely detectable.

The combined command intentionally does not depend on the developer's `.dev.vars`.
That file remains the ordinary `npm run dev` configuration path.

## Decision 2 — transient platform environment

The orchestrator creates a temporary directory with a minimal Wrangler JSON config:

- safe generated name;
- current compatibility date already used by the project;
- `vars.DEMO_SIGNING_KEY` set to the run key;
- `vars.DEMO_FAULT` set only when a recognized fault is requested.

`astro.config.mjs` will pass an operator-only environment-selected `configPath` to
the existing Cloudflare `platformProxy`. With no override, current behavior is
unchanged.

### Alternatives rejected

- **Rewrite `.dev.vars`:** risks clobbering local secrets, races concurrent runs,
  and leaves recovery work after interruption.
- **Process env only:** installed Wrangler behavior gives an existing `.dev.vars`
  precedence, so this is not deterministic.
- **Request header/query fault injection:** creates a remotely triggerable failure
  surface and changes the meaning of server-state faults.
- **Copy project to a temp cwd:** expensive, complicates module resolution, and is
  unnecessary when platformProxy already accepts a config path.

The temp config is removed in `finally`. The key is never printed or written to the
report.

## Decision 3 — one server, external Playwright target

The orchestrator starts:

```text
npm run dev -- --host 127.0.0.1 --port <port>
```

It polls the base URL until it receives any HTTP response, bounded by both a local
startup ceiling and the overall signal. It then passes the same base URL to:

- `DEMO_BASE_URL` / `OPS_CHECK_URL` for operation evidence;
- `PLAYWRIGHT_BASE_URL` for Playwright, disabling its `webServer` block;
- `DEMO_BASE_URL` / `LEAK_CHECK_URL` for leak evidence.

The browser command remains the healthy project for every server mode. This matters:
the `stalled` server fault must be observed from the actual boundary, not replaced by
the Playwright-only route interception. The standalone `test:flow:stalled` command
remains useful for isolated browser timeout testing.

## Decision 4 — build once before server start

`npm run build` runs inside the overall budget before starting the server.

- Leak scanning needs `dist`.
- Building first detects type/bundle failures before a long-running child exists.
- The dev server still serves source for the browser and route checks, while the
  leak assertion scans the deployable client artifact.
- A build failure makes downstream evidence unavailable, so it is a setup failure
  and the command stops rather than fabricating three check results.

## Decision 5 — sequential checks that do not short-circuit

After setup, run in this order:

1. operation;
2. flow;
3. leak.

Sequential execution avoids competing requests obscuring a deliberate stalled
server and makes stdout easy to follow. Ordinary non-zero exit from one check is
recorded, then the next check runs while time remains.

The order puts the cheapest, most boundary-specific evidence first and the bundle
assertion last. For expected fault behavior:

| Mode | Operation | Flow | Leak | Primary kind |
|---|---|---|---|---|
| healthy | pass | pass | pass | none |
| broken | fail | may pass | pass | `operation` |
| stalled | timeout | timeout | evidence unavailable/timeout | `timeout` |
| leak | pass | may pass | fail | `leak` |

The aggregate exits zero only when all three checks pass.

## Decision 6 — parent deadline semantics

The overall deadline starts before the build and covers:

- build;
- server startup;
- all three checks;
- ordinary reporter/process teardown.

At the deadline:

- the shared signal aborts;
- the active child receives termination;
- no later check begins;
- the current or aggregate result records `overall-timeout`;
- server cleanup runs;
- the command exits non-zero and writes the report if possible.

Default 45 seconds is above the existing 20-second Playwright global limit plus
build, startup, operation, and leak ceilings, while remaining short enough for a
pre-demo gate. The override supports slower CI without removing finiteness.

## Decision 7 — child-process behavior

Use argument arrays with `spawn` and `shell: false`; this avoids quoting and command
injection problems. Select `npm.cmd` on Windows and `npm` elsewhere.

For finite commands:

- inherit a controlled environment;
- stream stdout/stderr to the parent so progress stays visible;
- capture a bounded tail for classification and reporting;
- resolve on `close` with the numeric exit code;
- treat spawn errors as a failed execution;
- on abort, send `SIGTERM`, then use a short forced-kill fallback.

The long-running server is kept as a handle and terminated in `finally`. Signal
handlers translate Ctrl-C/termination into the same abort path.

## Decision 8 — normalized result model

Add a pure core module with these concepts:

- check name: `operation | flow | leak`;
- outcome: `passed | failed | skipped`;
- boundary: always `receipt` for this exemplar harness;
- failure kinds:
  - operation output bracket if present (`operation` or `timeout`);
  - `timeout` for Playwright timeout wording;
  - `flow` for other Playwright failures;
  - `leak` when the disclosure formatter reports a finding;
  - `evidence` for leak-check configuration/unavailability;
  - `execution` for spawn/unknown process failures;
  - `overall-timeout` for the parent deadline.

The core receives an injectable command runner for unit tests. It continues after
ordinary failures and stops/skips after the shared deadline.

## Decision 9 — stdout and JSON report

Detailed child output remains visible under clear section labels. At the end,
stdout prints a compact block such as:

```text
Integration check: FAILED in 8.2s (budget 45.0s)
✓ receipt [operation] passed
✗ receipt [timeout] failed (flow)
✗ receipt [evidence] failed (leak)
Report: test-results/integration-report.json
```

For healthy runs all three lines are green and the heading is `PASSED`.

The JSON report includes schema version, aggregate outcome, budget/duration,
selected fault mode, and normalized check records. Captured output may be included
but the signing key must be redacted before persistence. Because existing child
formatters do not print the key, exact replacement is a defense-in-depth step.

## Decision 10 — test strategy

### Unit/integration-with-stubs

Add `test/integration-check.test.mjs` covering:

- all three zero exits → passed aggregate;
- ordinary failed operation does not prevent flow/leak execution;
- operation bracket classification;
- Playwright timeout versus generic flow classification;
- leak finding versus evidence failure classification;
- overall deadline settles when a runner ignores abort and skips remaining checks;
- formatter always names `receipt` and the failure kind;
- report serialization contains no supplied secret.

### Static/build gates

- `npm test` includes the new suite.
- `npx tsc --noEmit` validates script and config typing.
- `npm run build` validates Astro/Cloudflare output.
- Playwright list mode validates project collection.
- `git diff --check` validates patch hygiene.

### Live gate

On a capable host, run the identical command four times:

```sh
npm run integration:check
DEMO_FAULT=broken npm run integration:check
DEMO_FAULT=stalled npm run integration:check
DEMO_FAULT=leak npm run integration:check
```

Record wall time, exit, stdout summary, and JSON result. Fault runs must finish below
the configured overall budget and name `receipt` plus `operation`, `timeout`, or
`leak` respectively.

## Scope boundaries

- No provider abstraction, retry/polling library, CI workflow, or deployed monitor.
- No custom Playwright reporter; existing list/JSON/trace evidence is retained.
- No public fault endpoint or UI control.
- No change to the receipt payload except existing deliberate fault behavior.
- No replacement of the three prerequisite commands.
- The orchestrator targets the single exemplar boundary named by the epic.
