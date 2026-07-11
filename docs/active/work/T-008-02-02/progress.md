# Progress — T-008-02-02 gated complete/delete route

## Current state

- Research: complete.
- Design: complete.
- Structure: complete.
- Plan: complete.
- Implement: complete.
- Verification: complete and green against the evolved feed contract.
- Review: in progress.

## Pre-implementation checkpoint

Commit:

```text
72d3075 docs(T-008-02-02): research through implementation plan
```

Committed files:

- `docs/active/work/T-008-02-02/research.md`
- `docs/active/work/T-008-02-02/design.md`
- `docs/active/work/T-008-02-02/structure.md`
- `docs/active/work/T-008-02-02/plan.md`

The staged list contained exactly those four files. Lisa-owned ticket/provenance changes and the
parallel ticket's artifacts were not staged.

## Implementation completed

### Framework-free management core

Created `src/lib/backstage-management.ts`.

Implemented public boundaries:

```ts
completeBackstageEntry(request, rawId, env, now?)
deleteBackstageEntryById(request, rawId, env)
```

Implemented narrow injected environment:

- optional `DEMO_PASSCODE` for fail-closed gate behavior;
- optional `BACKSTAGE_DB` for explicit misconfiguration handling;
- no direct environment or Cloudflare import.

Implemented shared preflight order:

1. Existing `guardPasscode` runs first.
2. A denial response returns unchanged.
3. The raw route id is parsed.
4. Only canonical positive safe integers are accepted.
5. The store binding is checked.
6. The handler receives a narrowed numeric id and store.

This ordering prevents an unauthorized caller from reaching:

- id validation behavior;
- store-binding disclosure;
- injected clock access;
- persistence preparation;
- affected-row/existence behavior.

Implemented completion behavior:

- server clock defaults to `new Date()`;
- deterministic tests can inject a fixed `Date`;
- the resulting ISO string is passed to `setEntryCompletion`;
- false affected-row result becomes 404 `entry_not_found`;
- thrown clock/store failures become safe 500 `entry_completion_failed`;
- success is 200 with the exact id and persisted completion timestamp.

Implemented delete behavior:

- calls the settled `deleteEntry` store primitive exactly once;
- false affected-row result becomes 404 `entry_not_found`;
- thrown store failures become safe 500 `entry_delete_failed`;
- success is 200 with the deleted stable id.

Implemented bounded local errors:

- 400 `invalid_entry_id`;
- 404 `entry_not_found`;
- 500 `store_misconfigured`;
- 500 `entry_completion_failed`;
- 500 `entry_delete_failed`.

All management-local bodies name `backstage_management`. Gate bodies keep the shared gate shape
and statuses. No caught exception message is serialized.

### Dynamic Astro edge

Created `src/pages/api/backstage/entries/[id].ts`.

- Opts out of prerendering.
- Imports the production Cloudflare environment only at the edge.
- PATCH delegates request, `params.id`, and env to completion.
- DELETE delegates the same inputs to deletion.
- Exports no POST or GET.
- Contains no validation, gating, time, persistence, or response policy.

The existing collection POST source remains unchanged:

- `src/lib/backstage-route.ts`
- `src/pages/api/backstage/entries.ts`

### Acceptance suite

Created `test/backstage-management.test.mjs`.

Fixture properties:

- uses in-memory `node:sqlite`;
- executes committed migrations `0001` and `0002` in order;
- exposes the narrow D1-shaped prepare/bind/run/all surface;
- closes each database after its test;
- uses real web-standard Request and Response objects;
- sends method-correct PATCH and DELETE requests;
- uses only the shared passcode header.

Implemented 11 tests:

1. Valid PATCH completes exactly id 2 of three at a fixed timestamp.
2. The completion response carries the exact persisted timestamp.
3. Direct store comparison proves both siblings are unchanged.
4. The gated feed is expected to equal the complete persisted store.
5. Valid DELETE removes exactly id 2 of three.
6. Surviving ids/content/completion remain unchanged.
7. The gated feed is expected to omit the deleted row and retain full survivor state.
8. Wrong-passcode PATCH is 403, does not call the clock, and preserves the store.
9. Wrong-passcode DELETE is 403 and preserves the store.
10. Wrong passcode precedes malformed-id handling.
11. Authorized unknown PATCH and DELETE ids are distinct 404 no-ops.
12. Eight malformed id forms are 400 before clock/store access.
13. A missing store is a safe 500.
14. Completion and delete exceptions are safe operation-specific 500s.

The numbered source test count is 11 because closely related assertions/scenarios are grouped
inside single Node tests.

### Default test registration

Modified `package.json` only to add `test/backstage-management.test.mjs` to the explicit `npm test`
file list. No dependency, lockfile, engine, version, or other script changed.

## Verification performed

### Focused management suite — first run

Command:

```sh
node --experimental-strip-types --test test/backstage-management.test.mjs
```

Result:

```text
tests 11
pass 9
fail 2
```

Passing evidence covers:

- valid completion mutation and target isolation before feed assertion;
- valid hard delete and target isolation before feed assertion;
- wrong-passcode PATCH/DELETE no-ops;
- gate-first ordering;
- unknown-id 404 no-ops;
- malformed-id 400 handling before clock/store access;
- missing binding mapping;
- safe completion/delete failure mapping.

The two failures occur only at final feed equality assertions. The current parallel-ticket state
still runs `toCurrentFeedEntry`, which deliberately strips `id` and `completedAt`. Actual feed
content/count already reflect the mutations, but the full canonical state cannot compare equal
until `T-008-02-01` removes that temporary projection as its acceptance requires.

### Full unit suite — interim run

Command:

```sh
npm test
```

Result:

```text
tests 169
pass 167
fail 2
```

The only failures are the same two explicit cross-ticket feed-shape assertions. All existing
tests, including all ten submit-route tests and the current retrieval suite, pass.

### Type gate

Command:

```sh
npm run typecheck
```

Result: exit 0.

- Astro: 60 files, 0 errors, 0 warnings, 0 hints.
- TypeScript: passed.
- Wrangler generated types: current.
- The existing deprecated string `session.driver` notice remains informational and unrelated.

This validates:

- dynamic route placement;
- relative core import;
- `params.id` type;
- handler return types;
- production Cloudflare environment structural compatibility.

### Astro build

Command:

```sh
npm run build
```

Result: exit 0.

- Static pages prerendered.
- Server entrypoints built.
- Cloudflare adapter completed.
- The new dynamic route bundles successfully.

### Cloudflare deploy dry run

Command:

```sh
npm run deploy:dry
```

Result: exit 0.

- Astro rebuilt successfully.
- Wrangler used the generated redirected configuration.
- The module table contains the generated dynamic `_id_` route chunk.
- The bundle retains the existing `BACKSTAGE_DB` D1 binding.
- Total upload preparation completed.
- `--dry-run` exited without publishing or mutating remote state.

### Diff and formatting hygiene

- Initial `git diff --check`: passed.
- Prettier check identified mechanical style differences in the three new code/test files.
- Ran repository Prettier over those three files.
- Follow-up `git diff --check`: passed.
- Submit route/core/test diff: empty.

## Concurrency record

Parallel ticket `T-008-02-01` is active in the same worktree as designed by story `S-008-02`.
Observed artifacts progressed through:

- `research.md`;
- `design.md`;
- `structure.md`.

No retrieval source, retrieval test, CLI, or feed artifact has been edited or staged by this
ticket. The management acceptance test intentionally consumes the future canonical feed contract
rather than weakening its assertion to the temporary four-field projection.

## Deviations from plan

### Interim red feed assertions

The plan anticipated that the parallel feed ticket might not land before the first implementation
test run. This occurred. The implementation did not alter feed-owned files and did not dilute the
acceptance assertion. Work continued through type/build/hygiene verification while the disjoint
ticket proceeds.

No design deviation was required.

### Artifact length

The pre-implementation artifacts exceed the workflow's approximate 200-line forcing function in
Design, Structure, and Plan because they record explicit alternatives, interfaces, test cases, and
continuous execution steps. They remain structured and ticket-specific.

## Remaining implementation-phase work

All implementation-phase work is complete. Review remains.

## Implementation checkpoint

Commit:

```text
e4fc928 feat(T-008-02-02): add gated entry management routes
```

Committed files:

- `src/lib/backstage-management.ts`
- `src/pages/api/backstage/entries/[id].ts`
- `test/backstage-management.test.mjs`
- `package.json`
- `docs/active/work/T-008-02-02/progress.md`

The commit excluded Lisa-owned state and every parallel feed file. `git show --check` passed.

## Final verification after feed evolution

Parallel `T-008-02-01` removed the temporary four-field projection in the shared worktree. This
ticket did not edit those files. With the canonical six-field feed available, all previously
pending acceptance assertions passed.

### Focused management suite — final

```text
tests 11
pass 11
fail 0
cancelled 0
skipped 0
todo 0
```

The same two tests that had exposed the temporary feed mismatch now prove:

- a PATCH completion timestamp is returned byte-for-byte through the feed;
- a DELETE removes the addressed id from the feed;
- feed entries equal the canonical persisted list after each mutation.

### Combined backstage regression — final

Command:

```sh
node --experimental-strip-types --test \
  test/passcode.test.mjs \
  test/backstage-store.test.mjs \
  test/backstage-route.test.mjs \
  test/backstage-management.test.mjs \
  test/backstage-retrieval.test.mjs
```

Result:

```text
tests 60
pass 60
fail 0
```

This covers the shared gate, persistence primitives, unchanged POST core, new management core,
and evolved feed core together against the current shared branch state.

### Full unit suite — final

Command:

```sh
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
```

### Type gate after feed evolution

Command:

```sh
npm run typecheck
```

Result: exit 0.

- Astro: 60 files, 0 errors, 0 warnings, 0 hints.
- TypeScript compilation passed.
- Wrangler reports generated Worker types up to date.
- Only the pre-existing informational session-driver deprecation notice remains.

## Implement phase verdict

Complete. The management core and edge satisfy the ticket boundary, every ticket-owned acceptance
test passes, full regressions are green, deployment bundling is proven by dry run, and no submit or
parallel feed file was changed by this ticket.

## Repository hygiene

- Lisa-owned ticket frontmatter changes remain unstaged.
- `.lisa/provenance.jsonl` remains unstaged.
- Parallel `T-008-02-01` artifacts remain unstaged.
- No migration or schema file changed.
- No generated type changed.
- No package lock changed.
- No submit path file changed.
- No feed path file changed by this ticket.
