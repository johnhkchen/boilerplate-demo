# Research — T-002-01-04 boundary-fault-modes

## Ticket in one line

Make boundary failure observable **on demand**: a server-side fault flag with
`broken` and `stalled` modes so the *identical* `ops:check` command proves the
harness names the offender and fails **within** budget instead of spinning — and,
with the flag unset, still passes clean.

_Advances: P2 (failure is observable / bounded, not a hang)._

## Acceptance criteria (verbatim, restated)

- Flag = `broken` → `ops:check` exits non-zero, reporting the boundary and the
  failure kind.
- Flag = `stalled` → `ops:check` fails **at** the time budget (not after it),
  naming the boundary.
- Flag unset → the **identical** command passes clean.

Key phrase: "the identical command." The three outcomes differ only in **server**
state, never in how the check is invoked. That forces the fault to live behind the
boundary (the API route / its env), not in `ops:check` argv or config.

## The pieces already in place (this ticket composes, it does not invent)

### The boundary route — `src/pages/api/receipt.ts` (the injection point)

- `export const prerender = false` — the one on-demand route; runs server-side per
  request. Everything else is static.
- Reads `locals.runtime.env.DEMO_SIGNING_KEY`. Missing/blank key → returns a
  boundary-named `500 boundary_misconfigured` (already an *explicit, observable*
  failure, never a hang or a leak).
- Healthy path: `makeReceipt(key)` → `200` with the signed receipt (pretty JSON).
- Destructures `({ locals })` today; would add `request` for an abort-aware stall.
- `env` arrives via `.dev.vars` in dev (platformProxy) and Worker secrets in prod.
  This is the natural home for a `DEMO_FAULT` toggle read the same way as the key.

### The boundary logic — `src/lib/receipt.ts` (pure)

- `BOUNDARY_NAME = 'receipt'` (the stable handle the trace echoes).
- `Receipt` shape: `boundary, issuedAt, nonce, algorithm, signature, keySource`.
- `makeReceipt(key, opts)` → fresh signed receipt; `signature` = hex HMAC-SHA256
  over `canonicalMessage = boundary:issuedAt:nonce`.
- `verifyReceipt(key, r)` recomputes and compares — the out-of-band check the
  ops-check uses. Corrupting `signature` (or any signed field) makes this return
  `false`. Pure, no env, injectable time/randomness.

### The operation runner — `src/lib/operation-runner.ts` (pure, the timeout engine)

- `runOperation({ name, timeBudgetMs, invoke })` races the operation against a
  `setTimeout(timeBudgetMs)` deadline; on timeout it **resolves** a
  `kind: 'timeout'` failure **and** `controller.abort()`s the passed `signal`.
- Guarantees the runner's own result never exceeds the budget even if `invoke`
  ignores the signal — exactly the "fails at the budget, not after" property the
  `stalled` AC needs. The stalled mode gets this for free.
- Failure kinds: `'operation'` (threw/rejected) vs `'timeout'` (budget hit). Both
  carry `operationName`, so the boundary is named even with no response to inspect.

### The ops-check core — `src/lib/ops-check.ts` (pure, injectable `fetch`)

- `runBoundaryCheck(config)`: `fetch`es the URL through `runOperation` with
  `name: BOUNDARY_NAME`; on `!res.ok` throws `boundary answered HTTP <status>`;
  validates shape via `assertReceiptShape` (rejects any non-`receipt` 200); when a
  key is held, `verifyReceipt` — mismatch throws `signature did not verify against
  the out-of-band key`.
- Crucial: **the two fault modes map onto paths the core already handles.**
  - `broken` (a served-but-wrong 200) → the `operation` failure path (bad
    signature / bad shape / non-200), already exercised by tests.
  - `stalled` (hang) → the runner's `timeout` path, already exercised by a
    `new Promise(() => {})` stub test.
  So no new core logic is required — only a way for the *server* to enter those
  states, plus proof that it does.
- `formatBoundaryTrace(result)` already prints `✗ receipt — failed in N ms
  [operation|timeout]` + message. So "reporting the boundary and failure kind" is
  already produced by the formatter; the ticket only has to trigger a real failure.

### The CLI edge — `scripts/ops-check.ts`

- Resolves URL (`OPS_CHECK_URL` / `DEMO_BASE_URL`, default
  `http://localhost:4321/api/receipt`), budget (`OPS_CHECK_TIMEOUT_MS`, default
  `2000`), key (`DEMO_SIGNING_KEY` env, else parsed from `.dev.vars`).
- Exit codes: `0` pass · `1` boundary failed · `2` check misconfigured. The
  `broken`/`stalled` ACs both land on exit `1`.
- **`.dev.vars` fallback** means a plain local `npm run ops:check` **holds the same
  key the dev server signs with** → it can detect a signature-level `broken` fault.
  `.dev.vars` exists in the repo (71 bytes, `DEMO_SIGNING_KEY=…`). Confirmed.

## The parallel prior art — Playwright `stalled` (S-002-02 / tests/)

- `playwright.config.ts` defines two projects: `healthy`, `stalled`; scripts
  `test:flow` / `test:flow:stalled`.
- `tests/demo-flow.spec.ts`: in the `stalled` project it does
  `page.route('**/api/receipt', () => {})` — a **client-side** stall (the browser
  never lets the request complete) so the named receipt step proves its own budget.
- `tests/support/flow-contract.ts`: nested `FLOW_BUDGET_MS`, `FLOW_PROJECT` names.

Observation: the Playwright suite stalls **from the browser**; this ticket stalls
**from the server**. They are complementary fault-injection seams for two different
observers (browser flow vs. operator `ops:check`). This ticket is scoped to the
server + ops-check; it should *not* need to touch the Playwright flow, though the
naming (`stalled`) should stay consistent for a coherent demo story.

## Types & config touchpoints

- `src/env.d.ts` declares `Env = { DEMO_SIGNING_KEY: string }` on
  `locals.runtime.env`. A `DEMO_FAULT?: string` would be added here so the route
  reads a typed value, not `any`.
- `.dev.vars` / `.dev.vars.example` — the documented place to flip the toggle for a
  local dev server (or `CLOUDFLARE_INCLUDE_PROCESS_ENV=true DEMO_FAULT=… npm run
  dev`, the mechanism `playwright.config.ts` already uses to pass `DEMO_SIGNING_KEY`
  through platformProxy).
- `package.json` test script runs `test/operation-runner.test.mjs` and
  `test/ops-check.test.mjs` via `node --experimental-strip-types --test`. A new
  `test/fault.test.mjs` would be added to that list.

## Established conventions to honor

- **Pure core / thin edge.** Side-effect-free logic → `src/lib/*.ts`; all env, argv,
  stdout, `process.exit`, file I/O at the edge (`api/*.ts`, `scripts/*.ts`). New
  fault *logic* must be pure and unit-testable with no server.
- **Tests are stub-driven, sub-second, committed.** Node built-in runner, plain
  object stubs, no live network in the suite. A live `npm run ops:check` against
  `astro dev` is the end-to-end confirmation done in Implement/Review, not in CI.
- **Brand voice on any operator-facing copy** — plain kitchen-table English, no
  jargon (the existing trace lines already follow this).
- **The trace already names boundary + kind** — reuse it; don't reformat.

## Assumptions & constraints surfaced

- The fault is **operator-triggered server state**, read from `env` exactly like the
  signing key — never a change to how `ops:check` is invoked (the "identical
  command" requirement).
- `stalled` "fails **at** the budget, not after": comes from the runner's own
  deadline+abort — the server merely has to genuinely hang; the client bounds it.
- Unknown/typo fault values must be **safe** — default to healthy so the server can
  never accidentally break itself. Fault is strictly opt-in.
- A `broken` mode that yields a well-formed-but-wrong `200` (naive `curl -f` would
  pass it, the harness catches it) best demonstrates *why* signature/shape checking
  exists — but its signature-level detection depends on the check holding a key. The
  local default (`.dev.vars`) holds one; a keyless environment is a documented
  caveat consistent with ops-check Decision 4. (Design will weigh this vs. a
  key-independent `broken`.)
- Out of scope: retries/polling, JSON report files, touching the browser flow, the
  page, deploy config, or the receipt/runner logic itself.
