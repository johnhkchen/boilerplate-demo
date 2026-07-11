# T-004-02-02 — versioned-promote-and-rollback — Design

Decisions grounded in research.md. The decision record already binds the
mechanism (promotion = `versions upload` + `versions deploy`); this design
decides everything around that mechanism.

## Shape of the deliverable

Two operator commands, one shared pure core, following the repo's
pure-core/thin-edge convention:

```
npm run promote -- <commit-ish> [--yes] [--skip-verify]   # gate → upload → smoke → pointer-move → verify → record
npm run rollback [-- <version-id>] [--yes]                # resolve prior → pointer-move → verify → record
```

- `src/lib/promote.ts` — pure, unit-tested: argument parsing, refusal rules,
  porcelain classification, wrangler output parsing, record/message formats,
  version-selection logic for rollback.
- `scripts/promote.ts`, `scripts/rollback.ts` — thin edges owning git/npm/
  wrangler subprocesses, env, stdout, exit codes.

**Rejected:** bash scripts or justfile-only recipes (repo convention is TS
scripts with tested cores; justfile wraps only dev/build/preview); a single
`release.ts` multiplexer (two verbs with different safety profiles deserve
two entry points; the core is shared anyway).

## Decision 1 — Exact-commit strategy: verify-in-place, refuse otherwise

`promote <commit-ish>` resolves via `git rev-parse --verify` to a full sha and
**requires the working tree to BE that commit**: `HEAD == sha` and no drift
that could contaminate the build. It then builds and verifies in place.

- **Rejected — hermetic temp worktree build** (`git worktree add` + `npm ci` +
  browser install per promote): honest but adds multi-minute setup per
  promote, duplicates what CI already does on a pristine checkout, and the
  verify gate (Playwright) is unreliable under local agent env anyway
  (memory note). Cost outweighs purity for a single-operator template.
- **Rejected — trust-the-caller** (just record `rev-parse HEAD`): cannot honor
  "resolves an exact commit … refuses" — a dirty tree would upload code that
  is not the named commit.

Refusal rules (exit 1, nothing uploaded):
1. Commit-ish does not resolve.
2. `HEAD` ≠ resolved sha (message tells the operator to `git checkout <sha>`;
   detached HEAD is fine — that is CI's normal state).
3. `git status --porcelain` shows tracked modifications/stages, **or**
   untracked files under build-input paths (`src/`, `public/`, `scripts/`,
   `test/`, `tests/`, `migrations/`, or root config files). Untracked files
   elsewhere (`docs/`, `.lisa/` — Lisa's in-flight artifacts) produce a
   warning, not a refusal: they cannot reach the build, and refusing on them
   would block every promote from a working Lisa checkout.

## Decision 2 — The verify gate runs inside promote, with one escape hatch

Default: promote runs `npm run verify` after the tree checks and refuses on
any failure (exit 1, nothing uploaded). `--skip-verify` exists for exactly one
caller: CI, where the same tree passed the workflow's own verify step minutes
earlier in the same job. The gate definition stays single-sourced in
package.json either way; the flag only skips invoking it, and promote prints
loudly when skipped.

**Rejected:** promote never verifying (violates the acceptance criterion);
promote being the only verify runner in CI (a dedicated red/green "Verify"
step in the workflow is more legible than a failure buried inside promote).

## Decision 3 — Two-step upload → smoke → deploy, capturing IDs robustly

1. `wrangler versions upload --tag <short-sha> --message "<subject>"` — builds
   nothing itself (promote runs `astro build` first, same as today's deploy
   script) and returns the immutable version ID + preview URL.
2. **Pre-promotion smoke test** on the version preview URL (the thing
   `preview_urls: true` was pinned for): GET `/` expects 200 HTML, and
   `ops-check` (keyless mode) against `<preview>/api/receipt`. Failure here
   refuses the pointer-move — the bad version simply never serves.
3. `wrangler versions deploy <id>@100% --yes --message "promote <sha12>
   prior=<prior-version-id>"` — the atomic pointer-move.

IDs are captured via `WRANGLER_OUTPUT_FILE_PATH` ND-JSON (documented wrangler
machine output) with a stdout-regex fallback; both parsers live in the pure
core with unit tests. The prior version ID is read from
`wrangler deployments status/list --json` *before* deploying. Version tags use
the 12-char short sha (tags have a short length budget; the full sha rides in
the version message and the promotion record).

**Rejected:** single `wrangler deploy` (no preview smoke, no explicit version
identity, exactly what the decision record moved away from); percentage/
gradual rollouts (always 100% — a two-Worker demo doesn't need canaries;
out of scope per MVP decision).

## Decision 4 — Records: Cloudflare is the ledger, a local file is the cache

- **Durable record (survives machines):** the version tag (short sha), the
  version message (full sha + subject), and the deployment message
  (`promote <sha12> prior=<version-id>` / `rollback to <id> from <id>`).
  `wrangler deployments list` therefore reconstructs the full history with no
  local state.
- **Local record (convenience):** append one JSON line per promote/rollback to
  `.promote/history.jsonl` and rewrite `.promote/last.json`
  ({commit, versionId, priorVersionId, deployedAt, hostVerified}). Gitignored.
- **Stdout:** promote/rollback print the record as their final output.

**Rejected — committed ledger file** (e.g. docs/knowledge/promotion-log.md):
promote legitimately runs from a detached HEAD (an old commit, a session's
commit, CI) where committing to main is impossible or wrong; and two Lisa
threads committing one shared file is the exact missing-DAG-edge hazard the
workflow doc warns about.

## Decision 5 — Runtime version identity via header on the receipt route

Add the `version_metadata` binding (`CF_VERSION_METADATA`) and stamp two
response headers on `/api/receipt` responses: `x-demo-version-id` and
`x-demo-version-tag`. Post-deploy, promote/rollback GET
`https://demo.b28.dev/api/receipt` and assert `x-demo-version-id` equals the
version just deployed — proof the *hostname* serves the *promoted version*,
not merely a 200.

- Headers, not body fields: the receipt signature canonically covers
  `boundary:issuedAt:nonce`; unsigned body fields would dilute the "signature
  covers the response" teaching claim, and re-canonicalizing breaks stored
  verifier expectations.
- No fourth API route: deployment.md documents the public surface as exactly
  three routes; a header keeps that inventory true.
- Version id/tag are non-secret (id is a UUID, tag is a public commit sha).

**Rejected:** `/api/version` endpoint (grows the documented surface for one
consumer); scraping `deployments status` alone (proves the pointer moved at
the API, not that the hostname serves it — the acceptance says *verifies the
hostname*).

## Decision 6 — Exit-code contract (extends the ops-check convention)

- `0` — promoted/rolled back **and** hostname verified.
- `1` — refused or failed **before** the pointer-move (tree dirty, verify gate
  failed, upload failed, preview smoke failed). Production untouched.
- `2` — misconfigured invocation (bad args, missing wrangler auth).
- `3` — pointer moved but post-deploy hostname verification failed: production
  *did* change and needs operator eyes (today's 530 state would land here).
  The record is still written, with `hostVerified: false`.

## Decision 7 — CI adopts promote; `npm run deploy` becomes bootstrap/config path

`.github/workflows/deploy.yml` replaces its `npm run deploy` step with
`npm run promote -- "$GITHUB_SHA" --yes --skip-verify`. Every mainline version
is then commit-tagged, every deployment message names its prior version, and
CI gains the preview smoke + hostname verification for free. The migrations
step stays where it is (D1 is outside versions; forward-only — research
constraint #3, documented not solved).

`npm run deploy` (full `wrangler deploy`) remains, re-scoped in docs to:
(a) the one-time bootstrap (Worker creation, D1 provisioning, custom-domain
attach — `versions upload` cannot do first-time trigger/domain attachment),
and (b) applying `routes`/trigger config changes, which version uploads do
not apply. This split is documented in deployment.md.

**Rejected:** leaving CI on `wrangler deploy` (untagged versions keep
appearing; a main push would silently supersede a promoted commit with no
recorded prior — the two release paths would diverge permanently).

## Decision 8 — Rollback is versions-deploy of a recorded prior; never rebuilds

`npm run rollback` resolves its target as: explicit `<version-id>` arg →
else previous deployment's version from `wrangler deployments list --json`
(cross-checked against `.promote/last.json` when present; mismatch = warn,
API wins). Refuses if target == currently-active version. Then the same
pointer-move + hostname-verify + record as promote. No build, no verify gate:
the target is an immutable, already-verified version — rebuilding is exactly
what the decision record forbids ("instant rollback, no rebuild").

**Rejected:** wrapping `wrangler rollback` (same primitive underneath, less
control over message format and JSON capture; using one primitive —
`versions deploy` — for both directions keeps the core testable and symmetric).

## Decision 9 — GC / retention posture (documentation, not code)

Platform facts: rollback reaches the 100 most recently published versions;
the active deployment's version is retained and served by definition; version
uploads (not time) advance the window. deployment.md gets a "Promotion and
rollback" section stating: the active version cannot be garbage-collected
out from under the domain; the practical rollback horizon is the last 100
uploads; commit tags + deployment messages are what keep any of them
identifiable. No pinning code exists to write — there is no delete-version
API surface in this flow to defend against.

## Known limitation accepted into this design

End-to-end hostname verification cannot pass until the T-004-02-01 operator
step (delete stale CNAME → attach domain) lands — demo.b28.dev currently 530s.
Promote/rollback will be fully exercised through `--dry-run` paths, unit
tests, and (if run live) exit-3 semantics; the first real green `0` exit is
an operator-day event, and review.md will say so.
