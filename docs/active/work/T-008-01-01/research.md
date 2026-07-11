# Research — T-008-01-01 entry id and completion schema

## Ticket state and scope

- Ticket: `T-008-01-01`, `entry-id-and-completion-schema`.
- The ticket starts in `research` phase.
- It is the first ticket in story `S-008-01` and has no dependencies.
- It establishes the field shape consumed by all later E-008 management work.
- Acceptance requires one append-only migration named `migrations/0002_*.sql`.
- The migration must add a nullable completion column to `backstage_entries`.
- The existing `id INTEGER PRIMARY KEY` must remain in place.
- `BackstageEntry` must expose a stable public id and completion field.
- A contract test must assert that the new fields exist and have settled types.
- `npm run typecheck` must pass.
- Store completion/delete behavior belongs to `T-008-01-02`, not this ticket.
- Feed changes belong to `T-008-02-01`.
- Management HTTP routes belong to `T-008-02-02`.
- Dashboard and end-to-end behavior belong to story `S-008-03`.
- Ticket phase and status are Lisa-owned and must not be edited here.

## Product context

- E-008 turns the backstage from a write-only inbox into a shared checklist.
- A human collaborator must be able to address one entry to complete or delete it.
- The coding-agent retrieval seam must eventually read the same managed entries.
- A stable public handle is therefore a cross-surface contract, not a UI-only detail.
- Completion is current entry state.
- Audit history, undo, assignment, editing, and threading are explicitly out of scope.
- Deletion will be hard deletion in the following store ticket.
- Access remains the existing shared-passcode model with no user identity.
- The data remains project-owned in the existing D1 database.

## Current public entry contract

- `src/lib/backstage-entry.ts` owns the portable entry contract.
- It exports `BACKSTAGE_ENTRY_TYPES` as `['reference', 'feedback'] as const`.
- `BackstageEntryType` is derived from that tuple.
- `BackstageEntry` currently has exactly four required fields:
  - `type: BackstageEntryType`;
  - `url: string`;
  - `text: string`;
  - `submittedAt: string`.
- The module contains no runtime parser.
- Untrusted-boundary validation remains in `backstage-submission.ts`.
- The contract is shared by submission, persistence, retrieval, and HTTP code.
- TypeScript interfaces disappear at runtime, so runtime key tests need a concrete fixture.
- Compile-time assertions are needed to prove exact TypeScript field types.

## Current physical schema

- `migrations/0001_create_backstage_entries.sql` is the only migration.
- It creates `backstage_entries`.
- Its columns are `id`, `type`, `url`, `text`, and `submitted_at`.
- `id` is `INTEGER PRIMARY KEY`.
- Inserts omit `id`, allowing SQLite/D1 to allocate the row identifier.
- `type` is constrained to `reference` or `feedback`.
- All four content columns are `NOT NULL`.
- There is no completion column.
- No migration runner is implemented in application code.
- Tests apply the committed migration directly to in-memory `node:sqlite` databases.
- D1 uses SQLite semantics, so this is the repository's existing schema-test idiom.

## Existing identity behavior

- The physical primary key already provides a unique integer row address.
- `backstage-store.ts` orders reads by `id ASC`.
- This makes the key stable for a row and deterministic for ordering.
- The store deliberately excludes `id` from its `SELECT` projection.
- Its comments describe `id` as storage-private.
- `EntryRow` has no `id` property.
- `rowToEntry` creates an object with only the four current public fields.
- Store tests explicitly assert that `id` is absent.
- Retrieval tests likewise explicitly assert that `id` never leaves the feed.
- Those exclusions were correct for E-003 but are intentionally reversed by E-008.
- This ticket changes the contract; the next tickets change store and feed projections.

## Existing entry creation path

- Browser-owned input is represented by `BackstageSubmission`.
- It has `type`, `url`, and `text`, but no server-owned fields.
- `validateBackstageSubmission` rejects extra keys.
- `toBackstageEntry` adds a server-generated `submittedAt` string.
- The POST route then passes that object to `saveEntry`.
- `saveEntry` currently accepts a `BackstageEntry` and returns `Promise<void>`.
- The database, not the submission path, generates `id`.
- A new entry cannot truthfully have a stable id before the insert completes.
- A nullable completion value can default to incomplete before and after insertion.
- Adding required persisted fields directly to `BackstageEntry` therefore exposes an existing
  distinction between a new-entry draft and a persisted public entry.
- That distinction is currently implicit because all public fields are known before insert.

## Existing persistence boundary

- `backstage-store.ts` is framework-free and takes a narrow D1-shaped dependency.
- `EntryStoreDatabase` exposes `prepare`.
- `EntryStoreStatement` exposes `bind`, `run`, and `all`.
- `INSERT_ENTRY_SQL` names the four inserted content columns explicitly.
- The insert does not request generated-row metadata.
- `LIST_ENTRIES_SQL` names four projected columns explicitly.
- `rowToEntry` owns snake-case to camel-case mapping.
- `saveEntry` trusts its typed input; runtime validation happens at the HTTP boundary.
- `listEntries` returns oldest-first entries.
- Store behavior is covered by `test/backstage-store.test.mjs`.
- This ticket need not implement the next ticket's new projection or mutation methods.
- It must keep the current source compilable after broadening `BackstageEntry`.

## Existing retrieval and HTTP boundaries

- `backstage-retrieval.ts` types feed entries as `BackstageEntry[]`.
- It delegates to `listEntries` and does not remap entry objects.
- Existing comments call the four-field shape verbatim and id-free.
- Those comments will become stale once the later feed ticket runs.
- The POST core returns `{ entry }` containing the pre-insert object.
- It does not currently return the database-assigned id.
- The POST acceptance from E-003 only requires accepted content and server timestamp.
- This ticket does not require changing the POST response protocol.
- A persisted public contract and an accepted new-entry contract can therefore coexist.

## Completion representation observations

- The ticket requires a nullable completion column, not merely a defaulted flag.
- SQLite has no dedicated Boolean storage class.
- A boolean column would normally be an integer constrained to `0`/`1` and defaulted to `0`.
- Making such a boolean nullable would create three states without a stated meaning.
- A nullable timestamp naturally has exactly the required two states:
  - `NULL` means incomplete;
  - a timestamp string means complete.
- The existing public timestamp convention is camel-case `submittedAt: string`.
- The existing SQL timestamp convention is snake-case `submitted_at TEXT`.
- A completion timestamp can follow the same pair as `completedAt` / `completed_at`.
- Clearing completion maps naturally back to `NULL`.
- A current completion timestamp is state, not an audit trail.
- No ticket requires retaining earlier completion timestamps after clearing or re-completing.

## Identifier representation observations

- SQLite `INTEGER PRIMARY KEY` aliases the rowid and is returned as a number in the Node adapter.
- D1 integer values are represented as JavaScript numbers.
- Existing data already has allocated ids; no backfill is required.
- Exposing the existing id avoids generating a second identifier.
- A string conversion would add an unnecessary mapping and would not match the physical value
  byte-for-byte.
- The public field name can remain `id`, matching both the ticket and physical schema.
- The intended domain is a positive integral row handle, but TypeScript's portable primitive is
  `number`; runtime route validation can enforce integer/positive constraints later.

## Migration constraints

- Migration `0001` is committed history and must not be edited.
- Migration `0002` must be additive.
- SQLite supports `ALTER TABLE ... ADD COLUMN` for a nullable `TEXT` column.
- Omitting `NOT NULL` and a default makes existing and future rows `NULL` until completed.
- This requires no table rebuild and no data-copy statement.
- The column name must be settled now because the next store ticket will query and update it.
- Applying `0001` followed by `0002` in SQLite is the most direct local migration check.
- `PRAGMA table_info(backstage_entries)` can verify type, order, and nullability.

## Test and tooling conventions

- `npm test` is an explicit list of Node test files in `package.json`.
- Node runs TypeScript source with `--experimental-strip-types`.
- A new test is not discovered unless added to that explicit script.
- `npm run typecheck` runs `astro check`, repository `tsc --noEmit`, and Wrangler type checking.
- A `.ts` contract test included by `tsconfig.json` can supply compile-time assertions.
- The same `.ts` file can run under Node if its executable syntax remains erasable TypeScript.
- Node's built-in `assert` can verify concrete object keys and migration metadata at runtime.
- Type-level equality helpers can fail compilation if a field type drifts.
- Tests should use the real committed migrations rather than copied SQL.

## Repository state and ownership

- The working tree starts with one modified file: the ticket frontmatter.
- Its only diff changes `phase: ready` to `phase: research`.
- That is Lisa's transition and must be preserved but never staged in ticket commits.
- No work directory existed for `T-008-01-01` before this pass.
- All implementation and artifact commits must use explicit path lists.
- No unrelated source changes are present at Research time.

## Constraints carried into Design

- Preserve migration `0001` byte-for-byte.
- Add exactly one append-only `0002` migration.
- Use the existing physical integer id as the public handle.
- Choose a two-state nullable completion representation with no accidental third state.
- Keep pre-persistence input honest about fields it cannot yet know.
- Do not implement store read/update/delete behavior assigned to `T-008-01-02`.
- Add an executable contract test with compile-time type assertions.
- Keep all existing source and tests type-correct.
- Do not edit the ticket's phase or status.
