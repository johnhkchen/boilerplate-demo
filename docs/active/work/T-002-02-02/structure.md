# Structure — T-002-02-02 bundle-and-response-leak-check

## File map

```text
src/lib/fault.ts                    MODIFY  add leak mode/body transform
src/pages/api/receipt.ts            MODIFY  serve deliberate leak response
src/env.d.ts                        MODIFY  document leak flag value
src/lib/leak-check.ts               CREATE  checker core and formatter
scripts/leak-check.ts               CREATE  configuration/CLI edge
test/fault.test.mjs                 MODIFY  leak parsing/body coverage
test/leak-check.test.mjs            CREATE  asset/response/checker coverage
package.json                        MODIFY  leak:check + test suite entry
.dev.vars.example                   MODIFY  document leak mode and command
docs/active/work/T-002-02-02/*.md   CREATE  RDSPI artifacts
```

No files are deleted. Ticket frontmatter remains untouched.

## Fault module interface

`src/lib/fault.ts` expands its public union:

```ts
export type FaultMode = 'off' | 'broken' | 'stalled' | 'leak';
```

`parseFaultMode(raw)` recognizes exact normalized `broken`, `stalled`, and `leak`;
everything else remains `off`.

Add:

```ts
export type LeakingReceipt = Receipt & { diagnosticSigningKey: string };
export function leakSigningKey(receipt: Receipt, key: string): LeakingReceipt;
```

The helper returns a new object and does not mutate the receipt. It is explicitly
unsafe test/fault behavior and is called only by the route's `leak` branch.

## Receipt route wiring

`src/pages/api/receipt.ts` retains this order:

1. read env and validate key;
2. parse fault;
3. handle stalled before receipt creation;
4. create valid receipt;
5. handle broken;
6. handle leak;
7. return healthy body.

`leak` returns `json(leakSigningKey(receipt, key), 200)`. No request-controlled
query/header can enable it. Existing healthy/error bodies are unchanged.

## Leak-check core interface

`src/lib/leak-check.ts` is a Node-only operator module exporting:

```ts
export type LeakSurface = 'asset' | 'response';

export interface LeakFinding {
  surface: LeakSurface;
  location: string;
}

export interface LeakCheckConfig {
  bundleDir: string;
  responseUrl: string;
  secret: string;
  timeBudgetMs: number;
  fetchImpl?: typeof fetch;
}

export interface LeakCheckResult {
  outcome: 'passed' | 'failed';
  findings: LeakFinding[];
  checked: { assetFiles: number; responseBodies: number };
}

export async function runLeakCheck(
  config: LeakCheckConfig,
): Promise<LeakCheckResult>;

export function formatLeakCheck(result: LeakCheckResult): string;
```

Invalid configuration or unavailable evidence throws. A completed `failed` result
means the check actually found the key.

## Asset traversal internals

The recursive walker starts at `bundleDir`, sorts directory entries, reads regular
files, and does not follow symlinks. It skips only these top-level relative paths:

```text
_worker.js/**
_routes.json
.assetsignore
```

Paths normalize to `/` and remain relative to the bundle root. Every included
file increments the count. Zero included client files throws.

Matching is `Buffer.includes(Buffer.from(secret, 'utf8'))`. One finding per file
is enough regardless of occurrence count.

## Response inspection internals

Create an `AbortController` and timer for `timeBudgetMs`. Fetch `responseUrl` with
`accept: application/json` and the signal, read `text()` regardless of status, and
clear the timer in `finally`. One read body increments the response count.

If raw text contains the marker, add a response finding. Network, timeout, or body
read errors throw a safe URL-bearing message without response content or key.

Validation requires nonblank secret/directory/URL and positive finite timeout.
Findings sort by surface then location. Outcome derives from finding count.

## Formatter contract

Pass resembles:

```text
✓ leak check — passed
    client assets    2 checked
    response bodies  1 checked
```

Failure resembles:

```text
✗ leak check — secret reached 2 browser surfaces
    client asset: _astro/app.js
    response body: http://localhost:4321/api/receipt
```

The formatter never receives or emits the secret.

## CLI edge

`scripts/leak-check.ts` follows `scripts/ops-check.ts` conventions.

Defaults and precedence:

```text
bundleDir    LEAK_CHECK_DIR ?? dist
responseUrl  LEAK_CHECK_URL ?? (DEMO_BASE_URL ?? localhost:4321) + /api/receipt
timeout      LEAK_CHECK_TIMEOUT_MS ?? 2000
secret       DEMO_SIGNING_KEY ?? .dev.vars DEMO_SIGNING_KEY
```

It prints completed results to stdout and maps clean/finding/setup to 0/1/2.
Setup errors use `leak check misconfigured:` and never include the marker.

## Tests

`test/leak-check.test.mjs` uses Node test, temporary directories, and injected
fetch responses. Cases cover clean result/counts, nested asset leak, Worker/meta
exclusion, raw response leak, simultaneous findings/order, safe formatting,
missing/empty bundle, invalid secret/timeout, fetch rejection, and bounded abort.

`test/fault.test.mjs` adds parser cases and proves the deliberate body contains the
configured marker without mutating its receipt, while ordinary serialization does
not contain the marker.

`package.json` adds the new test file to the explicit list and adds:

```json
"leak:check": "node --experimental-strip-types scripts/leak-check.ts"
```

All existing scripts and concurrent package changes remain intact.

## Documentation touchpoints

`.dev.vars.example` lists `leak` beside `broken`/`stalled`, says it deliberately
places the key in the response, and names `npm run leak:check`. The mode remains
commented and no real secret is added.

`src/env.d.ts` updates only the fault-value comment; the external env stays typed
as optional string so parsing still handles arbitrary deployment input.

## Change order

1. Extend fault helper and tests.
2. Wire route and env/example docs.
3. Add leak core and tests.
4. Add CLI and package command.
5. Run unit/type/build checks.
6. Run clean/leaking evidence where host permissions allow.
7. Write progress and review.
