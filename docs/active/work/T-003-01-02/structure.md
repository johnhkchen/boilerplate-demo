# Structure — T-003-01-02 shared-passcode-gate

The file-level blueprint. Shape of the code, not the code.

## Change set at a glance

| File                          | Action   | Why                                                        |
| ----------------------------- | -------- | ---------------------------------------------------------- |
| `src/lib/passcode.ts`         | create   | the reusable gate: pure core + route adapter                |
| `test/passcode.test.mjs`      | create   | drives the gate (the ticket's acceptance)                   |
| `src/env.d.ts`                | modify   | add `DEMO_PASSCODE` to the server `Env` type                |
| `.dev.vars.example`           | modify   | document `DEMO_PASSCODE` for local dev + prod secret path   |
| `package.json`                | modify   | add the new test file to the `test` script list            |

No files deleted. No API route created (downstream tickets own the routes).

## `src/lib/passcode.ts` — the module

Header comment in the house style: states purity (no env, no I/O beyond building a
`Response`, no throw except on programmer error), names the consumers it exists for (the
submit route T-003-02-01 and retrieve seam T-003-03-01), and states the bundle guarantee
(passcode is an *argument*, never embedded; env is owned by the HTTP edge).

### Public constants (single source of truth)

```ts
export const GATE_NAME = 'backstage';            // stable handle for bodies / tracing
export const PASSCODE_ENV = 'DEMO_PASSCODE';     // the server-only env var name
export const PASSCODE_HEADER = 'x-demo-passcode'; // where the client presents it
```
Mirrors `fault.ts`'s `FAULT_ENV` — the route and docs share one name and cannot drift.

### Public types

```ts
export type GateReason = 'misconfigured' | 'missing' | 'mismatch';

export type GateDecision =
  | { allowed: true }
  | { allowed: false; reason: 'misconfigured'; status: 500 }
  | { allowed: false; reason: 'missing';       status: 401 }
  | { allowed: false; reason: 'mismatch';      status: 403 };
```

### Internal helpers

- `constantTimeEqual(a: string, b: string): boolean` — length-independent, XOR-accumulating,
  best-effort constant-time compare. Folds `a.length ^ b.length`, loops over
  `max(a.length, b.length)`, coerces out-of-range `charCodeAt` (`NaN`) to `0` via `| 0`.
  Returns `true` only when every code unit and the lengths match. Commented as best-effort.
- `isBlank(v: string | null | undefined): boolean` — `true` when not a string or
  `.trim() === ''`. Used for both "server passcode unset" and "no passcode presented".

### Public functions

1. `passcodeFromHeaders(headers: Headers): string | null`
   - Returns the `PASSCODE_HEADER` value, or `null` if absent. Reads only from headers —
     no env, no body. The route passes `request.headers`.

2. `checkPasscode(configured: string | null | undefined, presented: string | null | undefined): GateDecision`
   - `isBlank(configured)` → `{ allowed:false, reason:'misconfigured', status:500 }` (fail closed).
   - else `isBlank(presented)` → `{ allowed:false, reason:'missing', status:401 }`.
   - else `constantTimeEqual(presented, configured)` → `true` ⇒ `{ allowed:true }`,
     `false` ⇒ `{ allowed:false, reason:'mismatch', status:403 }`.
   - Order matters: misconfiguration is checked before the visitor's input, so a broken
     server never blames the visitor (matches `receipt.ts` ordering: config before fault).
   - Pure. Never throws. Never returns or logs the configured value.

3. `describeDecision(decision: GateDecision): { error: string; detail: string }`
   - Pure map from reason → machine slug + plain-English detail (brand voice). Only called
     for `allowed:false`; typed to accept the union and returns a stable body pair.
   - `misconfigured` → `{ error:'gate_misconfigured', detail:'the backstage passcode is not set on the server' }`
   - `missing` → `{ error:'passcode_missing', detail:'this backstage door needs the shared passcode' }`
   - `mismatch` → `{ error:'passcode_mismatch', detail:"that passcode doesn't match" }`

4. `guardPasscode(request: Request, configured: string | null | undefined): Response | null`
   - `checkPasscode(configured, passcodeFromHeaders(request.headers))`.
   - `allowed` ⇒ `null` (route proceeds).
   - else ⇒ a JSON `Response` with the decision's `status`, body
     `{ gate: GATE_NAME, ...describeDecision(decision) }`, `content-type:
     application/json; charset=utf-8` (same `json()` shape as `receipt.ts`).
   - The only function that references `Response`; keeps the core pure and testable.

### Public interface summary (what downstream imports)

Submit route (T-003-02-01) and retrieve seam (T-003-03-01):
```ts
import { guardPasscode } from '../../lib/passcode';
// inside the handler, first thing after reading env:
const denied = guardPasscode(request, env?.DEMO_PASSCODE);
if (denied) return denied;
```
Tests / tooling that want the decision without a `Response` use `checkPasscode` directly.

## `test/passcode.test.mjs` — the acceptance driver

Imports `../src/lib/passcode.ts`. Cases (each `node:test` + `assert/strict`):

1. **correct passcode passes** — `checkPasscode(SECRET, SECRET).allowed === true`.
2. **wrong passcode → 403 mismatch** — reason + status asserted.
3. **missing passcode → 401** — `null`, `''`, and `'   '` presented all → `missing`/401.
4. **blank server passcode → 500 misconfigured** — `undefined`/`''`/`'  '` configured →
   `misconfigured`/500 regardless of presented (fail closed).
5. **`constantTimeEqual` correctness** — equal → true; differing length → false; same length
   one-char diff → false; empty/empty → true (covers the `NaN | 0` path).
6. **`passcodeFromHeaders`** — reads header value; absent → `null`.
7. **`guardPasscode` end-to-end** — build `new Request('https://demo/backstage', { headers })`:
   - correct header → returns `null`.
   - wrong header → `Response` status 403, JSON body `error === 'passcode_mismatch'`,
     `gate === GATE_NAME`.
   - no header → `Response` status 401, `error === 'passcode_missing'`.
   - blank configured → `Response` status 500, `error === 'gate_misconfigured'`.
8. **bundle-safety (structural)** — assert `PASSCODE_ENV === 'DEMO_PASSCODE'` and that it
   does **not** start with `PUBLIC_` (so Astro never inlines it into client output); assert
   a denial body (`JSON.stringify`) does **not** include the configured passcode value —
   the gate never echoes the secret it checks against.

## `src/env.d.ts` — env typing

Add `DEMO_PASSCODE: string;` to `type Env`, with a comment matching the existing ones:
server-only, arrives on `locals.runtime.env` (via `.dev.vars` in dev, Worker secret in
prod), never `PUBLIC_`-prefixed so never inlined into client output. Kept required (a
backstage without a passcode is a misconfiguration the gate reports as 500).

## `.dev.vars.example` — documentation

Add a `DEMO_PASSCODE` block after `DEMO_SIGNING_KEY`: what it is (the shared low-stakes
backstage gate, not a server secret), the `x-demo-passcode` header the client presents,
the `wrangler secret put DEMO_PASSCODE` production path, and a note that it is a low-stakes
gate — real keys still never go in browser bundles or feedback.

## `package.json` — test wiring

Append `test/passcode.test.mjs` to the space-separated file list in the `test` script so
`npm test` runs it. (The script lists files explicitly; a new file is invisible otherwise.)

## Ordering of changes

1. `src/lib/passcode.ts` (the unit under test).
2. `test/passcode.test.mjs` + wire into `package.json` → run, watch it drive the gate.
3. `src/env.d.ts` + `.dev.vars.example` (env surface + docs).
Each step is independently checkable; steps 1–2 are the acceptance, step 3 is the surface
downstream routes read from.
