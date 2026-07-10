# Plan — T-002-01-04 boundary-fault-modes

Ordered, independently-committable steps. Each ends green (tests pass) or with a
recorded live observation. Commit after each step. Deviations logged in `progress.md`.

## Step 1 — pure fault module

**Do:** create `src/lib/fault.ts` with `FaultMode`, `FAULT_ENV`, `parseFaultMode`,
`corruptSignature` (+ private `flipHexDigit`). No env, no I/O, no throw. Import only
`type Receipt`.

**Verify:** `tsc`/strip-types parse is clean (exercised by the test run in Step 2);
eyeball that `corruptSignature` touches only `signature`.

**Commit:** `Add pure fault module: parse mode + corrupt signature (T-002-01-04)`

## Step 2 — unit tests for the module + wire into `test` script

**Do:** create `test/fault.test.mjs` with the three case groups (parse table;
corrupt-signature properties incl. `verifyReceipt` true/false; compose through
`runBoundaryCheck`). Append `test/fault.test.mjs` to the `package.json` `test` script.

**Verify:** `npm test` — all suites green, new file included. This is the gate: the
fault logic and the broken→exit-1 seam contract are proven with **no server**.

**Commit:** `Cover fault module + broken→ops-check failure with a stub suite (T-002-01-04)`

## Step 3 — wire the fault into the boundary route + types

**Do:** edit `src/pages/api/receipt.ts` — add `request` to the handler args, read
`env[FAULT_ENV]`, branch `stalled` (abort-aware hanging Promise) and `broken`
(`corruptSignature`), keeping key-validation first and the healthy path last. Add
`DEMO_FAULT?: string` to `Env` in `src/env.d.ts`.

**Verify:** `npm run build` (or `deploy:dry`) type-checks and emits without error —
proves the route still compiles and `fault.ts` does not enter the client bundle
(imported only by an on-demand route + tests). `npm test` still green.

**Commit:** `Wire DEMO_FAULT broken/stalled modes into the boundary route (T-002-01-04)`

## Step 4 — document the operator toggle

**Do:** add the `# DEMO_FAULT=…` block to `.dev.vars.example` (plain-English, brand
voice). Do **not** commit a real `.dev.vars`.

**Commit:** `Document the DEMO_FAULT toggle in .dev.vars.example (T-002-01-04)`

## Step 5 — live end-to-end verification (the acceptance criteria)

Run the **identical** command — `npm run ops:check` — against a dev server in each
state. The dev server holds the signing key via `.dev.vars`, and `ops:check` re-reads
it, so signature-level detection is live.

Launch pattern (single server per mode; `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` surfaces
process env onto `locals.runtime.env`, matching `playwright.config.ts`):

```
# healthy (flag unset)
npm run dev            # in bg; then:
npm run ops:check      # expect: ✓ receipt — passed …    exit 0

# broken
CLOUDFLARE_INCLUDE_PROCESS_ENV=true DEMO_FAULT=broken npm run dev  # bg
npm run ops:check      # expect: ✗ receipt — failed … [operation]; /signature/; exit 1

# stalled  (tighten budget so the wait is short and the "at budget" point is clear)
CLOUDFLARE_INCLUDE_PROCESS_ENV=true DEMO_FAULT=stalled npm run dev # bg
OPS_CHECK_TIMEOUT_MS=1500 npm run ops:check
                       # expect: ✗ receipt — failed in ~1500 ms [timeout]; exit 1;
                       # elapsed ≈ budget (fails AT it, not after — no spinning)
```

**Record in `progress.md`:** the actual trace line + exit code for each of the three
runs, and for `stalled` the measured elapsed vs. the budget (must be ≈ budget, well
under any outer hang). Kill each dev server before the next.

**Acceptance mapping:**

| AC clause | Proven by |
|---|---|
| `broken` → non-zero, names boundary + kind | Step 2 compose test **and** Step 5 broken run (`[operation]`, `receipt`, exit 1) |
| `stalled` → fails **at** budget, names boundary | Runner timeout guarantee + Step 5 stalled run (`[timeout]`, elapsed ≈ budget, exit 1) |
| flag unset → identical command passes clean | Step 5 healthy run (`✓ receipt`, exit 0) |

## Step 6 — self-review

Write `review.md`: files changed, coverage, the live results, open concerns (keyless
`broken` caveat; relationship to the Playwright `stalled` project; the `499`
throwaway response). No code changes expected in this step.

## Testing strategy (summary)

- **Unit (committed, CI, sub-second, no server):** `test/fault.test.mjs` — parse
  table, corrupt-signature properties, and the compose test that proves a broken
  server yields an `operation`-kind ops-check failure naming the boundary. The
  `stalled` timeout is already covered at the ops-check seam (existing suite) and the
  runner suite, so it is not re-stubbed here.
- **Type/build gate:** `npm run build` / `deploy:dry` — route compiles, fault stays
  out of the client bundle.
- **Live (manual, recorded, not CI):** Step 5 — the three real `ops:check` runs that
  are the literal acceptance criteria. Live runs are the project's established way to
  confirm wiring (T-002-01-03 did the same); the suite guards regressions.

## Risks & mitigations

- **`request.signal` may not abort on client disconnect in the dev adapter.** If so,
  `stalled` still fails correctly (the *client's* runner aborts at the budget — the
  AC holds); only server-side handler cleanup is affected. Mitigation is hygiene,
  not correctness; noted if observed live.
- **Keyless `broken` would pass.** By design (ops-check Decision 4). The demo default
  holds a key; documented in Design + Review. Not fixed here.
- **Env not surfaced onto `locals.runtime.env` in dev.** Mitigated by
  `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` (proven pattern) or by adding `DEMO_FAULT` to
  `.dev.vars`. Both documented.
- **Fault accidentally left on.** Fail-safe parse (unknown/unset → `off`) plus an
  optional-and-commented `.dev.vars.example` entry keep healthy the default.
