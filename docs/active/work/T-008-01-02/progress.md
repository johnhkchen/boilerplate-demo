# Progress — T-008-01-02 entry store completion and delete

## Current state

- Research: complete.
- Design: complete.
- Structure: complete.
- Plan: complete.
- Implement: complete.
- Focused verification: complete and green.
- Full unit verification: complete and green.
- Type verification: complete and green.
- Final diff review: pending before Review.
- Review artifact: pending.

## Workflow artifacts completed

### Research

- Mapped the committed two-migration schema.
- Mapped the settled persisted and insert-ready contracts.
- Traced every production and test consumer of `listEntries`.
- Identified that route tests inspect canonical persisted rows directly.
- Identified that the feed publication change belongs to `T-008-02-01`.
- Identified Lisa-owned dirty worktree files and excluded them from commits.

### Design

- Chose an explicit six-column list projection.
- Chose `string | null` as the completion setter input.
- Kept the store free from ambient clock access.
- Chose primary-key predicates for both mutations.
- Chose boolean mutation results for unknown-id handling.
- Chose normalization of D1 and Node affected-row metadata.
- Chose a temporary four-field feed projection for staged compatibility.
- Rejected `SELECT *`, boolean completion, raw provider results, and early feed publication.

### Structure

- Defined changes to the store, retrieval core, and three test files.
- Defined the public mutation signatures.
- Defined SQL statements and mapping boundaries.
- Defined files intentionally unchanged.
- Defined implementation ordering and verification ownership.

### Plan

- Sequenced acceptance tests and implementation together to avoid a broken commit.
- Sequenced downstream fixture compatibility after the canonical store change.
- Required focused backstage tests before full verification.
- Required full unit and type gates.
- Required explicit-path commits that exclude Lisa state.

## Implementation completed

### Canonical persisted list

File: `src/lib/backstage-store.ts`.

- Added `BackstageEntry` to the store's type imports.
- Expanded the physical `EntryRow` with `id: number`.
- Expanded it with `completed_at: string | null`.
- Changed list SQL to explicitly select all six persisted columns.
- Retained `ORDER BY id ASC` without modification.
- Kept the list projection explicit rather than using `SELECT *`.
- Mapped physical `id` directly to public `id`.
- Mapped `completed_at` to `completedAt`.
- Continued mapping `submitted_at` to `submittedAt`.
- Changed the row mapper return type to `BackstageEntry`.
- Changed `listEntries` to return `Promise<BackstageEntry[]>`.
- Updated comments that previously described id/completion omission.

### Mutation metadata boundary

File: `src/lib/backstage-store.ts`.

- Added exported `EntryStoreRunResult`.
- Modeled D1's `meta.changes` path.
- Modeled Node SQLite's top-level `changes` path.
- Narrowed `EntryStoreStatement.run()` from unknown to that small result shape.
- Added private `changedExactlyOne` normalization.
- Preferred D1 metadata when both paths are present.
- Conservatively treats missing metadata as no known affected row.
- Keeps raw database metadata out of domain callers.
- Full typecheck confirms real `D1Database` remains structurally compatible.

### Completion mutation

File: `src/lib/backstage-store.ts`.

- Added parameterized `UPDATE backstage_entries SET completed_at = ? WHERE id = ?`.
- Added exported `setEntryCompletion`.
- Accepts numeric stable row id.
- Accepts `BackstageEntry['completedAt']`.
- Persists a timestamp string without transformation.
- Persists null to clear completion.
- Does not access the clock.
- Returns true when exactly one row is affected.
- Returns false for an unknown id in the tested SQLite adapter.
- Surfaces database failures rather than swallowing them.

### Delete mutation

File: `src/lib/backstage-store.ts`.

- Added parameterized `DELETE FROM backstage_entries WHERE id = ?`.
- Added exported `deleteEntry`.
- Implements hard deletion only.
- Uses the stable numeric primary key.
- Returns true when exactly one row is affected.
- Returns false for an unknown id in the tested SQLite adapter.
- Does not implement soft-delete, undo, or history.

### Staged retrieval compatibility

File: `src/lib/backstage-retrieval.ts`.

- Added a private persisted-to-current-feed mapper.
- `listEntries` now reads the canonical six-field store rows.
- Feed output remains the current four-field `NewBackstageEntry` shape.
- Type, URL, text, and submitted time are copied unchanged.
- Oldest-first ordering is preserved by `Array.map`.
- Count remains derived from the emitted entries.
- Comments identify `T-008-02-01` as the publication owner.
- This avoids implementing the dependent feed ticket early.

## Test changes completed

### Store acceptance suite

File: `test/backstage-store.test.mjs`.

- Imports both committed migrations.
- Executes migration `0001` followed by `0002`.
- Imports `setEntryCompletion` and `deleteEntry`.
- Retains a real in-memory SQLite database.
- Retains the D1-shaped adapter.
- Adds a helper for exact persisted-entry expectations.
- Proves a newly saved row reads with id 1 and null completion.
- Lists the same row twice to prove its assigned id is stable.
- Proves three rows return ids 1, 2, and 3 oldest-first.
- Keeps hard text/URL content fidelity assertions.
- Keeps both type discriminators.
- Keeps duplicate content as distinct ids.
- Pins exactly six public keys.
- Pins absence of physical snake-case timestamp names.
- Sets the middle row to a fixed completion timestamp.
- Proves first and third siblings remain deeply unchanged.
- Clears the same row back to null.
- Proves the original state is restored.
- Proves an unknown completion id returns false and is a no-op.
- Deletes a middle row.
- Proves surviving sibling ids, content, order, and completion remain intact.
- Proves an unknown delete id returns false and is a no-op.
- Keeps invalid-type rejection and empty-list coverage.

### Submit route regression suite

File: `test/backstage-route.test.mjs`.

- Executes both committed migrations.
- Keeps the POST response at its four insert-ready fields.
- Changes only persisted-list expectations.
- Proves a successful accepted entry persists with id 1.
- Proves its completion defaults to null.
- Keeps feedback-with-empty-URL coverage.
- Keeps every gate, validation, and failure-path assertion.
- No submit route runtime file changed.

### Retrieval regression suite

File: `test/backstage-retrieval.test.mjs`.

- Executes both committed migrations.
- Keeps the four-field feed expectations unchanged.
- Keeps exact text and URL fidelity assertions.
- Keeps oldest-first output coverage.
- Keeps id absent until `T-008-02-01`.
- Adds an explicit assertion that completion is also absent.
- Keeps passcode-first denial and missing-store coverage.

## Verification evidence

### Focused backstage suites

Command:

```text
node --experimental-strip-types --test \
  test/backstage-store.test.mjs \
  test/backstage-route.test.mjs \
  test/backstage-retrieval.test.mjs
```

Result:

```text
tests 32
pass 32
fail 0
cancelled 0
skipped 0
todo 0
```

### Full unit suite

Command: `npm test`.

Result:

```text
tests 158
pass 158
fail 0
cancelled 0
skipped 0
todo 0
```

### Type gate

Command: `npm run typecheck`.

Result:

- Exit code 0.
- Astro checked 57 files.
- Astro reported 0 errors.
- Astro reported 0 warnings.
- Astro reported 0 hints.
- Repository `tsc --noEmit` passed.
- Wrangler reported generated types up to date.
- Astro emitted the existing informational deprecation notice for the string
  `session.driver` signature; it is unrelated and is not a diagnostic.

## Deviations from plan

- No architectural deviation was required.
- Acceptance tests and store implementation were edited in one working unit as planned.
- The focused command ran all three backstage suites together immediately after implementation,
  rather than running the store test alone first; this strengthened the first verification pass.
- No acceptance assertion was weakened.
- No remote or metered Cloudflare action was performed.

## Commits

- `11c6384` — `docs(T-008-01-02): research through implementation plan`.
- Implementation commit: pending immediately after this progress snapshot.
- Review artifact commit: pending after final review.

## Remaining before Review

1. Run `git diff --check` over the final implementation worktree.
2. Inspect owned diffs and staged paths.
3. Commit implementation and this progress artifact explicitly.
4. Record the implementation commit hash in this file.
5. Write `review.md` with acceptance mapping, coverage, and open concerns.
6. Commit final progress/review artifacts.
7. Stop without editing ticket phase or status.
