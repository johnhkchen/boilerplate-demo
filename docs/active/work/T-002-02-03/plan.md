# Plan — T-002-02-03 one-command-integration-check

## Goal

Deliver and verify `npm run integration:check`: one bounded local command that
builds the evidence surface, owns a server, runs operation/Playwright/leak checks,
and produces a normalized receipt-boundary summary plus JSON report.

## Testing strategy

The implementation has two testing levels.

### Deterministic automated contract tests

Test the new aggregation core with injected command runners. These tests prove
ordering, continuation, classification, aggregate exit semantics, deadline behavior,
formatting, and redaction without requiring network or browser capabilities.

### Real process integration

Run the production command on a capable host in healthy and all three fault modes.
This verifies the child-process edge, temporary Cloudflare environment, build,
Astro server, Chromium, actual receipt route, leak response inspection, cleanup,
report writes, and measured overall budget.

Existing unit suites remain the detailed tests for each specialized check. Existing
Playwright config/list mode and Astro build remain static integration gates.

## Step 1 — record Structure and Plan

### Do

- Write `structure.md` with the exact module, script, test, config, documentation,
  lifecycle, output, security, and commit boundaries.
- Write this `plan.md` before implementation code.
- Do not change ticket frontmatter.

### Verify

- Both files exist under `docs/active/work/T-002-02-03/`.
- They agree with Design: Node orchestrator, temp config, one server, sequential
  non-short-circuit checks, one deadline, stdout + JSON.
- `git diff --check` reports no artifact formatting errors.

### Commit

`Define integration check structure and plan (T-002-02-03)`

## Step 2 — create the pure aggregation core

### Do

Create `src/lib/integration-check.ts` with:

- stable check/result/report types;
- ordered `operation`, `flow`, and `leak` list;
- positive finite budget validation;
- shared overall deadline and abort behavior;
- execution through an injected runner;
- ordinary failure continuation;
- timeout result plus skipped remainder;
- output-based failure classification;
- aggregate outcome computation;
- compact formatter naming the receipt boundary and kind;
- report creation with exact secret redaction.

Keep the file free of Node filesystem, spawn, env, and stdout imports.

### Verify with tests first/alongside implementation

Create `test/integration-check.test.mjs` and cover:

1. three zero exits execute in order and aggregate to passed;
2. a non-zero operation result still runs flow and leak;
3. `[operation]` and `[timeout]` are normalized from ops output;
4. Playwright timeout prose becomes `timeout`;
5. other Playwright non-zero becomes `flow`;
6. leak finding prose becomes `leak`;
7. leak config/network failure becomes `evidence`;
8. a runner that never settles is cut off by the overall budget;
9. later checks are marked skipped after deadline;
10. formatter contains aggregate outcome, budget, `receipt`, and kind;
11. report redacts a supplied key in nested output.

Register the suite in `package.json` without dropping any prerequisite tests.

Run:

```sh
npm test
npx tsc --noEmit
```

Expected: all tests pass; no TypeScript errors.

### Commit

`Add bounded integration result aggregation (T-002-02-03)`

## Step 3 — add the temporary platform config seam

### Do

Modify `astro.config.mjs` to read `DEMO_WRANGLER_CONFIG_PATH` and include it in the
Cloudflare adapter's `platformProxy` options only when supplied.

Requirements:

- no behavior change for ordinary `npm run dev`;
- no public/client-prefixed variable;
- no key read or logged in the config module;
- comment explains this is the owned integration harness path.

### Verify

Run:

```sh
npm run build
```

Then, if socket binding is available, start Astro once with a minimal temporary
Wrangler config and request `/api/receipt` to prove the configured key/fault reaches
`locals.runtime.env`.

### Commit

This change commits with Step 4 because the seam has no independent user without
the orchestrator.

## Step 4 — implement the process orchestrator

### Do

Create `scripts/integration-check.ts`.

Configuration:

- parse `DEMO_FAULT` with existing `parseFaultMode`;
- validate `INTEGRATION_CHECK_TIMEOUT_MS` (default 45,000);
- validate `INTEGRATION_CHECK_PORT` (default 4324);
- use supplied `DEMO_SIGNING_KEY` or generate a random per-run key;
- compute one local `http://127.0.0.1:<port>` base URL.

Temporary config:

- use `mkdtemp` under OS temp;
- write minimal Wrangler JSON with key and recognized fault;
- never print contents;
- remove recursively in `finally`.

Finite command helper:

- use `spawn` with argument arrays and `shell: false`;
- stream labeled output;
- capture a bounded tail;
- resolve numeric exit and duration;
- handle spawn error;
- terminate on abort with forced fallback;
- redact the key from any captured/emitted content.

Server helper:

- start `npm run dev -- --host 127.0.0.1 --port <port>`;
- pass `DEMO_WRANGLER_CONFIG_PATH`;
- retain bounded logs for diagnostics;
- poll base URL until a response or startup ceiling;
- detect early child exit;
- stop gracefully/forcibly in `finally`.

Main sequence:

1. start overall monotonic timer and abort deadline;
2. create temporary config;
3. run build and stop with setup failure if non-zero;
4. start/wait for server;
5. invoke `runIntegrationChecks` with a runner mapping each check to its existing
   npm script and target env;
6. print compact normalized summary;
7. create/write redacted JSON report;
8. return `0` only if aggregate passed and report write succeeded;
9. always stop server, remove temp files, clear timer, and detach signals.

Add `integration:check` to `package.json`.

### Verify

```sh
npx tsc --noEmit
npm test
npm run build
npx playwright test --list
```

Inspect script error paths for:

- invalid budget/port → exit 2 with no child started;
- build/start failure → non-zero setup summary;
- child non-zero → later checks still run;
- deadline → child/server killed, later checks skipped, non-zero;
- report directory absent → created;
- secret never printed or persisted.

### Commit

`Compose operation flow and leak checks (T-002-02-03)`

## Step 5 — document operator usage

### Do

Create `docs/knowledge/integration-check.md` with:

```sh
npm run integration:check
DEMO_FAULT=broken npm run integration:check
DEMO_FAULT=stalled npm run integration:check
DEMO_FAULT=leak npm run integration:check
```

Document:

- prerequisite dependency/browser install;
- default 45-second overall budget;
- optional budget and port overrides;
- expected zero/non-zero exits;
- expected normalized kinds for each fault;
- `test-results/integration-report.json` and Playwright evidence;
- disposable key/config behavior;
- warning against leak mode outside the owned local verification server.

Update `.dev.vars.example` with a pointer to the combined command and explain that
it does not require changing `.dev.vars`.

### Verify

- Copy/paste every documented command against actual package script names.
- Search docs for stale command/fault spelling.
- Confirm no literal generated key is present.

### Commit

`Document the one-command integration gate (T-002-02-03)`

## Step 6 — execute the live acceptance matrix

### Preflight

```sh
npx playwright install chromium
```

Use a distinctive temporary `DEMO_SIGNING_KEY` only if explicitly testing supplied
key redaction; ordinarily let the command generate its key.

### Healthy

```sh
/usr/bin/time -p npm run integration:check
```

Verify:

- exit 0;
- build, operation, flow, and leak sections ran;
- normalized summary has three receipt passes;
- report outcome is passed;
- wall time is below 45 seconds;
- owned port is released after exit.

### Broken

```sh
/usr/bin/time -p env DEMO_FAULT=broken npm run integration:check
```

Verify:

- non-zero;
- operation output rejects signature;
- normalized summary/report names `receipt` and `operation`;
- flow and leak still ran;
- wall time below budget.

### Stalled

```sh
/usr/bin/time -p env DEMO_FAULT=stalled npm run integration:check
```

Verify:

- non-zero;
- operation fails at its timeout;
- browser named receipt wait fails within Playwright budget;
- leak response cannot hang the parent;
- normalized evidence names `receipt` and `timeout`;
- wall time below overall budget;
- port released after exit.

### Leak

```sh
/usr/bin/time -p env DEMO_FAULT=leak npm run integration:check
```

Verify:

- non-zero;
- leak check names the exact response URL;
- normalized evidence names `receipt` and `leak`;
- operation and flow still ran;
- no secret literal appears in stdout or report;
- wall time below budget.

### Report inspection

After each run:

```sh
node -e "const r=require('./test-results/integration-report.json'); console.log(r.outcome, r.faultMode, r.durationMs, r.checks.map(c=>[c.check,c.outcome,c.failureKind]))"
```

If the managed host blocks socket binding or Chromium, record the exact command and
host error in `progress.md`; do not misclassify it as a product failure or claim the
four-mode matrix passed.

## Step 7 — full regression and hygiene pass

Run:

```sh
npm test
npx tsc --noEmit
npm run build
npx playwright test --list
git diff --check
git status --short
```

Also verify:

- ticket frontmatter has no diff;
- `.dev.vars` is unchanged;
- no temporary Wrangler config remains in the repository;
- `dist` and `test-results` remain ignored;
- no unrelated uncommitted files were staged;
- server process and port are gone;
- report/output contain no key.

Update `progress.md` with exact counts, durations, deviations, and commit hashes.

### Commit

`Record integration check verification (T-002-02-03)`

## Step 8 — Review

Inspect all ticket diffs and generated evidence. Write `review.md` summarizing:

- delivered command and lifecycle;
- files created/modified/deleted;
- healthy and three fault outcomes;
- unit/static/live test coverage;
- overall deadline evidence;
- security/redaction evidence;
- environment-limited checks;
- coverage gaps, TODOs, and open concerns;
- incremental commit status.

Do not update ticket phase or status. Stop after `review.md` is complete.

### Commit

`Add review artifact for one-command integration check (T-002-02-03)`

## Acceptance checklist

- [ ] `npm run integration:check` is documented and discoverable.
- [ ] It builds once and owns one server.
- [ ] It runs operation, Playwright, and leak checks against that server.
- [ ] It continues after ordinary check failures.
- [ ] Healthy aggregates to exit 0.
- [ ] Broken aggregates non-zero with `receipt` + `operation`.
- [ ] Stalled aggregates non-zero with `receipt` + `timeout` inside the budget.
- [ ] Leak aggregates non-zero with `receipt` + `leak`.
- [ ] One deadline covers setup and all children.
- [ ] Stdout is readable and JSON evidence is written.
- [ ] Generated/supplied key is absent from output and report.
- [ ] Existing test/build/type/Playwright collection gates pass.
- [ ] Owned server and temp configuration are always cleaned up.
- [ ] Ticket frontmatter is untouched.
- [ ] `progress.md` and `review.md` accurately state completed and blocked evidence.
