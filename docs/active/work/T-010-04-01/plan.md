# Plan — T-010-04-01

## Implementation sequence

### 1. Create the alternate declaration fixture

- Add `test/fixtures/alternate-boundary/boundary-contract.ts`.
- Reproduce the structural contract interfaces needed by copied consumers.
- Define the parcel-proof response shape.
- Add strict parcel-specific shape validation.
- Add portable HMAC-SHA256 verification with Web Crypto.
- Export the alternate value through the stable `receiptBoundary` declaration slot.
- Use a different name, path, key env, response shape, heading, selectors, evidence, and action.
- Check the rendered fixture strings against the copy standard counts recorded in Design.

Verification:

- Run TypeScript no-emit through the project typecheck after the harness exists.
- Inspect the fixture for Node-only imports; expect none.
- Confirm no receipt route/heading/selectors appear in the alternate value.

### 2. Build the isolated mirror helper

- Add `test/swap-proof.test.mjs`.
- Derive an absolute repository root without assuming invocation cwd.
- Create a temporary repository-child directory.
- Copy the exact operation/leak scripts and their required pure cores.
- Copy the exact Playwright config, flow support, and flow spec.
- Install the alternate fixture at the mirror's normal declaration path.
- Create a minimal safe client bundle file.
- Register recursive cleanup before any subsequent operation can fail.
- Compare the copied scripts/spec with their source bytes.

Verification:

- Exercise mirror creation in the focused test.
- Confirm cleanup removes the mirror on pass and failure.
- Check repository status for no surviving `.swap-proof-*` directory.

### 3. Build the alternate stub server

- Serve the minimal alternate page from `/`.
- Include only copy-standard-conforming heading/status/labels/action text.
- Fetch the alternate declared route on page load and action click.
- Render alternate evidence through text content.
- Increment the parcel ticket on each request for deterministic freshness.
- Generate matching HMAC proofs with the fixture key.
- Implement healthy, broken, stalled, and leak response modes.
- Track sockets and destroy them during cleanup.
- Listen on loopback port zero.

Verification:

- Healthy operation must validate shape and proof.
- Broken operation must get HTTP 200 but fail proof verification.
- Stalled operation must settle via the configured timeout.
- Leak response must contain the exact key while healthy response does not.

### 4. Add bounded child execution

- Spawn children without a shell.
- Capture stdout and stderr together.
- Return non-zero exits as evidence rather than exceptions.
- Measure duration.
- Add an outer timeout that terminates runaway children.
- Point operation and leak edges to their mirrored scripts.
- Point Playwright to its mirrored config and the healthy project.
- Supply only the alternate key environment name.
- Supply full alternate URL and bundle overrides.

Verification:

- Healthy edge outputs settle with exit zero.
- Fault edge outputs settle non-zero.
- Captured outputs are present in assertion diagnostics.
- Captured outputs never include the secret.

### 5. Normalize and assert the healthy scenario

- Start a healthy stub.
- Run operation, healthy flow, and leak edges.
- Assert all raw commands pass.
- Pass their evidence through `runIntegrationChecks` with the alternate identity.
- Assert aggregate success and three passed results.
- Assert every result names `parcel-proof`.
- Assert the operation formatter prints the alternate name.
- Assert the flow succeeded using alternate heading/selectors/evidence/action.

Verification:

- Direct focused Node test passes the healthy subtest.
- A receipt-coupled consumer would fail because no receipt route/page fields exist.

### 6. Normalize and assert broken behavior

- Start a broken stub returning a shape-valid invalid proof.
- Run the operation edge.
- Assert the command fails.
- Normalize it with the alternate identity.
- Assert `failureKind === 'operation'`.
- Assert the normalized record and summary name `parcel-proof`.
- Assert the response was not rejected merely for HTTP status or shape.

Verification:

- Broken subtest passes only when verification catches the bad proof.
- Summary contains `parcel-proof [operation]`.

### 7. Normalize and assert stalled behavior

- Start a stalled stub that accepts but never ends the declared response.
- Run the operation edge with a short timeout.
- Run the unchanged healthy browser flow.
- Assert both commands fail within their outer limits.
- Normalize both records.
- Assert operation and flow kinds are `timeout`.
- Assert both records name `parcel-proof`.
- Assert the summary contains the alternate name and timeout kind.

Verification:

- The operation edge finishes near its configured budget.
- Playwright fails its declared await step rather than hanging indefinitely.
- Server cleanup destroys pending sockets.

### 8. Normalize and assert leak behavior

- Start a leak stub with an otherwise valid signed response containing the key.
- Run operation to prove the response remains operationally healthy.
- Run leak against a clean bundle and the raw alternate response.
- Assert operation passes and leak fails.
- Normalize both records.
- Assert leak kind is `leak` and boundary is `parcel-proof`.
- Assert summary names both.
- Assert output reports the response location but not the key value.

Verification:

- Leak subtest distinguishes disclosure from operation failure.
- No fixture browser asset contains the key.

### 9. Register the proof in the default test suite

- Append `test/swap-proof.test.mjs` to the explicit `package.json` test command.
- Keep all existing test entries and their order unchanged.
- Do not add dependencies or another npm script.

Verification:

- Parse `package.json` through npm invocation.
- Confirm `npm test` discovers the swap-proof parent/subtests.

### 10. Run focused verification

Run:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Then run the related declaration/check suite:

```sh
node --experimental-strip-types --test \
  test/boundary-contract.test.mjs \
  test/ops-check.test.mjs \
  test/leak-check.test.mjs \
  test/integration-check.test.mjs \
  test/swap-proof.test.mjs
```

Expected:

- all tests pass;
- healthy alternate operation/flow/leak are green;
- broken, stalled, and leak expected-red child commands become passing assertions;
- no secret appears in parent output;
- no temporary mirror remains.

### 11. Run static and repository checks

Run:

```sh
npm run typecheck
git diff --check -- package.json test/fixtures/alternate-boundary/boundary-contract.ts test/swap-proof.test.mjs
git diff --name-only -- scripts tests/demo-flow.spec.ts
git status --short
git diff --cached --name-only
```

Expected:

- typecheck passes;
- diff whitespace check passes;
- forbidden-path diff is empty;
- only the three ticket-owned source paths are new/modified for this ticket;
- ordinary index is empty;
- unrelated pre-existing worktree changes remain intact.

### 12. Record implementation progress

- Create attempt-private `progress.md` before the source commit.
- Record each completed implementation step.
- Record exact commands and results.
- Document deviations before executing any adjusted course.
- Record copy review and forbidden-path proof.
- Keep phase artifacts outside the source commit.

### 13. Commit the meaningful source unit

Use `lisa commit-ticket` only, with exact repository-relative includes:

```sh
lisa commit-ticket T-010-04-01 \
  --message "test: prove alternate boundary swap" \
  --include package.json \
  --include test/fixtures/alternate-boundary/boundary-contract.ts \
  --include test/swap-proof.test.mjs
```

If CLI syntax differs, inspect `lisa commit-ticket --help` and use the supported equivalent.
Never use ordinary `git add` or `git commit`.

Post-commit checks:

- inspect the commit path list;
- confirm the three ticket paths are clean;
- confirm no ordinary staged paths exist;
- preserve all unrelated changes.

### 14. Review

- Create attempt-private `review.md`.
- Summarize fixture, harness, and package changes.
- Map each acceptance clause to executable evidence.
- Record focused test counts and typecheck result.
- Record source commit identifier and exact included paths.
- Record copy-standard compliance.
- Record open concerns, especially Playwright runtime cost and fixture-mirror maintenance.
- Confirm no production script/core/spec changes.
- Stop on this ticket after Review; do not start T-010-04-02.

## Testing strategy

### Contract-level behavior

Covered indirectly by the executable operation edge in every server mode. Healthy proves shape
and HMAC verification; broken proves invalid HMAC rejection; stalled proves bounded invocation.

### Leak behavior

Covered through the executable leak edge with a real filesystem bundle and real HTTP response.
Healthy proves both surfaces clean; leak proves exact response disclosure classification.

### Browser behavior

Covered through the unchanged real `tests/demo-flow.spec.ts`, running against the fixture page.
Healthy proves alternate heading, selectors, evidence patterns, freshness, and action name.
Stalled proves the healthy flow turns red on the alternate declared route.

### Cross-harness normalization

Covered through existing `runIntegrationChecks` and `formatIntegrationSummary`, asserting the
alternate boundary name and expected normalized kind for every fault.

### Regression scope

The related focused suite protects the generic contract and check cores. Project typecheck
protects TypeScript portability and existing framework integration. The final full verification
on reverted receipt remains explicitly assigned to T-010-04-02.

## Completion criteria

- The source diff contains only fixture/test/package paths.
- Healthy alternate operation, flow, and leak commands pass.
- Broken alternate operation fails as `parcel-proof [operation]`.
- Stalled alternate operation/flow fail as `parcel-proof [timeout]`.
- Leaking alternate response fails as `parcel-proof [leak]`.
- The unchanged consumer-byte assertions pass.
- The secret is absent from output.
- Focused tests and typecheck pass.
- Source is committed through Lisa with exact includes.
- `progress.md` and `review.md` exist in the attempt-private work directory.
