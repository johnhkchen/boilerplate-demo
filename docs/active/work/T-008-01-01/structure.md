# Structure — T-008-01-01 entry id and completion schema

## Change inventory

### Create

- `migrations/0002_add_backstage_entry_completion.sql`
  - append-only schema migration;
  - adds nullable `completed_at TEXT`;
  - does not edit or recreate the table.
- `test/backstage-entry-contract.test.ts`
  - executable Node contract test;
  - compile-time exact-type assertions;
  - runtime public-key assertions;
  - real committed-migration verification.
- `docs/active/work/T-008-01-01/research.md`
- `docs/active/work/T-008-01-01/design.md`
- `docs/active/work/T-008-01-01/structure.md`
- `docs/active/work/T-008-01-01/plan.md`
- `docs/active/work/T-008-01-01/progress.md`
- `docs/active/work/T-008-01-01/review.md`

### Modify

- `src/lib/backstage-entry.ts`
  - expand persisted `BackstageEntry`;
  - add the pre-persistence `NewBackstageEntry` alias.
- `src/lib/backstage-submission.ts`
  - import and return `NewBackstageEntry` from the submission conversion.
- `src/lib/backstage-store.ts`
  - accept `NewBackstageEntry` for inserts;
  - describe and type current legacy list mapping as pre-persistence shape;
  - leave SQL projection and runtime output unchanged for the dependent store ticket.
- `src/lib/backstage-retrieval.ts`
  - type the current legacy feed as `NewBackstageEntry[]` until its dependent feed ticket;
  - preserve runtime behavior.
- `package.json`
  - add the contract test to the explicit `npm test` file list.

### Do not modify

- `migrations/0001_create_backstage_entries.sql`.
- `docs/active/tickets/T-008-01-01.md`.
- `test/backstage-store.test.mjs`.
- `test/backstage-retrieval.test.mjs`.
- HTTP route files.
- Wrangler configuration or generated binding types.

## Public type module

File: `src/lib/backstage-entry.ts`.

Final exported surface:

```ts
export const BACKSTAGE_ENTRY_TYPES = ['reference', 'feedback'] as const;

export type BackstageEntryType = (typeof BACKSTAGE_ENTRY_TYPES)[number];

export interface BackstageEntry {
  id: number;
  type: BackstageEntryType;
  url: string;
  text: string;
  submittedAt: string;
  completedAt: string | null;
}

export type NewBackstageEntry = Omit<
  BackstageEntry,
  'id' | 'completedAt'
>;
```

### Boundary meaning

- `BackstageEntry` is the complete public representation of a persisted row.
- `NewBackstageEntry` is data ready for insertion but not yet assigned persistence state.
- `BackstageEntryType` remains the canonical discriminator.
- Neither interface performs runtime validation.
- Both timestamps remain JSON-portable strings.
- `null` is the only incomplete representation in the persisted contract.

### Field ordering

- Put `id` first because it is the stable handle.
- Preserve the current content-field order.
- Put `completedAt` after `submittedAt`, grouping lifecycle metadata at the end.
- Runtime contract tests compare a sorted key list, so source order is documented but not
  protocol-significant.

## Migration module

File: `migrations/0002_add_backstage_entry_completion.sql`.

Complete content:

```sql
ALTER TABLE backstage_entries ADD COLUMN completed_at TEXT;
```

### Physical contract after both migrations

| Column | Declared type | Nullable | Ownership |
| --- | --- | --- | --- |
| `id` | `INTEGER` primary key | no | database |
| `type` | `TEXT` | no | submission |
| `url` | `TEXT` | no | submission |
| `text` | `TEXT` | no | submission |
| `submitted_at` | `TEXT` | no | server |
| `completed_at` | `TEXT` | yes | management operation |

### Mapping contract for dependent work

- `id` maps directly to public `id`.
- `completed_at` maps to public `completedAt`.
- `NULL` maps to JavaScript `null`.
- No coercion to a boolean is intended.
- The next store ticket owns implementing this select/update mapping.

## Submission module adjustment

File: `src/lib/backstage-submission.ts`.

Changes:

- Replace the type-only `BackstageEntry` import with `NewBackstageEntry`.
- Change `toBackstageEntry(...): BackstageEntry` to
  `toBackstageEntry(...): NewBackstageEntry`.
- Preserve its name and runtime object construction to avoid unrelated API churn.
- Update comments to call the result an insert-ready entry rather than the canonical persisted
  entry.
- Do not admit client-supplied `id`, `submittedAt`, or `completedAt`.
- Preserve `EXPECTED_KEYS = ['text', 'type', 'url']`.

The function still attaches only the server-owned submission timestamp. The database adds id and
the migration supplies `NULL` completion.

## Store module adjustment

File: `src/lib/backstage-store.ts`.

Changes:

- Import `NewBackstageEntry` and `BackstageEntryType`.
- Type `rowToEntry` as returning `NewBackstageEntry`.
- Type `saveEntry` input as `NewBackstageEntry`.
- Type `listEntries` as `Promise<NewBackstageEntry[]>` for this ticket boundary.
- Update comments that previously called the four-field object the full public contract.
- Keep `EntryRow` unchanged.
- Keep both SQL strings byte-for-byte unchanged.
- Keep runtime mapping byte-for-byte unchanged.

This is a deliberate transitional type boundary, not a persisted-shape implementation. The next
ticket will add `id` and `completed_at` to `EntryRow`, select them, map them, and restore
`listEntries(): Promise<BackstageEntry[]>` while adding mutations.

## Retrieval module adjustment

File: `src/lib/backstage-retrieval.ts`.

Changes:

- Import `NewBackstageEntry` instead of `BackstageEntry`.
- Type `BackstageFeed.entries` as `NewBackstageEntry[]` for current behavior.
- Clarify the comment that this is the existing four-field feed until T-008-02-01.
- Do not change `FEED_SCHEMA_VERSION`.
- Do not change envelope construction, gating, or HTTP output.

This keeps the current feed truthful and type-safe. When `listEntries` gains the full persisted
shape, its values remain structurally assignable to the narrower legacy feed; the feed ticket will
then explicitly publish the new fields.

## Contract test module

File: `test/backstage-entry-contract.test.ts`.

### Imports

- Node strict assertions.
- `readFileSync`.
- `DatabaseSync`.
- path and URL helpers for repository-relative migration paths.
- Node `test`.
- type-only `BackstageEntry` and `NewBackstageEntry`.

### Static helpers

```ts
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2) ? true : false;

type Assert<T extends true> = T;
```

Define aliases that must compile:

- exact `keyof BackstageEntry` equality to the six settled keys;
- exact `BackstageEntry['id']` equality to `number`;
- exact `BackstageEntry['completedAt']` equality to `string | null`;
- exact `NewBackstageEntry` key equality to the four insert-ready keys.

Use the aliases in concrete `true` constants so strict unused-analysis cannot erase their role and
runtime can assert the compile-time witnesses remain true.

### Test 1 — public contract fixture

- Build one concrete `BackstageEntry` with numeric id and `completedAt: null`.
- Assert sorted keys are exactly the six public fields.
- Assert `typeof entry.id === 'number'`.
- Assert incomplete state is `null`.
- Build a second fixture via spread with a timestamp string.
- Assert the timestamp remains byte-for-byte.
- Assert all static witness constants are `true`.

### Test 2 — append-only migration

- Read `0001` and `0002` from disk.
- Open in-memory SQLite.
- Execute `0001`.
- Insert a legacy row before executing `0002`.
- Capture its id.
- Execute `0002`.
- Query the migrated legacy row.
- Assert its id did not change.
- Assert its `completed_at` is `null`.
- Inspect `PRAGMA table_info(backstage_entries)`.
- Assert the column list includes `completed_at` after existing columns.
- Assert its declared type is `TEXT`.
- Assert its `notnull` metadata is `0`.
- Close the database using the test cleanup hook.

## Package script adjustment

File: `package.json`.

- Add `test/backstage-entry-contract.test.ts` to the existing explicit Node test command.
- Place it near the backstage store/route/retrieval tests.
- Keep `--experimental-strip-types`.
- Do not introduce another test runner or dependency.

## Change ordering

1. Write Research, Design, Structure, and Plan artifacts.
2. Add the migration and public type expansion.
3. Add the supporting source type adjustments.
4. Add the contract test and wire it into `npm test`.
5. Run focused test and typecheck.
6. Run full unit suite.
7. Inspect migration and ticket diffs.
8. Write `progress.md`, committing meaningful implementation units.
9. Perform Review and write `review.md`.

## Invariants

- Existing SQL migration history is immutable.
- Existing POST validation accepts exactly three client-owned keys.
- Existing POST, list, and feed runtime payloads do not change in this ticket.
- Public persisted contract has no optional id or completion field.
- Incomplete persisted state is exactly `null`.
- No fake id is constructed before insertion.
- No completion/delete behavior is implemented before `T-008-01-02`.
- Ticket frontmatter remains owned by Lisa.
