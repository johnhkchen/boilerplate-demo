# T-006-01-01 — author-assembly-playbook — Design

Decision: how to shape `docs/knowledge/assembly-playbook.md` so it satisfies
the AC (grep-verifiable references, exercised-under-budgets exit condition,
one-sitting read) and fixes the intake contract T-006-01-02 will mirror.

## Options considered

### A. Flat numbered script (1–N, no grouping)

One linear list of ~15 steps from "clone template" to "signals filed."

- **For:** maximally sequential; nothing to interpret under event pressure.
- **Against:** loses the four-beat vocabulary the ticket, story, and epic all
  use ("intake, prove, check, defer"). The fixture ticket needs to point at
  *the intake step's declared classes* — a flat list buries that contract
  mid-sequence. Harder to allocate the word budget; steps of very different
  weight (a `curl` vs. "build the slice") flatten into equal-looking items.

### B. Four ordered beats — Intake → Prove → Check → Defer — with numbered steps inside, plus a preflight and an exit gate

The play is still strictly ordered (beats in order, steps in order inside
each), but the beat names give the doc its skeleton and its shared vocabulary
with the board artifacts.

- **For:** matches the ticket's own language verbatim; the intake beat becomes
  a self-contained, enumerable contract (exactly what T-006-01-02 waits on);
  the exit gate is a first-class section, which the AC demands ("its exit
  condition is… not 'code written'"); beats map cleanly onto the source docs
  (Intake←product-spec, Prove←charter/product-spec + the receipt exemplar,
  Check←integration-check + deployment, Defer←vend-workflow + rdspi-workflow).
- **Against:** slightly more structure than a pure script; mitigated by
  numbering steps continuously (1…N) across beats so it still reads as one
  play.

### C. Decision tree / branching checklist per situation

Branch on "sponsor API is REST vs. SDK vs. websocket," "Figma vs. no design," …

- **Against, decisively:** N2 forbids provider-specific recipes until repeated
  evidence earns them; branches are exactly where those recipes would creep
  in. Event pressure wants a rail, not a tree. Rejected.

### D. Compendium (inline the relevant parts of the seven docs)

- **Against, decisively:** the seven docs total ~5,700 words against a
  ~2,500-word ceiling; inlining duplicates truth that then rots (product-spec:
  prose carries durable intent, not implementation state). The story says
  "composes… **by reference**." Rejected.

## Decision: Option B

Four ordered beats with continuously numbered steps, a short "Before the
event" preflight note (Prepare-phase pointer, not a beat), and a mandatory
**Exit gate** section. Composition strictly by reference: each step names the
command to run and the knowledge doc that owns the depth.

## Design decisions inside the chosen shape

### D1 — The intake step declares exactly six input classes

Taken verbatim-in-spirit from product-spec's input list, as kebab-case class
names a fixture directory can mirror one-to-one:

1. `sponsor-site` — sponsor website / product pages
2. `api-docs` — current API documentation
3. `code-examples` — GitHub examples / sample repos
4. `design-brief` — Figma brief or screenshots
5. `sdk` — SDKs or client libraries
6. `credentials` — temporary API credentials

Plus the intake *outcome*: one short written statement naming the demo
moment, stakeholders, references, providers, personas, unknowns, and
acceptance evidence (product-spec's structured-intake list). Credentials get
an explicit handling rule: never committed, never pasted into backstage;
they go to `.dev.vars` locally and `npx wrangler secret put` in production —
so the fixture's `credentials` artifact must be a placeholder/fake by
construction (leak-check clean).

### D2 — Prove is built on the receipt exemplar, by replacement

The playbook directs the builder to treat the shipped receipt slice
(`src/pages/index.astro` → `src/pages/api/receipt.ts` under
`src/lib/operation-runner.ts`) as the load-bearing pattern: rename the
surface via the template slots (`DEMO_NAME`, `PRIMARY_ACTION_LABEL`) and the
pinned accessible name (`PRIMARY_ACTION_NAME` in
`tests/support/flow-contract.ts`) **in the same change**, then swap the
receipt call for the sponsor call behind the same runner/time-budget seam.
This keeps every named path real in this repo (AC) while remaining
provider-agnostic (N2).

### D3 — Check is the existing gates, in escalating scope

Local gate (`npm run integration:check`, 45 s budget) → fault proofs
(`DEMO_FAULT=broken|stalled` — the playbook tells builders to prove failure
legibility *before* wiring real credentials, mirroring the harness's fake
slow integration) → full `npm run verify` → deployed-surface verification
(`curl`, `OPS_CHECK_URL=… npm run ops:check`, `npm run backstage:feed`
against the live URL). `DEMO_FAULT=leak` is named only with its
never-on-shared-surfaces warning, consistent with integration-check.md.

### D4 — Defer is a conversion rule, not a suggestion

Every unresolved item at session end — unfinished integrations, disproven
assumptions, UX gaps, reliability work, deployment concerns, opportunities
(product-spec's list) — becomes exactly one line on `docs/active/demand.md`
in the board's own format ("what + why it might matter"). The playbook states
the negative too: nothing gets a speculative epic/ticket; `vend chain` pulls
one signal when there's capacity, and Lisa's RDSPI loop starts only then
(rdspi-workflow referenced, not restarted). This is the epic's
"deferral-to-signal conversion" made mechanical.

### D5 — The exit gate is observational, and phrased as such

The session is over when, at the public URL, the core moment is **observed
working under the harness time budgets** — `npm run integration:check` green
within its 45 s budget, the Playwright flow green within `FLOW_BUDGET_MS`
(healthy and stalled projects), the deployed receipt/ops probe answering —
**and** every deferral has landed as a one-line signal. Explicitly not the
exit: "code written," "looks done," or checks skipped in favor of a human
eyeballing it (charter: agents run tests and inspect traces before asking a
human to find bugs). The Day-1 done list from product-spec is included as the
gate's checklist body so the playbook and spec cannot drift apart on what
Day 1 means.

### D6 — Placement, boundaries, and forward pointers

- Lives at `docs/knowledge/assembly-playbook.md`; product-spec already names
  it as the Prepare-phase deliverable used on Day 1.
- Names its own boundaries in a short closing section: Day-2 productization
  and handoff rehearsal are separate future playbooks (demand signals #2/#3);
  the live rehearsal of *this* playbook is S-006-02; no provider recipes
  (N2); convincingness is human judgment (N4).
- Template-leak guardrail: the playbook is written for the *generated*
  project's Day 1 (where `lisa init` + `vend init` have created a fresh
  board), while remaining grep-verifiable against this repo because the
  template ships the same layout.

### D7 — Word budget (~2,300 target, ceiling 2,500)

Title + stance ~150 · Preflight ~200 · Intake ~450 · Prove ~550 · Check ~550
· Defer ~300 · Exit gate ~250 · Boundaries ~150. Format matches sibling
knowledge docs: H1, imperative headings, fenced `sh` blocks, one table
maximum (intake classes).

## Rejected details, with reasons

- **Inlining budget numbers as a table of all `FLOW_BUDGET_MS` values** —
  they'd rot; name the constant's file and the two numbers a builder feels
  (45 s gate, 20 s per test) and point at `tests/support/flow-contract.ts`.
- **A "choose your provider" appendix** — N2, rejected outright.
- **Scripting `vend chain` invocations into the play** — the board doc owns
  that; Day 1 ends at *signals filed*, pulling is a capacity decision.
- **Naming session/sandbox surfaces (`session:*` scripts)** — E-004 territory,
  not Day 1; would add paths without advancing the play.
