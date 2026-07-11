# Review — T-007-03-02 compile-gap-list-and-mint-followons

Handoff self-assessment. Docs-only ticket: no runtime code, wrangler config, test, or
epic/story/ticket file changed. The ticket *names and mints*; it closes no gap (story
boundary S-007-03).

## What changed

One commit (`4cf505d`), all additive:

**Shipped — travels with a generated demo:**
- `docs/demo-handoff-gaps.md` (128 lines) — the new-owner-facing gap list, on the
  generated-project docs surface beside `docs/demo-environments.md`. A 7-category
  clean-transfer verdict table, a `G1..G5` known-gap ledger (seam · why · workaround ·
  how it's closed), a "metered live steps still deferred" section, and a pointer to
  the sibling runbook.

**Template planning trail — stripped from a generated demo (`docs/active/**`):**
- `followons/E-DRAFT-data-migration-tooling.md` — closes the Data gaps (G2 DO export,
  remote-D1 import, G3 scoping).
- `followons/E-DRAFT-secret-rotation-tooling.md` — closes the Secrets deferred-live
  install (eight named seams, G5).
- `followons/E-DRAFT-domain-re-delegation.md` — closes the Domain gaps (G1 test
  literal, live re-point, G4 deploy collision, F-1).
- `research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md` — RDSPI trail.

## Acceptance check

AC: *"A gap-list artifact names each category that failed clean transfer with its
failing seam, and a follow-on epic draft is minted for each large automation gap
(e.g. data migration, secret-rotation tooling, domain re-delegation) rather than
inflating this card."*

- **Names each category + failing seam.** ✅ All seven categories carry a verdict with
  a cited seam; the two true gaps (Domain, Data) and the deferred-live legs each name
  a real file/binding. Verdicts match the settled scorecard
  (`../T-007-02-01/transfer-signal.md` lines 120–132) — fidelity gate passed.
- **A follow-on epic draft per large automation gap.** ✅ Three drafts, matching the
  AC's three named examples exactly (data migration, secret rotation, domain
  re-delegation).
- **Rather than inflating this card.** ✅ The five small gaps (G1 test literal, G3 D1
  scoping, G5 `.dev.vars` build rule, F-1 harness placeholder, container-build note)
  are named in the ledger but deliberately kept off the epic surface;
  `design.md` Decision 4 records the split.
- **No failure silently absorbed** (story acceptance). ✅ Every non-clean state is an
  explicit ledger entry or a named deferred-live step; nothing is dropped.

## Test coverage

No unit tests — there is no runtime surface to exercise (docs only). Verification is
three gates, all green (recorded in `progress.md`):

1. **Seam-real** — every cited seam resolves live (`promote.test.mjs` literal,
   `session-lifecycle.ts:94`, `wrangler.sessions.jsonc:47`, `wrangler.jsonc`
   `database_id`, eight secret names). Re-verified this session.
2. **Leak-clean** — the shipped gap list has zero template-demand terms; its only
   `b28.dev` hit is the G1 seam literal (the value a new owner changes). The epic
   drafts (which *are* template demand) are quarantined to `docs/active/work/**`.
3. **Fidelity** — no `deferred-live` leg relabelled as a pass.

**Gap in verification:** the leak-clean gate is a term grep, not a semantic proof; a
reviewer should eyeball `docs/demo-handoff-gaps.md` once to confirm it reads as
new-owner operations, not template roadmap. It was written to that intent, but the
grep can't prove tone.

## Open concerns for the human

1. **The three drafts are un-promoted by design.** They carry `status: draft` and
   provisional `E-DRAFT-<slug>` ids with *suggested* numbers E-008/09/10 (non-binding).
   Promotion into `docs/active/epic/` with canonical numbers is Vend's `propose-epic`
   / a human pull-decision — pull-discipline kept this work ticket out of `epic/`. If
   the intended home for minted drafts is elsewhere (e.g. the PM staging desk), they
   move as-is; the frontmatter already matches E-007's shape for a lift-and-renumber.
2. **G1 is the sharpest gap.** `test/promote.test.mjs` pins `demo.b28.dev`, so a
   re-pointed tree fails its *own* `npm test`. It is a one-line derive-from-config fix
   and rides along with the domain-re-delegation draft — but until closed, a new owner
   who re-points and runs the suite sees a red test and may think they broke something.
   The gap list says so plainly; worth a small standalone ticket if the epic is slow.
3. **The gold-master handoff stays deferred.** Five metered live legs (real deploy,
   remote D1 import, secret install, zone delegation, deployed-URL checks) need a real
   second Cloudflare/GitHub account and were never run — named as deferred-live in both
   the gap list and the drill record, never faked. This is the story's honest boundary,
   not a defect of this ticket.
4. **Sibling runbook not yet written.** `docs/demo-handoff-gaps.md` links
   `docs/demo-handoff-runbook.md`, which T-007-03-01 owns and had not landed at commit
   time. The link is intentional (matched pair); it dangles until that ticket ships.

## Critical issues

None. Nothing destructive; no secret touched; no runtime behavior changed. The two
membranes that matter — leak boundary (shipped vs planning) and pull-discipline (draft
vs promoted) — both held.
