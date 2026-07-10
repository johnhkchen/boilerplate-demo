# Design — T-002-02-01 time-budgeted-playwright-flow

Grounded in `research.md`. The design has four linked decisions: how to expose a
green healthy run and an intentionally red stalled run, where budgets live, how
the response is stalled, and what evidence the failure emits.

## Decision 1 — one flow, two explicit Playwright projects

**Chosen:** write one `demo-flow.spec.ts` and execute it through named `healthy`
and `stalled` Playwright projects.

- `npm run test:flow` selects `--project=healthy`.
- `npm run test:flow:stalled` selects `--project=stalled`.
- The projects share browser settings, base URL, timeouts, reporters, and the same
  test body.
- The spec reads the current project name through `testInfo.project.name`.
- Only the `stalled` project installs the route interception.
- The normal project reaches the real local `/api/receipt` Worker boundary.
- The stalled project loads the same page and follows the same assertions; only
  the boundary response behavior differs.
- The stalled command is intentionally expected to return a non-zero process exit.
- The ordinary browser-flow command remains green on a healthy checkout.

This is a useful contract for T-002-02-03: it can invoke the healthy or stalled
surface without rewriting environment variables or duplicating selectors.

### Options considered

| Option | Healthy command | Stalled exits non-zero | Shared path | Verdict |
|---|---:|---:|---:|---|
| One always-green suite with `test.fail()` around the stall | green | no | yes | Rejected: a swallowed expected failure does not meet the red-run criterion. |
| Healthy and stalled test files with copied steps | green if filtered | yes | no | Rejected: duplicated flow can drift and prove different behavior. |
| One spec switched by a shell environment assignment | green | yes | yes | Viable, but package scripts become shell-specific and the modes are less visible in reports. |
| One spec with named Playwright projects | green when `healthy` is selected | yes | yes | **Chosen:** native, visible, scriptable, and cross-platform. |
| A Node meta-runner that spawns Playwright and interprets failure | green | configurable | yes | Rejected for this ticket: it masks Playwright's real exit semantics and belongs, if needed, in the later composition ticket. |

## Decision 2 — layered, centralized time budgets

**Chosen:** define the flow contract in `tests/support/flow-contract.ts` and import
it from both Playwright configuration and the spec.

Budget hierarchy:

| Budget | Value | Scope | Purpose |
|---|---:|---|---|
| Assertion | 4 seconds | each receipt assertion | Stops locator polling and emits the specific failed expectation. |
| Action / navigation | 5 seconds | browser actions | Prevents a click/navigation/action from inheriting an unlimited wait. |
| Awaited receipt step | 5 seconds | named `test.step` | Names and bounds the exemplar boundary transition. |
| Test | 10 seconds | complete main flow | Backstop for setup, navigation, assertions, and teardown. |
| Web server startup | 10 seconds | local Astro start | Stops a missing/broken server from waiting Playwright's 60-second default. |
| Whole run | 20 seconds | suite process | Backstop across setup and the selected project. |

The exact values favor fast Day 1 feedback while leaving normal local Astro startup
and Chromium launch ample room. The ordering is intentional:

```text
assertion (4s) < named step/action (5s) < test (10s) < whole run (20s)
                                      server startup (10s) < whole run (20s)
```

The inner timeout should fire first in the stalled case. That keeps the failure
attached to `await receipt boundary response`, instead of degrading to a generic
whole-test or global timeout. Outer budgets remain independent safeguards if a
different part of the run misbehaves.

### Options considered

- **Playwright defaults only (30-second test, unlimited suite): rejected.** The
  repository would still lack an intentional public time-budget contract, and a
  single stalled check would be slow.
- **Only an assertion timeout: rejected.** Server startup, navigation, and other
  future actions would remain outside the ticket's total-runtime claim.
- **Only a test timeout: rejected.** It bounds the browser body but tends to report
  the test as a whole rather than the awaited boundary step.
- **An OS `timeout` shell wrapper: rejected.** It is platform-specific, kills the
  reporter abruptly, and can lose the failure artifacts that make the wait
  actionable.
- **Layered native budgets: chosen.** Each lifecycle layer is bounded by the tool
  that owns it, and normal teardown/reporting still occurs.

## Decision 3 — stall the browser request by leaving a route unresolved

**Chosen:** before navigation in the `stalled` project, register:

```ts
await page.route('**/api/receipt', () => {});
```

Playwright routing stalls matching requests unless the handler continues,
fulfills, or aborts them. Returning without doing any of those leaves the browser
fetch pending. This precisely models the acceptance criterion's “boundary response
stalled via route interception”:

- the page document still comes from the real local Astro server;
- the page's real bundled module runs;
- the module makes its real relative fetch;
- Playwright catches only that boundary request;
- no response status or body arrives;
- `#receipt-status` remains `Asking the server…`;
- `#receipt-body` remains hidden;
- the named Playwright receipt wait reaches its budget and fails.

### Options considered

- **Delay then fulfill:** rejected. It tests slowness but eventually allows the
  flow to pass if budgets change, and requires mock response data.
- **Abort with `timedout`: rejected.** The page's `catch` runs immediately and
  changes to its explicit error copy; that is a network-error path, not a response
  that remains stalled.
- **Call a server fault flag:** rejected. The ticket explicitly calls for route
  interception, and server fault modes belong to T-002-01-04.
- **Intercept and never resolve:** chosen. It leaves the exact awaited transition
  pending until Playwright's configured budget ends it.

The handler is deliberately tiny. Page/context cleanup at test failure releases
the request, so no timer or never-resolving application promise is introduced.

## Decision 4 — report the human-sized awaited step

**Chosen:** organize the main flow into boxed named steps and print steps in the
terminal reporter.

The key step title is stable and boundary-specific:

```text
await receipt boundary response
```

The flow is:

1. `load the public demo`
2. `await receipt boundary response`
3. assertions within the second step verify the visible signed result

The second step has its own 5-second timeout and is boxed so error location points
at the step boundary. The assertion includes a direct message explaining that the
signed note did not render.

Reporter set:

- `list` with step printing enabled for agent-readable stdout;
- `json` to `test-results/flow-report.json` for machine-readable downstream use;
- Playwright trace retained on failure in `test-results/` for interactive browser
  and network inspection.

The JSON report contains the selected project, test result, duration, errors, and
step structure. The later integration ticket can inspect it, but this ticket does
not add a second parser or normalize Playwright into another schema.

### Options considered

- **Terminal list only:** viable for a person, but weaker for the later one-command
  composition and easy to lose after a run.
- **JSON only:** machine-readable but unpleasant for a human or coding agent
  watching stdout.
- **HTML report:** useful interactively but heavier than needed and less direct for
  a one-command agent workflow.
- **Custom reporter:** rejected until the later integration contract establishes
  a need; the built-ins already preserve step and error information.
- **List + JSON + failure trace:** chosen as the smallest evidence set covering
  stdout, machine consumption, and deep debugging.

## Main-flow assertions

The healthy flow proves the room-visible behavior rather than only curling the API:

1. navigate to `/` through the local server;
2. find the visible page heading `Demo Runway`;
3. await `#receipt-body` becoming visible;
4. assert `#receipt-status` is hidden;
5. assert `#receipt-nonce` is exactly 32 lowercase hexadecimal characters;
6. assert `#receipt-signature` is exactly 64 lowercase hexadecimal characters.

These checks cover static page delivery, client script execution, live boundary
response, JSON parsing, and DOM presentation. The regex assertions avoid depending
on time-zone-formatted `issuedAt` text. They also avoid copying or learning the
server key.

Navigation waits for Playwright's `commit` milestone, then proves the static HTML
parsed by waiting for the `Demo Runway` heading. This separation matters because
the page module uses top-level `await fetch('/api/receipt')`: waiting for the full
load lifecycle could otherwise attach the stalled response to the navigation step
instead of the purpose-built receipt step.

The route-intercepted flow runs the same checks. Its expected observed failure is
the first success transition (`#receipt-body` visibility), inside the named
receipt step. It never needs a special assertion saying “the timeout happened”;
the command's non-zero exit and report are the actual failure evidence required by
the ticket.

## Local server and target selection

- Default base URL: `http://127.0.0.1:4323`.
- The dedicated port avoids the default 4321 collision observed by prior work.
- Playwright starts `npm run dev -- --host 127.0.0.1 --port 4323`.
- The web server is not silently reused; the test owns the process and its env.
- Its env includes a clearly test-only default `DEMO_SIGNING_KEY` if the caller
  did not provide one.
- It sets `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` so Wrangler exposes that default
  when a clean clone does not yet have `.dev.vars`.
- The value is test scaffolding, not a production credential and never enters the
  browser response.
- A caller can set `PLAYWRIGHT_BASE_URL` to exercise an already-running or deployed
  target; when set, Playwright does not spawn the local server.
- This escape hatch aligns with the product specification's preference to test a
  deployed surface when feasible without making deployment a local prerequisite.

## File and repository hygiene

- `test-results/` and `playwright-report/` will be gitignored.
- No screenshots or traces are committed as implementation files.
- `package-lock.json` records the runner dependency.
- Chromium browser binaries remain Playwright-managed machine cache, not repo
  content.
- Product source under `src/` remains unchanged.
- Ticket frontmatter remains unchanged.
- Commits stage explicit paths only because the working tree contains unrelated
  untracked Lisa, Vend, and governance content.
- If a sibling ticket owns the repository's generic `npm test` script by
  implementation time, this ticket adds only the two `test:flow*` scripts and
  preserves that sibling entry.

## Risks and mitigations

- **Browser binary absent:** install Chromium with Playwright during implementation;
  document that CI/bootstrap must also install it.
- **Step printing option differs by installed Playwright version:** install a
  current compatible release, run TypeScript/config loading, and inspect stdout.
- **JSON report does not preserve step title as expected:** inspect the emitted
  report; add a minimal reporter only if built-in evidence is insufficient.
- **Route handler resolves request unexpectedly:** verify the page remains in its
  loading state and the run fails around the inner budget.
- **Dev server env does not reach the boundary:** verify on a clean environment
  path; adjust only web-server env wiring, never application secret access.
- **Global timeout preempts reporting:** keep it at least twice the test timeout and
  confirm the stalled failure is assertion/step-scoped in actual output.
- **Retries multiply the runtime:** configure zero retries; this is a deterministic
  main-flow check, and the ticket's time guarantee should not be diluted.

## Decision summary

Implement one Playwright spec, selected through native `healthy` and `stalled`
projects. Centralize nested budgets, make the receipt transition a boxed named
step, leave the intercepted receipt request unresolved in stalled mode, and emit
both step-printing terminal output and JSON/trace artifacts. The healthy script is
the normal green test surface; the stalled script intentionally returns non-zero
near the 4-second assertion budget and identifies `await receipt boundary
response`, with 10-second test/server caps and a 20-second run backstop.
