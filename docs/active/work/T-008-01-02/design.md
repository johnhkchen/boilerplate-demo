# Design — T-008-01-02 entry store completion and delete

## Decision summary

Evolve `listEntries` into the canonical persisted-entry read: select `id` and
`completed_at` alongside the existing content columns, map the full row to
`BackstageEntry`, and retain `ORDER BY id ASC`. Add parameterized
`setEntryCompletion(db, id, completedAt)` and `deleteEntry(db, id)` operations.
Both mutations return a boolean derived from affected-row metadata so later HTTP code can
distinguish an unknown handle without a race-prone preliminary read. Preserve the current
four-field feed contract with an explicit projection in the retrieval module until its dedicated
follow-up ticket. Update all SQLite store consumers to apply migrations `0001` and `0002`.

## Decision drivers

1. The store must expose the complete settled persisted contract.
2. Identity must remain stable across reads and state changes.
3. Completion must set and clear exactly one addressed row.
4. Delete must remove exactly one addressed row.
5. Oldest-first ordering must remain deterministic.
6. SQL must remain parameterized.
7. The pure store must not own wall-clock policy.
8. The next management route needs to distinguish missing ids.
9. Existing feed publication belongs to a separate ticket.
10. Full repository tests must stay coherent through the staged rollout.

## Read projection options

### Option A — explicitly select and map all six persisted fields

SQL shape:

```sql
SELECT id, type, url, text, submitted_at, completed_at
FROM backstage_entries
ORDER BY id ASC
```

Mapping shape:

```ts
{
  id: row.id,
  type: row.type,
  url: row.url,
  text: row.text,
  submittedAt: row.submitted_at,
  completedAt: row.completed_at,
}
```

Advantages:

- Makes the physical/public boundary explicit.
- Matches the settled `BackstageEntry` contract exactly.
- Preserves existing camel-case mapping conventions.
- Prevents future schema additions from leaking automatically.
- Retains the existing ordering expression.

Costs:

- The projection must be deliberately updated when public persisted fields change.

Assessment: chosen. Explicitness is already the repository's store pattern and is useful at a
public data boundary.

### Option B — use `SELECT *` and map the row

Advantages:

- Less SQL text.
- Automatically fetches new columns.

Costs:

- Couples reads to every physical schema addition.
- Makes accidental publication easier.
- Still requires an explicit mapper for snake-case names.
- Fetches private columns if the schema later gains any.

Assessment: rejected. The small reduction in SQL is not worth implicit protocol growth.

### Option C — leave `listEntries` four-field and add a management-only list

Advantages:

- Existing route and feed consumers would not change.
- Separates old and new projections.

Costs:

- Contradicts the ticket's direct requirement for `listEntries`.
- Creates two notions of an entry at the store boundary.
- Duplicates ordering and mapping logic.
- Makes later consumers choose between unnecessarily overlapping reads.

Assessment: rejected. The story explicitly makes the six-field shape canonical in the store.

## Completion input options

### Option A — accept `string | null`

Signature:

```ts
setEntryCompletion(
  db: EntryStoreDatabase,
  id: number,
  completedAt: string | null,
): Promise<boolean>
```

Advantages:

- Mirrors `BackstageEntry['completedAt']` exactly.
- Supports set and clear with one operation.
- Keeps time generation outside the pure persistence module.
- Allows deterministic tests with fixed timestamps.
- Avoids hidden clock dependencies.

Costs:

- Trusted callers can supply a malformed timestamp string.
- A call with null is semantically a clear rather than a set.

Assessment: chosen. Runtime validation and timestamp generation belong to the later management
boundary, while this typed internal boundary should persist the settled state representation.

### Option B — accept a boolean and generate a timestamp internally

Advantages:

- Direct checkbox-oriented API.
- Callers do not supply time.

Costs:

- Introduces ambient clock access into a pure store.
- Makes tests time-sensitive or requires another injected dependency.
- Loses control over the exact current-state timestamp.
- Does not match the stored/public field representation.

Assessment: rejected. Clock policy does not belong in this module.

### Option C — separate `completeEntry` and `reopenEntry`

Advantages:

- Operation names are domain-specific.
- Each call has one direction.

Costs:

- Duplicates nearly identical SQL.
- `completeEntry` still needs timestamp policy.
- The ticket explicitly names `setEntryCompletion`.

Assessment: rejected. One typed setter is smaller and matches acceptance language.

## Mutation return options

### Option A — return whether exactly one row changed

Both mutations return `Promise<boolean>`.

Advantages:

- Gives the later route enough information for a distinct unknown-id response.
- Avoids a separate existence query.
- Avoids a read-then-write race.
- Keeps D1-specific result shape inside the store.
- Tests can assert successful and missing-handle behavior.

Costs:

- The narrow `run()` result type must describe affected-row metadata.
- Node SQLite and D1 place `changes` at different paths.
- Re-setting a column to its existing value depends on engine change-count semantics.

Assessment: chosen. Normalize Node's top-level `changes` and D1's `meta.changes`. SQLite reports a
matched update as changed for this ordinary update path, and primary-key predicates cap the result
at one row.

### Option B — return void

Advantages:

- Matches current `saveEntry` style.
- Requires no result metadata contract.

Costs:

- Cannot distinguish success from an unknown id.
- Forces later callers to issue another query.
- Makes mutation acceptance weaker.

Assessment: rejected. It defers a known requirement and encourages race-prone composition.

### Option C — return raw D1 mutation metadata

Advantages:

- Preserves all database information.

Costs:

- Leaks provider-specific structure from the pure store.
- Makes Node test adapters part of the public API.
- Gives callers much more than the domain needs.

Assessment: rejected. A boolean is the stable domain result.

## Run-result normalization

The local installed Cloudflare types define `D1PreparedStatement.run()` as returning a result with
`meta.changes: number`. Node's `DatabaseSync` statement returns `changes` at the top level. The
narrow store interface will model only those optional paths:

```ts
export interface EntryStoreRunResult {
  changes?: number;
  meta?: { changes?: number };
}
```

The statement `run()` returns `Promise<EntryStoreRunResult>`. Real D1 remains structurally
assignable because its richer result contains `meta.changes`. The Node adapter remains assignable
because it returns top-level `changes`. A private helper reads `meta.changes` first and then
top-level `changes`. Missing metadata produces `false`, which is conservative for callers.

## Mutation SQL design

Completion:

```sql
UPDATE backstage_entries SET completed_at = ? WHERE id = ?
```

Delete:

```sql
DELETE FROM backstage_entries WHERE id = ?
```

Both use positional binding. Completion binds state first and id second, matching placeholder
order. Delete binds only id. Neither interpolates values. The primary key makes both predicates
unique. No transaction is needed for a single SQL statement.

## Feed compatibility options

### Option A — explicitly project persisted entries back to the current feed shape

Advantages:

- Honors the staged ticket boundary.
- Keeps existing feed tests and schema version accurate.
- Makes the temporary difference between store and feed visible in code.
- The next feed ticket has one clear projection to remove.

Costs:

- Adds a temporary mapping pass.
- Slightly weakens the old “verbatim list output” comment until the follow-up lands.

Assessment: chosen. `T-008-02-01` explicitly owns publication, and it depends on this ticket.

### Option B — allow the feed to expose new fields immediately

Advantages:

- No temporary adapter.
- Feed and store are already identical.

Costs:

- Implements part of the dependent ticket early.
- Breaks tests explicitly pinning the current protocol.
- Makes that ticket's acceptance partially pre-completed without its mutation scenarios.

Assessment: rejected. The ticket graph deliberately stages the boundary change.

## POST compatibility

The submit route continues returning the four fields known before persistence. Changing
`saveEntry` to return a row is not required. Route tests that inspect the database will assert that
the persisted row contains the response fields plus `id` and `completedAt: null`. The runtime POST
protocol remains untouched.

## Test design

- Apply `0001` then `0002` in the store fixture.
- Return raw `run()` metadata from the Node adapter.
- Replace four-field exact reads with helpers that add expected ids and null completion.
- Prove ids are stable across repeated lists.
- Prove first saved row starts incomplete.
- Set a fixed completion timestamp and verify only the selected row changes.
- Clear with null and verify only that row changes back.
- Delete a middle row and verify both siblings remain byte-for-byte intact.
- Assert missing-id mutations return false and do not alter the store.
- Preserve tests for hard content, duplicate content, ordering, empty lists, and invalid type.
- Update route and retrieval SQLite fixtures to apply both migrations.
- Keep retrieval output at four fields with explicit assertions.
- Run the focused store test, full `npm test`, and `npm run typecheck`.

## Rejected scope

- No HTTP management route.
- No passcode handling for mutations.
- No id parser or timestamp validator.
- No dashboard behavior.
- No soft deletion.
- No audit log.
- No completion history.
- No remote D1 migration application.
- No ticket frontmatter edits.
