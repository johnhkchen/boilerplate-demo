# Design — T-009-01-02 wire-standard-into-authoring-read-path

## Design goal

Make the canonical copy standard discoverable and binding before an RDSPI session authors
user-facing copy. Use the repository's existing context seam, preserve one source of truth for
the detailed contract, serve both documented agent clients, and create no loader, service,
dependency, or runtime behavior.

## Decision drivers

The design is evaluated against the following repository facts from Research.

1. `docs/knowledge/rdspi-workflow.md` is already injected into every Lisa ticket context.
2. `CLAUDE.md` is the project's canonical agent context.
3. `AGENTS.md` is Codex's entry point and directs Codex to `CLAUDE.md`.
4. Both root files currently expose the RDSPI knowledge pointer.
5. Acceptance explicitly names the workflow and both root knowledge pointers.
6. The canonical standard already exists at `docs/knowledge/copy-voice-standard.md`.
7. The standard's opening four rules are its compact envelope.
8. The detailed table, counting method, exceptions, and review procedure must remain canonical
   in that document.
9. The story forbids new injection machinery.
10. Fresh downstream sessions must know about the standard before their Research artifacts are
    written.
11. Future `S-009-02` Research citations are the intended independent behavioral proof.
12. Ticket phase/status fields and automation state are outside agent ownership.

## Option A — path-only links in all three files

Add a Markdown link to `docs/knowledge/copy-voice-standard.md` beside the existing RDSPI pointer
in `CLAUDE.md`, `AGENTS.md`, and `docs/knowledge/rdspi-workflow.md`.

### Benefits

- Smallest textual diff.
- Exact path is visible in every acceptance-named file.
- Link destinations can be mechanically checked.
- Detailed rules remain entirely canonical.
- No risk of duplicated numeric limits drifting.

### Costs and risks

- A bare reference does not state when the document must be read.
- “Available” could degrade into a passive further-reading link.
- A session may begin Research without following the link.
- The standard's envelope would not itself be present in the injected workflow context.
- Downstream citations would depend on agent initiative rather than a binding authoring step.
- This is weaker than the epic's intent to bind new copy as it is written.

### Assessment

This option satisfies pointer resolution literally but under-serves authoring-time availability.
The ticket says “standard's envelope available,” not merely “standard file discoverable.”

## Option B — duplicate the full standard into the RDSPI workflow

Append the complete voice contract, including coverage, counting rules, fourteen-row length
matrix, examples, and exception policy, to `docs/knowledge/rdspi-workflow.md`. Retain links from
the root files.

### Benefits

- Every injected session receives every rule without another read.
- No agent can miss numeric ceilings because it failed to follow a link.
- The RDSPI file becomes a self-contained authoring package.

### Costs and risks

- Creates two sources of truth for the standard.
- Duplicates roughly 189 lines in a workflow document with a different purpose.
- Future ceiling or wording changes can drift between copies.
- Reviewers cannot know which copy is binding without another priority rule.
- It makes the RDSPI workflow harder to scan for phase rules.
- Root pointers would still need edits for explicit acceptance coverage.
- Duplication conflicts with the dependency's designation of one canonical contract.

### Assessment

This option maximizes immediate context but damages maintainability and document boundaries. It
is disproportionate to a reference-wiring ticket.

## Option C — imperative links only, no envelope summary

Add an instruction in all three files to read the copy standard before authoring or changing
user-facing copy, without restating its four-rule envelope.

### Benefits

- Stronger timing than a path-only link.
- Keeps all substantive rules in the canonical document.
- Small diff and clear operator action.
- Works for authoring that starts in any RDSPI phase.

### Costs and risks

- The injected workflow contains an obligation but not the ticket's named “envelope.”
- Context consumers that summarize or truncate linked content may retain only the path.
- Reviewers must open another file to see why the instruction matters.
- A later fresh-session proof remains necessary.

### Assessment

This is viable and clean, but it does not take advantage of the canonical document's deliberately
short four-rule entry point.

## Option D — compact envelope in the workflow plus imperative links everywhere

Add a short `Authoring knowledge` section near the beginning of the injected RDSPI workflow. It
will:

- link the exact canonical standard path;
- require reading and applying it whenever a ticket adds or changes user-facing copy;
- summarize the four-rule envelope without reproducing limits or procedures;
- direct authors to use the canonical document for classifications, ceilings, counting,
  adjacency, exceptions, and review;
- require the Research artifact to cite the standard and map affected copy surfaces.

Update `CLAUDE.md` and `AGENTS.md` knowledge-pointer prose to link both the workflow and the copy
standard and to state the same authoring-time obligation at a high level.

### Benefits

- The automatically injected workflow carries actionable minimum context.
- The exact reference is visible and mechanically resolvable in every named file.
- Timing is explicit: before user-facing copy is authored or changed.
- The four-rule summary is stable because it mirrors the standard's own top-level contract.
- Numeric ceilings and detailed interpretation remain single-source.
- Requiring a Research citation creates a durable, ticket-local trace of consumption.
- The downstream `S-009-02` tickets naturally produce the acceptance evidence requested.
- Claude and Codex entry points remain aligned.
- No new software mechanism is introduced.

### Costs and risks

- The four conceptual rules are repeated in one compact sentence or list.
- Both root entry files repeat a pointer because acceptance and client discovery require it.
- If the top-level four rules change, the workflow summary must also change.
- A documentation obligation cannot technically force an agent to follow it.
- The true end-to-end proof remains deferred until fresh downstream sessions run.

### Assessment

This option best balances immediate injected context with canonical detail. The repeated envelope
is a navigation summary, not an alternative standard: it contains no table values or exception
logic and points to the canonical file for every conformance decision.

## Option E — introduce or modify context-loader code

Find or create Lisa integration code that reads the standard file and concatenates it into every
prompt independently of the RDSPI document.

### Benefits

- Could provide programmatic guarantees about file inclusion.
- Could test loading behavior in isolation if the machinery lived here.
- Would not depend on agents following a link.

### Costs and risks

- The repository does not contain the relevant Lisa implementation.
- The ticket and story explicitly say “no new machinery.”
- New configuration or scripts would expand the maintenance and security boundary.
- It would solve a platform problem when an existing seam is already named as sufficient.
- It could diverge from Lisa's externally managed behavior.

### Assessment

Rejected as unavailable, out of scope, and contrary to the ticket.

## Selected design

Choose Option D: compact envelope in the injected workflow, with imperative canonical links in
the workflow and both root knowledge pointers.

This decision follows the acceptance language closely:

- “referenced from the injected authoring path” is met by exact Markdown references in all three
  named files;
- “reference resolves” is met by repository-relative links to the existing file;
- “fresh RDSPI session has the standard's envelope available” is met by placing the four-rule
  summary directly in the injected workflow;
- “at authoring time” is met by an instruction to read and apply the full standard before adding
  or changing user-facing copy;
- “evidenced by the S-009-02 sweep Research artifacts citing it” is enabled by an explicit
  Research-artifact citation requirement.

## Detailed content decisions

### D1 — add an early workflow section

Place `## Authoring knowledge` after the RDSPI title and before `## Research`.

Rationale:

- It is received before the phase instructions.
- It applies across all six phases rather than being mistaken for an Implement-only check.
- It keeps phase order intact.
- It does not bury a binding prerequisite under Phase Rules or Ticket Format.

### D2 — make the trigger conditional on copy scope

The instruction applies whenever a ticket adds or changes user-facing copy.

Rationale:

- Not every infrastructure or documentation ticket authors product copy.
- Requiring detailed copy inventory for unrelated work would create workplace tax.
- The standard itself defines what counts as user-facing, including dynamic and accessible text.
- A conditional trigger preserves the story's focus on authoring behavior.

### D3 — include the stable four-rule envelope

The workflow will state:

1. plain kitchen-table English;
2. brief elements within the length envelope;
3. names as wayfinding;
4. action labels led by specific verbs.

Rationale:

- These are the canonical document's own top-level four rules.
- They are short enough to remain visible in injected context.
- They explain the purpose of following the link.
- They do not copy numeric policy or complex exception handling.

### D4 — preserve detailed rules in one canonical file

The workflow must direct authors to the full standard for:

- scope/classification;
- word and character ceilings;
- counting method;
- adjacency rule;
- exceptions;
- author/review procedure.

Rationale:

- These details are likely to be revised together.
- A single canonical location prevents inconsistent enforcement.
- The pointer remains useful rather than decorative.

### D5 — make Research the evidence checkpoint

For copy-changing tickets, the workflow will require Research to cite the standard and identify
affected copy surfaces.

Rationale:

- Research occurs before solutions or copy drafts.
- The citation proves the session found the contract.
- Surface mapping supports later classification and testing.
- It exactly supports the downstream evidence named by this ticket.
- It does not ask Research to propose replacement copy.

### D6 — update both root pointers with links

Replace path-shaped plain text with Markdown links in `CLAUDE.md` and `AGENTS.md`, and mention the
copy standard beside the workflow.

Rationale:

- A clickable link is easier for humans and agents to resolve.
- Both agent clients see the same repository-relative destination.
- Acceptance explicitly names both pointers.
- `CLAUDE.md` remains the source of truth; `AGENTS.md` remains a concise client bridge.

### D7 — do not claim separate automatic injection of the full standard

The wording will say the RDSPI workflow is automatically injected and that copy-authoring
sessions must read the linked standard. It will not falsely state that Lisa independently
concatenates the full standard file.

Rationale:

- Repository evidence proves automatic injection only for the workflow.
- The workflow itself can carry the envelope and link.
- Precise wording keeps the verification claim honest.

## Verification design

### Static pointer checks

- Search all three named authoring-path files for the exact canonical path.
- Confirm each occurrence is a relative Markdown link.
- Extract or directly test the destination path with `test -f`.
- Confirm the workflow includes the four envelope concepts.
- Confirm it contains both the authoring-time read obligation and Research citation obligation.

### Scope checks

- Inspect the implementation diff.
- Confirm only `CLAUDE.md`, `AGENTS.md`, and `docs/knowledge/rdspi-workflow.md` change as product
  deliverables.
- Confirm no ticket frontmatter, standard content, runtime source, test, dependency, or Lisa state
  is staged.
- Run `git diff --check` and staged equivalent checks before commits.

### Behavioral evidence boundary

- This ticket can prove the pointer chain and injected envelope statically.
- It cannot pre-create independent Research citations for tickets that have not run.
- `T-009-02-01` and `T-009-02-02` will provide the named fresh-session evidence after Lisa sees
  this ticket's Review artifact and releases their dependency edges.
- Review must report that distinction as an open verification dependency, not as a failure of the
  wiring.

## Rejected additions

- No copy of the fourteen-row matrix in RDSPI.
- No edits to `copy-voice-standard.md`.
- No context-loader script.
- No package or CI change.
- No automated copy linter.
- No runtime copy rewrite.
- No modification of future tickets or their artifacts.
- No ticket phase/status edit.
- No claim that automated checks can judge whether copy is convincing.

## Design conclusion

The selected design makes the injected workflow carry the minimum viable authoring contract and
uses exact links for the complete contract. It strengthens the existing seam rather than adding
one, keeps client entry points aligned, creates an early evidence checkpoint, and remains honest
about the downstream fresh-session proof that only later Lisa-spawned sweep work can supply.
