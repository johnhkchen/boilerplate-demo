# Structure — T-009-01-01 author-voice-length-standard-doc

File-level blueprint for the chosen copy contract. This phase defines the shape and
interfaces of the change, not the final prose.

## Change inventory

### Create

- `docs/knowledge/copy-voice-standard.md`
  - The sole product deliverable.
  - A durable, repository-local authoring contract.
  - Written for both human authors and RDSPI sessions.
  - Contains the binding rules, counting convention, ceiling matrix, review procedure,
    examples, and scope boundary.

### Create as workflow artifacts

- `docs/active/work/T-009-01-01/research.md`
- `docs/active/work/T-009-01-01/design.md`
- `docs/active/work/T-009-01-01/structure.md`
- `docs/active/work/T-009-01-01/plan.md`
- `docs/active/work/T-009-01-01/progress.md`
- `docs/active/work/T-009-01-01/review.md`

### Modify

- None outside this ticket's work directory.

### Delete

- None.

## Explicitly unchanged files

- `docs/active/tickets/T-009-01-01.md`
  - Lisa owns phase and status transitions.
  - The existing `ready` to `research` worktree change is not part of agent commits.
- `AGENTS.md`
  - The knowledge pointer is owned by dependent ticket `T-009-01-02`.
- `CLAUDE.md`
  - The knowledge pointer is owned by dependent ticket `T-009-01-02`.
- `docs/knowledge/rdspi-workflow.md`
  - Workflow injection wiring is owned by `T-009-01-02`.
- `src/pages/index.astro`
  - Copy correction is owned by `T-009-02-02`.
- `src/pages/backstage.astro`
  - Copy correction is owned by `T-009-02-01`.
- `src/styles/base.css` and `src/styles/tokens.css`
  - The b28-clay visual system is read-only context.
- `tests/**`
  - There is no runtime behavior change in this ticket.

## Deliverable role

`copy-voice-standard.md` becomes the canonical contract for user-facing copy. Earlier
epics and work artifacts remain provenance, but downstream work should cite the knowledge
document rather than reconstruct rules from E-005.

The document has two interface layers:

1. a deterministic layer that can be checked by counting and classification;
2. a judgment layer that is checked through outsider reading and device context.

The deterministic layer is binding but not sufficient. The judgment layer is binding as a
review action but does not promise a machine-verifiable outcome.

## Stable section outline

The document will use these top-level headings in this order.

### `# Copy voice and length standard`

- Canonical document name.
- One-paragraph statement of purpose.
- Uses normative “must,” “may,” and “drift” vocabulary.
- Names “parlor, not portfolio” as the inherited source, not a new invention.

### `## The contract in four rules`

- A fast entry point for authoring sessions.
- One compact subsection or numbered item for each rule:
  - plain kitchen-table English;
  - brief by element;
  - names as wayfinding;
  - verb-forward labels.
- Makes clear that all four apply together.

### `## What this standard covers`

- Defines user-facing copy across markup, accessible names, metadata, and dynamic state.
- Defines exclusions for code comments, logs, machine fields, user content, URLs, and opaque
  values.
- States that an internal string becomes in-scope when rendered to a visitor.
- Names public demo and backstage as the initial surfaces without limiting future use.

### `## Count the rendered string`

- Provides the deterministic counting algorithm.
- Defines words, characters, sentences, interpolation, and whitespace.
- Establishes “both caps apply.”
- Establishes tighter-class handling for ambiguous elements.
- Gives one compact counting example.

### `## Length envelope`

- Contains the one authoritative ceiling table.
- Columns:
  - element;
  - maximum words;
  - maximum characters;
  - required shape.
- Rows follow visual/task hierarchy rather than repository component names.
- Downstream tickets can cite a row by its exact element label.
- No duplicate limits appear elsewhere; examples refer back to the table.

### `## Plain kitchen-table English`

- Defines audience-first language.
- Gives preferred concrete vocabulary.
- Names representative insider vocabulary that normally fails on visitor surfaces.
- Allows necessary technical language only when the visitor needs it to act.
- Removes throat-clearing, implementation narration, and project history.
- Distinguishes an audience test from a hard banned-word list.

### `## Names are wayfinding`

- Defines the display name as primary landmark.
- Binds consistency across `h1`, browser title, and destination references.
- Keeps names as nouns rather than descriptive sentences.
- Directs long official names to a short interface display form.
- Prevents generic headings from replacing the actual place name.

### `## Labels lead with the action`

- Applies to buttons, action links, and task-orienting eyebrows or headings.
- Requires a specific, truthful opening verb.
- Names exceptions: product/place names, field/data labels, stable status names, and noun
  landmarks.
- Connects label truth to real control response.
- Gives specific replacements for generic Submit/Continue/Learn more labels.

### `## Keep one explanation per task`

- Prevents fragmentation around per-element ceilings.
- Allows one heading, one explanatory paragraph or safety note, and one necessary field hint
  before a task.
- Prohibits repeated instruction, reassurance, or implementation detail in adjacent elements.
- Gives safety meaning precedence over optional explanation.
- Makes the known backstage lecture fail both individual and adjacency rules.

### `## Author and review pass`

- A short ordered checklist usable before a commit.
- Identify the visitor and action.
- Inventory rendered strings.
- Classify and count.
- Test name consistency and action labels.
- Remove duplication and insider narration.
- Perform one-glance orientation and one-breath supporting-copy reads.
- Record any permitted exception.
- Separates objective pass/fail from subjective cold-read evidence.

### `## Examples`

- Uses a compact table or paired blocks.
- Includes at least:
  - a wayfinding name versus descriptive-sentence `h1`;
  - a specific action versus generic Submit;
  - plain visitor language versus implementation narration;
  - a concise secret warning versus the existing passcode lecture;
  - a compact dynamic error with next step.
- Counts the backstage drift example so acceptance is directly auditable.
- Examples illustrate the rules; they do not prescribe the later ticket's final rewrite.

### `## Exceptions and enforcement boundary`

- Limits exceptions to externally fixed legal, safety, or provider language.
- Requires local documentation of the source and shortest usable version.
- States that current copy and preference are not exceptions.
- States that the repo has no automated copy gate in this ticket.
- Preserves charter N4: counts catch drift but do not prove convincingness.
- Assigns phone/projector cold reading to human review.

## Public vocabulary

The standard introduces a small normative vocabulary:

- **must** — required for conformance;
- **may** — permitted but not required;
- **drift** — a string or cluster that violates any binding rule;
- **surface element** — one rendered text-bearing UI or metadata unit;
- **task area** — adjacent elements supporting one visitor action;
- **display name** — the short product/place name used as a landmark;
- **orientation layer** — name, heading/eyebrow, primary action, and current status;
- **supporting copy** — lede, body, hint, note, or description that explains an action.

These terms are defined in prose where first used rather than in a separate glossary, keeping
the document short.

## Ceiling table interface

The authoritative rows and values are:

| Row key | Words | Characters | Shape |
| --- | ---: | ---: | --- |
| Display name / `h1` landmark | 5 | 40 | Name, not sentence |
| Page or section heading | 8 | 60 | One thought; no paragraph punctuation |
| Eyebrow / overline / chip | 4 | 28 | Fragment; action-oriented when task label |
| Tagline | 8 | 60 | Fragment, not descriptive sentence |
| Button or action link | 6 | 36 | Specific opening verb |
| Field, option, or data label | 5 | 32 | Familiar noun or short question |
| Help text / option hint | 12 | 80 | One sentence |
| Lede / body / section paragraph | 20 | 120 | One sentence |
| Safety note | 20 | 120 | Rule and safe next step, one sentence |
| Status / validation / error / empty state | 14 | 100 | State or next step, one sentence |
| Success / confirmation | 12 | 80 | One sentence |
| Browser title | 10 | 70 | Name first |
| Metadata description | 20 | 150 | One visitor-focused sentence |
| Alt or accessible description | 20 | 140 | Purpose, not decoration |

The implementation must copy these values once into the deliverable and verify them against
this blueprint. Any changed value is a plan deviation and must be recorded before editing.

## Downstream citation points

`T-009-01-02` can link the whole document and specifically instruct sessions to apply:

- `#the-contract-in-four-rules`;
- `#length-envelope`;
- `#author-and-review-pass`.

`T-009-02-01` can cite:

- `#length-envelope` for every backstage string class;
- `#keep-one-explanation-per-task` for the passcode cluster;
- `#examples` for the named regression.

`T-009-02-02` can cite:

- `#names-are-wayfinding` for `DEMO_NAME`;
- `#labels-lead-with-the-action` for taglines and controls;
- `#length-envelope` for ledes, metadata, and status strings.

`T-009-02-03` can cite:

- `#author-and-review-pass` for device evidence;
- `#exceptions-and-enforcement-boundary` for the limits of automated proof.

## Validation boundary

Because the deliverable is Markdown, verification is repository-level rather than runtime-level:

- file exists at the exact acceptance path;
- Markdown headings and table render structurally;
- every required voice idea has normative language;
- every surface class has explicit word and character maxima;
- backstage calibration counts exceed the matching caps;
- examples do not silently rewrite application code;
- no workflow/read-path file changed;
- ticket frontmatter remains untouched by agent commits;
- `git diff --check` reports no whitespace errors.

No build, typecheck, or browser flow is needed to validate a prose-only deliverable. A targeted
content audit is the proportionate test.

## Ordering constraints

1. Create the complete standard at its final path.
2. Audit the matrix against the Design and this Structure artifact.
3. Count the backstage calibration strings and record the comparison.
4. Check required phrases and section anchors.
5. Record implementation and verification in `progress.md`.
6. Commit the knowledge document and progress artifact as one meaningful unit.
7. Review the final diff and write `review.md`.

The final path must settle before `T-009-01-02` begins. No temporary document or redirect is
needed.

## Structure outcome

The implementation adds one canonical contract with a stable, linkable outline and one source of
truth for ceilings. It leaves runtime surfaces and authoring-path wiring untouched, yet exposes
the exact interfaces those dependent tickets need: element classes, limits, review steps, and
named anchors.
