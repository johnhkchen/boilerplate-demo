# T-004-05-01 — operator-and-teammate-docs-and-threat-model — Plan

Ordered, independently verifiable steps. This is a documentation ticket: the
"tests" are fact-checks against the source runbooks and the acceptance
criteria, plus repo hygiene gates.

## Step 1 — Commit RDSPI blueprint artifacts

Commit `research.md`, `design.md`, `structure.md`, `plan.md` under
`docs/active/work/T-004-05-01/`.

- Verify: `git show --stat` touches only this ticket's work directory.

## Step 2 — Write docs/demo-environments.md

Author per the Structure blueprint (nine sections). Sourcing rules:

- Every command name copied verbatim from the owning runbook
  (`npm run deploy`, `npm run promote -- <commit-ish>`, `npm run rollback`,
  `npm run session -- up|status|logs|down [--force]`,
  `npm run session:image:check`, `wrangler secret put … --config
  wrangler.sessions.jsonc`, `cloudflared access login/token`).
- Every hostname from the canonical triple; fixed slug `session`.
- Deviation table content transcribed from
  `docs/knowledge/demo-environments-decisions.md` (three rows, same column
  semantics), with reasons and experience-contract effects — AC 3.
- Evidence-status section states: promote/rollback live-exercised (exit 3
  until the stale `demo.b28.dev` CNAME is deleted by hand), session stack
  locally verified only, Containers entitlement + real Access evidence
  outstanding; links to the three production checklists.

Verification checklist for this step:

- [ ] Three required concerns are separate `##` sections (AC 1).
- [ ] Teammate section readable standalone with zero repo knowledge.
- [ ] All relative links resolve (`knowledge/…` from `docs/`).
- [ ] No secret value, team domain, AUD tag, account ID, or email appears.
- [ ] ~200 lines.

Commit: `docs(demo): add demo-environments capability guide`.

## Step 3 — Write docs/demo-threat-model.md

Author per the Structure blueprint (eight sections). Sourcing rules:

- Boundary statement in the first screenful; wording aligned with
  session-lifecycle.md ("launch/persistence boundary … not isolation from
  code running inside the session") and the epic guardrail
  (trusted/semi-trusted only) — AC 2.
- Credential-flow diagram + table enumerates all eight credential classes
  from Research; each row names where the credential lives, what it enters,
  and where it must never appear — AC 2.
- Invariants cite the enforcing mechanism (config flag, test file, or
  runbook rule), not aspirations.
- Residual risks transcribed from the T-004-02-02 / T-004-04-01 /
  T-004-04-02 review "open concerns", deduplicated.

Verification checklist for this step:

- [ ] Boundary + credential flow are sections 1 and 2 (AC 2 "prominently").
- [ ] Every invariant traceable to a mechanism named in a runbook/review.
- [ ] No overclaim: production-pending items marked as such.
- [ ] Links resolve; no sensitive values; ~170 lines.

Commit: `docs(demo): add demo-environments threat model`.

## Step 4 — Cross-check pass (both docs together)

- Re-read the ticket AC line by line against the two files; record the
  mapping in progress.md.
- Grep both docs' inline code/commands and confirm each exists:
  `grep -o 'npm run [a-z:-]*'` vs `package.json` scripts; hostnames vs
  wrangler configs; file links vs `ls docs/knowledge`.
- Confirm consistency with the decision record's deviation table (no
  semantic drift, only editorial).
- Run repo hygiene gates that cover docs: `git diff --check` (whitespace);
  no gate in `npm test` consumes docs/, so no code gates are triggered —
  note that in progress.md rather than running the full suite blindly.

Fix anything found; amend/commit as
`docs(demo): cross-check fixes` only if needed.

## Step 5 — progress.md

Maintain from Step 1 onward (created at Step 1 with the plan checklist;
updated per step with commits, deviations, and verification evidence).

## Step 6 — review.md (Review phase)

Handoff summary: files created, AC mapping, verification performed, gaps
(e.g., no production evidence — inherited, not introduced), open concerns,
suggested human follow-ups. Final commit includes review.md + final
progress.md.

## Testing strategy summary

| Check | How |
|---|---|
| AC 1 separateness | section-structure inspection (Step 2 checklist) |
| AC 2 prominence | section-order inspection (Step 3 checklist) |
| AC 3 completeness | 3-row table diff vs decision record (Step 4) |
| Command/hostname accuracy | grep vs package.json + wrangler configs (Step 4) |
| Link integrity | resolve every relative link (Step 4) |
| No secrets/PII | manual sweep + existing leak-check idiom (Step 4) |
| Repo hygiene | `git diff --check` (Step 4) |

## Risks

- **Drift risk between new docs and runbooks** — mitigated by delegation
  rule (D6/design) and the Step 4 grep pass.
- **Overclaiming production readiness** — mitigated by dedicated evidence
  sections in both docs (design D5).
- **Scope creep into editing knowledge docs** — out of scope; if a factual
  error in a runbook is discovered, record it in review.md as a follow-up
  instead of fixing under this ticket.

## Commit sequence

1. `docs(demo): T-004-05-01 research/design/structure/plan artifacts`
2. `docs(demo): add demo-environments capability guide`
3. `docs(demo): add demo-environments threat model`
4. (conditional) `docs(demo): cross-check fixes`
5. `docs(demo): T-004-05-01 progress and review handoff`
