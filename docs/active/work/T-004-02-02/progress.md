# T-004-02-02 — versioned-promote-and-rollback — Progress

Tracking implementation against plan.md (5 steps / 5 commits).

## Step 1 — Runtime version identity ✅ (commit fd90fe0)

- `version_metadata` binding added to wrangler.jsonc; types regenerated.
- `/api/receipt` stamps `x-demo-version-id` / `x-demo-version-tag` on all JSON
  responses; guarded for non-Workers runtimes.
- Verified: typecheck, 80/80 tests, `deploy:dry`, and a live `wrangler dev`
  boot returning the id header (tag absent locally — guard exercised).

## Step 2 — Pure core + unit tests ✅ (commit 3d56373)

- `src/lib/promote.ts` + `test/promote.test.mjs` (20 tests → suite 100/100).
- Fixtures captured from real wrangler 4.110 output. Finding: `deployments
  list --json` returns OLDEST-first; the parser normalizes to newest-first.
- The ND-JSON output file (`WRANGLER_OUTPUT_FILE_PATH`) carries `version_id`
  but NOT the preview URL — stdout is the only preview-URL source, so the
  stdout parser is a first-class peer, not just a fallback.

## Step 3 — Edge scripts ✅ (commits 22cb63c, 72745b5)

- `scripts/promote.ts`, `scripts/rollback.ts`, shared impure helpers in
  `scripts/release-shared.ts` (graduated per structure.md — both entry scripts
  run main() at import, so neither can import the other).
- All refusal paths exercised live: bad commit-ish (exit 1), HEAD mismatch
  (exit 1), dirty build inputs (exit 1), rollback misuse (exit 2).
- **Deviation (commit 72745b5):** tree cleanliness is judged by *build reach*,
  not tracked-ness. Original rule blocked on any tracked modification; that
  made promote unusable from a working Lisa checkout (`.lisa/provenance.jsonl`
  and `docs/active/demand.md` are routinely modified by the loop and cannot
  touch the artifact). Now: changes under build inputs or repo root refuse;
  changes elsewhere warn. Same rationale design.md already applied to
  untracked files, applied uniformly.
- Full-gate dry-run (`promote HEAD --dry-run`, verify inside): **exit 0** —
  but only with the agent env stripped (`env -u CLAUDECODE …`). See findings.
- **Live round-trip executed** (plan's decision point):
  - `promote HEAD --skip-verify --yes` → uploaded version `b2cb96d1…` tagged
    `67da49c96aaa`, preview smoke passed, pointer moved with message
    `promote 67da49c96aaa prior=cd890d0f-…`, hostname poll saw HTTP 530
    (expected — T-004-02-01 operator step pending) → **exit 3**, record
    written with `hostVerified: false`.
  - workers.dev probe confirmed the promoted version serving live:
    `x-demo-version-id: b2cb96d1…`, `x-demo-version-tag: 67da49c96aaa`.
  - `rollback --yes` → redeployed `cd890d0f…` in 0.68 s, no rebuild,
    exit 3 (same 530), record written. workers.dev then served the old
    version again (headers absent — that version predates them). Production
    restored to its exact pre-test state.

## Step 4 — CI switch ✅ (commit 471d18e)

- deploy.yml releases via `npm run promote -- "$GITHUB_SHA" --yes
  --skip-verify` (dedicated verify step precedes it); header comment updated
  for the promote/deploy split. actionlint clean. Not pushed — the branch
  holds T-004-02-01's unpushed commits and their operator gate; the first CI
  promote run is an operator-day event.

## Step 5 — Docs ✅ (commit 72e3df3)

- deployment.md: "Promotion and rollback" section (commands, refusal rules,
  exit codes, records/ledger, retention + D1 caveat, deploy-vs-promote
  split); release-verification section now checks `x-demo-version-*` headers.

## Findings / environment notes

1. **Agent-env daemonization breaks the local verify gate** (pre-existing,
   matches the machine memory note): Astro 7 auto-daemonizes `astro dev` when
   it detects a coding agent. `integration:check` masks only the Codex marker
   (`CODEX_THREAD_ID`), not Claude Code's (`CLAUDECODE`), so under this
   session the dev server daemonizes, lingers with a per-run random signing
   key, and the *next* run's check fails with "signature did not verify";
   `test:flow:backstage` fails as "Process from config.webServer exited
   early". With `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT` the entire gate
   passes. Not caused by this ticket's diff; workaround for local promotes is
   `npx astro dev stop` + stripped env; CI is unaffected. Candidate follow-up
   ticket: mask agent markers generally in integration-check/playwright
   webServer env.
2. A concurrent Lisa thread committed `67da49c docs(spike)` mid-ticket;
   promote resolved HEAD at run time correctly (board concurrency working as
   designed).
