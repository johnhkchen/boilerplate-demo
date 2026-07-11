# Structure — T-008-01-02 entry store completion and delete

## Change map

This ticket modifies four existing implementation/test files and creates the six required workflow
artifacts. It creates no migration, route, page, package, or configuration file. It deletes no
file. The existing schema and entry contract from `T-008-01-01` remain authoritative.

## Files modified

### `src/lib/backstage-store.ts`

Role: canonical framework-free persistence boundary for backstage entries.

Changes:

- Import `BackstageEntry` in addition to existing insert-ready types.
- Add a narrow exported mutation-result interface.
- Change `EntryStoreStatement.run()` from `Promise<unknown>` to the narrow result.
- Expand the private physical row interface with `id` and `completed_at`.
- Expand the list SQL projection to all six persisted columns.
- Keep `ORDER BY id ASC` unchanged.
- Change the row mapper return type to `BackstageEntry`.
- Map `id` without conversion.
- Map `completed_at` to `completedAt` without value conversion.
- Change `listEntries` to return `Promise<BackstageEntry[]>`.
- Add parameterized completion-update SQL.
- Add parameterized delete SQL.
- Add a private affected-row normalization helper.
- Export `setEntryCompletion`.
- Export `deleteEntry`.
- Update stale comments describing id/completion as omitted.

Public interfaces after the change:

```ts
export interface EntryStoreRunResult {
  changes?: number;
  meta?: { changes?: number };
}

export interface EntryStoreStatement {
  bind(...values: unknown[]): EntryStoreStatement;
  run(): Promise<EntryStoreRunResult>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface EntryStoreDatabase {
  prepare(query: string): EntryStoreStatement;
}

export async function saveEntry(
  db: EntryStoreDatabase,
  entry: NewBackstageEntry,
): Promise<void>;

export async function listEntries(
  db: EntryStoreDatabase,
): Promise<BackstageEntry[]>;

export async function setEntryCompletion(
  db: EntryStoreDatabase,
  id: number,
  completedAt: BackstageEntry['completedAt'],
): Promise<boolean>;

export async function deleteEntry(
  db: EntryStoreDatabase,
  id: number,
): Promise<boolean>;
```

Private physical row:

```ts
interface EntryRow {
  id: number;
  type: string;
  url: string;
  text: string;
  submitted_at: string;
  completed_at: string | null;
}
```

SQL constants:

```sql
INSERT INTO backstage_entries (type, url, text, submitted_at)
VALUES (?, ?, ?, ?)

SELECT id, type, url, text, submitted_at, completed_at
FROM backstage_entries
ORDER BY id ASC

UPDATE backstage_entries SET completed_at = ? WHERE id = ?

DELETE FROM backstage_entries WHERE id = ?
```

Internal organization:

1. Imports and narrow D1-shaped interfaces.
2. Physical row interface.
3. SQL constants.
4. Row mapper.
5. Mutation result helper.
6. Save operation.
7. List operation.
8. Completion operation.
9. Delete operation.

Boundaries:

- No environment access.
- No Request/Response handling.
- No passcode checks.
- No timestamp generation.
- No runtime id/timestamp validation.
- No provider-specific result object escapes.

### `src/lib/backstage-retrieval.ts`

Role: gated agent feed core whose management-shape evolution belongs to `T-008-02-01`.

Changes:

- Keep `BackstageFeed.entries` typed as `NewBackstageEntry[]`.
- Import `BackstageEntry` only if useful for a projection helper input.
- Add a private persisted-to-legacy-feed projection.
- Call `listEntries`, then project each result to four existing feed fields.
- Retain count and oldest-first order.
- Update comments so they no longer claim the store itself is four-field.
- Name the temporary compatibility boundary and follow-up owner.

Private helper shape:

```ts
function toCurrentFeedEntry(entry: BackstageEntry): NewBackstageEntry {
  return {
    type: entry.type,
    url: entry.url,
    text: entry.text,
    submittedAt: entry.submittedAt,
  };
}
```

This helper deliberately does not alter text, URL, type, or submission time. Mapping preserves list
order. It is the one removal point for `T-008-02-01`.

### `test/backstage-store.test.mjs`

Role: primary ticket acceptance suite against real SQLite and committed migrations.

Changes:

- Import `setEntryCompletion` and `deleteEntry`.
- Read both migration files separately.
- Execute them in numeric order for each in-memory database.
- Optionally close databases through `t.after` for consistent resource ownership.
- Keep the D1-shaped adapter.
- Ensure adapter `run()` returns the Node mutation result.
- Add a persisted-entry expectation helper.
- Update existing round-trip expectations to six fields.
- Pin stable numeric ids.
- Pin null default completion.
- Keep oldest-first assertions.
- Replace the obsolete id-exclusion exact-key test.
- Add set-and-clear completion coverage.
- Add sibling-isolation coverage for completion.
- Add exact-row deletion coverage.
- Add sibling preservation coverage for delete.
- Add unknown-id boolean/no-op coverage.
- Retain all legacy content fidelity and schema guard cases.

Expected persisted helper:

```js
const persisted = (id, value, completedAt = null) => ({
  id,
  ...value,
  completedAt,
});
```

Key scenarios:

1. Save one, list twice, same id and null completion.
2. Save three, ids ascend and results remain insertion ordered.
3. Set middle row to a fixed timestamp, siblings unchanged.
4. Clear middle row to null, siblings unchanged.
5. Delete middle row, first and third rows remain with original ids/state.
6. Update/delete missing id returns false and changes nothing.

### `test/backstage-route.test.mjs`

Role: regression suite for the existing submit HTTP core.

Changes:

- Read migrations `0001` and `0002`.
- Execute both for each SQLite fixture.
- Keep the route request/response contract unchanged.
- Adjust successful persisted-read assertions for database-owned fields.
- Assert response fields are preserved inside the persisted row.
- Assert persisted completion defaults to null.
- Assert persisted id is numeric/stable where useful.
- Leave failure and gating behavior unchanged.

The route source itself is not modified. The test update reflects the intentional difference
between the four-field accepted response and six-field persisted read.

### `test/backstage-retrieval.test.mjs`

Role: regression suite for the current four-field gated feed.

Changes:

- Read migrations `0001` and `0002`.
- Execute both for each SQLite fixture.
- Keep current expected feed payloads unchanged.
- Keep the exact four-key assertion.
- Keep the id-absence assertion until `T-008-02-01`.
- Optionally add completion-absence assertion for clarity.
- Preserve all gate-order and content-fidelity checks.

The fixture change is required because the underlying canonical store list now selects
`completed_at`; the feed assertions confirm the compatibility projection works.

## Files created

### `docs/active/work/T-008-01-02/research.md`

Maps ticket scope, settled schema/contracts, current store/test behavior, consumers, constraints,
and repository state without prescribing implementation.

### `docs/active/work/T-008-01-02/design.md`

Evaluates list, completion, return-value, and staged-feed options and records the chosen design.

### `docs/active/work/T-008-01-02/structure.md`

Defines this file-level blueprint, interfaces, module boundaries, and change ordering.

### `docs/active/work/T-008-01-02/plan.md`

Sequences atomic implementation, focused verification, regression updates, full verification, and
commits.

### `docs/active/work/T-008-01-02/progress.md`

Records execution status, test evidence, commits, and deviations from the plan.

### `docs/active/work/T-008-01-02/review.md`

Provides the final change inventory, acceptance mapping, coverage assessment, and open concerns.

## Files intentionally unchanged

### Schema and contract

- `migrations/0001_create_backstage_entries.sql`
- `migrations/0002_add_backstage_entry_completion.sql`
- `src/lib/backstage-entry.ts`
- `src/lib/backstage-submission.ts`

These were settled by the dependency ticket.

### Runtime boundaries

- `src/lib/backstage-route.ts`
- `src/pages/api/backstage/entries.ts`
- `src/pages/api/backstage/feed.ts`
- `scripts/backstage-feed.ts`

The submit core remains unchanged; management/feed publication is later work.

### Project configuration

- `package.json`
- `package-lock.json`
- `wrangler.jsonc`
- generated Worker configuration types

Existing scripts already execute all modified tests.

### Lisa-owned state

- `docs/active/tickets/T-008-01-02.md`
- `docs/active/tickets/T-008-01-01.md`
- `.lisa/provenance.jsonl`

These may change concurrently but are never staged by this work.

## Dependency direction

```text
backstage-entry.ts (settled types)
        ↓
backstage-store.ts (canonical persisted rows + mutations)
        ↓
backstage-retrieval.ts (temporary four-field feed projection)
        ↓
feed route / CLI (unchanged)
```

Tests inject the database upward into these pure modules. Production continues to inject the D1
binding from edge modules. No dependency direction reverses.

## Implementation ordering

1. Update the primary store test fixture and acceptance assertions.
2. Evolve store result interface, projection, mapper, and mutation exports.
3. Run the focused store suite.
4. Add the retrieval compatibility projection.
5. Update route and retrieval test migration fixtures/assertions.
6. Run all backstage unit suites.
7. Run full unit and type gates.
8. Record progress and review.

## Verification boundaries

- Store unit tests own SQL and exact-row mutation evidence.
- Route unit tests own submit protocol non-regression.
- Retrieval unit tests own staged feed protocol non-regression.
- Typecheck owns D1 structural compatibility and consumer typing.
- No browser test is necessary for a pure-store ticket.
- No remote Cloudflare action is authorized or required.
