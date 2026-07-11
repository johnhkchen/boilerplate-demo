# Research — T-008-01-02 entry store completion and delete

## Ticket state and scope

- Ticket `T-008-01-02` starts in `research`.
- It is the second and final ticket in story `S-008-01`.
- It depends on completed ticket `T-008-01-01`.
- The dependency settled the schema and portable persisted-entry contract.
- This ticket owns the pure store projection and mutations.
- Acceptance is exercised in `test/backstage-store.test.mjs`.
- `listEntries` must return stable ids and completion state.
- New rows must read as uncompleted.
- Results must remain oldest-first.
- `setEntryCompletion(id, ...)` must affect exactly the addressed row.
- It must support setting and clearing completion.
- `deleteEntry(id)` must remove exactly the addressed row.
- Sibling rows must remain unchanged by either operation.
- Ticket phase and status are Lisa-owned and must not be edited.

## Settled schema from the dependency

- `migrations/0001_create_backstage_entries.sql` creates the table.
- Its columns are `id`, `type`, `url`, `text`, and `submitted_at`.
- `id` is `INTEGER PRIMARY KEY`.
- SQLite allocates it when inserts omit the column.
- The key is already used for deterministic read ordering.
- `migrations/0002_add_backstage_entry_completion.sql` is additive.
- It adds `completed_at TEXT`.
- It supplies no explicit default.
- The column is nullable.
- Existing rows therefore receive `NULL` completion.
- New inserts that omit the column also receive `NULL`.
- The committed migration is one SQL statement.
- Application code does not run migrations itself.
- Tests execute committed migration text in in-memory SQLite.

## Settled public contracts

- `src/lib/backstage-entry.ts` owns the portable types.
- `BackstageEntry` is the complete persisted shape.
- It contains `id: number`.
- It contains `type: 'reference' | 'feedback'`.
- It contains `url: string`.
- It contains `text: string`.
- It contains `submittedAt: string`.
- It contains `completedAt: string | null`.
- Null is the single incomplete state.
- A string is the current completion timestamp.
- `NewBackstageEntry` omits `id` and `completedAt`.
- Submission and insert paths use `NewBackstageEntry`.
- This ticket does not need to change those settled types.

## Current store boundary

- `src/lib/backstage-store.ts` is framework-free.
- It imports no Astro or Cloudflare runtime module.
- Every operation receives a database dependency explicitly.
- `EntryStoreDatabase` exposes only `prepare(query)`.
- `EntryStoreStatement` exposes `bind`, `run`, and `all`.
- Real D1 is structurally assignable to that narrow interface.
- In-process test adapters implement the same interface.
- The interface already supports update and delete through `run()`.
- No new database abstraction method is required.
- Store errors are not swallowed.
- HTTP layers are responsible for safe error translation.

## Current write behavior

- `saveEntry` accepts a `NewBackstageEntry`.
- Its insert names four columns explicitly.
- Bind order is type, URL, text, and submission timestamp.
- It omits database-owned `id`.
- It omits management-owned `completed_at`.
- The database supplies both initial persisted values.
- `saveEntry` returns `Promise<void>`.
- The ticket does not request returning the generated row.
- The existing POST core returns the pre-persistence four-field entry.
- That POST response behavior belongs to an older boundary.

## Current read behavior

- `listEntries` selects four physical columns explicitly.
- It does not select `id` or `completed_at` yet.
- `EntryRow` mirrors that four-column projection.
- `rowToEntry` maps `submitted_at` to `submittedAt`.
- It currently returns `NewBackstageEntry`.
- `listEntries` currently returns `Promise<NewBackstageEntry[]>`.
- Ordering is `ORDER BY id ASC`.
- This orders by insertion identity, not timestamp text.
- Equal timestamps remain deterministically ordered.
- Empty results map to an empty array.
- The mapper constructs fresh objects rather than leaking raw rows.

## Required read evolution

- The settled persisted contract has six fields.
- The SQL projection must name all six physical columns.
- `EntryRow` must include numeric `id`.
- It must include nullable `completed_at`.
- The mapper must expose `completedAt` in camel case.
- The mapper must continue mapping `submitted_at`.
- It should return `BackstageEntry`.
- `listEntries` should return `Promise<BackstageEntry[]>`.
- `SELECT *` would make the public contract implicit and is not the repo pattern.
- Explicit selection keeps physical/public mapping reviewable.

## Mutation semantics from story context

- Completion is settable state rather than append-only history.
- The story describes setting completion and clearing it back.
- The public state representation is `string | null`.
- A mutation can therefore accept the exact settled field type.
- Setting a timestamp writes the provided string.
- Clearing writes SQL `NULL` through a JavaScript `null` binding.
- The pure store does not own wall-clock access.
- It should not fabricate a timestamp internally.
- Runtime timestamp validation belongs to a later untrusted boundary.
- The store trusts its typed caller, matching `saveEntry` behavior.
- Completion targets the stable numeric primary-key handle.
- A direct `WHERE id = ?` predicate addresses one row.

## Delete semantics from story context

- Deletion is explicitly hard deletion.
- There is no undo or soft-delete column.
- There is no audit history.
- The stable id is the row address.
- A direct `DELETE ... WHERE id = ?` removes the addressed row.
- No cascade behavior exists in the current single-table schema.
- Sibling integrity is observable by listing after deletion.
- Deleting one row does not renumber remaining SQLite ids.
- Oldest-first order remains based on surviving ids.

## Return-value observations

- The ticket names mutation effects but does not specify return values.
- `EntryStoreStatement.run()` is currently typed as `Promise<unknown>`.
- SQLite and D1 expose mutation metadata with different concrete types.
- Surfacing affected-row counts would require broadening or narrowing that abstraction.
- Later route ticket `T-008-02-02` must distinguish an unknown id.
- Its route acceptance calls for a distinct status on unknown ids.
- A boolean mutation result could support that future need.
- However the current narrow interface erases `run()` metadata.
- Returning `void` preserves the established store style but cannot identify misses.
- This is a Design decision rather than a fact fixed by this ticket text.

## Current store tests

- `test/backstage-store.test.mjs` imports `saveEntry` and `listEntries`.
- It uses Node's built-in test runner and strict assertions.
- It creates a real `DatabaseSync(':memory:')` database.
- Its adapter implements the narrow D1-like surface.
- It currently executes only migration `0001`.
- That is insufficient once reads reference `completed_at`.
- The fixture must execute `0001` and `0002` in order.
- Existing expected entries contain only the four insert-ready fields.
- Those expectations must account for database-assigned ids and null completion.
- Existing tests cover round trips, order, hard content, types, duplicates, empty state,
  exact keys, and schema rejection.
- The exact-key test currently asserts that `id` is absent.
- That assertion is intentionally obsolete under this ticket.
- The test should instead pin the settled six-field public set.

## Cross-test consumers of listEntries

- `test/backstage-route.test.mjs` imports `listEntries` directly.
- Its SQLite fixture currently executes only migration `0001`.
- Successful POST tests compare persisted reads to four-field response entries.
- The POST response still has no database-assigned id.
- The persisted list will now have two additional fields.
- Those success assertions must distinguish accepted response shape from persisted shape.
- Failure-path assertions compare only empty arrays and remain valid.
- Updating the test fixture to both migrations is required for every list call.
- This is compatibility maintenance caused directly by the store contract change.

## Retrieval seam interaction

- `src/lib/backstage-retrieval.ts` calls `listEntries` directly.
- It currently promises `NewBackstageEntry[]` in `BackstageFeed`.
- Comments explicitly defer id/completion publication to `T-008-02-01`.
- The feed runtime currently returns list results without remapping.
- Changing the store alone would otherwise publish fields early.
- `test/backstage-retrieval.test.mjs` pins a four-field feed and absence of id.
- Its SQLite fixture also executes only migration `0001`.
- The dedicated feed ticket depends on this ticket.
- Therefore this ticket must keep the existing feed boundary coherent while evolving the store.
- A small explicit projection at retrieval can preserve the old feed until its owner removes it.
- The fixture still must apply migration `0002` because the underlying list query uses it.

## Other consumers

- `src/lib/backstage-route.ts` only calls `saveEntry`.
- Its runtime source does not call `listEntries`.
- The insert SQL remains compatible with the additive migration.
- `scripts/backstage-feed.ts` goes through the retrieval seam.
- Later dashboard and management routes depend on this store work.
- No other production source calls `listEntries`.
- No source currently calls completion or deletion functions.
- No Worker binding type change is needed.

## Verification commands

- `npm test` runs an explicit ordered list of Node test files.
- The store, route, and retrieval tests are already included.
- No package script edit is needed for new cases in an existing test file.
- `npm run typecheck` runs Astro, TypeScript, and Wrangler checks.
- Typecheck will catch the changed `listEntries` return type at retrieval.
- A focused store test can run with Node strip-types.
- The full suite is necessary because store projection has downstream consumers.

## Repository state and ownership

- Lisa has modified `.lisa/provenance.jsonl`.
- Lisa has modified the dependency ticket frontmatter.
- Lisa has changed this ticket from `ready` to `research`.
- These edits are unrelated workflow state and must be preserved unstaged.
- The implementation commits must name explicit owned paths.
- The dependency implementation and migrations are already committed.
- No existing work directory for this ticket was present at start.

## Constraints carried into Design

- Keep the store pure and dependency-injected.
- Preserve the explicit SQL-column style.
- Return the settled six-field `BackstageEntry` from lists.
- Preserve `ORDER BY id ASC`.
- Bind completion state rather than reading the clock in the store.
- Target both mutations solely by numeric id.
- Exercise both real committed migrations in SQLite tests.
- Prove set, clear, delete, and sibling isolation.
- Keep the existing feed protocol four-field until `T-008-02-01`.
- Keep the POST response contract unchanged.
- Run focused tests, full tests, and typecheck.
- Do not edit ticket phase or status.
