# Design — T-010-04-01

## Decision summary

Add one Node integration test plus test-only alternate-boundary fixtures. The test creates an
isolated mirror beneath the repository, copies the real check scripts, Playwright config,
browser-flow support, browser-flow spec, and their required cores byte-for-byte, then installs
the alternate declaration into the mirrored declaration path. An in-process HTTP stub serves
the alternate page and boundary. The test executes the unchanged runnable checks for healthy,
broken, stalled, and leaking modes and normalizes their evidence through the existing
integration coordinator.

## Goals

- Prove all three harness slices follow a different declaration.
- Exercise the actual operation and leak script edges.
- Exercise the actual healthy Playwright flow spec.
- Keep `scripts/*` and `tests/demo-flow.spec.ts` unchanged.
- Make healthy mode all-green.
- Make broken mode identify the alternate boundary and `operation`.
- Make stalled mode identify the alternate boundary and `timeout`.
- Make leak mode identify the alternate boundary and `leak`.
- Bound all pending work and clean every server/temp resource.
- Keep the alternate boundary out of shipped application code.

## Option 1 — Temporarily rewrite the live declaration

This approach would save the current `src/lib/boundary-contract.ts`, replace it with an
alternate declaration, run the scripts and flow, and restore the source in `finally`.

### Advantages

- Executes every consumer from the normal repository path.
- Requires little mirroring code.
- Directly resembles a developer changing the declaration file.

### Costs and rejection

- It mutates a tracked source file during the test.
- A process crash can leave the checkout altered.
- Concurrent Lisa work can observe the temporary declaration.
- Concurrent tests can load different versions nondeterministically.
- Git status can become noisy during execution.
- The shared-filesystem constraint makes this unsafe.

This option is rejected.

## Option 2 — Add runtime contract selection to production consumers

This approach would change the scripts and flow support to import a declaration chosen by an
environment variable or module path.

### Advantages

- The test could inject the alternate contract without file mirroring.
- Future contract variants could use the same runtime switch.

### Costs and rejection

- It edits the exact consumers whose unchanged behavior is under proof.
- It adds production indirection solely for a test.
- Dynamic TypeScript module loading across Node and Playwright is complex.
- It broadens the shipped surface toward the out-of-scope provider abstraction.
- The acceptance criterion explicitly values zero script/spec edits.

This option is rejected.

## Option 3 — Test only pure cores with an alternate object

This approach would pass a fake contract to `runBoundaryCheck`, call `runLeakCheck` with a
stub response, and test Playwright selectors separately.

### Advantages

- Fast and small.
- Avoids child processes and browser startup.
- Easy to isolate each failure.

### Costs and rejection

- Existing unit tests already prove the operation core accepts an alternate contract.
- It does not prove the runnable edges read the same declaration slot.
- It does not prove the unchanged browser spec consumes alternate landmarks.
- It cannot substantiate the cross-harness acceptance claim.

This option is rejected as insufficient.

## Option 4 — Isolated mirror with unchanged consumers

This approach copies only the dependency slice required by the check edges and browser spec.
The alternate fixture becomes the mirror's `src/lib/boundary-contract.ts`, retaining the
consumer-facing export slot while changing all declared values and behavior.

### Advantages

- The live checkout remains stable.
- Script and spec bytes can be asserted equal to their tracked sources.
- Relative imports resolve exactly as they do in the repository.
- The test can use existing environment seams for URLs and keys.
- The fixture remains visibly test-only.
- Each mode can use a fresh isolated server and mirror.
- Root `node_modules` remains reusable because the mirror is a repository child.

### Costs

- The harness must copy a small dependency manifest accurately.
- Playwright makes the test slower than a pure unit test.
- Child output needs capture for useful failure diagnostics.
- Cleanup must handle stalled HTTP responses.

This option is selected because it proves the requested coupling direction without adding a
runtime abstraction or risking the shared checkout.

## Alternate contract design

The fixture contract will describe a parcel-style proof rather than a receipt:

- name: `parcel-proof`;
- path: `/api/parcel-proof`;
- key environment: `PARCEL_PROOF_KEY`;
- body fields: `service`, `ticket`, and `proof`;
- verification: HMAC-SHA256 over the ticket with the out-of-band key;
- heading: `Parcel Window`;
- status selector: `#parcel-status`;
- body selector: `#parcel-card`;
- evidence: parcel ticket and proof selectors with distinct patterns;
- action: `Check another parcel`.

The declaration remains portable by using Web Crypto in `verify`. The Node stub uses
`createHmac` to produce matching hexadecimal proofs. The differently shaped body and different
path/heading/selectors make accidental receipt coupling observable.

## Copy decision

The rendered fixture strings follow the copy standard:

- `Parcel Window`: 2 words, 13 characters; a short display-name landmark.
- `Checking the parcel…`: 3 words, 20 characters; a brief visible status.
- `Check another parcel`: 3 words, 20 characters; begins with the specific verb `Check`.
- `Parcel ticket`: 2 words, 13 characters; a familiar data label.
- `Parcel proof`: 2 words, 12 characters; a familiar data label.

The fixture has one name, one status, one action, and two necessary labels. There is no
duplicated explanation. The test page is intentionally minimal, so projector/phone layout
review is not material to shipped UI and no production screenshot is warranted.

## Stub behavior

Each scenario gets an HTTP server on an ephemeral loopback port.

### Page response

- `/` returns a minimal HTML page.
- The page contains the declared heading, status, result body, evidence nodes, and action.
- Inline JavaScript fetches the declared route on load.
- It renders `ticket` and `proof`, hides status, and shows the result body.
- Clicking the action disables it, fetches again, renders fresh evidence, and re-enables it.
- A monotonically increasing ticket makes the first evidence record a freshness witness.

### Healthy response

- Returns a new correctly shaped parcel body.
- HMAC proof verifies against the environment-held key.
- The raw response omits the key.

### Broken response

- Returns HTTP 200 and a shape-valid parcel body.
- The proof is replaced with a different 64-character hex value.
- Shape assertion succeeds, but signature verification fails.
- This yields an operation failure rather than a transport shortcut.

### Stalled response

- Accepts the boundary request and never ends the response.
- The operation edge fails at its short timeout.
- The healthy Playwright project fails waiting for the declared body.
- Test-owned sockets are destroyed during teardown.

### Leak response

- Returns a correctly signed healthy body.
- Adds `diagnosticKey` containing the exact secret.
- The contract shape permits extra fields.
- Operation and flow can pass while the leak edge reports the response disclosure.

## Scenario execution

The test runs four top-level subtests sequentially to avoid browser/server contention.

- Healthy runs operation, flow, and leak and expects exit zero from all.
- Broken runs operation and expects normalized `operation` failure evidence.
- Stalled runs operation and flow and expects normalized `timeout` evidence.
- Leak runs operation and leak and expects normalized `leak` evidence.

For failure scenarios, only the checks needed to prove the named fault are executed. The
existing integration coordinator receives synthetic successful evidence for irrelevant checks,
so its existing formatter/classifier supplies consistent cross-harness diagnostics without
unnecessary browser launches.

## Executable-edge invocation

- Operation uses Node with `--experimental-strip-types` on the mirrored script.
- Leak uses the same Node mode on the mirrored script.
- Flow uses the repository Playwright binary with the mirrored config and healthy project.
- All children run with the mirror as working directory.
- Full URL overrides point to the stub's alternate route.
- The alternate key is supplied only under `PARCEL_PROOF_KEY`.
- Leak bundle directory points to a minimal clean mirrored `dist` fixture.
- Short operation/leak timeouts keep fault tests bounded.
- `PLAYWRIGHT_BASE_URL` disables the config-owned Astro server.

## Evidence and diagnostics

Child execution returns exit code, combined stdout/stderr, and duration. That shape already
matches `CommandEvidence`. `runIntegrationChecks` normalizes it under the alternate boundary
identity. Assertions cover:

- aggregate outcome;
- per-check outcome;
- boundary name on every normalized record;
- expected failure kind;
- formatted summary containing boundary and bracketed kind;
- healthy output showing the alternate operation name;
- leak output not echoing the secret.

On assertion failure, captured child output remains attached to the assertion message or
normalized result, making the proof diagnosable in the default suite.

## Integrity proof

The harness copies consumers with `copyFile`, not generated substitutes. It reads source and
mirror bytes for:

- `scripts/ops-check.ts`;
- `scripts/leak-check.ts`;
- `tests/demo-flow.spec.ts`.

It asserts exact equality before running them. The ticket diff will contain no path under
`scripts/` and no `tests/demo-flow.spec.ts` edit. The review phase will record the scoped diff.

## Risks and mitigations

- Playwright unavailable: use the installed project dependency and existing browser setup.
- Module resolution from temp: keep the mirror directly beneath repository root.
- Port collision: listen on port zero and read the assigned loopback port.
- Stalled connections blocking close: track sockets/responses and destroy them in teardown.
- Secret disclosure in diagnostics: assert child output omits the secret; leak formatter already
  reports only location.
- Flaky freshness: allocate a new ticket on each request rather than use wall-clock timing.
- Long failure runs: use short operation timeouts and only one stalled browser proof.

## Out of scope

- No production boundary or route is added.
- No production source behavior changes.
- No script, flow spec, or flow-support behavior changes.
- No missing-declaration or missing-route gate is added here.
- No final full verification claim is made here.
