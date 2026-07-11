# Review — T-008-01-02 entry store completion and delete

## Review verdict

The ticket acceptance criteria are met. `listEntries` now returns the complete settled persisted
contract with stable numeric identity and nullable completion state, still oldest-first. The pure
store can set or clear completion and hard-delete exactly one row by id. Real SQLite tests over
both committed migrations prove target isolation, sibling preservation, and unknown-id no-ops.

The full unit suite and type gate are green. No critical issue requires human intervention before
dependent tickets proceed.

## What changed

### Modified — canonical store

`src/lib/backstage-store.ts`

- The explicit list projection now selects `id` and `completed_at` in addition to the existing
  content fields.
- `ORDER BY id ASC` remains the deterministic oldest-first rule.
- The physical row mapper now returns the six-field `BackstageEntry` contract.
- `submitted_at` still maps to `submittedAt`.
- `completed_at` maps to `completedAt`.
- Numeric `id` is returned without string conversion.
- New rows still omit both database-owned columns during insert.
- `listEntries` now returns `Promise<BackstageEntry[]>`.
- Added `setEntryCompletion(db, id, completedAt)`.
- Completion accepts a timestamp string or null and does not read the clock.
- Added `deleteEntry(db, id)` for hard deletion.
- Both mutations use parameterized primary-key predicates.
- Both return a boolean derived from affected-row count.
- The narrow run-result interface supports D1's `meta.changes` and the Node SQLite adapter's
  top-level `changes`.
- Raw provider mutation metadata remains internal to the store.

Public mutation signatures:

```ts
setEntryCompletion(
  db: EntryStoreDatabase,
  id: number,
  completedAt: string | null,
): Promise<boolean>

deleteEntry(
  db: EntryStoreDatabase,
  id: number,
): Promise<boolean>
```

### Modified — staged feed compatibility

`src/lib/backstage-retrieval.ts`

- The retrieval core now consumes the canonical six-field store result.
- A private mapper temporarily projects it to the existing four-field feed shape.
- Type, URL, text, submitted time, count, and ordering remain unchanged.
- Id and completion are deliberately held back until dependent ticket `T-008-02-01`.
- This keeps the current feed protocol and schema-version claim honest during staged delivery.

### Modified — store acceptance tests

`test/backstage-store.test.mjs`

- The fixture executes committed migrations `0001` and `0002` in order.
- Existing round-trip tests now expect the full persisted contract.
- A repeated read proves the assigned id remains stable.
- Multi-row reads prove ids ascend with oldest-first order.
- Exact-key coverage pins the six public fields and excludes snake-case physical names.
- New completion coverage sets the middle row to a fixed timestamp.
- It proves both siblings remain deeply unchanged.
- It clears the same row back to null and proves the original state is restored.
- Missing-id completion returns false and changes nothing.
- New delete coverage removes a middle row.
- It preserves both siblings, their original ids, their content, ordering, and completion state.
- Missing-id deletion returns false and changes nothing.
- Existing Unicode, newline, quote, query-string, duplicate-content, type, empty-list, and schema
  rejection cases remain.

### Modified — submit regression tests

`test/backstage-route.test.mjs`

- The SQLite fixture executes both committed migrations.
- Successful persisted reads now include database-assigned id and null completion.
- The POST response remains the existing four-field insert-ready entry.
- Passcode, validation, malformed-body, missing-store, and safe-error behavior are unchanged.
- No submit route runtime source changed.

### Modified — retrieval regression tests

`test/backstage-retrieval.test.mjs`

- The SQLite fixture executes both committed migrations.
- Current feed tests continue to expect exactly four entry fields.
- An explicit assertion confirms completion is held back alongside id.
- Content fidelity, order, count, gate precedence, and account-free access remain covered.

### Created — workflow artifacts

- `research.md` maps schema, contracts, store behavior, consumers, tests, and constraints.
- `design.md` evaluates read, mutation, return-value, and rollout options.
- `structure.md` defines file boundaries, interfaces, and implementation ordering.
- `plan.md` sequences atomic implementation and verification.
- `progress.md` records execution, commits, results, and deviations.
- `review.md` provides this handoff.

## Files deleted

None.

## Files intentionally unchanged

- Both migrations remain byte-for-byte unchanged.
- `src/lib/backstage-entry.ts` remains the contract settled by `T-008-01-01`.
- `src/lib/backstage-submission.ts` remains the insert-ready boundary.
- `src/lib/backstage-route.ts` and its Astro edge remain unchanged.
- No package, lockfile, Wrangler configuration, or generated type changed.
- Ticket frontmatter and Lisa provenance were not staged or committed.

## Acceptance mapping

### `listEntries` carries stable id and uncompleted default

Met.

- SQL explicitly selects `id` and `completed_at`.
- The first saved row reads as id 1 with `completedAt: null`.
- A second list returns the same exact id.
- Exact keys match the settled `BackstageEntry` contract.
- Tests use the real committed additive migration rather than copied SQL.

### `listEntries` remains oldest-first

Met.

- SQL retains `ORDER BY id ASC`.
- Three inserted rows read with ids 1, 2, and 3 in insertion order.
- Equal timestamps and duplicate content remain distinct and correctly ordered.

### `setEntryCompletion(id, ...)` flips exactly one row

Met.

- SQL is `UPDATE ... SET completed_at = ? WHERE id = ?`.
- A fixed timestamp changes only the middle of three rows.
- First and third siblings remain deeply equal to their pre-update values.
- Passing null clears the same row back to the canonical incomplete state.
- The fully restored list equals its pre-update snapshot.
- An unknown id returns false and leaves all state unchanged.

### `deleteEntry(id)` removes exactly one row

Met.

- SQL is `DELETE ... WHERE id = ?`.
- Deleting the middle of three rows returns true.
- Only that row disappears.
- Surviving ids are not renumbered.
- Surviving content and completion state remain byte-for-byte unchanged.
- An unknown id returns false and leaves all state unchanged.

## Test results

### Focused backstage regression

```text
tests 32
pass 32
fail 0
cancelled 0
skipped 0
todo 0
```

This combines store, submit-route, and retrieval-core tests against the current two-migration
schema.

### Full unit suite

```text
tests 158
pass 158
fail 0
cancelled 0
skipped 0
todo 0
```

### Type gate

```text
npm run typecheck: exit 0
Astro: 0 errors, 0 warnings, 0 hints across 57 files
tsc --noEmit: passed
worker:types:check: generated types up to date
```

Astro prints an existing deprecation notice for the string `session.driver` signature. It is not
a diagnostic and is unrelated to this ticket.

### Diff quality

- `git diff --check` passed before the implementation commit.
- `git show --check a10c826` passed after the commit.
- Implementation commit scope contains only owned source, test, and progress files.

## Coverage assessment

### Strong coverage

- Real SQLite executes the exact committed migration files in numeric order.
- The complete public persisted shape is asserted, not only selected values.
- Stable identity is verified across repeated reads.
- Oldest-first behavior is verified with multiple entries and tied timestamps.
- Completion is tested in both directions.
- Mutation isolation compares complete sibling objects, catching collateral field changes.
- Delete preservation includes a completed sibling, making state loss observable.
- Both unknown-id paths prove boolean result and unchanged store state.
- Existing hard-content fidelity remains covered.
- Downstream submit and feed regressions run against the evolved store schema.
- Typecheck verifies the narrow store dependency remains compatible with production D1.

### Intentional gaps

- No HTTP completion/delete route exists yet; `T-008-02-02` owns it.
- No runtime id parser or completion timestamp validator exists in this pure trusted boundary; the
  later untrusted HTTP boundary owns validation.
- The feed intentionally does not publish id/completion yet; `T-008-02-01` owns that change and
  should remove the temporary projection.
- No browser/dashboard interaction is tested; story `S-008-03` owns that surface.
- No remote D1 migration was applied; deploy-time migration is a metered operator action outside
  this pure local ticket.
- No soft-delete, undo, assignment, or audit history exists, matching epic exclusions.
- Provider failure propagation is not newly tested for mutations; store operations intentionally
  allow errors to reject, matching existing `saveEntry` semantics.

## Open concerns and follow-up ownership

- `T-008-02-01` must remove `toCurrentFeedEntry` and evolve feed tests/CLI output to the canonical
  six-field shape. Until then, the projection is intentional compatibility code.
- `T-008-02-02` should use the boolean mutation results to return a distinct unknown-id status
  without issuing a preliminary existence read.
- The later route should generate or validate completion timestamps before calling the store.
- Mutation booleans depend on adapters exposing affected-row metadata. Production D1 supplies
  `meta.changes`; the committed SQLite adapter supplies `changes`. A nonconforming future adapter
  would conservatively report false and must implement one of those documented shapes.
- Remote environments must have migration `0002` applied before deploying code whose canonical
  list selects `completed_at`.

## Human attention

No critical issue is open. The only operational prerequisite is the already-documented migration
ordering: deployed databases need committed migration `0002` before this store projection runs.

## Commits

- `11c6384` — research through implementation plan.
- `a10c826` — store implementation, compatibility updates, tests, and progress evidence.
- Final review/progress artifact commit follows this document.
