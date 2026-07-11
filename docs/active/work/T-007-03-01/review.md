# Review — T-007-03-01 write-handoff-runbook

Self-assessment of the completed work. Handoff document for a human reviewer.

## What changed

**The deliverable (portable surface, travels with a generated demo):**

- `docs/knowledge/handoff-runbook.md` — **created** (241 lines). "Handing
  this demo to a new owner": prerequisites + the clean-tree rule, a standing
  record-what-failed rule, then the seven transfer categories in the
  drill-proven order — **Repo → Configuration → Secrets → Cloudflare
  resources → Domain → Data → Checks** — each section carrying the exact
  seams (`file:key`), the commands, and a verify observable; the two
  drill-recorded gaps appear as **Known gap** callouts exactly where a
  follower hits them (the `test/promote.test.mjs` `demo.b28.dev` literal;
  the `SESSION_COORDINATOR` DO storage having no export path).

**Template-side work trail (scrubbed from generated projects):**

- `docs/active/work/T-007-03-01/` — research/design/structure/plan/progress/
  review artifacts, `verify-runbook.sh`, and `evidence/` (4 files).

**Modified/deleted: nothing.** No runtime code, no tests, no shared docs —
`README.md` and `demo-environments.md` were deliberately left untouched to
stay disjoint from the parallel gap-list sibling (S-007-03 wave rationale).

Commits: `1095693` (phases + verifier), `efb63a1` (runbook), `0ce7c66`
(evidence), plus this review.

## Acceptance criterion → evidence

| Clause | How met | Evidence |
|---|---|---|
| "runbook artifact on the generated-project docs surface" | `docs/knowledge/` — the surface the project's own capability guide names for operational runbooks; proven portable by running the transfer harness's `scrub-fresh-owner.sh`: runbook **present** in the scrubbed context, `docs/active/` **absent** | `evidence/portability.txt` |
| "walks a second owner through all seven categories" | seven `##` sections, each with seams + commands + verify | `evidence/heading-order.txt` |
| "in the drill-proven order" | Repo → Config → Secrets → Resources → Domain → Data → Checks — the order fixed by the harness's deferred-leg sequence and the DAG (checks last); the one taxonomy deviation (route-pattern edits live in Configuration, not Domain) is argued in design.md D2a from what the drill actually exercised | design.md; research.md |
| "grep-verifiable references to real seams" | verifier pass 2 (29 seam strings present in the runbook) + pass 3 (every cited file/key/npm-script resolves in the tree) — all green | `evidence/verify-run.txt` |
| "no template-development history/demand leaked" | verifier pass 1: zero matches for RDSPI/Lisa/Vend/`docs/active`/ticket-story-epic IDs/drill-narration vocabulary; runbook voice is imperative project-artifact prose | `evidence/verify-run.txt` |

## Test coverage

- **What is covered mechanically:** leak vocabulary (12 patterns), seam
  presence (29 strings), seam reality (files/keys/scripts), portability
  (scrub-context assertion), heading order, and `npm test` 152/152 green
  (docs-only change — no delta).
- **Gaps in coverage, honestly:**
  - The verifier proves the runbook *cites* real seams; it cannot prove the
    *prose between citations* is correct or followable. The only true test
    is a human executing it against a real second Cloudflare account — the
    metered gold-master handoff the epic named as deferred. Until then the
    live legs (real deploy, DNS attach, remote D1 import, `gh secret set` on
    a real repo) are transcribed from the drill's proven local runs + the
    deployment runbook's recorded bootstrap, not re-executed here.
  - The leak scan is pattern-based; a leak phrased in novel vocabulary would
    pass it. Mitigated by authoring voice + manual read, not proven.
  - `verify-runbook.sh` is template-side (work dir) — it will not travel to
    generated projects, so runbook/tree drift after generation is unguarded
    (consistent with the runbook standing alone; noted below).

## Open concerns / follow-ups (for humans or the sibling gap list)

1. **Discoverability link deferred.** Nothing links to the runbook yet.
   Adding one line to `demo-environments.md` (and/or `README.md`) is a
   trivial follow-up once the parallel sibling lands — deliberately not done
   now to avoid the shared-edit collision the wave rationale bars.
2. **Runbook can drift from the tree.** If a seam is renamed (e.g. a route
   key or npm script), nothing fails. Cheap option: promote the verifier's
   pass 2+3 into the committed test suite. Left for the gap owner to weigh.
3. **Pre-existing leak nearby, not mine to fix here:** `deployment.md` says
   "or RDSPI artifacts" — template vocabulary already on the portable
   surface. One-word fix; flagged for the sibling/gap list.
4. **The two known gaps are documented, not closed** — by scope. Closing
   the `test/promote.test.mjs` literal and the DO-export seam belongs to the
   follow-ons the gap-list sibling mints.
5. **Line count 241 vs the ~200 guide** — accepted overage (eight secrets +
   two gap callouts); flagging in case a reviewer wants it tightened.

## Critical issues needing human attention

None blocking. The single judgment call worth a human glance: the
**Configuration section owns the route-pattern edits** (Domain's seams)
because deploying before re-pointing routes was never exercised and would
fail against the author zone — design.md Decision 2a records the reasoning.
If a reviewer prefers strict seam-per-category taxonomy, that is a prose
reshuffle, not a rework.
