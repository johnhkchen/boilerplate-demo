# Structure — T-003-01-03 entry-persistence-module

The blueprint: files, interfaces, boundaries, and ordering. Not code.

## Files created

### `src/lib/backstage-store.ts` (new, the deliverable)

Pure, framework-free persistence for `BackstageEntry`. Layout, top to bottom:

1. **Module doc comment** — states the pattern (pure core, db passed in, edge owns the
   binding), the `snake_case`↔`camelCase` mapping duty, and the `id`-stays-private rule.
2. **Imports** — `import type { BackstageEntry, BackstageEntryType } from './backstage-entry.ts';`
   Type-only import (repo uses `verbatimModuleSyntax`).
3. **Structural D1 surface** (exported — also consumed by `env.d.ts`):
   ```ts
   export interface EntryStoreStatement {
     bind(...values: unknown[]): EntryStoreStatement;
     run(): Promise<unknown>;
     all<T = unknown>(): Promise<{ results: T[] }>;
   }
   export interface EntryStoreDatabase {
     prepare(query: string): EntryStoreStatement;
   }
   ```
4. **Physical row shape** (internal): `interface EntryRow { type: string; url: string;
   text: string; submitted_at: string }` — the DB's snake_case projection.
5. **SQL constants** (module-private): `INSERT_ENTRY_SQL`, `LIST_ENTRIES_SQL`. Both
   name the four public columns explicitly; `LIST` ends `ORDER BY id ASC`. The table
   name `backstage_entries` matches the committed migration.
6. **`saveEntry(db, entry)`** — `await db.prepare(INSERT_ENTRY_SQL).bind(entry.type,
   entry.url, entry.text, entry.submittedAt).run();` returns `Promise<void>`. Binds
   positionally in column order; never inserts `id`.
7. **`listEntries(db)`** — `const { results } = await
   db.prepare(LIST_ENTRIES_SQL).bind().all<EntryRow>();` then `results.map(rowToEntry)`.
8. **`rowToEntry(row)`** (module-private) — the one place the mapping lives:
   `{ type: row.type as BackstageEntryType, url: row.url, text: row.text,
   submittedAt: row.submitted_at }`. Constructs a fresh object with exactly the four
   public fields → `id` cannot leak, `submitted_at` key cannot leak.

Public API surface: `saveEntry`, `listEntries`, `EntryStoreDatabase`,
`EntryStoreStatement`. `EntryRow`, the SQL constants, and `rowToEntry` stay private.

### `test/backstage-store.test.mjs` (new)

`node:test` + `node:assert/strict`, importing `../src/lib/backstage-store.ts`.

- **Test-store helper** `createEntryStore()` — builds an `EntryStoreDatabase` backed by
  `node:sqlite` `DatabaseSync(':memory:')`:
  - Reads and executes the committed `migrations/0001_create_backstage_entries.sql`
    (resolved relative to the test file via `node:url`/`node:path`, read with
    `node:fs`) so the schema under test is the real one, not a copy.
  - `prepare(sql)` returns an object whose `bind(...vals)` captures params and returns
    a statement with `run()` (→ `stmt.run(...vals)`) and `all()` (→ `{ results:
    stmt.all(...vals) }`), matching the `EntryStoreStatement` contract. `bind()` with
    no args → empty params.
- **Tests** (see plan for assertions): single round-trip; multi-entry insertion order;
  Unicode/newline/query-string byte fidelity; both entry types; equal-timestamp +
  duplicate url/text ordering; empty store → `[]`; returned objects omit `id` and
  `submitted_at` keys; `CHECK` rejects an out-of-contract `type`.

## Files modified

### `src/env.d.ts`

Add one line inside `type Env`, with a short comment, typing the binding structurally:

```ts
// Backstage entry store (D1). Typed as the minimal surface the persistence module
// uses (src/lib/backstage-store.ts) rather than a global D1Database, which does not
// resolve without @cloudflare/workers-types. Real D1 is structurally assignable.
BACKSTAGE_DB: import('./lib/backstage-store.ts').EntryStoreDatabase;
```

No other change to the file; `DEMO_*` vars untouched.

### `package.json`

Append `test/backstage-store.test.mjs` to the `test` script's explicit file list so the
new suite runs with `npm test`. No dependency changes.

## Files NOT touched (boundary guard)

- `src/lib/backstage-entry.ts` — consumed read-only; the contract is authoritative.
- `migrations/0001_create_backstage_entries.sql` — read by the test, never edited.
- `wrangler.jsonc` — binding already declared by T-003-01-01; nothing to add.
- `src/lib/passcode.ts` — its pre-existing tsc errors are out of scope; not fixed here.
- Routes, pages, UI — later tickets.

## Interface / boundary contract

```
BackstageEntry (public, camelCase)  ──saveEntry──▶  backstage_entries row (snake_case, +id)
        ▲                                                    │
        └───────────────── listEntries (rowToEntry) ─────────┘
```

- **In:** a well-typed `BackstageEntry` (validation is upstream's job).
- **Out:** `BackstageEntry[]` in `id ASC` order; no `id`, no `submitted_at` key.
- **Dependency direction:** module → `backstage-entry.ts` only. Nothing platform-specific
  is imported; the db handle is injected. `env.d.ts` → module (for the binding type).

## Ordering of changes

1. `backstage-store.ts` (module) — nothing depends on it yet, safe to add first.
2. `backstage-store.test.mjs` + `package.json` wiring — proves the module.
3. `env.d.ts` — references the module's exported type; add after the module exists so
   the import target is real.

Each is independently reviewable; the module + test is the atomic core, the env/wiring
edits are a thin follow-on.
