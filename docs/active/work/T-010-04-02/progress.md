# Progress — T-010-04-02

## Status

Implementation is in progress. Research, Design, Structure, and Plan are complete. The
missing-route source behavior and assertions have been added; the first focused run exposed one
expected classification detail that is documented below before correction.

## Completed — baseline and hygiene

- Confirmed `test/swap-proof.test.mjs` began with no uncommitted diff.
- Confirmed the ordinary Git index was empty.
- Confirmed no `.swap-proof-*` temporary directory existed before implementation.
- Identified unrelated Codex/Lisa configuration, hooks, provenance, lock, ticket frontmatter,
  and Lisa-published work paths.
- Left all unrelated paths untouched.

## Completed — missing route mode

- Modified only `test/swap-proof.test.mjs`.
- Added a `missing` branch on the exact declared `/api/parcel-proof` route.
- The missing branch returns HTTP 404 and `not found`.
- The branch returns before ticket sequence allocation, HMAC signing, or parcel construction.
- The fixture page at `/` remains reachable.
- Existing healthy, broken, stalled, and leak server behavior remains unchanged.
- No live boundary declaration or Astro route was changed or temporarily renamed.

## Completed — expected-red scenario

- Added `missing declared route names operation and flow failures` after the healthy scenario.
- Creates a fresh isolated mirror and missing-mode fixture server.
- Runs the unchanged operation CLI and unchanged healthy Playwright flow concurrently.
- Asserts the operation child exits non-zero.
- Asserts raw operation output names `parcel-proof [operation]`.
- Asserts raw operation output contains `boundary answered HTTP 404`.
- Asserts the browser child exits non-zero.
- Asserts browser output names the awaited receipt-boundary-response step.
- Normalizes both child evidence records through the existing integration coordinator.
- Asserts aggregate failure and alternate boundary names.

## First focused run

Command:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Observed result:

- healthy scenario passed in about 0.64 seconds;
- missing-route child behavior reached all raw non-zero/name/HTTP-404 assertions;
- broken scenario passed;
- stalled scenario passed;
- leak scenario passed;
- parent failed only at the expected normalized flow-kind assertion;
- total duration about 12.45 seconds, well below the 45-second parent timeout;
- 4 subtests passed and 1 subtest failed inside the parent.

## Plan deviation — browser classification

The Plan explicitly allowed the missing browser wait to normalize as `timeout` if actual
Playwright output matched the coordinator's timeout detector. That is what occurred:

```text
actual: timeout
expected: flow
```

The missing page's response is immediate HTTP 404, but the healthy UI contract fails as a
five-second Playwright visibility wait. `failureKind()` intentionally classifies output
containing timeout language as `timeout` for browser checks. This is existing coordinator
behavior, not a source defect.

Correction:

- expect the normalized flow failure kind to be `timeout`;
- expect the formatted summary to contain `parcel-proof [timeout]`;
- retain raw operation assertions for `parcel-proof [operation]` and HTTP 404 as the direct
  missing-route diagnosis;
- retain raw browser non-zero and named awaited-step assertions as the audience-flow proof.

No architecture, file, server behavior, acceptance condition, or commit boundary changes.

## Remaining work

1. Run the exact `npm run verify` acceptance command.
2. Commit the one ticket-owned source file with `lisa commit-ticket`.
3. Complete this Progress artifact with final evidence and commit details.
4. Write `review.md` and stop on this ticket.

## Completed — classification correction

- Updated the normalized flow failure expectation from `flow` to `timeout`.
- Updated the formatted summary expectation to `parcel-proof [timeout]`.
- Retained the raw HTTP 404 assertion as the direct route-absence diagnosis.
- Retained the operation and browser non-zero assertions.
- Retained the browser named-step assertion.

## Final focused harness

Command:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Result:

- 6 tests passed;
- 0 failed, skipped, cancelled, or todo;
- healthy alternate boundary passed;
- missing declared route expected-red proof passed;
- broken, stalled, and leak proofs passed;
- missing scenario took about 5.83 seconds;
- total duration about 12.40 seconds.

## Diff and cleanup checks

- `git diff --check -- test/swap-proof.test.mjs` passed.
- Source diff contains one missing server branch and one missing-route subtest.
- No ticket diff exists in `src`, `scripts`, the live flow spec/support, Playwright config, or
  `package.json`.
- No `.swap-proof-*` temporary directory remained after the focused run.
- The ordinary Git index remained empty.

## Static verification

Command:

```sh
npm run typecheck
```

Result:

- Astro checked 65 files;
- 0 errors, warnings, or hints;
- standalone TypeScript no-emit passed;
- Wrangler confirmed `worker-configuration.d.ts` is current.

Astro emitted the existing non-failing `session.driver` deprecation notice. It is unrelated to
this ticket.

## Required end-to-end verification

Command:

```sh
npm run verify
```

Result: exit code 0. Every stage in the strict command chain completed.

### Node suite

- 186 tests passed;
- 0 failed, skipped, cancelled, or todo;
- duration about 12.63 seconds;
- swap-proof healthy, missing, broken, stalled, and leak scenarios all passed;
- the missing expected-red scenario took about 5.81 seconds;
- the swap-proof parent took about 12.38 seconds.

The increase from the previous 185-test suite is the new missing-route child proof.

### Typecheck

- Astro checked 65 files;
- 0 errors, warnings, or hints;
- TypeScript no-emit passed;
- Wrangler binding type check passed.

### Receipt integration check

- Build passed.
- Owned dev server started on loopback.
- Operation passed for `receipt` with signature verified against the out-of-band key.
- Healthy browser flow passed with one expected stalled-project skip.
- Leak check passed with 27 client assets and one response body checked.
- Normalized integration result: passed in about 3.5 seconds within the 45-second budget.
- Operation, flow, and leak records all named `receipt` and passed.
- The integration report was written to `test-results/integration-report.json`.

### Backstage phone flow

- The local D1 migration/server setup completed.
- The single mobile project test passed.
- All six named steps passed: locked view, wrong-passcode refusal, unlock/list, submit, complete,
  and delete.
- Test duration was about 0.63 seconds; project run about 2.8 seconds.

### Deploy dry-run

- Astro server build passed.
- Static index and backstage pages prerendered.
- Wrangler assembled the Worker and assets.
- Dry run reported the configured D1, Assets, version metadata, and fault-mode bindings.
- Wrangler exited at the `--dry-run` boundary without deployment.

### Existing notices

- Astro repeated the existing deprecated `session.driver` signature notice.
- Playwright/WebServer processes reported the existing `NO_COLOR`/`FORCE_COLOR` warning.
- Neither notice affected results and neither is caused by this ticket.

## Acceptance state before commit

- Omitted declared fixture route produces raw HTTP 404 operation evidence.
- Operation child exits non-zero and names `parcel-proof [operation]`.
- Healthy browser child exits non-zero at the named boundary-response wait.
- Normalized result names `parcel-proof [operation]` and `parcel-proof [timeout]`.
- The parent harness asserts these failures and remains green.
- The live declaration remains `receiptBoundary` and its Astro route remains present.
- Exact `npm run verify` passes against that restored/live exemplar.
- Source commit was the final Implement action and is now complete.

## Source commit

- Committed with `lisa commit-ticket`.
- Commit: `e772dd1d2ef47a9070dcf8b2b01bc472a59a5a32`.
- Message: `test: prove missing boundary route fails`.
- Exact include: `test/swap-proof.test.mjs`.
- Commit stat: 1 file changed, 33 insertions.
- Commit path inspection shows exactly the intended test file.
- The ticket-owned source file is clean after commit.
- The ordinary Git index remains empty.
- No `.swap-proof-*` temporary directory remains.
- Commit-scoped inspection shows no change to the live boundary, live route, scripts, browser
  consumers, Playwright config, or package command.

## Unrelated worktree state preserved

The worktree still contains orchestration-owned changes that predated or were created around the
assignment:

- `.codex/hooks.json`;
- `.lisa.toml`;
- `.lisa/.gitignore`;
- `.lisa/hooks/on-heartbeat.sh`;
- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-010-04-02.md` phase metadata;
- `.lisa-commit.lock`;
- `.lisa/hooks/on-ack.sh`;
- `.lisa/hooks/on-start.sh`;
- Lisa-published `docs/active/work/T-010-04-02/` artifacts.

None was included in the ticket source commit or altered as ticket implementation.

## Deviations from Plan

- The only behavioral-observation deviation was the pre-authorized browser classification:
  missing-route Playwright evidence normalizes to `timeout` because the declared evidence wait
  reaches its five-second bound.
- The direct operation evidence still reports immediate HTTP 404 and the `operation` kind.
- No file, architecture, acceptance, commit, or full-verification deviation occurred.
- The planned 45-second parent timeout required no change; the final harness completed in about
  12.4 seconds.

## Remaining work

1. Write `review.md` with acceptance mapping, coverage, and open concerns.
2. Stop on T-010-04-02 after Review and let Lisa handle completion publication.
