# Plan — T-002-01-03 exemplar-boundary-ops-check

## Goal and completion gate

Ship a runnable, tested ops-check command that composes the operation runner with
the exemplar boundary. Done only when **all five acceptance clauses** are proven:

1. `npm run ops:check` exists and runs.
2. Against a healthy local demo it **exits 0**.
3. …printing a trace that **names `receipt` with its latency**.
4. With the dev server down it **exits non-zero within its time budget**.
5. …still **naming `receipt`, with no raw stack trace**.

Plus the standing bars: committed automated tests cover every path via stub fetch and
pass in seconds; `npm run build` stays green and the script is absent from `dist/`;
the diff touches only this ticket's four files; `progress.md` records evidence and any
deviations.

## Testing strategy

- **Unit (committed, primary):** `test/ops-check.test.mjs` drives the pure core with a
  stub `fetch` and real `makeReceipt`-signed bodies — healthy, down, hung (timeout),
  tampered, bad-status, no-key, and a `formatBoundaryTrace` smoke check. This is what
  proves clauses 2–5 *deterministically* and lands the boundary coverage T-002-01-02
  deferred. Guarded by an outer per-test timeout so the hung case can't hang the suite.
- **Live (manual, confirmatory):** run `npm run ops:check` against `astro dev` (pass)
  and with it stopped (fail). Confirms the wrapper's config resolution, exit codes, and
  real-`fetch` abort behavior end-to-end — the parts a stub can't exercise.
- **Regression:** `npm run build`; grep `dist/` to confirm the script didn't enter the
  bundle.

Each step below is independently verifiable and sized to commit atomically.

## Step 1 — implementation log + baseline

Create `progress.md`: ticket summary, chosen design, planned units, and the baseline
(`npm test` → 4 passing before any change). Note the shared-branch/file-lock
constraint from sibling tickets.

Verify: `progress.md` exists; ticket frontmatter untouched; baseline recorded.
Commit: `Start ops-check implementation log (T-002-01-03)`.

## Step 2 — pure core `src/lib/ops-check.ts`

Write the module per Structure: `BoundaryCheckConfig`, `BoundaryCheckValue`,
`runBoundaryCheck`, `formatBoundaryTrace`, and the private `assertReceiptShape` /
`roundMs`. Compose `runOperation({ name: BOUNDARY_NAME, timeBudgetMs, invoke })`;
`invoke` does fetch → `res.ok` → parse → shape-check → optional `verifyReceipt` →
value. Import `operation-runner.ts` and `receipt.ts` by explicit `.ts` extension.
Erasable TypeScript only (no enums/namespaces).

Verify: `node --experimental-strip-types --check src/lib/ops-check.ts` (or a throwaway
import) loads without a syntax/type-strip error. No behavior asserted yet.
Commit: `Add ops-check core composing runner + boundary (T-002-01-03)`.

## Step 3 — test suite + widen `test` script

Write `test/ops-check.test.mjs` with the seven cases from Structure, injecting a stub
`fetchImpl` and using `makeReceipt(KEY)` for genuinely-signed bodies. Update
`package.json` `test` to run both suites (explicit file list). These land together so
the `test` script never names a missing file.

Verify: `npm test` → **all** tests pass (4 existing + new), suite finishes in
sub-second, exit 0. Specifically confirm: healthy→passed & `operationName==='receipt'`;
down→failed `operation`; hung→failed `timeout` within budget; tampered→failed;
no-key→passed with `signatureVerified:false`.
Commit: `Cover ops-check paths with stub-fetch suite (T-002-01-03)`.

## Step 4 — CLI wrapper `scripts/ops-check.ts` + `ops:check` script

Write the thin wrapper: resolve `url` / `timeBudgetMs` / `key` from env with the
documented defaults (host `127.0.0.1:4321`); tolerant `.dev.vars` parser for the key
fallback; try/catch around `runBoundaryCheck` → config error exits `2`; print
`formatBoundaryTrace`; exit `0`/`1` on outcome. Add `"ops:check"` to `package.json`.

Verify (offline, no server needed yet): `npm run ops:check` with nothing listening →
prints `✗ receipt — failed …`, names `receipt`, no stack, exits non-zero, returns
well within the budget. This already demonstrates clauses 4–5.
Commit: `Add ops:check CLI wrapper and npm script (T-002-01-03)`.

## Step 5 — live verification against the running demo

Start `astro dev` in the background (key present via `.dev.vars`). Then:

- **Healthy:** `npm run ops:check` → prints `✓ receipt — passed in N ms` with the
  receipt fields; **exit 0**. If the key was picked up, line reads "signature verified".
- **Down:** stop the dev server; rerun → `✗ receipt — failed in N ms [operation]`,
  names `receipt`, no stack; **exit non-zero**, elapsed < budget.
- **Hang safety (spot-check):** covered deterministically by the unit timeout case; no
  need to synthesize a hanging server live, but note the guarantee's source.

Record exact stdout + exit codes in `progress.md`. Stop the background server.

## Step 6 — regression + diff hygiene

- `npm run build` → green.
- `grep -rIl "runBoundaryCheck\|ops-check" dist/ || echo "not bundled"` → confirms the
  script/core did not enter the client build.
- `git status` / focused `git diff` → only `src/lib/ops-check.ts`,
  `scripts/ops-check.ts`, `test/ops-check.test.mjs`, `package.json`
  (+ `package-lock.json` untouched), and the `docs/active/work/T-002-01-03/` artifacts.
  No stray `git add -A`; stage files explicitly.

## Step 7 — review artifact

Write `review.md` only after Steps 1–6 pass: what changed, test coverage + gaps, live
evidence, exit-code contract, and open concerns (e.g. `--experimental-strip-types`
Node-version floor, `.dev.vars` fallback assumptions, downstream T-002-01-04 handoff).

## Risks & mitigations

- **`localhost` IPv6 refusal** → default host `127.0.0.1` (Design D5); `DEMO_BASE_URL`
  override documented.
- **Type-strip import resolution** → explicit `.ts` extensions on cross-module imports,
  matching the existing test's working pattern.
- **Astro build picking up the script** → it lives in `scripts/` outside `src/` and is
  imported by no page; verified by the `dist/` grep in Step 6.
- **Shared-branch commit races** → stage explicitly, one logical unit per commit, only
  this ticket's files; rely on the file lock as a safety net, not a substitute.
- **Missing key in some envs** → best-effort verification (Design D4): absent key still
  green-checks a reachable, well-formed boundary; only a *present* key that rejects the
  signature fails.

## Explicit non-goals (deferred)

Fault flag / broken / stalled modes (T-002-01-04); Playwright browser flow
(T-002-02-01); any change to the boundary, page, deploy, or env contract; retries,
polling, JSON report files, correlation IDs; a test framework dependency.
