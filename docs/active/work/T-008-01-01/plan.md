# Plan — T-008-01-01 entry id and completion schema

## Goal and completion gate

Settle persisted backstage entry identity and completion state without implementing the dependent
store-management or feed tickets. Completion requires:

- append-only migration `0002` adds nullable `completed_at TEXT`;
- `BackstageEntry` requires `id: number` and `completedAt: string | null`;
- pre-persistence code uses an honest type without a fabricated id;
- an executable contract test pins public keys, exact types, and migration behavior;
- `npm test` passes;
- `npm run typecheck` passes;
- all RDSPI artifacts through Review are written;
- ticket phase/status are untouched by this work.

## Step 1 — establish the append-only migration

Create `migrations/0002_add_backstage_entry_completion.sql` with one `ALTER TABLE` statement.

Implementation details:

1. Name the migration with the next sequence number.
2. Add `completed_at` as `TEXT`.
3. Do not add `NOT NULL`.
4. Do not add a default expression.
5. Do not modify migration `0001`.

Independent verification:

- inspect `git diff -- migrations/0001_create_backstage_entries.sql` and require no output;
- execute `0001` then `0002` against in-memory SQLite in the contract test;
- verify a row inserted before `0002` retains its id and receives null completion.

Atomic commit boundary:

- migration, public type contract, and its test form one schema-contract unit because none is
  useful alone.

## Step 2 — expand the persisted public contract

Modify `src/lib/backstage-entry.ts`.

Implementation details:

1. Add required `id: number` to `BackstageEntry`.
2. Add required `completedAt: string | null`.
3. Preserve all four existing fields and their types.
4. Export `NewBackstageEntry` as the omission of database-owned id and completion state.
5. Update module comments to distinguish persisted public data from insert-ready data.

Independent verification:

- compile exact type witnesses in the contract test;
- instantiate incomplete and completed fixtures with `satisfies`/explicit annotations;
- require six exact public keys and four exact draft keys.

Failure modes guarded:

- `id?: number` would fail exact equality.
- `id: string` would fail exact equality.
- `completedAt?: string | null` would fail exact equality.
- `completedAt: boolean` would fail exact equality.
- an extra public field would fail exact `keyof` equality.

## Step 3 — make pre-persistence producers truthful

Modify `src/lib/backstage-submission.ts`.

Implementation details:

1. Import `NewBackstageEntry` rather than persisted `BackstageEntry`.
2. Return `NewBackstageEntry` from `toBackstageEntry`.
3. Keep its runtime output unchanged.
4. Keep request validation and expected client keys unchanged.
5. Update comments that imply the pre-insert value is already persisted/canonical.

Verification:

- repository TypeScript check proves the conversion no longer promises unknown fields;
- existing route tests prove runtime POST behavior is unchanged;
- source diff confirms no validation keys were added.

## Step 4 — make current storage typing truthful without stealing dependent work

Modify `src/lib/backstage-store.ts`.

Implementation details:

1. Import `NewBackstageEntry`.
2. Change `rowToEntry` return type to `NewBackstageEntry`.
3. Change `saveEntry` input type to `NewBackstageEntry`.
4. Change current `listEntries` return type to `NewBackstageEntry[]`.
5. Update comments describing id privacy as a current/legacy boundary.
6. Do not change insert SQL.
7. Do not change select SQL.
8. Do not add completion or delete methods.

Verification:

- existing store tests remain unchanged and green;
- runtime deep-equality expectations still prove no accidental response shape change;
- source diff shows no SQL behavior change.

Deviation trigger:

- If TypeScript consumers require full `BackstageEntry[]`, adjust only their declared current
  boundary to `NewBackstageEntry[]`; do not use unsafe casts or prematurely implement projection.

## Step 5 — align the current retrieval boundary

Modify `src/lib/backstage-retrieval.ts` only as required by Step 4.

Implementation details:

1. Type the existing feed entries as `NewBackstageEntry[]`.
2. Update stale four-field/public-contract comments.
3. Preserve envelope version and behavior.
4. Preserve gate-before-store ordering.

Verification:

- existing retrieval tests remain unchanged and green;
- no response JSON changes occur;
- no feed schema version change occurs.

## Step 6 — add the contract test

Create `test/backstage-entry-contract.test.ts`.

Implementation details:

1. Add `Equal` and `Assert` compile-time helpers.
2. Pin exact persisted keys.
3. Pin exact `id` type.
4. Pin exact `completedAt` type.
5. Pin exact draft keys.
6. Add concrete incomplete/completed fixtures.
7. Assert runtime keys and values.
8. Read both migrations from their committed repository paths.
9. Insert a row under schema `0001` before applying `0002`.
10. Apply `0002`.
11. Assert stable id and null completion.
12. Assert column declaration and nullable metadata.
13. Close SQLite in test cleanup.

Focused verification:

```sh
node --experimental-strip-types --test test/backstage-entry-contract.test.ts
```

Expected result: two passing tests and zero failures.

## Step 7 — wire the test into the standard suite

Modify `package.json`.

Implementation details:

1. Add the new file to the explicit `test` script.
2. Keep current test ordering otherwise stable.
3. Do not add packages.
4. Do not add an alternate script that acceptance would miss.

Verification:

```sh
npm test
```

Expected result: all existing tests plus the two new contract tests pass.

## Step 8 — run the acceptance type gate

Run:

```sh
npm run typecheck
```

This covers:

- Astro diagnostics;
- repository TypeScript compilation, including static contract assertions;
- generated Worker binding consistency.

Expected result: exit code zero with no errors.

If it fails:

1. classify ticket-owned versus environmental failures;
2. fix every ticket-owned failure;
3. rerun the full command rather than claiming component checks;
4. record any external failure verbatim as an open concern.

## Step 9 — regression and scope audit

Inspect:

```sh
git status --short
git diff --check
git diff -- migrations/0001_create_backstage_entries.sql
git diff -- docs/active/tickets/T-008-01-01.md
```

Acceptance conditions:

- no whitespace errors;
- no `0001` change;
- ticket diff contains only Lisa's pre-existing phase transition;
- implementation diff contains no completion mutation/delete/feed publication/dashboard work;
- package lock remains unchanged because no dependency was added.

## Step 10 — implementation commits and progress log

Write `progress.md` before and during commits.

Commit strategy:

1. Commit Research, Design, Structure, and Plan artifacts as the decision record.
2. Commit schema, types, supporting type-boundary changes, test, and package script as one coherent
   implementation unit after focused verification.
3. Commit progress verification evidence separately if it changes after the implementation commit.
4. Commit Review as the final handoff artifact.

Staging safety:

- always stage explicit ticket-owned paths;
- never use broad `git add .`;
- never stage `docs/active/tickets/T-008-01-01.md`;
- re-check staged names before each commit.

## Step 11 — review

Write `review.md` after implementation verification.

It must include:

- summary of created and modified files;
- acceptance-criterion mapping;
- exact test/typecheck results;
- test coverage strengths and gaps;
- migration/deployment boundary;
- transitional `NewBackstageEntry` boundary and its dependent-ticket cleanup;
- open concerns or explicit statement that none are critical;
- confirmation that Lisa-owned ticket fields were not updated.

## Rollback characteristics

- Source/type/test changes can be reverted normally before downstream consumers land.
- Migration `0002` is append-only history once applied and should not be edited in place.
- D1/SQLite column removal would require a future forward migration, not rollback editing.
- Existing rows are not rewritten, so local application is low-risk.
- No remote migration application occurs in this ticket.

## Definition of done

- All six RDSPI artifacts exist.
- Migration `0002` is valid and nullable.
- `BackstageEntry` exact public shape is settled.
- Pre-insert code does not lie about id/completion.
- Contract tests run under `npm test`.
- `npm test` is green.
- `npm run typecheck` is green.
- Review documents test coverage and open concerns.
- Ticket frontmatter has not been edited or staged by this work.
