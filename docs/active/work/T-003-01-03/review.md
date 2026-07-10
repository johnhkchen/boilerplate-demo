# Review — T-003-01-03 entry-persistence-module

Handoff document. What changed, how well it is tested, and what remains.

## Outcome

The acceptance criterion is met. A backstage entry can be written through the module
and read back, and a test asserts every field round-trips **byte-for-byte** against a
real SQLite store (the engine D1 runs on) built from the committed migration. The data
layer is pure and framework-free, takes the D1 handle as an argument, and maps the
physical schema to the public contract in one place. No ticket phase/status field was
changed; no remote resource was created or accessed.

## Acceptance mapping

| Acceptance clause | Implementation | Evidence |
|---|---|---|
| Tests write an entry through the module | `saveEntry(store, entry)` in every round-trip test | `test/backstage-store.test.mjs` |
| …and read it back | `listEntries(store)` returns the saved entries | same |
| every field round-trips byte-for-byte | `assert.deepStrictEqual` on full entries incl. Unicode/newline/quote/query-string content | tests 1 & 3 |
| against the store | store is real SQLite (`node:sqlite`) created from the committed `0001_create_backstage_entries.sql` | `createEntryStore()` reads the real migration file |

`npm test` → **60/60 pass** (baseline 52 + 8 new). `npx tsc --noEmit` shows only the
two pre-existing `passcode.ts` errors (no new errors). `npm run build` completes.

## Files created

| File | Purpose |
|---|---|
| `src/lib/backstage-store.ts` | Pure `saveEntry`/`listEntries` over the D1 binding; structural D1 types; snake→camel mapping |
| `test/backstage-store.test.mjs` | 8 round-trip tests against a `node:sqlite` store built from the committed migration |
| `docs/active/work/T-003-01-03/{research,design,structure,plan,progress,review}.md` | RDSPI artifacts |

## Files modified

| File | Change |
|---|---|
| `src/env.d.ts` | Declared `BACKSTAGE_DB` binding, typed structurally as `EntryStoreDatabase` |
| `package.json` | Registered `test/backstage-store.test.mjs` in the `test` script |

No file deleted. `backstage-entry.ts`, the migration, and `wrangler.jsonc` were consumed
read-only. `passcode.ts` was intentionally not touched (its errors are another ticket's).

## Public contract added

```ts
saveEntry(db: EntryStoreDatabase, entry: BackstageEntry): Promise<void>
listEntries(db: EntryStoreDatabase): Promise<BackstageEntry[]>   // insertion order, id ASC
```

Design highlights (full rationale in `design.md`):

- **Pure, dependency-injected.** No env read, no Astro/Workers import, no `Response`.
  The HTTP edge passes `Astro.locals.runtime.env.BACKSTAGE_DB` in — same shape as
  `receipt.ts`/`passcode.ts`.
- **One mapping site.** `rowToEntry` is the only place `submitted_at`→`submittedAt`
  and the drop-`id` rule live, so neither can drift; it builds a fresh object with
  exactly the four contract fields.
- **Explicit columns.** Insert and select both name the four public columns — `SELECT *`
  is avoided so the private `id` cannot leak and column identity is pinned.
- **Documented deterministic order.** `ORDER BY id ASC` (oldest first) is stable even
  when `submitted_at` ties. Presentation order is left to the retrieval seam.
- **Trust boundary respected.** Payload validation belongs to T-003-02-01; the module
  trusts a typed `BackstageEntry` and lets the migration's `CHECK` be the engine
  backstop, surfaced as a rejected write (test 8).

## Test coverage

Eight tests, all green:

1. Single entry round-trips byte-for-byte (`deepStrictEqual` on the whole object).
2. Multiple entries returned in insertion order.
3. Hard content — newlines, Unicode (`café ☺ 😀` + combining mark), quotes, and a
   percent-encoded query string — survives exactly.
4. Both `reference` and `feedback` keep their discriminator.
5. Equal timestamps + duplicate url/text are all kept, ordered by insertion.
6. Empty store lists as `[]`.
7. Returned entries expose exactly `type,url,text,submittedAt` — no `id`, no
   `submitted_at`.
8. Out-of-contract `type` is rejected by the store and nothing is written.

**Why this store is trustworthy:** `node:sqlite` is real SQLite — the same engine D1
runs on — so it enforces `NOT NULL`/`CHECK` and preserves bytes exactly, and the schema
under test is the *committed* migration, not a copy. The claim "byte-for-byte against
the store" is therefore literal, while the suite stays in-process, hermetic, and fast
like the rest of the repo.

### Coverage gaps (intentional)

- **No real-D1/Miniflare integration test.** Evaluated (`getPlatformProxy`, design
  Option B) and set aside: it breaks the repo's hermetic-unit-test idiom, needs
  `dispose()`, pollutes `.wrangler/state`, and adds no fidelity over SQLite. A future
  smoke test could run the same round-trip through `getPlatformProxy` if desired.
- **No route/HTTP test.** Owned by T-003-02-01, which will compose this module behind
  the passcode gate.
- **No payload validation.** Owned by T-003-02-01; deliberately out of scope here.

## Open concerns

### Structural binding type vs. `D1Database` — noted deviation

The T-003-01-01 handoff literally suggested `BACKSTAGE_DB: D1Database`. `D1Database` is
**not resolvable** in this repo (`@cloudflare/workers-types` is not installed;
`tsc` reports `TS2552`), so the binding is typed as the module's minimal
`EntryStoreDatabase` instead. Real D1 is structurally assignable, so production code
passes the binding with no cast. If a later route needs D1 methods beyond
`prepare/bind/run/all` (`batch`, `first`, `meta`), either widen `EntryStoreDatabase` or
add `@cloudflare/workers-types` at that point. This is a deliberate, documented choice,
not an oversight.

### Pre-existing branch typecheck error — human attention (unchanged)

`npx tsc --noEmit` still exits non-zero solely on the two `src/lib/passcode.ts`
`GateDecision` errors from T-003-01-02. Unrelated to this ticket and untouched by it;
flagged so the branch is not mistaken for type-clean. This ticket's module compiles
independently and adds no new errors.

### Remote D1 lifecycle (unchanged from T-003-01-01)

No remote database was provisioned and no remote migration applied. The operator must
run the authenticated first deploy + `wrangler d1 migrations apply` before live routes
read/write the table. This module works against whatever D1 handle it is given.

## Downstream handoff

T-003-02-01 (submit route) and T-003-03-01 (retrieve seam) can now:

1. read `Astro.locals.runtime.env.BACKSTAGE_DB` (typed) at the edge;
2. `await saveEntry(env.BACKSTAGE_DB, entry)` after passcode gate + payload validation;
3. `await listEntries(env.BACKSTAGE_DB)` for retrieval, reversing to newest-first if the
   view wants it (canonical order here is oldest-first);
4. rely on `CHECK` as the last-line `type` guard but still validate untrusted input
   before calling `saveEntry`.

## Security and sovereignty

- No secret is accepted, stored, or logged by this change; the module holds no
  credential and reads no env.
- Binding stays name-only — no account ID, database UUID, or token added; the template
  remains sovereign and transferable (P6).
- `id` is storage-private and never returned; only the four public fields leave the
  module.
- All verification ran against local in-memory SQLite; no remote data was touched.

## Final assessment

Complete and committed in three code commits (module; test+wiring; binding) plus the
artifacts. The persistence layer satisfies its byte-for-byte round-trip criterion with
a truthful real-engine test, stays within its scope (no validation, no HTTP, no UI), and
respects the sovereignty and purity constraints of the template. The only cross-branch
concern is the unrelated, pre-existing `passcode.ts` typecheck error.
