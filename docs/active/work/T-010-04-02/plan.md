# Plan — T-010-04-02

## Implementation objective

Add an executable expected-red missing-route scenario to the existing swap-proof harness, then
prove the unchanged shipped receipt exemplar passes the full `npm run verify` chain.

## Step 1 — Establish the pre-edit baseline

1. Inspect `git status --short` immediately before editing.
2. Record unrelated dirty paths mentally and do not alter them.
3. Confirm `test/swap-proof.test.mjs` has no current uncommitted diff.
4. Confirm the ordinary Git index has no staged paths.
5. Confirm no `.swap-proof-*` temporary directory exists.

Verification criteria:

- the ticket-owned source file begins clean;
- unrelated Lisa/Codex/ticket changes remain identifiable;
- no existing temporary harness directory can be mistaken for a test leak.

## Step 2 — Add missing-route server behavior

1. Edit `startStub(mode, t)` in `test/swap-proof.test.mjs`.
2. Keep `/` page serving behavior unchanged.
3. Keep unrelated-path 404 behavior unchanged.
4. On the exact declared boundary path, branch on `mode === 'missing'`.
5. Return HTTP 404 with a small plain-text body.
6. Return before sequence allocation and signature generation.
7. Keep stalled and parcel response modes unchanged.

Verification criteria:

- the fixture page remains reachable in missing mode;
- `/api/parcel-proof` is not satisfied by a parcel handler;
- missing mode cannot accidentally produce a signed body;
- no production route or boundary file is edited.

## Step 3 — Add raw expected-red assertions

1. Add a sibling subtest immediately after the healthy scenario.
2. Name it to describe the missing declared route and both affected checks.
3. Create a fresh mirror and missing-mode server.
4. Launch operation and healthy browser-flow children concurrently.
5. Require the operation child exit code to be non-zero.
6. Require operation output to name `parcel-proof` and `[operation]`.
7. Require operation output to report `boundary answered HTTP 404`.
8. Require the flow child exit code to be non-zero.
9. Require flow output to name the boundary-response wait using stable assertion/step wording.

Verification criteria:

- an absent route cannot produce a zero operation process;
- an absent route cannot produce a zero healthy-flow process;
- raw operation evidence explains the absence as HTTP 404;
- raw operation evidence retains the declared alternate contract name.

## Step 4 — Add normalized contract assertions

1. Pass operation and flow evidence to the existing `normalize` helper.
2. Assert the aggregate result is failed.
3. Retrieve operation and flow records through `checkResult`.
4. Assert both records name `BOUNDARY_NAME`.
5. Assert operation failure kind is `operation`.
6. Assert flow failure kind is `flow` unless observed established formatting classifies the
   bounded wait as `timeout`.
7. Format the integration summary.
8. Assert the summary names `parcel-proof [operation]`.
9. Assert the summary names the flow failure for `parcel-proof`.

Verification criteria:

- cross-harness evidence is not merely non-zero but attributed to the declared contract;
- operation and browser failure slices remain distinguishable;
- parent normalization outcome is failed.

## Step 5 — Run the focused harness

Run:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Inspect:

- parent/subtest count;
- missing-route subtest status;
- total duration against the 45-second parent timeout;
- actual Playwright output classification if an assertion fails;
- cleanup of `.swap-proof-*` directories.

If the focused test fails:

- use captured child output to correct only unstable assumptions;
- do not weaken the non-zero, HTTP 404, boundary-name, or aggregate-failure requirements;
- document any plan deviation in `progress.md` before continuing;
- rerun the focused command until green.

## Step 6 — Inspect the implementation diff

1. Run `git diff -- test/swap-proof.test.mjs`.
2. Confirm only the missing route mode and subtest were added.
3. Run `git diff --check -- test/swap-proof.test.mjs`.
4. Confirm no diff in:
   - `src/lib/boundary-contract.ts`;
   - `src/pages/api/receipt.ts`;
   - `scripts/`;
   - `tests/demo-flow.spec.ts`;
   - `tests/support/flow-contract.ts`;
   - `playwright.config.ts`.
5. Confirm no new dependency or package script change exists.

Verification criteria:

- implementation matches the one-file structure blueprint;
- live receipt behavior remains untouched;
- unchanged consumer claim remains true.

## Step 7 — Run static checks

Run:

```sh
npm run typecheck
```

Verification criteria:

- Astro check passes;
- standalone TypeScript no-emit passes;
- generated Wrangler binding types remain current;
- no new warning/error is introduced by the ticket.

Although `npm run verify` repeats typecheck later, this early check isolates static failures
before the longer end-to-end run.

## Step 8 — Write interim Progress

Create `.lisa/attempts/T-010-04-02/1/work/progress.md` and record:

- server-mode implementation;
- raw missing-route assertions;
- normalized assertions;
- focused harness result and duration;
- typecheck result;
- diff/hygiene checks;
- remaining full verification and commit work;
- deviations, if any.

The artifact remains attempt-private and is not a source commit include.

## Step 9 — Run the required end-to-end verification

Run exactly:

```sh
npm run verify
```

Allow the command to run all stages without substituting narrower commands:

1. `npm test`;
2. `npm run typecheck`;
3. `npm run integration:check`;
4. `npm run test:flow:backstage`;
5. `npm run deploy:dry`.

Record for each stage:

- pass/fail outcome;
- useful test counts;
- integration summary boundary name and checks;
- backstage flow outcome;
- build/deploy-dry outcome;
- total or stage durations when reported;
- any known unrelated warnings.

Verification criteria:

- command exits zero;
- swap-proof parent suite includes the missing-route expected-red proof and remains green;
- integration check passes operation, flow, and leak against `signed-receipt`;
- backstage phone flow passes;
- dry deployment completes;
- live `receiptBoundary` is the declaration exercised by final integration.

## Step 10 — Finalize Progress before commit

Update `progress.md` with:

- complete `npm run verify` evidence;
- confirmation that the shipped receipt declaration and route remained present;
- confirmation no temporary mirrors remain;
- source commit still pending;
- any verification-generated ignored artifacts worth noting.

## Step 11 — Commit the meaningful source unit

Run Lisa's transaction-safe commit command with the exact path:

```sh
lisa commit-ticket \
  --path . \
  --ticket-id T-010-04-02 \
  --message "test: prove missing boundary route fails" \
  --include test/swap-proof.test.mjs
```

Do not use:

- `git add`;
- `git add -A`;
- ordinary `git commit`;
- an include for the attempt-private artifacts;
- an include for any unrelated orchestration or generated path.

Verification criteria:

- Lisa reports a successful commit;
- commit path list contains exactly `test/swap-proof.test.mjs`;
- ticket-owned source file is clean afterward;
- ordinary Git index remains empty;
- unrelated worktree paths are preserved.

## Step 12 — Update final Progress

Append to `progress.md`:

- commit hash;
- commit message;
- exact include path;
- commit stat;
- post-commit source cleanliness;
- ordinary-index cleanliness;
- remaining Review artifact only.

## Step 13 — Review the committed result

Inspect:

```sh
git show --stat --oneline <commit>
git show --format= --name-only <commit>
git status --short
git diff --cached --name-only
```

Review for:

- a genuinely absent declared fixture route rather than malformed response masquerading as
  absence;
- stable assertions that avoid incidental Playwright formatting;
- boundary name present in raw and normalized failure evidence;
- both operation and browser children proven non-zero;
- preserved healthy/broken/stalled/leak behavior;
- safe server and mirror cleanup;
- unchanged production receipt exemplar;
- complete acceptance-command evidence.

## Step 14 — Write Review

Create `.lisa/attempts/T-010-04-02/1/work/review.md` with:

- outcome summary;
- commit details;
- exact file modification;
- architecture/failure-path explanation;
- acceptance-criterion mapping;
- focused and full verification evidence;
- test coverage assessment;
- copy-standard scope statement;
- repository hygiene;
- open concerns, limitations, and critical issues.

## Step 15 — Stop on this ticket

- Do not modify ticket phase or status.
- Do not publish artifacts directly to `docs/active/work/T-010-04-02/`.
- Do not start another ticket.
- Remain on T-010-04-02 after `review.md` is written.
- Let Lisa verify the lease, publish artifacts, create the completion commit, and release the
  seat.

## Atomic commit map

One meaningful ticket-owned source unit is planned:

1. `test: prove missing boundary route fails`
   - `test/swap-proof.test.mjs`.

The server mode without assertions has no independent value, and the assertions without the
server mode cannot execute, so splitting them would create incomplete commits.

## Testing matrix

| Scenario | Operation | Healthy flow | Leak | Expected parent assertion |
| --- | --- | --- | --- | --- |
| Healthy | zero | zero | zero | aggregate passed |
| Missing | non-zero, HTTP 404 | non-zero, body absent | not needed | named operation + flow failure |
| Broken | non-zero, invalid proof | not needed | not needed | named operation failure |
| Stalled | non-zero timeout | non-zero timeout | not needed | named timeout failures |
| Leak | zero | not needed | non-zero | named leak failure |

## Acceptance mapping

### Deleted/omitted declared route fails loudly

- Missing mode supplies no successful handler for `/api/parcel-proof`.
- Real operation CLI exits non-zero.
- Raw trace contains alternate boundary name, operation kind, and HTTP 404.
- Real healthy Playwright flow exits non-zero.
- Normalized aggregate result is failed and names the alternate boundary.

### Reverted to receipt exemplar verifies green

- Live declaration and route are never changed.
- Exact `npm run verify` executes after the missing-route parent proof is green.
- Zero exit demonstrates test, typecheck, integration, backstage, and deploy-dry success.

## Copy review plan

- Confirm source diff contains no HTML, accessibility label, metadata, or rendered state change.
- Confirm the existing alternate fixture strings remain byte-for-byte unchanged.
- Classify new test names/assertion patterns as engineering diagnostics.
- Record that the copy standard was read but no user-facing author/review pass was triggered.

## Completion gate

Implementation is complete only when all of the following hold:

- missing-route subtest is present and green as an expected-red proof;
- operation child non-zero is asserted;
- browser child non-zero is asserted;
- raw failure names `parcel-proof` and HTTP 404;
- normalized failure names the unsatisfied contract;
- full `npm run verify` exits zero against the shipped receipt exemplar;
- ticket-owned source is committed through Lisa with an exact include;
- `progress.md` and `review.md` are complete;
- no ticket-owned source remains staged, modified, or untracked.
