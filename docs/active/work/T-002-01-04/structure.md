# Structure — T-002-01-04 boundary-fault-modes

The shape of the change. Two source files touched, one created, one test created,
two docs/config touched. No file deleted. No change to `operation-runner.ts`,
`ops-check.ts`, `receipt.ts`, `scripts/ops-check.ts`, the page, or deploy config.

## Created — `src/lib/fault.ts` (pure, framework-free)

The only new logic unit. No env, no I/O, no throw. Mirrors `receipt.ts` house style.

```ts
import type { Receipt } from './receipt.ts';
import { canonicalMessage } from './receipt.ts'; // only if needed; see note

// The three server states the boundary can be put in. 'off' is healthy.
export type FaultMode = 'off' | 'broken' | 'stalled';

// The env var an operator flips. Named here so the route and docs share one source.
export const FAULT_ENV = 'DEMO_FAULT';

// Tolerant + fail-safe: trim/lowercase; exact match wins; anything else → 'off'
// (unset, empty, or a typo must never accidentally break the server).
export function parseFaultMode(raw: string | null | undefined): FaultMode;

// broken mode: return a copy of a valid receipt whose signature is deterministically
// corrupted (each hex digit d → (15 - d)) so it stays same-length hex but no longer
// verifies. Guaranteed different from the input. Pure; leaves every other field.
export function corruptSignature(receipt: Receipt): Receipt;
```

Notes / contracts:

- `parseFaultMode` returns only the three literals; never throws.
- `corruptSignature` does **not** re-sign; it invalidates. It touches only
  `signature`, so `assertReceiptShape` still passes and `verifyReceipt` fails — the
  intended "well-formed 200 that won't verify."
- `flipHexDigit` is a private helper; not exported. It relies on input being lower
  hex (as `makeReceipt` always produces via `toHex`); non-hex chars pass through
  unchanged (defensive, but not expected).
- Import surface kept minimal — only `type Receipt`. `canonicalMessage` is **not**
  needed (we corrupt, we don't recompute), so it is not imported. (Struck from the
  sketch above.)

## Modified — `src/pages/api/receipt.ts` (thin edge; the injection point)

Add the env read + two branches. Ordering matters: **key validation first**
(unchanged), then fault. A missing key still wins (a misconfigured server is a
misconfigured server regardless of the fault toggle).

```ts
import { BOUNDARY_NAME, makeReceipt } from '../../lib/receipt';
import { parseFaultMode, corruptSignature, FAULT_ENV } from '../../lib/fault';

export const GET: APIRoute = async ({ locals, request }) => {   // + request
  const env = locals.runtime?.env;
  const key = env?.DEMO_SIGNING_KEY;
  if (typeof key !== 'string' || key.trim() === '') {
    return json({ boundary: BOUNDARY_NAME, error: 'boundary_misconfigured', … }, 500);
  }

  const fault = parseFaultMode(env?.[FAULT_ENV]);      // read like the key

  if (fault === 'stalled') {
    // Do not answer. Settle only when the probe gives up, so nothing leaks.
    return new Promise<Response>((resolve) => {
      request.signal.addEventListener(
        'abort',
        () => resolve(new Response(null, { status: 499 })),
        { once: true },
      );
    });
  }

  const receipt = await makeReceipt(key);
  if (fault === 'broken') return json(corruptSignature(receipt), 200);
  return json(receipt, 200);                            // healthy (fault 'off')
};
```

Boundaries respected:

- All env access stays in this edge file; `fault.ts` stays pure.
- `env?.[FAULT_ENV]` uses the exported name so route and docs cannot drift.
- The `499` response is never read (the client already aborted); it exists only to
  let Astro finish the request cleanly instead of leaking a pending handler.
- No new response *shape* on the healthy or misconfigured paths — untouched.

## Modified — `src/env.d.ts` (types)

Extend the runtime `Env` so the route reads a typed value, not `any`:

```ts
type Env = {
  DEMO_SIGNING_KEY: string;
  DEMO_FAULT?: string; // optional operator toggle: 'broken' | 'stalled' | unset
};
```

Optional (`?`) — production and normal dev never set it. Kept a loose `string`
(parsed/narrowed by `parseFaultMode`) rather than the union, so an arbitrary env
value type-checks and is normalized in one place.

## Created — `test/fault.test.mjs` (committed, stub-driven, Node built-in runner)

Mirrors `test/ops-check.test.mjs` conventions (`node:test`, `node:assert/strict`,
plain-object stubs, no network). Cases (from Design Decision 6):

1. `parseFaultMode` table — unset/empty/whitespace/unknown → `off`; `broken`,
   `BROKEN`, `' stalled '` → normalized. Guards the fail-safe default.
2. `corruptSignature` — differs from input; same length; `/^[0-9a-f]+$/`;
   `verifyReceipt(KEY, corrupted) === false`; `verifyReceipt(KEY, original) === true`.
3. Compose — `runBoundaryCheck` over a stub `fetch` returning
   `corruptSignature(await makeReceipt(KEY))`, `key: KEY` → failed, `operation`,
   `operationName === 'receipt'`, message `/signature/i`. Proves broken-server →
   ops-check exit-1 at the seam.

Imports: `{ parseFaultMode, corruptSignature }` from `../src/lib/fault.ts`;
`{ makeReceipt, verifyReceipt, BOUNDARY_NAME }` from `../src/lib/receipt.ts`;
`{ runBoundaryCheck }` from `../src/lib/ops-check.ts`.

## Modified — `package.json` (test list)

Append the new suite to the `test` script:

```
node --experimental-strip-types --test \
  test/operation-runner.test.mjs test/ops-check.test.mjs test/fault.test.mjs
```

No new dependency, no new top-level script. `ops:check` is reused as-is.

## Modified — `.dev.vars.example` (operator docs)

Document the toggle so the demo is discoverable, e.g.:

```
# Optional: put the exemplar boundary into a deliberate fault to see ops:check catch
# it. Unset for a healthy demo. 'broken' → a signed note the check rejects; 'stalled'
# → the boundary never answers and ops:check fails at its time budget, not after.
# DEMO_FAULT=broken
```

`.dev.vars` itself (the real, git-ignored file) is **not** committed; the operator
adds `DEMO_FAULT=…` there, or runs `CLOUDFLARE_INCLUDE_PROCESS_ENV=true
DEMO_FAULT=… npm run dev` — the same pass-through `playwright.config.ts` uses.

## Ordering of changes (why this sequence)

1. `src/lib/fault.ts` — pure unit first; nothing depends on it yet.
2. `test/fault.test.mjs` + `package.json` — prove the unit in isolation.
3. `src/pages/api/receipt.ts` + `src/env.d.ts` — wire the proven unit into the edge.
4. `.dev.vars.example` — document the operator affordance.
5. Live verification (Implement) — `broken`/`stalled`/unset against `astro dev`.

Each step is independently committable and verifiable; the route change lands only
after the logic it calls is already green.

## Public interface summary (what other code may import)

| Symbol | From | Consumers |
|---|---|---|
| `FaultMode` (type) | `src/lib/fault.ts` | route, tests |
| `FAULT_ENV` | `src/lib/fault.ts` | route |
| `parseFaultMode` | `src/lib/fault.ts` | route, tests |
| `corruptSignature` | `src/lib/fault.ts` | route, tests |

Nothing else is exported; the flip helper stays private. No existing public
interface changes.
