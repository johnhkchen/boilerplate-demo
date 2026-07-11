# Progress — T-009-01-02 wire-standard-into-authoring-read-path

## Implement status

Implementation is complete. Research, Design, Structure, and Plan were written and committed in
order before product-context editing. The canonical standard exists, all three authoring-path
files now route to it, and the implementation unit is committed. Review remains.

## Baseline

- `docs/knowledge/copy-voice-standard.md` exists.
- `docs/knowledge/rdspi-workflow.md` is the existing automatically injected workflow document.
- `CLAUDE.md` contains the canonical project-context knowledge pointer.
- `AGENTS.md` contains the Codex bridge and repeats the knowledge pointer.
- None of the three files references the copy standard at implementation start.
- `.lisa/provenance.jsonl` is modified by automation and remains out of scope.
- `docs/active/tickets/T-009-01-01.md` is modified by Lisa and remains out of scope.
- `docs/active/tickets/T-009-01-02.md` is modified by Lisa and remains out of scope.
- No ticket frontmatter will be staged or edited by this work.

## Planned implementation checklist

- [x] Confirm the canonical standard exists.
- [x] Inspect the exact workflow and root-pointer blocks.
- [x] Confirm no concurrent standard wiring exists.
- [x] Add the compact envelope and Research evidence rule to the injected workflow.
- [x] Link the canonical standard from `CLAUDE.md`.
- [x] Link the canonical standard from `AGENTS.md`.
- [x] Validate every link target.
- [x] Validate envelope, timing, evidence, and phase hierarchy.
- [x] Audit the implementation diff and staged scope.
- [x] Commit the three-file product-context unit.
- [x] Record validation results and implementation commit.
- [ ] Complete Review.

## Scope

Product-context files:

- `docs/knowledge/rdspi-workflow.md`;
- `CLAUDE.md`;
- `AGENTS.md`.

Ticket artifact:

- `docs/active/work/T-009-01-02/progress.md`.

No runtime, test, package, standard-content, Lisa-state, or ticket-frontmatter file is in scope.

## Deviations

### Workflow heading level

Structure and Plan described the workflow title as a level-one heading and its phase headings as
level two. Baseline inspection showed the actual hierarchy is:

- `## RDSPI Workflow`;
- `### Research` through `### Review`;
- later top-level repository sections at `##`.

Implementation will therefore add `### Authoring knowledge`, not `## Authoring knowledge`. It
will appear after the workflow introduction and before `### Research`. This preserves the
document's existing hierarchy and fulfills the intended early placement. No semantic design
decision changes.

## Implementation completed

### Injected workflow

Added `### Authoring knowledge` to `docs/knowledge/rdspi-workflow.md` between the workflow
introduction and `### Research`.

The section now:

- triggers before a ticket adds or changes user-facing copy;
- links `copy-voice-standard.md` as a sibling knowledge document;
- says to read and apply the standard before authoring;
- carries the four-rule envelope directly in the injected context;
- preserves the standard as canonical for detailed interpretation;
- requires Research to cite the standard;
- requires Research to map affected user-facing copy surfaces before Design.

The compact envelope states:

1. use plain kitchen-table English;
2. keep elements brief and within the applicable length envelope;
3. use names as wayfinding;
4. begin action labels with a specific verb.

The workflow does not duplicate numeric ceilings, element rows, counting rules, examples, or
exception details.

### Claude entry point

Updated the final knowledge block in `CLAUDE.md`.

- The workflow is now a Markdown link to `docs/knowledge/rdspi-workflow.md`.
- The existing automatic-injection statement is preserved and capitalizes Lisa consistently.
- The standard is linked at `docs/knowledge/copy-voice-standard.md`.
- The pre-authoring condition matches the workflow trigger.
- No copy-policy detail is duplicated in the root file.

### Codex entry point

Updated the knowledge block in `AGENTS.md` to match the canonical root context.

- The delegation to `CLAUDE.md` remains unchanged and first.
- The workflow is a Markdown link.
- The automatic-injection statement remains accurate.
- The standard is linked at the exact canonical repository path.
- The same conditional pre-authoring obligation is visible to Codex.
- `AGENTS.md` remains a concise bridge rather than an alternate source of project context.

## Verification completed

### Canonical file existence

`test -f docs/knowledge/copy-voice-standard.md` passed.

This proves the dependency's settled deliverable exists at the ticket's required destination.

### Root pointer inventory

An exact search for both knowledge paths in `CLAUDE.md` and `AGENTS.md` passed.

Observed mappings:

| Source | Workflow target | Standard target |
| --- | --- | --- |
| `CLAUDE.md` | `docs/knowledge/rdspi-workflow.md` | `docs/knowledge/copy-voice-standard.md` |
| `AGENTS.md` | `docs/knowledge/rdspi-workflow.md` | `docs/knowledge/copy-voice-standard.md` |

Both standard targets are valid from repository root.

### Workflow pointer resolution

The workflow contains `[copy voice and length standard](copy-voice-standard.md)`.

A shell check extracted that Markdown destination and tested it relative to
`docs/knowledge/`. It resolved to `docs/knowledge/copy-voice-standard.md` and passed the regular
file check.

### Injected-envelope inventory

An exact concept search found all required terms in the new workflow section:

- `kitchen-table`;
- `length envelope`;
- `wayfinding`;
- `specific verb`.

Because `rdspi-workflow.md` is the automatically injected document, the compact envelope is
available without relying on a second independently injected file.

### Timing and evidence inventory

All three authoring-path files contain the conditional “Before adding or changing user-facing
copy” instruction.

The workflow additionally contains:

- `cite the standard in Research`;
- `map every affected user-facing copy surface`;
- `before Design`.

This gives downstream ticket artifacts an observable proof point at the earliest phase.

### Workflow hierarchy

The final heading inventory is:

1. `## RDSPI Workflow`;
2. `### Authoring knowledge`;
3. `### Research`;
4. `### Design`;
5. `### Structure`;
6. `### Plan`;
7. `### Implement`;
8. `### Review`;
9. `## Phase Rules`;
10. `## Ticket Format`;
11. the ticket-format example headings;
12. `## Concurrency`.

No existing phase or later repository section was removed or renamed. The phase order is intact.

### Whitespace and scope

`git diff --check -- CLAUDE.md AGENTS.md docs/knowledge/rdspi-workflow.md` passed before staging.

After explicit staging:

- `git diff --cached --check` passed;
- `git diff --cached --name-status` contained exactly `AGENTS.md`, `CLAUDE.md`, and
  `docs/knowledge/rdspi-workflow.md`;
- no `.lisa/`, ticket, standard-content, runtime, or test file was staged.

### Implementation commit

Committed the three-file unit as:

`125c184 docs(T-009-01-02): wire copy standard into authoring`

The commit reports:

- three files changed;
- 21 insertions;
- two deletions.

`git show --check --stat --oneline HEAD` passed without whitespace errors.

## Testing boundary

No application build, unit test, Playwright suite, integration harness, browser run, leak check,
deployment check, or device pass was run.

This is proportionate because:

- only Markdown authoring context changed;
- application code does not import the changed files;
- runtime tests cannot exercise Lisa's externally managed context assembly;
- the standard itself was not changed;
- the downstream copy tickets own surface and flow testing;
- the downstream Research artifacts are the acceptance criterion's named fresh-session proof.

Static path, content-contract, hierarchy, whitespace, and scope checks directly exercise the
behavior introduced by this ticket.

## Scope audit

### Changed as planned

- `CLAUDE.md`;
- `AGENTS.md`;
- `docs/knowledge/rdspi-workflow.md`;
- this ticket's `progress.md` artifact.

### Preserved unchanged

- `docs/knowledge/copy-voice-standard.md`;
- `src/**`;
- `tests/**`;
- dependencies and tool configuration;
- downstream ticket/story files;
- ticket phase and status fields.

### Existing unrelated worktree state

After the implementation commit, `git status --short` still shows only the pre-existing
automation-owned modifications plus this uncommitted progress artifact:

- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-009-01-01.md`;
- `docs/active/tickets/T-009-01-02.md`;
- `docs/active/work/T-009-01-02/progress.md`.

The first three were not staged, edited, or reverted by this work. The progress artifact will be
committed separately.

## Acceptance tracking

- [x] The standard is referenced from `rdspi-workflow.md`.
- [x] The standard is referenced from the `CLAUDE.md` knowledge pointer.
- [x] The standard is referenced from the `AGENTS.md` knowledge pointer.
- [x] Each reference resolves to `docs/knowledge/copy-voice-standard.md`.
- [x] The automatically injected workflow carries the four-rule authoring envelope.
- [x] Copy-changing sessions are told to read/apply the complete standard before authoring.
- [x] Copy-changing Research artifacts are told to cite the standard and map surfaces.
- [ ] The downstream `S-009-02` sweep Research artifacts cite the standard.

The last checkbox cannot be completed inside this ticket without fabricating future independent
session output. The wiring and workflow instruction required to produce that evidence are now in
place; Lisa's dependency graph owns release of those tickets.

## Remaining work

Commit this completed progress record, audit the full ticket range, and write `review.md`.
Independent fresh-session citations remain owned by the downstream `S-009-02` sweep tickets after
Lisa releases them.
