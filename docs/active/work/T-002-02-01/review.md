# Review — T-002-02-01 time-budgeted-playwright-flow

Human handoff for the completed RDSPI pass: what changed, what evidence exists,
what could not run in this managed environment, and the exact remaining reviewer
gate.

## Outcome

The repository now has a single Playwright main-flow spec with two native project
modes:

- `npm run test:flow` selects `healthy` and exercises the real local page and
  `/api/receipt` boundary.
- `npm run test:flow:stalled` selects `stalled`, intercepts
  `**/api/receipt`, deliberately leaves the response unresolved, and lets the same
  success wait fail.

The test contract has explicit nested ceilings: 4 seconds for assertions, 5
seconds for actions/navigation and the receipt step, 10 seconds per test, 10
seconds for local server startup, and 20 seconds for the whole Playwright run.
There are zero retries and one worker.

The critical receipt wait is a boxed report step named:

```text
await receipt boundary response
```

List output prints steps, JSON output records step/error/duration data, and traces
are retained on failure.

**Important verification status:** code, configuration, TypeScript, collection,
build, timeout ordering, and real reporter behavior are verified. The actual
browser healthy/stalled pair could not execute in this sandbox because both local
socket binding and Chromium IPC are forbidden. The acceptance criterion therefore
still needs the two commands run once on a normal host before a human should mark
it fully proven.

## Files created

| File | Role |
|---|---|
| `playwright.config.ts` | Playwright projects, budgets, reporters, browser settings, local server, and external-target override |
| `tests/support/flow-contract.ts` | Stable project names, report step names, base URL, and all numeric budgets |
| `tests/demo-flow.spec.ts` | One black-box audience flow, with stalled-mode route interception |
| `docs/active/work/T-002-02-01/research.md` | Codebase and constraint map |
| `docs/active/work/T-002-02-01/design.md` | Alternatives, decisions, and rationale |
| `docs/active/work/T-002-02-01/structure.md` | File/interface blueprint |
| `docs/active/work/T-002-02-01/plan.md` | Ordered implementation and verification plan |
| `docs/active/work/T-002-02-01/progress.md` | Detailed execution evidence and deviations |
| `docs/active/work/T-002-02-01/review.md` | This handoff |

## Files modified

| File | Change |
|---|---|
| `.gitignore` | Ignores `test-results/` and `playwright-report/` |
| `package.json` | Adds `@playwright/test@^1.61.1`, `test:flow`, and `test:flow:stalled` |
| `package-lock.json` | Locks Playwright Test, Playwright, and Playwright Core 1.61.1 |

No file under `src/` was changed by this ticket. `astro.config.mjs`,
`wrangler.jsonc`, deployment files, the API contract, styles, and visitor copy are
unchanged.

The working `package.json` also contains a concurrent ticket's uncommitted generic
`npm test` operation-runner entry. This ticket preserved it and owns only the two
`test:flow*` lines plus the Playwright dependency. The sibling's
`src/lib/operation-runner.ts` and `test/` paths are not part of this review.

## Main-flow behavior

The spec is black-box: it imports no Astro route or receipt helper.

1. In `stalled` only, install `page.route('**/api/receipt', () => {})` before
   navigation.
2. Enter boxed step `load the public demo`.
3. Navigate to `/` with `waitUntil: 'commit'`.
4. Wait for the visible `Demo Runway` heading, proving the static HTML parsed.
5. Enter boxed step `await receipt boundary response`.
6. Wait for `#receipt-body` to become visible with a boundary-specific assertion
   message.
7. Assert the loading status is hidden.
8. Assert the rendered nonce is exactly 32 lowercase hexadecimal characters.
9. Assert the rendered signature is exactly 64 lowercase hexadecimal characters.

The `commit` navigation milestone is deliberate. The page module uses top-level
`await fetch('/api/receipt')`; waiting for full page load could make a deliberately
stalled response fail inside navigation. Commit + heading separates static document
delivery from the live-boundary wait, keeping the failure attached to the step the
ticket requires.

Healthy mode installs no route and therefore reaches the real server boundary.
Stalled mode runs the identical assertions but never supplies the response, so the
receipt body stays hidden and the 4-second visibility assertion fails before the
5-second step, 10-second test, or 20-second suite backstops.

## Local and deployed target behavior

Default execution starts an owned Astro server at:

```text
http://127.0.0.1:4323
```

Port 4323 avoids the 4321 collision observed by prior ticket work. Playwright does
not reuse an unknown existing listener. Server startup has a 10-second cap.

The owned server receives a clearly test-only default `DEMO_SIGNING_KEY` and
`CLOUDFLARE_INCLUDE_PROCESS_ENV=true`, ensuring Wrangler's platform proxy sees the
test value on a clean clone without `.dev.vars`. An existing caller-provided key
wins. The key stays server-side and is never asserted, printed, or returned.

To exercise an already-running or deployed surface instead, set:

```sh
PLAYWRIGHT_BASE_URL=https://example-demo.invalid npm run test:flow
```

When `PLAYWRIGHT_BASE_URL` exists, Playwright skips local server startup and uses
that URL as the target. This is the preferred path for deployed-surface validation.

## Verification completed

### Dependency and browser availability

- Installed `@playwright/test@1.61.1` from complete cached npm artifacts because
  direct registry access was unavailable in the managed environment.
- `npm ls @playwright/test` resolves 1.61.1.
- Local CLI reports Playwright 1.61.1.
- Playwright browser inventory shows Chromium and Chromium Headless Shell revision
  1228, matching Playwright 1.61.1.
- npm audit reported zero vulnerabilities for the installation.

### Type/config/collection

- `npx tsc --noEmit` — **pass**.
- `npx playwright test --list` — **pass**.
- Collection is exactly two entries from one file:
  - `[healthy] › demo-flow.spec.ts › main demo flow renders the signed receipt`
  - `[stalled] › demo-flow.spec.ts › main demo flow renders the signed receipt`
- Budget-order assertion — **pass**:
  `4000 < 5000 < 10000 < 20000`, with server startup `10000 < 20000`.
- Local Playwright source inspection confirms `globalTimeout` wraps plugin setup
  (including the web server), loading, execution, and cleanup.
- Local Playwright types confirm `waitUntil: 'commit'` is supported.
- `git diff --check` — **pass**.

### Application regression

- `npm run build` — **pass**.
- Astro 5.18.2 still emits the prerendered static index and Cloudflare Worker
  boundary.
- The existing Cloudflare/Sharp runtime warning remains unrelated; this app has no
  runtime image service.
- No product-source diff exists for this ticket.

### Report and timeout semantics

A temporary ignored, browserless Playwright fixture exercised the exact production
budget constants, stable step names, list/JSON reporters, non-zero exit behavior,
and failure-trace retention. It held a predicate false inside the receipt step.

Observed:

- process exit `1`;
- `load the public demo` printed (`3ms`);
- `await receipt boundary response` printed and named in the failure (`3.9s`);
- failure message named the awaited receipt response;
- call log reported `Timeout 4000ms exceeded`;
- JSON result status `failed`, result duration `3,872ms`;
- JSON receipt-step title present, step duration `3,867ms`;
- JSON run duration `4,272.966ms`;
- wall time `5.02s`;
- retained trace attachment emitted.

This is strong evidence for the timeout/report plumbing but is not represented as
an end-to-end browser pass. Temporary fixture source was removed; generated output
is confined to ignored `test-results/`.

## Verification not completed — critical reviewer gate

### Why it could not run here

1. `npm run test:flow` attempted to start Astro but the sandbox rejected
   `listen(127.0.0.1)` with `EPERM`. It exited in 1.75 seconds before test
   execution.
2. Direct Chromium launch was rejected by macOS sandbox IPC:
   `MachPortRendezvousServer ... Permission denied (1100)`.
3. The installed Browser skill found no in-app or Chrome backend to use as a
   preview alternative.
4. No public deployment URL is recorded in the repository.

These are host-policy failures, not observed application/test failures. They also
mean neither the healthy browser pass nor the actual route-intercepted browser
failure has been empirically recorded in this session.

### Required normal-host commands

```sh
npx playwright install chromium
/usr/bin/time -p npm run test:flow
/usr/bin/time -p npm run test:flow:stalled
rg -n "await receipt boundary response|stalled|failed|receipt" \
  test-results/flow-report.json
```

Expected results:

- healthy exits `0`, prints both steps, and completes well inside 20 seconds;
- stalled exits non-zero near the 4-second assertion budget;
- stalled stdout and JSON name `await receipt boundary response`;
- JSON project is `stalled`, result is failed, and failure says the signed receipt
  did not become visible;
- a failure trace exists under `test-results/artifacts/`;
- total stalled process time remains below the 20-second global cap.

If navigation fails instead of the receipt step, inspect whether the target serves
the current page module and preserves Playwright 1.61's `commit` behavior. Do not
increase budgets until the attribution issue is understood.

## Test coverage assessment

| Surface | Coverage | Status |
|---|---|---|
| Config and project collection | TypeScript + Playwright collection | Verified |
| Budget ordering | Direct constant assertion + config inspection | Verified |
| Reporter step naming | Real Playwright list and JSON reporters | Verified with browserless fixture |
| Timeout non-zero behavior | Real 4-second Playwright assertion timeout | Verified with browserless fixture |
| Failure trace retention | Real Playwright trace attachment | Verified with browserless fixture |
| Astro/Cloudflare production build | `npm run build` | Verified |
| Static page → client JS → real receipt API → DOM | Healthy Playwright project | **Not run: sandbox blocker** |
| Unresolved route → hidden receipt → named failure | Stalled Playwright project | **Not run: sandbox blocker** |
| Deployed public surface | `PLAYWRIGHT_BASE_URL` option | Not run: no URL available |
| Cross-browser behavior | Chromium only by design | Out of scope |
| Mobile viewport | Existing responsive ticket coverage; not this flow | Out of scope |

## Commit status — critical process concern

The RDSPI workflow calls for incremental commits. This environment exposes `.git`
read-only. The first explicit staging attempt failed with:

```text
Unable to create .git/index.lock: Operation not permitted
```

No commit was created. The intended boundaries are documented in `plan.md`:

1. Playwright foundation + flow + phase artifacts;
2. verification/refinement progress;
3. Review handoff.

When committing in a writable checkout, stage explicit paths. Do not use
`git add -A`: the tree contains unrelated untracked Lisa/Vend/governance content
and the concurrent operation-runner ticket.

For `package.json`, include this ticket's `test:flow`, `test:flow:stalled`, and
`@playwright/test` changes while preserving the sibling's `npm test` entry. The
current combined working file already does so; the caution is about commit
attribution, not file correctness.

## Open concerns and limitations

- **Critical:** run the healthy/stalled commands on a normal browser-capable host
  before marking the acceptance criterion verified.
- **Critical:** create the documented commits in a `.git`-writable checkout.
- Playwright browser binaries are machine cache, not npm package content; new CI
  or developer environments must run `npx playwright install chromium` (or use an
  official Playwright image).
- The JSON report path is stable but overwritten by the next run. A future
  one-command integration harness should consume or copy it before running another
  scenario.
- `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` is confined to the Playwright-owned local
  server. It allows Wrangler to receive the test key on a clean clone; the boundary
  still returns only its safe receipt contract. A future Wrangler config may use
  `secrets.required` to narrow local env inference globally.
- A fixed port makes the command predictable, but an existing 4323 listener fails
  fast rather than being reused. Set `PLAYWRIGHT_BASE_URL` for an intentionally
  pre-existing server.
- Chromium-only is deliberate for this main-flow ticket; browser-matrix and mobile
  coverage would multiply runtime and belong to separate evidence needs.
- There are no retries, intentionally. A flaky red run should remain visible and
  bounded rather than silently consuming another budget.

## Ticket and workflow integrity

- The agent did not edit ticket `phase` or `status` fields.
- Lisa advanced the visible phase while artifacts appeared, as designed.
- All six RDSPI artifacts now exist for `T-002-02-01`.
- `progress.md` contains full command evidence and deviations.
- Product source and the exemplar boundary interface remain stable for downstream
  tickets T-002-02-02 and T-002-02-03.

## Bottom line

The requested Playwright flow, stalled route interception, layered budgets, named
failure step, JSON report, and trace behavior are implemented. Static/type/build
checks pass, and Playwright's real timeout/report machinery was independently
verified at the intended 4-second boundary. Two host-level tasks remain and are
flagged as critical rather than hidden: execute the real healthy/stalled browser
pair, and commit the scoped changes from a Git-writable environment.
