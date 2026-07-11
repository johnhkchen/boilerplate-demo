# Review — T-008-01-01 entry id and completion schema

## Review verdict

The ticket acceptance criteria are met. A new append-only migration adds nullable completion state,
the persisted `BackstageEntry` contract now exposes an exact numeric id and nullable completion
timestamp, and an executable TypeScript contract test pins both the public types and real SQLite
migration behavior. The full unit suite and required typecheck are green.

No critical issue requires human intervention before the dependent store ticket proceeds.

## What changed

### Created — schema

`migrations/0002_add_backstage_entry_completion.sql`

- Adds `completed_at TEXT` to `backstage_entries`.
- Leaves the column nullable.
- Supplies no explicit default, so existing and ordinary new rows are incomplete as `NULL`.
- Preserves existing integer primary keys.
- Does not edit migration `0001`.

### Modified — public contract

`src/lib/backstage-entry.ts`

- `BackstageEntry` gained required `id: number`.
- `BackstageEntry` gained required `completedAt: string | null`.
- Existing `type`, `url`, `text`, and `submittedAt` fields are unchanged.
- Added `NewBackstageEntry`, which omits database-owned id and management-owned completion state.
- Comments now distinguish persisted public rows from insert-ready values.

Settled public persisted shape:

```ts
interface BackstageEntry {
  id: number;
  type: 'reference' | 'feedback';
  url: string;
  text: string;
  submittedAt: string;
  completedAt: string | null;
}
```

### Modified — pre-persistence boundaries

`src/lib/backstage-submission.ts`

- `toBackstageEntry` now truthfully returns `NewBackstageEntry`.
- Runtime construction and validation did not change.
- Client input still cannot supply id, timestamps, or completion state.

`src/lib/backstage-store.ts`

- `saveEntry` accepts `NewBackstageEntry`.
- Current four-field row mapping and list result are typed as `NewBackstageEntry`.
- SQL and runtime behavior are unchanged.
- Comments identify `T-008-01-02` as the owner of the full persisted projection.

`src/lib/backstage-retrieval.ts`

- The existing four-field feed is typed as `NewBackstageEntry[]`.
- Feed runtime behavior and schema version are unchanged.
- Comments identify `T-008-02-01` as the publication boundary for persisted management fields.

### Created — contract test

`test/backstage-entry-contract.test.ts`

- Pins exact `BackstageEntry` keys at compile time.
- Pins `id` to exactly `number`.
- Pins `completedAt` to exactly `string | null`.
- Pins `NewBackstageEntry` to exactly the four insert-ready keys.
- Verifies a concrete public object exposes all six fields.
- Verifies both null and timestamp completion values.
- Applies committed migrations `0001` and `0002` to real in-process SQLite.
- Inserts legacy data before `0002` and proves its id remains stable.
- Proves the new column is `TEXT`, nullable, defaultless, and initially `NULL`.

### Modified — test entrypoint

`package.json`

- Adds the contract test to the explicit `npm test` command.
- Adds no dependency.
- Leaves `package-lock.json` unchanged.

### Created — workflow artifacts

- `research.md` maps existing contract, schema, producers, store, retrieval, tests, and constraints.
- `design.md` evaluates identifier and completion representations and records the decision.
- `structure.md` specifies file boundaries and public interfaces.
- `plan.md` sequences implementation, verification, and commits.
- `progress.md` records execution, results, and the one test-only adjustment.
- `review.md` provides this handoff.

## Files deleted

None.

## Acceptance mapping

### Append-only `migrations/0002_*.sql`

Met.

- File exists with `0002` sequence.
- `0001` has no diff.
- The statement adds one column rather than recreating the table.
- A contract test executes both committed migrations in order.

### Nullable completion column on `backstage_entries`

Met.

- Physical field: `completed_at TEXT`.
- SQLite metadata reports `notnull: 0`.
- Existing data reads `completed_at` as `null` after migration.
- No boolean tri-state or backfill ambiguity is introduced.

### Existing primary key becomes a stable public id

Met at the contract layer assigned to this ticket.

- Public field: required `id: number`.
- It maps conceptually and directly to existing `id INTEGER PRIMARY KEY`.
- Migration testing proves an allocated id is unchanged by `0002`.
- Store projection/publication is deliberately left to dependent `T-008-01-02`.

### Public completion field

Met.

- Public field: required `completedAt: string | null`.
- `null` is the exact incomplete state.
- A string is the current completion timestamp.
- This mirrors existing `submittedAt` / `submitted_at` naming and representation.

### Contract test asserts fields present and typed

Met.

- Runtime object-key assertion proves presence.
- Compile-time exact equality proves id and completion types.
- Exact `keyof` equality prevents optional/missing/extra public fields from silently passing.
- The test is part of the standard `npm test` script and repository TypeScript compilation.

### `npm run typecheck` passes

Met.

- Exit code: 0.
- Astro diagnostics: 0 errors, 0 warnings, 0 hints across 57 files.
- `tsc --noEmit`: passed.
- Wrangler generated type check: passed.
- Generated Worker types are current.

## Test results

### Focused contract test

```text
tests 2
pass 2
fail 0
```

Covered:

- exact public type contract;
- runtime public field presence;
- nullable and completed representations;
- sequential committed migration application;
- legacy id preservation;
- physical column metadata.

### Full unit suite

```text
tests 154
pass 154
fail 0
cancelled 0
skipped 0
todo 0
```

This includes all existing backstage persistence, POST route, retrieval, and passcode tests. Their
unchanged expectations confirm this schema-contract ticket does not prematurely change existing
runtime responses.

### Type gate

```text
npm run typecheck: exit 0
Astro: 0 errors, 0 warnings, 0 hints
tsc: passed
worker:types:check: passed
```

Astro prints an existing deprecation notice for the string `session.driver` signature. It is not a
diagnostic, does not affect the exit code, and is unrelated to this ticket.

## Coverage assessment

### Strong coverage

- Exact public TypeScript keys and field types are statically pinned.
- Concrete runtime keys protect against fixture/protocol misunderstandings.
- The test reads real migration files, not copied SQL.
- Migration behavior is exercised on SQLite, the engine underlying D1.
- A pre-migration row proves compatibility with existing stored data.
- Full regressions cover current submit, list, retrieval, and gating paths.

### Intentional gaps

- No `listEntries` assertion for id/completion exists yet; that is `T-008-01-02` acceptance.
- No completion toggle or deletion is tested; those operations do not exist until `T-008-01-02`.
- No feed id/completion assertion exists; that is `T-008-02-01`.
- No management HTTP route or browser flow is tested; those belong to later stories.
- No remote D1 migration was applied; this pass performs no metered/operator Cloudflare action.
- ISO timestamp format is not branded at the TypeScript level; existing timestamp contracts also
  use `string`, and the future mutation boundary owns runtime generation/validation.

These gaps align with ticket boundaries rather than missing acceptance coverage.

## Design review

### Why numeric id is appropriate

- It exposes the already-existing stable row address.
- It avoids a second identifier, backfill, or mapping layer.
- It supports direct primary-key update/delete predicates in dependent work.
- It is management identity inside one project database, not authentication or a secret.

### Why nullable completion timestamp is appropriate

- Nullable text has exactly two meaningful states here.
- It avoids `NULL`/`0`/`1` tri-state boolean storage.
- It follows the repository's timestamp naming convention.
- It can drive a checkbox via `completedAt !== null` while retaining useful current-state timing.
- Clearing completion simply restores `NULL` and retains no history.

### Why `NewBackstageEntry` is necessary

- The database assigns id only during insertion.
- A submission cannot truthfully satisfy persisted `BackstageEntry` before that point.
- Optional public fields would weaken every downstream management consumer.
- Placeholder ids would meet structural typing but violate stable identity.
- A named pre-persistence type keeps the distinction explicit and temporary at list/feed boundaries.

## Open concerns and follow-on obligations

### Dependent store projection

`T-008-01-02` must:

- apply both migrations in its SQLite fixture;
- select `id` and `completed_at`;
- map them to `id` and `completedAt`;
- return `BackstageEntry[]` from `listEntries`;
- prove new rows default to `completedAt: null`;
- add complete/clear and delete-by-id operations.

Until that ticket lands, current list/feed runtime output intentionally remains the legacy
four-field shape. This is not a hidden regression: existing behavior is unchanged, and the new
persisted contract is not falsely claimed at those boundaries.

### POST response identity

The current POST route returns its insert-ready entry and `saveEntry` returns `void`, so the POST
response does not include the generated id. This ticket does not require changing submission
behavior, and the planned dashboard can refresh the list after submission. If a later UI requires
the create response to carry identity directly, that should be a deliberate route/store contract
change rather than a fabricated pre-insert value.

### Remote migration application

An operator must apply migration `0002` to deployed D1 before code that selects `completed_at`
reaches that environment. This repository change only commits and locally verifies the migration.
Deployment ordering belongs to the normal D1 migration/deploy process.

### Critical concerns

None.

## Commit record

- `4b13826` — Research, Design, Structure, and Plan artifacts.
- `f37b391` — migration, public contract, supporting boundaries, contract tests, and progress log.
- Review artifact is committed separately as the final RDSPI handoff.

## Repository hygiene

- Migration `0001` was not modified.
- No dependency or lockfile changed.
- No unrelated application file was staged.
- The ticket frontmatter change is Lisa-owned and remains unstaged.
- During Review, Lisa had advanced the working-tree phase independently; this work neither edited
  nor committed the ticket's phase or status.

## Final handoff

The schema and TypeScript contract are ready for `T-008-01-02`. That ticket can now implement the
full persisted list projection and id-addressed state mutations against the settled fields without
revisiting identity or completion representation.
