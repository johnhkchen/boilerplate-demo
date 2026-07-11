# T-004-02-02 — versioned-promote-and-rollback — Review

Handoff self-assessment. One inherited operator gate and one pre-existing
local-environment bug are the items worth human eyes; both are detailed below.

## What changed (6 commits, all local/unpushed like the rest of the branch)

| Commit | Files | Change |
|---|---|---|
| `fd90fe0` | wrangler.jsonc · worker-configuration.d.ts · src/pages/api/receipt.ts | `version_metadata` binding; `/api/receipt` stamps `x-demo-version-id` / `x-demo-version-tag` headers (headers, not body — the receipt's signed canonical form is untouched; no fourth API route) |
| `3d56373` | src/lib/promote.ts · test/promote.test.mjs · package.json | Pure core: arg parsing, tree-cleanliness rules, wrangler output parsers (ND-JSON output file + stdout), deployment-history normalization, rollback target selection, record/message formats, custom-domain extraction. 20 unit tests (suite now 100/100) |
| `22cb63c` | scripts/promote.ts · scripts/rollback.ts · scripts/release-shared.ts · package.json · .gitignore | The two commands (`npm run promote/rollback`); shared impure helpers; `.promote/` gitignored |
| `72745b5` | src/lib/promote.ts · test/promote.test.mjs | Deviation: cleanliness judged by build reach, not tracked-ness — Lisa's checkout routinely modifies `docs/`/`.lisa/` and the original rule made promote unusable from it |
| `471d18e` | .github/workflows/deploy.yml | CI releases via `promote -- "$GITHUB_SHA" --yes --skip-verify` after its verify step; deploy.yml header explains the split |
| `72e3df3` | docs/knowledge/deployment.md | Promotion/rollback section: commands, exit codes (0/1/2/3), Cloudflare-side ledger + `.promote/` cache, 100-version retention & active-version-cannot-be-GC'd, D1-outside-versions caveat, `npm run deploy` re-scoped to bootstrap + routes/trigger changes |

RDSPI artifacts in `docs/active/work/T-004-02-02/` are uncommitted, matching
the other in-flight E-004 board files.

## Acceptance criteria status

- *promote resolves an exact commit* — ✅ `rev-parse` to full sha; refuses
  unless HEAD is that sha and nothing build-reaching is dirty. Exercised live.
- *refuses on a failed verify gate* — ✅ gate runs inside promote before any
  upload; refusal exercised live (exit 1, nothing uploaded). `--skip-verify`
  is the CI escape hatch, used only after CI's own verify step.
- *deploys a Workers version to demo.b28.dev* — ✅ live round-trip executed:
  version `b2cb96d1…` tagged `67da49c96aaa` uploaded, preview-smoked,
  pointer-moved atomically.
- *records commit and prior version* — ✅ deployment message
  `promote 67da49c96aaa prior=cd890d0f-…` visible in
  `wrangler deployments status`; JSON records in `.promote/`.
- *verifies the hostname* — ✅ code path proven (polls
  `x-demo-version-id` on the domain), ⚠ but it cannot *pass* yet — see
  "Inherited gate" below. The equivalent check passed on workers.dev: the
  promoted version served with the correct id + commit tag.
- *rollback restores the prior version with no rebuild* — ✅ live: restored
  `cd890d0f…` in 0.68 s, no build step exists in the rollback path at all;
  workers.dev then served the old version (headers absent, as that version
  predates them). Production ended in its exact pre-test state.
- *the active version cannot be garbage-collected* — ✅ platform property,
  documented with the 100-version rollback horizon and the commit-tagging
  that keeps targets identifiable (deployment.md). No code surface in this
  flow can delete a version.

## Test coverage

- **Unit:** 20 new node:test cases on the pure core (all refusal/selection/
  parsing branches); suite 100/100. Wrangler parsers are pinned to fixtures
  captured from wrangler 4.110 against the real Worker — including the
  gotchas that `deployments list --json` is oldest-first and that the ND-JSON
  output file lacks the preview URL.
- **Integration (live, this session):** every promote refusal path; rollback
  misuse (exit 2) and dry-run; full verify-gate-inside-promote dry-run
  (exit 0); one real promote → rollback round-trip (both exit 3 as expected,
  see below).
- **Gaps:** (1) hostname-verification *success* path (exit 0) is untested —
  untestable until the domain attaches; the workers.dev header check is the
  evidence it will pass. (2) The edge scripts themselves have no automated
  tests (thin sequencing over the tested core, per the repo's ops-check
  pattern). (3) First CI promote run unobserved — nothing pushed yet.

## ⚠ Inherited gate (unchanged from T-004-02-01)

`demo.b28.dev` still 530s: the stale dashboard CNAME must be deleted by hand
before the custom domain attaches. Until then every real promote/rollback
ends **exit 3** (deployed but hostname-unverified) — correct behavior, and
the reason the live round-trip above reports exit 3, not 0. After the
operator step: any promote should end exit 0 and the release checks in
deployment.md apply as written.

## Pre-existing bug found (not fixed here — candidate ticket)

The local verify gate fails under a coding-agent environment: Astro 7
auto-daemonizes `astro dev` on agent detection; `scripts/integration-check.ts`
masks only the Codex marker (`CODEX_THREAD_ID`), not Claude Code's
(`CLAUDECODE`). The daemon lingers with one run's random signing key and the
next run fails with "signature did not verify" / Playwright "webServer exited
early". Workaround: `npx astro dev stop`, then run gates with
`env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT`. CI unaffected. Fix belongs in
integration-check/playwright webServer env masking, out of this ticket's scope.

## Open concerns

1. **Version-tag length:** 12-char short shas were accepted by the live
   upload; full shas ride in the version message. If Cloudflare ever tightens
   tag limits, only `formatVersionTag` changes.
2. **`--skip-verify` misuse:** it is loud (⚠ banner) and documented as
   CI-only, but nothing technically stops a local `--skip-verify --yes`.
   Accepted: same trust level as having deploy credentials at all.
3. **Concurrent promotes** are unguarded (two operators racing could
   interleave upload/deploy). CI serializes via its concurrency group; local
   promotes are single-operator by assumption (PRD trust model).
4. **Rollback binding divergence:** Cloudflare refuses rollbacks across DO
   migrations or removed R2/KV/queue bindings — surfaced by wrangler itself
   at deploy time; documented platform behavior, no extra handling added.
5. **First post-switch CI run** should be watched once (promote in the CI
   token context; the token's Workers-Scripts scope covers versions
   upload/deploy, same API family as today's `wrangler deploy`, but it has
   not been observed live).
