# Structure — T-007-02-03 transfer-resources-domain-data

File-level blueprint for the local transfer drill chosen in `design.md`. All new
files live under `docs/active/work/T-007-02-03/`; the only file modified outside
this directory is the shared scorecard (rows 1–4, per its own protocol). No file
under `src/`, `test/`, `tests/`, `scripts/`, `migrations/`, or any wrangler
config is created, modified, or deleted — the story's untouched-runtime
guarantee.

## Files

### Created — `docs/active/work/T-007-02-03/`

| File | Role |
|------|------|
| `research.md` / `design.md` / `structure.md` / `plan.md` / `progress.md` / `review.md` | RDSPI phase artifacts (this trail). |
| `transfer-drill.sh` | The re-runnable drill script — the executable counterpart of `../T-007-02-01/scrub-fresh-owner.sh`. Detailed below. |
| `transfer-log.md` | **The acceptance artifact.** Per-category record: attempt, observable, verdict `clean` / `gap(seam)` / deferred metered step, evidence pointers, plus the named owner fill-ins and the KV-vs-D1/DO wording note. |
| `evidence/*.txt` | Raw captured output per drill stage (one file per stage, names fixed by the script so re-runs overwrite deterministically). |

### Modified

| File | Change |
|------|--------|
| `docs/active/work/T-007-02-01/transfer-signal.md` | Rows **1 Repo, 2 Cloudflare resources, 3 Domain, 4 Data** of the scorecard table get their post-attempt state (baseline column → attempt outcome), and the matching "Per-category detail" paragraphs 1–4 gain a one-line attempt result citing this ticket's log. Rows/paragraphs 5–7 untouched (parallel tickets own them). |

### Deleted

None.

### Deliberately not touched (drill findings live in the log instead)

- `test/promote.test.mjs` — its `demo.b28.dev` assertion is the Domain gap
  evidence, not a bug to fix here.
- `src/lib/session-lifecycle.ts` — the lowercase-only `DNS_NAME` vs uppercase
  harness placeholder is recorded as a finding.
- `../T-007-02-01/scrub-fresh-owner.sh` — the drill *consumes* the harness as-is;
  if the placeholder-case finding warrants a harness change, that is a board
  signal, not a cross-ticket edit.

## `transfer-drill.sh` — internal organization

Same conventions as the harness: `set -euo pipefail`, `banner`/`fail` helpers,
numbered stages, exit `0` drill completed (gaps are *recorded outcomes*, not
script failures) · `1` a stage that must succeed structurally failed (e.g.
harness scrub failed, npm install failed) · `2` misinvoked.

```
Inputs   : run from repo root; optional DRILL_DIR (default ${TMPDIR}/transfer-drill)
Layout   : $DRILL_DIR/context/        the fresh-owner tree (harness output)
           $DRILL_DIR/author-store/   --persist-to dir A (author stand-in D1)
           $DRILL_DIR/new-owner.git/  bare "new-owner" remote (category 1)
           $DRILL_DIR/clone-back/     verification clone (category 1)
           context/.wrangler-drill/   --persist-to dir B (new-owner D1/DO state)
Evidence : tee'd into docs/active/work/T-007-02-03/evidence/<stage>.txt
```

Stages, in execution order (each writes one evidence file):

| # | Stage | Category | Commands (all account-safe) |
|---|-------|----------|------------------------------|
| 0 | `scrub` | — | run `../T-007-02-01/scrub-fresh-owner.sh $DRILL_DIR/context` |
| 1 | `fill-ins` | — | zone → `new-owner-zone.example` (lowercase, logged); fresh `.dev.vars` secrets; D1 local placeholder id only if stage 5/6 demands it |
| 2 | `repo` | 1 | `git init`+commit in context; `git remote add origin $DRILL_DIR/new-owner.git`; push; clone back; `git remote -v` asserts no author remote |
| 3 | `resources-dry` | 2 | `npm install`; `npm run deploy:dry`; `npm run session:validate` |
| 4 | `domain-derive` | 3 | grep-assert zero `b28.dev` in routes/vars; `node --experimental-strip-types` one-shot: `parseSessionConfig` + `sessionUrls` on the filled vars; also demonstrate the uppercase-placeholder rejection |
| 5 | `data-move` | 4 | dir A: `d1 migrations apply --local --persist-to` + seed 2 fixture rows + `d1 export`; dir B (context): apply migrations + import dump + `SELECT COUNT(*)`/content compare |
| 6 | `serve` | 2+3+4 | `wrangler dev` on built `dist/` (background, drill-local persist dir B, port fixed); `curl /` and `GET /api/backstage/feed` with the fresh passcode → moved rows serve at a host off `b28.dev`; kill server |
| 7 | `domain-test-gap` | 3 | run `node --test test/promote.test.mjs` in the context; capture the expected `demo.b28.dev` assertion failure as gap evidence |
| 8 | `do-state` | 4 | attempt DO-state export: show no wrangler subcommand / no offline seam exists; record gap |
| 9 | `verdict` | all | print per-category summary the log transcribes |

Ordering rationale: fill-ins before everything (nothing runs on placeholders);
the data import (5) must precede serving (6) so the feed probe proves the
*moved* rows; the test-gap stage (7) runs after `npm install` (3) provides
`node_modules`. Stage 6 reuses persist dir B so the Worker serves exactly the
imported store.

Safety invariant, enforced by construction: the script contains **no** `wrangler
deploy` without `--dry-run`, no `--remote` flag, and no write outside
`$DRILL_DIR` and this ticket's `evidence/` dir.

## Public interface (what downstream consumes)

- **T-007-02-04** reads `transfer-log.md` + the updated scorecard to know what a
  "transferred deployment" means locally (context path, persist dir, port,
  fresh-secret location) and which gaps its checks will trip on
  (`promote.test.mjs` domain literal).
- **S-007-03** (runbook/gap list) lifts the named gaps and owner fill-ins as
  board signals: DO-state export seam, domain-literal test seam,
  uppercase-placeholder seam, local-D1 placeholder-id fill-in.

## Ordering of the work

1. `transfer-drill.sh` written stage by stage (Plan details the sequence),
   executed after each addition — the script is the test of itself.
2. Full clean run end to end → evidence files land.
3. `transfer-log.md` written from the evidence.
4. Scorecard rows 1–4 updated last (only once outcomes are final).
5. Commits are incremental per the plan; progress tracked in `progress.md`.
