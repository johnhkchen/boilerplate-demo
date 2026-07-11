# Structure — T-009-01-02 wire-standard-into-authoring-read-path

## Structural objective

Define the exact documentation changes that connect the canonical copy contract to the existing
RDSPI context seam. This blueprint identifies file ownership, section placement, link form,
content boundaries, ordering, and verification surfaces. It does not contain the final prose.

## Change inventory

### Product-context files modified

1. `docs/knowledge/rdspi-workflow.md`
2. `CLAUDE.md`
3. `AGENTS.md`

### Canonical knowledge file read but not modified

4. `docs/knowledge/copy-voice-standard.md`

### Ticket work artifacts created

5. `docs/active/work/T-009-01-02/research.md`
6. `docs/active/work/T-009-01-02/design.md`
7. `docs/active/work/T-009-01-02/structure.md`
8. `docs/active/work/T-009-01-02/plan.md`
9. `docs/active/work/T-009-01-02/progress.md`
10. `docs/active/work/T-009-01-02/review.md`

### Files deleted

None.

### Files explicitly untouched

- `docs/active/tickets/T-009-01-02.md`.
- `docs/active/tickets/T-009-01-01.md`.
- `.lisa/provenance.jsonl` and all `.lisa/` state.
- `docs/knowledge/copy-voice-standard.md`.
- `src/**`.
- `tests/**`.
- package, build, CI, and deployment configuration.
- downstream ticket and story content.

## Document architecture after the change

```text
Codex entry                           Claude entry
AGENTS.md                             CLAUDE.md
  ├─ delegates to CLAUDE.md             ├─ project context
  ├─ links RDSPI workflow               ├─ links RDSPI workflow
  └─ links copy standard                └─ links copy standard
                │                                  │
                └──────────────┬───────────────────┘
                               ▼
              docs/knowledge/rdspi-workflow.md
                ├─ injected automatically by Lisa
                ├─ carries compact four-rule envelope
                ├─ requires pre-authoring standard read
                ├─ requires Research citation/surface map
                └─ links canonical detailed contract
                               │
                               ▼
          docs/knowledge/copy-voice-standard.md
                ├─ scope and classifications
                ├─ word/character ceilings
                ├─ counting and adjacency rules
                ├─ exceptions
                └─ author/reviewer procedure
```

The workflow remains the injected hub. The standard remains the policy leaf. The root files
remain client-facing entry points rather than alternate policy stores.

## File 1 — `docs/knowledge/rdspi-workflow.md`

### Existing responsibility

- Define the six RDSPI phases.
- Define artifacts and transition rules.
- Explain ticket schema and concurrency.
- Serve as the knowledge document Lisa injects automatically.

### New responsibility

- Expose the copy standard before phase work begins.
- State when a session must read and apply it.
- Carry the standard's compact four-rule envelope.
- Establish copy-related Research evidence.

### Section placement

Add a new second-level section immediately after the top-level title and before `## Research`.

Planned outline:

```markdown
# RDSPI Workflow

## Authoring knowledge

...authoring obligation and canonical link...

...four-rule envelope...

...canonical-detail boundary and Research evidence...

## Research
```

This placement makes the rule a workflow-wide prerequisite. It does not renumber or nest the six
phases, so existing phase semantics remain unchanged.

### Public documentation interface

The new section must expose these concepts:

- Trigger: a ticket adds or changes user-facing copy.
- Timing: before authoring that copy.
- Action: read and apply the canonical standard.
- Canonical path: `copy-voice-standard.md` linked relative to the workflow file.
- Envelope: plain kitchen-table English.
- Envelope: elements stay inside the appropriate brevity/length ceiling.
- Envelope: names serve as wayfinding.
- Envelope: action labels begin with a specific verb.
- Detailed-policy boundary: the canonical standard owns classification, counts, adjacency,
  exceptions, and review.
- Evidence: Research cites the standard and maps affected copy surfaces.

### Link interface

From `docs/knowledge/rdspi-workflow.md`, the standard is a sibling document. The Markdown target
must therefore be:

```text
copy-voice-standard.md
```

The rendered link resolves to:

```text
docs/knowledge/copy-voice-standard.md
```

The visible link label should name the copy voice and length standard, not expose only a raw path.

### Content boundary

The workflow section must not repeat:

- the fourteen-row envelope table;
- individual numeric maximums;
- counting definitions;
- the full insider-term list;
- examples or backstage calibration;
- exception detail;
- the ten-step review pass.

Those are implementation details of the canonical contract. The workflow carries only the
stable routing envelope.

## File 2 — `CLAUDE.md`

### Existing responsibility

- Be the single project-context source of truth.
- Define project and directory conventions.
- Define ticket agent routing.
- Point to the automatically injected RDSPI workflow.

### Modified knowledge-pointer block

Retain the existing final location after the agent-routing section. Replace the one-document
plain-text pointer with a compact block that:

- links `docs/knowledge/rdspi-workflow.md` using a root-relative repository path;
- preserves the truthful claim that Lisa injects the workflow automatically;
- links `docs/knowledge/copy-voice-standard.md` using a root-relative repository path;
- instructs sessions that add or change user-facing copy to read/apply the standard before
  authoring.

### Link targets

From repository root `CLAUDE.md`, use:

```text
docs/knowledge/rdspi-workflow.md
docs/knowledge/copy-voice-standard.md
```

Both links resolve directly without `../` traversal.

### Content boundary

`CLAUDE.md` does not duplicate the four-rule list. The workflow already carries the injected
envelope. The root file communicates discovery, timing, and the canonical target.

## File 3 — `AGENTS.md`

### Existing responsibility

- Be the Codex-facing repository instruction entry point.
- Declare `CLAUDE.md` as the single source of truth.
- Require reading `CLAUDE.md` first.
- Repeat the existing RDSPI knowledge pointer.

### Modified knowledge-pointer block

Keep the delegation paragraph unchanged. Replace or extend the second paragraph so it:

- links the RDSPI workflow;
- preserves the automatic-injection statement;
- links the copy voice standard;
- requires reading/applying the standard before authoring changed user-facing copy.

### Link targets

`AGENTS.md` is also at repository root, so it uses the same two targets as `CLAUDE.md`:

```text
docs/knowledge/rdspi-workflow.md
docs/knowledge/copy-voice-standard.md
```

### Duplication boundary

The root block is deliberately repeated for client parity and explicit acceptance coverage. It
must remain short and must not grow into a second `CLAUDE.md`. `AGENTS.md` continues to delegate
all broader project context.

## Canonical file — `docs/knowledge/copy-voice-standard.md`

### Responsibility retained

This file remains the sole binding source for:

- covered copy;
- classification;
- rendered-string counting;
- numeric word and character ceilings;
- plain-language detail;
- name handling;
- verb-forward controls;
- task-area adjacency;
- author/reviewer pass;
- examples;
- exceptions and enforcement boundary.

### Stability contract consumed by wiring

The wiring relies only on:

- the exact path;
- the document title/concept;
- the stable four-rule opening envelope.

No anchor link is required, so heading renames inside the standard will not break resolution.

## Research artifact contract for future copy tickets

When the workflow trigger applies, a ticket's `research.md` must contain two observable elements:

1. a citation/reference to `docs/knowledge/copy-voice-standard.md`;
2. a map or inventory of affected user-facing copy surfaces.

This requirement remains descriptive. Research records existing strings and classifications; it
does not propose final copy. Design and Implement remain responsible for decisions and edits.

The `S-009-02` sweep tickets are the first expected consumers. Their artifacts are not created or
modified here.

## Change ordering

The implementation sequence is structurally constrained as follows.

1. Verify the canonical file exists at the settled path.
2. Add the early Authoring knowledge section to the injected workflow.
3. Update `CLAUDE.md` to expose both knowledge documents and the timing obligation.
4. Update `AGENTS.md` with the matching client bridge.
5. Run pointer, envelope, evidence-language, scope, and whitespace checks.
6. Record results and any deviation in `progress.md`.
7. Review the committed diff and create `review.md`.

The three product-context file edits form one meaningful implementation unit because partial
wiring would fail explicit acceptance coverage or client parity.

## Verification architecture

### Exact-path presence

The canonical path string must appear in:

- `CLAUDE.md`;
- `AGENTS.md`;
- `docs/knowledge/rdspi-workflow.md` through its sibling link target and resolved path check.

Because the workflow uses a sibling-relative target, verification must resolve it from the
workflow directory rather than requiring the root-prefixed string in its Markdown source.

### Link resolution

Expected source-to-target mappings:

| Source | Markdown target | Resolved file |
| --- | --- | --- |
| `CLAUDE.md` | `docs/knowledge/copy-voice-standard.md` | canonical standard |
| `AGENTS.md` | `docs/knowledge/copy-voice-standard.md` | canonical standard |
| `docs/knowledge/rdspi-workflow.md` | `copy-voice-standard.md` | canonical standard |

Each resolved target must pass a file-existence check.

### Envelope presence

Search the new workflow section for semantic terms covering:

- kitchen-table English;
- length envelope or ceilings;
- names and wayfinding;
- labels and a specific verb.

The check is a guard against accidental omission, not an automated voice-quality judgment.

### Timing and evidence presence

Search or inspect for:

- “before authoring” or equivalent timing;
- adding/changing user-facing copy as the trigger;
- Research citation/reference requirement;
- affected copy-surface mapping.

### Scope integrity

Implementation staging must include only:

- `CLAUDE.md`;
- `AGENTS.md`;
- `docs/knowledge/rdspi-workflow.md`.

Artifact commits may separately include this ticket's work directory. All Lisa and ticket
frontmatter changes remain unstaged.

### Repository hygiene

- `git diff --check` before staging.
- `git diff --cached --check` after explicit staging.
- `git show --check` after the implementation commit.
- final name-status inventory from the ticket's commit range.

No application build, unit test, Playwright run, or deployment check belongs to this
documentation-only structure because none consumes the authoring context.

## Failure boundaries

- Missing file: pointer resolution fails immediately.
- Wrong relative target: one client or workflow link fails even if raw text looks plausible.
- Path-only wording: file resolves but authoring-time behavior remains ambiguous.
- Full-policy duplication: future standard updates can drift.
- Root-only wiring: injected sessions may not receive the envelope.
- Workflow-only wiring: explicit acceptance and client discoverability remain incomplete.
- Unconditional copy ceremony: unrelated tickets incur unnecessary context cost.
- Premature downstream artifacts: fresh-session evidence becomes fabricated rather than
  independent.

## Structural conclusion

The final shape is a three-file routing layer around one unchanged canonical contract. The
injected workflow owns timing, compact envelope, and Research evidence. The root instruction
files own client discovery. The standard owns all substantive conformance rules. This division
keeps the read-path explicit and testable without introducing code or duplicate policy.
