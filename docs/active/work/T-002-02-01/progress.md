# Progress — T-002-02-01 time-budgeted-playwright-flow

Implementation ledger for `plan.md`. The ticket frontmatter has not been edited.

## Baseline — complete

- Began from ticket `phase: research`, `status: open`.
- Read `CLAUDE.md`, `AGENTS.md`, and the complete RDSPI workflow before work.
- Mapped the static home page, client receipt fetch, dynamic receipt route, local
  env path, package scripts, and T-002-01-02 artifacts.
- At Research time, the repository had no committed Playwright dependency,
  configuration, spec, or generated-output ignores.
- Existing unrelated untracked Lisa, Vend, governance, ticket, and work files are
  outside this ticket's staging scope.

## RDSPI artifacts — complete through Plan

- `research.md`: current browser seam, topology, constraints, and adjacent-ticket
  boundaries.
- `design.md`: one flow through `healthy` / `stalled` projects, layered budgets,
  unresolved route interception, and list/JSON/trace evidence.
- `structure.md`: exact files, exports, selectors, scripts, and commit boundaries.
- `plan.md`: ordered implementation, healthy/stalled gates, regression checks,
  and Review requirements.

## Step 1 — Playwright dependency installed

- The normal registry-backed `npm install` returned without changing the project
  in this restricted environment.
- The user's npm cache already contained complete Playwright 1.61.1 package
  tarballs and matching Chromium 1228 browser assets.
- Copied only the six relevant npm cache records (three package manifests and
  three tarballs) to writable `/private/tmp/playwright-npm-cache`.
- Installed with `npm install --offline --cache /private/tmp/playwright-npm-cache
  --save-dev @playwright/test@1.61.1`.
- Result: `@playwright/test@1.61.1`, `playwright@1.61.1`, and
  `playwright-core@1.61.1` added; npm audit reported zero vulnerabilities.
- `node_modules/.bin/playwright --version` prints `Version 1.61.1`.
- Existing npm `allow-scripts` warnings for Astro/Cloudflare transitive packages
  remain; Playwright itself does not require a package postinstall here.

## Concurrency deviation — preserve sibling `npm test`

- Between Research and installation, a concurrent Lisa ticket added an uncommitted
  generic `npm test` script for `test/operation-runner.test.mjs`, plus its source
  files.
- Research's statement that no test runner existed was accurate at its snapshot;
  implementation now has a sibling runner in flight.
- This ticket does **not** replace or edit that command. It adds only
  `test:flow` and `test:flow:stalled`.
- This deviates from Design/Structure/Plan's proposed alias of `npm test` to the
  healthy browser flow. The browser contract and acceptance evidence are
  unaffected, and avoiding cross-ticket overwrite is mandatory.
- Before committing `package.json`, verify the sibling has committed its owned
  hunk or stage this ticket's hunk independently.

## Steps 2 and 4 — test contract/config/spec authored

- `tests/support/flow-contract.ts` centralizes two project names, two report step
  names, the local URL, and six nested budgets.
- `playwright.config.ts` configures one worker, zero retries, 10-second tests,
  20-second whole-run ceiling, 10-second server startup, 5-second actions/nav,
  and 4-second assertions.
- Reports go to a printed-step list plus
  `test-results/flow-report.json`; traces are retained only on failure.
- Local execution owns Astro on `127.0.0.1:4323` with a test-only server key.
  `PLAYWRIGHT_BASE_URL` skips local server startup for an external target.
- Static inspection of Wrangler's `getVarsForDev` found that a clean clone without
  `.dev.vars` only includes process env when explicitly enabled. Added
  `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` to the owned server env; this preserves
  existing `.dev.vars` behavior and makes the default test key clone-safe.
- Initial `npx tsc --noEmit` found that the repository has no `@types/node`, so
  `process.env` was not typed in the config. Avoided adding a broad dependency for
  one global: the config now structurally types only `globalThis.process.env`, the
  exact Node runtime surface it consumes. This is checked by TypeScript and does
  not change runtime behavior.
- Projects are `healthy` and `stalled`, both on Desktop Chrome.
- `tests/demo-flow.spec.ts` contains one black-box flow. Stalled mode registers
  an unresolved `**/api/receipt` route before navigation.
- The named steps are `load the public demo` and
  `await receipt boundary response`.
- Navigation waits only for response commit, then the heading proves static HTML
  parsed. This prevents the page module's top-level awaited fetch from moving a
  stalled-boundary failure into the load step.
- Healthy success requires the page heading, visible receipt body, hidden loading
  status, 32-hex nonce, and 64-hex signature.
- `.gitignore` now excludes `test-results/` and `playwright-report/`.

## Configuration, type, and build verification — complete

- `npx playwright test --list` exits zero and collects exactly two entries from
  one spec: `[healthy]` and `[stalled]`.
- `npx playwright install --list` shows Playwright 1.61.1 with Chromium and
  Chromium Headless Shell revision 1228 in the machine cache.
- `npx tsc --noEmit` exits zero after the narrow config env typing fix.
- `git diff --check` exits zero.
- `npm run build` exits zero; Astro 5.18.2 emits the static index and Cloudflare
  Worker boundary normally.
- Build retains the pre-existing Cloudflare adapter warning about Sharp at
  runtime; this app has no runtime image service and this ticket did not add one.
- `git check-ignore` confirms `test-results/` and `playwright-report/` resolve to
  this ticket's `.gitignore` entries.
- Local inspection of Playwright 1.61.1 source confirms `globalTimeout` wraps
  plugin setup (including `webServer`), test loading, test execution, and cleanup;
  the 20-second ceiling really is a whole-run backstop.
- Local Playwright types confirm `page.goto` accepts `waitUntil: 'commit'`.

## End-to-end execution attempts — environment-blocked

### Healthy command

Ran `/usr/bin/time -p npm run test:flow`.

- Exit: `1` before test execution.
- Wall time: `1.75s`.
- Cause: the managed shell sandbox rejected Astro's listener with
  `listen EPERM: operation not permitted 127.0.0.1`.
- Playwright correctly surfaced `Process from config.webServer was not able to
  start`; no browser/spec assertion ran.
- Checked ports 4321, 4322, 4323, and 8787; no already-running local demo was
  available for `PLAYWRIGHT_BASE_URL`.

### Alternate browser path

- Loaded the repository's available in-app Browser skill as the prescribed local-
  testing fallback.
- Browser runtime discovery returned no browser backends (`[]`), even after the
  skill's bootstrap troubleshooting check.
- A GitHub plugin installation was suggested as an optional way to discover an
  existing deployment URL, but was not installed/confirmed during this run.
- No deployed target URL is stored in the repository or discoverable from its
  current documentation.

### Chromium launch check

- A temporary ignored Playwright fixture attempted to launch the installed
  Chromium directly, without a web server.
- Chromium was also denied by the managed macOS sandbox:
  `MachPortRendezvousServer ... Permission denied (1100)`.
- This confirms the blocker is the execution sandbox (listener + browser IPC),
  not only Astro's command.

## Timeout/report contract verification — complete without browser

To still exercise Playwright's real timeout and reporter stack, ran a temporary,
ignored browserless fixture using the production constants, step names, list/JSON
reporters, and retained-on-failure trace. It entered the same receipt step and
held an `expect.poll` predicate false until the assertion budget.

Observed evidence:

- Process exit: `1` (intentionally red).
- List reporter printed `load the public demo` (`3ms`).
- List reporter printed and attached failure to
  `await receipt boundary response` (`3.9s`).
- Failure message: `await receipt boundary response: signed receipt should become
  visible`.
- Failure call log: `Timeout 4000ms exceeded while waiting on the predicate`.
- JSON result status: `failed`; test result duration `3,872ms`.
- JSON step title: `await receipt boundary response`; step duration `3,867ms`.
- JSON run stats duration: `4,272.966ms`.
- `/usr/bin/time` wall time: `5.02s`, below the 10s test and 20s run backstops.
- Failure trace archive was emitted.
- The temporary fixture source was deleted afterward; generated evidence remains
  under ignored `test-results/` only.

This verifies the configured budget ordering, stdout naming, JSON step structure,
non-zero semantics, and bounded reporter teardown. It does **not** replace the
still-required real healthy/stalled browser execution on a normal host.

## Commit attempt — environment-blocked

- Prepared explicit staging paths and an index-only `package.json` patch to avoid
  absorbing the concurrent operation-runner's adjacent `npm test` line.
- Git failed before staging with `Unable to create .git/index.lock: Operation not
  permitted` because this workspace exposes `.git` read-only.
- No commit could be created. This is an environment permission limitation, not a
  decision to skip the workflow's incremental-commit rule.
- Intended commit boundaries remain those in `plan.md`: Playwright foundation and
  flow; observed verification refinements; final Review.

## Implementation state

- Code and configuration are complete.
- Static/type/config/build checks are green.
- Real Playwright report semantics and time-budget ordering are verified through
  the browserless fixture.
- Real browser healthy/stalled execution remains the one required external
  verification gate due sandbox limitations.
- Git commits remain required in a `.git`-writable environment.
- Next in this session: final hygiene checks, write `review.md`, and stop for Lisa.
