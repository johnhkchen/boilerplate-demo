# Structure — T-002-02-01 time-budgeted-playwright-flow

This blueprint translates `design.md` into file boundaries and public interfaces.
It describes the shape and ordering of the change, not its implementation history.

## File map

```text
.gitignore                                      MODIFY  ignore Playwright output
package.json                                    MODIFY  runner dependency + scripts
package-lock.json                               MODIFY  locked dependency graph
playwright.config.ts                            CREATE  suite/server/report contract
tests/
  demo-flow.spec.ts                             CREATE  single main browser flow
  support/
    flow-contract.ts                            CREATE  shared modes, labels, budgets
docs/active/work/T-002-02-01/
  research.md                                   CREATE  codebase map
  design.md                                     CREATE  decisions and tradeoffs
  structure.md                                  CREATE  this blueprint
  plan.md                                       CREATE  ordered implementation checks
  progress.md                                   CREATE  execution ledger
  review.md                                     CREATE  final handoff
```

No file under `src/` changes. `astro.config.mjs`, `wrangler.jsonc`, the local env
template, and the ticket file remain unchanged.

## `tests/support/flow-contract.ts`

### Responsibility

Own the stable vocabulary and numeric budgets shared by Playwright configuration
and the flow spec. Keeping these values outside the config avoids importing the
config from test code and makes the contract inspectable by T-002-02-03 later.

### Public exports

```ts
export const FLOW_PROJECT = {
  healthy: 'healthy',
  stalled: 'stalled',
} as const;

export const FLOW_STEP = {
  loadDemo: 'load the public demo',
  awaitReceipt: 'await receipt boundary response',
} as const;

export const FLOW_BUDGET_MS = {
  assertion: 4_000,
  action: 5_000,
  receiptStep: 5_000,
  test: 10_000,
  serverStartup: 10_000,
  run: 20_000,
} as const;

export const LOCAL_BASE_URL = 'http://127.0.0.1:4323';
```

### Boundary rules

- Values are readonly constants; there is no runtime state.
- Project names are the package-script selectors and report-visible mode labels.
- Step labels are report contracts, not incidental prose.
- The assertion budget is strictly less than the receipt step budget.
- Action and receipt-step budgets are strictly less than the test budget.
- Test and server startup budgets are strictly less than the run budget.
- The module imports nothing from Playwright or application source.
- No secret or environment value appears here.

## `playwright.config.ts`

### Responsibility

Assemble Playwright Test around the repository's local Astro application. It owns
test discovery, global limits, projects, browser settings, the local web server,
and result reporters.

### Imports

```ts
import { defineConfig, devices } from '@playwright/test';
import {
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
  LOCAL_BASE_URL,
} from './tests/support/flow-contract';
```

### Target selection

```ts
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? LOCAL_BASE_URL;
```

- Without `PLAYWRIGHT_BASE_URL`, the config starts and owns Astro locally.
- With it, the config uses that target and omits `webServer`.
- The variable contains only a URL; it is not a secret.
- A trailing slash is acceptable because Playwright resolves `page.goto('/')`
  against the URL.

### Suite configuration

```ts
defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: FLOW_BUDGET_MS.test,
  globalTimeout: FLOW_BUDGET_MS.run,
  expect: { timeout: FLOW_BUDGET_MS.assertion },
  outputDir: 'test-results/artifacts',
  reporter: [/* list + json */],
  use: {/* URL, action/nav budgets, failure trace */},
  projects: [/* healthy, stalled */],
  webServer: externalBaseURL ? undefined : {/* local Astro */},
});
```

- `fullyParallel: false` and `workers: 1` reflect one load-bearing flow and keep
  runtime/evidence deterministic.
- `retries: 0` prevents multiplying the bounded failure time.
- `forbidOnly` keeps accidental focused tests from entering CI.
- `globalTimeout` is the suite-level backstop.
- `outputDir` holds traces and related generated artifacts.

### Projects

Two entries share `devices['Desktop Chrome']` settings:

```ts
projects: [
  { name: FLOW_PROJECT.healthy, use: { ...devices['Desktop Chrome'] } },
  { name: FLOW_PROJECT.stalled, use: { ...devices['Desktop Chrome'] } },
]
```

- No browser matrix is added; the ticket asks for the main room-visible flow, and
  Chromium is the minimal Playwright execution surface.
- Projects differ only in name. The spec applies the name-dependent interception.
- Explicit package scripts select exactly one project per run.

### Browser `use` contract

```ts
use: {
  baseURL,
  actionTimeout: FLOW_BUDGET_MS.action,
  navigationTimeout: FLOW_BUDGET_MS.action,
  trace: 'retain-on-failure',
}
```

- Relative navigation and route patterns resolve against `baseURL`.
- Trace is retained only for red runs, limiting ordinary artifact volume.
- Screenshots/video are not enabled because the trace already includes snapshots
  and network evidence.

### Reporters

```ts
reporter: [
  ['list', { printSteps: true }],
  ['json', { outputFile: 'test-results/flow-report.json' }],
]
```

- The list reporter is the human/agent stdout contract.
- `printSteps` exposes `FLOW_STEP.awaitReceipt` before and at failure.
- The JSON file is the durable machine-readable run record.
- Each command replaces the previous report; downstream composition should consume
  it immediately or copy it under its own run directory.

### Local `webServer`

```ts
webServer: {
  command: 'npm run dev -- --host 127.0.0.1 --port 4323',
  url: LOCAL_BASE_URL,
  timeout: FLOW_BUDGET_MS.serverStartup,
  reuseExistingServer: false,
  stdout: 'ignore',
  stderr: 'pipe',
  env: {
    ...process.env,
    CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true',
    DEMO_SIGNING_KEY:
      process.env.DEMO_SIGNING_KEY ?? 'playwright-local-test-key',
  },
}
```

- The process is owned and stopped by Playwright.
- Fixed host/port match `LOCAL_BASE_URL`.
- An existing listener is an immediate configuration error, not an unknown server
  silently reused with the wrong env.
- Wrangler is explicitly allowed to include process env so the test key reaches
  the platform proxy on a clean clone without `.dev.vars`.
- The default key is explicitly test-only, not a deployable credential.
- A caller-provided key remains supported.

## `tests/demo-flow.spec.ts`

### Responsibility

Describe the single public demo path from static document to rendered live receipt.
The same test body is both the healthy proof and the stalled failure probe.

### Imports

```ts
import { expect, test } from '@playwright/test';
import {
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
  FLOW_STEP,
} from './support/flow-contract';
```

No application module is imported. This is a black-box browser check against the
served surface.

### Test identity

```ts
test('main demo flow renders the signed receipt', async ({ page }, testInfo) => {
  // one shared flow
});
```

- The title is stable and describes the room-visible outcome.
- The selected project supplies the scenario identity in reports.
- No `test.fail`, `test.slow`, retry, or conditional skip is used.

### Stalled-mode setup

```ts
if (testInfo.project.name === FLOW_PROJECT.stalled) {
  await page.route('**/api/receipt', () => {});
}
```

- Registration happens before navigation.
- The callback does not continue, fulfill, or abort.
- Healthy mode does not register a route, so the real boundary handles the fetch.
- Unknown project names follow healthy behavior; only the explicit stalled name
  is allowed to inject the fault.

### Step 1 — load static demo

```ts
await test.step(FLOW_STEP.loadDemo, async () => {
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Demo Runway' })).toBeVisible();
}, { box: true, timeout: FLOW_BUDGET_MS.action });
```

This step proves the static audience page is served and identifies navigation
failures separately from boundary-response failures. `commit` avoids waiting for
the page module's top-level receipt fetch before entering the named receipt step;
the heading assertion proves the response body was parsed.

### Step 2 — await live receipt

```ts
await test.step(FLOW_STEP.awaitReceipt, async () => {
  await expect(page.locator('#receipt-body'), '...').toBeVisible();
  await expect(page.locator('#receipt-status')).toBeHidden();
  await expect(page.locator('#receipt-nonce')).toHaveText(/^[0-9a-f]{32}$/);
  await expect(page.locator('#receipt-signature')).toHaveText(/^[0-9a-f]{64}$/);
}, { box: true, timeout: FLOW_BUDGET_MS.receiptStep });
```

- The first assertion is the awaited boundary transition and stalled-mode failure
  point.
- Its message names the receipt response and missing signed-note render.
- Later assertions confirm the actual returned payload shape reached the DOM.
- The test does not inspect the signing key or make a second direct API request.

## `package.json` and `package-lock.json`

Add one development dependency:

```json
"@playwright/test": "<npm-resolved compatible range>"
```

Add scripts:

```json
"test:flow": "playwright test --project=healthy",
"test:flow:stalled": "playwright test --project=stalled"
```

- The browser scripts coexist with any generic `npm test` command owned by the
  operation-runner ticket.
- Both direct scripts expose Playwright's original process exit code.
- The stalled command intentionally has no wrapper that converts red to green.
- `package-lock.json` is updated only through npm dependency installation.

## `.gitignore`

Append a Playwright section:

```gitignore
# Playwright reports, traces, screenshots, and videos
test-results/
playwright-report/
```

This covers the configured JSON report and trace directory plus Playwright's
conventional HTML output if a developer requests it locally.

## Dependency and execution ordering

```text
install @playwright/test
        │
        ├── package manifests
        │
        ▼
create shared flow contract
        │
        ├──────────────┐
        ▼              ▼
Playwright config   flow spec
        │              │
        └──────┬───────┘
               ▼
      install Chromium binary
               ▼
       run healthy project
               ▼
       run stalled project
               ▼
 inspect stdout, JSON, trace, runtime
```

The shared contract lands before its two consumers. The test runner dependency
lands before config loading. Browser installation is machine setup, not a tracked
file change.

## Commit boundaries

1. **Playwright foundation:** phase artifacts to Plan, dependency manifests,
   `.gitignore`, shared contract, and config. Verify config lists both projects.
2. **Main browser flow:** spec plus `progress.md` update. Verify healthy run green.
3. **Stalled evidence and refinements:** any adjustments needed after observing
   real timeout/report behavior, plus progress evidence. Commit only if tracked
   code changes are required; otherwise record evidence with Review.
4. **Review artifact:** final `review.md` after all checks.

Explicit path staging is mandatory. The repository has unrelated untracked files,
including the ticket itself and other governance content, that are not implicitly
part of a product-code commit.

## Verification boundaries

- **Static/type:** Playwright config loads; both projects list; Astro type check or
  TypeScript check accepts new files.
- **Healthy integration:** `npm run test:flow` exits zero before the 20-second run
  budget and JSON status is passed.
- **Stalled integration:** `npm run test:flow:stalled` exits non-zero around the
  4-second assertion budget, before all outer budgets.
- **Failure semantics:** stdout and JSON contain `await receipt boundary response`;
  first failure says the receipt body was not visible.
- **Fault mechanism:** trace/network evidence shows `/api/receipt` intercepted and
  left pending; the application stays at `Asking the server…`.
- **Regression:** `npm run build` still succeeds; no `src/` change is involved.
- **Hygiene:** `test-results/` and `playwright-report/` remain untracked.
- **Ticket integrity:** no diff or staged change to ticket frontmatter.

## Structure conclusion

The change is a self-contained black-box test layer. One shared module defines the
public mode/step/budget vocabulary; one configuration turns it into bounded local
execution and reporting; one spec exercises the real page and optionally stalls
the real browser fetch. Package scripts expose a green healthy project and an
intentionally red stalled project without introducing product fault code or
duplicating the main flow.
