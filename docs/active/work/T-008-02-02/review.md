# Review — T-008-02-02 gated complete/delete route

## Review verdict

The ticket acceptance criterion is met. A new framework-free management core and dynamic Astro
item edge expose passcode-gated PATCH completion and DELETE hard deletion by stable entry id. Both
operations mutate exactly one addressed row, successful state is reflected byte-for-byte through
the evolved feed, wrong credentials remain the shared 403 denial, authorized unknown ids return a
distinct 404, and every refusal tested leaves the store unchanged. The existing submission core,
edge, and tests have no ticket diff and remain green.

No critical issue requires human intervention before the dependent dashboard ticket proceeds.

## What changed

### Created — management HTTP core

`src/lib/backstage-management.ts`

- Adds the framework-free boundary for item management.
- Defines a narrow environment containing only `DEMO_PASSCODE` and `BACKSTAGE_DB`.
- Imports no Astro or Cloudflare runtime module.
- Reuses the existing shared `guardPasscode`.
- Reuses settled `setEntryCompletion` and `deleteEntry` store functions.
- Strictly parses a path id before it reaches persistence.
- Accepts only canonical positive safe integers.
- Rejects undefined, blank, zero, negative, decimal, exponent, leading-zero, and unsafe forms.
- Checks the passcode before parsing the id.
- Checks the store binding only after passcode and id validation.
- Exposes `completeBackstageEntry` for PATCH delegation.
- Exposes `deleteBackstageEntryById` for DELETE delegation.
- Uses a default server clock for completion.
- Allows tests to inject a fixed clock without changing production behavior.
- Writes a server-owned ISO completion timestamp.
- Maps false mutation results to 404 without a preliminary existence read.
- Maps store/clock exceptions to bounded operation-specific 500 responses.
- Never serializes SQL, bindings, exception messages, or credential values.

Public handler signatures:

```ts
completeBackstageEntry(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
  now?: BackstageClock,
): Promise<Response>

deleteBackstageEntryById(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
): Promise<Response>
```

Successful PATCH response:

```json
{
  "boundary": "backstage_management",
  "entry": {
    "id": 2,
    "completedAt": "2026-07-11T20:15:30.000Z"
  }
}
```

Successful DELETE response:

```json
{
  "boundary": "backstage_management",
  "deleted": { "id": 2 }
}
```

Local status/error map:

| Condition | Status | Error |
| --- | ---: | --- |
| malformed or missing path id | 400 | `invalid_entry_id` |
| authorized canonical id not present | 404 | `entry_not_found` |
| missing store binding | 500 | `store_misconfigured` |
| completion clock/store failure | 500 | `entry_completion_failed` |
| deletion store failure | 500 | `entry_delete_failed` |

Shared gate responses pass through unchanged:

- missing passcode: 401;
- wrong passcode: 403;
- server gate misconfiguration: 500.

### Created — dynamic Astro edge

`src/pages/api/backstage/entries/[id].ts`

- Opts out of static prerendering.
- Imports Cloudflare runtime env at the edge only.
- Exports PATCH and delegates directly to completion.
- Exports DELETE and delegates directly to deletion.
- Passes `params.id` without edge-local coercion.
- Contains no gate, validation, clock, persistence, or response policy.
- Exports no POST or GET.

The collection POST route remains a sibling file rather than being merged into the item route.
Astro method/path dispatch therefore keeps submission and management boundaries independent.

### Created — management acceptance tests

`test/backstage-management.test.mjs`

- Uses real in-memory SQLite.
- Executes committed migrations `0001` and `0002` in order.
- Adapts SQLite through the same narrow D1-shaped interface production uses.
- Uses real Request and Response web objects.
- Sends method-correct PATCH and DELETE requests.
- Seeds three distinct entries for target-isolation comparisons.
- Injects a fixed completion clock for exact assertions.
- Reads direct persisted state before and after each mutation.
- Reads the gated feed after successful mutations.
- Compares feed entries to the canonical persisted list.
- Exercises valid, denied, unknown, malformed, missing-binding, and thrown-store paths.

### Modified — standard unit test registration

`package.json`

- Adds `test/backstage-management.test.mjs` to the explicit `npm test` file list.
- Places management between submit-route and retrieval coverage.
- Changes no dependency, engine, version, or other script.
- Leaves `package-lock.json` unchanged.

### Created — RDSPI artifacts

- `research.md` maps runtime, contracts, store/gate primitives, route/feed boundaries, tests, and
  concurrency constraints.
- `design.md` evaluates handler placement/layout, PATCH semantics, time ownership, id validation,
  statuses, response shapes, and failure handling.
- `structure.md` defines exact files, interfaces, private helpers, test fixtures, and ownership.
- `plan.md` sequences atomic implementation, verification, commits, and review.
- `progress.md` records implementation, interim cross-ticket evidence, final green results,
  deviations, and commits.
- `review.md` is this handoff.

## Files deleted

None.

## Files intentionally unchanged by this ticket

### Existing submit route

- `src/lib/backstage-route.ts`
- `src/lib/backstage-submission.ts`
- `src/pages/api/backstage/entries.ts`
- `test/backstage-route.test.mjs`

`git diff` confirms no ticket change in the submit core, edge, or test. All ten existing submit
tests pass in the final repository suite.

### Feed implementation

- `src/lib/backstage-retrieval.ts`
- `src/pages/api/backstage/feed.ts`
- `scripts/backstage-feed.ts`
- `test/backstage-retrieval.test.mjs`
- `docs/knowledge/backstage-retrieval-seam.md`

Parallel ticket `T-008-02-01` owns and committed the canonical feed evolution. This ticket only
consumes that public behavior in its acceptance test and did not stage or commit any feed file.

### Persistence and schema

- `src/lib/backstage-entry.ts`
- `src/lib/backstage-store.ts`
- `migrations/0001_create_backstage_entries.sql`
- `migrations/0002_add_backstage_entry_completion.sql`
- `test/backstage-store.test.mjs`

Dependencies already settled identity, completion state, and exact-row mutation primitives. This
ticket composes them without schema or persistence changes.

### Runtime configuration

- `astro.config.mjs`
- `wrangler.jsonc`
- `worker-configuration.d.ts`

Existing passcode and D1 bindings cover the new route. No resource or secret contract changed.

## Acceptance mapping

### New backstage-management core and item edge

Met.

- The core exists at the story-specified library path.
- The edge exists at `/api/backstage/entries/[id]`.
- PATCH and DELETE are the only exported methods.
- Typecheck proves the dynamic param and production env satisfy handler types.
- Astro build and Wrangler dry deployment bundle the generated dynamic route chunk.

### Valid-passcode PATCH completes exactly the addressed entry

Met.

- Test seeds ids 1, 2, and 3.
- PATCH addresses id 2.
- Response is 200 and carries id 2 plus the fixed server completion timestamp.
- Direct persisted output shows only row 2 changed.
- Rows 1 and 3 remain deeply equal to their before snapshots.
- SQL target isolation remains independently covered by the store suite.

### Completion is reflected in the feed

Met.

- The test reads through `readBackstageFeed` after PATCH.
- Feed status is 200.
- Feed entries deeply equal `listEntries` after mutation.
- Entry id 2 carries the exact fixed `completedAt` value.
- Both siblings retain null completion.

### Valid-passcode DELETE removes exactly the addressed entry

Met.

- Test seeds three entries and completes a surviving sibling.
- DELETE addresses id 2.
- Response is 200 and acknowledges id 2.
- Direct persisted output contains original ids 1 and 3 only.
- Both survivors remain deeply equal to their before snapshots.
- The completed state on survivor id 3 remains intact.

### Deletion is reflected in the feed

Met.

- The post-delete feed returns count two.
- Its entries deeply equal the surviving canonical store entries.
- Deleted id 2 is absent.
- Original survivor order, ids, content, and completion state remain.

### Wrong passcode is refused and store is unchanged

Met.

- PATCH with the wrong passcode returns shared 403 `passcode_mismatch`.
- DELETE with the wrong passcode returns the same shared 403.
- Complete before/after store snapshots are deeply equal for both operations.
- A clock-call counter remains zero for denied completion.
- Wrong passcode plus malformed id still returns the gate response.
- The gate body has no management boundary marker, proving it was not wrapped.

### Unknown id is refused with a distinct status and store is unchanged

Met.

- Authorized PATCH of id 999 returns 404 `entry_not_found`.
- Authorized DELETE of id 999 returns 404 `entry_not_found`.
- 404 is distinct from the wrong-passcode 403.
- Complete before/after store snapshots remain deeply equal.
- The store boolean avoids any race-prone pre-read.

### Submit route is untouched

Met.

- No submit source/test file appears in this ticket's implementation commit.
- The new edge is an additive dynamic child route.
- Existing POST success, validation, passcode, binding, and safe-error tests remain green.

## Test results

### Focused management acceptance

```text
tests 11
pass 11
fail 0
cancelled 0
skipped 0
todo 0
```

### Combined backstage regression

```text
tests 60
pass 60
fail 0
```

Included suites:

- shared passcode gate;
- entry store;
- unchanged submit route;
- new management route core;
- evolved retrieval/feed core.

### Full repository unit suite

```text
tests 172
pass 172
fail 0
cancelled 0
skipped 0
todo 0
```

### Type gate

```text
npm run typecheck: exit 0
Astro: 60 files, 0 errors, 0 warnings, 0 hints
TypeScript: passed
Wrangler generated types: up to date
```

Astro prints the existing deprecation notice for the string `session.driver` signature. It is
informational, predates this ticket, and is unrelated to management routing.

### Build and deployment dry run

```text
npm run build: exit 0
npm run deploy:dry: exit 0
```

- Static routes prerender normally.
- Server entrypoints build.
- The generated dynamic `_id_` route module appears in the Worker bundle.
- The existing `BACKSTAGE_DB` binding is present.
- Wrangler exits at dry run without publishing or mutating remote state.

### Diff quality

- `git diff --check` passes.
- New code/test files were formatted with the repository's Prettier configuration.
- `git show --check` passes for the implementation commit.

## Coverage assessment

### Strong coverage

- Real SQLite executes the exact committed migrations rather than copied schema.
- Requests and responses use the same web primitives as Workers.
- Both success paths compare complete persisted objects, not selected fields.
- Completion checks both the mutation response and feed representation.
- Delete checks survivor identity, content, ordering, and completion state.
- Wrong-passcode tests cover both methods.
- Gate precedence is proven with malformed input and a clock spy.
- Unknown-id tests cover both methods and full-store no-op behavior.
- Malformed-id coverage spans eight coercion/overflow cases.
- Invalid ids prove zero clock and zero store-prepare calls.
- Missing binding behavior is covered.
- Both operation-specific store exception paths are covered.
- Sensitive error markers are proven absent from responses.
- Existing submit, store, gate, and retrieval suites run together.
- Static typing, production edge bundling, and dry deployment complement Node core tests.

### Intentional gaps

- Plain Node does not import the Astro edge because `cloudflare:workers` is runtime-specific.
  Typecheck, Astro build, and deploy dry run validate that deliberately thin adapter.
- No browser clicks the deployed PATCH/DELETE edge in this ticket. Story `S-008-03` owns the
  running-server Playwright flow.
- No live Worker or remote D1 request was made. The story explicitly defines Node + SQLite as this
  seam's honest boundary.
- No repeated-PATCH timestamp behavior has a dedicated test. The selected action semantics set
  completion to “now” on each accepted PATCH.
- Missing-passcode and blank-server-passcode management calls are not duplicated in the new suite;
  the same `guardPasscode` function is exercised exhaustively by its 13-test suite, while the new
  suite specifically proves wrong-passcode composition and gate precedence.
- Provider-specific D1 affected-row metadata is typechecked and normalized in the dependency
  store; local acceptance uses SQLite's top-level change count.

## Boundary and security review

### Gate ordering

Approved.

`preflight` calls `guardPasscode` before id parsing or binding inspection. Completion invokes its
clock only after successful preflight. Both mutations occur only after the same preflight. Tests
prove this order rather than relying solely on source inspection.

### Credential handling

Approved for the established low-stakes gate.

- Credential presentation remains the `x-demo-passcode` header.
- Configured passcode remains a server-only environment value.
- The management core receives it only as an argument.
- No client bundle or public-prefixed variable is introduced.
- No response echoes configured or presented values.
- No session, account, cookie, or second credential is added.

### Id handling

Approved.

- Strict syntax precedes numeric conversion.
- Safe-integer validation prevents precision aliasing.
- Store calls receive numbers, matching the typed contract.
- SQL remains parameterized inside the settled store.
- Primary-key predicates cap mutations at one row.

### Failure handling

Approved.

- Client syntax, authorization, not-found, configuration, and operation failure statuses are
  meaningfully distinct.
- Database exceptions are bounded to stable public slugs/details.
- No read-before-write race is introduced.
- Refused requests are tested as no-ops.

## Open concerns and follow-on ownership

### Repeated completion

An accepted PATCH always writes a fresh server timestamp. It is idempotent in completed/uncompleted
state but not byte-idempotent in timestamp value. This is the deliberate “complete now” action
selected for the ticket. If the future UI needs reopen or first-completed-time preservation, that
requires a deliberate contract change rather than hidden behavior here.

### Hard delete

Deletion is permanent and has no undo or audit trail. That matches the epic's explicit exclusion
of soft-delete/undo/history. The dashboard should make destructive intent clear at the UI layer.

### Runtime edge flow

Dependent `T-008-03-01` should call PATCH without inventing client timestamps and use the returned
`completedAt`. It should call DELETE at the same item URL and remove the acknowledged id. Dependent
`T-008-03-02` owns end-to-end browser proof against a running server.

### Remote migration prerequisite

Deployed D1 must have migration `0002` before code reading/writing `completed_at` runs. This is an
existing prerequisite inherited from the store ticket; no remote operation occurred here.

### Critical concerns

None.

## Commit record

- `72d3075` — Research, Design, Structure, and Plan artifacts.
- `e4fc928` — management core, dynamic edge, Node acceptance suite, test registration, and progress
  evidence.
- Parallel `5e76ca1` — feed identity/completion evolution consumed by final acceptance verification;
  owned by `T-008-02-01`, not this ticket.
- Final Review/progress artifact commit follows this document.

## Repository hygiene

- Ticket frontmatter phase/status was not edited by this work.
- Lisa provenance was not staged or committed.
- Parallel feed changes were not staged or committed by this ticket.
- No schema, migration, generated type, dependency, or lockfile changed.
- No submit core, edge, or test changed.
- No unrelated working-tree change was reverted.

## Final handoff

The management seam is ready for `T-008-03-01` to build the unified backstage dashboard. The UI
can use one shared passcode header for feed, submit, completion, and deletion; PATCH returns the
server-owned completion state, DELETE acknowledges the removed stable id, and all operation errors
have bounded statuses suitable for user-facing handling.
