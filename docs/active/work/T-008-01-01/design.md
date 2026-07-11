# Design — T-008-01-01 entry id and completion schema

## Decision summary

Expose persisted backstage entries as `{ id, type, url, text, submittedAt, completedAt }`,
where `id` is a `number` and `completedAt` is `string | null`. Add
`completed_at TEXT` with no `NOT NULL` constraint in a new additive migration. Introduce a
`NewBackstageEntry` type for the four fields known before persistence, and use that type at the
submission and insert boundaries. Add one executable TypeScript contract test that applies both
committed migrations, checks the concrete six-field shape, and statically pins the exact field
types.

## Decision drivers

1. Later complete/delete operations need an unambiguous stable row handle.
2. Existing installations already have valid integer ids.
3. The ticket explicitly calls for a nullable completion column.
4. Incomplete must have one canonical representation.
5. Existing rows must migrate without a backfill.
6. Public TypeScript and physical SQL names should follow existing conventions.
7. Pre-insert code must not fabricate a database-owned id.
8. This ticket must settle shape without implementing the next store ticket early.
9. The field types must be guarded by an automated contract test.

## Identifier options

### Option A — expose the existing integer primary key

Shape:

```ts
id: number;
```

Advantages:

- Reuses a value already allocated for every row.
- Requires no migration or backfill for identity.
- Matches SQLite/D1's returned value directly.
- Already defines deterministic oldest-first ordering.
- Gives update and delete SQL a direct primary-key predicate.

Costs:

- Reveals approximate insertion order.
- JavaScript numbers do not express positive-integer constraints at compile time.
- Row ids are stable for a row but are not globally portable across database copies.

Assessment: chosen. The handle is project-local management identity, not a secret or globally
distributed identifier. The existing key exactly satisfies that need.

### Option B — stringify the existing primary key

Shape: `id: string`, mapped with `String(row.id)`.

Advantages:

- Avoids callers doing accidental arithmetic.
- Could hide future physical key changes behind a string protocol.

Costs:

- Adds conversion at every boundary.
- Stops the public value matching the store value directly.
- Does not create real opacity or global stability.
- Later routes still need strict numeric parsing for the SQL predicate.

Assessment: rejected. It adds ceremony without a concrete compatibility benefit.

### Option C — add a UUID/public-id column

Advantages:

- Globally unique and opaque.
- Does not communicate insertion order.

Costs:

- Requires a new non-null column and backfill for existing rows.
- Requires generation and uniqueness policy.
- Duplicates an existing stable address.
- Exceeds the ticket, which explicitly notes the primary key already exists.

Assessment: rejected. It solves multi-database identity that the per-project backstage does not
need.

## Completion representation options

### Option A — nullable completion timestamp

Physical/public shape:

```sql
completed_at TEXT
```

```ts
completedAt: string | null;
```

Semantics:

- `null`: incomplete;
- timestamp string: complete at that instant.

Advantages:

- Nullable storage is meaningful and binary rather than tri-state.
- Existing rows naturally become incomplete.
- Mirrors `submitted_at` / `submittedAt` conventions.
- Enables a checklist boolean with `completedAt !== null`.
- Clearing completion is a direct assignment to `NULL`.
- Carries modestly useful current-state context without adding history.

Costs:

- Later mutation code must choose the completion timestamp.
- Callers that need only a checkbox must derive a boolean.
- TypeScript cannot ensure an ISO timestamp string.

Assessment: chosen. It is the most direct interpretation of a nullable completion column and has
no ambiguous third state.

### Option B — nullable integer boolean

Physical/public shape: `completed INTEGER` and `completed: boolean | null` or boolean mapping.

Advantages:

- Direct checklist concept.
- Mutation payload and display logic are simple.

Costs:

- `NULL`, `0`, and `1` create three physical states.
- Collapsing `NULL` and `0` in mapping makes storage less canonical.
- A non-null `INTEGER NOT NULL DEFAULT 0` would be better SQL but contradicts the stated nullable
  column constraint.
- SQLite requires a `CHECK` for reliable `0`/`1` values.

Assessment: rejected. Nullability is not useful for a boolean here.

### Option C — nullable completion status string

Shape: `completion TEXT`, such as `NULL | 'complete'`.

Advantages:

- Could later grow to more workflow states.

Costs:

- The product asks only for incomplete/complete.
- Future workflow states are speculative.
- A check constraint and mapping would be needed.
- It discards when completion occurred while still using nullable text.

Assessment: rejected as framework-by-inertia.

## Persisted versus new-entry contract

### Chosen model

```ts
export interface BackstageEntry {
  id: number;
  type: BackstageEntryType;
  url: string;
  text: string;
  submittedAt: string;
  completedAt: string | null;
}

export type NewBackstageEntry = Omit<BackstageEntry, 'id' | 'completedAt'>;
```

`BackstageEntry` means a row that has crossed persistence and therefore owns all public fields.
`NewBackstageEntry` means the server-stamped value accepted by the insert boundary. Completion is
omitted from the draft because the migration supplies the canonical incomplete default; id is
omitted because the database assigns it.

### Why completion is omitted rather than fixed to null in the draft

- Insert SQL does not need to bind it.
- Omitting the column lets the migration define the physical default for old and new data.
- A pre-insert `completedAt: null` would still not make the object a persisted public entry because
  it lacks id.
- The narrow draft prevents future callers from creating already-completed rows through the submit
  path accidentally.

### Alternative — make new fields optional on `BackstageEntry`

Rejected. Optional `id?` and `completedAt?` would let list/feed consumers receive objects without
management identity or completion state, undermining the settled public contract.

### Alternative — use placeholder values

Rejected. `id: 0` is not stable identity, and returning it before persistence would be misleading.
Fabricated placeholders make structural typing pass while violating the domain contract.

### Alternative — broaden `saveEntry` only with an inline `Omit`

Viable but rejected in favor of an exported name. Both submission conversion and persistence use
the pre-insert shape; naming it keeps their shared boundary clear and avoids repeated type
expressions.

## Migration design

Create `migrations/0002_add_backstage_entry_completion.sql`:

```sql
ALTER TABLE backstage_entries ADD COLUMN completed_at TEXT;
```

- The filename is ordered after `0001` and describes the single schema change.
- `0001` remains untouched.
- No `NOT NULL` means SQLite reports the column as nullable.
- No explicit default means existing rows and new inserts that omit the column receive `NULL`.
- No backfill is needed.
- No index is added because this slice does not filter by completion.
- No check is needed because text timestamp validation belongs to the setter introduced next.
- The migration contains no transaction wrapper; it is one atomic SQLite schema statement.

## Supporting source changes

- `backstage-entry.ts` gains the two required public fields and `NewBackstageEntry`.
- `backstage-submission.ts` returns `NewBackstageEntry` from `toBackstageEntry`.
- `backstage-store.ts` accepts `NewBackstageEntry` in `saveEntry`.
- Current insert SQL stays unchanged and naturally creates incomplete rows.
- Current list mapping is intentionally not expanded in this ticket.
- That means `listEntries` cannot truthfully retain its `BackstageEntry[]` return type until the
  next ticket changes its projection.

## Temporary boundary for listEntries

The cleanest sequencing is to define an internal/exported transitional result type for current
list behavior only if required. A better option is to advance the minimal read mapping needed to
keep the public contract truthful: select and map `id` plus `completed_at`. However, that is the
central acceptance of dependent ticket `T-008-01-02`, so doing it here would steal its scope and
invalidate its existing tests unexpectedly.

Decision: type the legacy list result as `NewBackstageEntry[]` for this ticket and leave its SQL
behavior unchanged. The dependent store ticket will replace that temporary return type with
`BackstageEntry[]` when it adds the settled columns and mutations. Existing E-003 callers still
receive exactly the same runtime shape during this one-ticket boundary.

## Contract test design

Add `test/backstage-entry-contract.test.ts` and include it in `npm test`.

Compile-time assertions:

- `BackstageEntry['id']` is exactly `number`.
- `BackstageEntry['completedAt']` is exactly `string | null`.
- `BackstageEntry` has exactly the six expected keys.
- `NewBackstageEntry` has exactly the four pre-persistence keys.

Runtime assertions:

- A concrete object satisfying `BackstageEntry` exposes all six public keys.
- `id` is a number.
- `completedAt` accepts `null` and a string fixture.
- Applying `0001` then `0002` succeeds in SQLite.
- `PRAGMA table_info` shows `completed_at` with `TEXT` type and nullable metadata.
- Existing ids remain allocated and stable across the schema migration.

The runtime fixture complements, but does not replace, compile-time exactness. The migration check
keeps the public decision tied to executable storage rather than only documentation.

## Compatibility and scope boundaries

- No store completion/update/delete functions are added.
- No feed contract is changed.
- No route path or request payload is changed.
- No dashboard work is included.
- The current POST response remains the accepted draft shape; exposing its generated id can be
  addressed when persistence returns it, but is not required for this schema ticket.
- Existing migrations are never rewritten.
- Applying `0002` remotely remains an operator/deploy action outside this local implementation.

## Verification gates

1. Run the new contract test directly.
2. Run full `npm test` after adding it to the explicit test script.
3. Run `npm run typecheck`.
4. Inspect the diff to ensure ticket frontmatter is unstaged and unchanged by this work.
5. Verify `0001` has no diff.
6. Record exact results and limitations in `progress.md` and `review.md`.
