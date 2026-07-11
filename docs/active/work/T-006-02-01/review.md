# Review — T-006-02-01 clean-copy-rehearsal-run

Handoff self-assessment. What a human reviewer (and T-006-02-02) needs to
understand the rehearsal without re-reading every command.

## What this ticket produced

A single deliverable — `rehearsal-log.md` — backed by real command output under
`./evidence/`, plus the RDSPI artifacts (`research/design/structure/plan/
progress`). The rehearsal executed the assembly playbook on a genuine clean copy
(`git archive HEAD`, no history, no `docs/active/**`) driven only by the playbook
against the fixture sponsor packet, and recorded every step's verdict and every
leftover.

**Nothing in this repo changed except `docs/active/work/T-006-02-01/**`.** The
story's guarantee — this repo's `src/**` untouched — holds: `git status
--porcelain src/ scripts/ tests/ wrangler.jsonc` is empty. All slice code and the
one config edit (declaring the sponsor secret) live only in the scratch clean
copy.

## Files created (this repo)

- `docs/active/work/T-006-02-01/research.md · design.md · structure.md · plan.md`
- `docs/active/work/T-006-02-01/rehearsal-log.md` — the acceptance deliverable
- `docs/active/work/T-006-02-01/progress.md · review.md`
- `docs/active/work/T-006-02-01/evidence/*` — raw run captures (13 files)

Clean-copy files (scratch, not this repo): `src/lib/parcel.ts`,
`src/pages/api/parcel.ts`, edits to `src/pages/index.astro`,
`tests/support/flow-contract.ts`, `.dev.vars`, `wrangler.jsonc`.

## Did it meet acceptance?

The criterion has five clauses. Status:

1. **Clean-copy creation recorded** — ✓ (commands + no-history / no-planning
   proofs).
2. **Each playbook step executed in order** — ✓ (Before-event + Steps 1–12,
   each with a verdict).
3. **Vertical slice reachable at its public URL** — **partial, honestly bounded.**
   The core moment works and is checksum-verified at a **local** URL; the
   **public** URL is deferred because a clean copy cannot deploy without
   overwriting the source project's production Worker (proven via `deploy:dry`).
   This is the S-006-02 honest boundary ("the real event-day step is named here,
   not built here"), not an oversight.
4. **Integration and ops checks green under budget** — ✓ on the shipped exemplar
   (`integration:check` PASSED 3.9 s / 45 s). Also surfaced that the *replaced*
   boundary cannot pass them (finding #4).
5. **Verbatim leftovers + steps the playbook could not answer** — ✓ (11
   board-ready lines).

Net: the rehearsal fulfilled its purpose — prove followability and surface
friction — with clauses 1, 2, 4, 5 fully met and clause 3 met locally with the
public leg deferred for a concrete, recorded reason.

## Test coverage and gaps

- **Ran for real:** `npm install`, `astro build`, `astro check`, `npm test`
  (unit, exit 0), `integration:check` (healthy + broken + stalled),
  `ops:check` (exemplar + against the new boundary), `deploy:dry` (exit 0), the
  parcel boundary over HTTP with client-side checksum verification.
- **Not covered / flaky:** end-to-end `npm run verify`, `test:flow:backstage`,
  and standalone `test:flow` — the Playwright webServer is unreliable inside a
  coding-agent session (Astro dev daemonization; see
  `[[boilerplate-demo-playwright-daemonization]]`). This is an environment
  artifact, not a code fault, and is itself logged as finding #5.
- **No new unit tests** were written for `parcel.ts` — out of scope for a
  rehearsal (the slice is a throwaway proof in the scratch copy, not shipped).

## Open concerns for T-006-02-02 (the consumer)

T-006-02-02 turns the log's leftovers into demand signals and revises
`docs/knowledge/assembly-playbook.md`. The highest-leverage items:

1. **Finding #4 (harness is receipt-bound)** is the most important playbook
   revision: Step 7 tells you to replace the receipt slice, and doing so breaks
   Step 8's checks. Decide whether the fix is playbook wording ("also rewire the
   checks") or a harness change (read boundary path/name/secret from config).
   This likely spawns an E-002 signal, not just a doc edit.
2. **Finding #2 (clean-copy deploy collision)** blocks the public-URL clause for
   any clean-copy rehearsal. The playbook needs an explicit generate-or-rename +
   fresh-D1 step, or must state that only a *generated* project goes public. Note
   the story already says generation isn't built yet — this may be an E-001/board
   signal, not resolvable in the playbook alone.
3. **Findings #1, #3, #6, #7** are clean, self-contained playbook edits (declare
   new secrets; complete the rename list; define board init for a clean copy;
   the install-scripts caveat).
4. **Finding #5 (session-pressure hazard)** matters because the ticket's premise
   is *followability under session pressure* — the very condition that makes the
   checks lie. Worth a prominent playbook note and possibly a harness fix to
   neutralize all agent markers.

## Critical issues needing human attention

- **None destructive occurred.** The one genuinely dangerous step — deploying a
  clean copy over production — was *not* run; it was proven risky via dry-run and
  deferred. If a human wants the public-URL leg completed, it needs an isolated
  Cloudflare target (unique worker name + fresh D1) and interactive secret entry,
  then teardown after evidence capture.
- The scratch clean copy persists under the session scratchpad for inspection; it
  holds no secrets in tracked files (only in its gitignored `.dev.vars`).
