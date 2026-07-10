# Design — T-003-01-03 entry-persistence-module

Decisions, grounded in `research.md`. Three questions: (1) the module's shape and API,
(2) how the runtime binding is typed, (3) what the round-trip test runs against.

## Decision 1 — Module shape: pure functions taking the DB as an argument

**Chosen:** a pure, framework-free module `src/lib/backstage-store.ts` exporting two
async functions plus the minimal structural D1 types they consume:

```ts
export async function saveEntry(db: EntryStoreDatabase, entry: BackstageEntry): Promise<void>
export async function listEntries(db: EntryStoreDatabase): Promise<BackstageEntry[]>
```

`saveEntry` inserts exactly the four public columns; `listEntries` selects them
explicitly, ordered by `id`, and maps each row to a `BackstageEntry`.

**Why:** it matches every existing `src/lib` module (`receipt.ts`, `passcode.ts`,
`operation-runner.ts`): pure core, dependency passed in, HTTP edge owns the binding.
The submit route (T-003-02-01) will read `Astro.locals.runtime.env.BACKSTAGE_DB` and
pass it straight in — no Astro/Workers import leaks into the library, so the module
stays unit-testable with a plain in-process store.

**Rejected — a class / stateful `EntryStore` wrapping the db:** adds a construction
seam and lifecycle for zero benefit; the repo has no class-based lib module and D1
handles are already per-request. Two free functions are the smaller surface.

**Rejected — folding validation into `saveEntry`:** T-003-01-01's review assigns
malformed-payload rejection to T-003-02-01. Baking URL/emptiness checks here would
duplicate that owner and blur the boundary. The module trusts a typed `BackstageEntry`;
the DB `CHECK` on `type` remains the engine-level backstop, surfaced (not swallowed)
as a rejected write.

## Decision 2 — Type the binding structurally, not as `D1Database`

The T-003-01-01 handoff suggested `BACKSTAGE_DB: D1Database`. Research found that name
**does not resolve** — `@cloudflare/workers-types` is not installed, so verbatim
`D1Database` would add a new `TS2552` error to a branch that is meant to stay clean.

**Chosen:** define the narrow structural surface the module actually uses, in the
module, and reference it from `env.d.ts`:

```ts
// backstage-store.ts
export interface EntryStoreStatement {
  bind(...values: unknown[]): EntryStoreStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}
export interface EntryStoreDatabase {
  prepare(query: string): EntryStoreStatement;
}
```
```ts
// env.d.ts
BACKSTAGE_DB: import('./lib/backstage-store.ts').EntryStoreDatabase;
```

**Why:**
- Real `D1Database` is structurally assignable to `EntryStoreDatabase` (it has
  `prepare`; its statement has `bind`/`run`/`all` and `bind` returns the same
  statement type), so production code type-checks against the real binding with no
  cast.
- It is the same idiom the repo already uses — every `src/lib` module defines its own
  minimal types instead of importing a platform SDK (`OperationContext`, `GateDecision`).
- No new dependency, no new tsc error, and the binding is pinned to exactly the API
  the app exercises. This is a documented, deliberate deviation from the handoff's
  literal wording, made for a concrete reason.

**Rejected — add `@cloudflare/workers-types` and use `D1Database`:** pulls a large
types package into a template whose whole point (P6) is to stay lean and transferable,
solely to name a four-method surface. Revisit if/when a route needs richer D1 (`batch`,
`first`, `meta`); until then it is unjustified weight. Noted as a follow-up, not a gap.

**Rejected — `BACKSTAGE_DB: unknown` / `any`:** erases the exact safety this ticket is
supposed to establish at the persistence seam.

## Decision 3 — Round-trip test store: `node:sqlite`, seeded from the real migration

The acceptance criterion demands a real *store* that fields round-trip against, byte
for byte. Options:

| Option | Fidelity | Fit with harness | Cost |
|---|---|---|---|
| **A. `node:sqlite` double, real migration** | Real SQLite (D1's own engine); enforces `NOT NULL`/`CHECK`; exact Unicode/newline bytes | Native to `node:test`; in-process, hermetic | ~0; no deps, no teardown |
| B. `getPlatformProxy()` (Miniflare D1) | Real D1 codepath | Foreign to the harness; async `dispose()`, `.wrangler/state` pollution, manual migration apply | Heavy, slower, flakier |
| C. Hand-rolled JS object store | None — a mock that can't prove storage | Trivial | Proves nothing; a plain map can "round-trip" anything |

**Chosen: A.** A tiny `node:sqlite`-backed adapter implements the same
`EntryStoreDatabase` surface the module needs, and its schema is created by executing
the **committed** `migrations/0001_create_backstage_entries.sql` verbatim. This means
the test exercises the real column names, the real `snake_case`→`camelCase` mapping,
the real `CHECK` constraint, and real SQLite string handling — not a stand-in schema.
Research verified `node:sqlite` preserves `'héllo\n☺'` exactly and enforces
`NOT NULL`. Because SQLite *is* the engine under D1, "byte-for-byte against the store"
is a truthful claim, and the test stays in-process and fast like every other suite.

**Why not B:** authenticity gain is marginal (both are SQLite) while it breaks the
repo's hermetic-unit-test idiom, adds process/lifecycle management, and can write into
a developer's local dev state. Reserved as an optional future integration smoke, noted
in review — not needed to satisfy the criterion.

**Why not C:** a mock store can echo whatever it is handed; it would give a green test
that proves nothing about persistence, mapping, or constraints. Explicitly rejected.

The adapter lives in the test file (local to this ticket's need). If T-003-02-01 wants
a shared in-memory store for its route test, it can extract this adapter then — YAGNI
now.

## Ordering decision

`listEntries` returns **insertion order, oldest first**, via `ORDER BY id ASC`.

- Deterministic even when `submitted_at` ties (equal timestamps are allowed by the
  schema, per T-003-01-01), which the round-trip test depends on to assert exact array
  equality.
- `id` is the natural monotonic insertion key already provided by the schema; no extra
  index needed (PK is ordered).
- Presentation order (e.g. newest-first for agent retrieval) is a *view* concern owned
  by T-003-03-01; it can reverse this canonical, documented order. Keeping the data
  layer's order canonical and boring is the right default.

## What the design deliberately excludes

- No timestamp generation, ID exposure, mutation, deletion, retention, or pagination.
- No env reads, no `Response`, no Astro/Workers imports in the module.
- No runtime payload validation (T-003-02-01) beyond letting the DB `CHECK` reject an
  impossible `type`.
- No remote D1 provisioning or access.
