# Research — T-002-02-02 bundle-and-response-leak-check

## Ticket contract

The ticket turns the P3 secret boundary from a convention into an executable
negative assertion. The same server-side signing key must be configured in both
cases: a healthy build and response pass, while deliberate `DEMO_FAULT=leak`
causes a failure that identifies the exact client asset path or response body.

The ticket starts in `phase: research`; no work directory existed at inspection.
The ticket depends on T-002-01-04, which is complete. T-002-02-03 depends on this
ticket and will later compose leak, ops, and Playwright checks into one command.
This ticket therefore needs a focused leak command with stable output and exit
semantics, but does not own the final all-checks orchestration.

## Existing server boundary

`src/pages/api/receipt.ts` is the only on-demand API route. It opts out of Astro
prerendering, reads `locals.runtime.env.DEMO_SIGNING_KEY`, validates the key, and
returns a signed receipt. The key is not `PUBLIC_` prefixed and is not imported
through a client-visible environment API.

The healthy body contains `boundary`, `issuedAt`, `nonce`, `algorithm`,
`signature`, and `keySource`. It does not contain the key. A missing or blank key
returns a safe 500 body that says only that the server signing key is not set.

`src/lib/receipt.ts` contains the pure HMAC receipt implementation. It accepts the
key as an argument, signs boundary/time/nonce, and returns a `Receipt`. The key is
never included in the returned object. `verifyReceipt` supports out-of-band proof
that the configured server key was used.

The page is prerendered but includes a bundled browser script that fetches
`/api/receipt` and renders selected receipt fields. That creates two distinct
browser exposure surfaces: static client assets generated under `dist/`, and the
raw response body delivered by the API boundary.

## Existing fault mechanism

`src/lib/fault.ts` defines `FAULT_ENV = 'DEMO_FAULT'`, a `FaultMode` union of
`off | broken | stalled`, tolerant parsing, and deterministic signature
corruption. Unknown, empty, or malformed values resolve to `off`.

The API route reads the flag from the same runtime env object as the key. In
`broken` mode it returns a well-shaped receipt with an invalid signature. In
`stalled` mode it waits for request abort. With the flag absent it returns the
healthy receipt.

`test/fault.test.mjs` verifies safe parsing, corruption behavior, and composition
with the ops check. It does not import the Astro route and does not currently
exercise response serialization. The test suite uses Node's built-in test runner
with TypeScript stripping and no third-party unit framework.

The ticket explicitly says to reuse this mechanism for `leak`, so `leak` belongs
in the existing union/parser and in the API route's response selection. It is a
deliberate unsafe response used only when the operator explicitly selects it.

## Existing operational check

`src/lib/ops-check.ts` fetches the receipt through `runOperation`, validates JSON
shape, and optionally verifies the signature with an out-of-band key. It reports
the `receipt` boundary and either `operation` or `timeout` failure kind.

`scripts/ops-check.ts` is the I/O edge. It resolves URL, timeout, and key from
process env, falling back to `.dev.vars` for `DEMO_SIGNING_KEY`. Its exit codes
are 0 for pass, 1 for boundary failure, and 2 for checker misconfiguration.

The ops check parses JSON and intentionally retains only known receipt fields. It
does not inspect raw response bytes for the key and cannot detect an added leak
field if shape validation remains permissive. Extending it would mix behavioral
health and disclosure checks and would not cover built client assets.

## Build and delivery layout

`astro.config.mjs` uses static output with the Cloudflare adapter. Static pages and
browser assets are emitted as deployable files, while the API becomes Worker
code. `dist/` is ignored and absent before a build in the inspected workspace.

The leak contract says “built client bundle,” not all generated deployment code.
Cloudflare server output may legitimately contain environment variable names and
server logic. Scanning every byte under `dist/` would scan Worker implementation
as though it were browser-delivered and blur the boundary being proven.

Astro/Cloudflare output needs to be classified by delivery, not file extension
alone. The deployment's static asset tree and route metadata determine what the
browser can request. The existing architecture comments describe static pages as
assets and `_worker.js` as the server boundary. Build inspection during Implement
must confirm the current adapter's concrete output before finalizing traversal.

The secret marker itself is the strongest oracle. Searching for the exact
configured value avoids heuristic false positives from words such as “secret” or
`DEMO_SIGNING_KEY`. A configured clean build proves the checker is not simply
reporting that no key was supplied.

## Configuration conventions

`.dev.vars` is gitignored and used for real local values. `.dev.vars.example`
documents a placeholder key and the `broken`/`stalled` flag values. Production
uses a Worker secret. Any leak check should use the same out-of-band key resolution
pattern as `ops:check`, so local one-command behavior remains consistent.

The package already has `build`, `ops:check`, unit `test`, and browser-flow scripts.
There is no leak-check script, source module, report format, or generated-evidence
ignore rule today.

## Observable output requirements

The acceptance criterion requires location, not merely a red exit. An asset
finding needs the relative browser asset path. A response finding needs the
boundary URL or a stable label such as `response body: <url>`. Output must never
print the secret itself; doing so would turn the checker into another disclosure
surface in CI logs.

Multiple findings are possible. Reporting all unique locations is more useful
than stopping at the first match and makes a single run sufficient for cleanup.
Occurrences or snippets are unnecessary and risk exposing the value.

A clean result should say both surfaces were checked. Otherwise a missing build
directory or skipped response could be mistaken for safety. Missing key, missing
bundle, invalid timeout, and unreachable boundary are checker/setup failures, not
clean passes.

## Test boundaries

Pure matching and formatting can be unit tested with synthetic asset entries and
response strings. Filesystem traversal can be integration-tested against a
temporary directory. Fetch can be injected to test healthy and leaking raw
responses without binding a socket.

The actual Astro build is a necessary regression check: build with a distinctive
server key, scan client assets, and confirm clean. The leak response path can be
verified by either calling the route with mocked locals or running a local server;
the managed environment may reject listener creation, as recorded by the prior
Playwright ticket, so unit/integration seams must carry deterministic coverage.

## Constraints and assumptions

- The exact non-empty key is the sensitive marker.
- The checker must hold that marker out-of-band to prove absence.
- The checker must not print or persist the marker.
- Response scanning must use raw text, before JSON field selection.
- Asset results must be relative, stable paths rather than machine-specific
  absolute paths.
- Unknown fault values remain healthy; only exact `leak` enables disclosure.
- The ticket owns a focused check; T-002-02-03 owns final orchestration.
- No ticket phase or status frontmatter may be edited.
- The dirty worktree belongs to concurrent/user work and must be preserved.
- Incremental commits should use explicit paths only.

## Research conclusion

All necessary seams already exist: a runtime-held key, a server fault parser, a
raw response boundary, an Astro build command, and the local key-resolution
convention. What is missing is an exact-marker leak-check core plus a thin CLI,
classification of browser-delivered build files, a deliberate `leak` response,
and tests proving both positive detection and a configured clean pass.
