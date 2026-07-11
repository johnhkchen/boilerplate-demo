# Progress — T-008-01-01 entry id and completion schema

## Status

- Research: complete.
- Design: complete.
- Structure: complete.
- Plan: complete.
- Implement: complete.
- Review: pending at the time this log was written.
- Ticket frontmatter: intentionally not edited by this work.

## Completed decision artifacts

Commit: `4b13826` — `docs(T-008-01-01): research through implementation plan`

Created:

- `docs/active/work/T-008-01-01/research.md`;
- `docs/active/work/T-008-01-01/design.md`;
- `docs/active/work/T-008-01-01/structure.md`;
- `docs/active/work/T-008-01-01/plan.md`.

The artifacts record:

- existing hidden integer identity;
- existing four-field entry/list/feed boundaries;
- nullable timestamp versus boolean completion options;
- selection of `completedAt: string | null`;
- use of the existing integer primary key as `id: number`;
- separation of persisted and insert-ready entry shapes;
- append-only migration design;
- testing and commit strategy.

## Implementation step 1 — append-only migration

Created:

- `migrations/0002_add_backstage_entry_completion.sql`.

Implemented statement:

```sql
ALTER TABLE backstage_entries ADD COLUMN completed_at TEXT;
```

Resulting properties:

- migration sequence advances from `0001` to `0002`;
- existing table and columns remain untouched;
- `completed_at` is nullable;
- no explicit default creates canonical `NULL` incomplete state;
- existing rows need no backfill;
- no index or speculative workflow state is added.

Verification in the contract test:

- `0001` applies to an empty SQLite database;
- a row is inserted before `0002`;
- `0002` applies successfully;
- the row's generated id remains unchanged;
- the row's new completion value is `null`;
- `PRAGMA table_info` reports `TEXT`, `notnull: 0`, and no default;
- physical column order is the five original columns followed by `completed_at`.

## Implementation step 2 — persisted public contract

Modified:

- `src/lib/backstage-entry.ts`.

`BackstageEntry` now requires:

```ts
interface BackstageEntry {
  id: number;
  type: BackstageEntryType;
  url: string;
  text: string;
  submittedAt: string;
  completedAt: string | null;
}
```

Also exported:

```ts
type NewBackstageEntry = Omit<BackstageEntry, 'id' | 'completedAt'>;
```

This keeps the persisted public promise exact while representing the real insert boundary: the
database has not assigned an id and completion has not been managed yet.

No optional fields or placeholder ids were introduced.

## Implementation step 3 — pre-persistence producer alignment

Modified:

- `src/lib/backstage-submission.ts`.

Changes:

- `toBackstageEntry` now returns `NewBackstageEntry`;
- its runtime object remains the existing four-field insert-ready value;
- request validation still accepts exactly `type`, `url`, and `text`;
- the server still owns `submittedAt`;
- comments now distinguish the inserted draft from the persisted public row.

The POST route did not need a runtime change.

## Implementation step 4 — current store boundary alignment

Modified:

- `src/lib/backstage-store.ts`.

Changes:

- `saveEntry` accepts `NewBackstageEntry`;
- `rowToEntry` returns `NewBackstageEntry` for the current legacy projection;
- `listEntries` returns `NewBackstageEntry[]` until `T-008-01-02` expands it;
- comments explicitly name the dependent ticket that will add persisted projection;
- insert and select SQL remain unchanged;
- runtime behavior remains unchanged.

Deliberately not implemented:

- selecting `id`;
- selecting/mapping `completed_at`;
- `setEntryCompletion`;
- `deleteEntry`.

Those are the acceptance surface of dependent ticket `T-008-01-02`.

## Implementation step 5 — current retrieval boundary alignment

Modified:

- `src/lib/backstage-retrieval.ts`.

Changes:

- existing feed entries are typed as `NewBackstageEntry[]`;
- comments identify the four-field output as the current pre-management feed;
- runtime output is unchanged;
- schema version remains `1`;
- gate ordering remains unchanged.

Publishing `id` and `completedAt` through the feed remains assigned to `T-008-02-01`.

## Implementation step 6 — contract test

Created:

- `test/backstage-entry-contract.test.ts`.

Static coverage:

- exact six-key `BackstageEntry` contract;
- exact `id: number` type;
- exact `completedAt: string | null` type;
- exact four-key `NewBackstageEntry` contract.

Runtime coverage:

- six public keys are present on a concrete fixture;
- id is a JavaScript number;
- incomplete completion is `null`;
- a completion timestamp string is preserved;
- both committed migrations execute in order;
- an existing id is stable through migration;
- existing data defaults to incomplete;
- column name, type, nullability, default, and position are pinned.

Modified:

- `package.json`.

The explicit `npm test` command now includes the contract test. No dependencies or lockfile changes
were needed.

## Focused verification

Command:

```sh
node --experimental-strip-types --test test/backstage-entry-contract.test.ts
```

Final result:

- tests: 2;
- passed: 2;
- failed: 0;
- exit code: 0.

### Test-only adjustment

The first focused run produced one failure while comparing SQLite `PRAGMA` metadata. The values
were identical, but `node:sqlite` returns result rows with a null prototype, and Node's strict deep
equality treats that prototype difference as significant.

Adjustment:

- spread the `PRAGMA` row into a plain object before comparing exact metadata.

Rationale:

- the assertion intends to pin column metadata, not SQLite adapter object prototypes;
- all six metadata fields remain compared exactly;
- no production code or schema changed in response.

The focused test passed on the immediate rerun.

## Type verification

Command:

```sh
npm run typecheck
```

Result:

- exit code: 0;
- Astro checked 57 files;
- errors: 0;
- warnings: 0;
- hints: 0;
- repository `tsc --noEmit`: passed;
- Wrangler generated type check: passed;
- `worker-configuration.d.ts` reported current.

Observed non-blocking tool message:

- Astro printed its existing deprecated `session.driver` signature notice.
- This ticket does not touch session configuration.
- The notice did not produce an Astro diagnostic or nonzero exit.

## Full unit regression

Command:

```sh
npm test
```

Result:

- tests: 154;
- passed: 154;
- failed: 0;
- cancelled: 0;
- skipped: 0;
- todo: 0;
- exit code: 0.

Coverage included:

- the two new schema/type contract tests;
- unchanged backstage store behavior;
- unchanged backstage POST route behavior;
- unchanged backstage retrieval/gate behavior;
- all existing operations, leak, integration, passcode, promotion, session, and sponsor-packet
  unit tests.

## Deviations from Plan

One minor test implementation deviation occurred:

- Planned: compare the `completed_at` `PRAGMA` row directly to an expected object.
- Actual: compare a plain-object spread of the row because Node SQLite uses a null prototype.
- Impact: none on intended coverage or production behavior.

No scope deviations occurred:

- no dependent store mutations were implemented;
- no feed publication change was implemented;
- no dashboard work was implemented;
- no remote D1 operation occurred.

## Repository and staging safety

- The Lisa-owned ticket phase transition existed before implementation.
- It was excluded from the pre-implementation artifact commit.
- Implementation staging uses explicit paths only.
- Migration `0001` remains unmodified.
- `package-lock.json` remains unmodified.
- No dependency was installed.

## Remaining work

- Commit the verified implementation and this progress artifact.
- Inspect final staged and unstaged diffs.
- Write `review.md` with acceptance mapping, coverage, and open concerns.
- Commit the Review artifact.
- Stop after Review and leave phase/status transitions to Lisa.
