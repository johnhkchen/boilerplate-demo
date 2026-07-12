# Structure — T-010-04-02

## File-level summary

Modify one ticket-owned source file:

- `test/swap-proof.test.mjs`.

Create only attempt-private workflow artifacts:

- `.lisa/attempts/T-010-04-02/1/work/research.md`;
- `.lisa/attempts/T-010-04-02/1/work/design.md`;
- `.lisa/attempts/T-010-04-02/1/work/structure.md`;
- `.lisa/attempts/T-010-04-02/1/work/plan.md`;
- `.lisa/attempts/T-010-04-02/1/work/progress.md`;
- `.lisa/attempts/T-010-04-02/1/work/review.md`.

Delete no tracked files.

## Explicitly unchanged files

- `src/lib/boundary-contract.ts`;
- `src/pages/api/receipt.ts`;
- `src/lib/ops-check.ts`;
- `src/lib/operation-runner.ts`;
- `src/lib/integration-check.ts`;
- `scripts/ops-check.ts`;
- `scripts/integration-check.ts`;
- `scripts/leak-check.ts`;
- `tests/demo-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `playwright.config.ts`;
- `test/fixtures/alternate-boundary/boundary-contract.ts`;
- `package.json`;
- ticket phase and status frontmatter.

## Existing harness boundary

`test/swap-proof.test.mjs` already owns five connected responsibilities:

1. mirror creation for unchanged consumers;
2. alternate fixture page generation;
3. in-process HTTP fixture behavior;
4. child execution for operation, flow, and leak edges;
5. cross-harness result normalization and assertions.

The missing-route proof belongs inside this file because it combines all five responsibilities
without creating a reusable production behavior.

## Server-mode extension

### Existing interface

`startStub(mode, t)` accepts a mode string and returns:

```js
{
  baseUrl,
  boundaryUrl,
}
```

It registers server/socket teardown through the Node test context.

### Added mode

Add the accepted logical mode:

```text
missing
```

No public TypeScript type changes are required because the harness is JavaScript and the mode
parameter is currently untyped.

### Request dispatch order

The request handler retains this structure:

```text
request URL
  -> `/` serves the fixture page
  -> unrelated path returns 404
  -> declared path + missing mode returns 404
  -> declared path + stalled mode stays pending
  -> declared path + other mode returns a parcel response
```

The new branch must occur after the general pathname guard establishes that the request is for
the declared route, and before sequence allocation/signing. This keeps `missing` semantically
equivalent to an absent handler at the declared path rather than a malformed parcel response.

### Missing response shape

Use the same conventional absent-resource response as the fixture's unrelated-path behavior:

```text
status: 404
content-type: text/plain; charset=utf-8
body: not found
```

The exact body is not contract evidence and need not be asserted. The status is the important
observable because `runBoundaryCheck` rejects before JSON parsing.

### Refactoring boundary

A small local response helper may be introduced if it makes duplicate 404 construction clearer,
but it is not required. Do not extract a production module or add generalized route-mode
infrastructure. The file remains a focused executable test harness.

## New subtest boundary

Add one child subtest to the existing parent:

```text
missing declared route names operation and flow failures
```

Place it immediately after the healthy subtest.

### Setup

- Create a fresh mirror with `createSwapRoot(t)`.
- Start `startStub('missing', t)`.
- Use the returned `baseUrl` and `boundaryUrl` unchanged.

### Child execution

Run in parallel:

- `runOperation(root, urls)`;
- `runFlow(root, urls)`.

Running them concurrently preserves the existing scenario pattern and keeps the added wall time
near the browser failure budget rather than the sum of operation plus browser budgets.

### Raw evidence assertions

Operation evidence:

- `exitCode !== 0`;
- output matches the alternate name and operation kind;
- output contains `boundary answered HTTP 404`.

Flow evidence:

- `exitCode !== 0`;
- output identifies the declared boundary-response wait through its named step/assertion text.

The exact Playwright formatting should be matched only as narrowly as necessary. Do not bind to
terminal color codes, timings, stack line numbers, browser version text, or artifact paths.

### Normalization

Call the existing local `normalize` helper with both evidence records:

```js
normalize({ operation, flow })
```

The helper supplies an irrelevant successful leak placeholder and returns the normal integration
result shape.

### Result assertions

- aggregate `outcome === 'failed'`;
- operation result exists via `checkResult`;
- flow result exists via `checkResult`;
- operation boundary equals `BOUNDARY_NAME`;
- operation failure kind equals `operation`;
- flow boundary equals `BOUNDARY_NAME`;
- flow failure kind equals the coordinator's non-timeout browser kind, `flow`;
- formatted summary matches `parcel-proof [operation]`;
- formatted summary matches `parcel-proof [flow]`.

These assertions use existing constants and helpers rather than repeat alternate literals where
the harness already has a named source.

## Existing scenario preservation

The healthy, broken, stalled, and leaking subtests remain behaviorally unchanged.

- Healthy continues to establish the alternate route can satisfy all checks.
- Missing establishes absence detection.
- Broken continues to establish verification failure after a route response.
- Stalled continues to establish bounded timeout behavior.
- Leaking continues to establish disclosure failure independent of operation health.

No scenario should share a mirror or server with another. Node test cleanup continues to destroy
sockets and recursively remove each temporary root.

## Timeout structure

- Keep `EDGE_TIMEOUT_MS` at 250 ms.
- Keep `CHILD_TIMEOUT_MS` at 15 seconds.
- Keep Playwright's declared receipt-step budget at five seconds.
- Initially keep the parent test timeout at 45 seconds.
- Change the parent timeout only if the focused run demonstrates insufficient real headroom.
- Any timeout adjustment stays in `test/swap-proof.test.mjs` and is included in the same source
  unit.

## Contract naming path

The name asserted by the new test flows through existing boundaries:

```text
alternate fixture `receiptBoundary.name` = parcel-proof
  -> copied scripts/ops-check.ts
  -> runBoundaryCheck(contract)
  -> runOperation({ name: contract.name })
  -> formatBoundaryTrace
  -> child output and exit code

BOUNDARY_NAME = parcel-proof
  -> normalize evidence
  -> runIntegrationChecks({ name })
  -> IntegrationCheckResult.boundary
  -> formatIntegrationSummary
```

No new naming API is introduced.

## Missing-route path

The absence proof flows through:

```text
alternate declaration path `/api/parcel-proof`
  -> operation URL override and fixture page fetch
  -> fixture server missing-mode 404
  -> operation throws `boundary answered HTTP 404`
  -> operation CLI exits 1

fixture page receives 404
  -> parcel body remains hidden
  -> healthy flow cannot observe declared body
  -> Playwright exits non-zero
```

This tests route satisfaction at both operator and visitor harness layers.

## Verification structure

### Focused source verification

Run:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

This is the fastest proof of the modified unit and exposes child output on assertion failure.

### Static verification

Run:

```sh
npm run typecheck
```

Although the edited file is JavaScript, this verifies the copied TypeScript dependency slice and
the unchanged application declaration/route remain valid.

### Required full verification

Run:

```sh
npm run verify
```

This command is the acceptance boundary. Its first stage reruns the modified swap proof, while
later stages establish restored receipt behavior through integration, backstage, build, and
deploy-dry checks.

### Hygiene verification

- run `git diff --check` on the source file;
- inspect the exact source diff;
- confirm the live boundary and route have no ticket diff;
- confirm no `.swap-proof-*` directory remains;
- confirm no ordinary Git index entries exist;
- inspect the Lisa commit path list;
- confirm the ticket-owned source path is clean after commit.

## Commit structure

Create one source commit because the server mode and its assertions form one indivisible proof.

- Ticket: `T-010-04-02`.
- Message: `test: prove missing boundary route fails`.
- Exact include: `test/swap-proof.test.mjs`.
- Do not include attempt artifacts.
- Do not include generated test/build output.
- Do not include orchestration-owned dirty paths.

## Copy boundary

No rendered fixture or production string is added or modified. The only new prose inside source
is the subtest name and possibly engineering comments/assertion messages. Those are developer
test diagnostics, outside the visitor-facing copy contract. If implementation introduces any
HTML or accessible string change, it becomes a structure deviation requiring a copy-standard
inventory and review before commit.

## Final artifact boundary

`progress.md` records:

- implemented server mode;
- raw and normalized assertions;
- focused and full command results;
- any timeout/classification deviation;
- exact Lisa commit hash and include;
- worktree/index hygiene.

`review.md` records:

- final source diff summary;
- acceptance mapping;
- coverage and command evidence;
- proof that the shipped route remained unchanged;
- copy-scope assessment;
- open concerns or limitations;
- critical reviewer issues, if any.
