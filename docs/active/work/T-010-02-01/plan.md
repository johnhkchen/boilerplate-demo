# Plan — T-010-02-01

## Baseline

1. Record the existing dirty working tree before source edits.
2. Confirm all direct runner callers with repository-wide search.
3. Confirm the dependency's contract tests pass before migration.
4. Keep all unrelated and Lisa-managed files outside ticket ownership.

## Step 1 — generic ops core

1. Replace receipt imports with the portable contract type import.
2. Parameterize value and result types by contract body.
3. Rename the successful payload from `receipt` to `body`.
4. Remove the duplicate private receipt assertion.
5. Add the required contract argument.
6. Feed its name to the operation runner.
7. Feed parsed JSON to its shape assertion.
8. Feed the asserted body and key to its verifier.
9. Keep keyless semantics unchanged.
10. Remove body-field assumptions from trace formatting.

Independent verification:

- grep the core for forbidden receipt-specific symbols;
- run the focused ops tests after their adaptation;
- verify failures remain normalized without stacks.

## Step 2 — contract-named integration core

1. Remove the receipt identity import.
2. Introduce a structural name-bearing argument.
3. Widen stored boundary result typing to `string`.
4. Replace all passed, failed, timeout, and skipped assignments with the supplied name.
5. Leave report and formatter behavior driven by stored results.

Independent verification:

- grep the core for the forbidden symbol;
- run focused integration tests;
- confirm all deadline branches still store a boundary name.

## Step 3 — alternate contract proof

1. Define a fake body with a different boundary name and field shape.
2. Define an assertion that rejects wrong identity or a non-numeric proof.
3. Define verification that accepts only the expected key/proof combination.
4. Run the generic core with a valid fake body and assert success.
5. Assert the fake name becomes the operation name.
6. Assert the returned body is the assertion's body.
7. Run with a wrong-shaped fake body and assert operation failure.
8. Run with a structurally valid bad proof and assert signature failure.

Independent verification:

- the test would fail if shape or verify were bypassed;
- the fake has no receipt timestamp, nonce, algorithm, signature, or key source.

## Step 4 — existing test migration

1. Pass `receiptBoundary` to every receipt ops invocation.
2. Update successful payload reads to `body`.
3. Pass `receiptBoundary` to fault coverage.
4. Pass `receiptBoundary` to every integration invocation.
5. Preserve all existing expected outcomes and summary text.

Independent verification:

- `test/ops-check.test.mjs` passes;
- `test/integration-check.test.mjs` passes;
- `test/fault.test.mjs` passes.

## Step 5 — executable caller migration

1. Pass `receiptBoundary` from the ops CLI.
2. Pass it from release smoke helpers.
3. Pass it from the integration CLI.
4. Do not modify route or environment resolution.

Independent verification:

- repository search finds no old one-argument runner calls;
- TypeScript type checking passes.

## Step 6 — acceptance and regression verification

Run, in order:

1. focused ops test;
2. focused integration test;
3. focused fault test;
4. forbidden-symbol grep across both core files;
5. full `npm test`;
6. `npm run typecheck`;
7. `git diff --check`;
8. exact diff and status inspection.

Acceptance criteria:

- alternate contract passes on valid shape and verification;
- alternate contract fails on wrong shape;
- alternate contract fails on bad signature;
- both named core files are grep-clean;
- existing ops and integration tests are green;
- no path/key rewiring from the dependent ticket is included;
- no unrelated working-tree changes enter the ticket diff.

## Step 7 — commit meaningful source unit

Use `lisa commit-ticket` once for the cohesive generic-core migration. Include only:

- `src/lib/ops-check.ts`;
- `src/lib/integration-check.ts`;
- `test/ops-check.test.mjs`;
- `test/integration-check.test.mjs`;
- `test/fault.test.mjs`;
- `scripts/ops-check.ts`;
- `scripts/integration-check.ts`;
- `scripts/release-shared.ts`.

Do not use ordinary `git add` or `git commit`.

Suggested commit message:

`refactor: run checks from boundary contract`

## Step 8 — implementation record

Write `progress.md` with:

- baseline and pre-existing changes;
- each completed plan step;
- exact test commands and outcomes;
- grep result;
- commit identifier and exact includes;
- deviations or absence of deviations;
- remaining review work.

## Step 9 — review

Write `review.md` with:

- source file summary;
- public API changes;
- behavior preserved;
- alternate-contract evidence;
- full test and typecheck results;
- grep acceptance evidence;
- open concerns and next-ticket boundary;
- confirmation that ticket-owned paths are clean.

Then stop on this ticket and wait for Lisa's completion handling.
