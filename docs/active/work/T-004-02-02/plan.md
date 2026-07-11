# T-004-02-02 — versioned-promote-and-rollback — Plan

Ordered, independently verifiable steps. Five commits matching structure.md's
ordering. Verification commands are exact; "green" means exit 0.

## Step 1 — Runtime version identity (commit 1)

**Changes**
- `wrangler.jsonc`: add `version_metadata` binding `CF_VERSION_METADATA`
  with a one-line comment (promote verifies the hostname serves the promoted
  version via this).
- Run `npm run worker:types` to regenerate `worker-configuration.d.ts`.
- `src/pages/api/receipt.ts`: stamp `x-demo-version-id` / `x-demo-version-tag`
  headers on all responses of the route via the `json()` helper (and the
  `stalled` 499 path can be left unstamped — it only resolves on abort);
  guard for the binding being absent (`astro dev` / tests). Values come from
  `env.CF_VERSION_METADATA?.id` / `.tag`.

**Verify**
- `npm run worker:types:check` green (binding ↔ generated types agree).
- `npm run typecheck` green.
- `npm test` green (no unit test touches the route file, but keeps the base
  honest).
- `npm run deploy:dry` green (config validates with the new binding).
- Runtime spot-check: `npm run build && npm run preview` (wrangler dev), then
  `curl -si http://localhost:8787/api/receipt | grep -i x-demo-version` shows
  both headers (wrangler dev fabricates version metadata locally). If
  Playwright/agent-env issues bite (memory note), fall back to asserting via
  `curl` only — no flow test involved.

**Commit** `feat(deploy): expose the running Worker version on the receipt route`

## Step 2 — Pure core + unit tests (commit 2)

**Changes**
- `src/lib/promote.ts` with the exports listed in structure.md (arg parsers,
  `classifyPorcelain`, wrangler output parsers, `parseDeploymentsList`,
  `pickRollbackTarget`, tag/message/record formatters, `extractCustomDomain`,
  `EXIT`).
- `test/promote.test.mjs` covering: both arg parsers (happy, unknown flag,
  missing commit-ish, non-TTY implications are edge concerns — not here);
  porcelain classification matrix (clean / tracked-mod / staged / untracked
  src / untracked docs / untracked root config); output-file parser against a
  captured `WRANGLER_OUTPUT_FILE_PATH` fixture and stdout fallback against
  captured `versions upload` output; deployments-list normalization from a
  captured `--json` payload; rollback target selection (5 cases from
  structure.md); message/record round-trips; `extractCustomDomain` on the
  real wrangler.jsonc contents and on a no-routes variant.
- `package.json`: append `test/promote.test.mjs` to the `test` script.

**Fixture capture (before writing parsers):** run
`WRANGLER_OUTPUT_FILE_PATH=/tmp-scratch npx wrangler versions upload --dry-run`
and `npx wrangler deployments list --json` against the real Worker; embed the
(non-secret) shapes as fixtures in the test file. If `--dry-run` emits no
output-file entry, capture the shape from a real upload during Step 3's
dry-run work instead — parser tolerates absence by design.

**Verify** `npm test` green; `npm run typecheck` green.

**Commit** `feat(deploy): promotion core — refusal rules, wrangler parsers, records`

## Step 3 — Edge scripts (commit 3)

**Changes**
- `scripts/promote.ts`, `scripts/rollback.ts` per structure.md sequences.
- `package.json`: `"promote"`, `"rollback"` scripts.
- `.gitignore`: `.promote/`.

**Verify (no production mutation)**
- `npm run promote -- not-a-commit` → exit 1, "does not resolve".
- `npm run promote -- HEAD~1` → exit 1, "checkout the commit first" (HEAD
  mismatch path).
- Dirty-tree refusal: `touch src/__scratch.ts` → promote HEAD refuses; rm it.
  Untracked docs warning path: already exercised by the live Lisa artifacts.
- `npm run promote -- HEAD --skip-verify --dry-run` → runs tree checks,
  prints the skip notice, builds, `versions upload --dry-run`, exits 0,
  uploads nothing (confirm `wrangler versions list --json | head` unchanged).
- One full-gate run `npm run promote -- HEAD --dry-run` → `npm run verify`
  executes inside promote (accept the multi-minute cost once; if the
  Playwright flow exits early under the agent env — known issue — rerun that
  gate assertion via CI later and note it in progress.md).
- `npm run rollback -- --dry-run` → prints plan: target = previous deployment
  version from live `deployments list`, refuses nothing, deploys nothing.
- Misuse: `npm run rollback -- --bogus` → exit 2 usage.

**Decision point (live test):** a real `promote HEAD --skip-verify --yes` is
a production pointer-move on the demo Worker. It is *allowed* (CI deploys
main on every push already) but demo.b28.dev 530s pre-operator-step, so the
run would end exit 3. Do ONE live run to prove upload→smoke→deploy→record end
to end (preview smoke + workers.dev-era verification), expect exit 3 with
`hostVerified: false`, then a live `rollback --yes` (also exit 3) to prove
the round-trip and restore the prior pointer. Record both outputs in
progress.md. If the preview smoke fails for environmental reasons, stop and
reassess rather than forcing the pointer-move.

**Commit** `feat(deploy): npm run promote / rollback — verify-gated versioned release`

## Step 4 — CI adopts promote (commit 4)

**Changes**
- `deploy.yml`: swap `npm run deploy` step for
  `run: npm run promote -- "$GITHUB_SHA" --yes --skip-verify`
  (env unchanged: CLOUDFLARE_API_TOKEN / ACCOUNT_ID), retitle step, update
  the header comment (deploy = bootstrap/config path; promote = release
  path; skip-verify justified by the preceding verify step).

**Verify**
- `actionlint` if available, else YAML sanity via `npx yaml` or careful read.
- No push happens in this ticket (repo has unpushed commits per T-004-02-01's
  gate); first CI run of this workflow is an operator-day event alongside the
  CNAME deletion. Say so in review.md.

**Commit** `ci(deploy): release via versioned promote instead of bare deploy`

## Step 5 — Documentation (commit 5)

**Changes** — `docs/knowledge/deployment.md`:
- New section "Promotion and rollback": the two commands with examples
  (`npm run promote -- <commit>`, `npm run rollback`), what promote refuses
  (dirty tree, wrong HEAD, failed verify, failed preview smoke), exit-code
  table (0/1/2/3), where records land (version tag + deployment message on
  Cloudflare; `.promote/` locally), hostname verification via the
  `x-demo-version-*` headers.
- Retention/GC paragraph: active version cannot be GC'd (it *is* the
  deployment); rollback horizon = 100 most recent uploads; tags keep versions
  commit-addressable. D1 caveat: migrations are forward-only and outside
  versions — rolling back the Worker does not roll back the schema; promoting
  an old commit runs it against the current schema.
- Re-scope `npm run deploy`: one-time bootstrap and `routes`/trigger config
  changes only (version uploads do not apply those); routine releases go
  through promote (CI does this on push to main).
- Release-verification section: add the header check
  `curl -si https://demo.b28.dev/api/receipt | grep -i x-demo-version`.

**Verify** re-read for consistency with actual script behavior/flags;
`npm test` still green (docs-only commit, cheap insurance).

**Commit** `docs(deploy): promotion, rollback, retention, and the deploy/promote split`

## Testing strategy summary

- **Unit (node:test):** all pure-core branching — the only place refusal
  logic, parsers, and target selection live. New file in the `test` list.
- **Integration (manual, this ticket):** dry-run promote paths; one live
  promote+rollback round-trip with expected exit 3 (hostname unattached);
  fixtures captured from real wrangler output.
- **Deferred to operator day (documented, not silently dropped):** exit-0
  hostname verification; first CI promote run. These land when the
  T-004-02-01 CNAME step is done.
- **Regression:** full `npm run verify` before each commit that touches
  runtime or config (Steps 1, 3); `npm test + typecheck` for the others.

## Risks & fallbacks

- `WRANGLER_OUTPUT_FILE_PATH` entry shape differs from expectation → stdout
  regex fallback is first-class and fixture-tested; worst case promote asks
  the operator to pass `--version-id` from wrangler's printed output (not
  built unless needed).
- `versions upload` requires an existing Worker → fine here; documented as
  the bootstrap boundary for adopters.
- Preview URL absent (`has_preview: false` seen on secret-triggered
  versions) → warn-and-continue path (structure.md step 6).
- Playwright-in-agent-env flakiness → gate assertions lean on CI; noted per
  occurrence in progress.md.
