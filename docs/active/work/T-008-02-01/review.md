# Review — T-008-02-01 feed exposes id and completion

## Review verdict

The ticket acceptance criteria are met. The gated backstage feed now returns the complete canonical
persisted entry objects, including stable numeric identity and nullable completion, without a
retrieval-layer projection. SQLite-backed acceptance coverage proves the feed deeply matches current
store state after completing one entry and deleting another, remains oldest-first, and performs no
store read before any gate denial. The actual `npm run backstage:feed` command is exercised and
prints the evolved entries unchanged.

Focused, full unit, and type gates are green. No critical issue requires human intervention before
the story proceeds.

## What changed

### Modified — retrieval core

`src/lib/backstage-retrieval.ts`

- `BackstageFeed.entries` now uses `BackstageEntry[]`.
- The old insert-ready `NewBackstageEntry[]` feed type is gone.
- The temporary `toCurrentFeedEntry` projection is removed.
- Success now publishes `await listEntries(input.db)` directly.
- Numeric `id` passes from canonical store mapping to JSON unchanged.
- `completedAt` passes as either null or its stored timestamp unchanged.
- Type, URL, text, and submitted timestamp retain their existing values.
- Store-defined `ORDER BY id ASC` remains the sole ordering rule.
- The envelope still contains `schemaVersion`, `gate`, `count`, and `entries`.
- `schemaVersion` remains 1 for this additive field evolution.
- `count` remains derived from the exact serialized array.
- The passcode gate remains the first operation.
- Store-presence checking remains after successful authorization.
- No error response shape changed.

### Modified — retrieval acceptance tests

`test/backstage-retrieval.test.mjs`

- Existing round-trip assertions now expect the complete six-field entry.
- Database-assigned id is asserted as numeric.
- Newly inserted completion is asserted as null.
- Hard-content coverage still pins newlines, Unicode, quotes, tabs, and encoded query strings.
- Multi-entry coverage now pins ids 1, 2, and 3 in insertion order.
- Envelope coverage asserts exactly the six public keys.
- Physical snake-case names remain excluded through exact-key coverage.
- Added a lifecycle acceptance test over three real SQLite rows.
- The middle row is completed with a fixed timestamp.
- The last row is hard-deleted.
- The feed is deeply compared with `listEntries` after both mutations.
- Surviving ids remain stable and ascending.
- The completion timestamp matches exactly.
- The deleted id is explicitly absent.
- Surviving content remains unchanged.
- Added a trap database that counts `prepare` calls.
- Missing passcode returns 401 with zero store reads.
- Wrong passcode returns 403 with zero store reads.
- Blank configured passcode returns 500 with zero store reads.
- Added a loopback HTTP fixture for the repo-local CLI.
- The test executes the actual npm package script in a child process.
- Parsed stdout deeply equals the controlled complete entries array.
- Both id and completion states survive CLI output.
- Existing content and ordering survive CLI output.
- The server observes the configured passcode header.
- The server is closed reliably in `finally`.
- Existing empty-store, missing-store, and account-free coverage remains.

### Modified — public seam documentation

`docs/knowledge/backstage-retrieval-seam.md`

- JSON response example now includes id and completion.
- Example covers one incomplete and one completed entry.
- Contract prose now describes six public fields.
- Id is documented as the stable store-assigned management handle.
- Completion is documented as null or a completion timestamp.
- Completion updates and hard-delete absence are documented.
- The obsolete "No id leak" guarantee was removed.
- Verification now names both committed migrations.
- Verification now describes lifecycle equality and gate-read trapping.
- Verification now describes actual CLI command coverage.
- Endpoint, passcode, status, ordering, and low-stakes guidance remain unchanged.

### Created — workflow artifacts

- `research.md` maps relevant contracts, store behavior, feed composition, CLI, tests, and docs.
- `design.md` evaluates publication, type, version, lifecycle, gate, and CLI options.
- `structure.md` defines file boundaries, interfaces, test helpers, and ownership.
- `plan.md` sequences implementation, verification, commits, and review.
- `progress.md` records completed work, evidence, acceptance mapping, and deviations.
- `review.md` provides this handoff.

## Files deleted

None.

## Files intentionally unchanged

- `src/lib/backstage-entry.ts` remains the upstream settled six-field contract.
- `src/lib/backstage-store.ts` remains the canonical physical/public mapping and mutation layer.
- `src/pages/api/backstage/feed.ts` remains a thin dynamic edge and inherits the core change.
- `scripts/backstage-feed.ts` remains unchanged because it was already shape-transparent.
- The POST submission core and route retain their four-field insert-ready response.
- Migrations `0001` and `0002` remain unchanged.
- Package and lock files remain unchanged.
- No Worker/Wrangler configuration changed.
- Ticket phase/status frontmatter and Lisa provenance were not staged or committed.

## Acceptance mapping

### Gated feed entries carry id and completion matching the store byte-for-byte

Met.

- Runtime returns the canonical `listEntries` array directly.
- Feed type is the same `BackstageEntry` contract returned by the store.
- Lifecycle coverage deeply compares feed entries to a post-mutation canonical store read.
- Exact keys, numeric id, null completion, and timestamp completion are asserted.
- Existing text and URL byte-fidelity assertions remain.

### Results remain oldest-first

Met.

- Retrieval performs no sorting or reshaping.
- Store SQL remains `ORDER BY id ASC`.
- Three-row coverage pins insertion order.
- Post-delete coverage pins the two surviving stable ids in ascending order.
- Count equals the current serialized list length.

### Feed reflects a completed entry

Met.

- The test calls the real `setEntryCompletion` store operation.
- It uses a deterministic fixed timestamp.
- Canonical store state and feed both contain the exact timestamp.
- No sibling content changes.

### Feed reflects a deleted entry

Met.

- The test calls the real `deleteEntry` store operation.
- The deleted id is absent from the current store and feed.
- Surviving ids are not renumbered.
- Surviving values retain exact equality.

### Gate precedes any store read

Met.

- A trap store increments and throws on `prepare`.
- Missing, mismatched, and misconfigured gate cases all return normally.
- Every case asserts zero prepares.
- This proves execution order directly rather than inferring it from response contents.

### `npm run backstage:feed` prints entries unchanged beyond added fields

Met.

- The actual package script runs as a subprocess.
- A local HTTP server returns two complete six-field entries.
- Parsed stdout deeply equals the server's entries array.
- Id, null completion, timestamp completion, original fields, hard content, and order all survive.
- Production CLI code required no modification.

## Test results

### Focused retrieval acceptance

```text
node --experimental-strip-types --test test/backstage-retrieval.test.mjs

tests 13
pass 13
fail 0
cancelled 0
skipped 0
todo 0
```

This is the named ticket proof over real SQLite plus the local HTTP CLI fixture.

### Full unit suite

```text
npm test

tests 172
pass 172
fail 0
cancelled 0
skipped 0
todo 0
```

The concurrent sibling management tests are included. Their PATCH/DELETE-to-feed reflection tests
also pass with this feed contract.

### Type gate

```text
npm run typecheck

Astro: 0 errors, 0 warnings, 0 hints across 60 files
tsc --noEmit: passed
worker:types:check: generated types up to date
exit: 0
```

Astro emits an existing deprecation notice for the string `session.driver` signature. It is not a
warning/diagnostic from this work.

### Diff quality

- `git diff --check` passed before the implementation commit.
- `git diff --cached --check` passed for both ticket commits.
- Implementation staging contained only four owned paths.
- No unrelated workflow or sibling changes entered the commits.

## Coverage assessment

### Strong coverage

- Real SQLite executes the exact committed migrations in order.
- The feed is compared with the canonical store mapper, not a copied expected transformation.
- A fixed completion timestamp catches normalization or replacement.
- A real hard delete catches stale feed caching or shadow projections.
- Stable surviving ids catch accidental renumbering.
- Exact keys catch missing fields and physical/private leakage.
- Hard-content cases catch string normalization.
- Multi-row cases catch reordering.
- Gate trapping observes persistence calls directly.
- All gate denial classes are covered.
- The actual npm script covers package wiring, fetch, envelope extraction, and stdout serialization.
- Account-free/no-cookie behavior remains covered.
- Full suite protects submission/store/management consumers.
- Typecheck protects the exported feed interface and D1 compatibility.

### Intentional gaps

- No deployed Worker or remote D1 was exercised; the story explicitly assigns deployed-route e2e
  coverage to `S-008-03`.
- The thin Astro feed edge has no new edge-specific test because it performs no entry mapping.
- No browser dashboard is tested; it belongs to `S-008-03`.
- No pagination/filtering exists or is tested.
- No agent write-back is introduced.
- No concurrent mutation/read transaction behavior is newly tested; each feed read is a current
  list snapshot from the store.
- Provider failure mapping is unchanged and outside this additive payload ticket.

## Open concerns and follow-up ownership

- **Schema marker:** the feed retains `schemaVersion: 1` while adding two entry properties. This is
  deliberate because the ticket specifies an additive evolution and no version-negotiation
  mechanism exists. Consumers that strictly reject unknown JSON object keys must update; the
  repo-local CLI is proven tolerant. A future incompatible redesign should define actual version
  negotiation rather than only incrementing the literal.
- **Remote migration ordering:** deployed databases must have migration `0002` applied before code
  whose store projection selects `completed_at`. This prerequisite was established by upstream
  `T-008-01-02`; this ticket does not perform metered remote migration work.
- **Public ids:** stable ids are now intentionally visible to holders of the shared backstage
  passcode. They are management handles, not secrets or proof of identity.
- **HTTP management:** sibling `T-008-02-02` owns mutation route behavior. Its implementation landed
  concurrently and its tests pass in the full suite.
- **End-to-end UI:** `S-008-03` owns the unified authenticated dashboard and deployed route flow.

## Security and privacy review

- Gate behavior remains fail-closed.
- Direct tests prove denial before store access.
- The configured passcode is never returned.
- No cookie, account, or identity system is introduced.
- No real credential, account id, database UUID, or API token was added.
- Existing low-stakes guidance remains: entries must not carry real secrets.
- Publication is limited to the settled six-field public entry contract.

## Human attention

No critical issue is open. Reviewers should note the intentional additive schema-version decision
and the existing operational requirement to apply migration `0002` before deployment.

## Commits

- `a612bec` — Research, Design, Structure, and Plan artifacts.
- `5e76ca1` — canonical feed publication, lifecycle/gate/CLI tests, documentation, and progress.

## Final handoff

The ticket is ready for Lisa's automated transition. `review.md` is complete, all requested
artifacts exist, acceptance evidence is green, and no ticket frontmatter was modified by this work.
