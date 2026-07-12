# Review — T-010-04-01

## Outcome

The ticket is complete. A test-only alternate parcel-proof boundary now drives the actual
operation script, leak script, and healthy Playwright flow without changing those consumers.
The swap proof is all-green for a healthy alternate boundary and asserts the expected red
evidence for broken, stalled, and leaking modes. Every normalized fault names `parcel-proof`
and its failure kind.

## Source commit

- Commit: `af2e6b625cb6046fbf1ed1de03d741c09bf63f56`.
- Message: `test: prove alternate boundary swap`.
- Mechanism: `lisa commit-ticket` with exact repository-relative includes.
- Commit stat: 3 files changed, 475 insertions, 1 deletion.
- Ticket-owned paths are clean after commit.
- The ordinary Git index is empty.

## Files created

### `test/fixtures/alternate-boundary/boundary-contract.ts`

Defines a throwaway alternate `BoundaryContract` with:

- boundary name `parcel-proof`;
- route `/api/parcel-proof`;
- key environment `PARCEL_PROOF_KEY`;
- a response shaped as `service`, `ticket`, and `proof`;
- strict parcel ticket and proof shape checks;
- HMAC-SHA256 verification using portable Web Crypto;
- heading `Parcel Window`;
- parcel-specific status/body/evidence selectors;
- parcel-specific evidence patterns;
- primary action `Check another parcel`.

The fixture exports its alternate value through the stable `receiptBoundary` declaration slot
because that is what the unchanged consumers import. The identifier is wiring; every declared
behavioral and UI value differs from the shipped receipt exemplar.

### `test/swap-proof.test.mjs`

Adds the executable cross-harness proof. It:

- creates a temporary mirror beneath the repository;
- copies the real operation/leak scripts byte-for-byte;
- copies their required generic cores;
- copies the real Playwright config, flow support, and flow spec;
- installs the alternate fixture at the mirror's normal declaration path;
- asserts both scripts and the flow spec are byte-identical to their repository sources;
- serves a minimal alternate page and signed boundary from an ephemeral loopback server;
- executes the mirrored operation and leak scripts;
- executes the unchanged healthy Playwright project;
- normalizes child evidence with the existing integration coordinator;
- asserts healthy, broken, stalled, and leak outcomes;
- destroys stalled sockets and removes every temporary mirror.

## File modified

### `package.json`

Appends `test/swap-proof.test.mjs` to the existing explicit `npm test` file list. No dependency,
new command, or existing test entry changed.

## Files not changed

- No `scripts/*` path changed.
- `tests/demo-flow.spec.ts` did not change.
- `tests/support/flow-contract.ts` did not change.
- `playwright.config.ts` did not change.
- No production module under `src/` changed.
- No shipped page or route changed.

The commit path list itself is the Git proof, and the implementation-time command
`git diff --name-only -- scripts tests/demo-flow.spec.ts` produced no output.

## Architecture assessment

The resulting proof follows the intended dependency direction:

```text
alternate declaration in isolated mirror
  -> unchanged operation script -> generic operation core
  -> unchanged leak script -> generic leak core
  -> unchanged flow support -> unchanged browser flow spec

alternate stub page/route
  -> real HTTP + browser evidence
  -> existing integration normalization
  -> alternate boundary name + failure kind
```

The live declaration is never rewritten. This matters because Lisa agents and tests can share
the same branch and filesystem. A process failure cannot strand the checkout on the alternate
contract, and concurrent work never observes test-only declaration state.

## Acceptance assessment

### Alternate declaration and stub

Passed. The fixture is a structurally complete `BoundaryContract`, and the in-process stub
serves both the alternate page and alternate signed response. It is visibly test-only and does
not become a second shipped boundary.

### Healthy operation check

Passed. The unchanged `scripts/ops-check.ts` loads the alternate declaration from the mirror,
fetches `/api/parcel-proof`, asserts the different response shape, verifies its HMAC using
`PARCEL_PROOF_KEY`, exits zero, and prints `parcel-proof — passed`.

### Healthy leak check

Passed. The unchanged `scripts/leak-check.ts` follows the alternate route/key declaration,
scans a real clean browser-bundle fixture and raw alternate response, and exits zero.

### Healthy browser flow

Passed. The unchanged `tests/demo-flow.spec.ts` finds `Parcel Window`, follows the parcel status
and body selectors, checks both parcel evidence patterns, finds `Check another parcel`, and
observes a fresh parcel ticket after activation.

This is strong evidence that the flow did not accidentally use receipt literals: the stub has
no receipt endpoint, receipt heading, receipt selectors, or receipt-shaped response.

### Broken behavior

Passed. Broken mode returns HTTP 200 with a shape-valid parcel body but a 64-hex invalid proof.
The operation edge rejects it at signature verification. Normalized evidence and summary name:

```text
parcel-proof [operation]
```

### Stalled behavior

Passed. Stalled mode accepts the alternate boundary request and never answers it.

- Operation exits non-zero at its 250 ms budget and normalizes to `timeout`.
- The unchanged healthy Playwright flow exits non-zero at its declared response wait and
  normalizes to `timeout`.
- Both records and the summary name `parcel-proof`.
- Test teardown destroys pending sockets rather than waiting indefinitely.

### Leaking behavior

Passed. Leak mode returns a correctly signed parcel response plus `diagnosticKey` containing the
exact out-of-band secret.

- Operation still passes, distinguishing disclosure from boundary breakage.
- Leak exits non-zero and identifies the response body location.
- Normalized evidence and summary name `parcel-proof [leak]`.
- Captured output does not contain the secret value.

### Zero consumer edits

Passed through three independent checks:

1. the source commit contains only the package file, fixture, and harness;
2. scoped Git diff for `scripts` and the demo flow spec was empty;
3. the harness asserts its copied operation script, leak script, and flow spec are byte-equal to
   the repository versions before executing them.

## Test coverage

### Focused swap proof

Final command:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Result:

- 5 tests passed;
- 0 failed;
- 0 skipped or cancelled;
- healthy, broken, stalled, and leaking subtests all passed;
- duration about 7.20 seconds.

The expected-red child processes are asserted behavior, so the parent suite remains green.

### Full Node suite

`npm test` passed:

- 185 tests;
- 185 passed;
- 0 failed, skipped, or cancelled;
- duration about 7.43 seconds.

This includes existing boundary declaration, operation runner, operation check, leak check,
integration normalization, application, session, release, and packet coverage.

### Type and framework checks

`npm run typecheck` passed:

- Astro: 65 files, 0 errors, 0 warnings, 0 hints;
- TypeScript no-emit: passed;
- Wrangler generated worker types: passed and current.

Astro's existing deprecated `session.driver` notice remains unrelated and non-failing.

### Repository checks

- `git diff --check` passed for the ticket source paths.
- Forbidden consumer diff was empty.
- No `.swap-proof-*` directory survived testing.
- Exact Lisa commit inspection matched the intended three paths.
- All ticket-owned paths are clean.
- No ordinary staged path exists.

## Copy review

The alternate fixture page adds rendered test-only copy, so the copy standard was applied:

- `Parcel Window`: valid 2-word, 13-character display name;
- `Checking the parcel…`: valid 3-word, 20-character status;
- `Check another parcel`: valid 3-word, 20-character action beginning with `Check`;
- `Parcel ticket`: valid 2-word, 13-character data label;
- `Parcel proof`: valid 2-word, 12-character data label.

The fixture contains one wayfinding name, one concise status, one specific action, and two
necessary evidence labels. No explanation is repeated. No shipped visitor surface changed, so
a production projector/phone cold-read is not required.

## Security and failure-safety review

- The test secret is deterministic fixture data, not a real credential.
- It is supplied only under the alternate declared environment name.
- Healthy response and browser bundle omit it.
- Leak output reports the location without echoing the value.
- Child processes use `shell: false`.
- The server binds only to loopback and an ephemeral port.
- Outer child deadlines prevent an unbounded fixture process.
- Stalled sockets are tracked and destroyed.
- Temporary mirrors are recursively removed through test cleanup.

## Open concerns and limitations

- No critical issue or acceptance gap remains.
- The proof takes about seven seconds because one intentionally stalled Playwright assertion
  consumes its five-second declared response budget. This is acceptable for the default suite
  and materially proves bounded flow failure.
- The mirror has an explicit dependency file list. If the scripts/spec acquire new relative
  imports, the proof will fail loudly during module loading and the list must be updated.
- Byte-equality checks cover the two executed scripts and flow spec. Git path inspection covers
  the broader acceptance claim that no script path changed.
- The alternate export retains the identifier `receiptBoundary`. Renaming the stable declaration
  slot would require changing consumers and would defeat this ticket's unchanged-consumer proof;
  the alternate value itself is fully distinct.
- Missing/deleted route loud-failure and final receipt `npm run verify` remain intentionally
  assigned to dependent ticket T-010-04-02.

## Repository hygiene

- Unrelated Codex/Lisa configuration, hooks, provenance, lock, ticket metadata, and shared
  publication paths were preserved and excluded.
- Attempt phase artifacts remain in the private assignment directory for Lisa admission.
- No generated Playwright report, trace, build output, or temporary mirror entered the commit.
- No ticket-owned file remains staged, modified, or untracked.

## Handoff

The inverted coupling is now executable evidence rather than an architectural assertion. A
different contract, route, key name, response shape, verifier, heading, selectors, evidence,
and action all pass through the unchanged harness when healthy, while semantic breakage,
stalling, and disclosure become named red results. Lisa can publish Review and complete this
ticket's lease; work should remain on T-010-04-01 until Lisa confirms completion.
