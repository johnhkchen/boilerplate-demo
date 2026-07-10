# Review — T-002-02-02 bundle-and-response-leak-check

## Outcome

The repository now has an executable disclosure assertion:

```sh
npm run build
npm run leak:check
```

`leak:check` holds `DEMO_SIGNING_KEY` out-of-band, scans every browser-delivered
file in `dist/`, fetches `/api/receipt` as raw text, and exact-matches that key. It
passes only after both evidence surfaces were read. A match fails with the exact
client asset path or response-body URL and never prints the matching key.

The existing fault mechanism now recognizes `DEMO_FAULT=leak`. Only in that
explicit server state, the receipt boundary returns HTTP 200 with the actual
configured signing key in a diagnostic field. This makes a real disclosure—not a
missing-key or canned-fixture condition—turn the checker red. Unknown values remain
healthy/off, and existing broken/stalled behavior is unchanged.

The acceptance behavior is implemented and deterministically covered. A real
local HTTP pair could not run because the managed host prohibits socket binding;
the exact normal-host confirmatory commands are noted below.

## Files created

| File | Purpose |
|---|---|
| `src/lib/leak-check.ts` | Node operator core: asset traversal, exact matching, bounded raw response read, results, formatter |
| `scripts/leak-check.ts` | Env/`.dev.vars` resolution, output, exit codes |
| `test/leak-check.test.mjs` | Clean/leak/error/timeout integration coverage with filesystem and fetch seams |
| `docs/active/work/T-002-02-02/research.md` | Codebase/boundary map |
| `docs/active/work/T-002-02-02/design.md` | Options, decisions, rationale |
| `docs/active/work/T-002-02-02/structure.md` | File/interface blueprint |
| `docs/active/work/T-002-02-02/plan.md` | Ordered implementation and verification plan |
| `docs/active/work/T-002-02-02/progress.md` | Execution log, evidence, deviations |
| `docs/active/work/T-002-02-02/review.md` | This handoff |

## Files modified by this ticket

| File | Change |
|---|---|
| `src/lib/fault.ts` | Adds `leak` mode and deliberate non-mutating leak payload |
| `src/pages/api/receipt.ts` | Returns deliberate leak body only for parsed leak mode |
| `src/env.d.ts` | Documents third fault value and unsafe purpose |
| `test/fault.test.mjs` | Covers parsing, safe default, actual-key payload, non-mutation |
| `.dev.vars.example` | Documents leak mode and `leak:check` failure expectation |
| `package.json` | Adds `leak:check`, leak suite, and `@types/node` |
| `package-lock.json` | Locks Node types and transitive `undici-types` |

No file is deleted. The ticket's `phase` and `status` frontmatter fields were not
changed. `.gitignore` was already modified by the preceding Playwright work and is
not part of this ticket.

## Runtime behavior

### Client assets

Traversal includes every regular file recursively, so it covers prerendered HTML,
inline script containers, `_astro` assets, source maps, and future files copied
from `public/`. Files are matched as raw bytes, not by extension.

The only top-level exclusions are:

- `_worker.js/**` — server-only Cloudflare Worker output;
- `_routes.json` — deploy routing metadata;
- `.assetsignore` — deploy control metadata.

This prevents server implementation from being mislabeled browser exposure while
keeping client coverage broad. Paths are relative, slash-normalized, sorted, and
reported once per matching file. Symlinks are not followed outside the bundle.

### Boundary response

The checker reads response text before parsing and regardless of HTTP status. A
new JSON field, malformed JSON, or leaking error body is therefore detectable.
The fetch plus body read is raced against `LEAK_CHECK_TIMEOUT_MS` (default 2000ms)
and aborted on deadline.

### Configuration and exit codes

```text
bundle       LEAK_CHECK_DIR (default dist)
response     LEAK_CHECK_URL, else DEMO_BASE_URL + /api/receipt
key          DEMO_SIGNING_KEY, else .dev.vars fallback
timeout      LEAK_CHECK_TIMEOUT_MS (default 2000)
```

- exit 0: assets and response checked, no key found;
- exit 1: one or more exact locations found;
- exit 2: invalid config or evidence unavailable.

Missing key, missing/empty bundle, unreadable response, and invalid timeout are
never treated as proof of safety.

## Acceptance evidence

### Clean configured-key case

A real Astro/Cloudflare build ran with a distinctive signing marker configured in
process env. The build passed and exact search found no marker in `index.html` or
`_astro`. The production CLI then scanned the real build plus a safe raw response:

```text
✓ leak check — passed
    client assets    2 checked
    response bodies  1 checked
```

It exited 0. This proves green is not produced merely because no key was supplied.

### Response leak case

The production CLI ran with the identical marker and build while only response
content changed to include the marker. It exited 1 and reported:

```text
✗ leak check — secret reached 1 browser surface
    response body: <exact response URL>
```

The literal key was absent from output. A committed integration test goes further:
with the same key and receipt, healthy serialization passes; the actual
`leakSigningKey(receipt, key)` fault payload fails at the boundary URL.

### Client asset leak case

A temporary ignored file in `dist/_astro/` contained the same style of distinctive
marker. The production CLI exited 1 and named exactly:

```text
client asset: _astro/ticket-leak-fixture.js
```

The marker was not printed. The fixture was deleted immediately after the run.
A committed test also verifies nested paths and simultaneous location ordering.

## Verification completed

- `npm test` — **pass, 28/28**, zero skipped/failing.
- `npx tsc --noEmit` — **pass**.
- `npm run build` — **pass**.
- configured-key real client build scan — **pass, no match**.
- production CLI clean case — **exit 0**.
- production CLI response leak — **exit 1, exact response location**.
- production CLI asset leak — **exit 1, exact asset path**.
- `npm ls @types/node undici-types` — **pass**.
- `git diff --check` — **pass**.
- ticket frontmatter diff — **empty**.
- temporary fixture absence — **confirmed**.

The full unit suite covers healthy configured evidence, asset/response leaks,
actual fault-payload composition, Worker/metadata exclusion, deterministic multi-
finding output, no key in formatter output, invalid config, missing/empty bundle,
network failure, and a bounded fetch that ignores abort.

## Dependency note

TypeScript initially exposed that the repository had no Node declarations for the
existing `scripts/ops-check.ts` or the new operator files. Added
`@types/node@22.19.7`; its normal transitive `undici-types@6.21.0` is locked.
Installation used cached tarballs because network/default-cache writes were not
available, then package metadata was normalized to ordinary registry resolution.
There are no temporary file dependencies. npm audit reported zero vulnerabilities.

## Open concerns and reviewer gates

### Live HTTP confirmation

Astro startup on `127.0.0.1:4324` failed with host-policy `listen EPERM`. Therefore
the real route was compiled but not requested over a socket in this session. On a
normal host, confirm with the same key in `.dev.vars`:

```sh
npm run build
npm run dev
npm run leak:check
```

Expect exit 0 with `DEMO_FAULT` unset. Then set only `DEMO_FAULT="leak"`, restart
the server, and run the identical checker; expect exit 1 naming
`http://localhost:4321/api/receipt`, with no key in output.

This is confirmatory rather than an uncovered logic branch: the route build,
fault helper, real-payload checker composition, raw response inspection, CLI exit
semantics, and output safety all have completed evidence.

### Output-layout evolution

The scanner intentionally encodes the current Astro/Cloudflare boundary:
`_worker.js` is server-only and deploy metadata is excluded. If the adapter changes
its output layout, update these narrow exclusions after inspecting what Cloudflare
actually serves. Do not broaden them speculatively.

### Scope for the next ticket

`leak:check` expects an existing build and reachable response. That is deliberate:
T-002-02-03 owns the one-command server/build/ops/flow/leak orchestration and its
overall deadline. This ticket's stable exit codes and location lines are ready for
that composition.

## Commit status — process concern

Incremental commits were attempted with explicit ticket paths. Git failed before
staging because `.git/index.lock` cannot be created in this read-only Git mount.
No commit was created.

In a writable checkout, commit explicit paths according to the boundaries in
`progress.md`; do not use `git add -A`. The tree contains unrelated Lisa/Vend and
preceding Playwright work. In particular, `package-lock.json` was already modified
by the Playwright ticket and now also contains this ticket's Node typing entries,
so preserve both legitimate changes while attributing commits carefully.

## Final assessment

The requested P3 assertion is implemented with positive clean proof, deliberate
real-key failure proof, exact asset/response attribution, safe output, and bounded
response behavior. No critical implementation issue is known. The only incomplete
environmental evidence is the normal-host live socket pair; the managed sandbox,
not the application, blocked it.
