# Progress — T-010-02-01

## Status

- Phase: Implement complete.
- Plan steps complete: 8 of 9.
- Remaining at this point: Review artifact only.

## Assignment compliance

- Read `AGENTS.md` and the complete `CLAUDE.md` project context.
- Read the ticket, parent story, full RDSPI workflow, and copy standard.
- Started from ticket phase `research`.
- Wrote Research, Design, Structure, and Plan artifacts before source edits.
- Wrote every artifact to the attempt-private work directory.
- Did not edit ticket phase or status frontmatter.
- Used only `lisa commit-ticket` for ticket-owned source work.
- Used exact repository-relative include paths.

## Pre-existing and concurrent working-tree state

The following non-ticket paths were already modified or appeared while this ticket ran:

- `.codex/hooks.json`;
- `.lisa.toml`;
- `.lisa/.gitignore`;
- `.lisa/hooks/on-heartbeat.sh`;
- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-010-02-01.md`;
- `docs/active/tickets/T-010-03-01.md`;
- `tests/demo-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `.lisa-commit.lock`;
- `.lisa/hooks/on-ack.sh`;
- `.lisa/hooks/on-start.sh`;
- shared published work directories for T-010-02-01 and T-010-03-01.

These paths were preserved and excluded from the source commit. The two flow files belong
to the concurrent parallel story described by the board DAG.

## Step 1 — generic ops core

- Status: complete.
- Removed all direct receipt imports from `src/lib/ops-check.ts`.
- Imported only the portable `BoundaryContract` type.
- Made `BoundaryCheckValue` and `BoundaryCheckResult` generic over the body.
- Renamed the successful payload field from `receipt` to `body`.
- Deleted the duplicated private receipt shape assertion.
- Added a required contract argument to `runBoundaryCheck`.
- Used `contract.name` for the operation trace.
- Used `contract.assertShape` to narrow parsed JSON.
- Used `contract.verify` for keyed verification.
- Preserved keyless behavior and fetch injection.
- Made `formatBoundaryTrace` generic and removed receipt-only field reads.
- Preserved concise passed/failed trace output and failure normalization.

## Step 2 — contract-named integration core

- Status: complete.
- Removed the receipt-name import from `src/lib/integration-check.ts`.
- Added the structural `BoundaryIdentity` interface.
- Added a required boundary identity argument to `runIntegrationChecks`.
- Changed result boundary typing from the receipt literal to `string`.
- Populated every passed, failed, timed-out, and skipped result from `boundary.name`.
- Preserved sequencing, deadlines, evidence normalization, formatting, reports, and redaction.

## Step 3 — alternate contract proof

- Status: complete.
- Added a fake `parcel` contract to `test/ops-check.test.mjs`.
- Its body uses only `boundary` and numeric `proof`, not receipt fields.
- Its assertion rejects the wrong declared name or proof type.
- Its verifier accepts only a proof matching the supplied key length.
- The valid case passes, names `parcel`, returns the asserted body, and marks verification true.
- The wrong-shape case fails with assertion evidence.
- The structurally valid bad-proof case fails with signature evidence.

## Step 4 — existing test migration

- Status: complete.
- Existing ops tests explicitly pass `receiptBoundary`.
- Existing success assertions now read `result.value.body`.
- Fault coverage explicitly passes `receiptBoundary`.
- Existing integration tests explicitly pass the declaration.
- The healthy integration case uses `parcel` identity and proves all three results derive it.
- All pre-existing behavioral assertions remain in place.

## Step 5 — executable caller migration

- Status: complete.
- `scripts/ops-check.ts` explicitly passes `receiptBoundary`.
- `scripts/release-shared.ts` explicitly passes `receiptBoundary`.
- `scripts/integration-check.ts` explicitly passes `receiptBoundary`.
- URL path and environment-key resolution remain unchanged for dependent ticket T-010-02-02.

## Step 6 — verification

- Status: complete.
- Focused command:
  `node --experimental-strip-types --test test/ops-check.test.mjs test/integration-check.test.mjs test/fault.test.mjs`.
- Focused result: **25 passed, 0 failed**.
- Exact forbidden-symbol grep across both core files: **no matches**.
- Full `npm test`: **180 passed, 0 failed**.
- `npm run typecheck`: **passed**.
- Astro diagnostics: **0 errors, 0 warnings, 0 hints**.
- TypeScript `--noEmit`: passed.
- Wrangler generated-type check: types current.
- `git diff --check`: passed.
- Astro emitted its pre-existing deprecated `session.driver` notice; this ticket does not touch it.

## Step 7 — source commit

- Status: complete.
- Command mechanism: `lisa commit-ticket`.
- Commit: `0748d9c93fe707f476e9dcbe41d9c3444df0ab3a`.
- Message: `refactor: run checks from boundary contract`.
- Commit stat: 8 files changed, 134 insertions, 78 deletions.
- Exact includes:
  - `src/lib/ops-check.ts`;
  - `src/lib/integration-check.ts`;
  - `test/ops-check.test.mjs`;
  - `test/integration-check.test.mjs`;
  - `test/fault.test.mjs`;
  - `scripts/ops-check.ts`;
  - `scripts/integration-check.ts`;
  - `scripts/release-shared.ts`.
- No ordinary `git add` or `git commit` was used.
- Post-commit inspection confirms all eight ticket-owned paths are clean.

## Step 8 — implementation record

- Status: complete.
- This artifact records the baseline, implementation, tests, commit, and scope boundaries.

## Step 9 — review

- Status at this record: pending and beginning immediately.

## Deviations

- No architectural or acceptance deviation.
- Structure called the integration identity interface exported or internal; it is exported
  to document the public runner input.
- The integration healthy test was strengthened to use an alternate name rather than adding
  a separate redundant test.
- Lisa published detected attempt artifacts to the shared work path asynchronously; this
  attempt did not write there directly or include them in the source commit.
