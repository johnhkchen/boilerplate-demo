# Design — T-007-03-02 compile-gap-list-and-mint-followons

Decide the shape and *home* of two outputs, grounded in the research: (A) the
shipped gap-list artifact, and (B) the minted follow-on epic drafts. The hard
question is not "what do they say" — the drill already fixed that — but "where do
they live so the leak boundary and pull-discipline both hold."

## Decision 1 — the gap list ships as `docs/demo-handoff-gaps.md`

**Options considered.**

- **(a) `docs/active/work/T-007-03-02/gap-list.md`** — keep it as a pure RDSPI work
  artifact. *Rejected:* the story is explicit — "authored on the generated-project
  docs surface (they travel with a demo)." A work-dir file does not travel with a
  demo (T-006-02-02 proved `docs/active/**` is stripped from a generated project).
- **(b) `docs/knowledge/handoff-gaps.md`** — the other shipping surface. *Rejected:*
  `docs/knowledge/**` is the template's *explanatory* corpus (charter, playbook,
  spikes). A per-owner "here are the rough edges when you take this over" doc reads
  as project operations, matching `docs/demo-environments.md` /
  `docs/demo-threat-model.md`, not knowledge.
- **(c) `docs/demo-handoff-gaps.md`** — top-level shipping docs, beside the two
  README-linked operations docs. **Chosen.** Kebab name matches the existing
  `docs/demo-*.md` convention; sits next to the sibling runbook
  (`docs/demo-handoff-runbook.md`, T-007-03-01) as a matched pair; travels with a
  demo; is genuinely useful to a *new owner* (its audience), not to the template.

**Why this honors the leak guardrail.** The gap list's audience is the second
owner. It names repo seams the new owner will actually hit (a test that asserts the
old domain, a DO with no export command) and the manual workaround for each. It
must contain **zero** template-development demand — no "the template plans to build
X," no fleet/Vend/Lisa/`johnhkchen` references except where a seam literally spells
`b28.dev`/the author repo as the thing to change. The follow-on epics (which *are*
template demand) live elsewhere (Decision 3) and are referenced from the gap list
only as an opaque pointer ("closing this is tracked as template follow-on work"),
never by pasting their demand text in.

## Decision 2 — content model: per-category verdict + a gap ledger

The gap list mirrors the drill's own scorecard so a reader can diff the two. Shape:

1. **A 7-row category table** — for each category: verdict (**clean** / **gap** /
   **deferred-live**), the failing/at-risk seam (file:line or binding), and the
   new-owner action (manual workaround or the metered live step).
2. **A gap ledger** — one entry per *named gap*, each with: the seam, why it fails
   clean transfer, the manual workaround a new owner uses today, and whether closing
   it is a large-automation follow-on (linked) or a small repo fix (candidate
   ticket, deliberately *not* inflated into an epic).
3. **A "metered live steps still deferred" section** — the legs no drill could run
   without a second live account, named honestly as the deferred gold-master handoff
   (the story's metered step). Not dressed up as passes.

**Rejected alternative:** a prose narrative. Rejected — a new owner triaging a
handoff wants a scannable ledger keyed by seam, and grep-verifiability (an AC-style
requirement inherited from the sibling) demands literal seam citations, not prose.

## Decision 3 — follow-on epic drafts live UN-PROMOTED under this ticket's work dir

**Options considered.**

- **(a) `docs/active/epic/E-008..E-010.md`** — mint them as real epics. *Rejected,
  hard:* violates pull-discipline (PM README: `epic/` changes "only when a play
  clears a promoted signal"). A work ticket must not squat canonical epic numbers or
  inject promoted demand. E-007 itself says these "should be minted separately."
- **(b) `docs/active/pm/staged/`** — the designated un-promoted draft space.
  *Rejected:* the PM README says "The PM writes ONLY here" — it is the PM agent's
  desk, governed by `process-gate.md` batch discipline. Dropping drafts there from a
  work ticket collides with the PM's survey/synthesize cycle and could be mistaken
  for a staged batch. Wrong owner.
- **(c) `docs/active/work/T-007-03-02/followons/*.md`** — mint them as clearly
  labelled DRAFT epics inside this ticket's own work dir. **Chosen.** They are this
  ticket's product, discoverable with the rest of its artifacts; un-promoted (not in
  `epic/`); carry **provisional** ids (`E-DRAFT-<slug>`, with a *suggested* next
  number E-008..E-010 noted as non-binding) so promotion stays Vend's/human's
  pull-decision; and — being under `docs/active/**` — are correctly stripped from a
  generated project, so template demand never ships.

**Draft shape.** Each draft reuses E-007's frontmatter + MTG-card flourish so a
promoter can lift it into `epic/` with only an id/number change: `id` (provisional),
`title` (kebab), `status: draft`, `kind: permanent`, `advances`, `serves`; then
Intent / Value / Done-looks-like / Context & constraints; and a **"Seeds"** section
citing the exact drill gap(s) it closes. Each stays *intent-only* (E-007's rule) —
it does not pre-decompose into tickets.

## Decision 4 — which gaps become epics vs stay named-but-small

The AC: mint an epic *for each large automation gap* (data migration, secret-rotation
tooling, domain re-delegation) *rather than inflating this card*. Mapping:

| Drill gap / deferred leg | Disposition |
| --- | --- |
| Data: `SESSION_COORDINATOR` DO storage has no export seam; remote D1 import deferred; `--table` scoping friction | **Epic draft: data-migration-tooling** |
| Secrets: all 8 rotatable but live install into new-owner Cloudflare/GitHub is a manual 6-step run | **Epic draft: secret-rotation-tooling** |
| Domain: live zone/DNS re-delegation deferred; `database_id` removal + Worker-name collision on deploy | **Epic draft: domain-re-delegation** |
| Domain: `test/promote.test.mjs` `demo.b28.dev` literal | **Named gap → small fix** (candidate ticket: derive expectation from config). Explicitly NOT an epic. |
| Harness F-1: uppercase placeholder vs lowercase `DNS_NAME` | **Named gap → small fix** (drill-harness revision). |
| D1 unscoped-dump migration-bookkeeping collision | **Named gap → runbook note / small guard.** |
| Container image build (`Dockerfile.session`) unexercised | **Named gap → folded into data/domain live deploy epic; noted, not its own epic.** |
| `.dev.vars` build-leak operator rule | **Named gap → operator rule (already documented); candidate guard, not an epic.** |

Three epics, matching the AC's three examples exactly; five small gaps named in the
ledger and deliberately kept off the epic surface (anti-inflation). The
`test/promote.test.mjs` fix is called out separately because it is the *only* gap
that makes the transferred tree fail its **own** test suite — the sharpest of the
small gaps — but it is a one-line derive-from-config change, not automation.

## Decision 5 — honesty invariants carried from the drill

- Never relabel a **deferred-live** metered step as a pass. The gap list keeps the
  three-state vocabulary (clean / gap / deferred-live) verbatim from the scorecard.
- Every gap cites a **grep-verifiable** seam (re-verified this session).
- The shipped gap list is **leak-clean**; the epic drafts (template demand) are
  quarantined to `docs/active/work/**`.
- This ticket **closes no gap** (story boundary) — it names and mints only.
