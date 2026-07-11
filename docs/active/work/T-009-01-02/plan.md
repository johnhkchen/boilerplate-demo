# Plan — T-009-01-02 wire-standard-into-authoring-read-path

## Execution goal

Implement the three-file documentation routing layer defined in Structure, verify that every
reference resolves to the canonical copy standard, prove that the injected workflow contains the
minimum authoring envelope and Research evidence rule, preserve all existing RDSPI semantics,
and hand off the future fresh-session evidence honestly.

## Preconditions

Before implementation:

- `CLAUDE.md` has been read as the repository source of truth.
- `AGENTS.md` has been read as the Codex entry point.
- `docs/knowledge/rdspi-workflow.md` has been read in full.
- `docs/active/tickets/T-009-01-02.md` has been read.
- `docs/knowledge/copy-voice-standard.md` exists and has been read.
- the dependency `T-009-01-01` is complete.
- Research, Design, and Structure artifacts for this ticket are committed.
- unrelated Lisa/ticket worktree changes are known and will remain unstaged.
- the ticket still forbids manual phase/status changes.

## Step 1 — establish the implementation baseline

### Actions

1. Run `git status --short`.
2. Record the unrelated modified files.
3. Confirm the canonical standard exists with `test -f`.
4. Inspect the first workflow lines and the final knowledge-pointer blocks in both root files.
5. Search for any standard reference that may have appeared concurrently.

### Verification

- The file exists at `docs/knowledge/copy-voice-standard.md`.
- `CLAUDE.md`, `AGENTS.md`, and `rdspi-workflow.md` do not already contain equivalent complete
  wiring.
- No overlapping user edit exists in the exact blocks to be changed.
- `.lisa/provenance.jsonl` and ticket frontmatter changes remain identifiable as unrelated.

### Atomicity

Read-only; no commit.

## Step 2 — add Authoring knowledge to the injected workflow

### Actions

1. Insert `## Authoring knowledge` after `# RDSPI Workflow`.
2. State the trigger: a ticket adds or changes user-facing copy.
3. State the timing: read and apply the standard before authoring that copy.
4. Link to sibling target `copy-voice-standard.md`.
5. Add the compact four-rule envelope:
   - plain kitchen-table English;
   - brief elements within the applicable length envelope;
   - names as wayfinding;
   - action labels beginning with a specific verb.
6. State that the full standard owns classifications, word/character ceilings, counting,
   adjacency, exceptions, and review.
7. Require the ticket Research artifact to cite the standard and map affected copy surfaces.
8. Leave the six existing phase sections and all later rules unchanged.

### Verification

- The new section precedes `## Research`.
- All four envelope concepts appear exactly once in the new section.
- The canonical link is relative to `docs/knowledge/`.
- The source does not reproduce numeric ceilings.
- The Research section's descriptive/non-prescriptive boundary remains intact.
- Existing phase heading order remains Research, Design, Structure, Plan, Implement, Review.

### Atomicity

Hold with Steps 3 and 4 for one product-context commit. The authoring path is incomplete until
all three acceptance-named files are aligned.

## Step 3 — update the canonical `CLAUDE.md` knowledge pointer

### Actions

1. Keep project, directory, and routing sections unchanged.
2. Convert the workflow path mention to a Markdown link.
3. Preserve the statement that Lisa automatically injects the workflow.
4. Add a Markdown link to `docs/knowledge/copy-voice-standard.md`.
5. Add the conditional pre-authoring instruction for user-facing copy.
6. Keep the block compact; do not duplicate the four rules or detailed contract.

### Verification

- Both knowledge paths appear in `CLAUDE.md`.
- Both targets are repository-root-relative and exist.
- Wording does not claim Lisa independently injects the entire standard file.
- The copy obligation is conditional on adding or changing user-facing copy.
- `CLAUDE.md` remains the project source of truth.

### Atomicity

Hold with Steps 2 and 4 for the product-context commit.

## Step 4 — update the Codex `AGENTS.md` knowledge pointer

### Actions

1. Keep the delegation to `CLAUDE.md` unchanged.
2. Convert the workflow path mention to a Markdown link.
3. Preserve the automatic workflow-injection statement.
4. Add the same canonical standard link.
5. Add the same conditional pre-authoring obligation.
6. Keep the file a concise bridge rather than duplicating project context.

### Verification

- Both knowledge paths appear in `AGENTS.md`.
- Both targets exist from repository root.
- The first-read delegation to `CLAUDE.md` still appears before the knowledge block.
- The instruction is semantically aligned with `CLAUDE.md`.
- No separate Codex-only policy is introduced.

### Atomicity

Hold with Steps 2 and 3 for the product-context commit.

## Step 5 — run static authoring-path checks

### Check 5.1 — file existence

Run direct `test -f` checks for:

- `docs/knowledge/rdspi-workflow.md`;
- `docs/knowledge/copy-voice-standard.md`;
- `CLAUDE.md`;
- `AGENTS.md`.

Pass condition: every command returns zero.

### Check 5.2 — root pointer presence

Search `CLAUDE.md` and `AGENTS.md` for:

- `docs/knowledge/rdspi-workflow.md`;
- `docs/knowledge/copy-voice-standard.md`.

Pass condition: both paths occur in both files in Markdown link destinations.

### Check 5.3 — workflow pointer resolution

Search the workflow for `copy-voice-standard.md`, then resolve it relative to
`docs/knowledge/`.

Pass condition: the resulting path is the canonical standard and exists as a regular file.

### Check 5.4 — injected envelope

Inspect/search the new workflow section for:

- `kitchen-table`;
- `length envelope`;
- `wayfinding`;
- `specific verb`.

Pass condition: all concepts are present in the automatically injected document.

### Check 5.5 — authoring timing

Inspect/search all three changed files for the conditional obligation to read/apply the standard
before adding or changing user-facing copy.

Pass condition: client entry points and the workflow agree on trigger and timing.

### Check 5.6 — Research evidence

Inspect/search the workflow for Research, cite/reference, and affected copy surfaces.

Pass condition: future copy tickets have an explicit observable evidence requirement before
Design.

### Check 5.7 — phase integrity

List second-level headings in `rdspi-workflow.md`.

Pass condition:

- `Authoring knowledge` appears first;
- all six phase headings remain in original order;
- Phase Rules, Ticket Format, and Concurrency remain present;
- no existing heading is removed or renamed.

## Step 6 — inspect and commit the product-context diff

### Actions

1. Run `git diff --check` restricted to the three product-context files.
2. Inspect their complete diff.
3. Confirm the implementation matches Decisions D1–D7.
4. Stage exactly:
   - `CLAUDE.md`;
   - `AGENTS.md`;
   - `docs/knowledge/rdspi-workflow.md`.
5. Run `git diff --cached --check`.
6. Inspect `git diff --cached --name-status`.
7. Commit with a ticket-scoped message.
8. Run `git show --check --stat --oneline HEAD`.

### Verification

- Exactly three files are staged for the implementation unit.
- No ticket, Lisa, standard, runtime, or test file is staged.
- Diff has no whitespace errors.
- The commit succeeds.
- Post-commit check succeeds.

### Atomicity

One implementation commit. The three files jointly form one routing change and are independently
incomplete if split.

## Step 7 — write and update `progress.md`

### Initial content

Create the Implement artifact after Plan and before or alongside product edits. Record:

- preconditions and baseline;
- ordered step checklist;
- exact files in scope;
- unrelated dirty files preserved;
- planned checks;
- deviations, initially none.

### Completion update

After the implementation commit, record:

- exact prose/interface changes;
- validation commands and outcomes;
- implementation commit identifier;
- scope audit;
- remaining work limited to Review;
- any deviation with rationale.

### Verification

- `progress.md` distinguishes completed work from remaining work.
- It does not claim future `S-009-02` artifacts already exist.
- It records that Lisa owns phase/status transitions.
- It is committed as a meaningful RDSPI implementation record.

## Step 8 — review the final ticket range

### Actions

1. Identify the parent commit before this ticket's Research commit.
2. List commits for this ticket.
3. Inspect `git diff --name-status <base>..HEAD`.
4. Inspect `git diff --stat <base>..HEAD`.
5. Re-run exact pointer and envelope checks against committed files.
6. Run final `git status --short`.
7. Confirm only known Lisa/ticket automation changes remain dirty.
8. Assess acceptance criterion line by line.

### Verification

- All six expected RDSPI artifacts exist by the end of Review.
- The three authoring-path files are the only non-artifact deliverables changed by the ticket.
- Canonical standard content is unchanged.
- Ticket frontmatter is not included in any ticket commit.
- No critical issue is hidden.

## Step 9 — write `review.md`

The Review artifact must include:

- outcome summary;
- files created, modified, and deleted;
- exact authoring path after the change;
- acceptance-criterion assessment;
- validation and test coverage;
- explanation of why runtime tests were not run;
- scope and security assessment;
- open concerns and known limitations;
- explicit future evidence dependency on the `S-009-02` Research artifacts;
- commit inventory and worktree note.

Review must not:

- edit the ticket phase or status;
- rewrite downstream tickets;
- claim a fresh downstream session has already cited the standard;
- turn the future evidence dependency into new machinery;
- propose runtime copy rewrites inside this ticket.

## Testing strategy

### Documentation contract tests

These are the primary tests because the behavior under change is a documentation/context
contract.

| Behavior | Test | Expected result |
| --- | --- | --- |
| canonical target exists | `test -f` | pass |
| Claude path discovers standard | exact link search | one valid target |
| Codex path discovers standard | exact link search | one valid target |
| injected workflow discovers standard | sibling link resolution | canonical file |
| envelope is immediately available | four-concept search | all present |
| timing is binding | prose inspection/search | before-authoring rule present |
| Research consumption is observable | prose inspection/search | citation + surface map present |
| phase workflow preserved | heading inventory | original order intact |
| no formatting damage | Git whitespace checks | pass |
| scope remains narrow | staged/range name-status | expected files only |

### Runtime tests

Do not run application unit, build, Playwright, integration, leak, deployment, or browser tests
unless the diff unexpectedly touches their inputs.

Rationale:

- the implementation changes only Markdown agent context;
- application code does not import these files;
- runtime tests cannot exercise Lisa's external prompt assembly;
- downstream independently spawned ticket Research is the named integration evidence;
- running unrelated suites would add time without increasing confidence in pointer wiring.

### Manual review

Read the resulting instruction chain in two orders:

1. Claude: `CLAUDE.md` → RDSPI workflow → standard.
2. Codex: `AGENTS.md` → `CLAUDE.md` → RDSPI workflow → standard.

For each order, confirm an agent can answer before Research:

- When must I read the standard?
- What is its four-rule envelope?
- Where are detailed limits and exceptions?
- What evidence belongs in Research?

## Rollback shape

The implementation is a single documentation commit touching three files. If the wiring wording
is rejected, a follow-up can revise that commit's three prose blocks without data migration,
runtime rollback, deployment, or dependency changes. The standard remains intact throughout.

## Expected deviations

None. If concurrent automation modifies one of the three target blocks, stop staging that file,
re-read the merged state, and document the adjustment before proceeding. Do not overwrite or
revert unrelated changes.

## Completion criteria

Implementation is complete when:

- all three named authoring-path files link the standard correctly;
- the injected workflow carries the compact four-rule envelope;
- authoring timing and copy-related Research evidence are explicit;
- detailed rules remain canonical and unduplicated;
- static validation passes;
- the implementation and progress are committed incrementally;
- `review.md` truthfully records coverage and the downstream fresh-session evidence boundary;
- ticket phase and status remain untouched by the agent.
