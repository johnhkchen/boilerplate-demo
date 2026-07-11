# Design — T-008-02-02 gated complete/delete route

## Decision summary

Add a framework-free management core with one handler for completion and one for deletion. Both
handlers receive a `Request`, raw path id, and injected route environment. Both call the existing
`guardPasscode` before any id parsing or store interaction. PATCH takes no body and writes a
server-generated ISO timestamp. DELETE performs the settled hard delete. Authorized unknown ids
return 404; wrong credentials retain the shared gate's 403. A thin dynamic Astro edge delegates
PATCH and DELETE to those handlers.

## Decision drivers

1. The shared passcode must be the outer wall.
2. The new edge must be testable in Node without Cloudflare module emulation.
3. Only a canonical persisted id may reach the store.
4. Completion time must be server-owned.
5. Exactly one addressed row may change.
6. Unknown id must be distinguishable from wrong passcode.
7. Refused requests must leave all store state unchanged.
8. Persistence failures must not leak database details.
9. Feed state must reflect successful mutations through the canonical store.
10. The submit route must remain untouched.
11. The parallel feed ticket's file ownership must remain disjoint.
12. The future dashboard needs a simple response it can consume.

## Core placement options

### Option A — new `src/lib/backstage-management.ts`

Advantages:

- Matches the story's named architecture.
- Mirrors the existing `backstage-route.ts` framework-free boundary.
- Keeps submit and management responsibilities separate.
- Can import passcode and store primitives directly.
- Runs under Node with injected dependencies.
- Gives the Astro edge almost no policy.

Costs:

- Adds one module and a small amount of JSON/error helper repetition.

Assessment: chosen. The story explicitly names this boundary, and separation protects the submit
route from management expansion.

### Option B — add PATCH/DELETE logic to `backstage-route.ts`

Advantages:

- Reuses existing helpers in one file.
- Adds no new core module.

Costs:

- Violates the requested new management-core boundary.
- Mixes collection POST semantics with item mutation semantics.
- Makes “submit route untouched” harder to demonstrate.
- Increases conflict risk around an established, reviewed route.

Assessment: rejected.

### Option C — implement policy directly in `[id].ts`

Advantages:

- Fewest files.
- Direct access to params and environment.

Costs:

- Node tests would need Astro/Cloudflare emulation or would skip the real logic.
- Mixes framework wiring, credential gating, parsing, time, and persistence.
- Contradicts the repository's pure-core/thin-edge pattern.

Assessment: rejected.

## Handler organization options

### Option A — two public operation-specific handlers with shared private helpers

Shape:

```ts
completeBackstageEntry(request, rawId, env, now?)
deleteBackstageEntry(request, rawId, env)
```

Advantages:

- The edge maps PATCH and DELETE without operation strings.
- Each handler's success response is statically clear.
- Shared gate/id/store/error helpers prevent policy drift.
- Tests can name the exact operation under test.
- DELETE does not receive an irrelevant clock.

Costs:

- Each handler has a short common prelude.

Assessment: chosen.

### Option B — one handler switched on request method

Advantages:

- Centralizes dispatch.

Costs:

- Repeats routing work Astro already performs.
- Requires a 405 policy inside the core.
- Makes direct handler tests less explicit.
- Couples the core to method text rather than operation intent.

Assessment: rejected.

### Option C — one handler with an explicit operation argument

Advantages:

- Avoids method inspection.
- Can share all setup in one function.

Costs:

- The call site can pair the wrong operation with an HTTP export.
- Return bodies become a union with less direct types.
- An operation-specific public surface is easier to review.

Assessment: rejected.

## PATCH payload options

### Option A — no body; PATCH means “mark complete now”

Advantages:

- Matches the ticket phrase “PATCH complete.”
- The client cannot forge completion time.
- No content-type or JSON validation surface is needed.
- Future dashboard code can issue a minimal request.
- The endpoint cannot accidentally become a general edit route.

Costs:

- Repeated PATCH refreshes `completedAt` rather than preserving the first time.
- The route does not expose store-level clearing back to null.

Assessment: chosen. The epic needs mark-complete and delete; reopening/editing is not in scope.

### Option B — body `{ completed: true | false }`

Advantages:

- Supports both completing and reopening.
- Maps naturally to a checkbox.

Costs:

- Reopening is not required by the ticket or story.
- Adds parsing, content type, validation, and another failure family.
- Makes PATCH broader than the named “complete” operation.

Assessment: rejected for this slice.

### Option C — body `{ completedAt: string | null }`

Advantages:

- Mirrors the persisted representation.
- Allows deterministic client-selected state.

Costs:

- Lets an untrusted client own server state time.
- Requires timestamp validation.
- Leaks persistence representation into an action API.

Assessment: rejected.

## Timestamp generation options

### Option A — default injected clock returning a `Date`

The completion handler accepts an optional `now` dependency whose default returns `new Date()`.
It writes `now().toISOString()`.

Advantages:

- Production uses server time with no edge complexity.
- Tests can inject a fixed time.
- Exact response/feed/store equality is deterministic.
- The store remains clock-free.

Costs:

- Adds one optional handler argument.

Assessment: chosen.

### Option B — call `new Date()` with no seam

Advantages:

- Smaller signature.

Costs:

- Tests can only use format/range assertions.
- Exact acceptance evidence is less legible.

Assessment: rejected because a tiny default dependency materially improves deterministic tests.

### Option C — generate time in the Astro edge

Advantages:

- The core receives an already-settled timestamp.

Costs:

- Moves domain policy into the framework adapter.
- Every future adapter must repeat it.
- Tests no longer cover the production timestamp decision.

Assessment: rejected.

## Path id parsing options

### Option A — strict canonical positive safe integer

Accept only `/^[1-9]\d*$/`, convert with `Number`, then require `Number.isSafeInteger`.

Advantages:

- Matches positive SQLite primary keys.
- Rejects whitespace, signs, decimals, exponent notation, zero, and unsafe values.
- Prevents multiple textual aliases for one row.
- Keeps database binding numeric.

Costs:

- A leading-zero spelling such as `01` is rejected even though it could map to row 1.

Assessment: chosen. Dynamic resource handles benefit from one canonical syntax.

### Option B — `Number(rawId)` plus integer checks

Advantages:

- Very short.
- Accepts a wide range of numeric spellings.

Costs:

- Whitespace, plus signs, exponent form, and leading zeros can alias an id.
- Empty text can become zero.

Assessment: rejected.

### Option C — pass the string to SQLite

Advantages:

- SQLite may coerce ordinary numeric strings.

Costs:

- Violates the store's numeric TypeScript contract.
- Pushes untrusted validation into engine coercion.
- Makes malformed/unknown distinctions unpredictable.

Assessment: rejected.

## Validation status options

### Option A — malformed id 400, unknown canonical id 404

Advantages:

- Distinguishes syntax failure from missing resource.
- Makes client defects diagnosable.
- Wrong passcode remains separately 403.
- Neither case invokes a successful mutation.

Costs:

- Authorized callers can distinguish malformed from absent ids.

Assessment: chosen. This is an authorized low-stakes management surface, and clear statuses help
the dashboard and tests.

### Option B — all invalid/unknown ids 404

Advantages:

- Smaller public error vocabulary.
- Reveals less about id syntax.

Costs:

- Hides client path construction bugs.
- Requires less precise tests.

Assessment: rejected.

## Gate ordering

The order for both handlers is fixed:

1. Call `guardPasscode`.
2. Return its response verbatim when denied.
3. Parse and validate the path id.
4. Confirm the store binding exists.
5. Generate completion time only for PATCH.
6. Call exactly one store mutation.
7. Map false to 404.
8. Map a thrown store error to safe 500.
9. Return the operation success response.

This order means wrong-passcode traffic cannot learn whether an id is malformed, whether an entry
exists, whether the store binding is present, or whether persistence is healthy. It also cannot
cause the clock or database mutation to run.

## Response design

Successful PATCH returns 200 JSON:

```json
{
  "boundary": "backstage_management",
  "entry": { "id": 2, "completedAt": "2026-07-11T20:15:30.000Z" }
}
```

Successful DELETE returns 200 JSON:

```json
{
  "boundary": "backstage_management",
  "deleted": { "id": 2 }
}
```

Rationale:

- 200 allows a useful JSON acknowledgement for the future dashboard.
- PATCH exposes the exact server-owned state just persisted.
- DELETE confirms the stable handle removed.
- Neither response re-reads the store or invents a full entry representation.
- The boundary marker matches existing route-local error conventions.

Route-local failures use `{ boundary, error, detail }`:

- 400 `invalid_entry_id`;
- 404 `entry_not_found`;
- 500 `store_misconfigured`;
- 500 `entry_completion_failed`;
- 500 `entry_delete_failed`.

Gate failures remain the shared gate response rather than being wrapped.

## Store failure behavior

### Chosen — catch at the management core and return operation-specific safe 500

Advantages:

- SQL, binding data, and exception text never reach the client.
- Matches the submit core's safe write-error treatment.
- Distinguishes completion failure from delete failure for operators/clients without leaking cause.

Costs:

- The client cannot distinguish transient from permanent persistence failure.

Assessment: appropriate for this small route. Observability can capture server exceptions in a
future operational layer; public responses remain bounded.

## Edge design

Create `src/pages/api/backstage/entries/[id].ts`:

- `export const prerender = false`;
- import `APIRoute`, Cloudflare `env`, and both core handlers;
- PATCH passes `request`, `params.id`, and `env` to completion;
- DELETE passes the same inputs to deletion;
- export no POST or GET;
- contain no branching beyond delegation.

Astro owns unsupported-method behavior. The collection POST path remains a different file and is
unchanged.

## Test design

Create `test/backstage-management.test.mjs` and add it to `npm test`.

Use the established real-SQLite fixture over migrations 0001 and 0002. Exercise the core with real
Requests and Responses and observe state through both `listEntries` and `readBackstageFeed`.

Primary scenarios:

1. PATCH with valid passcode completes the middle of three entries at a fixed injected time.
2. The response carries the exact id and timestamp.
3. Sibling entries remain deeply unchanged.
4. The gated feed reflects the completed state.
5. DELETE with valid passcode removes the addressed middle entry.
6. Siblings retain original ids, fields, order, and completion state.
7. The feed no longer contains the deleted entry.
8. Wrong-passcode PATCH returns 403 and leaves the full store unchanged.
9. Wrong-passcode DELETE returns 403 and leaves the full store unchanged.
10. Unknown-id PATCH returns 404 and leaves the full store unchanged.
11. Unknown-id DELETE returns 404 and leaves the full store unchanged.
12. Wrong passcode precedes malformed-id handling.
13. Malformed ids return 400 after authorization and do not mutate.
14. Missing store returns a safe 500.
15. Thrown update/delete errors return safe operation-specific 500 bodies.

The test can import the pure core but not the Astro edge because its Cloudflare runtime import is
not available in plain Node. `npm run typecheck` and build/deploy dry validation cover edge wiring.
This matches the story's stated honest boundary.

## Rejected scope

- No changes to `backstage-route.ts` or `entries.ts` POST edge.
- No feed source or retrieval test changes; parallel `T-008-02-01` owns them.
- No arbitrary edit endpoint.
- No reopen operation.
- No client-provided completion timestamp.
- No soft delete, undo, audit record, assignment, notification, or identity system.
- No schema or migration change.
- No account, session, cookie, or second credential.
- No live Cloudflare mutation or remote migration.

## Final design decision

The selected design composes existing trusted primitives at one new untrusted boundary. Strict
input parsing, gate-first ordering, server-owned time, boolean mutation results, safe error maps,
and deterministic SQLite/feed tests satisfy the ticket while preserving disjoint ownership and
the submit route's established contract.
