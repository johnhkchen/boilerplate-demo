# Structure — T-008-02-02 gated complete/delete route

## Change map

This ticket creates one framework-free core, one dynamic Astro API edge, one Node route suite, and
the six required workflow artifacts. It modifies `package.json` so the new suite runs under the
standard test command. It does not modify the submit route, feed implementation, persistence
module, schema, configuration, or generated types.

## Files created

### `src/lib/backstage-management.ts`

Role: framework-free HTTP composition boundary for id-addressed backstage mutations.

Dependencies:

```ts
import type { EntryStoreDatabase } from './backstage-store.ts';
import {
  deleteEntry,
  setEntryCompletion,
} from './backstage-store.ts';
import { guardPasscode } from './passcode.ts';
```

The module does not import Astro, `cloudflare:workers`, environment globals, Node modules, or the
retrieval core.

Public environment interface:

```ts
export interface BackstageManagementRouteEnv {
  DEMO_PASSCODE?: string;
  BACKSTAGE_DB?: EntryStoreDatabase;
}
```

This matches the narrow environment style already used by `backstage-route.ts`. The production
Cloudflare environment is structurally assignable. Tests provide only the two fields required.

Public clock type:

```ts
export type BackstageClock = () => Date;
```

Public handlers:

```ts
export async function completeBackstageEntry(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
  now?: BackstageClock,
): Promise<Response>;

export async function deleteBackstageEntryById(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
): Promise<Response>;
```

The optional clock defaults internally to `() => new Date()`. Naming the deletion handler with
`ById` avoids a collision with imported store function `deleteEntry` and keeps the operation clear.

Module constant:

```ts
const BOUNDARY = 'backstage_management';
```

Private response helper:

```ts
function json(body: unknown, status: number): Response;
```

- Uses pretty JSON.
- Sets `application/json; charset=utf-8`.
- Is used for all management-local results.
- Is not used to rewrite gate responses.

Private error helper:

```ts
function error(status: number, slug: string, detail: string): Response;
```

Produces:

```ts
{
  boundary: BOUNDARY,
  error: slug,
  detail,
}
```

Private id parser:

```ts
function parseEntryId(rawId: string | undefined): number | null;
```

Rules:

- Reject undefined.
- Require `/^[1-9]\d*$/`.
- Convert with `Number`.
- Require `Number.isSafeInteger`.
- Return the positive numeric id or null.

Private preflight shape:

```ts
type ManagementPreflight =
  | { ok: true; id: number; db: EntryStoreDatabase }
  | { ok: false; response: Response };
```

Private preflight function:

```ts
function preflight(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
): ManagementPreflight;
```

Its fixed order:

1. Call `guardPasscode(request, env.DEMO_PASSCODE)`.
2. Return `{ ok: false, response: denial }` unchanged if denied.
3. Parse `rawId`.
4. Return 400 `invalid_entry_id` if parsing fails.
5. Check `env.BACKSTAGE_DB`.
6. Return 500 `store_misconfigured` if absent.
7. Return narrowed id and store.

Completion handler organization:

1. Run preflight and return its response on failure.
2. Produce `completedAt = (now ?? defaultClock)().toISOString()`.
3. Call `setEntryCompletion(db, id, completedAt)` inside `try`.
4. Catch any clock/store exception and return safe 500 `entry_completion_failed`.
5. If the store returns false, return 404 `entry_not_found`.
6. Return 200 with boundary and `{ id, completedAt }` under `entry`.

The timestamp is generated after gate, id, and binding checks. An unauthorized or malformed
request therefore does not invoke an injected clock.

Delete handler organization:

1. Run preflight and return its response on failure.
2. Call imported `deleteEntry(db, id)` inside `try`.
3. Catch any store exception and return safe 500 `entry_delete_failed`.
4. If the store returns false, return 404 `entry_not_found`.
5. Return 200 with boundary and `{ id }` under `deleted`.

Success response shapes:

```ts
{
  boundary: 'backstage_management',
  entry: { id: number, completedAt: string },
}
```

```ts
{
  boundary: 'backstage_management',
  deleted: { id: number },
}
```

Failure slugs and statuses:

| Condition | Status | Slug |
| --- | ---: | --- |
| malformed/missing id after authorization | 400 | `invalid_entry_id` |
| canonical id affects no row | 404 | `entry_not_found` |
| store binding absent | 500 | `store_misconfigured` |
| completion clock/store throws | 500 | `entry_completion_failed` |
| delete store throws | 500 | `entry_delete_failed` |

Gate conditions retain their existing 500/401/403 statuses and gate-owned bodies.

Internal boundaries:

- No request body parsing.
- No full-entry read before or after mutation.
- No direct SQL.
- No feed call from production handlers.
- No logging or exception detail in response bodies.
- No credential value in any response.
- Exactly one store mutation call per authorized canonical request.

### `src/pages/api/backstage/entries/[id].ts`

Role: dynamic Cloudflare/Astro edge for the management core.

Structure:

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  completeBackstageEntry,
  deleteBackstageEntryById,
} from '../../../../lib/backstage-management.ts';

export const PATCH: APIRoute = ({ request, params }) =>
  completeBackstageEntry(request, params.id, env);

export const DELETE: APIRoute = ({ request, params }) =>
  deleteBackstageEntryById(request, params.id, env);
```

The relative import climbs four directories from the dynamic route file to `src`, then enters
`lib`. Explicit `.ts` matches Node-importable core conventions and is accepted by this project.

The edge:

- exports no POST;
- exports no GET;
- has no body parsing;
- has no id conversion;
- has no passcode logic;
- has no persistence logic;
- has no response construction;
- passes production environment bindings unchanged.

Astro selects PATCH versus DELETE. Unsupported methods retain framework behavior.

### `test/backstage-management.test.mjs`

Role: ticket acceptance suite over the framework-free core, committed migrations, real SQLite,
and feed observation.

Imports:

- Node strict assert.
- `readFileSync`, path helpers, `DatabaseSync`, and `node:test`.
- `completeBackstageEntry` and `deleteBackstageEntryById`.
- `listEntries` and `saveEntry` for setup/direct state snapshots.
- `readBackstageFeed` for public read-seam verification.
- `PASSCODE_HEADER` for request construction.

Fixture structure:

- Read migrations `0001` and `0002` from committed files.
- Create one in-memory `DatabaseSync` per test.
- Execute both migrations in order.
- Register `t.after(() => db.close())`.
- Adapt `prepare -> bind -> run/all` exactly like existing backstage route tests.

Test constants/builders:

```js
const PASSCODE = 'open-the-backstage-door';
const COMPLETED_AT = '2026-07-11T20:15:30.000Z';
const ROUTE_URL = 'https://demo.example/api/backstage/entries/';
```

- `entry(overrides)` creates insert-ready fixtures.
- `request(id, passcode)` creates a request with only the shared passcode header.
- `env(store, configured)` builds the narrow management environment.
- `seedThree(store)` inserts three distinct entries and returns the persisted snapshot.
- `feed(store)` calls the real retrieval core with the valid passcode and parses its response.

Primary success test: completion.

- Seed three rows.
- Complete id 2 with a fixed clock.
- Assert status 200 and exact response.
- Assert id 2 has the fixed `completedAt`.
- Assert id 1 and id 3 remain deeply equal to their snapshots.
- Read the feed and assert entry 2 carries the same state.
- Assert no other entry is completed.

Primary success test: delete.

- Seed three rows and complete a surviving sibling if useful.
- Delete id 2.
- Assert status 200 and exact response.
- Assert direct list contains original rows 1 and 3 only.
- Assert their ids/content/state are unchanged.
- Read the feed and assert id 2 is absent and count is two.

Authorization isolation tests:

- Wrong-passcode PATCH returns 403 `passcode_mismatch` and preserves snapshot.
- Wrong-passcode DELETE returns 403 and preserves snapshot.
- Wrong passcode with malformed id still returns 403, proving gate precedence.
- An injected clock can count calls and remain uncalled on denial.

Unknown-id tests:

- Authorized PATCH id 999 returns 404 `entry_not_found` and preserves snapshot.
- Authorized DELETE id 999 returns 404 and preserves snapshot.
- These statuses are explicitly not equal to wrong-passcode 403.

Input tests:

- A table of undefined, empty, zero, negative, decimal, exponent, leading-zero, and unsafe ids
  returns 400 after authorization.
- Every case preserves a seeded snapshot.
- The store does not need to be instrumented if unchanged persisted state proves no successful
  mutation; a focused spy can additionally prove no `prepare` call for malformed ids.

Configuration/failure tests:

- Missing store after valid gate/id returns safe 500 `store_misconfigured`.
- A throwing store returns `entry_completion_failed` for PATCH.
- A throwing store returns `entry_delete_failed` for DELETE.
- Sensitive exception text does not appear in response text.

The suite should avoid importing `[id].ts`, because plain Node cannot resolve its
`cloudflare:workers` import. Astro/type/build checks validate that thin wiring.

### `docs/active/work/T-008-02-02/research.md`

Maps the ticket, project runtime, settled contract/schema/store, gate, route/feed boundaries, test
patterns, concurrency, and constraints without prescribing implementation.

### `docs/active/work/T-008-02-02/design.md`

Evaluates core placement, handler layout, PATCH semantics, clock ownership, id parsing, statuses,
responses, error mapping, edge shape, and test strategy.

### `docs/active/work/T-008-02-02/structure.md`

Defines this file-level blueprint and public/private boundaries.

### `docs/active/work/T-008-02-02/plan.md`

Will sequence implementation, focused verification, regression gates, commits, and review.

### `docs/active/work/T-008-02-02/progress.md`

Will track executed work, test evidence, commits, and deviations.

### `docs/active/work/T-008-02-02/review.md`

Will provide final inventory, acceptance mapping, coverage assessment, and open concerns.

## Files modified

### `package.json`

Role: authoritative default unit-suite enumeration.

Change:

- Add `test/backstage-management.test.mjs` to the existing `test` script.
- Place it after `test/backstage-route.test.mjs` and before retrieval tests, grouping collection
  submit, item management, and feed behavior.
- Make no dependency, version, engine, or other script change.

## Files intentionally unchanged

### Submit path

- `src/lib/backstage-route.ts`
- `src/lib/backstage-submission.ts`
- `src/pages/api/backstage/entries.ts`
- `test/backstage-route.test.mjs`

These establish and verify POST submission. The new dynamic child route is additive and does not
alter collection POST behavior.

### Feed path

- `src/lib/backstage-retrieval.ts`
- `src/pages/api/backstage/feed.ts`
- `scripts/backstage-feed.ts`
- `test/backstage-retrieval.test.mjs`

Parallel ticket `T-008-02-01` owns their evolution to publish identity and completion. The new test
consumes that public core but does not modify it.

### Store and schema

- `src/lib/backstage-entry.ts`
- `src/lib/backstage-store.ts`
- `migrations/0001_create_backstage_entries.sql`
- `migrations/0002_add_backstage_entry_completion.sql`

The dependencies already settled identity, completion state, exact-row mutations, and migration
order. This ticket composes those APIs without expanding them.

### Runtime configuration

- `astro.config.mjs`
- `wrangler.jsonc`
- `worker-configuration.d.ts`
- `package-lock.json`

The edge uses already-declared bindings and adds no package.

### Lisa-owned state

- `docs/active/tickets/T-008-02-02.md`
- `.lisa/provenance.jsonl`

Phase/status transitions remain Lisa-owned and must not be staged or committed.

## Implementation ordering

1. Add the framework-free core and its complete private/public structure.
2. Add the dynamic edge and typecheck its import/handler signatures.
3. Add the real-SQLite management route suite.
4. Add the new test to `package.json`.
5. Run focused management, store, submit, and retrieval tests.
6. Run full unit and type gates.
7. Inspect concurrent feed changes and adapt only test expectations if required without taking
   ownership of feed files.
8. Record results and deviations in `progress.md`.
9. Commit meaningful units without Lisa-owned files.
10. Review the final diff and write `review.md`.

## Structural acceptance mapping

- New management core: `src/lib/backstage-management.ts`.
- New dynamic PATCH/DELETE edge: `src/pages/api/backstage/entries/[id].ts`.
- Existing gate composed first: private preflight in the core.
- Exact-row mutations: settled store functions called once with parsed id.
- Valid completion observable in feed: management test calls the retrieval core after mutation.
- Valid deletion observable in feed: same test boundary after delete.
- Wrong passcode distinct: shared 403 and no mutation.
- Unknown id distinct: management-local 404 and no mutation.
- Submit route untouched: no submit file in the change map; existing route tests remain green.
