# One-command integration check

Run the demo's complete preflight gate with:

```sh
npm run integration:check
```

The command builds the production client bundle, starts one isolated local Astro
server, and runs the receipt operation probe, Playwright audience flow, and
bundle/response leak assertion against that server. It stops the server when the
run finishes and writes a machine-readable summary to:

```text
test-results/integration-report.json
```

Playwright's JSON report and retained failure trace remain under `test-results/`.

## Prerequisites

Install repository dependencies and the Chromium binary once:

```sh
npm install
npx playwright install chromium
```

The combined check does not require a running dev server. It owns a server on
`127.0.0.1:4324` by default.

It also does not require `.dev.vars`. The command generates a disposable signing
key when `DEMO_SIGNING_KEY` is absent and passes that key to an isolated temporary
Wrangler config. A supplied `DEMO_SIGNING_KEY` is also supported. Neither value is
printed or persisted in the report.

## Healthy run

```sh
npm run integration:check
```

Expected result:

- exit `0`;
- operation, flow, and leak checks all run;
- the summary names `receipt` three times with passed outcomes;
- the JSON report records `outcome: "passed"` and `faultMode: "off"`.

Example final summary:

```text
Integration check: PASSED in 3.6s (budget 45.0s)
✓ receipt — operation passed
✓ receipt — flow passed
✓ receipt — leak passed
Report: test-results/integration-report.json
```

## Deliberate fault proof

Use the identical command with one server fault selected:

```sh
DEMO_FAULT=broken npm run integration:check
DEMO_FAULT=stalled npm run integration:check
DEMO_FAULT=leak npm run integration:check
```

Expected normalized evidence:

| Fault | Exit | Offending evidence |
|---|---:|---|
| `broken` | non-zero | `receipt [operation]` — signature verification failed |
| `stalled` | non-zero | `receipt [timeout]` — the boundary exceeded a bounded wait |
| `leak` | non-zero | `receipt [leak]` — the key reached the response body |

The aggregator continues to later checks after an ordinary check failure. This
means a broken or leaking run still records the browser flow and other specialized
assertions rather than stopping at the first red item.

`leak` mode is deliberately unsafe: the owned local server returns the configured
key so the disclosure assertion can prove it turns red. Never enable this mode on a
shared, preview, or production deployment.

Unknown `DEMO_FAULT` values are treated as healthy/off by the same fail-safe parser
used by the route.

## Overall time budget

The default overall budget is 45 seconds. It begins before the build and covers:

- production build;
- server startup;
- receipt operation probe;
- Playwright flow and reporter teardown;
- leak assertion.

The active child is terminated and remaining checks are skipped if the parent
deadline expires. Override the finite budget for a slower CI host with:

```sh
INTEGRATION_CHECK_TIMEOUT_MS=60000 npm run integration:check
```

The value must be a positive finite number in milliseconds.

## Port override

If port 4324 is occupied, select another local port:

```sh
INTEGRATION_CHECK_PORT=5432 npm run integration:check
```

The value must be an integer from 1 through 65535. All three checks receive the
same derived base URL.

## Exit semantics

- `0`: build/server setup succeeded and all three checks passed.
- `1`: one or more checks failed, or the overall deadline expired.
- `2`: the combined check itself was misconfigured or setup evidence could not be
  established.

The specialized commands remain independently runnable:

```sh
npm run ops:check
npm run test:flow
npm run test:flow:stalled
npm run leak:check
```

Use the combined command for the epic-level preflight contract; use an individual
command when iterating on that boundary alone.

## Evidence for agents

The final stdout block is the stable quick-reading interface. Every failed check
line includes:

- the exemplar boundary: `receipt`;
- a normalized failure kind such as `operation`, `timeout`, `flow`, `leak`,
  `evidence`, `execution`, or `overall-timeout`;
- the specialized check that observed it;
- the check duration.

The JSON report has schema version 1 and records the aggregate outcome, selected
fault mode, duration, overall budget, deadline status, and each normalized check
record with captured diagnostic output.

For browser failure details, inspect:

```text
test-results/flow-report.json
test-results/artifacts/
```

The stalled mode's Playwright report names the boxed step
`await receipt boundary response`, and its retained trace can be opened with the
command Playwright prints.

## Troubleshooting

### Build failure

The combined check stops before server startup because the leak assertion must scan
a valid `dist` bundle. Run `npm run build` directly for the complete compiler log.

### Browser executable missing

Install the expected browser once:

```sh
npx playwright install chromium
```

### Port unavailable

Use `INTEGRATION_CHECK_PORT` rather than starting or stopping unrelated developer
processes.

### Leak evidence unavailable

The leak check treats a missing/empty bundle or unreadable response as red evidence,
never as proof that the key is safe. Its normalized kind is `evidence` unless an
actual matching surface is found (`leak`).

### Deadline failure

Increase the overall budget only after inspecting which named check consumed it.
The specialized operation and Playwright checks retain their own tighter budgets so
the closest useful failure normally appears before the parent deadline.
