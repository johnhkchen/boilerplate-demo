# Research — T-008-02-02 gated complete/delete route

## Ticket state and required outcome

- Ticket `T-008-02-02` is in `research` phase.
- It belongs to story `S-008-02`, the backstage management HTTP seam.
- Its dependencies, `T-008-01-01` and `T-008-01-02`, are implemented and reviewed.
- The ticket adds completion and deletion by persisted entry id.
- Both operations must be behind the existing shared passcode gate.
- A valid request must mutate exactly the addressed entry.
- The changed state must be observable through the backstage feed.
- Wrong-passcode and unknown-id failures must use distinct statuses.
- Every refused operation must leave the store unchanged.
- The existing submit route must remain untouched.

## Repository execution model

- Astro is configured with `output: 'static'` plus the Cloudflare adapter.
- Individual API routes opt out of prerendering with `export const prerender = false`.
- Cloudflare runtime bindings are imported from `cloudflare:workers` at route edges.
- `worker-configuration.d.ts` exposes `DEMO_PASSCODE: string` and
  `BACKSTAGE_DB: D1Database`.
- Framework-free library cores accept their dependencies as arguments.
- Node tests execute TypeScript directly with `--experimental-strip-types`.
- HTTP cores use web-standard `Request` and `Response`, available in Node and Workers.
- API route tests inject in-memory SQLite adapters instead of emulating Astro or Workers.

## Existing entry contract

`src/lib/backstage-entry.ts` defines the canonical persisted shape:

```ts
interface BackstageEntry {
  id: number;
  type: 'reference' | 'feedback';
  url: string;
  text: string;
  submittedAt: string;
  completedAt: string | null;
}
```

- `id` is the stable D1 row handle.
- `completedAt: null` is the only incomplete state.
- A timestamp string is the completed state.
- `NewBackstageEntry` omits the database-owned id and completion fields.
- The public contract does not define an editable entry payload.

## Database schema

- `migrations/0001_create_backstage_entries.sql` creates `backstage_entries`.
- Its `id INTEGER PRIMARY KEY` is the stable mutation address.
- Content columns are `type`, `url`, `text`, and `submitted_at`.
- `migrations/0002_add_backstage_entry_completion.sql` adds nullable
  `completed_at TEXT`.
- New rows therefore begin incomplete without an explicit insert value.
- Tests apply both committed migrations in numeric order.
- SQLite is the storage engine beneath D1 and is used as the local acceptance store.

## Existing persistence boundary

`src/lib/backstage-store.ts` is pure and framework-free.

- `EntryStoreDatabase` describes the narrow `prepare` surface.
- `EntryStoreStatement` supplies `bind`, `run`, and `all`.
- Real D1 is structurally compatible with this interface.
- Node tests wrap `DatabaseSync` in the same interface.
- SQL uses positional parameter binding.
- `listEntries` selects exactly the six persisted public fields.
- Physical snake-case fields are mapped to camel-case in one private mapper.
- Results are ordered by `id ASC`, which is deterministic oldest-first order.

The dependency ticket already added the two operations this route needs:

```ts
setEntryCompletion(db, id, completedAt): Promise<boolean>
deleteEntry(db, id): Promise<boolean>
```

- Completion performs `UPDATE ... SET completed_at = ? WHERE id = ?`.
- Delete performs `DELETE ... WHERE id = ?`.
- Both use the unique primary-key predicate.
- Both return true only when exactly one row was affected.
- An unknown id returns false without a preliminary read.
- This avoids a read/write race at the future HTTP boundary.
- Store failures reject and are not translated at this layer.
- The store does not generate completion timestamps.

## Shared passcode gate

`src/lib/passcode.ts` is the existing shared low-stakes gate.

- The presented credential is read from `x-demo-passcode`.
- The configured credential is passed in from server-only `DEMO_PASSCODE`.
- Neither value is read from a public-prefixed environment variable.
- `guardPasscode(request, configured)` returns `null` when allowed.
- Otherwise it returns a finished JSON `Response`.
- Blank server configuration returns 500 `gate_misconfigured`.
- A missing presented passcode returns 401 `passcode_missing`.
- A mismatched passcode returns 403 `passcode_mismatch`.
- The gate response never includes the configured or presented value.
- Existing route cores call the gate before body parsing or store access.
- Story acceptance names the gate as the outer wall for every mutation.

## Existing submit route boundary

`src/lib/backstage-route.ts` implements only entry submission.

- `handleBackstageEntry` gates first.
- It validates JSON content type and parses the request body.
- It validates the untrusted submission contract.
- It server-stamps `submittedAt`.
- It calls `saveEntry` and returns 201.
- It safely maps missing bindings and persistence failures.

`src/pages/api/backstage/entries.ts`:

- is the existing static path;
- exports only `POST`;
- delegates to `handleBackstageEntry(request, env)`;
- owns the Cloudflare environment import.

The ticket explicitly requires this core and edge to remain untouched.

## Existing feed boundary

`src/lib/backstage-retrieval.ts` implements the gated read seam.

- It gates before checking the store binding or listing rows.
- It calls `listEntries` and returns a versioned JSON envelope.
- At the current checkout it temporarily projects entries to four fields.
- Parallel ticket `T-008-02-01` owns publication of id and completion.
- The story DAG explicitly says the feed ticket and this route ticket touch disjoint files.
- This ticket must not edit retrieval code or its tests.
- Acceptance can still verify mutation effects through whatever feed contract is present after
  the parallel ticket lands.

`src/pages/api/backstage/feed.ts` is a thin GET edge that passes request, passcode, and D1 binding
to the retrieval core.

## Dynamic route shape

- The story fixes the new edge path as `src/pages/api/backstage/entries/[id].ts`.
- Astro supplies a dynamic route segment through the handler's `params.id`.
- The edge needs PATCH and DELETE exports.
- It should contain no persistence, gate, validation, or error-mapping policy.
- Like other API edges, it must set `prerender = false`.
- It must pass `env.DEMO_PASSCODE` and `env.BACKSTAGE_DB` through a narrow core interface.

## Input boundary

- A path parameter is untrusted text even though the persisted id is a number.
- The database contract addresses positive integer primary keys.
- Missing, blank, fractional, negative, zero, exponent-form, and unsafe integer strings are not
  valid stable entry handles.
- The gate must run before path validation so unauthorized callers cannot exercise or distinguish
  management behavior.
- PATCH is described as “complete,” not as arbitrary entry editing.
- No request payload is named in the ticket or story.
- Clearing completion, editing content, soft delete, and audit history are outside this slice.

## HTTP result conventions

- Existing JSON APIs return `application/json; charset=utf-8`.
- Stable machine-readable error slugs accompany plain-language details.
- Existing gate denials keep their shared `{ gate, error, detail }` shape.
- Existing route-local errors carry a boundary marker.
- Store or binding internals are not exposed in 500 responses.
- An unknown resource is conventionally represented by 404 elsewhere in the repository.
- Wrong passcode is already fixed at 403, satisfying the need for a distinct status if unknown id
  uses 404.

## Existing test patterns

`test/backstage-route.test.mjs` is the closest route-core precedent.

- It imports a framework-free handler directly.
- It uses both committed migrations against in-memory `DatabaseSync`.
- It injects a D1-shaped adapter.
- It sends real `Request` objects.
- It parses real `Response` objects.
- It verifies success through `listEntries`.
- It verifies wrong-passcode, validation, missing-store, and safe-failure paths.

`test/backstage-store.test.mjs` already proves mutation primitives:

- completion changes only the addressed middle row;
- completion can be cleared at store level;
- delete removes only the addressed middle row;
- surviving ids and state are retained;
- unknown ids return false and do not mutate.

The new test therefore needs to prove composition, not re-prove SQL in isolation:

- gate order;
- path-id validation;
- server timestamp generation;
- store result to HTTP status mapping;
- exact target isolation at the HTTP core;
- feed observability;
- safe failure behavior;
- unchanged submission sources.

## Package and verification gates

- `npm test` enumerates test files explicitly.
- A new test file will not run unless added to the script.
- `npm run typecheck` runs Astro diagnostics, TypeScript, and generated Worker type checks.
- `npm run verify` adds integration, Playwright backstage flow, and a deploy dry run.
- This ticket's honest boundary is local Node + SQLite plus static/type validation of the edge.
- No live Worker or remote D1 operation is required.

## Repository state and concurrency

- Lisa-owned ticket phase changes and `.lisa/provenance.jsonl` are already dirty.
- They must not be edited, staged, reverted, or committed by this ticket.
- The working tree contains no application changes for this ticket at Research time.
- Parallel ticket `T-008-02-01` may change retrieval files while this work proceeds.
- Story documentation declares the two ticket file sets disjoint.
- This ticket should avoid retrieval source/test files and tolerate their concurrent evolution.

## Constraints and assumptions surfaced

- Completion means set `completedAt` to the server's current ISO timestamp.
- PATCH needs no client-owned timestamp or content payload.
- Completion is idempotent in state meaning, although a repeated PATCH refreshes the timestamp.
- Delete is a hard delete because the settled store exposes only hard deletion.
- Unknown ids must not be conflated with wrong passcodes.
- Gate denial must occur before id parsing, binding checks, timestamp generation, or mutation.
- A missing store binding is a server error after successful authorization and id validation.
- Persistence exceptions need safe 500 responses with no SQL or exception details.
- The new core should be usable under Node without importing `cloudflare:workers`.
- The Astro edge should remain a trivial adapter over that core.
- The submit core, submit edge, and submit test are regression surfaces, not change targets.

## Research conclusion

All necessary persistence and gate primitives already exist. The unimplemented boundary is the
composition layer that validates a dynamic id, generates completion time, maps mutation booleans
and failures to HTTP, and delegates from a PATCH/DELETE Astro edge. The repository's established
pure-core/thin-edge and real-SQLite route-test patterns directly cover that gap without requiring
schema, feed, form, deployment, or credential changes.
