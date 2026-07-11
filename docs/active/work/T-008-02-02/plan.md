# Plan — T-008-02-02 gated complete/delete route

## Objective

Deliver a gated PATCH/DELETE item-management HTTP seam over the settled backstage store. Prove
with real SQLite that only a valid passcode can complete or delete exactly the addressed entry,
that unknown ids and wrong credentials are distinct no-ops, and that successful mutations are
visible through the feed. Preserve the collection POST route unchanged.

## Working rules

- Execute every remaining RDSPI phase continuously.
- Do not edit ticket phase or status fields.
- Do not stage Lisa provenance or ticket-frontmatter changes.
- Preserve concurrent work from `T-008-02-01`.
- Avoid modifying any feed-owned file.
- Use the committed migrations in tests.
- Keep the core framework-free and environment-injected.
- Keep the Astro edge declarative and thin.
- Commit after each meaningful unit.
- Record any plan deviation before proceeding with the changed course.

## Step 1 — checkpoint the pre-implementation artifacts

Files:

- `docs/active/work/T-008-02-02/research.md`
- `docs/active/work/T-008-02-02/design.md`
- `docs/active/work/T-008-02-02/structure.md`
- `docs/active/work/T-008-02-02/plan.md`

Actions:

1. Confirm all four files exist.
2. Confirm Research is descriptive and Design owns the decisions.
3. Confirm Structure matches the selected Design.
4. Confirm this Plan sequences implementation and verification.
5. Run `git diff --check` for the four files.
6. Stage only this ticket's four work artifacts.
7. Inspect the staged diff and staged file list.
8. Commit as the RDSPI implementation plan checkpoint.

Verification:

- No ticket or `.lisa` file is staged.
- No parallel-ticket artifact is staged.
- The commit contains exactly four markdown files.

Atomic result: the implementation can be resumed from a complete blueprint.

## Step 2 — implement the management core

File:

- `src/lib/backstage-management.ts`

Actions:

1. Import the narrow store type, both mutation functions, and `guardPasscode`.
2. Define `BackstageManagementRouteEnv`.
3. Define the clock type and default clock.
4. Add the stable boundary name.
5. Add JSON and management-error response helpers.
6. Add strict canonical positive-safe-integer id parsing.
7. Add the discriminated preflight result.
8. Implement gate-first preflight.
9. Check id syntax only after gate success.
10. Check store availability only after gate and id success.
11. Implement completion with a server ISO timestamp.
12. Catch completion clock/store failures without exposing details.
13. Map an affected-row false result to 404.
14. Return a 200 completion acknowledgement.
15. Implement hard deletion with the same preflight.
16. Catch deletion failures safely.
17. Map an affected-row false result to 404.
18. Return a 200 deletion acknowledgement.

Immediate verification:

- Run TypeScript/format-adjacent inspection on the file.
- Confirm no Cloudflare or Astro import exists.
- Confirm the gate call is the first operational statement in preflight.
- Confirm timestamp generation occurs only after preflight succeeds.
- Confirm each handler makes at most one mutation call.

Atomic result: the full management policy exists independently of any framework.

## Step 3 — add the dynamic Astro edge

File:

- `src/pages/api/backstage/entries/[id].ts`

Actions:

1. Create the `entries/` directory beneath the existing API path.
2. Set `prerender = false`.
3. Import `APIRoute` as a type.
4. Import the Cloudflare runtime environment.
5. Import both management handlers.
6. Export PATCH as direct completion delegation.
7. Export DELETE as direct deletion delegation.
8. Export no other methods.

Immediate verification:

- Run `npm run typecheck` if the core compiles before tests are added.
- Confirm `params.id` is accepted as `string | undefined`.
- Confirm production `env` is structurally compatible with the narrow interface.
- Confirm the relative import resolves.
- Confirm the collection edge `src/pages/api/backstage/entries.ts` is unchanged.

Atomic result: the production route is wired without embedding domain policy.

## Step 4 — build the real-SQLite route fixture

File:

- `test/backstage-management.test.mjs`

Actions:

1. Import Node test/runtime helpers.
2. Read migrations `0001` and `0002` from their committed paths.
3. Create a fresh in-memory SQLite database per test.
4. Apply both migrations in numeric order.
5. Close databases with `t.after`.
6. Expose the narrow D1-shaped adapter.
7. Add stable entry fixture builders.
8. Add passcode-carrying Request builders.
9. Add the narrow environment builder.
10. Add a three-row seed helper returning canonical persisted snapshots.
11. Add a feed-read helper using `readBackstageFeed`.

Immediate verification:

- Run a minimal fixture test or the suite after the first success case.
- Ensure no copied schema SQL appears in the test.
- Ensure test Requests contain no cookies, sessions, or second credential.

Atomic result: acceptance scenarios use the real storage and HTTP-core boundaries.

## Step 5 — prove successful completion

Test scenario:

1. Seed three distinct rows.
2. Snapshot all six fields of each persisted entry.
3. PATCH id 2 with the valid passcode.
4. Inject a fixed completion clock.
5. Assert status 200 and JSON content type.
6. Assert the exact acknowledgement body.
7. List the store after mutation.
8. Assert row 2 alone has the fixed `completedAt`.
9. Assert rows 1 and 3 deeply equal their snapshots.
10. Read through the gated feed.
11. Assert feed success.
12. Assert feed id 2 carries the fixed completion time.
13. Assert feed siblings remain incomplete and unchanged.

Verification criterion:

- Completion is exact-row, server-timed, and publicly observable.

## Step 6 — prove successful deletion

Test scenario:

1. Seed three distinct rows.
2. Preserve a completed surviving sibling if helpful.
3. Snapshot canonical rows.
4. DELETE id 2 with the valid passcode.
5. Assert status 200 and the exact acknowledgement body.
6. List the store after mutation.
7. Assert only original ids 1 and 3 remain.
8. Assert survivor fields and state deeply equal their snapshots.
9. Read through the gated feed.
10. Assert count is two.
11. Assert id 2 is absent.
12. Assert survivor ids/order/state match the store.

Verification criterion:

- Delete is a hard, exact-row mutation and is publicly observable.

## Step 7 — prove the gate is the outer wall

Test scenarios:

1. Wrong-passcode PATCH against an existing id returns 403.
2. Store snapshot remains unchanged.
3. Injected clock is not called.
4. Wrong-passcode DELETE against an existing id returns 403.
5. Store snapshot remains unchanged.
6. Wrong-passcode PATCH with a malformed id still returns 403.
7. The response is the gate's body, not a management error body.

Verification criterion:

- Authorization precedes path interpretation, clock access, binding disclosure, and mutation.

## Step 8 — prove unknown and malformed ids are safe

Test scenarios:

1. Authorized PATCH id 999 returns 404.
2. Authorized DELETE id 999 returns 404.
3. Each response carries `entry_not_found`.
4. Each full store snapshot remains unchanged.
5. Explicitly compare 404 with wrong-passcode 403.
6. Exercise malformed ids including missing, blank, zero, negative, decimal, exponent, leading
   zero, and greater-than-safe-integer forms.
7. Assert each returns 400 `invalid_entry_id`.
8. Assert state remains unchanged.
9. Assert clock does not run for invalid completion ids.

Verification criterion:

- Client syntax errors, authorized misses, and credential denial are distinct no-ops.

## Step 9 — prove bounded configuration and storage failures

Test scenarios:

1. Valid gate and id with no store binding returns 500 `store_misconfigured`.
2. Completion with a throwing statement returns 500 `entry_completion_failed`.
3. Delete with a throwing statement returns 500 `entry_delete_failed`.
4. A sensitive exception marker appears in none of the response bodies.

Verification criterion:

- Operational failures are honest but do not leak database internals.

## Step 10 — register and run the focused suite

File:

- `package.json`

Actions:

1. Insert the new test path into the explicit `npm test` list.
2. Preserve all existing scripts and ordering otherwise.
3. Run the new suite directly:

```sh
node --experimental-strip-types --test test/backstage-management.test.mjs
```

4. Fix only ticket-owned code/tests.
5. Record test counts and results in `progress.md`.

Verification criterion:

- All management acceptance tests pass in isolation.

## Step 11 — run backstage regression coverage

Command:

```sh
node --experimental-strip-types --test \
  test/passcode.test.mjs \
  test/backstage-store.test.mjs \
  test/backstage-route.test.mjs \
  test/backstage-management.test.mjs \
  test/backstage-retrieval.test.mjs
```

Checks:

- Existing gate behavior remains green.
- Store exact-row primitives remain green.
- Submit route behavior remains green.
- New management route behavior is green.
- Concurrent/evolved feed behavior is green.

Verification criterion:

- The new seam composes without regression across the whole backstage stack.

## Step 12 — run repository gates

Commands:

```sh
npm test
npm run typecheck
npm run build
git diff --check
```

Optional proportional deployment check if local configuration and concurrent branch work permit:

```sh
npm run deploy:dry
```

Checks:

- Full unit suite passes.
- Astro and TypeScript accept the dynamic edge and core.
- Generated Worker types remain current.
- Build emits the server route successfully.
- No whitespace errors exist.
- Dry deployment bundles the new route without remote mutation.

If unrelated concurrent feed work temporarily breaks a full gate:

- do not edit the other ticket's files;
- rerun after its coherent commit lands;
- document the exact external failure and the ticket-owned focused result;
- continue safe ticket-owned work rather than reverting concurrent changes.

## Step 13 — document implementation progress

File:

- `docs/active/work/T-008-02-02/progress.md`

Record before the implementation commit:

- completed steps;
- files added/modified;
- exact handler contracts;
- gate/id/store ordering;
- test scenarios and counts;
- full verification commands and exit status;
- any warnings;
- any design/plan deviations and rationale;
- submit/feed files confirmed untouched;
- concurrent state observed but not staged.

Run `git diff --check` again after writing it.

## Step 14 — commit implementation atomically

Stage only:

- `src/lib/backstage-management.ts`
- `src/pages/api/backstage/entries/[id].ts`
- `test/backstage-management.test.mjs`
- `package.json`
- `docs/active/work/T-008-02-02/progress.md`

Before commit:

1. Inspect `git status --short`.
2. Inspect `git diff --cached --stat`.
3. Inspect `git diff --cached`.
4. Confirm no ticket, Lisa provenance, or parallel feed file is staged.
5. Commit the implementation and acceptance evidence.
6. Run `git show --check --stat HEAD`.

Atomic result: production core/edge and their complete test evidence land together.

## Step 15 — perform Review

Review actions:

1. Inspect the committed diff from the pre-implementation checkpoint through implementation.
2. Re-read the ticket acceptance criterion.
3. Map every clause to source and test evidence.
4. Confirm the POST core and edge have no diff.
5. Confirm feed-owned files have no ticket-owned diff.
6. Confirm gate-first ordering from code, not only tests.
7. Confirm strict id parsing and status separation.
8. Confirm success changes exactly one row.
9. Confirm refused requests preserve state.
10. Confirm exception text cannot escape.
11. Assess unit, integration, edge-wiring, and e2e coverage honestly.
12. Note any operational prerequisite or known limitation.
13. Identify critical human-attention items, if any.

Create `review.md` containing:

- review verdict;
- change inventory;
- acceptance mapping;
- test results;
- coverage strengths and gaps;
- security/boundary assessment;
- open concerns and follow-on ownership;
- commit record;
- repository hygiene statement.

Update `progress.md` with final Review state and final commit intent if needed.

## Step 16 — final artifact commit and stop

Actions:

1. Stage only `review.md` and any ticket-owned final `progress.md` update.
2. Inspect the staged list/diff.
3. Commit the final RDSPI handoff.
4. Run `git show --check --stat HEAD`.
5. Confirm all six artifacts exist.
6. Confirm ticket phase/status was not edited by this work.
7. Stop after `review.md` is complete; Lisa owns remaining phase transitions.

## Acceptance-to-step traceability

| Acceptance clause | Primary steps |
| --- | --- |
| new backstage-management core | 2 |
| new `/api/backstage/entries/[id]` edge | 3 |
| PATCH complete succeeds with valid passcode | 5 |
| DELETE succeeds with valid passcode | 6 |
| mutations affect exactly addressed entry | 5, 6 |
| feed reflects successful mutations | 5, 6 |
| wrong passcode refused | 7 |
| unknown id refused with distinct status | 8 |
| refused operations leave store unchanged | 7, 8 |
| submit route untouched | 3, 11, 15 |
| standard verification includes new test | 10, 12 |

## Completion criteria

- `research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md`, and `review.md` exist.
- The new core and dynamic edge match the documented interfaces.
- The focused management suite is green against real SQLite.
- Backstage regression and repository gates are green, or any unrelated concurrent failure is
  precisely documented.
- Review summarizes changes, test coverage, and open concerns.
- No ticket phase/status field is manually changed.
- No Lisa-owned or parallel-ticket file is included in this ticket's commits.
