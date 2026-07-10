# Research — T-002-02-01 time-budgeted-playwright-flow

## Ticket position

- Ticket: `T-002-02-01`, `time-budgeted-playwright-flow`.
- Parent story: `S-002-02`, `one-command-demo-evidence`.
- Current ticket phase is `research`; no phase artifacts existed for this ticket.
- The only declared dependency is `T-002-01-02`, `exemplar-api-boundary`.
- That dependency is present in the current Git history and its Review artifact is
  complete.
- The ticket frontmatter remains owned by Lisa and is not an implementation file.
- The acceptance criterion asks for one main Playwright browser flow in two
  conditions: healthy and response-stalled.
- The healthy condition must pass inside an explicit budget.
- The stalled condition is injected at the browser network layer.
- The stalled run must fail at its configured timeout.
- Its report must identify the step that was waiting.
- Both conditions must have bounded total runtime.

## Product and workflow context

- `docs/knowledge/charter.md` defines P2 as observable demo behavior.
- P2 says stalled or broken boundaries become explicit evidence quickly instead
  of an indefinite spinner.
- The charter's evidence section specifically says the main Playwright flow cannot
  wait forever.
- It also says long operations report progress or fail under a defined budget.
- `docs/knowledge/product-spec.md` places Playwright in the integration harness and
  teammate workflow.
- The testing philosophy calls for the public happy path and meaningful failure /
  timeout states to be tested with Playwright.
- It also calls for bounded waits and actionable traces on failure.
- Automated checks are issue-discovery tools; they are not claims about subjective
  demo quality.
- The RDSPI workflow requires all six artifacts and incremental implementation
  commits.

## Repository shape

- The project is an Astro 5 application with ESM package semantics.
- `package.json` declares `"type": "module"` and Node-facing scripts.
- The current development command is `astro dev`.
- The current build command is `astro build`.
- There is no `test` script.
- There is no Playwright script.
- There is no Playwright configuration file.
- There is no `tests/` directory.
- `@playwright/test` is not listed in `package.json` or `package-lock.json`.
- `node_modules/.bin/playwright` is absent.
- Current first-level development dependencies are `astro`,
  `@astrojs/cloudflare`, and `wrangler`.
- The active runtime observed during Research is Node `v26.4.0` with npm
  `11.17.0`.
- The repository uses `package-lock.json`; dependency additions are expected to
  update both package files.
- Generated `dist/`, `.astro/`, `.wrangler/`, and `node_modules/` are ignored.
- Playwright's conventional `test-results/` and `playwright-report/` directories
  are not currently ignored because Playwright does not yet exist here.

## Application topology inherited from T-002-01-02

- `astro.config.mjs` keeps `output: 'static'`.
- The home page is prerendered and served as a static asset.
- `@astrojs/cloudflare` is configured with `platformProxy` enabled.
- The platform proxy exposes Wrangler environment values through
  `Astro.locals.runtime.env` during local development.
- `src/pages/api/receipt.ts` opts out of prerendering.
- That route is the repository's one live server boundary.
- `wrangler.jsonc` points at Astro's emitted Worker.
- Generated routing excludes static pages from Worker execution and includes the
  API route.
- The test target therefore has a static document followed by a live browser
  fetch.
- A browser-level flow is needed to exercise both halves together.

## Exemplar boundary contract

- The boundary route is `GET /api/receipt`.
- Its stable boundary name is `receipt`.
- `src/pages/api/receipt.ts` reads `DEMO_SIGNING_KEY` from server runtime env.
- A missing or blank key returns an explicit `500 boundary_misconfigured` JSON
  response.
- A configured key returns `200` JSON from `makeReceipt`.
- The success payload contains `boundary`, `issuedAt`, `nonce`, `algorithm`,
  `signature`, and `keySource`.
- `nonce` is 16 random bytes encoded as 32 hexadecimal characters.
- `signature` is an HMAC-SHA256 encoded as 64 hexadecimal characters.
- The response is fresh on each request.
- The boundary helper uses Web Crypto and does not depend on a third-party network.
- A local `.dev.vars` file exists and is already ignored.
- `.dev.vars.example` documents the required key without containing the local
  value.
- The test can use the existing local key or inject an isolated server value;
  the product boundary does not need to change for this ticket.

## Browser-visible flow

- `src/pages/index.astro` renders the page's initial content statically.
- The receipt section has accessible name `A signed note, made just now`.
- It has `aria-live="polite"`.
- Initial status text is `Asking the server…` in `#receipt-status`.
- The success definition list is `#receipt-body` and starts with the HTML
  `hidden` attribute.
- Its rows are labelled `Made at`, `One-time tag`, and `The server's signature`.
- A page module calls `fetch('/api/receipt')` as soon as the page loads.
- The fetch asks for JSON with an `Accept` header.
- On a successful HTTP response the script parses JSON and fills all three values.
- It then hides `#receipt-status` and reveals `#receipt-body`.
- On a failed HTTP response or rejected fetch it replaces the status text with a
  retry message.
- The browser script has no client-side timeout of its own.
- If the HTTP response never arrives, the native page remains in its initial
  `Asking the server…` state indefinitely.
- This indefinite native state is the exact behavior the Playwright budget must
  expose as a bounded test failure.
- `#receipt-body` visibility is the strongest existing success signal because it
  changes only after a complete successful response and JSON render.
- The nonce and signature fields provide more specific downstream assertions.

## Existing verification history

- T-002-01-02 used a throwaway headless Chromium session to inspect the page.
- Its screenshot shows the receipt body populated.
- That browser check was not committed as an automated test.
- The dependency's Review explicitly identifies the lack of a committed runner as
  its primary test gap.
- Its Review asks downstream work to keep `GET /api/receipt` and
  `BOUNDARY_NAME = 'receipt'` stable.
- This ticket is the first declared consumer that turns the browser check into a
  repeatable Playwright suite.
- No repository convention currently exists for selector style, browser projects,
  retry behavior, trace retention, or reporter output.

## Playwright behavior relevant to the ticket

- Playwright Test has a per-test timeout in configuration.
- Locator actions can be bounded with `use.actionTimeout`.
- Navigation can be bounded with `use.navigationTimeout`.
- Assertions can be bounded with the configured `expect.timeout` or a local
  timeout.
- `test.step(title, body, options)` adds a named step to reports.
- Current Playwright supports a timeout directly on a test step.
- A boxed step associates internal failures with the named step call site.
- `page.route()` intercepts matching requests before they reach the server.
- An intercepted route remains stalled until its handler continues, fulfills, or
  aborts it.
- A route handler that deliberately does none of those models a response that
  never arrives.
- The interception can be installed before `page.goto('/')`, so it catches the
  startup receipt fetch deterministically.
- A Playwright web server can start the existing development command and wait for
  the configured base URL.
- Playwright reporters receive step begin/end records and total run status.
- Machine-readable JSON reporting can preserve test, failure, duration, and step
  evidence in a file.
- Trace retention on failure can preserve browser/network evidence without adding
  product instrumentation.

## Ticket boundaries and adjacent work

- T-002-01-01 owns a generic traced operation runner; it is not in this ticket's
  dependency history and is not needed to drive the browser.
- T-002-01-03 owns a direct boundary ops check.
- T-002-01-04 owns server-side `broken` and `stalled` fault flags.
- This ticket specifically asks for browser route interception, so it does not
  require or own those server fault flags.
- T-002-02-02 will inspect client bundles and responses for secret leaks.
- T-002-02-03 will compose ops, flow, and leak checks into one command with an
  overall budget.
- The command and output established here therefore need a stable, scriptable
  surface for that later composition.
- This ticket does not need to change application copy, API behavior, signing
  logic, deploy config, or styling.
- It also does not need to prove the future `broken` or `leak` modes.

## Constraints and assumptions surfaced

- C1: the normal main-flow command must be green, so a deliberately stalled case
  cannot run unconditionally as a normal expected-pass test.
- C2: acceptance still requires the same flow to be runnable in stalled mode and
  to exit non-zero.
- C3: the stalled condition must be introduced through Playwright routing, not by
  editing the endpoint or depending on T-002-01-04.
- C4: every awaited browser transition needs a finite budget; relying only on
  Playwright's default 30-second timeout would not make the intended budget
  explicit enough for this template.
- C5: the test-level timeout must exceed the awaited-step budget so the report
  identifies the receipt wait rather than only reporting a generic whole-test
  timeout.
- C6: server startup has its own timeout and occurs outside the test body.
- C7: a local port can already be occupied; prior work observed port 4321 in use
  and moved to 4322 manually.
- C8: browser installation is an environment prerequisite distinct from adding
  the npm package.
- C9: failure artifacts must not become tracked churn; generated reports and
  traces belong in ignored directories.
- C10: other untracked governance and Lisa files belong to the user and must not
  be swept into commits.
- C11: the ticket frontmatter's phase and status must remain unchanged.
- C12: total-runtime evidence can be measured during implementation, while the
  configuration supplies the durable runtime limits.

## Research conclusion

The repository already exposes a single, stable main browser seam: load the static
home page, let its client script call `GET /api/receipt`, then observe the receipt
definition list become visible with a 32-hex nonce and a 64-hex signature. There
is no existing automated test infrastructure to extend. Playwright's configuration,
named steps, network routing, and failure artifacts are the relevant native
mechanisms. The central structural tension is keeping the ordinary flow green
while retaining a separately invokable stalled mode that intentionally exits
non-zero inside a shorter awaited-step budget and leaves a report naming that wait.
