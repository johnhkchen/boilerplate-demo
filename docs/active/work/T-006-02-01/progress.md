# Progress — T-006-02-01 (Implement phase)

Running log of the rehearsal execution. The rehearsal *is* the implementation;
"commit incrementally" mapped to capturing evidence under `./evidence/` and
recording each result. No commits were made to this repo's tracked source — the
work happened in the clean copy at `…/scratchpad/cleancopy`.

## Completed

- **Clean copy stood up** — `git archive HEAD` → scratch dir, `docs/active/**`
  removed, no `.git`, `npm install` (306 pkgs, exit 0), playwright cache warm.
  Build verified (exit 0).
- **Step 2 credentials** — `.dev.vars` created (gitignored, secret not in any
  tracked file). Discovered new-secret-declaration friction (see log finding #1).
- **Baseline harness green** — `integration:check` healthy PASSED 3.9 s / 45 s
  budget (evidence/healthy-clean.txt, integration-report-healthy.json).
- **Step 6 fault legibility** — broken → `receipt [operation]`; stalled →
  `receipt [timeout]` (flow). Trustworthy only after `astro dev stop` + stripping
  agent env (evidence/broken-clean.txt, stalled-clean.txt).
- **Step 5 rename contract** — demonstrated the flow breaks on the hardcoded
  `heading 'Demo Runway'` (spec lines 32/101), a target outside the playbook's
  rename list. Reverted the rename to keep the exemplar pristine.
- **Step 7 slice built** — `src/lib/parcel.ts` + `src/pages/api/parcel.ts` behind
  the unchanged `runOperation` seam. `astro check` 0 errors; core moment works,
  checksum VERIFIED true (evidence/parcel-healthy.json).
- **Step 8 collision proven** — shipped `ops:check` rejects `/api/parcel`
  (`unexpected response shape`); `integration-check.ts` hardcodes `/api/receipt`
  (lines 319/330).
- **Step 9 sub-gates** — `npm test` exit 0; `deploy:dry` exit 0 (and it confirmed
  the config binds the source project's Worker + D1 — the Step 4 collision).
- **Deliverables written** — `rehearsal-log.md` (acceptance), this file, and
  `review.md`.

## Deviations from plan

- **Live-deploy legs deferred** (Design Decision 2, ratified by evidence): a
  clean-copy deploy is destructive to the source project. Local surfaces stood in
  for Steps 4/10 publish + live checks. Recorded as the top leftover, not skipped.
- **Fault-mode contamination corrected mid-run.** Early broken/stalled results
  were polluted by a lingering `astro dev` daemon (agent-session daemonization).
  Re-ran with the daemon stopped + agent env stripped to get trustworthy
  evidence; discarded the contaminated numbers. This became finding #5.
- **Full `npm run verify` not run end-to-end** — the Playwright webServer is
  unreliable under the agent session; its sub-gates were exercised individually
  instead.

## Environment cleanup

Stray dev servers from timeout-killed runs were killed; `npx astro dev stop`
issued. No processes left holding test ports at end of session. The clean copy
remains in the scratchpad for re-inspection; it carries no secrets in tracked
files.
