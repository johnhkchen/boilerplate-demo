# Plan — T-007-02-03 transfer-resources-domain-data

Ordered steps executing `structure.md`. Each step has a verification criterion
observable from its command output; evidence is captured as the drill runs, not
reconstructed afterwards. Commits are incremental; all paths below are relative
to `docs/active/work/T-007-02-03/` unless noted.

## Steps

### 1. Drill skeleton + scrub stage (stages 0–1)

Write `transfer-drill.sh` with the harness conventions (strict mode, banner/fail,
fixed evidence filenames) and implement stage 0 (invoke
`../T-007-02-01/scrub-fresh-owner.sh` into `$DRILL_DIR/context`) and stage 1
(owner fill-ins: lowercase zone `new-owner-zone.example` across the two wrangler
configs; fresh random `DEMO_SIGNING_KEY`/`DEMO_PASSCODE` into context
`.dev.vars`).

- **Verify:** script runs end to end; context exists; `grep -r b28.dev` on
  routes/vars still empty; `grep NEW-OWNER-ZONE` returns nothing (all placeholders
  filled); `.dev.vars` present with two fresh values; evidence files written.
- **Risk:** harness path/cwd assumptions (it requires repo root). Mitigate: the
  drill also runs from repo root and passes an absolute DEST_DIR.

### 2. Repo attempt (stage 2)

`git init -b main` + commit in the context, push to a drill-created bare
`new-owner.git`, clone back to `clone-back/`, assert the round trip and that no
author remote exists.

- **Verify:** push and clone-back exit 0; `git -C clone-back remote -v` shows
  only the drill remote; `diff -r` context vs clone-back (minus `.git`) empty.
- **Record:** live leg = create real GitHub repo + set
  `SESSION_REPOSITORY_URL` (HTTPS-only validation makes a local stand-in
  impossible — cite `parseSessionConfig`).

### 3. Resources dry attempt (stage 3)

`npm install` in the context, then `npm run deploy:dry` and
`npm run session:validate`.

- **Verify:** all three exit 0 **or** the failure is captured verbatim and
  triaged: config-shape failure (e.g. missing `database_id` rejected) → that is
  an observed owner fill-in / gap to record, apply the loud local placeholder id
  from design D1 and re-run; environment failure (blocked postinstall) → drill
  friction, recorded, not a category gap.
- **Watch for:** dry-run output naming Worker `demo-runway` — confirm `--dry-run`
  makes no API call (it prints without uploading; T-006-02-01 already used it
  safely from a copy).

### 4. Domain derivation attempt (stage 4)

Node one-shot against the **context's** `src/lib/session-lifecycle.ts`:
`parseSessionConfig({slug, domain: 'new-owner-zone.example', repositoryUrl})` →
print `previewHost`/`editorHost`/`sessionUrls`; assert they equal the context's
scrubbed+filled route patterns. Second call with the harness's original
`NEW-OWNER-ZONE.example` expecting the lowercase-validation throw.

- **Verify:** derived hosts == `demo-session.new-owner-zone.example` /
  `code-session.new-owner-zone.example`; uppercase call throws
  `SESSION_DOMAIN must be a lowercase DNS name` (finding recorded).

### 5. Data move (stage 5)

Author stand-in store (persist dir A, `--persist-to`, **outside** the real
`.wrangler/state`): apply migrations, insert 2 fixture rows (one `reference`,
one `feedback`, distinctive text), `wrangler d1 export … --local --output`.
New-owner store (persist dir B inside the context): apply migrations, execute
the dump, `SELECT COUNT(*)` + content query.

- **Verify:** export contains 2 `INSERT INTO backstage_entries`; import exits 0;
  count in store B == 2; row text matches byte-for-byte.
- **Risk:** d1 commands may require `database_id` in config (see step 3 triage);
  the persist dirs keep every byte inside `$DRILL_DIR`.

### 6. Serve under the new-owner context (stage 6)

`npm run build` already ran in step 3 (deploy:dry builds); start
`npx wrangler dev` on the context (fixed port, persist dir B) in the background,
poll readiness, then `curl /` and `GET /api/backstage/feed` with the fresh
passcode; kill the server (trap ensures cleanup).

- **Verify:** HTTP 200 on `/`; feed body contains both fixture rows → the
  Worker + D1 storage + moved data all run under the new-owner context at
  `127.0.0.1` (off `b28.dev`).
- **Risk:** agent-session daemonization is an `astro dev` hazard; `wrangler dev`
  is expected stable, but if readiness fails the fallback probe is
  `wrangler d1 execute` reads (storage proof) + `deploy:dry` (worker proof), with
  serving recorded as friction — not silently skipped.

### 7. Domain test gap + DO-state gap (stages 7–8)

In the context: `node --test test/promote.test.mjs` — capture the expected
`extractCustomDomain reads the real wrangler.jsonc` failure (`demo.b28.dev`
literal vs re-pointed config). Then the DO-state attempt: search wrangler's own
command surface for a DO-storage export (`wrangler --help`, `wrangler durable-objects
--help` if present) and record that no offline export/import seam exists; the
only read path is the live Worker control API.

- **Verify:** promote test fails on exactly the domain-literal assertion (other
  tests in that file pass); help output captured showing no export subcommand.

### 8. Full clean re-run

`rm -rf $DRILL_DIR` && run `transfer-drill.sh` once, top to bottom, on the final
script. This is the run whose evidence ships.

- **Verify:** exit 0; all evidence files regenerated in one pass; verdict stage
  prints the four-category summary.

### 9. Write `transfer-log.md`

Transcribe outcomes: per category — attempt, observable, verdict
`clean` / `gap(seam named)` / deferred metered step — plus the owner fill-in
list, the KV-vs-D1/DO wording note (research), and the scope cut on the
container image build.

- **Verify:** every one of the 4 categories has an explicit verdict and either a
  seam citation or a named metered step; acceptance criterion wording is covered.

### 10. Update scorecard rows 1–4

Edit `../T-007-02-01/transfer-signal.md`: baseline column → attempt outcome for
rows 1–4; one-line result appended to detail paragraphs 1–4 citing this log.
Rows 5–7 byte-identical.

- **Verify:** `git diff` on that file touches only rows/paragraphs 1–4.

## Commit plan

1. `docs(demo): T-007-02-03 research, design, structure, plan` — phase artifacts.
2. `docs(demo): T-007-02-03 transfer drill script + evidence` — steps 1–8.
3. `docs(demo): T-007-02-03 transfer log; move scorecard rows 1–4` — steps 9–10.
4. `docs(demo): T-007-02-03 progress and review handoff` — progress.md, review.md.

## Testing strategy

No product code changes → no new unit tests. The drill script *is* the test: it
carries built-in assertions (grep-asserts, count compares, HTTP probes, expected
throws) and hard-fails on structural breakage. Its evidence files are the
reviewable record; a reviewer re-runs `transfer-drill.sh` from the repo root to
reproduce every verdict. Product test suites are exercised only as observables
(step 7), never modified.

## Rollback / safety

Everything the drill writes lives in `$DRILL_DIR` (scratch) and this ticket's
`evidence/`. The script contains no `wrangler deploy` without `--dry-run`, no
`--remote`, no push to any non-drill remote — the author account and production
Worker are unreachable by construction.
