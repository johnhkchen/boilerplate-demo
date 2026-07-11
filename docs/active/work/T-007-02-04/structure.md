# Structure — T-007-02-04 verify-checks-under-new-owner

The blueprint: files created, their boundaries, and the ordering of the run. No
product runtime file is created, modified, or deleted (S-007-02 guarantee). Every
new file lives under `docs/active/work/T-007-02-04/`.

## Files

### Created

| Path | Kind | Purpose |
|------|------|---------|
| `research.md` | doc | ✔ done — surface map |
| `design.md` | doc | ✔ done — option/decision |
| `structure.md` | doc | this file |
| `plan.md` | doc | ordered steps + verification |
| `verify-checks.sh` | executable | the row-7 driver: context → serve → 4 checks → verdict |
| `checks-run.md` | doc (acceptance artifact) | per-check green/red record; scorecard-row-7 verdict |
| `progress.md` | doc | implement-phase log |
| `review.md` | doc | handoff |
| `evidence/*.txt`, `evidence/checks-report.json` | evidence | raw per-leg output + machine-readable summary |

### Modified

| Path | Change | Why |
|------|--------|-----|
| `../T-007-02-01/transfer-signal.md` | move **row 7** off `deferred` to its attempted verdict; add a "After the T-007-02-04 run" note | The scorecard's own contract: "downstream tickets move their owned rows." Same pattern T-007-02-03 used for rows 1–4. Row 7 is this ticket's owned row. |

### Deleted
None.

## `verify-checks.sh` — internal structure

A single bash script, `set -euo pipefail`, run from the repo root. Mirrors
`rotate-fresh-owner.sh`'s safety scaffold (trap cleanup, private 0600 store,
sanitized env, serve-and-poll) so it reads as one family with the predecessors.

```
main
├─ arg parse: --context DIR, --owner-zone HOST (default new-owner.example),
│             --repository-url HTTPS_GITHUB_URL, --evidence-dir DIR
├─ guards: repo root (.git + wrangler.jsonc); harness present;
│          owner-zone is a bare LOWERCASE hostname (F-1); repo URL is HTTPS .git
├─ private dir: mktemp 0600; trap cleanup { stop_servers; rm -rf; rm $CTX/.wrangler }
│
├─ stage 1  build clean context      → scrub-fresh-owner.sh $CONTEXT
├─ stage 2  fill config placeholders → NEW-OWNER-ZONE.example → $OWNER_ZONE (lc),
│                                       NEW-OWNER/REPO → $REPOSITORY_URL
├─ stage 3  generate fresh secrets    → private 0600 JSON (signing key, passcode, …);
│                                       write $CONTEXT/.dev.vars from them (boot need)
├─ stage 4  link deps + clean build   → ln -s repo node_modules; SANITIZED_ENV npm run build
│
├─ stage 5  CHECK 1 integration:check → SANITIZED_ENV npm run integration:check
│                                       (owns its own build+server+ops/leak/flow-healthy)
├─ stage 6  serve context for 2 & 3   → SANITIZED_ENV wrangler-config=runtime npm run dev
│                                       on 127.0.0.1:$PORT; poll ready
│   ├─ CHECK 2 ops:check              → DEMO_SIGNING_KEY OPS_CHECK_URL=…/api/receipt
│   └─ CHECK 3 leak:check             → DEMO_SIGNING_KEY LEAK_CHECK_DIR=$CTX/dist LEAK_CHECK_URL
│      stop_server
├─ stage 7  CHECK 4 test:flow:backstage → SANITIZED_ENV npm run test:flow:backstage
│                                         (self-hosts webServer + migration on 4323)
│
└─ stage 8  record → evidence/*.txt, evidence/checks-report.json;
            print verdict; exit 0 iff all four legs exited 0
```

### Exit codes
- `0` — all four checks green against the new-owner context.
- `1` — at least one check red (the driver names which); a `gap` for row 7.
- `2` — misinvocation / environment error (not repo root, harness missing, bad args,
  server never ready).

### Environment boundary (the "author accounts removed" contract)
- `SANITIZED_ENV=(env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}")` — no
  `CLOUDFLARE_*`, no OAuth-adjacent vars, no agent markers.
- Per-check additions layered on top: `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`,
  `OPS_CHECK_URL`/`LEAK_CHECK_URL`/`PLAYWRIGHT_BASE_URL`, `DEMO_WRANGLER_CONFIG_PATH`,
  and `CODEX_THREAD_ID=''` belt-and-suspenders for any leg that still sees a marker.
- Only local commands: `astro build`, `astro dev`, `wrangler dev`/`d1 --local`,
  `playwright test`. No `deploy`, no `--remote`.

## `checks-run.md` — acceptance artifact structure

The human-facing record row 7 reports against:

1. **Headline** — PASS / GAP with the one-line verdict and the honest boundary
   (served-local stand-in; live-URL run deferred).
2. **Run it again** — the exact `verify-checks.sh` invocation + exit-code legend.
3. **Per-check table** — check · command · target · result (green / red / seam) ·
   evidence file. Four rows + the internally-covered `test:flow` healthy note.
4. **What "new-owner deployment" means here** — the served-local boundary and the
   named deferred live leg (`DEMO_BASE_URL=https://demo.<owner-zone> npm run …`).
5. **Author-account / fleet-service absence** — the grep result + the `env -i`
   isolation proof; no outbound author/central call.
6. **Gap ledger** — any red check (seam named) + the deferred live leg; cross-links to
   the pre-existing S-007-03 gaps (domain literal, DO export) that are *out of row 7's
   scope* so a reader does not mistake them for check failures.
7. **Scorecard delta** — how row 7 moved.

## Ordering constraints

- Stage 1 must precede all (nothing runs before a proven-clean context).
- Stage 3 (secrets → `.dev.vars`) must precede stage 4 build and stage 6 serve (boot
  requirement; the session/app config reads them).
- CHECK 1 (`integration:check`) is independent — it owns its own server; it can run
  before or after stage 6, sequenced first so a fast total-failure surfaces early.
- CHECK 4 (backstage flow) owns its own webServer on a distinct port (4323) from
  integration's (4324) and stage 6's serve ($PORT ≠ 4323/4324), so no port clashes.
- Stage 8 always runs (in the trap-guarded tail) so a mid-run failure still leaves the
  partial evidence and an honest verdict.

## What this ticket deliberately does NOT touch

- `test/promote.test.mjs:246` domain-literal (S-007-03 gap) — not a row-7 check.
- `SESSION_COORDINATOR` DO export seam (T-007-02-03 gap) — data, not checks.
- Any product file under `src/**`, `wrangler*.jsonc`, `migrations/**`.
