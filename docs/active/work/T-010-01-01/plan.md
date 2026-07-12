# Plan — T-010-01-01

## Implementation objective

Create the portable boundary contract and its receipt instance, lock it with a
focused unit test, register that test in the aggregate suite, verify portability
and regressions, and commit only the exact ticket-owned source paths through Lisa.

## Preconditions

- Research, Design, and Structure artifacts exist in the attempt-private work
  directory.
- The active ticket remains under Lisa control.
- Pre-existing working-tree modifications are known and excluded.
- No consumer migration is included in this ticket.
- The copy standard has been applied to stored public literals.

## Step 1 — create the portable contract module

Create `src/lib/boundary-contract.ts`.

Actions:

1. Import `BOUNDARY_NAME` and `verifyReceipt` from `receipt.ts`.
2. Import the `Receipt` type separately.
3. Define and export `BoundaryEvidence`.
4. Define and export `BoundaryLandmark`.
5. Define and export generic `BoundaryContract<Body>`.
6. Define exact nonce and signature lowercase-hex regexes.
7. Define the private receipt shape validator.
8. Validate object identity before reading fields.
9. Validate the boundary name separately for useful diagnostics.
10. Validate every receipt response field.
11. Return the narrowed original object.
12. Export the typed `receiptBoundary` instance.
13. Populate route, environment, landmark, evidence, and action values from the
    current exemplar literals.

Independent verification:

- Inspect the module for accidental runtime dependencies.
- Run a grep that fails if an import references `node:`.
- Run TypeScript through the focused test loader in the next step.

Completion criterion:

- The module exposes a generic contract and one receipt instance.
- It performs no I/O and imports only the existing pure receipt helper.

## Step 2 — add declaration unit coverage

Create `test/boundary-contract.test.mjs`.

Actions:

1. Use `node:test` and strict Node assertions.
2. Generate valid fixtures through `makeReceipt`.
3. Assert root declaration values:
   - `name`;
   - `path`;
   - `keyEnv`.
4. Assert page landmark values:
   - heading;
   - status selector;
   - body selector;
   - evidence selectors and patterns;
   - primary action accessible name.
5. Assert `assertShape` accepts and returns a genuinely signed receipt.
6. Assert it rejects a non-object body.
7. Assert it rejects a wrong boundary name.
8. Table-test missing required fields.
9. Table-test blank required string fields.
10. Assert fixed `algorithm` and `keySource` values.
11. Table-test malformed nonce values.
12. Table-test malformed signature values.
13. Assert `verify` returns true for a valid signature.
14. Corrupt the signature without changing its shape.
15. Assert the corrupted receipt still passes structural validation.
16. Assert `verify` returns false for the corrupted signature.

Independent verification:

```sh
node --experimental-strip-types --test test/boundary-contract.test.mjs
```

Completion criterion:

- The focused test exits zero.
- Failures would identify declaration, shape, or verification behavior.

## Step 3 — register the new test in aggregate verification

Modify only the `test` script string in `package.json`.

Actions:

1. Add `test/boundary-contract.test.mjs` to the existing explicit file list.
2. Keep all existing files and their behavior unchanged.
3. Avoid unrelated JSON formatting.

Independent verification:

- Inspect the script entry with `rg`.
- Run `npm test` after the focused suite is green.

Completion criterion:

- The new tests run automatically in the standard unit suite.

## Step 4 — run acceptance checks

Run the ticket's direct checks before the source commit.

Commands:

```sh
node --experimental-strip-types --test test/boundary-contract.test.mjs
if rg -n '^\s*import .*node:' src/lib/boundary-contract.ts; then exit 1; fi
```

Acceptance mapping:

| Criterion | Test/evidence |
| --- | --- |
| accepts signed receipt | focused valid-shape test using `makeReceipt` |
| rejects wrong boundary | focused isolated boundary mutation |
| rejects missing/blank field | focused table over required fields |
| rejects non-hex | focused nonce/signature mutation table |
| valid signature verifies | focused `verify` test |
| corrupted signature fails | focused `corruptSignature` test |
| no Node built-in imports | source grep with no matches |

Completion criterion:

- Focused command exits zero.
- Grep returns no matching import.

## Step 5 — run proportional regression checks

Run:

```sh
npm test
npm run typecheck
```

Rationale:

- `npm test` proves package registration and guards the existing pure cores.
- `npm run typecheck` proves the public generic interface and regex/data literals
  compile across Astro and TypeScript contexts.
- Browser integration checks are not required because no current browser or
  server consumer imports the new declaration.
- A full `npm run verify` includes live integration/deployment legs beyond this
  declaration-only ticket and is reserved for the later end-to-end story.

Completion criterion:

- Both commands exit zero, or any environment-only limitation is recorded with
  exact evidence in `progress.md` and `review.md`.

## Step 6 — inspect the ticket diff

Actions:

1. Run `git diff -- src/lib/boundary-contract.ts
   test/boundary-contract.test.mjs package.json`.
2. Run `git status --short`.
3. Confirm no unrelated source edits appear in the ticket diff.
4. Confirm pre-existing Lisa/ticket changes remain untouched.
5. Confirm no files are staged in the ordinary index by this work.

Completion criterion:

- The source change is limited to the declared three paths.

## Step 7 — commit the meaningful source unit through Lisa

Use `lisa commit-ticket`, never ordinary `git add` or `git commit`.

Before executing, inspect the command help to ensure exact argument syntax.

Expected include set:

- `src/lib/boundary-contract.ts`;
- `test/boundary-contract.test.mjs`;
- `package.json`.

Commit message intent:

- define the portable receipt boundary contract.

Completion criterion:

- Lisa reports a successful ticket commit.
- All three ticket-owned paths are clean afterward.
- No unrelated pre-existing changes were included.

## Step 8 — record implementation progress

Maintain `progress.md` in the private attempt directory during implementation.

Record:

- baseline and pre-existing dirty paths;
- completion of each source step;
- focused test results;
- grep result;
- aggregate test result;
- typecheck result;
- commit identifier or Lisa output;
- deviations from this plan;
- remaining work.

Completion criterion:

- `progress.md` truthfully reflects completed source work and verification.

## Step 9 — perform review

Inspect:

- final committed diff;
- public interface consistency;
- validation completeness;
- test coverage;
- source portability;
- repository status;
- acceptance mapping;
- copy literal fidelity.

Write `review.md` in the private attempt directory with:

- summary of created/modified/deleted files;
- behavioral outcome;
- tests and command results;
- acceptance-criterion mapping;
- gaps or open concerns;
- explicit downstream deferrals;
- critical human-review flags, if any.

Completion criterion:

- Review artifact exists and contains enough handoff context to assess the work
  without reading every diff.
- The ticket remains active for Lisa to publish and complete.

## Atomicity rationale

The implementation has one meaningful source unit. The contract without tests
would expose an unlocked downstream API. The tests without package registration
could be skipped by normal verification. Committing all three exact source paths
together keeps the declaration, proof, and standard test entry coherent.

## Testing boundaries

### Unit coverage

- Contract literal declaration.
- Runtime structural narrowing.
- Required-field failures.
- Exact lowercase-hex constraints.
- Cryptographic verification delegation.
- Corrupted-signature rejection.

### Static coverage

- No `node:*` import in the portable declaration.
- TypeScript public interface compiles.

### Integration coverage

- Not added in this ticket because no consumer is rewired.
- Existing aggregate unit suite is the regression boundary.
- Node harness integration is `S-010-02`.
- Browser flow integration is `S-010-03`.
- Genuine alternate-boundary proof is `S-010-04`.

## Failure handling

- If the focused test fails, correct the contract or test before aggregate runs.
- If typecheck exposes an interface mismatch, adjust the public type while
  preserving the chosen semantics and record the deviation.
- If an existing test fails, determine whether the new package registration
  surfaced a real regression or the failure is unrelated/environmental.
- Do not modify unrelated sources to force green.
- Do not expand into later ticket scope to resolve consumer duplication.
- Do not touch the active ticket's phase or status.

## Copy review checkpoint

Before commit, confirm the two stored visitor strings remain exact:

- `Demo Runway`;
- `Ask for a fresh note`.

No authoring change, counting exception, or public-surface visual review is
expected.
