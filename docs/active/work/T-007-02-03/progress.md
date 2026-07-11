# Progress — T-007-02-03 transfer-resources-domain-data

Implement-phase tracking against `plan.md`. Session date 2026-07-11; single
continuous RDSPI pass.

## Completed

- [x] **Step 1 — drill skeleton + scrub + fill-ins** (`transfer-drill.sh`
  stages 0–1). Harness invoked verbatim; lowercase zone + fresh secrets applied
  and named. Evidence `0-scrub.txt`, `1-fill-ins.txt`.
- [x] **Step 2 — Repo attempt** (stage 2). New-owner remote round trip clean;
  no author remote; `.dev.vars` out of history. Evidence `2-repo.txt`.
- [x] **Step 3 — Resources dry attempt** (stage 3). `npm install` +
  `deploy:dry` + `session:validate` all green in the context — notably
  **without** a `database_id` (fill-in 3 never triggered; the triage branch
  remains in the script for stricter future toolchains). Evidence
  `3-resources-dry.txt`.
- [x] **Step 4 — Domain derivation** (stage 4). Derived hosts match the
  re-pointed routes; old author host declassified; uppercase-placeholder
  rejection captured as finding F-1. Evidence `4-domain-derive.txt`.
- [x] **Step 5 — Data move** (stage 5). 2/2 fixture rows author-side →
  new-owner store. Evidence `5-data-move.txt`.
- [x] **Step 6 — Serve** (stage 6). `wrangler dev` ready in a few seconds
  (no daemonization trouble — the hazard is `astro dev`-specific); `GET /` 200;
  feed returns both moved rows under the fresh passcode. Evidence `6-serve.txt`.
- [x] **Step 7 — gap stages** (stages 7–8). Domain-literal test gap confirmed
  (19 pass / 1 fail, exactly the predicted assertion); DO-state no-export-seam
  gap confirmed. Evidence `7-domain-test-gap.txt`, `8-do-state.txt`.
- [x] **Step 8 — full clean re-run.** The shipped evidence is one uninterrupted
  run of the final script (stage 0 `rm -rf`s the drill dir each time, so every
  full run is clean by construction).
- [x] **Step 9 — `transfer-log.md`** written from the evidence.
- [x] **Step 10 — scorecard rows 1–4 moved** in
  `../T-007-02-01/transfer-signal.md` + detail paragraphs annotated + a scoped
  post-drill note under the baseline summary. Rows 5–7 untouched.

## Commits (plan's four-commit shape held)

1. `8819d17` research, design, structure, plan
2. `238abc1` transfer drill script + evidence
3. `cc2ebf7` transfer log; move scorecard rows 1–4
4. (this commit) progress + review handoff

## Deviations from the plan

1. **`--persist-to` dropped for the data stores.** `wrangler d1 export` does not
   accept `--persist-to` (`Unknown arguments: persist-to`). Replaced with
   per-side directories using wrangler's *default* local state: an
   `author-side/` copy of the author config + migrations (its own `.wrangler`),
   and the context's own `.wrangler` as the new-owner store (which `wrangler
   dev` then shares naturally in stage 6). Same isolation guarantee — the real
   repo's `.wrangler/state` is never written.
2. **Export scoped with `--table backstage_entries`.** The unscoped `--no-schema`
   dump carries `d1_migrations`/`sqlite_sequence` bookkeeping rows that collide
   with the new-owner store's own applied migrations. Recorded in the log as a
   runbook-worthy friction, not just fixed silently.
3. **Stage-4 zero-`b28.dev` assertion narrowed to active config values**
   (`"pattern"`/`"SESSION_DOMAIN"` lines). The first draft grepped whole files
   and tripped on a narrative comment the harness explicitly classifies as
   allowed residue.
4. **Fill-in 3 (local D1 placeholder id) never needed** — local d1 commands and
   `deploy --dry-run` both accept the id-less config. Plan treated it as likely;
   reality was better. The conditional stays for stricter toolchains.

## Remaining

Nothing for this ticket. Handoffs: T-007-02-04 runs the check suite against the
transferred context (and will trip the recorded domain-literal gap); S-007-03
lifts the gaps/frictions as board signals (promote-test domain literal, DO
export seam, harness placeholder case, `--table` export scoping).
