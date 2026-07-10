# Plan — T-002-02-02 bundle-and-response-leak-check

## Completion evidence

Deliver `npm run leak:check` over an existing Astro build and receipt response.
Exit zero only after both clean surfaces were read; exit one with exact locations
for a real key; exit two when evidence cannot be established.

Acceptance needs paired proof with one marker: healthy build/response passes,
`DEMO_FAULT=leak` fails naming the response, and a synthetic leaked asset fails
naming its relative path.

## Step 1 — extend fault contract

Modify `src/lib/fault.ts` to add `leak` parsing and a non-mutating
`leakSigningKey(receipt, key)` result. Expand `test/fault.test.mjs` first/alongside:

- lower/upper/spaced `leak` parses;
- typo remains `off`;
- deliberate body contains exact key;
- normal receipt does not;
- source receipt remains unchanged.

Verify the focused fault test. Commit intent: `Add deliberate leak fault payload
(T-002-02-02)`.

## Step 2 — wire HTTP edge

Modify the route to return the deliberate 200 leak body only in `leak` mode.
Update env/example comments without enabling the flag or committing a real key.

Verify type-check plus existing fault/ops suites. Commit intent: `Wire
DEMO_FAULT=leak into receipt response (T-002-02-02)`.

## Step 3 — implement core test-first

Create `test/leak-check.test.mjs` with temp bundle fixtures and injected response
fetches. Then implement `src/lib/leak-check.ts`:

- validate config;
- recursively scan client files;
- narrowly exclude Worker/deploy metadata;
- exact byte-match assets;
- bounded raw-text response match;
- deterministic findings and checked counts;
- safe location-only formatter.

Verify clean, asset leak, response leak, simultaneous findings, exclusions,
missing evidence, fetch failure, timeout, and no-secret-in-output cases.

Commit intent: `Add bundle and response leak-check core (T-002-02-02)`.

## Step 4 — executable edge

Create `scripts/leak-check.ts` resolving directory, URL, timeout, and key from env
or `.dev.vars`. Add `leak:check` and the test file to `package.json`, preserving
all sibling changes.

Exercise missing key/directory and invalid timeout: each must exit 2 safely.
Commit intent: `Add leak:check command (T-002-02-02)`.

## Step 5 — regression verification

Run:

```sh
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Confirm existing operation, ops, and fault suites stay green. Inspect emitted
layout: client scan includes `index.html` and `_astro/*`, excluding `_worker.js`,
`_routes.json`, and `.assetsignore`.

## Step 6 — clean configured-key proof

Use a distinctive ephemeral marker only in process environment. Build and scan
the real Astro client output; require positive asset count and no findings.

If sockets are allowed, start healthy Astro with that key and run the CLI using
the same key; require exit 0 and one checked response. If listener creation is
denied, record the host error and use committed filesystem/fetch integration
coverage plus the real build scan.

## Step 7 — deliberate response proof

With identical key/check invocation, change only server state to
`DEMO_FAULT=leak`. Require red result, `response body:` plus exact URL, no key in
output, and a 200 body. Attempt live when possible; otherwise exercise the actual
fault payload through the raw-response seam and record the limit.

## Step 8 — asset-location proof

Create a temporary nested browser asset containing the same marker. Require a red
result naming exactly its relative path. Add marker to synthetic `_worker.js` and
prove it is excluded. Remove temporary evidence afterward.

## Step 9 — progress and commits

Write `progress.md` with completed units, exact test results, deviations, remaining
work, and commit hashes or permission blockers. Stage explicit paths only; never
absorb unrelated dirty files. Do not change ticket frontmatter.

## Step 10 — Review

Re-read ticket and diff. Write `review.md` summarizing files, behavior, acceptance
evidence, test coverage, open concerns, host limitations, and commit status. Stop
after Review for Lisa.

## Verification matrix

| Contract | Evidence |
|---|---|
| healthy configured key absent from client | real Astro build + exact scan |
| healthy response clean | injected raw response; live if allowed |
| leak mode exposes actual key | fault helper and route branch |
| response leak red with location | response finding names URL |
| asset leak red with location | temp nested fixture names path |
| server code excluded | `_worker.js` fixture test |
| key never printed | formatter/CLI output assertions |
| missing evidence not green | config/fs/network failure tests |
| run bounded | abort-aware fetch timeout test |
| regressions absent | full tests, TypeScript, Astro build |

## Risks to watch

- Injected hanging fetch must observe abort or it can hang forever.
- Symlinks must not escape the bundle root.
- Errors must not include body content or secret.
- Output layout may evolve; exclusions stay narrow and coverage broad.
- CLI tests must not accidentally read a developer's `.dev.vars`.
- Concurrent package edits must be preserved.
