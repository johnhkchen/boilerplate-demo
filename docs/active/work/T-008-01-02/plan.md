# Plan — T-008-01-02 entry store completion and delete

## Objective

Complete the pure backstage store so its canonical reads return stable identity and completion
state, and so typed callers can set/clear completion or hard-delete exactly one entry by id. Keep
the existing submit and feed protocols coherent while the E-008 ticket graph advances in stages.

## Execution principles

- Follow the settled schema and public contract from `T-008-01-01`.
- Exercise committed SQL rather than copied table definitions.
- Keep every SQL value parameterized.
- Preserve deterministic `id ASC` ordering.
- Keep time generation and untrusted validation outside the store.
- Make mutation misses observable through boolean results.
- Preserve unrelated and Lisa-owned working-tree changes.
- Commit meaningful units with explicit path lists.
- Document any deviation before implementing it.

## Step 1 — establish the acceptance test fixture

Modify `test/backstage-store.test.mjs`.

Actions:

1. Import both committed migration files.
2. Execute `0001` and then `0002` in every in-memory store.
3. Import the planned completion and deletion exports.
4. Retain the existing D1-shaped adapter.
5. Return `DatabaseSync` mutation metadata from `run()`.
6. Add a small persisted-entry expectation helper.

Verification:

- The fixture creates all six physical columns.
- Existing tests initially reveal expected projection mismatches until implementation.
- No copied SQL table definition enters the test.

Atomicity:

- Keep fixture and acceptance assertion edits in the same implementation commit as the store APIs,
  because imports of not-yet-existing exports would otherwise leave an intentionally broken commit.

## Step 2 — evolve existing read assertions

Continue in `test/backstage-store.test.mjs`.

Actions:

1. Expect the first persisted row to carry `id: 1`.
2. Expect `completedAt: null` for ordinary inserts.
3. List the same row twice and assert the id remains stable.
4. Update multi-entry expectations to ids 1, 2, and 3.
5. Keep the oldest-first expectation independent of timestamp strings.
6. Keep exact hard-content equality for the four caller-owned fields.
7. Update both-type expectations without weakening discriminator checks.
8. Keep duplicate content as distinct rows with distinct ids.
9. Replace the exact-four-key assertion with exact-six-key coverage.
10. Keep empty-list and invalid-type behavior.

Verification:

- Every returned entry has exactly the settled public persisted shape.
- Stable ids and null defaults are explicit rather than incidental.
- Old behaviors remain covered under the richer projection.

## Step 3 — add completion acceptance cases

Continue in `test/backstage-store.test.mjs`.

Actions:

1. Save three distinguishable entries.
2. Capture the full initial list.
3. Set the middle id to a fixed ISO timestamp.
4. Assert the operation returns true.
5. List and assert only middle `completedAt` changed.
6. Assert first and third objects remain deeply equal to their initial values.
7. Clear the middle id with null.
8. Assert the operation returns true.
9. List and assert the original all-null state is restored.
10. Call with an absent id and assert false plus no state change.

Verification:

- Set and clear both work.
- Exactly-row semantics are proven against siblings.
- Missing-handle behavior is pinned.

## Step 4 — add deletion acceptance cases

Continue in `test/backstage-store.test.mjs`.

Actions:

1. Save three distinguishable entries.
2. Complete one sibling or the target so state preservation is observable.
3. Delete the middle id.
4. Assert the operation returns true.
5. List and assert only the middle entry is absent.
6. Assert surviving ids are unchanged and remain ordered.
7. Assert surviving content/completion fields are unchanged.
8. Delete an absent id.
9. Assert false and no further state change.

Verification:

- Delete is hard removal.
- There is no accidental broad predicate.
- Sibling preservation includes identity and completion state.

## Step 5 — implement the canonical persisted read

Modify `src/lib/backstage-store.ts`.

Actions:

1. Import `BackstageEntry`.
2. Extend `EntryRow` with `id` and nullable `completed_at`.
3. Add those columns to explicit list SQL.
4. Preserve `ORDER BY id ASC`.
5. Map both new physical fields.
6. Return `BackstageEntry` from the mapper.
7. Return `Promise<BackstageEntry[]>` from `listEntries`.
8. Update comments that describe omitted persistence state.

Verification:

- TypeScript sees the full settled shape.
- Store tests prove runtime mapping.
- No physical snake-case name leaks.

## Step 6 — implement mutation result normalization

Continue in `src/lib/backstage-store.ts`.

Actions:

1. Export `EntryStoreRunResult` with optional Node and D1 change-count paths.
2. Change the statement interface's `run()` result accordingly.
3. Add a private affected-row helper.
4. Prefer `meta.changes` when present.
5. Fall back to top-level `changes`.
6. Treat absent metadata as zero affected rows.
7. Return true only for exactly one changed row.

Verification:

- The in-memory adapter satisfies the interface.
- Real D1 remains structurally assignable under typecheck.
- Raw provider metadata does not cross exported domain operations.

## Step 7 — implement completion and deletion

Continue in `src/lib/backstage-store.ts`.

Actions:

1. Add completion update SQL with `WHERE id = ?`.
2. Export `setEntryCompletion`.
3. Accept `BackstageEntry['completedAt']` for direct contract alignment.
4. Bind completion first and id second.
5. Execute once and normalize its changed-row result.
6. Add hard-delete SQL with `WHERE id = ?`.
7. Export `deleteEntry`.
8. Bind the id and normalize its changed-row result.

Verification:

- No interpolation occurs.
- The primary key predicate limits each operation to one row.
- Focused set/clear/delete/miss cases pass.

## Step 8 — run focused store verification

Command:

```sh
node --experimental-strip-types --test test/backstage-store.test.mjs
```

Pass criteria:

- Exit code zero.
- Every legacy store case remains green.
- New stable-id/default-completion case passes.
- Set, clear, delete, and missing-id cases pass.

If failures expose a plan change:

- Record the deviation in `progress.md` before changing direction.
- Do not weaken exact-row assertions to make a broad mutation pass.

## Step 9 — preserve the staged feed boundary

Modify `src/lib/backstage-retrieval.ts`.

Actions:

1. Add a private mapper from `BackstageEntry` to `NewBackstageEntry`.
2. Project only type, URL, text, and submitted time.
3. Apply it after `listEntries` succeeds.
4. Preserve list order.
5. Derive count from projected entries.
6. Update comments to name `T-008-02-01` as removal owner.

Verification:

- Feed types remain honest.
- Existing feed exact-key assertions remain valid.
- No entry content is transformed.

## Step 10 — update downstream SQLite fixtures

Modify `test/backstage-route.test.mjs` and `test/backstage-retrieval.test.mjs`.

Actions:

1. Load both committed migrations.
2. Execute them in numeric order.
3. In route success tests, compare response-owned fields inside the persisted result.
4. Assert persisted id and null completion without changing response expectations.
5. Keep all failure-path empty-list assertions.
6. In retrieval tests, keep the exact four-field feed expectations.
7. Explicitly assert completion is absent alongside id if useful.

Verification:

- Submit runtime behavior is unchanged.
- Feed runtime behavior is unchanged.
- Both suites run over the current committed schema.

## Step 11 — run backstage regression tests

Commands:

```sh
node --experimental-strip-types --test \
  test/backstage-store.test.mjs \
  test/backstage-route.test.mjs \
  test/backstage-retrieval.test.mjs
```

Pass criteria:

- Store, submit, and retrieval tests all pass together.
- No staged-boundary mismatch remains.
- No database fixture references only the obsolete schema.

## Step 12 — record progress and implementation commit

Create/update `docs/active/work/T-008-01-02/progress.md` before committing.

Record:

- Completed steps.
- Exact changed files.
- Focused test results.
- Any deviations and rationale.
- Remaining full verification.

Commit owned implementation paths explicitly:

- `src/lib/backstage-store.ts`
- `src/lib/backstage-retrieval.ts`
- `test/backstage-store.test.mjs`
- `test/backstage-route.test.mjs`
- `test/backstage-retrieval.test.mjs`
- `docs/active/work/T-008-01-02/progress.md`

Do not stage ticket or provenance files.

## Step 13 — run full verification

Commands:

```sh
npm test
npm run typecheck
```

Pass criteria:

- All Node unit tests pass.
- Astro reports no errors.
- TypeScript compilation succeeds.
- Wrangler generated binding check succeeds.
- No generated file changes unexpectedly.

Optional evidence:

- Record test/pass/fail counts from Node output.
- Record Astro diagnostic counts.
- Record any non-failing pre-existing warning separately.

## Step 14 — inspect the final diff

Commands:

```sh
git diff --check
git status --short
git diff --stat
git diff -- src/lib/backstage-store.ts src/lib/backstage-retrieval.ts
```

Review criteria:

- No ticket frontmatter is staged or edited by this work.
- SQL predicates contain `WHERE id = ?`.
- List remains `ORDER BY id ASC`.
- Mapper returns exactly six persisted fields.
- Feed mapper returns exactly four current fields.
- Tests prove sibling isolation rather than only row counts.
- Comments match runtime behavior.

## Step 15 — update progress after full verification

Add to `progress.md`:

- Full unit result counts.
- Typecheck result.
- Final diff review result.
- Implementation commit hash.
- Remaining work: Review only.

Commit the progress update as part of the review artifact commit or a small explicit docs commit,
depending on whether the implementation commit already contains its first version.

## Step 16 — produce Review

Create `docs/active/work/T-008-01-02/review.md`.

Required sections:

- Verdict.
- What changed by file.
- Files created/modified/deleted.
- Acceptance mapping.
- Test results.
- Coverage strengths.
- Intentional gaps.
- Open concerns and follow-up ownership.
- Critical human-attention issues, if any.

Commit final workflow artifacts with explicit paths. Leave Lisa-owned state untouched. Stop after
`review.md` is written and committed; do not update ticket phase or status.
