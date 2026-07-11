# T-006-01-01 — author-assembly-playbook — Plan

Ordered, independently verifiable steps. Docs-only ticket: "tests" here are
mechanical assertions run in the shell, recorded in progress.md.

## Step 1 — Commit the RDSPI planning artifacts

- **Do:** commit `research.md`, `design.md`, `structure.md`, `plan.md` under
  `docs/active/work/T-006-01-01/`.
- **Verify:** `git log --oneline -1` shows the artifact commit; working tree
  otherwise unchanged (the pre-existing ticket-frontmatter modification stays
  unstaged — Lisa owns it).
- **Commit:** `docs(demo): T-006-01-01 research/design/structure/plan artifacts`
  (matches T-004-05-01 precedent).

## Step 2 — Author `docs/knowledge/assembly-playbook.md`

- **Do:** write the full playbook following structure.md's skeleton and
  design.md's decisions D1–D7. One authoring pass, all sections.
- **Verify (content):** every section of the skeleton present, in order;
  steps numbered 1–12; exactly one table; each beat ends with a "Depth:"
  pointer; boundaries section names S-006-02, signals #2/#3, N2, N4.

## Step 3 — Mechanical verification: references resolve

- **Do:** run, from the repo root:
  1. Extract-and-check repo paths named in the playbook — every
     `docs/…`, `src/…`, `scripts/…`, `tests/…`, `test-results/…`,
     `migrations/`, `.dev.vars.example`, `wrangler.jsonc`, `SEED.md`
     token must exist (`test -e`), except `test-results/…` and `.dev.vars`,
     which are generated/gitignored at runtime — assert those are *named as
     outputs/local files*, not inputs.
  2. Every `npm run <name>` named in the playbook exists in `package.json`
     `scripts` (grep `"<name>":`).
  3. Every env var named (`DEMO_PASSCODE`, `DEMO_SIGNING_KEY`, `DEMO_FAULT`,
     `OPS_CHECK_URL`, `DEMO_BASE_URL`, `INTEGRATION_CHECK_TIMEOUT_MS`,
     `BACKSTAGE_DB`) greps in `scripts/`, `src/`, `tests/`, or
     `.dev.vars.example`.
  4. Anti-leak scan: playbook contains **no** provider/SDK product names
     beyond Cloudflare-platform terms already in sibling docs, and no
     literal secret-looking values.
- **Verify:** all checks print OK; failures loop back to Step 2 edits.

## Step 4 — Mechanical verification: size and read-through

- **Do:** `wc -w docs/knowledge/assembly-playbook.md` — must be < 2,500
  (target ≤ 2,300 for margin). Read the doc top-to-bottom once as the
  target user; confirm the play is executable without opening another doc
  except where a "Depth:" pointer says so.
- **Verify:** word count recorded in progress.md.

## Step 5 — Confirm the AC's exit-condition wording is satisfied

- **Do:** check the Exit gate section states, in substance: (a) core moment
  observed working under the harness time budgets (integration:check 45 s;
  `FLOW_BUDGET_MS` flows), (b) every deferral converted to a one-line signal
  on `docs/active/demand.md`, (c) 'code written' explicitly insufficient.
- **Verify:** quote the three clauses in progress.md.

## Step 6 — Commit the playbook

- **Commit:** `docs(knowledge): author rapid-assembly playbook (T-006-01-01)`
  staging only `docs/knowledge/assembly-playbook.md`.

## Step 7 — Progress artifact

- **Do:** write `docs/active/work/T-006-01-01/progress.md`: steps completed,
  verification transcript summary (path check, script check, word count),
  deviations from plan (if any).
- **Commit:** folded into Step 8's handoff commit (precedent: progress and
  review committed together, `docs(demo): T-004-05-01 progress and review
  handoff`).

## Step 8 — Review artifact and handoff

- **Do:** write `review.md` — files created, verification evidence, coverage
  gaps (no live rehearsal — S-006-02; fixture pending — T-006-01-02), open
  concerns for the human reviewer (e.g., intake class names are now a
  fixture contract; word-budget pressure points).
- **Commit:** `docs(demo): T-006-01-01 progress and review handoff`.
- **Stop.** Lisa detects artifacts and advances phase/status.

## Testing strategy summary

| Check | Tool | Gate |
|---|---|---|
| Named paths resolve | `test -e` loop over extracted references | hard fail |
| npm scripts exist | grep against `package.json` | hard fail |
| Env vars real | grep across `scripts/ src/ tests/ .dev.vars.example` | hard fail |
| No provider recipes / secrets | manual scan + grep for suspicious literals | hard fail |
| Word count < 2,500 | `wc -w` | hard fail |
| Skeleton completeness | manual read against structure.md | hard fail |
| Repo checks still green | not run — no code touched; `npm run verify` unaffected by a docs-only change | n/a (note in review.md) |

Rollback story: single new file plus artifacts; reverting the playbook commit
restores the previous state completely.

## Risks and mitigations

- **Word ceiling vs. completeness** — D7's per-section budget; cut narrative
  before cutting commands; "Depth:" pointers absorb overflow.
- **Fixture contract churn** — the six intake class names are called out as
  a contract in the doc itself so T-006-01-02 reads them as settled.
- **Doc rot** — name budget *files* and only the two felt numbers (45 s gate,
  20 s test cap), not the full constant table.
