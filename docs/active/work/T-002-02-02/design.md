# Design — T-002-02-02 bundle-and-response-leak-check

## Decision summary

Add a dedicated leak-check core and CLI. The check receives the exact signing key
out-of-band, scans every browser-delivered file in the completed Astro `dist/`
tree, fetches `/api/receipt` as raw text, and reports every location containing
that exact value without ever printing the value. Extend the existing fault parser
and route with an explicit `leak` mode that places the server key in the response
body. Add `npm run leak:check` as the focused command that the next ticket can
compose with ops and browser checks.

The check fails closed when its key, build directory, or response cannot be read.
A green result means both surfaces were actually inspected with the same non-empty
marker configured server-side; it never treats missing evidence as safety.

## Decision 1 — exact marker, not heuristic secret detection

Search for the exact `DEMO_SIGNING_KEY` value as bytes/text. The checker obtains
the key from process env or `.dev.vars`, matching `ops:check`. This directly
answers whether this configured server secret reached a browser surface and
permits a clean proof with the secret present server-side.

Searching for `secret`, `key`, token-shaped strings, or high-entropy substrings is
rejected: it flags safe documentation, variable names, signatures, and hashes,
while still missing provider-specific formats. Source import analysis alone is
also rejected because it cannot prove emitted assets or runtime responses.

## Decision 2 — raw asset bytes and raw response text

Asset files are read as buffers and searched for the UTF-8 bytes of the key. This
covers HTML, JavaScript, CSS, source maps, JSON, and copied binary/public files
without guessing extensions. One match makes the file a finding.

The response is read with `response.text()` before parsing. A leak field added to
otherwise valid JSON must be caught even if application code ignores it. HTTP
status does not exempt a body from inspection; error responses can leak too.
JSON field selection is rejected because it repeats the ops check's blind spot.

## Decision 3 — classify the build by delivery boundary

The observed Cloudflare build contains static `index.html` and `_astro/*` assets,
plus server-only `_worker.js/` and deploy metadata `_routes.json` and
`.assetsignore`. A build with a distinctive server key contained no marker.

Scan every regular file recursively except top-level `_worker.js` and descendants,
`_routes.json`, and `.assetsignore`. This includes current static assets and future
files copied from `public/`, while excluding Worker implementation and routing
control data that the browser does not receive.

Scanning all of `dist/` is rejected because Worker output is server code and may
legitimately contain environment access. Scanning only `_astro/` is rejected
because it misses prerendered HTML, inline scripts, and public files.

## Decision 4 — structured findings and safe output

The core returns findings shaped as asset/response plus location. The formatter
prints one stable line per unique location with labels `client asset:` and
`response body:`. It never prints matching snippets, offsets, hashes of the key,
or the key itself. Paths are forward-slash relative paths and findings are sorted.

A clean summary reports counts of asset files and response bodies checked. A
missing build, zero included client files, unreadable response, invalid timeout,
or missing key is checker failure, never a clean pass.

## Decision 5 — focused command and configuration

Add `npm run leak:check` using Node TypeScript stripping. Configuration is:

- `LEAK_CHECK_DIR`, default `dist`;
- `LEAK_CHECK_URL`, else `DEMO_BASE_URL + /api/receipt`;
- `LEAK_CHECK_TIMEOUT_MS`, default 2000;
- `DEMO_SIGNING_KEY`, else `.dev.vars` fallback.

The command inspects an existing build; it does not build or start a server. This
keeps it composable for T-002-02-03, which can own one server lifecycle and an
overall time budget. Exit codes mirror `ops:check`: 0 clean, 1 leak found, and 2
misconfigured or evidence unavailable.

Folding into `ops:check` is rejected because behavioral signature validation and
raw disclosure detection have different inputs and failure meanings. Automatic
build is rejected because it adds side effects and still cannot own the response
server lifecycle cleanly.

## Decision 6 — deliberate leak mode

Extend `FaultMode` to `off | broken | stalled | leak`. Exact normalized parsing
retains fail-safe behavior. In the route, create the valid receipt and, only for
`leak`, return the receipt plus a diagnostic field containing the actual key. The
response remains 200 so the leak assertion—not status handling—turns the run red.

The actual configured marker, not a canned fixture, must leak. This proves real
disclosure detection. A pure `leakSigningKey(receipt, key)` helper in `fault.ts`
makes the dangerous branch deterministic and testable; its naming and comments
must make the deliberate unsafe purpose explicit.

Build-time client injection is rejected. The established fault flag is runtime
server state, and adding a second build-time channel would not reuse that seam.
Synthetic bundle fixtures prove exact asset-path reporting; the real fault proves
response detection.

## Decision 7 — module boundary

`src/lib/leak-check.ts` owns matching, traversal, bounded response inspection,
structured results, and formatting. It is Node-only operator code and must never
be imported by pages or route code. `scripts/leak-check.ts` owns env/file config,
stdout/stderr, and exit codes.

Shared `.dev.vars` parsing could be extracted from `ops-check`, but that expands
scope and risks disturbing a stable command. A small local parser is acceptable;
the security behavior lives in the tested core.

## Test strategy

Tests will prove:

- `leak` parses tolerantly while typos remain `off`;
- deliberate body contains the exact key and healthy receipt does not;
- clean synthetic bundle plus clean raw response passes with positive counts;
- nested leaked asset fails and names its relative path;
- Worker and deploy metadata containing the key are excluded;
- leaking raw response fails and names the URL;
- simultaneous findings report both without printing the key;
- missing key/directory, empty bundle, invalid timeout, and fetch failure cannot
  produce a green result;
- a hanging abort-aware fetch is bounded.

Build verification uses a distinctive configured server key, runs Astro build,
and scans emitted client assets. Live route verification will be attempted if the
host permits sockets; deterministic filesystem/fetch tests remain committed proof
when the managed sandbox blocks listeners.

## Security properties

- The key is supplied only to exact matching and deliberate fault construction.
- No formatter, error, test title, or artifact records the value.
- A match reports location only.
- A missing surface is an error, not a pass.
- Worker code is not mislabeled as browser content.
- `leak` is opt-in; unknown values remain safe.
- Healthy route and receipt behavior are unchanged.

## Scope boundary

This ticket does not add the final all-check command, CI, a JSON report file,
provider-token heuristics, arbitrary log redaction, source linting, or deployment.
T-002-02-03 owns composition; this command exposes stable output for it.
