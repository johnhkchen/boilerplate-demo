# T-004-02-02 — versioned-promote-and-rollback — Structure

File-level blueprint for the design decisions. Shapes, not code.

## Files created

### `src/lib/promote.ts` — pure core (no env, no fs, no subprocess)

Everything decidable from strings/objects lives here so it is unit-testable
the way `ops-check.ts` / `leak-check.ts` are. Exports:

```ts
// CLI contracts
parsePromoteArgs(argv: string[]): PromoteArgs | UsageError
  // PromoteArgs = { commitish, yes, skipVerify, dryRun }
parseRollbackArgs(argv: string[]): RollbackArgs | UsageError
  // RollbackArgs = { versionId?, yes, dryRun }

// Refusal rules (Design 1)
classifyPorcelain(porcelain: string): TreeStatus
  // TreeStatus = { blocking: string[], warnings: string[] }
  // blocking: tracked modifications/stages anywhere; untracked under
  //   BUILD_INPUT_PATHS (src/ public/ scripts/ test/ tests/ migrations/
  //   + root config allowlist). warnings: untracked elsewhere (docs/, .lisa/…)

// Wrangler output capture (Design 3)
parseWranglerOutputFile(ndjson: string): UploadResult | undefined
  // reads type:"version-upload" entries → { versionId, previewUrl? }
parseUploadStdout(stdout: string): UploadResult | undefined      // fallback
parseDeploymentsList(json: unknown): DeploymentInfo[]
  // normalized [{ deploymentId, createdOn, versionId, message }] newest-first

// Rollback target selection (Design 8)
pickRollbackTarget(deployments: DeploymentInfo[], explicitId?: string,
                   lastRecord?: PromotionRecord): TargetChoice
  // TargetChoice = { versionId, warnings } | { refusal }  (refuses when the
  // target equals the active version or history has < 2 deployments)

// Records & messages (Design 4)
formatVersionTag(sha: string): string                 // 12-char short sha
formatVersionMessage(sha: string, subject: string): string
formatPromoteDeployMessage(sha: string, priorVersionId: string|null): string
formatRollbackDeployMessage(target: string, from: string): string
buildRecord(input: {...}): PromotionRecord
  // { action: 'promote'|'rollback', commit?, versionId, priorVersionId,
  //   deployedAt, hostname, hostVerified, skippedVerify? }

// Config reading (Design 5)
extractCustomDomain(wranglerJsonc: string): string | undefined
  // tolerant scan for routes[{pattern, custom_domain:true}] — no JSONC parser

// Shared constants
EXIT = { OK: 0, REFUSED: 1, MISCONFIGURED: 2, UNVERIFIED: 3 }
```

Nothing in this module imports node builtins beyond types; time and IDs are
always parameters.

### `scripts/promote.ts` — thin edge

Owns env, fs, subprocesses, stdout, exit code — the only impure layer.
Sequence (each step maps to a design decision):

1. Parse args (`parsePromoteArgs`); usage error → exit 2.
2. `git rev-parse --verify <commitish>^{commit}` → full sha; `git rev-parse
   HEAD` must equal it; `git status --porcelain` → `classifyPorcelain`;
   print warnings, refuse on blocking (exit 1).
3. Unless `--skip-verify`: run `npm run verify` (stdio inherited); nonzero →
   exit 1. If skipped, print a loud one-line notice.
4. `npm run build` (astro build → dist/).
5. `wrangler versions upload --tag <tag> --message <msg>` with
   `WRANGLER_OUTPUT_FILE_PATH=.promote/out-<pid>.ndjson`; capture
   `UploadResult` via file parser, stdout fallback. `--dry-run` mode passes
   wrangler's own `--dry-run` and stops here (exit 0).
6. Preview smoke: GET `<previewUrl>/` expect 200 + HTML; run the existing
   `runBoundaryCheck` (import from `src/lib/ops-check.ts`, keyless) against
   `<previewUrl>/api/receipt`. Failure → exit 1 (pointer never moved).
   If wrangler reported no preview URL, warn and continue (preview_urls is
   pinned on, but its absence must not strand a promote).
7. Read prior: `wrangler deployments status --json` → active version id.
8. Confirm `deploy <versionId> (commit <sha12>) → <hostname>?` unless `--yes`
   (non-TTY without `--yes` → exit 2).
9. `wrangler versions deploy <versionId>@100% --yes --message <deployMsg>`.
10. Hostname verify: poll `https://<hostname>/api/receipt` (hostname from
    `extractCustomDomain(wrangler.jsonc)`, env override `PROMOTE_HOSTNAME`;
    ~30s budget, 3s interval) until `x-demo-version-id` header equals the
    deployed id; also require `runBoundaryCheck` pass on that URL.
11. Write `.promote/last.json` + append `.promote/history.jsonl`
    (`buildRecord`), print the record, exit 0 or 3 (`hostVerified: false`).

### `scripts/rollback.ts` — thin edge

1. Parse args; usage error → exit 2.
2. `wrangler deployments list --json` → `parseDeploymentsList`; read
   `.promote/last.json` if present; `pickRollbackTarget` (explicit arg wins;
   API is authoritative; mismatch with local record → warn). Refusal → 1/2.
3. Confirm unless `--yes`; `--dry-run` prints the plan and exits 0.
4. `wrangler versions deploy <target>@100% --yes --message <rollbackMsg>`.
   **No build, no verify gate** (Design 8).
5. Same hostname verification and record writing as promote steps 10–11.

Shared edge helpers (subprocess wrapper, `.promote/` IO, hostname poll) live
in the scripts as small functions; if they grow, they graduate into
`src/lib/promote.ts` only if pure, else a `scripts/lib-release.ts` — start
without it, the two scripts are short.

### `test/promote.test.mjs` — unit tests (node:test)

Covers the pure core only: arg parsing (flags, misuse), porcelain
classification (tracked mod → block; untracked src/ → block; untracked docs/
→ warn; clean → pass), output-file and stdout parsers against captured
wrangler 4.110 fixtures, deployments-list normalization, rollback target
selection (explicit / previous / same-as-active refusal / single-deployment
refusal / local-record mismatch warning), message + record formats, custom-
domain extraction from the real wrangler.jsonc text and from a routes-less
template variant.

## Files modified

| File | Change |
|---|---|
| `wrangler.jsonc` | Add `"version_metadata": { "binding": "CF_VERSION_METADATA" }` with a comment tying it to promote's hostname verification. |
| `worker-configuration.d.ts` | Regenerated (`npm run worker:types`) for the new binding. |
| `src/pages/api/receipt.ts` | The local `json()` helper gains version headers: read `env.CF_VERSION_METADATA` once per request (optional-guarded — absent under `astro dev`), stamp `x-demo-version-id` / `x-demo-version-tag` on **every** response of this route including 500s and fault modes. Body and signature untouched (Design 5). |
| `package.json` | Add `"promote"` / `"rollback"` scripts (`node --experimental-strip-types scripts/….ts`); append `test/promote.test.mjs` to the `test` script's file list. |
| `.github/workflows/deploy.yml` | Replace the `npm run deploy` step with `npm run promote -- "$GITHUB_SHA" --yes --skip-verify`; retitle the step ("Promote this commit to demo.b28.dev"); update the header comment re: deploy-vs-promote split. Verify + migrations steps unchanged. |
| `.gitignore` | Add `.promote/`. |
| `docs/knowledge/deployment.md` | New "Promotion and rollback" section: the two commands, exit-code contract, record locations, GC/retention posture (100-version window, active version always retained), D1-outside-versions caveat, and the re-scoping of `npm run deploy` to bootstrap + routes/trigger config changes. Release-verification section updated to mention the version headers. |

## Files deleted

None. `npm run deploy` / `deploy:dry` survive (bootstrap/config path + verify
gate member).

## Boundaries

- **Pure/impure:** all branching logic that can be unit-tested lives in
  `src/lib/promote.ts`; scripts contain sequencing and IO only. This mirrors
  `ops-check` exactly and keeps Playwright-free tests fast.
- **Worker/runtime:** the only runtime change is additive headers on one
  route; no new route, no signature change, no new secret. Public-surface
  inventory in deployment.md stays "three API routes".
- **Reuse, don't duplicate:** preview and hostname boundary checks import
  `runBoundaryCheck` / `formatBoundaryTrace` from `src/lib/ops-check.ts`
  rather than reimplementing receipt validation.
- **Template posture:** wrangler.jsonc gains no account-specific values;
  `extractCustomDomain` + `PROMOTE_HOSTNAME` keep the scripts working for
  adopters who rename or drop the custom domain.

## Ordering (matters)

1. **Runtime identity first** (wrangler.jsonc + types regen + receipt
   headers): independently shippable; verify gate (`worker:types:check`)
   must stay green in the same commit as the binding.
2. **Pure core + tests** (`src/lib/promote.ts`, `test/promote.test.mjs`,
   package.json test-list edit): green `npm test` before any edge exists.
3. **Edge scripts + npm scripts** (`scripts/promote.ts`, `scripts/rollback.ts`,
   package.json, `.gitignore`): exercised via `--dry-run` locally.
4. **CI switch** (`deploy.yml`): only after promote is proven in dry-run —
   this step changes what a push to main does.
5. **Docs** (`deployment.md`): last, describing what now exists.

Each numbered group is one commit (RDSPI: commit incrementally; groups are
independently green).
