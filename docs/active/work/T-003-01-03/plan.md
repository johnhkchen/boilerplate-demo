# Plan — T-003-01-03 entry-persistence-module

Ordered, independently verifiable steps. Each step is small enough to commit atomically.
Commit discipline mirrors T-003-01-01: explicit-path staging, no phase/status edits, no
whitespace errors.

## Step 1 — Persistence module `src/lib/backstage-store.ts`

Write the module per `structure.md`: doc comment, type-only import of `BackstageEntry`
/`BackstageEntryType`, structural `EntryStoreStatement`/`EntryStoreDatabase`, private
`EntryRow`, `INSERT_ENTRY_SQL`/`LIST_ENTRIES_SQL` (explicit columns, `ORDER BY id ASC`),
`saveEntry`, `listEntries`, private `rowToEntry`.

Verify:
- `npx tsc --noEmit --skipLibCheck --module esnext --target es2022 --moduleResolution
  bundler src/lib/backstage-store.ts` → clean (isolated compile, like T-003-01-01 did
  for `backstage-entry.ts`).

Commit: `feat: add backstage entry persistence module (T-003-01-03)` — path
`src/lib/backstage-store.ts` only.

## Step 2 — Round-trip test `test/backstage-store.test.mjs` + wire into `npm test`

Write the `node:sqlite`-backed test-store helper (executes the committed migration) and
the assertions below, then append the file to the `test` script list in `package.json`.

Testing strategy — what each test proves:

1. **Single entry round-trips byte-for-byte.** Save one `reference` entry; `listEntries`
   returns exactly `[entry]` via `assert.deepStrictEqual`. Proves every field survives
   and the object shape matches the contract exactly (extra/missing keys fail deepStrict).
2. **Insertion order preserved.** Save three entries; assert the returned array equals
   them in save order (`id ASC`).
3. **Byte fidelity of hard content.** An entry whose `text` contains newlines, Unicode
   (`☺`, combining marks), quotes, and whose `url` carries a query string with `&`/`=`/
   `%20`; assert exact equality — no trimming, escaping, or re-encoding.
4. **Both entry types persist.** One `reference` and one `feedback`; both survive with
   the correct discriminator.
5. **Equal timestamps + duplicate url/text.** Two entries sharing `submittedAt` and
   identical `url`/`text`; both are returned, in insertion order — proves ordering does
   not depend on timestamp uniqueness and duplicates are allowed (per T-003-01-01).
6. **Empty store.** `listEntries` on a fresh store returns `[]` (not null/undefined).
7. **No private field leaks.** For a returned entry, assert `'id' in entry === false`
   and `'submitted_at' in entry === false`, and `Object.keys(entry)` is exactly
   `['type','url','text','submittedAt']`.
8. **Out-of-contract type rejected by the store.** Force a bad `type` past the TS type
   (cast) into `saveEntry`; assert it rejects (the migration's `CHECK` fires) and that
   `listEntries` still returns `[]` — nothing was written.

Verify:
- `npm test` → all suites pass, count rises from 52 to 52 + N (N = tests added).

Commit: `test: round-trip backstage entries through the D1 persistence module
(T-003-01-03)` — paths `test/backstage-store.test.mjs`, `package.json`.

## Step 3 — Declare the runtime binding in `src/env.d.ts`

Add `BACKSTAGE_DB: import('./lib/backstage-store.ts').EntryStoreDatabase;` with the
explanatory comment. This completes the deferred item from T-003-01-01's handoff, typed
structurally (see `design.md`, Decision 2).

Verify:
- `npx tsc --noEmit` → **no new errors** beyond the two pre-existing `passcode.ts`
  errors captured in the baseline. (Confirm the error list is unchanged, not empty.)
- `npm run build` → Astro build succeeds (binding type is dev-time only; no runtime
  effect).

Commit: `feat: type the BACKSTAGE_DB binding at the runtime env boundary (T-003-01-03)`
— path `src/env.d.ts` only.

## Step 4 — Progress + Review artifacts

- Update `progress.md` throughout Steps 1–3 (what's done, evidence, deviations).
- After Steps 1–3 verify green, write `review.md`: files changed, test coverage,
  acceptance mapping, open concerns, downstream handoff.

Commit artifacts separately (docs path), as T-003-01-01 did.

## Verification summary (acceptance mapping)

| Acceptance clause | How verified |
|---|---|
| Tests write an entry through the module | `saveEntry` used in every round-trip test (Step 2) |
| …and read it back | `listEntries` returns the saved entries |
| every field round-trips byte-for-byte | `deepStrictEqual` on full entries incl. Unicode/newline/query-string (tests 1,3) |
| against the store | store is real SQLite (`node:sqlite`) built from the committed migration |

## Risks / mitigations

- **`node:sqlite` is experimental** → it emits a runtime `ExperimentalWarning` but is
  fully functional on Node 26 (verified). If it were unavailable the fallback is
  `getPlatformProxy` (design Option B); not needed.
- **Structural binding type drift** → if a future route needs D1 methods beyond
  `prepare/bind/run/all`, widen `EntryStoreDatabase` or adopt `@cloudflare/workers-types`
  then. Documented in review as a known follow-up, not a defect.
- **Forgetting to register the test file** → Step 2 explicitly edits `package.json`;
  the pass-count check (52 → 52+N) catches a silently-unrun suite.
