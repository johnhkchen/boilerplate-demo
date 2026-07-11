# Progress — T-008-02-01 feed exposes id and completion

## Current state

Implementation is complete. The gated feed now serializes the canonical complete persisted entry
objects directly, including stable `id` and nullable `completedAt`. Focused acceptance, full unit,
and type gates are green. Review remains.

## Completed phase artifacts

- Research mapped the contract, store, retrieval mapper, gate order, CLI, tests, and documentation.
- Design chose direct canonical publication, schema version 1, lifecycle/gate/CLI proofs, and docs.
- Structure defined the four modified paths and explicitly unchanged boundaries.
- Plan sequenced implementation, verification, scoped commits, and review.
- Pre-implementation artifacts were committed as `a612bec`.

## Implementation completed

### Canonical feed publication

Modified `src/lib/backstage-retrieval.ts`:

- Removed the obsolete `NewBackstageEntry` import.
- Changed `BackstageFeed.entries` from `NewBackstageEntry[]` to `BackstageEntry[]`.
- Removed the temporary `toCurrentFeedEntry` four-field projection.
- Feed success now assigns `await listEntries(input.db)` directly.
- Retained `schemaVersion: 1`.
- Retained the existing envelope keys and count calculation.
- Retained gate-before-store ordering.
- Retained missing-store behavior after successful authorization.
- Retained oldest-first ordering owned by `listEntries`.
- No route edge change was necessary.

### Retrieval acceptance coverage

Modified `test/backstage-retrieval.test.mjs`:

- Existing single-entry coverage now expects numeric id and null completion.
- Hard-content coverage now pins the complete six-field object.
- Multiple-entry coverage now pins ids 1, 2, and 3 in insertion order.
- Envelope coverage asserts exactly the six public persisted keys.
- Added a three-row lifecycle scenario.
- The scenario completes the middle row with a fixed timestamp.
- It hard-deletes the last row.
- It reads canonical current state with `listEntries`.
- It deeply compares feed entries with that store state.
- It confirms the completed timestamp is byte-for-byte unchanged.
- It confirms the deleted id is absent.
- It confirms surviving ids remain stable and oldest-first.
- It confirms hard URL and text content remains unchanged.
- Added a store trap covering missing, mismatched, and misconfigured gate states.
- Every denial reports the expected status with zero `prepare` calls.
- Added an ephemeral loopback-server test for the actual package command.
- The test executes `npm run --silent backstage:feed` as a child process.
- It confirms stdout deeply equals the server's six-field entries array.
- It confirms null and completed states, ids, content, and order survive.
- It confirms the command presents the configured passcode header.
- The server is closed in `finally`, leaving no open test handle.

### Public documentation

Modified `docs/knowledge/backstage-retrieval-seam.md`:

- Response example now includes id and completion.
- The example shows both incomplete and completed states.
- Contract prose now identifies exactly six public fields.
- Id is documented as the stable store-assigned management handle.
- Completion is documented as null or a timestamp.
- Complete and hard-delete reflection are documented.
- The obsolete no-id guarantee was removed.
- Verification now names both committed migrations.
- Verification now describes lifecycle, zero-read gate, and CLI command evidence.

## Files intentionally unchanged

- `src/lib/backstage-entry.ts` — upstream contract already complete.
- `src/lib/backstage-store.ts` — upstream list and mutations already sufficient.
- `src/pages/api/backstage/feed.ts` — delegates directly and inherits the evolved payload.
- `scripts/backstage-feed.ts` — already prints the response `entries` array without projection.
- Submission route/core — still accept and return the insert-ready four-field shape.
- Migrations — no schema change is part of this ticket.
- Package scripts and lockfile — existing command and test wiring were sufficient.
- Ticket frontmatter and Lisa provenance — preserved as workflow-owned changes.

## Focused verification

Command:

```text
node --experimental-strip-types --test test/backstage-retrieval.test.mjs
```

Result:

```text
tests 13
pass 13
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 198.287458
```

The focused run includes all ticket-specific acceptance assertions and the real package-command
subprocess.

## Full unit verification

Command:

```text
npm test
```

Result:

```text
tests 172
pass 172
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 376.730166
```

The suite also included the concurrently landed sibling management tests. Their PATCH and DELETE
feed-reflection scenarios passed against this evolved retrieval contract.

## Type verification

Command:

```text
npm run typecheck
```

Result:

```text
Astro files: 60
errors: 0
warnings: 0
hints: 0
tsc --noEmit: passed
worker:types:check: generated types up to date
exit: 0
```

Astro emitted the repository's existing deprecation notice for the string `session.driver`
signature. It is not a diagnostic and is unrelated to this ticket.

## Diff and scope checks

- `git diff --check` passed after implementation.
- Owned runtime/test/documentation diff is three files.
- Diff size before progress: 178 insertions and 39 deletions.
- No ticket frontmatter was edited by the implementation.
- No account identifier, database UUID, token, or real secret was added.
- The passcode in tests is the existing fixture value.
- CLI production code did not require modification.

## Acceptance mapping

### Feed entries carry id and completion matching the store byte-for-byte

Complete. The runtime publishes the exact array from `listEntries`. The lifecycle test deep-compares
feed entries with a canonical store read after mutations. Exact keys and value types are asserted.

### Results remain oldest-first

Complete. Retrieval performs no sort or map. Store order remains `ORDER BY id ASC`; multi-entry and
post-delete assertions pin surviving id order.

### Feed reflects a completed entry

Complete. A fixed completion timestamp is written through `setEntryCompletion`, observed in both
the canonical store read and feed, and compared exactly.

### Feed reflects a deleted entry

Complete. The third row is hard-deleted through `deleteEntry`; its id is absent from the canonical
store and feed while both earlier ids remain stable.

### Gate precedes any store read

Complete. A trap store counts `prepare` calls and would throw if touched. Missing, wrong, and blank
configured passcode cases all return their gate statuses with zero prepares.

### `npm run backstage:feed` prints entries unchanged beyond added fields

Complete. The actual package command retrieves a controlled envelope and stdout parses to deep
equality with the complete entry array, including both new fields and all prior values.

## Deviations from plan

No material design or scope deviation occurred.

One execution detail differs only in argument ordering: the test invokes
`npm run --silent backstage:feed`, which is the standard npm option placement and executes the same
`backstage:feed` script named by acceptance. The product script itself remains unchanged.

The full suite count increased from the upstream ticket's 158 to 172 because sibling
`T-008-02-02` landed concurrently and its management test joined `npm test`. This was expected by
the story's parallel wave and required no coordination or source conflict.

## Remaining work

- Commit the scoped implementation, tests, documentation, and this progress artifact.
- Write `review.md` with final handoff, coverage, and concerns.
- Run final commit/diff checks.
- Stop after Review; Lisa owns subsequent transitions.
