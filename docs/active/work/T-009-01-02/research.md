# Research — T-009-01-02 wire-standard-into-authoring-read-path

## Research scope

This artifact maps the repository context for putting the copy voice standard on the existing
RDSPI authoring read-path. It is descriptive: it records what exists, how the relevant files
connect, which boundaries the ticket names, and what evidence later work expects. It does not
choose an implementation.

## Ticket state and requested outcome

- Ticket: `docs/active/tickets/T-009-01-02.md`.
- Current phase at session start: `research`.
- Status at session start: `open`.
- Priority: high.
- Parent story: `S-009-01`.
- Dependency: `T-009-01-01`.
- The dependency is complete and has created the standard.
- The ticket asks for the standard to ride the same seam that already injects the RDSPI
  workflow.
- The ticket explicitly rejects new machinery.
- The ticket acceptance criterion names three places in the authoring path:
  `docs/knowledge/rdspi-workflow.md`, `CLAUDE.md`, and `AGENTS.md`.
- The reference must resolve to `docs/knowledge/copy-voice-standard.md`.
- Downstream Research artifacts for the `S-009-02` sweep are the eventual behavioral evidence
  that fresh authoring sessions receive and use the standard.
- Ticket phase and status are Lisa-owned and must not be edited by this work.

## Repository agent context chain

The repository has two root agent-instruction files.

### `CLAUDE.md`

- `CLAUDE.md` identifies the project as Demo Runway.
- It defines directory conventions for tickets, stories, and work artifacts.
- It documents agent routing for Lisa.
- Its final paragraph is the existing knowledge pointer.
- That paragraph names `docs/knowledge/rdspi-workflow.md`.
- It states that Lisa automatically injects that workflow into agent context.
- No other knowledge document is currently named in the paragraph.
- No code, command, or loader configuration appears in this file.
- The pointer is prose consumed by agent clients and Lisa's authoring convention.

### `AGENTS.md`

- `AGENTS.md` declares `CLAUDE.md` to be the single source of truth for every agent client.
- It tells Codex to read `CLAUDE.md` first.
- It independently repeats the RDSPI knowledge pointer.
- It independently states that Lisa injects the workflow automatically.
- The repeated pointer makes the knowledge seam visible even before following the delegation to
  `CLAUDE.md`.
- It does not contain the full workflow.
- It does not currently mention the copy standard.
- It does not define a separate Codex-only authoring process.

### Relationship between the root files

- Claude Code reads `CLAUDE.md` directly.
- Codex reads `AGENTS.md`, then follows its instruction to read `CLAUDE.md`.
- Both client paths converge on the same project context.
- The project treats `CLAUDE.md` as canonical even though `AGENTS.md` repeats the knowledge
  pointer for client discovery.
- A knowledge-path edit that names both clients therefore has a small, explicit duplication
  boundary.

## Existing injected knowledge document

`docs/knowledge/rdspi-workflow.md` defines the complete ticket workflow.

- It orders Research, Design, Structure, Plan, Implement, and Review.
- It requires every phase to run.
- It names the artifact path for each phase.
- It says all phases complete in one continuous pass.
- It says Lisa detects artifacts and performs phase transitions.
- It says agents must not manually change ticket phase or status.
- It documents the ticket frontmatter schema.
- It documents concurrency and Lisa's serialized commit behavior.
- It is itself the document named by the existing root knowledge pointers.
- Its current opening moves directly from the title into the six-phase definition.
- It currently contains no authoring prerequisite or copy-standard reference.
- It currently contains no general list of companion knowledge documents.

The workflow document is a natural context boundary because every ticket session is expected to
receive it before producing Research. Copy changes can begin during Research, Design, Plan, or
Implement, so a reference available before the first artifact covers the whole authoring pass.

## Copy voice standard supplied by the dependency

The dependency created `docs/knowledge/copy-voice-standard.md`.

- The file exists at the exact path named by this ticket.
- It is a Markdown knowledge document.
- It is 189 lines at research time.
- Its title is `Copy voice and length standard`.
- Its opening calls itself the binding authoring contract for user-facing Demo Runway copy.
- It distills the existing “parlor, not portfolio” voice.
- It says every rule is mandatory and calls failed rules drift.
- It provides a four-rule summary near the top.
- Those four rules require plain kitchen-table English, brief elements, names as wayfinding, and
  action-led labels.
- It defines covered and excluded content.
- It defines how words and characters are counted.
- It provides numeric word and character ceilings for fourteen surface classes.
- It defines plain-language expectations and contextual handling of technical terms.
- It defines display-name consistency.
- It requires action controls to use truthful, specific opening verbs.
- It prevents a long explanation from being split across adjacent short strings.
- It includes a ten-step author-and-review pass.
- It includes conforming and drifted examples.
- It calibrates the standard against the current backstage passcode copy.
- It allows only externally fixed legal, safety, or provider wording as an exception.
- It explicitly separates measurable checks from human judgment.
- It states that the repository does not yet have an automated copy gate.

The document's first four rules are the smallest complete summary of the standard's envelope.
The rest of the document provides classification, counting, exceptions, and review procedure
needed when copy is actually authored.

## Dependency artifacts and ownership

The `T-009-01-01` artifacts consistently reserve wiring for this ticket.

- Its Structure artifact assigns `CLAUDE.md`, `AGENTS.md`, and
  `docs/knowledge/rdspi-workflow.md` to `T-009-01-02`.
- Its Design artifact explicitly rejects wiring within the standard-authoring ticket.
- Its Progress artifact says no authoring-path file was modified.
- Its Review says the canonical document is complete but remains undiscoverable through the
  intended injected path until this ticket lands.
- Its Review asks this ticket to link the exact standard path.
- The dependency selected stable headings so downstream references can remain durable.
- No unresolved dependency work is required to author the pointer.

## Story and epic boundaries

`docs/active/stories/S-009-01.md` defines this story as a documentation-only slice.

- It includes the standard and the authoring read-path wiring.
- It excludes all `src/` surface changes.
- It says the standard must be referenced from the injected authoring path.
- It names the RDSPI document and the two root knowledge pointers.
- It says there must be no new injection machinery.
- It says the result is a portable in-repository contract, not a SaaS control plane.
- It excludes automated fleet-wide enforcement.

`docs/active/epic/E-009.md` supplies the larger reason for the work.

- Existing copy drifted after an earlier manual correction.
- The standard is meant to bind future authoring, not merely document past taste.
- The epic identifies the existing RDSPI injection seam as a prerequisite that already exists.
- The epic requires the standard to travel with the loop.
- The epic keeps human judgment at the final quality boundary.
- The epic excludes copy tooling, CMS work, auth changes, and clay-kit restyling.

## Downstream evidence path

`docs/active/stories/S-009-02.md` defines the first consumers of the wired standard.

- `T-009-02-01` will rewrite backstage copy.
- `T-009-02-02` will rewrite index copy.
- Both depend on `T-009-01-01` and `T-009-01-02`.
- Both are expected to begin only after the standard exists and is wired.
- Their Research artifacts are named by this ticket as evidence that the fresh sessions received
  the standard at authoring time.
- The two sweep tickets operate on disjoint runtime files.
- A later verification ticket owns combined cold-read, leak, projector, phone, and Playwright
  evidence.
- This ticket can make the reference available but cannot author future tickets' Research
  evidence.
- Lisa's dependency graph is the mechanism that orders those consumers after this wiring.

## Repository automation boundary

A search of repository-local Lisa files finds state, hooks, usage records, and provenance but no
checked-in context assembly implementation.

- `.lisa/` contains local workflow state and hook scripts.
- The context injection implementation is not part of this repository's product source.
- The ticket says not to introduce it here.
- The existing observable contract is therefore the documented knowledge pointer plus Lisa's
  behavior.
- There is no repository test helper that creates a synthetic fresh Lisa session.
- There is no current Markdown link checker dedicated to knowledge pointers.
- Pointer verification can still inspect the exact path and confirm that the referenced file
  exists.
- Later independently spawned sweep sessions provide the stronger end-to-end evidence.

## Relevant file boundaries

Files directly inside the ticket's stated authoring path:

- `CLAUDE.md` — canonical project agent context and Lisa knowledge pointer.
- `AGENTS.md` — Codex entry point, delegation, and repeated knowledge pointer.
- `docs/knowledge/rdspi-workflow.md` — injected workflow content.
- `docs/knowledge/copy-voice-standard.md` — canonical copy contract, read-only for this ticket.

Workflow artifacts owned by this ticket:

- `docs/active/work/T-009-01-02/research.md`.
- `docs/active/work/T-009-01-02/design.md`.
- `docs/active/work/T-009-01-02/structure.md`.
- `docs/active/work/T-009-01-02/plan.md`.
- `docs/active/work/T-009-01-02/progress.md`.
- `docs/active/work/T-009-01-02/review.md`.

Files explicitly outside the implementation boundary:

- `docs/active/tickets/T-009-01-02.md` phase and status fields.
- `docs/knowledge/copy-voice-standard.md` content, already owned by the dependency.
- `src/pages/index.astro` and `src/pages/backstage.astro`.
- Playwright tests and flow-contract support.
- Lisa's external context-injection machinery.
- CI, lint configuration, and package dependencies.

## Worktree and collaboration constraints

- At research time, `.lisa/provenance.jsonl` is modified by automation.
- `docs/active/tickets/T-009-01-01.md` is modified by Lisa phase/status handling.
- `docs/active/tickets/T-009-01-02.md` is also modified by Lisa.
- These changes predate this implementation and belong to the user/automation.
- They must remain unstaged and unmodified by this ticket's commits.
- The RDSPI workflow permits concurrent tickets and says Lisa serializes commits.
- Explicit path staging is required to avoid capturing unrelated automation state.

## Verification surfaces already available

The repository supports several proportionate read-only checks for this documentation change.

- `test -f docs/knowledge/copy-voice-standard.md` proves the destination exists.
- Exact-string search can prove all three authoring-path files name the canonical path.
- Markdown-link syntax can make pointer resolution reviewable without inference.
- A small path extraction check can test that each referenced repository-relative destination
  exists.
- `git diff --check` can detect whitespace errors.
- `git diff --name-only` can prove runtime and ticket files stayed out of scope.
- Reading the final root instructions in client order can confirm that both Claude and Codex
  discover the standard.
- No runtime build or browser flow exercises documentation context injection.
- Downstream Research citations remain the end-to-end authoring-time proof requested by the
  acceptance criterion.

## Assumptions and constraints surfaced by research

- The exact canonical path is stable because the dependency and ticket both name it.
- The standard should remain the single source of copy rules; pointers should not duplicate the
  fourteen-row table or detailed procedure.
- A path-only mention establishes discoverability but not necessarily the timing or obligation
  to read the document.
- The phrase “at authoring time” implies the pointer must be visible before copy is drafted.
- The phrase “standard's envelope available” implies the context should communicate the compact
  four-rule envelope even when the full linked document is read separately.
- `CLAUDE.md` is canonical, but acceptance explicitly includes the `AGENTS.md` pointer, so client
  parity is observable and in scope.
- The RDSPI file is injected automatically, while linked companion files may require an agent to
  follow an explicit read instruction.
- No external service or code change is needed for a repository-local document read.
- The future sweep sessions, rather than this session, are the only independent fresh-session
  consumers named as acceptance evidence.
- Documentation-only verification should not claim to prove future citations before those
  downstream tickets run.

## Research conclusion

The repository already contains both ends of the requested connection: a documented RDSPI
context seam and a complete canonical copy standard. The seam is represented in three prose
files, not by repository-owned injection code. The downstream dependency graph supplies the
future behavioral check. The implementation boundary is consequently narrow: authoring-path
documentation and this ticket's RDSPI artifacts, with runtime code, the standard's substantive
rules, Lisa state, and ticket frontmatter held outside scope.
