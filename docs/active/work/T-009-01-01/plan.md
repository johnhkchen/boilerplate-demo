# Plan — T-009-01-01 author-voice-length-standard-doc

Ordered implementation and verification steps for the doc-only deliverable. Each step is
small enough to inspect independently; commits remain meaningful rather than splitting one
knowledge document into unusable fragments.

## Preconditions

- Read `AGENTS.md`, `CLAUDE.md`, the ticket, and `docs/knowledge/rdspi-workflow.md`.
- Confirm the ticket frontmatter starts at `phase: research`.
- Confirm `docs/knowledge/copy-voice-standard.md` does not already exist.
- Confirm the only pre-existing worktree change is Lisa's ticket phase transition.
- Complete and commit Research, Design, and Structure artifacts before implementation.
- Do not stage the ticket frontmatter change.

## Step 1 — create the standard shell

Create `docs/knowledge/copy-voice-standard.md` with the stable heading outline from
`structure.md`:

1. title and binding purpose;
2. four-rule summary;
3. scope;
4. counting method;
5. length envelope;
6. plain language;
7. names as wayfinding;
8. verb-forward labels;
9. one explanation per task;
10. author/review pass;
11. examples;
12. exceptions and enforcement boundary.

### Verification

- `test -f docs/knowledge/copy-voice-standard.md` succeeds.
- `rg '^#{1,2} ' docs/knowledge/copy-voice-standard.md` shows the planned order.
- Heading text produces the downstream anchors named in `structure.md`.
- No link or pointer is added to `AGENTS.md`, `CLAUDE.md`, or the workflow.

## Step 2 — write normative purpose and scope

State that the document distills the existing “parlor, not portfolio” voice. Define the
conformance vocabulary:

- “must” for required rules;
- “may” for permitted variation;
- “drift” for any failed rule.

List all in-scope rendered surfaces, including accessible names, metadata, and dynamic UI
states. List exclusions and state the rendering seam rule: an internal string becomes in scope
when shown to a visitor.

### Verification

- Search for each required source idea:
  - `kitchen-table`;
  - `wayfinding`;
  - `verb`;
  - `brief` or the length envelope.
- Confirm public demo and backstage are examples, not hardcoded limits on scope.
- Confirm code comments and user-provided values are explicitly excluded.

## Step 3 — write the counting method

Specify how an author computes the deterministic result:

1. inspect the final rendered string;
2. trim formatting whitespace;
3. count whitespace-separated words;
4. count characters including punctuation and internal spaces;
5. apply both caps;
6. resolve ambiguous types to the tighter class;
7. count authored interpolation at the expected rendered value;
8. exclude opaque identifiers and user content but not their labels.

Include sentence counting and a minimal example.

### Verification

- A second reader can reproduce word and character counts without hidden conventions.
- “Both caps” is normative rather than advisory.
- Hyphenated terms, whitespace, interpolation, and dynamic content are addressed.

## Step 4 — add the authoritative ceiling matrix

Add exactly one table containing all 14 surface classes and the Design values:

1. display name / `h1` landmark — 5 words, 40 characters;
2. page or section heading — 8, 60;
3. eyebrow / overline / chip — 4, 28;
4. tagline — 8, 60;
5. button or action link — 6, 36;
6. field, option, or data label — 5, 32;
7. help text / option hint — 12, 80;
8. lede / body / section paragraph — 20, 120;
9. safety note — 20, 120;
10. status / validation / error / empty state — 14, 100;
11. success / confirmation — 12, 80;
12. browser title — 10, 70;
13. metadata description — 20, 150;
14. alt or accessible description — 20, 140.

Add the required shape to every row. Do not restate numeric caps elsewhere as competing
sources of truth.

### Verification

- Manually compare every row and value with `design.md` and `structure.md`.
- Count the table's body rows; expect 14.
- Confirm both word and character columns use “Maximum,” not suggestions.
- Confirm paragraphs and safety notes allow one sentence only.

## Step 5 — encode the house voice

Write the plain-language, wayfinding, and action-label sections.

Plain language must:

- identify visitor task as the point of view;
- prefer concrete ordinary words;
- identify representative insider terms;
- allow necessary technical language only when it enables action;
- remove throat-clearing and implementation history.

Wayfinding must:

- keep the short display name in the primary landmark;
- keep name usage consistent across page heading, browser title, and destination references;
- prevent descriptive-sentence names and generic replacement headings;
- give long official names a short interface display form.

Action labels must:

- start controls and task labels with a specific, truthful verb;
- name noun-based exceptions;
- reject generic verbs when a result can be named;
- bind pressable wording to an observable response.

### Verification

- Each rule uses a clear `must`, `may`, or exception.
- `DEMO_NAME`-style names can conform without becoming artificial verbs.
- Field/data labels can remain familiar noun phrases.
- The rule would reject “Submit” where “Add to the list” is available.

## Step 6 — add the adjacency rule

Define a task area and its allowed explanatory structure:

- one heading;
- one explanatory paragraph or safety note before the control;
- one field-specific hint only when needed.

Prohibit repeated instruction, reassurance, and implementation detail across neighbors. State
that necessary safety meaning replaces optional description rather than adding another paragraph.

### Verification

- Splitting one lecture across several under-cap strings still fails.
- The current backstage unlock/passcode/session cluster is named as the calibration case.
- The rule does not forbid multiple independent fields from having their own necessary hints.

## Step 7 — add the author and reviewer pass

Create a short ordered procedure:

1. name the visitor and action;
2. inventory strings, including hidden/dynamic states and metadata;
3. classify each string;
4. count both units;
5. check display-name consistency;
6. check action verbs and actual behavior;
7. remove jargon, throat-clearing, and duplication;
8. run one-glance and one-breath reads;
9. test projector and phone where the surface changed;
10. document legitimate external exceptions.

### Verification

- The procedure is brief enough to run during an authoring session.
- It distinguishes deterministic count failures from human-reading concerns.
- It does not claim that a passing count proves the demo is convincing.

## Step 8 — add calibrated examples

Include paired examples for:

- display name versus descriptive sentence;
- result-specific action versus generic control label;
- visitor language versus implementation narration;
- short secret warning versus the existing backstage explanatory cluster;
- error state with a next step.

For the backstage calibration, record the measured current strings:

- intro lede: 25 words / 132 characters;
- safety note: 25 / 149;
- gate paragraph: 22 / 114.

Show that every string fails the 20-word paragraph/safety ceiling, with the first two also
failing the character ceiling. Also state that the repeated cluster fails adjacency.

Do not prescribe the exact final replacements owned by `T-009-02-01`; a short illustrative
warning is acceptable but must be labeled as an example.

### Verification

- Re-run counts using a small read-only Node snippet.
- Confirm punctuation and apostrophes match the source strings being counted.
- Confirm the examples demonstrate all four contract rules.

## Step 9 — state exceptions and enforcement boundary

Allow exceptions only for externally fixed legal, safety, or provider language. Require the
source and shortest usable form to be documented next to the copy. Reject “existing text” and
preference as exception grounds.

State explicitly:

- there is no automated voice/length gate in this ticket;
- word and character caps are automation-ready objective checks;
- audience fit, warmth, and convincingness need human review;
- phone/projector cold reads remain required when relevant.

### Verification

- The boundary cites charter N4 in plain terms.
- The document does not imply a CI check exists.
- Exceptions cannot be used to repeat a required warning.

## Step 10 — targeted content audit

Run repository-local, read-only checks:

- file existence;
- line count and Markdown heading inventory;
- required phrase searches;
- table-row/value review;
- backstage counts;
- `git diff --check`;
- `git diff -- docs/knowledge/copy-voice-standard.md`;
- `git status --short` to confirm no accidental files changed.

Check that the ticket's phase/status diff remains unstaged and untouched.

### Verification criteria

The deliverable passes only if:

- its path exactly matches the acceptance criterion;
- all four rules are normative and checkable;
- every defined class has word and character maxima;
- the old backstage cluster demonstrably fails;
- the authoring procedure preserves human judgment;
- no source, test, workflow-pointer, or ticket frontmatter file is included in the commit.

## Step 11 — record implementation progress

Create `progress.md` before committing the implementation unit. Record:

- each completed plan step;
- verification commands and results;
- files changed;
- remaining work;
- deviations, or explicitly “none.”

Commit the knowledge document and `progress.md` together as the meaningful implementation unit.

### Commit intent

Suggested message:

`docs(T-009-01-01): bind copy voice and length standard`

Do not include Lisa's ticket phase change.

## Step 12 — review

Inspect:

- the committed diff for the deliverable;
- all ticket commits;
- the final worktree;
- acceptance criterion coverage;
- test/verification evidence;
- open concerns and downstream ownership.

Create `review.md` with:

- summary of created, modified, and deleted files;
- acceptance criterion assessment;
- test coverage and gaps;
- scope compliance;
- open concerns and TODOs;
- human-review focus;
- downstream handoff pointers.

Commit `review.md` as the final Review artifact. Stop afterward; Lisa owns phase/status updates.

## Expected commit sequence

1. Research artifact.
2. Design artifact.
3. Structure artifact.
4. Plan artifact.
5. Knowledge standard plus progress artifact.
6. Review artifact.

This sequence keeps every completed phase recoverable while ensuring the implementation itself
lands as a coherent contract rather than a half-authored knowledge file.

## Plan outcome

Execution ends with one new canonical knowledge document and the full six-artifact RDSPI trail.
The deliverable is verified through deterministic content checks proportionate to a Markdown-only
change, and the review clearly leaves wiring and current-surface rewrites to their dependent
tickets.
