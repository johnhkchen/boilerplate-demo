# Plan — T-007-03-01 write-handoff-runbook

Ordered steps, each independently verifiable and small enough to commit
atomically. Docs-only ticket: "testing" here is scripted grep verification
plus command-syntax sanity checks — no runtime code changes, so no unit or
integration tests are added or expected to change (`npm test` must be
untouched: still 20 tests, same results).

## Step 1 — Write the verifier (`verify-runbook.sh`)

Create `docs/active/work/T-007-03-01/verify-runbook.sh` (bash, `set -euo
pipefail`, exit 0 pass / 1 fail / 2 misinvocation), implementing the three
passes from structure.md:

1. **Leak scan** — these must grep to ZERO matches in the runbook:
   - `RDSPI`, `Lisa`, `Vend` (case-insensitive words)
   - ticket/story/epic IDs: `\bT-0[0-9]|\bS-0[0-9]|\bE-0[0-9]`
   - `docs/active`
   - development-history narration: `\bdrill\b`, `\brehearsal\b`,
     `\bticket\b`, `\bstory\b`, `\bepic\b`, `\bscorecard\b`
2. **Seam-presence scan** — every entry in structure.md's grep contract
   appears in the runbook (7 files, 6 config keys, 8 secret names, 7 npm
   scripts, 2 check-target vars).
3. **Seam-reality scan** — every cited file exists; each config key greps
   in its owning config (`routes`/`database_id` in `wrangler.jsonc`;
   `SESSION_DOMAIN`/`SESSION_REPOSITORY_URL`/`SESSION_COORDINATOR` in
   `wrangler.sessions.jsonc`; `BACKSTAGE_DB` in `wrangler.jsonc`); each npm
   script greps in `package.json` `"scripts"`.

Verify step 1: run against a stub file → passes 2–3 fail loudly; run against
a file containing `RDSPI` → pass 1 fails. (Negative tests exercised once,
recorded in progress.md, not kept.)

Commit: `docs(T-007-03-01): runbook grep verifier`
(with plan/design/structure/research artifacts in the same or prior commit —
first commit carries the four phase artifacts).

## Step 2 — Author `docs/knowledge/handoff-runbook.md`

Write the runbook per structure.md's section tree (~200 lines), sourcing
every command from the drill's settled record:

- Repo: clean clone/push mechanics; `.dev.vars`-absence verify (rotation
  record's clean-tree rule stated in "Before you start" and enforced here).
- Configuration: the exact five committed seams with current values named as
  the strings to replace; lowercase-zone and HTTPS-URL rules; grep-based
  self-verify command included for the owner.
- Secrets: the eight-name inventory in three stores; non-echoing
  `npx wrangler secret put` (both configs) and `gh secret set --repo`;
  0600-file redirection variant; name-only `secret list` verification with
  the three expected name sets.
- Resources: `npm run deploy:dry` + `npm run session:validate` preflight
  (green with `database_id` removed), `npm run deploy`, session worker
  deploy (`npx wrangler deploy --config wrangler.sessions.jsonc`), D1
  migration `--remote`.
- Domain: attach-refusal note (existing DNS record, API error 100117 — from
  the deployment runbook's recorded bootstrap experience); one-zone-derives-
  three-hosts consistency check; **known-gap callout** for the
  `test/promote.test.mjs` domain literal (expect exactly one failing test).
- Data: scoped `d1 export --table backstage_entries --no-schema` →
  `d1 execute --remote` import, with the collision rationale; **known-gap
  callout** for `SESSION_COORDINATOR` DO state (re-create, no export seam).
- Checks: the four commands with `DEMO_BASE_URL`/`PLAYWRIGHT_BASE_URL`
  targets; short-lived `DEMO_SIGNING_KEY` env pattern (export → run → unset);
  green = done; red = record check name + seam.
- Closing: the record-what-failed rule.

Before writing, re-verify each cited command's exact syntax against
`package.json`, the two wrangler configs, and the drill records (already
confirmed in research; re-check any command not literally present in those
sources against `npx wrangler <cmd> --help` only if uncertainty remains).

Verify step 2: `docs/active/work/T-007-03-01/verify-runbook.sh` → exit 0.
Capture output to `evidence/verify-run.txt`.

Commit: `docs(T-007-03-01): handoff runbook on the portable docs surface`

## Step 3 — Independent acceptance pass

Run the acceptance criterion directly, beyond the verifier:

1. **Travels with a demo:** run the existing harness
   `docs/active/work/T-007-02-01/scrub-fresh-owner.sh` and assert
   `docs/knowledge/handoff-runbook.md` exists in the produced context and
   `docs/active/` does not. (Read-only reuse of the drill's own tool — the
   strongest available "generated-project surface" proof.)
2. **Seven categories, drill-proven order:** grep the seven section headings
   in order from the runbook and diff against the expected sequence.
3. **`npm test` untouched:** run `npm test` — same pass/fail profile as
   before this ticket (19 pass / 1 pre-existing environment-dependent state;
   whatever the baseline shows, it must be identical before and after, since
   this ticket touches no code — record both runs).

Capture to `evidence/`. Commit (with progress.md update):
`test(T-007-03-01): acceptance evidence for the portable runbook`

## Step 4 — progress.md and review.md

- `progress.md`: per-step record — what ran, what was observed, deviations.
  Updated after each step above (not only at the end).
- `review.md`: files created; how each acceptance clause is met (with
  evidence pointers); coverage assessment (what the verifier does and does
  not prove — e.g., it cannot prove a human can follow the prose); open
  concerns: shared-file discoverability link deferred (collision with the
  parallel sibling), live-leg commands unproven under a real second account
  (inherited honest boundary), `deployment.md`'s own pre-existing "RDSPI
  artifacts" leak noted for the sibling/gap owner.

Commit: `docs(T-007-03-01): complete runbook review`

## Verification criteria (roll-up)

| Criterion | Check |
|---|---|
| Artifact on portable surface | scrub-context assertion (step 3.1) |
| Seven categories, proven order | heading-order diff (step 3.2) |
| Grep-verifiable seams | verifier passes 2–3 (step 2) |
| No template history/demand leak | verifier pass 1 zero-match (step 2) |
| No runtime/test impact | `npm test` identical before/after (step 3.3) |
| Style fits the surface | manual read against `deployment.md` conventions |

## Risks / contingencies

- **Baseline `npm test` may already fail** (unrelated environment issues):
  record the before-run as baseline; the requirement is no *delta*.
- **Word-boundary false positives in the leak scan** (e.g. "list" ≠ "Lisa",
  but "history" contains "story"): use word-boundary regexes; if a legitimate
  runbook word trips a pattern, tighten the pattern — never weaken the rule
  by allowlisting a real leak.
- **Scrub harness expects repo-root invocation and clean `git archive`**: run
  from repo root; uncommitted runbook won't appear in `git archive HEAD` —
  so step 3.1 must run AFTER step 2's commit. Ordering noted.
