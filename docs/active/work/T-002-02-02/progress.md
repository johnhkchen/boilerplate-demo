# Progress — T-002-02-02 bundle-and-response-leak-check

## Status

Implementation and verification are complete. Review remains. Ticket frontmatter
has not been changed.

## Completed

- Mapped existing receipt, ops-check, fault, build, and test boundaries.
- Confirmed an Astro/Cloudflare build emits browser files at `index.html` and
  `_astro/*`, server code under `_worker.js/`, and deploy metadata at
  `_routes.json` / `.assetsignore`.
- Built with a distinctive process-env marker; it did not appear under `dist/`.
- Chose exact-marker scanning and safe location-only output.
- Extended `FaultMode` and parsing with exact opt-in `leak` behavior.
- Added `leakSigningKey`, a non-mutating deliberate response transform using the
  actual configured key.
- Wired the receipt route to return that deliberate body at HTTP 200 only for
  `DEMO_FAULT=leak`; healthy, broken, stalled, and misconfigured paths remain.
- Updated env/example comments with the unsafe purpose and command.
- Added Node-only `src/lib/leak-check.ts`:
  - validates key, directory, URL, and timeout;
  - recursively reads regular browser files without following symlinks;
  - excludes only top-level `_worker.js/**`, `_routes.json`, `.assetsignore`;
  - exact-matches the key as UTF-8 bytes;
  - fetches and scans raw response text inside a timeout;
  - returns deterministic asset/response locations and evidence counts;
  - formats location-only output without receiving or printing the key.
- Added thin `scripts/leak-check.ts` with env/`.dev.vars` resolution and exit codes
  0 clean, 1 leak, 2 configuration/evidence failure.
- Added `npm run leak:check` and `test/leak-check.test.mjs` to the unit command.
- Added `@types/node` 22.19.7 because the repository's Node operator scripts had
  no Node declarations; this made both the existing ops script and new leak
  script/core type-check. `undici-types` 6.21.0 is its transitive dependency.

## Test implementation

`test/fault.test.mjs` now proves:

- normalized `leak` values parse;
- a typo remains safe/off;
- normal receipt serialization lacks the marker;
- the deliberate response contains the exact configured marker;
- the source receipt is not mutated.

`test/leak-check.test.mjs` proves:

- a configured clean asset set and clean response pass with positive counts;
- nested asset leakage reports its exact normalized relative path;
- Worker/deploy metadata containing the marker does not become a browser finding;
- raw response leakage reports the exact URL;
- the same real receipt passes healthy, then its actual `leakSigningKey` payload
  fails with the same configured key;
- multiple locations sort deterministically;
- formatter never emits the marker;
- missing/empty bundle, missing key, invalid timeout, and fetch errors never pass;
- a fetch that ignores abort still settles at the check's explicit race deadline.

## Verification results

### Unit and type checks

- `npm test` — pass: **28/28**, zero failures/skips, about 0.2 seconds.
- `npx tsc --noEmit` — pass after adding Node type declarations and correcting
  the asset marker parameter to `Buffer`.
- `npm ls @types/node undici-types` — pass: direct `@types/node@22.19.7`,
  transitive `undici-types@6.21.0`; Astro/Vite dedupes the same Node type version.
- `git diff --check` — pass.

The first TypeScript run exposed missing Node globals/modules in both the existing
`scripts/ops-check.ts` and the new Node files. This was a repository typing gap,
not a product failure. Cached package tarballs were installed offline using a
writable temporary npm cache because direct registry access and the default cache
write path were unavailable. Package metadata was normalized back to registry
semver/resolution entries; no temporary file dependency remains.

### Real build clean proof

Ran `npm run build` with a distinctive configured process-env key.

- Astro/Cloudflare build — pass.
- Browser output contained `index.html` and one `_astro/*.css` file.
- Exact marker search across `dist/index.html` and `dist/_astro` — no matches.
- The key was present in server configuration during build, so this is positive
  clean evidence rather than a missing-key assertion.
- Existing adapter warnings about Cloudflare sessions/Sharp remain unrelated.

### CLI clean proof

Ran the production `npm run leak:check` over the real `dist/` client bundle with
the same out-of-band marker and a safe raw `data:` response (used because sockets
are blocked).

- exit **0**;
- output: `✓ leak check — passed`;
- `client assets 2 checked`;
- `response bodies 1 checked`.

### CLI response-leak proof

Ran the identical production command/config with only the raw response changed to
contain the marker (base64 data URL prevents the literal marker appearing in the
reported location).

- exit **1**;
- output: `✗ leak check — secret reached 1 browser surface`;
- output names `response body:` and its exact URL;
- output does not contain the literal marker.

Committed tests additionally compose the exact real fault payload with the
checker: the same receipt/key passes healthy and fails after `leakSigningKey`.

### CLI asset-leak proof

Temporarily added an ignored file under `dist/_astro/` containing a distinct
marker, ran the production command against a clean response, then removed it.

- exit **1**;
- output named exactly `client asset: _astro/ticket-leak-fixture.js`;
- output did not print the marker;
- temporary fixture was deleted afterward.

## Live route attempt

Attempted Astro on `127.0.0.1:4324` with a distinctive configured key. The managed
host rejected `listen` with `EPERM: operation not permitted 127.0.0.1`, matching
the prior Playwright ticket's sandbox limitation. No request could reach the real
local HTTP route.

This does not leave the core behavior untested: the production build compiles the
route, fault tests prove its payload helper, source/build inspection proves the
route selects it only for parsed leak mode, and checker integration runs that
actual payload through the raw-response seam. A normal-host live pair remains a
useful confirmatory reviewer command.

## Commit attempt

Attempted the first explicit scoped commit with only this ticket's four phase
artifacts, `src/lib/fault.ts`, and `test/fault.test.mjs`. Git failed before staging:

```text
fatal: Unable to create '.git/index.lock': Operation not permitted
```

The checkout exposes `.git` read-only. No commit was created. Intended boundaries
remain:

1. phase artifacts + deliberate fault contract;
2. route wiring + docs;
3. leak core/tests;
4. CLI/package/dependency metadata;
5. progress/review.

Use explicit paths in a writable checkout; unrelated Lisa/Vend/Playwright work is
present in the tree and must not be staged wholesale.

## Deviations from Plan

- Live HTTP verification was replaced by real CLI runs over raw `data:` responses
  plus deterministic actual-fault-payload integration because listener creation
  is prohibited.
- Added `@types/node`, not anticipated in Structure, because TypeScript could not
  type either existing or new Node operator modules. This strengthens rather than
  narrows verification.
- Incremental commits were attempted but blocked by `.git` permissions.

## Remaining

- Write `review.md` and stop for Lisa.
