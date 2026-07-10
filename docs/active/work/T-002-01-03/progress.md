# Progress — T-002-01-03 exemplar-boundary-ops-check

Implementation log. Follows `plan.md`. Baseline captured before any edit.

## Baseline (pre-change)

- `npm test` → **4 passing**, exit 0 (`operation-runner.test.mjs`).
- Working tree: T-001/T-002 work already on disk; `src/lib/operation-runner.ts`,
  `src/lib/receipt.ts`, `src/pages/api/receipt.ts` present. `.dev.vars` holds the
  local `DEMO_SIGNING_KEY`.
- Node `v26.4.0` — native TS type stripping available (`--experimental-strip-types`).
- Shared branch with sibling Lisa threads; stage files explicitly, commit one unit
  at a time, touch only this ticket's files.

## Planned units

1. progress log + baseline (this file)
2. `src/lib/ops-check.ts` — pure core
3. `test/ops-check.test.mjs` + widen `package.json` `test`
4. `scripts/ops-check.ts` + `ops:check` npm script
5. live verification (astro dev up / down)
6. regression (`build`, `dist/` grep) + diff hygiene

## Log

### Unit 1 — implementation log
Created this file. Ticket frontmatter untouched (Lisa owns phase transitions).

### Unit 2 — pure core `src/lib/ops-check.ts`
`runBoundaryCheck` + `formatBoundaryTrace` + private `assertReceiptShape`/`roundMs`.
Composes `runOperation({ name: BOUNDARY_NAME, … })`; fetch → ok → parse → shape →
optional `verifyReceipt` → value. Loads cleanly under `--experimental-strip-types`.

### Unit 3 — test suite + widened `test` script
`test/ops-check.test.mjs`, 8 cases (healthy / down / stalled-timeout / wrong-key /
bad-status / bad-shape / no-key / format smoke), stub `fetch` + real
`makeReceipt`-signed bodies. `npm test` → **12 passing** (4 + 8), sub-second.

### Unit 4 — CLI wrapper `scripts/ops-check.ts` + `ops:check` script
Env config (URL/budget/key) + tolerant `.dev.vars` key parser; exit 0/1/2.

### Deviation — default host corrected `127.0.0.1` → `localhost`
Live testing exposed the design's host guess as backwards for this platform.
`astro dev` binds/advertises `localhost:4321`, which resolves to IPv6 `::1` here;
`curl 127.0.0.1:4321` was *refused* while `curl localhost:4321` returned 200. A
`127.0.0.1` default would false-negative a healthy demo, breaking the AC. Changed
the default to `localhost` (the host Astro prints); Node's fetch reaches the
IPv6-bound server. `design.md` D5 note updated to the observed reality.

### Unit 5 — live verification (against `astro dev`, `.dev.vars` key present)
- **Healthy, default config:** `npm run ops:check` → exit **0**,
  `✓ receipt — passed in 39.4 ms`, `signature verified against the out-of-band key`.
- **Down, default config:** server stopped → exit **1**,
  `✗ receipt — failed in 31.7 ms  [operation]` / `fetch failed`. Names `receipt`,
  31.7 ms ≪ 2000 ms budget, **0** raw stack frames in output.
- **Misconfigured:** `OPS_CHECK_TIMEOUT_MS=0` → exit **2**,
  `ops check misconfigured: Operation time budget must be a positive finite number.`
- **Stalled/hang bound:** proven deterministically by the unit timeout case
  (budget 40 ms, outer test timeout 1000 ms → `kind: 'timeout'`).

### Unit 6 — regression + diff hygiene
- `npm test` → 12 passing. `npm run build` → green (Complete!).
- `grep -rIl "runBoundaryCheck|ops-check" dist/` → **not in dist** (script excluded
  from the client build, as intended — imported by no page).
- Diff limited to this ticket: `src/lib/ops-check.ts`, `scripts/ops-check.ts`,
  `test/ops-check.test.mjs`, `package.json`, and the work artifacts. Files staged
  explicitly; `package-lock.json` untouched.

## Status: implementation complete — all acceptance clauses verified.
