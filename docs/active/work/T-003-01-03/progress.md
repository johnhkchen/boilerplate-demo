# Progress — T-003-01-03 entry-persistence-module

Execution ledger for the Implement phase. Follows `plan.md`. No ticket phase/status
fields were edited; commits stage explicit paths only.

## Baseline captured before any change

- `npm test` → **52/52 pass**.
- `npx tsc --noEmit` → 2 pre-existing errors in `src/lib/passcode.ts`
  (T-003-01-02 `GateDecision` narrowing). Out of scope; recorded so new errors are
  distinguishable.
- Confirmed `D1Database` does not resolve (`TS2552`) → binding typed structurally.
- Confirmed `node:sqlite` available on Node v26.5.0 and byte-exact.

## Step 1 — module (done)

Created `src/lib/backstage-store.ts`: `saveEntry`, `listEntries`, structural
`EntryStoreDatabase`/`EntryStoreStatement`, private `EntryRow`/SQL constants/`rowToEntry`.
Insert names the four public columns; list is `SELECT ... ORDER BY id ASC`; mapping and
drop-`id` centralized in `rowToEntry`.

Evidence: isolated compile clean —
`npx tsc --noEmit --skipLibCheck --module esnext --target es2022 --moduleResolution
bundler src/lib/backstage-store.ts` → **MODULE TSC CLEAN**.

## Step 2 — test + wiring (done)

Created `test/backstage-store.test.mjs`: a `node:sqlite`-backed store built from the
**committed** migration, with 8 tests (single round-trip, insertion order, hard-content
byte fidelity, both types, equal-timestamp/duplicate, empty store, no-leak of
`id`/`submitted_at`, out-of-contract type rejected + nothing written). Appended the file
to the `package.json` `test` script.

Evidence: `npm test` → **60/60 pass** (52 + 8). All 8 new tests shown green; no failures.

## Step 3 — runtime binding (done)

Added `BACKSTAGE_DB: import('./lib/backstage-store.ts').EntryStoreDatabase;` to
`src/env.d.ts` with an explanatory comment — completes T-003-01-01's deferred handoff
item, typed structurally.

Evidence:
- `npx tsc --noEmit` → still exactly the 2 pre-existing `passcode.ts` errors, **no new
  errors** (the structural import resolves).
- `npm run build` → Astro build **Complete!** (binding type is dev-time only).

## Deviations from plan / handoff

- **Binding type.** T-003-01-01's handoff literally said `BACKSTAGE_DB: D1Database`.
  Implemented as the structural `EntryStoreDatabase` instead, because `D1Database` does
  not resolve without `@cloudflare/workers-types` and would add a new tsc error.
  Rationale in `design.md` (Decision 2). Real D1 remains structurally assignable.
- No other deviations.

## Commits (explicit-path staging)

1. module — `src/lib/backstage-store.ts`
2. test + wiring — `test/backstage-store.test.mjs`, `package.json`
3. binding — `src/env.d.ts`
4. RDSPI artifacts — `docs/active/work/T-003-01-03/*`

(Exact hashes appended as commits land; artifacts committed separately from code.)
