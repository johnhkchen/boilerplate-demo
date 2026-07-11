# Design — T-006-02-02 deferral-signals-and-playbook-revision

Decisions with rationale, grounded in `research.md`. Four decision points.

## Decision 1 — How the rehearsal project's demand board comes to exist

The acceptance names "the rehearsal project's demand board," and leftover #6 is
that no such board exists on a clean copy. Options:

- **A. Mint `docs/active/demand.md` in the clean copy, holding only the
  rehearsal's signals.** This *is* the deferral protocol being proved: Step 12
  executed for real, on the project the rehearsal built. The playbook's own
  Before-event contract says a project board "exists and is empty of template
  history" — a fresh board with only session signals is exactly that end-state.
- **B. Put the signals in a work-dir file here and call it the board by proxy.**
  Rejected: the criterion says "the rehearsal project's demand board," and the
  whole point of E-006's Beat 4 is signals landing on *that project's own
  board*. A proxy file proves nothing about the protocol.
- **C. Run `vend init` in the clean copy to mint the full clearing side.**
  Rejected: vend would lay epics/PM scaffolding this ticket doesn't need, the
  clean copy is a throwaway proof (not a git repo, lives in `/private/tmp`),
  and the acceptance asks only for the demand board. Minting the one file in
  the board's own shape is the right size.

**Chosen: A.** The board mirrors the source board's header doctrine (thin
signals, one line of what + why, cleared-on-pull) because that header is the
board *contract*, while the source board's four numbered signals are the
*template history* that must not leak — so header yes, inherited signals no.
All 11 logged leftovers land, one line each, keeping the log's numbering so
the log ↔ board correspondence is auditable. Signals that the playbook diff
resolves still land (#1, #3, #6, #7…): the board records what the rehearsal
*session* left unresolved at its end; the acceptance says "each logged
leftover," not "each still-open leftover."

## Decision 2 — Resolve vs. defer, per logged friction

The diff must answer every friction. "Resolve" = the playbook now tells the
builder what to do; "defer" = the playbook names the limit and the signal that
carries it. Mapping (numbers = rehearsal-log leftovers):

| Friction | Treatment in playbook |
|---|---|
| #1 new-credential declaration | **Resolve.** Step 2 gains the missing instruction: declare the new secret in `wrangler.jsonc` (`secrets.required`) — `.dev.vars` supplies values only for declared bindings; workerd silently drops the rest — plus `wrangler secret put` for prod. |
| #2 clean-copy deploy collision | **Resolve the hazard, defer the tooling.** Step 4 (and Before-event bootstrap) state plainly: the deploy targets in `wrangler.jsonc` (worker name, route, D1 id) belong to *this* project only on a freshly generated repo; a copied project must first rename the Worker, provision its own D1, and claim a `*.workers.dev` host — or must not deploy. Collision-free generation/bootstrap tooling is deferred to the board. |
| #3 rename list incomplete | **Resolve.** Step 5 adds the fourth rename target: the heading literal in `tests/demo-flow.spec.ts` (the one label the contract does not centralize). Centralizing it behind a flow-contract constant is deferred to the harness signal. |
| #4 receipt-bound checks | **Defer, honestly named.** Steps 7–8 gain the warning: the shipped checks are bound to the receipt exemplar (`scripts/integration-check.ts` probes `/api/receipt`; `ops-check.ts` asserts the receipt shape; `leak:check` guards `DEMO_SIGNING_KEY`) — after replacing the slice you must rewire those three to your boundary, until the harness reads them from config (board signal). Not resolvable by wording alone; the honest instruction is the interim fix. |
| #5 session-pressure hazard | **Resolve the warning, defer the harness fix.** Beat 3 preamble (so it covers Steps 6, 8, and 9 alike) gains a caution: inside a coding-agent session Astro daemonizes `astro dev` and stale servers answer probes with random keys — run `npx astro dev stop` and strip agent env vars first, or run checks in a clean shell. Neutralizing all agent markers in the harness is a board signal. |
| #6 board init on a clean copy | **Resolve.** Before-event notes that `vend init` mints the board on a generated project, and a raw clean copy must create `docs/active/demand.md` itself before Beat 4 has anywhere to write. |
| #7 install scripts | **Resolve.** Before-event gains one sentence: if the environment blocks npm postinstall scripts, approve `workerd`/`sharp`/`esbuild` or `wrangler` may not run. |
| Step 3 minor (pre-filled intake) | **Resolve.** One sentence: a sponsor packet that already contains the intake statement (as the fixture does) substitutes — verify it, don't re-derive it. |
| Stale "Not yet rehearsed live" | **Resolve.** The bullet updates to the truth: rehearsed against the fixture packet 2026-07-11 (S-006-02); the live-sponsor, public-deploy rehearsal remains open. |

#8–#11 are not playbook frictions (harness behavior, seam design, sponsor-demo
specifics) and get no playbook edits — they are board-only.

Style constraint: the playbook is "the sequence; depth lives in the referenced
knowledge docs" and must stay readable in one sitting (E-006 done-looks-like).
Edits are surgical sentences inside existing steps, not new sections — except
the one-paragraph Beat 3 caution, which earns its place because the doc's
premise (followability under session pressure) is exactly the condition that
falsifies the checks.

## Decision 3 — What lands on this repo's demand board

S-006-02 routes foundation/harness gaps "to the board against E-001/E-002 as
signals" instead of growing E-006. Sponsor-demo-specific leftovers (#10
webhooks, #11 sdk) belong only to the rehearsal project's board — they are
meaningless to the template. Playbook-only frictions (#1, #3-wording, #6, #7,
Step 3) are fully resolved by the diff and need no template signal. That leaves
four template signals, appended as one-liners to `docs/active/demand.md`:

1. **Boundary-agnostic integration harness** (from #4, #3's centralization, #8)
   — checks hardcode the receipt path/shape/secret and the page heading, and
   stalled evidence kinds are flow-only; the harness should follow the replaced
   slice from config. Why: Day 1's core move silently invalidates the checks.
2. **Collision-free go-public for non-generated copies** (from #2) — deploy
   identity (worker name, route, D1) is baked into `wrangler.jsonc`; a copy
   needs rename-and-provision or generation automation. Why: blocks P1 for any
   rehearsal and risks production.
3. **Agent-proof check environment** (from #5) — the harness neutralizes only
   `CODEX_THREAD_ID`; Astro's agent detection daemonizes dev servers and makes
   check results untrustworthy in the sessions the playbook targets.
4. **Failure-status carry-through at the seam** (from #9) —
   `operation-runner` collapses upstream 401/404/503 into `operation|timeout`,
   so replacement boundaries can't be status-faithful.

Merging #8 into signal 1 (rather than a fifth line) because both are "the
checks' evidence doesn't match the replaced/actual behavior" — one pullable
concern. Keeping #9 separate because it is a seam *design* question, not check
plumbing. Four thin lines respect the board's "nothing unworthy settles" gate:
each is observed (not speculative), named with its why, and small enough to
pull individually.

## Decision 4 — Evidence and commits

- **Evidence for clause (c):** a recursive listing of the clean copy's `docs/`
  captured to `evidence/cleancopy-docs-listing.txt` showing
  `knowledge/assembly-playbook.md` present and `docs/active/` containing only
  the freshly minted `demand.md`; plus the minted board's content copied to
  `evidence/cleancopy-demand.md` (the clean copy is ephemeral `/private/tmp`
  storage, so committed evidence is the durable record).
- **The clean copy's own playbook stays un-revised.** It is the version the
  rehearsal executed — part of the record. The acceptance asks only that it be
  *present*. Syncing it would falsify what was rehearsed and prove nothing.
- **No code changes anywhere** — `src/**`, `scripts/`, `tests/`, configs
  untouched in both repos, per the story boundary.
- **Commits** (scoped `git add` by path; never `-A`, to avoid sweeping Lisa's
  `.lisa/provenance.jsonl` and ticket-frontmatter changes or T-006-02-01's
  uncommitted work dir):
  1. `docs(knowledge): fold rehearsal frictions into assembly playbook (T-006-02-02)` — the playbook diff.
  2. `docs(board): land rehearsal harness and deploy signals (T-006-02-02)` — this repo's demand.md.
  3. `docs(demo): T-006-02-02 signals, evidence, and review handoff` — work artifacts + evidence.

## Rejected alternatives (summary)

- Editing the harness/`flow-contract.ts` to fix #3/#4 properly — out of scope
  by story boundary; routed to board signal 1.
- One mega-signal "fix everything the rehearsal found" on this repo's board —
  violates the thin-signal contract; vend pulls one concern at a time.
- Re-running rehearsal checks in the clean copy to "re-verify" — this ticket
  changes docs only; the log's evidence stands, and re-running under an agent
  session is exactly the hazard finding #5 documents.
- Updating `docs/archive/demand-cleared.md` or sweeping signal #1 off the
  board (E-006 exists) — that is vend's sweep step at epic close, not this
  ticket's.
