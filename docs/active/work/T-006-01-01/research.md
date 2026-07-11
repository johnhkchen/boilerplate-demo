# T-006-01-01 — author-assembly-playbook — Research

Descriptive map of everything the ticket touches. No solutions proposed here.

## Ticket in one line

Author `docs/knowledge/assembly-playbook.md`: compose the existing knowledge
docs into the one ordered Day-1 play — intake, prove, check, defer — so the
golden first one or two contexts follow a practiced sequence. Every check,
script, or seam it names must resolve to a real repo path (grep-verifiable);
the exit condition is the core moment exercised under the harness time budgets
plus deferral-to-signal conversion; a read-through fits one sitting
(under ~2,500 words).

## Scope boundary (from S-006-01 and E-006)

- Writable surface for this ticket: `docs/knowledge/assembly-playbook.md`
  (new) plus these work artifacts. **No `src/**` changes, no new scripts or
  tooling.**
- The sample sponsor packet under `test/fixtures/sponsor-packet/` is the
  sibling ticket T-006-01-02, which waits on this ticket so the fixture can
  mirror the playbook's *declared intake list*. The intake step here therefore
  fixes the input-class vocabulary the fixture will implement — it must be
  concrete and enumerable, but this ticket ships no fixture.
- The live dry run is S-006-02 — named as future work, not performed here.
- Per N2 (charter): seams and sequence only, **no provider-specific recipes**.
- Per N4: checks target hangs/regressions; "is the demo convincing" stays
  human judgment.
- Template-leak guardrail: the playbook ships as template knowledge; this
  repo's demand history and planning artifacts stay out of generated projects.

## The seven source docs (E-006 names them explicitly)

| Doc | What the playbook draws from it |
|---|---|
| `docs/knowledge/charter.md` | P1/P2 framing, admission tests, guardrails (secrets, agents-run-checks-first), evidence-of-value list. |
| `docs/knowledge/product-spec.md` | Day-1 lifecycle steps 1–6; the intake input classes ("sponsor websites, current API documentation, GitHub examples, a Figma brief or screenshots, SDKs, and temporary API credentials"); the Day-1 done list; testing philosophy. |
| `docs/knowledge/vend-workflow.md` | The pull board contract; signals as one-liners; `vend chain` pulls ONE signal; lisa builds `phase: ready` tickets; `lisa init` then `vend init` on new projects. |
| `docs/knowledge/rdspi-workflow.md` | What a ticket becomes once work is substantial enough — the loop the playbook deliberately *defers to*, not starts. |
| `docs/knowledge/deployment.md` | One-time bootstrap (wrangler auth, `npm run deploy`, secrets, D1 migration, gh secrets), promote/rollback, hostname/verification commands. |
| `docs/knowledge/integration-check.md` | The one-command preflight gate, its 45 s budget, fault-proof modes, exit semantics, evidence-for-agents block. |
| `docs/knowledge/backstage-retrieval-seam.md` | The stakeholder feedback loop: submit route, feed endpoint, `npm run backstage:feed`, passcode gate, local dev setup. |

(`demo-environments-decisions.md`, `session-*.md`, `sandbox-*.md`,
`session-image.md`, `vision.md` exist but are outside the story's named set.)

## Grep-verifiable inventory (what the playbook may name)

### npm scripts (package.json)

`dev`, `build`, `preview`, `test`, `typecheck`, `verify`,
`integration:check`, `ops:check`, `leak:check`, `backstage:feed`,
`test:flow`, `test:flow:stalled`, `test:flow:backstage`,
`deploy`, `deploy:dry`, `promote`, `rollback` — all real. Session-related
scripts (`session:*`) exist but belong to E-004 surfaces, not Day 1.

### Scripts and checks

- `scripts/integration-check.ts` — combined gate: build + owned server on
  `127.0.0.1:4324` + operation probe + Playwright flow + leak assertion;
  overall budget **45 s** (`INTEGRATION_CHECK_TIMEOUT_MS` override); report at
  `test-results/integration-report.json`; exit 0/1/2.
- `scripts/ops-check.ts` — receipt operation probe; retargetable via
  `OPS_CHECK_URL=https://demo.b28.dev/api/receipt npm run ops:check`.
- `scripts/leak-check.ts` — bundle/response secret-disclosure assertion.
- `scripts/backstage-feed.ts` — repo-local CLI for the feed seam; reads
  `DEMO_PASSCODE` (env or `.dev.vars`), `DEMO_BASE_URL`; exit 0/1/2.
- `scripts/promote.ts` / `scripts/rollback.ts` — versioned release pointer.

### Harness time budgets (the AC's "harness time budgets")

- Integration check: 45 s overall default (doc + `src/lib/integration-check.ts`).
- Playwright: `tests/support/flow-contract.ts` `FLOW_BUDGET_MS` —
  assertion 8 s, action 10 s, receiptStep 5 s, actionStep 5 s, test 20 s,
  serverStartup 30 s, run 40 s. `playwright.config.ts` wires these in.
- Operation runner: `src/lib/operation-runner.ts` enforces per-operation
  time budgets (positive finite ms), used by the receipt probe.

### Fault modes (prove failure states before real credentials arrive)

`DEMO_FAULT=broken|stalled|leak npm run integration:check` — the fake slow
integration proving success/failure/stall behavior. Parsed fail-safe in
`src/lib/fault.ts`. `leak` mode never runs on shared/preview/production.

### The exemplar vertical slice ("receipt")

`src/pages/index.astro` (labeled primary action; template slots `DEMO_NAME`,
`PRIMARY_ACTION_LABEL`) → `src/pages/api/receipt.ts` → `src/lib/receipt.ts`,
run under `src/lib/operation-runner.ts`. The Playwright contract pins the
accessible name in `tests/support/flow-contract.ts` (`PRIMARY_ACTION_NAME`) —
a generated demo that renames the action must update that const in the same
change. `tests/demo-flow.spec.ts` (healthy + stalled projects) and
`tests/backstage-flow.spec.ts` are the flows.

### Backstage seam (stakeholder loop)

- Write: `POST /api/backstage/entries` (`src/pages/api/backstage/entries.ts`),
  page `src/pages/backstage.astro`.
- Read: `GET /api/backstage/feed` (`src/pages/api/backstage/feed.ts`) with
  header `x-demo-passcode`; CLI `npm run backstage:feed`.
- Local setup: copy `.dev.vars.example` → `.dev.vars`, set `DEMO_PASSCODE`
  (and `DEMO_SIGNING_KEY`); D1 binding `BACKSTAGE_DB`, migration under
  `migrations/`.

### Deployment path (deployment.md, all commands verified against package.json)

Bootstrap: `npx wrangler whoami` → `npm run deploy` → `npx wrangler secret put
DEMO_SIGNING_KEY` / `DEMO_PASSCODE` → `npx wrangler d1 migrations apply
BACKSTAGE_DB --remote` → `gh secret set CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID`. Routine release: push `main` (CI runs `npm run
verify` then `npm run promote`); manual verify via `curl` + `OPS_CHECK_URL`
ops check. `npm run verify` = test + typecheck + integration:check +
test:flow:backstage + deploy:dry.

### The demand board (deferral target)

`docs/active/demand.md` — thin one-line signals ("what + why it might
matter"), pulled one at a time by `vend chain "<signal>"`. In a generated
project this board is created fresh by `vend init` (after `lisa init`),
per product-spec Prepare and vend-workflow complementarity. The current
template board's signal #1 is this very playbook.

## Intake vocabulary the fixture ticket will mirror

Product-spec names the input classes twice:

- Inputs: "sponsor websites, current API documentation, GitHub examples, a
  Figma brief or screenshots, SDKs, and temporary API credentials."
- Intake outcome: "identify the demo moment, stakeholders, references,
  providers, personas, unknowns, and acceptance evidence."

T-006-01-02 must supply "one artifact per input class the playbook's intake
step names, with leak-check clean over the fixture" — so whatever list the
intake step declares becomes a contract. Temporary credentials are an input
class but can never be a *committed* fixture artifact as a real value
(guardrail: secrets never enter repositories); the harness precedent is the
fake slow integration and disposable keys (`integration-check.md`
prerequisites: no `.dev.vars` needed, disposable signing key generated).

## Word-count and readability constraints

- AC: read-through fits one sitting, **under ~2,500 words**. The seven source
  docs total ~5,700 words — composition must be by reference, not inlining.
- Existing knowledge docs are plain markdown, H1 title, imperative section
  headings, fenced `sh` blocks for commands, tables for reference matter.
- E-006 "Done looks like": readable in one sitting by the template author's
  target user (technically strong hackathon attendee).

## Assumptions and open constraints

- The playbook is written against *this* repo's paths (grep-verifiable here);
  generated projects inherit the same layout via the template.
- Day-1 "done" list (product-spec): public responsive URL, convincing core
  path, no exposed keys, stakeholder feedback link, automated smoke path,
  explicit timeout/failure behavior, analytics readiness.
- The playbook must place itself: product-spec names the assembly playbook a
  Prepare-phase deliverable used on Day 1; Day-2 productization and handoff
  are separate future playbooks (demand signals #2/#3) — name, don't absorb.
- Exit condition wording matters to the AC: "the core moment exercised under
  the harness time budgets plus deferral-to-signal conversion, not 'code
  written'."
