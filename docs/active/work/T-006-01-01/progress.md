# T-006-01-01 — author-assembly-playbook — Progress

## Steps completed (all — plan.md steps 1–8)

- **Step 1 — planning artifacts committed.** `1039d28`
  `docs(demo): T-006-01-01 research/design/structure/plan artifacts`.
  The pre-existing ticket-frontmatter modification was left unstaged (Lisa
  owns phase/status).
- **Step 2 — playbook authored.** `docs/knowledge/assembly-playbook.md`
  written in one pass following structure.md's skeleton: stance, Before the
  event, Beats 1–4 with steps 1–12 continuously numbered, Exit gate, What
  this play is not. Exactly one table (intake classes); each beat closes
  with a "Depth:" pointer.
- **Step 3 — reference verification: PASS** (after one fix, below).
  - 16/16 named repo paths exist (`test -e`): the seven knowledge docs,
    `docs/active/demand.md`, `src/pages/index.astro`,
    `src/pages/backstage.astro`, `src/pages/api/receipt.ts`,
    `src/lib/operation-runner.ts`, `tests/support/flow-contract.ts`,
    `scripts/promote.ts`, `wrangler.jsonc`, `.dev.vars.example`.
  - 11/11 named npm scripts exist in `package.json`: `integration:check`,
    `ops:check`, `leak:check`, `backstage:feed`, `verify`, `test:flow`,
    `test:flow:stalled`, `test:flow:backstage`, `promote`, `rollback`,
    `deploy`.
  - 7/7 named env/binding names grep in `scripts/ src/ tests/
    .dev.vars.example wrangler.jsonc`: `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`,
    `DEMO_FAULT`, `OPS_CHECK_URL`, `DEMO_BASE_URL`,
    `INTEGRATION_CHECK_TIMEOUT_MS`, `BACKSTAGE_DB`.
  - Literal contract strings resolve: fault evidence (`receipt [operation]`)
    in integration-check.md; `PRIMARY_ACTION_NAME` in
    `tests/support/flow-contract.ts`; `DEMO_NAME` + `PRIMARY_ACTION_LABEL`
    slots in `src/pages/index.astro`.
  - Anti-leak scan: no provider/SDK product names beyond Cloudflare-platform
    terms already used by sibling docs; no secret-looking literals;
    `DEMO_FAULT=leak` appears only inside its warning sentence.
- **Step 4 — size: PASS.** `wc -w` = **1,619** (ceiling 2,500, target
  ≤2,300). One top-to-bottom read as the target user: the play is executable
  with only "Depth:" excursions.
- **Step 5 — exit-condition wording: PASS.** The Exit gate states
  (a) budgets: "`npm run integration:check` exits 0 within its 45-second
  budget" and "the Playwright flows — healthy and stalled — pass within
  their budgets in `tests/support/flow-contract.ts`";
  (b) conversion: "every leftover from Step 11 is a one-line signal on
  `docs/active/demand.md`";
  (c) insufficiency: "Plausible-looking code, green checks you did not run,
  or a demo that only worked on localhost do not pass the gate."
- **Step 6 — playbook committed.** `852be15`
  `docs(knowledge): author rapid-assembly playbook (T-006-01-01)`.
- **Steps 7–8 — this file and review.md**, committed together as the
  handoff commit per precedent.

## Deviations from plan

- **One reference fix during Step 3.** The draft named
  `test/fixtures/sponsor-packet/` in the intake section; that path does not
  exist until T-006-01-02 lands, so a strict grep-verification would flag
  it. Rephrased to name the fixture as "its own ticket, landing behind this
  doc" without the path. T-006-01-02 already carries the path in its own
  story scope; it may add the literal path back once the directory exists.
- No other deviations; no `src/**`, `scripts/**`, or test changes (as
  scoped).

## What remains

Nothing in this ticket. Downstream, in order:

1. T-006-01-02 — sponsor-packet fixture mirroring the six declared intake
   classes (`sponsor-site`, `api-docs`, `code-examples`, `design-brief`,
   `sdk`, `credentials`), leak-check clean.
2. S-006-02 — live dry run of the playbook (named in the playbook's own
   boundaries section).
