# Progress — T-010-04-01

## Status

Implementation is complete and verified. The ticket-owned source unit is ready for its Lisa
commit. Research, Design, Structure, and Plan were completed in the attempt-private directory
before source implementation began.

## Completed — alternate declaration fixture

- Created `test/fixtures/alternate-boundary/boundary-contract.ts`.
- Defined the portable `BoundaryContract<Body>` structural interfaces needed in the mirror.
- Defined a parcel-shaped response with `service`, `ticket`, and `proof`.
- Added a parcel-specific shape assertion.
- Required a `PX-0000`-style ticket format.
- Required a 64-character lowercase hexadecimal proof.
- Added HMAC-SHA256 verification using Web Crypto.
- Kept the declaration fixture free of Node-only imports.
- Exported the fixture through the stable `receiptBoundary` declaration slot.
- Declared the alternate boundary name `parcel-proof`.
- Declared the alternate route `/api/parcel-proof`.
- Declared the alternate key environment `PARCEL_PROOF_KEY`.
- Declared different page heading, status/body selectors, evidence, and action.
- Kept the fixture under `test/fixtures`; no shipped boundary was added.

## Completed — copy-standard pass

The fixture page is rendered in a browser, so the canonical copy standard was applied.

- `Parcel Window`: display name, 2 words, 13 characters.
- `Checking the parcel…`: status, 3 words, 20 characters.
- `Check another parcel`: button, 3 words, 20 characters.
- `Parcel ticket`: data label, 2 words, 13 characters.
- `Parcel proof`: data label, 2 words, 12 characters.
- The action begins with the specific verb `Check`.
- The display name is consistent between title and primary heading.
- The minimal fixture has no repeated explanation.
- No production visitor-facing copy changed.

## Completed — isolated mirror

- Created `test/swap-proof.test.mjs`.
- Derived the repository root from the test module URL.
- Created each temporary mirror directly below the repository root.
- Registered cleanup immediately after mirror creation.
- Copied the real operation and leak scripts.
- Copied their required generic cores.
- Copied the real Playwright config.
- Copied the real browser flow support module.
- Copied the real `tests/demo-flow.spec.ts`.
- Installed only the alternate declaration at the mirrored declaration path.
- Created a clean one-file client bundle fixture.
- Added byte-equality assertions for both scripts and the browser spec.
- Confirmed every temporary `.swap-proof-*` directory is removed after tests.

## Completed — stub server and page

- Added an in-process loopback HTTP server with an ephemeral port.
- Served a minimal alternate page from `/`.
- The page uses the alternate heading and landmark selectors.
- The page fetches only `/api/parcel-proof`.
- It displays alternate ticket and proof evidence.
- It hides the loading status when a response arrives.
- It shows the result body when a response arrives.
- It disables the declared action during a request.
- It re-enables the action after a completed request.
- It increments the ticket on every request for deterministic freshness.
- The server signs each ticket with Node HMAC-SHA256.
- It tracks open sockets and destroys them during teardown.

## Completed — fault modes

### Healthy

- Returns the alternate parcel shape.
- Returns a correct proof for the out-of-band key.
- Omits the key from both response and client bundle.
- Passes operation, healthy flow, and leak checks.

### Broken

- Returns HTTP 200.
- Returns a shape-valid parcel response.
- Replaces the HMAC with 64 zeroes.
- Reaches signature verification rather than failing transport or shape first.
- Produces a normalized operation failure.

### Stalled

- Accepts the declared boundary request without ending its response.
- Produces an operation timeout at the 250 ms edge budget.
- Makes the unchanged healthy browser flow fail its declared response wait.
- Pending sockets are destroyed during teardown.

### Leak

- Returns an otherwise healthy, correctly signed parcel response.
- Adds `diagnosticKey` containing the exact out-of-band key.
- Allows operation and browser-shape behavior to remain healthy.
- Produces a response leak finding in the executable leak edge.
- Formatted child output does not echo the key value.

## Completed — executable child edges

- Added a shell-free child runner.
- Captured stdout and stderr as evidence.
- Preserved non-zero exits as result data.
- Measured child duration.
- Added a 15-second outer child timeout.
- Ran mirrored scripts with Node's TypeScript stripping mode.
- Ran the repository Playwright binary against the mirrored config.
- Used `PLAYWRIGHT_BASE_URL` so no Astro server starts.
- Used full alternate URL overrides for operation and leak.
- Supplied the secret only under `PARCEL_PROOF_KEY`.
- Pointed leak scanning at the mirror's clean `dist` directory.

## Completed — cross-harness normalization

- Fed child evidence through the existing generic `runIntegrationChecks`.
- Used the alternate identity `parcel-proof`.
- Asserted all healthy normalized results are passed.
- Asserted broken operation is `parcel-proof [operation]`.
- Asserted stalled operation is `parcel-proof [timeout]`.
- Asserted stalled flow is `parcel-proof [timeout]`.
- Asserted response disclosure is `parcel-proof [leak]`.
- Asserted formatted summaries contain boundary and failure kind.
- Asserted operation output itself names the alternate boundary.

## Completed — default suite registration

- Modified `package.json` only to append `test/swap-proof.test.mjs`.
- Preserved every existing enumerated test entry.
- Added no dependency.
- Added no new operator command.

## Verification evidence

### Initial focused swap proof

Command:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Result before type adjustment:

- 5 tests passed;
- 0 failed, skipped, or cancelled;
- healthy subtest passed;
- broken subtest passed;
- stalled subtest passed;
- leak subtest passed;
- total duration about 7.24 seconds.

### Full Node suite

Command:

```sh
npm test
```

Result:

- 185 tests passed;
- 0 failed;
- 0 cancelled;
- 0 skipped;
- 0 todo;
- duration about 7.43 seconds.

This includes all repository unit/integration tests enumerated by the package command plus the
new browser-backed swap proof.

### Typecheck deviation and correction

The first `npm run typecheck` found one fixture-only TypeScript 6 error: the result of
`Uint8Array.from` was typed as `Uint8Array<ArrayBufferLike>`, while Web Crypto's verify overload
requires an `ArrayBuffer`-backed `BufferSource`.

The plan did not change. The implementation detail was corrected by:

- allocating a new `ArrayBuffer` explicitly;
- filling a `Uint8Array` view from the proof pairs;
- annotating the helper result as `Uint8Array<ArrayBuffer>`.

No cast or weakening of the verification contract was used.

### Final typecheck

Command:

```sh
npm run typecheck
```

Result:

- Astro checked 65 files;
- 0 errors;
- 0 warnings;
- 0 hints;
- standalone TypeScript no-emit passed;
- Wrangler generated worker types are current.

The existing Astro `session.driver` deprecation notice appeared and is unrelated.

### Final focused swap proof

Command:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Result after the type correction:

- 5 tests passed;
- 0 failed, skipped, or cancelled;
- total duration about 7.20 seconds.

### Diff and hygiene checks

- `git diff --check` passed for all three ticket-owned source paths.
- `git diff --name-only -- scripts tests/demo-flow.spec.ts` returned no output.
- No `.swap-proof-*` temporary directory remained.
- The ordinary Git index contained no staged path.
- Existing Codex/Lisa config, hooks, provenance, lock, ticket, and publication changes remain
  unrelated and untouched.

## Deviations from Plan

- The only deviation was the fixture's stricter TypeScript 6 typed-array annotation described
  above.
- The planned behavior, files, test matrix, and commit boundary did not change.
- The full `npm test` was run in addition to the planned focused suite, increasing regression
  evidence.

## Source commit

- Committed with `lisa commit-ticket`.
- Commit: `af2e6b625cb6046fbf1ed1de03d741c09bf63f56`.
- Message: `test: prove alternate boundary swap`.
- Exact includes: `package.json`, the alternate declaration fixture, and the swap-proof test.
- Commit size: 3 files changed, 475 insertions, 1 deletion.
- All three ticket-owned paths are clean after commit.
- The ordinary Git index remains empty.

## Remaining work

1. Write `review.md` with acceptance mapping, coverage, and open concerns.
2. Stop on T-010-04-01 after Review.
