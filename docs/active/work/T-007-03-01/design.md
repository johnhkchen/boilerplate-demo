# Design — T-007-03-01 write-handoff-runbook

Decisions for authoring the handoff runbook, grounded in research.md.

## Decision summary

One new file: **`docs/knowledge/handoff-runbook.md`** — an imperative,
command-first runbook in the `deployment.md` house style, walking a second
owner through the seven transfer categories in the drill-proven order
(**Repo → Configuration → Secrets → Resources → Domain → Data → Checks**),
with every seam cited as a real `file:key` / npm-script reference, known gaps
named inline where the follower hits them, and zero template-development
vocabulary. No other file is touched.

## Decision 1 — Where the runbook lives

**Chosen: `docs/knowledge/handoff-runbook.md`.**

- The project states its own convention in the `demo-environments.md` header:
  operational facts/checklists live in `docs/knowledge` runbooks. The
  handoff runbook is exactly that species, and `deployment.md` (its closest
  sibling — same audience, same CLI surface) already lives there.
- The drill harness proves `docs/knowledge/**` survives onto the
  generated-project surface (`scrub-fresh-owner.sh` deletes only
  `docs/active/**`), so the artifact travels with a demo — the story's
  requirement.

Rejected:
- **`docs/handoff-runbook.md` (top level).** The top level holds capability
  guides (`demo-environments.md`, `demo-threat-model.md`), not step-by-step
  runbooks; putting an operational checklist there contradicts the stated
  convention the surface already documents.
- **README section or `docs/active/**`.** README is a shared edit surface
  (collision with the parallel gap-list ticket, S-007-03's disjoint-artifact
  rule); `docs/active/**` is scrubbed from generated projects — the artifact
  would not travel at all.
- **Runbook + transfer script pair.** The story scopes this ticket to a docs
  artifact reading the drill's settled record; the drill's scripts live under
  `docs/active/work/**` (non-portable by design). Porting a script is
  automation the epic explicitly minted as follow-on work, not this card.

## Decision 2 — Category order and section shape

**Chosen: seven category sections in the drill-proven order
1 Repo → 5 Configuration → 6 Secrets → 2 Resources → 3 Domain → 4 Data →
7 Checks**, each section carrying: the seams it owns, the commands to run,
and a "verify" observable (the scorecard's observable/pass-condition shape,
restated as second-owner instructions).

- This is the order the drill's own deferred-leg sequence fixes
  (authenticate/repo → rotate config+secrets → provision resources/domain/
  data → verify checks) and the story DAG enforces (checks last).
- Dependency evidence from the drill supports it: secrets are a boot
  requirement before the Worker serves; repo authority is needed before
  `gh secret set --repo`; checks can only judge a fully transferred
  deployment.

**Sub-decision 2a — where the committed config edits happen.** All committed
author-coupling edits — the two `wrangler.sessions.jsonc` vars, the three
route patterns, and the `database_id` removal — are performed in the
**Configuration** section, even though route patterns are the Domain
category's seam. This mirrors what the drill actually proved (all committed
seams edited before anything touches Cloudflare; deploy then *attaches* the
already-edited routes). The **Domain** section owns verifying the live half:
routes attached, hosts derived consistently from one `SESSION_DOMAIN` value,
plus the known test-literal gap. The Domain section cross-references the
Configuration edits explicitly so the category is still walked, not skipped.

Rejected: strict seam-ownership ordering (Domain edits in the Domain section,
after Resources) — it would instruct deploying with routes still pointed at
the author's zone, which the drill showed fails (no zone authority) and which
no drill leg ever exercised. Order fidelity to the drill wins over taxonomic
purity.

## Decision 3 — How gaps and live legs are represented

**Chosen:** inline, at the exact step where a follower hits them, in two
explicit voices:

- **"Known gap"** callouts for the two drill-recorded gaps: the
  `test/promote.test.mjs:246` domain literal (expect 1/20 test failure after
  re-pointing; not a broken transfer) and the `SESSION_COORDINATOR` DO
  storage having no export/import seam (re-create session state; do not hunt
  for a migration command that does not exist).
- **Expectation framing for first-live steps:** steps the rehearsal proved
  only locally (real deploy under a second account, live DNS attach, remote
  D1 import) are written as instructions with their concrete failure modes
  and a standing rule: *if a step fails, record the exact file/key/command
  that failed rather than working around it silently.* This carries the
  drill's record-don't-hide discipline into the artifact without narrating
  the drill.

Rejected: a separate gaps appendix inside the runbook — that duplicates the
parallel gap-list artifact (T-007-03-02) and invites divergence; the runbook
names gaps only where the follower trips over them.

## Decision 4 — Leak guardrail enforcement

**Chosen:** write the runbook entirely in project-artifact voice (imperative
second person, present tense, facts about *this project*), then verify
mechanically before finishing:

- zero matches in the new file for template-development vocabulary:
  `RDSPI`, `Lisa`, `Vend`, `rdspi`, ticket/story/epic ID patterns
  (`T-0`, `S-0`, `E-0` followed by digits), `docs/active`;
- no drill narration ("the drill", "rehearsal", "T-007-…", author account
  ids, `johnhkchen` outside the factual current-value citations that the
  owner is instructed to *replace*);
- every cited seam greppable: each `file:key`, path, and npm script named in
  the runbook is verified to exist with a scripted grep pass (the acceptance
  criterion's "grep-verifiable references to real seams").

Note: author-identifying *current values* (`demo.b28.dev`, the
`johnhkchen/boilerplate-demo.git` URL) are not leaks — they are the real
committed seam values the owner must replace, and naming them exactly is what
makes the instructions greppable. The guardrail bars template *history and
demand*, not the config's present contents.

## Decision 5 — No shared-file edits, no frontmatter

The runbook is a standalone markdown file with a plain `#` title, matching
every other `docs/knowledge` doc (none carry YAML frontmatter). No link is
added from `README.md` or `demo-environments.md` in this ticket — those are
shared edit surfaces with the parallel sibling ticket; linking is a trivial
follow-up once both artifacts land. Recorded as an open concern for review.md
rather than risked as a collision now.

## Decision 6 — Scope of commands: real handoff, not the simulation

The runbook targets the **real second owner** (own Cloudflare account, own
GitHub repo). Commands come from the drill's proven procedures: the
non-echoing `wrangler secret put` / `gh secret set` sequences and name-only
verification from the rotation record; the scoped D1 export/import and
`database_id` contract from the transfer log; the check invocation seams
(`DEMO_BASE_URL`, `PLAYWRIGHT_BASE_URL`, …) from the checks record; the
clean-tree rule from the rotation record's operational finding. The
scrubbed-simulation apparatus (placeholders, `env -i` harness) stays out —
it is drill machinery, not owner instructions; only its *lessons* (lowercase
zone, HTTPS repo URL, clean-tree rule, scoped export) surface as rules.

## Acceptance mapping

| Acceptance clause | Design answer |
|---|---|
| "runbook artifact on the generated-project docs surface" | `docs/knowledge/handoff-runbook.md`, survives the scrub, portable (N3/P7: no service) |
| "walks a second owner through all seven categories" | seven sections, each with seams + commands + verify observable |
| "in the drill-proven order" | Repo → Configuration → Secrets → Resources → Domain → Data → Checks (harness sequence + DAG) |
| "grep-verifiable references to real seams" | every seam cited as real file:key/script; scripted grep verification in plan |
| "no template-development history/demand leaked" | project-artifact voice + mechanical zero-match scan (Decision 4) |
