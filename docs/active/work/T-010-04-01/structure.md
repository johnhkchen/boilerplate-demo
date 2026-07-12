# Structure — T-010-04-01

## File-level summary

Create:

- `test/fixtures/alternate-boundary/boundary-contract.ts`;
- `test/swap-proof.test.mjs`.

Modify:

- `package.json`.

Do not modify:

- any path below `scripts/`;
- `tests/demo-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `playwright.config.ts`;
- any production module below `src/`;
- ticket frontmatter.

Delete no files.

## `test/fixtures/alternate-boundary/boundary-contract.ts`

### Purpose

Provide the throwaway alternate declaration that occupies the normal declaration path only
inside the temporary swap mirror. It is test data, not an import used by production.

### Public types

Define the same structural interfaces required by copied consumers:

- `BoundaryEvidence`;
- `BoundaryLandmark`;
- `BoundaryContract<Body>`.

Keeping the local interface definitions makes the copied fixture self-contained after it is
installed as `src/lib/boundary-contract.ts`.

### Alternate body

Define an internal `ParcelProof` shape:

```ts
{
  service: 'parcel';
  ticket: string;
  proof: string;
}
```

The object intentionally has no receipt `boundary`, `issuedAt`, `nonce`, `algorithm`,
`signature`, or `keySource` fields.

### Shape assertion

An internal `assertParcelShape(body)` will:

- reject non-object/null bodies;
- require `service === 'parcel'`;
- require a ticket matching the fixture parcel-ticket format;
- require a 64-character lowercase hexadecimal proof;
- throw a parcel-specific unexpected-shape error;
- return `ParcelProof` when valid.

### Signature verification

An internal async verifier will:

- import an HMAC-SHA256 key with Web Crypto;
- encode the ticket as the signed message;
- decode the hexadecimal proof into bytes;
- call `crypto.subtle.verify`;
- return the boolean result.

No Node-only module import will appear in this fixture.

### Export

Export `receiptBoundary` because that is the stable declaration slot imported by the unchanged
consumers. Its value will declare:

- `name: 'parcel-proof'`;
- `path: '/api/parcel-proof'`;
- `keyEnv: 'PARCEL_PROOF_KEY'`;
- alternate shape and verifier functions;
- alternate heading, selectors, evidence, patterns, and primary action.

The exported identifier is compatibility wiring; all contract data is alternate.

## `test/swap-proof.test.mjs`

### Purpose

Own the isolated mirror, fixture server, child-process execution, evidence normalization, and
assertions for all four scenarios.

### Constants

Define:

- repository root derived from `import.meta.url`;
- alternate boundary name/path/key-env/key;
- fixture source path;
- lists of files copied unchanged into the mirror;
- per-edge timeout constants;
- child-process outer timeout.

Keep the test secret deterministic and conspicuous enough to detect exact leakage.

### Temporary mirror helper

`createSwapRoot(t)` will:

1. create a temporary directory directly below the repository;
2. register recursive cleanup with the test context;
3. create all needed destination directories;
4. copy required source/core/config/spec/support files;
5. copy the alternate fixture into `src/lib/boundary-contract.ts`;
6. create `dist/index.html` with safe browser content;
7. compare selected unchanged consumer bytes with their repository sources;
8. return the mirror path.

Required copied files:

- `scripts/ops-check.ts`;
- `scripts/leak-check.ts`;
- `src/lib/ops-check.ts`;
- `src/lib/operation-runner.ts`;
- `src/lib/leak-check.ts`;
- `tests/demo-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `playwright.config.ts`.

### Fixture page helper

`pageHtml()` will return a complete minimal HTML document containing:

- the alternate heading;
- visible alternate status;
- hidden alternate body;
- alternate evidence nodes and labels;
- alternate accessible button name;
- an inline script using the alternate route;
- load and click behavior matching the unchanged spec's expectations.

The script will use text content assignment, not HTML injection.

### Fixture server helper

`startStub(mode, t)` will:

- create a loopback HTTP server;
- track open sockets for deterministic teardown;
- serve the page at `/`;
- reject unrelated paths with 404;
- allocate a fresh parcel ticket per boundary request;
- sign the ticket with Node HMAC for healthy/leak modes;
- corrupt the proof for broken mode;
- leave the response pending for stalled mode;
- include the key only in leak mode;
- listen on an ephemeral port;
- register close/destroy cleanup;
- return `baseUrl` and `boundaryUrl`.

### Child runner helper

`runChild(command, args, options)` will:

- spawn with `shell: false`;
- run under the supplied mirror working directory;
- combine captured stdout and stderr;
- measure elapsed time;
- enforce an outer timeout with abort/kill;
- resolve to `{ exitCode, output, durationMs }`.

The helper will not reject for an expected non-zero exit; exit status is evidence.

### Edge runners

`runOperation(root, urls)` will execute mirrored `scripts/ops-check.ts` with:

- `OPS_CHECK_URL` set to the alternate route;
- `OPS_CHECK_TIMEOUT_MS` set to the bounded fixture budget;
- `PARCEL_PROOF_KEY` set to the test key;
- receipt key variables absent or irrelevant.

`runLeak(root, urls)` will execute mirrored `scripts/leak-check.ts` with:

- alternate response URL;
- mirrored clean `dist` path;
- bounded timeout;
- alternate key env.

`runFlow(root, urls)` will execute the repository Playwright binary with:

- mirrored config;
- healthy project only;
- alternate `PLAYWRIGHT_BASE_URL`;
- an isolated mirrored output/report location from the copied config.

### Normalization helper

`normalizeScenario(boundary, evidenceByCheck)` will call the existing
`runIntegrationChecks`. Its runner returns supplied child evidence for exercised checks and a
zero-exit placeholder for intentionally irrelevant checks.

This preserves the established classification rules and result schema.

### Tests

One parent test will create sequential subtests:

#### Healthy

- create mirror and healthy stub;
- run operation, healthy flow, and leak;
- assert all raw exits are zero;
- normalize all three;
- assert aggregate `passed`;
- assert every normalized result names `parcel-proof`;
- assert operation output names the alternate boundary;
- assert no output contains the key.

#### Broken

- create mirror and broken stub;
- run operation;
- assert non-zero;
- normalize with other checks successful;
- assert aggregate `failed`;
- assert operation boundary `parcel-proof`;
- assert failure kind `operation`;
- assert formatted summary names both.

#### Stalled

- create mirror and stalled stub;
- run operation and healthy flow;
- assert both non-zero within outer bounds;
- normalize both evidence records;
- assert operation failure kind `timeout`;
- assert flow failure kind `timeout`;
- assert both name `parcel-proof`;
- assert formatted summary names the timeout.

#### Leaking

- create mirror and leak stub;
- run operation and leak;
- assert operation zero and leak non-zero;
- normalize evidence;
- assert leak failure kind `leak`;
- assert leak result names `parcel-proof`;
- assert formatted summary names both;
- assert captured output does not contain the key.

## `package.json`

Append `test/swap-proof.test.mjs` to the explicit `test` script file list. Do not add a new npm
command because the proof belongs in the normal suite and does not need a public operator API.

## Dependency boundaries

```text
alternate boundary fixture
  -> installed only in temporary mirror
  -> unchanged ops script -> generic operation core
  -> unchanged leak script -> generic leak core
  -> unchanged flow support -> unchanged demo flow spec

in-process stub
  -> alternate page and alternate signed response

swap-proof test
  -> child evidence
  -> existing integration normalizer/formatter
```

The test may import the live integration normalizer because that module is pure, generic, and
already owns failure-kind semantics. The mirrored consumers never import the live receipt
declaration.

## Ordering constraints

1. Add the fixture declaration first so its contract is reviewable in isolation.
2. Add the test harness and run it directly.
3. Fix only fixture/harness issues found by focused execution.
4. Add the new test to the package suite.
5. Run the focused related suite and typecheck.
6. Commit the exact fixture, test, and package paths together as one meaningful proof unit.

## Commit boundary

The alternate declaration, harness, and test-script registration form one indivisible source
unit: without any one of them, the default suite does not carry the proof. Use one
`lisa commit-ticket` invocation with exactly:

- `package.json`;
- `test/fixtures/alternate-boundary/boundary-contract.ts`;
- `test/swap-proof.test.mjs`.

No RDSPI attempt artifact enters the source commit.

## Verification surfaces

- direct swap-proof test;
- focused boundary/operation/leak/integration/swap-proof Node suite;
- TypeScript/Astro/Wrangler typecheck;
- `git diff --check` before commit;
- forbidden-path scoped Git diff;
- post-commit status of all three ticket-owned paths;
- ordinary index inspection.
