# Review — T-009-01-02 wire-standard-into-authoring-read-path

## Outcome

The implementation is complete. The copy voice and length standard now rides the existing RDSPI
authoring seam with no new machinery:

- `CLAUDE.md` links the workflow and canonical copy standard and requires the standard before
  user-facing copy is authored or changed;
- `AGENTS.md` exposes the same links and timing to Codex while retaining `CLAUDE.md` as the single
  project-context source of truth;
- the automatically injected `docs/knowledge/rdspi-workflow.md` links the canonical standard,
  carries its compact four-rule envelope, and requires copy-changing Research artifacts to cite
  the standard and map affected surfaces.

All references resolve to `docs/knowledge/copy-voice-standard.md`. The standard's detailed rules
remain canonical and unchanged. No runtime source, application test, dependency, Lisa state, or
ticket frontmatter was included in a ticket commit.

## Authoring path after the change

```text
Codex                       Claude
  │                            │
  ▼                            ▼
AGENTS.md ──read first──▶ CLAUDE.md
  │                            │
  ├──────────────┬─────────────┘
  │              ▼
  │    docs/knowledge/rdspi-workflow.md
  │      (automatically injected by Lisa)
  │              │
  │              ├─ compact four-rule envelope
  │              ├─ pre-authoring read/apply rule
  │              ├─ Research citation/surface-map rule
  │              ▼
  └──▶ docs/knowledge/copy-voice-standard.md
         (canonical detailed contract)
```

The workflow provides enough immediate context to recognize the contract. The linked standard
continues to own classifications, exact ceilings, counting, adjacency, exceptions, and the full
author-and-review procedure.

## Files modified

### `docs/knowledge/rdspi-workflow.md`

Added a fifteen-line `### Authoring knowledge` section before Research.

It includes:

1. plain kitchen-table English;
2. brevity within the applicable length envelope;
3. names as wayfinding;
4. action labels beginning with a specific verb.

It tells authors to read/apply the standard before adding or changing user-facing copy. It also
requires Research to cite the standard and map every affected user-facing copy surface before
Design.

### `CLAUDE.md`

Replaced the plain workflow path sentence with:

- a Markdown link to the RDSPI workflow;
- the preserved truthful statement that Lisa injects the workflow automatically;
- a Markdown link to the copy standard;
- the conditional pre-authoring instruction.

### `AGENTS.md`

Made the same knowledge-pointer update for the Codex entry path. The instruction to read
`CLAUDE.md` first is unchanged.

## Files created

RDSPI artifacts:

- `docs/active/work/T-009-01-02/research.md` — 269 lines;
- `docs/active/work/T-009-01-02/design.md` — 327 lines;
- `docs/active/work/T-009-01-02/structure.md` — 370 lines;
- `docs/active/work/T-009-01-02/plan.md` — 363 lines;
- `docs/active/work/T-009-01-02/progress.md` — 279 lines;
- `docs/active/work/T-009-01-02/review.md` — this handoff.

## Files deleted

None.

## Acceptance criterion assessment

### Standard referenced from `rdspi-workflow.md`

**Pass.** The workflow contains:

`[copy voice and length standard](copy-voice-standard.md)`

The link is correctly sibling-relative within `docs/knowledge/`.

### Standard referenced from the `CLAUDE.md` knowledge pointer

**Pass.** The root context links:

`docs/knowledge/copy-voice-standard.md`

It states when the standard must be used and preserves the workflow's automatic-injection claim.

### Standard referenced from the `AGENTS.md` knowledge pointer

**Pass.** The Codex entry point contains the same canonical repository-relative link and
pre-authoring obligation.

### References resolve to the canonical file

**Pass.** A committed-state Node check extracted the standard Markdown link from each of the
three source files, resolved it relative to that source, and verified a regular file exists.

Observed results:

| Source | Resolved destination |
| --- | --- |
| `CLAUDE.md` | `docs/knowledge/copy-voice-standard.md` |
| `AGENTS.md` | `docs/knowledge/copy-voice-standard.md` |
| `docs/knowledge/rdspi-workflow.md` | `docs/knowledge/copy-voice-standard.md` |

### Fresh RDSPI session has the envelope at authoring time

**Pass for the repository-controlled wiring.** The document already known to be automatically
injected now directly contains all four envelope concepts and the instruction to read/apply the
canonical detail before adding or changing copy. This avoids claiming that Lisa separately
concatenates the entire standard when repository evidence establishes automatic injection only
for the workflow.

### `S-009-02` sweep Research artifacts cite the standard

**Pending downstream evidence by design.** `T-009-02-01` and `T-009-02-02` depend on this ticket
and have not run within this session. Their independently spawned Research artifacts are the
acceptance criterion's named end-to-end evidence. The workflow now explicitly requires those
artifacts to cite the standard and map their affected copy surfaces.

Creating those future artifacts here would defeat the fresh-session proof and violate ticket
ownership. Lisa will release the dependent tickets after detecting this Review artifact.

## Design assessment

### Strengths

- Uses the existing injection seam instead of adding a loader or configuration surface.
- Provides the minimum useful envelope directly in injected context.
- Keeps exact ceilings and interpretive rules in one canonical document.
- Makes timing explicit rather than offering a passive “further reading” link.
- Serves both documented agent clients.
- Adds an early, durable consumption signal in Research.
- Limits evidence requirements to tickets that actually change user-facing copy.
- Uses source-relative Markdown links that work for humans and agents.

### Accepted tradeoffs

- The four conceptual rules now appear both in the canonical standard and as a compact workflow
  summary. This small duplication is intentional routing context; numeric or procedural policy is
  not duplicated.
- Documentation can bind the expected workflow but cannot technically force every external agent
  implementation to follow a link.
- The final fresh-session integration proof necessarily occurs in downstream work.
- Both root files repeat a short knowledge block for client visibility even though `CLAUDE.md`
  remains canonical.

## Implementation deviation reviewed

Structure and Plan described a level-two `Authoring knowledge` heading based on an incorrect
assumption that the workflow title was level one. Implementation baseline inspection found the
actual hierarchy:

- `## RDSPI Workflow`;
- `### Research` through `### Review`.

The implementation correctly used `### Authoring knowledge`. This preserves hierarchy and still
places the section immediately before Research. The deviation is documented in `progress.md` and
does not change the selected design.

## Verification performed

### File and link checks

- Canonical standard `test -f` — passed.
- Exact workflow/standard path search in both root files — passed.
- Workflow sibling-link extraction and existence check — passed.
- Node resolution of all three standard links — passed.

### Content-contract checks

The injected workflow was searched for:

- `kitchen-table` — found;
- `length envelope` — found;
- `wayfinding` — found;
- `specific verb` — found;
- `cite the standard` — found;
- `affected user-facing copy surface` — found.

The pre-authoring trigger appears in the workflow and both root context files.

### Hierarchy check

The heading inventory confirms:

- Authoring knowledge precedes Research;
- Research, Design, Structure, Plan, Implement, and Review remain in order;
- Phase Rules, Ticket Format, and Concurrency remain present;
- no existing workflow heading was removed or renamed.

### Git hygiene checks

- pre-stage implementation `git diff --check` — passed;
- implementation `git diff --cached --check` — passed;
- implementation staged name-status — exactly three intended files;
- implementation `git show --check` — passed;
- full ticket-range `git diff --check` — passed;
- ticket-range standard diff — empty;
- ticket-range ticket-frontmatter diff — empty.

### Ticket-range inventory before Review

Six commits precede this handoff:

- `d2372e0` — Research;
- `884fa30` — Design;
- `7df8a65` — Structure;
- `ca3c0e7` — Plan;
- `125c184` — three-file authoring-path implementation;
- `6a27041` — Implement progress and evidence.

The pre-Review range contains eight paths: five work artifacts, three modified authoring-path
files. Review adds only this sixth artifact.

## Test coverage

### Covered

- canonical destination existence;
- source-relative Markdown resolution from every required source;
- injected four-rule envelope presence;
- authoring trigger/timing presence;
- Research citation and surface-inventory requirement;
- workflow heading integrity;
- exact implementation scope;
- whitespace integrity;
- preservation of the standard and ticket frontmatter.

### Not run

No build, typecheck, unit test, Playwright suite, browser flow, leak check, integration harness,
deployment check, projector pass, or phone pass was run.

This gap is intentional and proportionate:

- only Markdown agent-context files changed;
- no application module imports these files;
- runtime tests cannot exercise external Lisa prompt assembly;
- no user-facing runtime copy changed;
- downstream rewrite and verification tickets own browser, flow, leak, projector, and phone
  evidence.

The direct documentation-contract checks exercise the actual change more closely than the
runtime suite would.

## Scope and safety assessment

### In scope and completed

- exact canonical standard references in all three named authoring-path files;
- compact envelope in automatically injected context;
- pre-authoring read/apply rule;
- copy-changing Research citation and surface-map rule;
- all six RDSPI artifacts;
- incremental ticket-scoped commits.

### Correctly left out

- changes to the copy standard's substantive rules;
- backstage or index copy rewrites;
- automated copy linting or fleet-wide enforcement;
- context loader or Lisa implementation work;
- packages, CI, build, deployment, auth, storage, or runtime changes;
- downstream ticket artifacts;
- ticket phase/status changes.

### Security impact

No runtime trust boundary, public copy, secret handling, authentication, storage, or deployment
behavior changed. The new instruction applies the existing standard, whose own scope and safety
rules remain unchanged.

## Open concerns

### 1. Downstream fresh-session proof is still outstanding

The wiring is statically complete, but the explicit end-to-end evidence arrives only when
`T-009-02-01` and `T-009-02-02` independently produce Research artifacts citing the standard.
This is the intended dependency sequence and the only acceptance item not observable yet.

### 2. External injection behavior is documented, not repository-tested

The repository does not contain Lisa's prompt-assembly implementation or a fresh-session harness.
The solution relies on the established, documented automatic injection of
`rdspi-workflow.md`. The compact envelope is inside that document specifically so the new path
does not require an unproven second injection mechanism.

### 3. Compact summary must track top-level contract changes

If the standard's four-rule contract changes later, the workflow envelope should be updated in
the same change. Detailed tables and procedures remain single-source, limiting this maintenance
risk.

## Critical issues requiring human attention

None.

The only pending item is the intentionally downstream fresh-session evidence. No blocker,
security regression, hidden runtime gap, or scope conflict was found in this ticket's changes.

## Worktree note

At final review, the worktree still contains automation-owned modifications to:

- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-009-01-01.md`;
- `docs/active/tickets/T-009-01-02.md`.

They predated implementation, were never staged or reverted, and are not part of this ticket's
commits. Lisa remains responsible for all phase and status transitions.

## Handoff

The authoring read-path is ready for the `S-009-02` sweep. A reviewer can validate the entire
product change by reading the three short context diffs, then confirm consumption when the two
dependent Research artifacts cite `docs/knowledge/copy-voice-standard.md` and inventory their
page copy. No manual ticket transition is required.
