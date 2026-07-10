# Structure — T-002-01-03 exemplar-boundary-ops-check

## Change map

```text
src/lib/ops-check.ts
  CREATE  pure core: compose runOperation + fetch + verifyReceipt; format trace line

scripts/ops-check.ts
  CREATE  thin CLI: resolve config (env + .dev.vars), run core, print, set exit code

test/ops-check.test.mjs
  CREATE  Node suite: healthy / down / hung / tampered / bad-status / no-key (stub fetch)

package.json
  MODIFY  add "ops:check" script; widen "test" to include the new suite
```

No change to `src/lib/receipt.ts`, `src/lib/operation-runner.ts`,
`src/pages/api/receipt.ts`, `src/pages/index.astro`, `astro.config.mjs`,
`wrangler.jsonc`, or any styling/deploy/env file. No files deleted. No dependency or
lockfile change — everything runs on the Node runtime already present. The RDSPI
docs live in `docs/active/work/T-002-01-03/` and are workflow artifacts, not modules.

## Module 1 — `src/lib/ops-check.ts` (pure core)

### Location & rationale

Beside `receipt.ts` and `operation-runner.ts`, the two seams it composes. It imports
both by **explicit `.ts` extension** (Node executes it directly under type
stripping). It reads no env, touches no argv, writes no stdout, calls no
`process.exit`, reads no files. Pure in, data out — so tests drive it with a stub.

### Imports

```ts
import { runOperation } from './operation-runner.ts';
import type { OperationResult, FailedOperationTrace } from './operation-runner.ts';
import { BOUNDARY_NAME, verifyReceipt } from './receipt.ts';
import type { Receipt } from './receipt.ts';
```

### Public types

```ts
export interface BoundaryCheckConfig {
  url: string;              // full URL of the boundary, e.g. http://127.0.0.1:4321/api/receipt
  timeBudgetMs: number;     // passed straight to runOperation; it validates it
  key?: string;             // out-of-band signing key; when present, signature is verified
  fetchImpl?: typeof fetch; // injectable; defaults to global fetch
}

export interface BoundaryCheckValue {
  receipt: Receipt;         // the validated receipt returned by the boundary
  signatureVerified: boolean; // true only when a key was present AND verified
}

// The runner's own result, specialized to this operation's value type.
export type BoundaryCheckResult = OperationResult<BoundaryCheckValue>;
```

### Public functions

```ts
// Compose the runner with the boundary fetch + verification. Always settles.
export async function runBoundaryCheck(
  config: BoundaryCheckConfig,
): Promise<BoundaryCheckResult>;

// One-or-two-line, stack-free human summary of a settled result. Pure string.
export function formatBoundaryTrace(result: BoundaryCheckResult): string;
```

`runBoundaryCheck` builds `invoke` and calls:

```ts
return runOperation<BoundaryCheckValue>({
  name: BOUNDARY_NAME,           // trace.operationName === 'receipt' on pass AND fail
  timeBudgetMs: config.timeBudgetMs,
  invoke: async ({ signal }) => { /* fetch → ok → parse → shape → verify → value */ },
});
```

### Internal helpers (not exported)

- `assertReceiptShape(body: unknown): Receipt` — narrows the parsed JSON. Requires
  `boundary`, `issuedAt`, `nonce`, `signature` to be strings and `boundary ===
  BOUNDARY_NAME`; throws `Error('unexpected response shape from the boundary')`
  otherwise. Returns the value typed as `Receipt`.
- `roundMs(n: number): string` — formats `durationMs` to one decimal for display
  only (e.g. `12.3`). The trace keeps full precision; only the printed line rounds.

### `invoke` body — exact control flow

```text
res = await fetchImpl(url, { signal, headers: { accept: 'application/json' } })
        └─ server down → rejects here (ECONNREFUSED) → runner: kind 'operation'
if (!res.ok) throw Error(`boundary answered HTTP ${res.status}`)
body = await res.json()          // malformed JSON → throws → kind 'operation'
receipt = assertReceiptShape(body)
if (key !== undefined) {
  ok = await verifyReceipt(key, receipt)
  if (!ok) throw Error('signature did not verify against the out-of-band key')
  return { receipt, signatureVerified: true }
}
return { receipt, signatureVerified: false }
```

Every `throw` is caught by the runner and turned into a stack-free
`FailedOperationTrace`. A hang anywhere (e.g. a socket that never answers) is cut by
the runner's abort at `timeBudgetMs` → `kind: 'timeout'`. The core never catches its
own errors — letting the runner own normalization is what guarantees "no raw stack."

### `formatBoundaryTrace` — output contract

- Passed:
  ```text
  ✓ receipt — passed in 12.3 ms
      issued at   2026-07-10T09:15:04.123Z
      one-time    <nonce>
      signature   verified against the out-of-band key
                  (or) present, not checked — no key available
  ```
- Failed:
  ```text
  ✗ receipt — failed in 2000.0 ms  [timeout]
      Operation "receipt" exceeded its 2000 ms time budget.
  ```
  `[operation]` or `[timeout]` comes from `trace.failure.kind`; the second line is
  `trace.failure.message` verbatim (already normalized, never a stack).

Both branches read only `trace.operationName`, `trace.durationMs`, `trace.outcome`,
and (on fail) `trace.failure` — the stable runner contract from T-002-01-01.

## Module 2 — `scripts/ops-check.ts` (thin CLI)

### Location & rationale

Top-level `scripts/` (new dir), outside `src/` so it never enters the Astro build
graph. Run via `node --experimental-strip-types scripts/ops-check.ts`. This is the
**only** file that touches the outside world.

### Responsibilities (in order)

1. **Resolve config** from `process.env` with documented defaults (Design Decision 5):
   - `url` ← `OPS_CHECK_URL` ?? `${DEMO_BASE_URL ?? 'http://127.0.0.1:4321'}/api/receipt`
   - `timeBudgetMs` ← `Number(OPS_CHECK_TIMEOUT_MS ?? 2000)`
   - `key` ← `DEMO_SIGNING_KEY` ?? `readDevVarsKey('.dev.vars')`
2. `readDevVarsKey(path)` — tolerant `.dev.vars` parser (private to the script):
   read file if it exists; for each `KEY=VALUE` line, strip optional surrounding
   quotes; return `DEMO_SIGNING_KEY` or `undefined`. Any read/parse error → `undefined`
   (never throws; the check simply runs without out-of-band verification).
3. `result = await runBoundaryCheck(config)` — may reject with `TypeError`/`RangeError`
   if config is invalid (bad budget). Wrap in try/catch → print a config-error line,
   `process.exit(2)`.
4. `console.log(formatBoundaryTrace(result))`.
5. `process.exit(result.trace.outcome === 'passed' ? 0 : 1)`.

### Imports

```ts
import { readFileSync, existsSync } from 'node:fs';
import { runBoundaryCheck, formatBoundaryTrace } from '../src/lib/ops-check.ts';
```

The script contains no receipt/runner logic — only glue. It stays short enough to
audit at a glance; the logic it glues is covered by the test suite.

## Module 3 — `test/ops-check.test.mjs`

### Location & runtime

Top-level `test/`, beside `operation-runner.test.mjs`. Node built-in runner via
`node --experimental-strip-types`. Imports:

```ts
import { runBoundaryCheck, formatBoundaryTrace } from '../src/lib/ops-check.ts';
import { makeReceipt, BOUNDARY_NAME } from '../src/lib/receipt.ts';
```

No server, no real network, no `process.exit`. A stub-fetch factory builds
`{ ok, status, json: async () => body }` responses; `makeReceipt(KEY)` produces
genuinely-signed bodies so verification is exercised for real (not mocked).

### Cases (assert the discriminated result, not stdout)

1. **healthy + valid key** → `outcome 'passed'`, `operationName === BOUNDARY_NAME`,
   finite `durationMs`, `value.signatureVerified === true`.
2. **server down** (stub rejects) → `outcome 'failed'`, `failure.kind === 'operation'`,
   `operationName === BOUNDARY_NAME`.
3. **hung** (stub never resolves, budget 40 ms, outer timeout 1000 ms) → `failed`,
   `failure.kind === 'timeout'`, `operationName === BOUNDARY_NAME`, settles fast.
4. **tampered / wrong key** (body signed `KEY_A`, verified `KEY_B`) → `failed`,
   `failure.kind === 'operation'`, message mentions signature.
5. **bad status** (`{ ok:false, status:500 }`) → `failed`, message names HTTP 500.
6. **no key** → `passed`, `value.signatureVerified === false`.
7. **format smoke** — `formatBoundaryTrace` on a passed and a failed result contains
   `receipt`, contains no `\n    at ` stack marker, and (fail) contains the kind.

## Package script changes

```jsonc
"scripts": {
  // widen so both suites run under one gate
  "test": "node --experimental-strip-types --test test/operation-runner.test.mjs test/ops-check.test.mjs",
  // new: run the ops check against the local demo
  "ops:check": "node --experimental-strip-types scripts/ops-check.ts",
  // ...existing dev/build/preview/deploy untouched
}
```

Explicit file list for `test` (matches the existing explicit style; avoids
discovery-glob differences across Node). `ops:check` uses the same type-stripping
flag as `test`, so tooling stays consistent and build-free.

## Ordering constraints

1. `progress.md` first (implementation log + baseline: 4 tests green).
2. `src/lib/ops-check.ts` — the core compiles/type-checks against the two seams.
3. `test/ops-check.test.mjs` + `package.json` `test` widening — land together so the
   `test` script never names a missing file. Run the suite; it must be green.
4. `scripts/ops-check.ts` + `package.json` `ops:check` — the runnable edge.
5. **Live verification** — `astro dev` up: `npm run ops:check` exits 0, names
   `receipt` + latency. Server down: exits non-zero within budget, names `receipt`,
   no stack. Also confirm `npm run build` still green and `ops-check.ts` is absent
   from `dist/`.
6. `review.md` after all checks pass and the focused diff is inspected.

Commit boundaries follow steps 2, 3, 4 (and doc commits), each a self-contained unit,
touching only this ticket's files.

## Downstream interface stability

T-002-01-04 (fault modes) will reuse this command unchanged: it sets a fault flag on
the boundary and reruns `npm run ops:check`, relying on `formatBoundaryTrace` already
printing `failure.kind` (`operation` vs `timeout`) and the exit-code contract (0 pass
/ 1 boundary-fail). Nothing in that ticket needs to edit `ops-check.ts` — it edits
the boundary and observes this command. Keep `runBoundaryCheck`'s config keys and the
0/1/2 exit codes stable.
