# Review — T-002-01-04 boundary-fault-modes

Handoff for a human reviewer: what changed, how it is covered, what is proven, and
what to keep an eye on. No diff-reading required.

## What this ticket delivers

A server-side fault toggle (`DEMO_FAULT`) that puts the exemplar `/api/receipt`
boundary into a deliberate `broken` or `stalled` state, so the **identical**
`npm run ops:check` command (built in T-002-01-03) can be *seen* catching failure:
naming the offender and failing within budget instead of spinning — and passing clean
when the toggle is unset. This closes the P2 loop: failure is now observable on demand.

The design's thesis is that this needed **no new detection code**. The `broken` and
`stalled` modes were engineered to land on failure paths `runBoundaryCheck` and
`runOperation` already own (`operation` and `timeout`). The ticket only added a way for
the *server* to enter those states, plus the tests and docs to prove it.

## Files changed

| File | Change | Why |
|---|---|---|
| `src/lib/fault.ts` | **created** (pure) | `FaultMode`, `FAULT_ENV`, `parseFaultMode` (tolerant/fail-safe), `corruptSignature` (deterministic hex flip). No env/I/O/throw. |
| `src/pages/api/receipt.ts` | **modified** (edge) | Reads `env.DEMO_FAULT`; `stalled` → abort-aware hanging `Promise<Response>`; `broken` → serves `corruptSignature(receipt)`. Key-validation stays first; healthy path unchanged. |
| `src/env.d.ts` | **modified** | `DEMO_FAULT?: string` on runtime `Env` so the route reads a typed value. |
| `test/fault.test.mjs` | **created** | Parse table, corrupt-signature properties, and a compose test proving broken-server → `operation` failure naming `receipt`. |
| `package.json` | **modified** | Added the new suite to the `test` script. |
| `.dev.vars.example` | **modified** | Documents the toggle (commented; healthy stays default). |

No file deleted. **Untouched:** `operation-runner.ts`, `ops-check.ts`, `receipt.ts`
logic, `scripts/ops-check.ts`, the page, deploy/build config, the Playwright flow.

## Test coverage

**Automated (committed, CI, `npm test` → 17 pass / 0 fail, ~170 ms, no server):**

- `parseFaultMode` — unset/empty/whitespace/unknown → `off`; `broken`/`stalled`
  recognized case- and space-insensitively. Guards the fail-safe default.
- `corruptSignature` — output differs, same-length lower hex, other fields intact,
  `verifyReceipt(KEY, original)===true` vs `(KEY, corrupted)===false`; plus flip is its
  own inverse (determinism).
- **Compose** — a `corruptSignature(makeReceipt(KEY))` body through `runBoundaryCheck`
  (stub `fetch`, key held) → failed, `kind: 'operation'`, `operationName: 'receipt'`,
  message `/signature/i`. This is the broken-server → exit-1 contract proven at the
  seam without a server.
- `stalled`'s timeout path is already covered at the ops-check seam (existing
  `new Promise(() => {})` test) and in the runner suite, so it is not re-stubbed.

**Type/build gate:** `npx astro build` succeeds; client build transformed 1 module →
`fault.ts` does not enter the client bundle.

**Live (recorded in `progress.md`) — the literal acceptance criteria:**

| Mode | Result | Exit |
|---|---|---|
| unset | `✓ receipt — passed in 50.5 ms`, signature verified | 0 |
| `broken` | `✗ receipt — failed … [operation]`, "signature did not verify" | 1 |
| `stalled` | `✗ receipt — failed in 1506.3 ms [timeout]` (budget 1500) | 1 |

`stalled` failing at **1506 ms** against a **1500 ms** budget is the crux: it fails
*at* the budget, not after — the runner's deadline, not a spin.

### Coverage gaps (assessed)

- **No automated test drives the live HTTP route in the three modes.** By repo
  convention (T-002-01-03) route wiring is confirmed by a recorded manual
  `ops:check` run, not in CI; the seam-level compose test is the committed guard.
  Acceptable, but a future integration harness (e.g. a Playwright/route-boot check)
  could automate the `broken`/`stalled` server states.
- **No test asserts the `stalled` route's abort cleanup** (the `499` on
  `request.signal` abort). It is hygiene, not correctness (see concerns), and hard to
  unit-test without a running adapter.

## Open concerns / things to know

1. **Keyless `broken` passes — by design, documented.** `broken` is a signature-level
   fault; detecting it requires the check to hold the out-of-band key. The demo default
   holds it via `.dev.vars`; a deliberately keyless environment cannot detect a
   signature tamper (ops-check Decision 4: "no key → pass, marked unverified"). This is
   the honest limit of what a probe without the secret can know, not a regression. If a
   future ticket needs a key-independent break, a `500`/blank-signature variant is a
   drop-in (weighed and rejected in `design.md` Decision 2).

2. **Dev env channel is `.dev.vars`, not `CLOUDFLARE_INCLUDE_PROCESS_ENV`.** Under
   `astro dev` + platformProxy, the process-env flag did **not** surface `DEMO_FAULT`
   (see `progress.md` DEVIATION). Set the toggle in `.dev.vars` locally (documented in
   `.dev.vars.example`); in production it is a normal Worker var. The
   `CLOUDFLARE_INCLUDE_PROCESS_ENV` mention in `plan.md`/`structure.md` is superseded.

3. **`stalled` abort cleanup depends on the adapter propagating client disconnect to
   `request.signal`.** If it does not fire, the request handler stays hung until
   process exit — a resource nit, **not** a correctness issue: the AC holds regardless
   because the *client's* runner aborts the fetch at the budget. Worth a glance if a
   future load test shows lingering dev-server handlers.

4. **The throwaway `499` response** exists only to let Astro finish a stalled request
   cleanly after the client aborts; nothing ever reads it. Intentional.

5. **Relationship to the Playwright `stalled` project** (S-002-02): that stalls the
   *browser* (`page.route(… () => {})`); this stalls the *server*. Complementary
   fault-injection for two observers, sharing the `stalled` vocabulary. No overlap or
   conflict; the browser flow was intentionally not touched.

## Verdict

All three acceptance criteria are met and verified live; the automated suite guards the
logic and the broken-server contract; the build stays clean and server-only. The one
behavioral caveat (keyless `broken`) and the one operational note (dev env channel) are
documented. Ready for review; no code changes outstanding.
