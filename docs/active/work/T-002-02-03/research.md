# Research — T-002-02-03 one-command-integration-check

## Ticket state and requested outcome

- The ticket begins in `phase: research`; no artifact for this ticket existed.
- The ticket requires one documented command that composes the operation probe,
  Playwright audience flow, and bundle/response leak assertion.
- A healthy demo must make that command exit zero.
- Each deliberate `DEMO_FAULT` mode (`broken`, `stalled`, and `leak`) must make it
  exit non-zero inside one overall time budget.
- Failure evidence must name both the offending boundary and the failure kind in
  stdout or a report file.
- The ticket frontmatter is Lisa-owned and must not be changed.

## Repository and workflow constraints

- `CLAUDE.md` is the project-wide source of truth referenced by `AGENTS.md`.
- `docs/knowledge/rdspi-workflow.md` requires all six phases in one pass.
- Implement must maintain `progress.md` and make incremental commits where the
  checkout permits it.
- The worktree contains prerequisite-ticket changes that are not yet committed.
  Those files are the required baseline, not changes to discard or rewrite.
- Generated Astro output (`dist/`) and Playwright evidence (`test-results/`) are
  already ignored.
- The repository is ESM and uses Node's TypeScript stripping for small operator
  scripts rather than a separate script build.

## Existing operation check

### Core

- `src/lib/operation-runner.ts` turns one asynchronous invocation into a bounded,
  structured `OperationResult`.
- Its trace always carries `operationName`, `durationMs`, and `outcome`.
- Failures distinguish `operation` from `timeout`.
- It races the invocation with a timer and aborts the supplied signal on timeout.
- A callback that ignores abort still cannot keep the runner from settling.
- Invalid names or budgets reject as configuration errors before invocation.

### Receipt adapter

- `src/lib/ops-check.ts` adapts the runner to `/api/receipt`.
- The stable boundary name is `receipt`, sourced from `src/lib/receipt.ts`.
- The adapter checks HTTP success and exact receipt shape.
- When an out-of-band key is available, it verifies the response signature.
- This makes the deliberate `broken` response fail despite remaining HTTP 200 and
  structurally receipt-shaped.
- `formatBoundaryTrace` already emits stack-free agent-readable output.
- Failure headings include the boundary and bracketed kind, for example
  `receipt ... [operation]` or `receipt ... [timeout]`.

### CLI

- `scripts/ops-check.ts` resolves its target from `OPS_CHECK_URL` or
  `DEMO_BASE_URL`.
- Its default operation budget is 2,000 ms and is configurable through
  `OPS_CHECK_TIMEOUT_MS`.
- It reads `DEMO_SIGNING_KEY` from process env or `.dev.vars`.
- Exit `0` means healthy, `1` means boundary failure, and `2` means invalid check
  configuration.
- The npm entry point is `npm run ops:check`.

## Existing Playwright flow

- `playwright.config.ts` defines `healthy` and `stalled` projects.
- `tests/demo-flow.spec.ts` uses one audience-flow test for both projects.
- The flow loads `/`, then waits for the signed receipt DOM to become visible.
- The critical boxed step is named `await receipt boundary response`.
- The stalled project intercepts `/api/receipt` and intentionally never resolves
  the browser request.
- Nested budgets live in `tests/support/flow-contract.ts`.
- Assertion, action, receipt-step, test, server-startup, and global run budgets are
  4s, 5s, 5s, 10s, 10s, and 20s respectively.
- Retries are disabled and one worker is used, making timing and attribution
  deterministic.
- List output prints named steps.
- JSON output is written to `test-results/flow-report.json`.
- Traces are retained on failure under `test-results/artifacts/`.
- `npm run test:flow` selects only the healthy project.
- `npm run test:flow:stalled` selects the synthetic route-intercept project.
- Setting `PLAYWRIGHT_BASE_URL` disables Playwright's owned local server, so a
  parent orchestrator can point the flow at an already-running demo.

## Existing leak check

### Core

- `src/lib/leak-check.ts` scans regular browser-delivered files recursively.
- `_worker.js`, `_routes.json`, and `.assetsignore` are excluded as server or deploy
  metadata rather than browser assets.
- The scanner searches raw bytes for the exact configured secret.
- The response checker fetches raw text, so leaks in successful, error, malformed,
  or extended JSON bodies remain visible.
- Its response read has a separate configurable timeout and abort controller.
- Missing secrets, unreadable/empty bundles, invalid budgets, or unavailable
  responses reject rather than creating false green evidence.
- Findings identify `asset` or `response` plus an exact path/URL.
- The formatter never prints the secret itself.

### CLI

- `scripts/leak-check.ts` scans `dist` by default.
- Its response target derives from `LEAK_CHECK_URL` or `DEMO_BASE_URL`.
- It reads the secret from process env or `.dev.vars`.
- Its default response budget is 2,000 ms.
- Exit `0` means clean, `1` means a leak, and `2` means configuration or evidence
  was unavailable.
- The npm entry point is `npm run leak:check`.
- The checker assumes a production build already exists and a server is reachable.

## Deliberate fault behavior

- `src/lib/fault.ts` defines `off | broken | stalled | leak`.
- Unknown, missing, empty, or mistyped values fail safe to `off`.
- `broken` deterministically corrupts a valid signature.
- `stalled` leaves the receipt response pending until the request aborts.
- `leak` adds the actual configured key to the otherwise valid receipt payload.
- `src/pages/api/receipt.ts` reads `DEMO_FAULT` from
  `locals.runtime.env`, next to `DEMO_SIGNING_KEY`.
- Healthy and all fault modes use the same public `/api/receipt` boundary.
- Broken is principally detected by the operation check.
- Stalled is detected by the operation timeout, browser receipt wait, and leak
  response timeout.
- Leak is principally detected by the response leak check.
- The browser UI does not verify receipt signatures and ignores extra JSON fields,
  so it can remain green for broken and leak while the specialized checks fail.

## Server and environment behavior

- `astro.config.mjs` enables the Cloudflare adapter's `platformProxy`.
- In ordinary dev, platformProxy loads `.dev.vars` beside the Wrangler config and
  exposes it through `locals.runtime.env`.
- Existing prerequisite evidence records that process-env fault injection did not
  override an existing `.dev.vars` file.
- Wrangler's installed implementation confirms why: when `.dev.vars` is present,
  it uses that parsed file before the optional process-env path.
- The Cloudflare adapter accepts a `platformProxy.configPath` option.
- A temporary Wrangler config can therefore provide a per-run key and fault mode
  without editing the developer's `.dev.vars`.
- `astro.config.mjs` can select that config path from a private operator env var
  while retaining the current default when the variable is absent.
- This keeps deliberate `leak` material transient and ignored by normal repository
  state.

## Lifecycle mismatch to resolve

- `ops:check` and `leak:check` expect a server that somebody else owns.
- The leak checker also expects `dist` to exist.
- Playwright owns a server only when `PLAYWRIGHT_BASE_URL` is absent.
- Running the three npm commands naively would either start multiple servers or
  leave ops/leak without one.
- A combined command therefore needs to own setup: build once, start one server,
  wait for readiness, point all three observers at it, and always stop it.
- It must continue to later checks after an ordinary check failure so the final
  summary reflects composition rather than short-circuiting at the first red item.
- Setup failure is different: without a build or server, downstream checks cannot
  produce meaningful boundary evidence.

## Deadline and child-process boundary

- The existing budgets bound their own principal waits, but no parent currently
  bounds build, server startup, reporter teardown, or the sequence as a whole.
- The combined command needs one monotonic deadline that begins before build.
- A timeout must terminate the active child process and prevent remaining work from
  starting after the deadline.
- Server cleanup must run on success, failure, timeout, and process signal paths.
- Captured child output should remain bounded enough to avoid turning a failed
  browser run into an unbounded in-memory log.
- The overall summary must be emitted even when a child exits non-zero.

## Reporting boundary

- Existing check output is human-readable but has three different formats.
- Existing exit codes agree on `0 = pass`, while non-zero meanings are local to
  each command.
- The combined layer must normalize those results without replacing the detailed
  child evidence.
- A small stable report shape can record check name, outcome, exit code, duration,
  boundary, failure kind, and captured output.
- `test-results/integration-report.json` fits the existing ignored evidence area.
- Stdout remains the fastest interface for an agent; the JSON file supports later
  inspection and exact assertions.

## Documentation location

- The repository currently has no root README.
- `.dev.vars.example` is the existing operator-facing setup document.
- `package.json` is the discoverable command catalog.
- The combined command and its `DEMO_FAULT` examples can be documented in a new
  focused integration-harness document under `docs/knowledge/`.
- The `.dev.vars.example` fault comments can point to the combined command without
  containing any real secret.

## Existing automated coverage relevant to composition

- Operation-runner tests cover pass, failure, timeout, invalid configuration, and
  late work isolation.
- Ops-check tests cover healthy, down, stalled, invalid signature, HTTP error,
  malformed shape, keyless behavior, and formatter output.
- Fault tests cover parsing, broken signature semantics, leak payload semantics,
  and broken-to-ops composition.
- Leak tests cover clean evidence, asset leak, response leak, actual leak payload,
  deterministic findings, missing evidence, and bounded stalled fetch.
- Playwright configuration and the named browser flow exist, though prior managed
  hosts could not always launch sockets or Chromium.
- No test currently covers aggregation, continuation after a failed check,
  normalized failure kinds, JSON summary shape, or the parent deadline.

## Boundaries and assumptions carried into Design

- Keep the three prerequisite commands independently usable.
- Do not move browser behavior into Node mocks or merge leak logic into ops logic.
- Do not edit `.dev.vars` during a run.
- Do not expose a public request-controlled fault switch.
- Do not treat missing evidence or setup failure as green.
- Do not depend on a fleet service; all orchestration stays repo-local.
- Use one owned server and Playwright's external-base-URL path.
- Preserve detailed child output while adding one normalized final summary.
- Make the overall budget configurable for slow CI, with a finite positive default.
- Treat `receipt` as the exemplar boundary named by all normalized failures.
