# Plan — T-002-02-01 time-budgeted-playwright-flow

Ordered implementation plan for `structure.md`. Every step has an observable gate.
Tracked changes are split into coherent commits, while machine-only browser setup
and generated reports remain uncommitted.

## Testing strategy

- **Configuration/static check:** ask Playwright to list tests/projects. This loads
  and type-transforms the configuration and spec without starting the application.
- **Healthy browser integration:** run the `healthy` project against Playwright's
  owned Astro dev server. It must exit zero and render the real signed receipt.
- **Timeout/failure integration:** run the `stalled` project. It must exit non-zero,
  fail inside the receipt wait's budget, and identify the named step in stdout and
  the JSON report.
- **Runtime evidence:** wrap each command with `/usr/bin/time -p`. Healthy and
  stalled wall times must both remain below the 20-second configured run budget,
  allowing small process startup/exit measurement variance to be documented if
  observed.
- **Artifact inspection:** inspect `test-results/flow-report.json` and the retained
  trace. Confirm project, result, duration, error, step title, and request URL.
- **Application regression:** run `npm run build`; adding tests must not alter or
  break the Astro/Cloudflare bundle.
- **Repository hygiene:** generated reports/traces/browser binaries are ignored;
  ticket frontmatter and product source remain untouched.

## Step 0 — baseline and scope guard (no commit)

1. Record `git status --short`.
2. Confirm the ticket still says `phase: research`, `status: open`.
3. Confirm the new work directory contains only completed phase artifacts so far.
4. Confirm `@playwright/test` and `node_modules/.bin/playwright` are absent.
5. Note unrelated untracked paths; never use `git add -A` or `git add .`.

**Gate:** baseline is understood and no ticket-frontmatter mutation exists.

## Step 1 — install Playwright Test

Run:

```sh
npm install --save-dev @playwright/test
```

Expected tracked changes:

- `package.json`: add current compatible `@playwright/test` range.
- `package-lock.json`: lock Playwright Test and its package graph.

Then add scripts to `package.json`:

```json
"test:flow": "playwright test --project=healthy",
"test:flow:stalled": "playwright test --project=stalled"
```

Preserve any generic `npm test` entry added by the concurrently active operation-
runner ticket; this ticket owns only the two browser-flow scripts.

Verify:

```sh
npm ls @playwright/test
npx playwright --version
```

**Gate:** dependency resolves without peer errors; CLI is local, not an ephemeral
`npx` download.

## Step 2 — create the shared contract and Playwright config

1. Create `tests/support/flow-contract.ts` with:
   - `FLOW_PROJECT.healthy` / `.stalled`;
   - `FLOW_STEP.loadDemo` / `.awaitReceipt`;
   - assertion/action/step/test/server/run budgets;
   - `LOCAL_BASE_URL` on `127.0.0.1:4323`.
2. Create `playwright.config.ts` per Structure:
   - one worker, no retry, per-test and global budgets;
   - assertion/action/navigation budgets;
   - `healthy` and `stalled` Desktop Chrome projects;
   - list reporter with printed steps and JSON reporter;
   - failure trace retention;
   - owned local Astro server unless `PLAYWRIGHT_BASE_URL` is provided;
   - test-only default signing key in the web server environment.
3. Append `test-results/` and `playwright-report/` to `.gitignore`.
4. Create `progress.md` and record Steps 0–2.

Verify config loading before a spec exists (an empty list is acceptable here):

```sh
npx playwright test --list
```

If Playwright requires a test to list projects, run the same command after Step 4
before committing. Fix any reporter option or TypeScript config issue now.

**Gate:** config imports successfully; budget ordering is visible in one module;
generated paths show ignored with `git check-ignore`.

## Step 3 — install the Chromium runtime (machine-only)

Run:

```sh
npx playwright install chromium
```

This changes Playwright's machine cache, not the repository. If Chromium already
exists, Playwright may verify/reuse it.

Verify:

```sh
npx playwright install --list
```

**Gate:** a Chromium executable for the installed package version is available.
If restricted network prevents download, inspect existing compatible browser
caches before treating it as a blocker.

## Step 4 — implement the single main-flow spec

Create `tests/demo-flow.spec.ts`:

1. Import Playwright and the shared contract.
2. Define `main demo flow renders the signed receipt`.
3. If selected project is `stalled`, register the unresolved
   `**/api/receipt` route before navigation.
4. Add boxed `load the public demo` step:
   - `page.goto('/', { waitUntil: 'commit' })` so a stalled top-level page fetch
     is attributed to the receipt step, not navigation;
   - audience heading is visible.
5. Add boxed `await receipt boundary response` step with the configured step
   budget:
   - receipt body becomes visible with a direct assertion message;
   - loading status becomes hidden;
   - nonce matches 32 lowercase hex chars;
   - signature matches 64 lowercase hex chars.
6. Update `progress.md` with the exact selectors and mode mechanism.

Run:

```sh
npx playwright test --list
```

**Gate:** output lists the same spec once under `healthy` and once under `stalled`;
there are no collection or config errors.

## Step 5 — first implementation commit

Stage explicit paths only:

```text
.gitignore
package.json
package-lock.json
playwright.config.ts
tests/support/flow-contract.ts
tests/demo-flow.spec.ts
docs/active/work/T-002-02-01/research.md
docs/active/work/T-002-02-01/design.md
docs/active/work/T-002-02-01/structure.md
docs/active/work/T-002-02-01/plan.md
docs/active/work/T-002-02-01/progress.md
```

Commit message:

```text
Add time-budgeted Playwright demo flow (T-002-02-01)
```

**Gate:** `git show --stat HEAD` contains only the explicit paths. The untracked
ticket file remains unchanged and unstaged.

## Step 6 — run and inspect the healthy project

Run:

```sh
/usr/bin/time -p npm run test:flow
```

Verify:

- exit code `0`;
- list reporter prints both named steps;
- one test passes under project `healthy`;
- wall time is bounded;
- JSON report exists and records passed status/duration;
- no trace is retained for the passing run under `retain-on-failure`;
- receipt nonce and signature assertions passed against the real boundary.

If the local key is absent, confirm the Playwright web server's test-only env value
reaches `Astro.locals.runtime.env`. Do not add a browser-visible env fallback.

Record command, exit, Playwright duration, and real wall time in `progress.md`.

**Gate:** healthy demo passes end to end inside all budgets.

## Step 7 — run and inspect the intentionally stalled project

Run (non-zero is the expected acceptance behavior):

```sh
/usr/bin/time -p npm run test:flow:stalled
```

Verify:

- process exits non-zero;
- failure occurs in approximately the 4-second assertion / 5-second step window,
  not at the 10-second test or 20-second run backstop;
- total real time is bounded;
- stdout prints `await receipt boundary response`;
- error states that the signed receipt body did not become visible;
- project is `stalled`;
- `test-results/flow-report.json` records failed status and the awaited step;
- a trace archive exists under `test-results/artifacts/.../trace.zip`.

Inspect report without changing it:

```sh
rg -n "await receipt boundary response|stalled|failed|receipt" \
  test-results/flow-report.json
```

Inspect the trace archive listing and, if needed, unpack it under `/tmp` to confirm
the `/api/receipt` request and loading-state snapshot are present.

**Gate:** the deliberate stall is red, named, and bounded exactly as the AC asks.

## Step 8 — adjust only from observed evidence

Potential evidence-driven adjustments:

- If assertion timeout wins but the named step is absent from stdout, enable the
  supported list step option or add the smallest reporter needed.
- If JSON omits step structure, preserve the step title in the assertion message
  or add a minimal reporter; do not invent a broad harness.
- If global/test timeout wins first, correct budget ordering.
- If the unresolved route causes teardown beyond the run budget, explicitly abort
  it during cleanup while preserving the pending response during the assertion.
- If local server startup approaches 10 seconds on a healthy machine, inspect the
  cause before increasing budgets; any adjustment must keep feedback in seconds.

Document every deviation and reason in `progress.md` before making the code change.

If tracked files change, make a second implementation commit:

```text
Refine bounded Playwright failure evidence (T-002-02-01)
```

**Gate:** repeat Steps 6 and 7 after every behavior change.

## Step 9 — regression and hygiene verification

Run:

```sh
npm run build
npx playwright test --list
git check-ignore test-results/ playwright-report/
git diff -- docs/active/tickets/T-002-02-01.md
git status --short
```

Verify:

- Astro/Cloudflare production build exits zero;
- Playwright still lists both projects;
- generated evidence is ignored and not staged;
- ticket diff is empty;
- no `src/` file changed;
- no unrelated untracked path entered a commit.

Update `progress.md` to “all implementation steps complete,” including:

- final dependency/browser versions;
- exact healthy and stalled timings;
- acceptance evidence paths;
- any residual warning or environment concern;
- commit hashes.

Commit the progress update if it was not already part of a refinement commit:

```text
Record Playwright flow verification (T-002-02-01)
```

**Gate:** implementation is stable, reproducible, and cleanly scoped.

## Step 10 — Review artifact and final commit

Create `review.md` only after implementation checks complete. It must summarize:

- files created and modified;
- healthy flow behavior and time evidence;
- stalled route interception, failure point, and time evidence;
- reporter/trace outputs and how to inspect them;
- test coverage and gaps;
- browser-install/CI requirements;
- external-target option;
- open concerns or known limitations;
- explicit statement that ticket frontmatter was untouched.

Commit `review.md` (and final `progress.md` if needed):

```text
Add review artifact for time-budgeted Playwright flow (T-002-02-01)
```

**Gate:** `review.md` exists, Review phase is complete, and no phase/status field
was edited. Stop after this artifact; Lisa handles the ticket transition.

## Acceptance mapping

| Acceptance clause | Durable mechanism | Verification |
|---|---|---|
| Spec drives page through exemplar boundary | static page navigation + visible signed receipt assertions | healthy project exits 0 |
| Healthy demo passes within budget | 4s assertion, 5s action/step, 10s test, 20s run | timed healthy command + passed JSON |
| Boundary response stalled via route interception | unresolved `page.route('**/api/receipt')` in stalled project | trace + loading state + failed visibility assertion |
| Stalled run fails at configured timeout | assertion/step budget fires before test/global backstops | non-zero exit near 4–5s |
| Report names awaited step | boxed stable step + printed list steps + JSON | stdout/report contain `await receipt boundary response` |
| Total runtime bounded either way | webServer 10s + test 10s + global 20s, zero retries | `/usr/bin/time` evidence in progress/review |

## Rollback

The test layer is additive. Reverting its implementation commits removes the npm
dependency, scripts, config, spec, support constants, and ignore entries without
touching the application or boundary. Browser cache and ignored test results can
be removed independently; they have no runtime effect on the demo.
