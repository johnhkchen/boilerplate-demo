# T-006-01-01 — author-assembly-playbook — Structure

The blueprint: files touched, the playbook's internal skeleton, and the
reference contract each section must honor. No prose drafting here.

## File-level changes

| Action | Path | Notes |
|---|---|---|
| Create | `docs/knowledge/assembly-playbook.md` | The deliverable. ~2,300 words target, hard read-through ceiling ~2,500. |
| Create | `docs/active/work/T-006-01-01/*.md` | RDSPI artifacts (this set). |

No modifications to `src/**`, `scripts/**`, `test/**`, `tests/**`,
`package.json`, or any existing knowledge doc. No deletions.

## Playbook skeleton (section order is the play order)

```
# Rapid assembly playbook                      (H1)
  — stance paragraph: what this play is, who runs it, when it starts
    (repo generated, foundation deployed or deployable), and its four
    beats: intake → prove → check → defer.

## Before the event (preflight, not a beat)
  — template maintained per product-spec Prepare; builder has run
    `npm install`, `npx playwright install chromium`; new project has
    `lisa init` + `vend init` run by the user (vend-workflow).
  — one-time deploy bootstrap pointer → deployment.md (wrangler whoami,
    npm run deploy, secret put ×2, d1 migrations apply, gh secret set ×2).

## Beat 1 — Intake (steps 1–3)
  1. Collect one artifact per input class (the six-class table: sponsor-site,
     api-docs, code-examples, design-brief, sdk, credentials).
  2. Credentials handling rule: .dev.vars locally (from .dev.vars.example),
     `npx wrangler secret put` in production; never committed, never pasted
     into backstage (backstage-retrieval-seam: refuse secrets).
  3. Write the intake statement: demo moment, stakeholders, references,
     providers, personas, unknowns, acceptance evidence (product-spec).

## Beat 2 — Prove (steps 4–7)
  4. Deploy the generic site public first (P1) — push main / npm run deploy
     path per deployment.md; share URL + repo with teammates.
  5. Rename the labeled surface: DEMO_NAME + PRIMARY_ACTION_LABEL in
     src/pages/index.astro and PRIMARY_ACTION_NAME in
     tests/support/flow-contract.ts — same change, or the flow fails legibly.
  6. Prove failure legibility BEFORE real credentials:
     DEMO_FAULT=broken / DEMO_FAULT=stalled npm run integration:check.
  7. Build the one vertical slice by replacing the receipt exemplar
     (src/pages/api/receipt.ts behind src/lib/operation-runner.ts) with the
     sponsor call behind the same seam — one slice, high-agency, no detours.

## Beat 3 — Check (steps 8–10)
  8. Local gate: npm run integration:check (45 s budget,
     INTEGRATION_CHECK_TIMEOUT_MS override; report at
     test-results/integration-report.json; per-flow budgets in
     tests/support/flow-contract.ts).
  9. Full gate: npm run verify (test + typecheck + integration:check +
     test:flow:backstage + deploy:dry).
 10. Deployed surface: push main → CI verify + promote (deployment.md);
     confirm by hand: curl the public URL, OPS_CHECK_URL=… npm run ops:check,
     DEMO_BASE_URL=… npm run backstage:feed; submit one backstage entry and
     retrieve it (the stakeholder loop, closed).

## Beat 4 — Defer (steps 11–12)
 11. Sweep the session for leftovers (product-spec's six leftover kinds).
 12. Convert each to ONE line on docs/active/demand.md ("what + why it might
     matter"); nothing becomes an epic/ticket now — vend chain pulls one
     signal when there's capacity; Lisa's RDSPI loop starts then
     (rdspi-workflow, by reference).

## Exit gate (mandatory, observational)
  — green integration:check within budget; Playwright healthy + stalled
    flows green within FLOW_BUDGET_MS; core moment observed at the public
    URL; every deferral on the board as a one-liner.
  — the Day-1 done list from product-spec, as the checklist body.
  — explicitly NOT the exit: code written / looks plausible / checks skipped.

## What this play is not (boundaries)
  — Day-2 productization + handoff = future playbooks (signals #2/#3);
    live rehearsal of this play = S-006-02; no provider recipes (N2);
    convincing-ness stays human (N4).
```

## Reference contract (every named path, pre-verified)

The playbook may name only entries from this table; each resolves in this
repo today. The Implement phase re-verifies mechanically before commit.

| Kind | References |
|---|---|
| Knowledge docs | `docs/knowledge/charter.md`, `product-spec.md`, `deployment.md`, `integration-check.md`, `backstage-retrieval-seam.md`, `vend-workflow.md`, `rdspi-workflow.md` |
| npm scripts | `integration:check`, `ops:check`, `leak:check`, `backstage:feed`, `verify`, `test`, `typecheck`, `test:flow`, `test:flow:stalled`, `test:flow:backstage`, `deploy`, `deploy:dry`, `promote`, `rollback`, `dev`, `build` |
| Scripts | `scripts/integration-check.ts`, `scripts/ops-check.ts`, `scripts/leak-check.ts`, `scripts/backstage-feed.ts`, `scripts/promote.ts`, `scripts/rollback.ts` |
| Source seams | `src/pages/index.astro`, `src/pages/api/receipt.ts`, `src/lib/operation-runner.ts`, `src/lib/receipt.ts`, `src/pages/api/backstage/entries.ts`, `src/pages/api/backstage/feed.ts`, `src/pages/backstage.astro` |
| Test surfaces | `tests/support/flow-contract.ts`, `tests/demo-flow.spec.ts`, `tests/backstage-flow.spec.ts`, `test-results/integration-report.json` |
| Config/env | `.dev.vars.example`, `.dev.vars`, `wrangler.jsonc`, `migrations/`, `DEMO_PASSCODE`, `DEMO_SIGNING_KEY`, `DEMO_FAULT`, `OPS_CHECK_URL`, `DEMO_BASE_URL`, `INTEGRATION_CHECK_TIMEOUT_MS`, `BACKSTAGE_DB` |
| Board | `docs/active/demand.md`, `SEED.md` |
| External commands | `npx wrangler whoami`, `npx wrangler secret put …`, `npx wrangler d1 migrations apply BACKSTAGE_DB --remote`, `gh secret set …`, `npx playwright install chromium` |

Intentionally absent: `session:*` scripts, `Dockerfile.session`,
`wrangler.sessions.jsonc` (E-004, not Day 1); any provider name or SDK
(N2); `DEMO_FAULT=leak` appears only inside its warning sentence.

## Internal organization rules

- Steps numbered 1–12 continuously across beats; beats are H2s.
- Commands in fenced `sh` blocks, one purpose per block, matching sibling
  docs' style.
- Exactly one table (intake classes) to keep the read linear.
- Each beat closes with a one-line "Depth:" pointer to its owning doc(s)
  instead of inlining their content.
- The six intake class names are the fixture contract for T-006-01-02 —
  once merged, changing them means changing the fixture; the playbook says
  so in the intake section.

## Ordering of changes

1. Author `docs/knowledge/assembly-playbook.md` (all sections, one pass).
2. Mechanical verification (path grep + word count) — see plan.md.
3. Commit artifacts and playbook per repo convention.

Single-file deliverable; no ordering hazards with other open tickets
(T-006-01-02 is born blocked on this one; disjoint paths otherwise).
