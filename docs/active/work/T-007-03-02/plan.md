# Plan — T-007-03-02 compile-gap-list-and-mint-followons

Ordered, independently verifiable steps. Docs-only; "tests" here are grep/scan gates
plus a read-through against the drill record. Each step is small enough to commit
atomically; the whole ticket is one or two commits.

## Verification strategy

There is no code to unit-test. The deliverables are verified by three gates:

1. **Seam-real gate.** Every seam cited in `docs/demo-handoff-gaps.md` and the drafts
   must resolve to a live file:line/binding. Re-run the greps from `research.md`
   (already passed this session: `promote.test.mjs` literal, `DNS_NAME`
   `session-lifecycle.ts:94`, `SESSION_COORDINATOR` `wrangler.sessions.jsonc:47`,
   the `b28.dev` route/var literals, the eight secret names).
2. **Leak-clean gate.** `docs/demo-handoff-gaps.md` must contain no template demand:
   `grep -niE 'vend|lisa|fleet|propose-epic|decompose-epic|E-00[0-9]|epic draft|
   demand board|johnhkchen' docs/demo-handoff-gaps.md` → only allowed hits are seam
   literals (`b28.dev`, the author repo URL as a value-to-change). Manual read
   confirms the only pointer to follow-on work is opaque.
3. **Fidelity gate.** Every category verdict in the gap list matches
   `transfer-signal.md`'s settled state; every named gap traces to a line in a drill
   run log. No verdict is softened (no `deferred-live` shown as pass).

## Steps

### Step 1 — Mint `E-DRAFT-data-migration-tooling.md`
Frontmatter (id provisional `E-DRAFT-data-migration-tooling`, suggested E-008,
`status: draft`, `advances: [P6]`). Intent: durable export/import of both storage
halves across accounts. Seeds: G2 (`SESSION_COORDINATOR` DO, `wrangler.sessions.
jsonc:47`, no export subcommand), the remote-D1 import leg
(`T-007-02-03/transfer-log.md` §4), G3 (`--table backstage_entries` scoping).
Context: respect N2 (Cloudflare-first, not an all-provider migrator), PE-7 sizing.
**Verify:** file parses as the E-007 frontmatter shape; every seam greps.

### Step 2 — Mint `E-DRAFT-secret-rotation-tooling.md`
`advances: [P6, P3]`. Intent: automate generate+install of all eight secrets into
new-owner Cloudflare Workers + GitHub Actions with verification and no value echo.
Seeds: `T-007-02-02/rotation-run.md` (the manual 6-step live install; the eight
names; "no non-rotatable secret"; the `.dev.vars` build-leak operator rule / G5).
Context: N3/P7 (no mandatory SaaS secret broker — a portable script, not a service);
secrets never printed. **Verify:** the eight names match `wrangler.jsonc:secrets.
required` + `wrangler.sessions.jsonc:secrets.required` + the two CI inputs.

### Step 3 — Mint `E-DRAFT-domain-re-delegation.md`
`advances: [P6, P5]`. Intent: automate re-pointing routes + `SESSION_DOMAIN` and
live zone/DNS delegation to a new-owner zone, plus collision-free deploy identity.
Seeds: Domain gap (`test/promote.test.mjs` literal / G1), the deferred live zone leg
(`T-007-02-03/transfer-log.md` §3 + F-1 `session-lifecycle.ts:94`), G4 (Worker-name
`demo-runway` + `database_id` collision, `Dockerfile.session` build). Context: N2
(Cloudflare zone surface only). **Verify:** seams grep; `database_id` value cited
matches `wrangler.jsonc`.

### Step 4 — Write `docs/demo-handoff-gaps.md` (the shipped deliverable)
Follow `structure.md`'s five-section shape. Populate the 7-category table from
`transfer-signal.md`, the `G1..G5` ledger, and the deferred-live section. Reference
the follow-on work only as opaque pointers; reference the sibling runbook
`docs/demo-handoff-runbook.md` by path (do not create it). Keep it new-owner-facing.
**Verify:** leak-clean gate (step-2 grep above) + fidelity gate.

### Step 5 — Write `progress.md`
Record what was produced, deviations, and the gate results. (Ongoing during 1–4.)

### Step 6 — Run all three gates end to end
- Seam-real: the research greps re-run clean.
- Leak-clean: the demand-term grep over `docs/demo-handoff-gaps.md` returns only
  allowed seam literals.
- Fidelity: read `transfer-signal.md` lines 120–132 beside the gap list's category
  table; confirm identical verdicts.
Record outcomes in `progress.md`.

### Step 7 — Commit
One commit for the drafts + gap list (or two: `docs(T-007-03-02): mint follow-on
epic drafts` then `docs(T-007-03-02): compile new-owner gap list`). Do not touch
ticket frontmatter (Lisa advances the phase). Leave `.lisa/` and unrelated modified
tickets unstaged — commit only this ticket's new files.

### Step 8 — Write `review.md`
Summary of files created, the gate results, test-coverage note (why there are no
unit tests), and open concerns (chiefly: the three metered live legs stay deferred;
the three drafts await Vend/human pull; G1 is the one gap that breaks the tree's own
tests).

## Risks & mitigations

- **Leak into the shipped artifact.** Mitigated by the step-6 grep gate + the
  membrane rule in `structure.md`; drafts quarantined to `docs/active/work/**`.
- **Squatting epic numbers.** Mitigated by `status: draft` + provisional
  `E-DRAFT-<slug>` ids; suggested numbers noted as non-binding, promotion deferred to
  Vend (pull-discipline).
- **Inflating this card.** Mitigated by the Decision-4 mapping: exactly three epics
  (the AC's three), five small gaps named but kept off the epic surface.
- **Drifting from the drill record.** Mitigated by the fidelity gate: every verdict
  and seam traces to a settled `transfer-signal.md` row or run-log line.
- **Stepping on the sibling runbook (T-007-03-01).** Mitigated: reference by path
  only; create no `docs/demo-handoff-runbook.md`.

## Done when

`docs/demo-handoff-gaps.md` names every category's clean-transfer verdict with a real
seam and a new-owner action; every uncleanly-transferable category is an explicit
ledger entry; each of the three large automation gaps has a minted follow-on epic
draft; all three gates pass; and no gap is silently absorbed.
