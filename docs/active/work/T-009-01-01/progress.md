# Progress — T-009-01-01 author-voice-length-standard-doc

Implementation log for the plan in `plan.md`. The knowledge contract is complete and
verified; only the Review phase remains at the time of this entry.

## Current state

- Research: complete and committed.
- Design: complete and committed.
- Structure: complete and committed.
- Plan: complete and committed.
- Implement: complete in the worktree; this file records the implementation unit.
- Review: remaining.
- Ticket phase/status frontmatter: not edited or staged by the agent.

## Step 1 — create the standard shell

**Complete.** Created:

- `docs/knowledge/copy-voice-standard.md`

The document uses the planned stable outline:

1. Copy voice and length standard;
2. The contract in four rules;
3. What this standard covers;
4. Count the rendered string;
5. Length envelope;
6. Plain kitchen-table English;
7. Names are wayfinding;
8. Labels lead with the action;
9. Keep one explanation per task;
10. Author and review pass;
11. Examples;
12. Exceptions and enforcement boundary.

No authoring-path or runtime file was modified.

## Step 2 — write normative purpose and scope

**Complete.** The opening identifies the document as binding and defines drift as failure of
any rule. It explicitly distills the existing “parlor, not portfolio” voice rather than claiming
to invent a new brand.

Coverage includes:

- visible static strings;
- accessible names and descriptions;
- browser title and metadata;
- dynamic validation, loading, empty, success, and error states;
- client/server strings shown by the interface.

Exclusions include:

- code comments and operator-only logs;
- engineering docs and protocol names;
- URLs and opaque values;
- user-provided text.

The rendering-seam rule makes an internal string in-scope when shown or announced to a visitor.

## Step 3 — write the counting method

**Complete.** The contract defines:

- whitespace-separated word counting;
- hyphenated terms as one word;
- characters including punctuation, symbols, and internal spaces;
- formatting whitespace exclusion;
- interpolation at expected rendered value;
- user content and opaque identifier exclusion;
- sentence endings;
- tighter-class resolution;
- mandatory application of both limits.

The action-link example was counted by the same convention.

## Step 4 — add the authoritative ceiling matrix

**Complete.** Added one 14-row table. Every row has:

- an element class;
- a maximum word count;
- a maximum character count;
- a required shape.

The table matches Design and Structure exactly. Numeric limits are not duplicated as a competing
table elsewhere. The backstage calibration section repeats only the relevant body/safety cap to
explain a concrete result.

## Step 5 — encode the house voice

**Complete.** Added binding sections for:

- visitor-first, concrete plain language;
- necessary-technical-term handling;
- removal of throat-clearing and implementation history;
- short, consistent display names as page landmarks;
- noun exceptions for names and field/data labels;
- specific, truthful opening verbs for actions and task labels;
- behavioral truth for pressable labels.

Examples use the repository's established vocabulary: Open, Add, Ask, Leave, Mark, Remove, Try,
and Watch.

## Step 6 — add the adjacency rule

**Complete.** Defined a task area and its maximum explanatory structure:

- one heading;
- one explanatory paragraph or safety note;
- one necessary field hint.

The rule prohibits repeated instruction, reassurance, security boundaries, and implementation
detail across neighboring elements. It explicitly stops authors from splitting a lecture into
several individually legal strings.

## Step 7 — add the author and reviewer pass

**Complete.** Added a ten-step pass covering:

- visitor/action identification;
- full string inventory;
- classification and counting;
- display-name consistency;
- verb and behavior checks;
- jargon and duplication removal;
- glance and aloud reads;
- projector/phone cold reads;
- exception documentation.

The document separates objective length conformance from human evidence.

## Step 8 — add calibrated examples

**Complete.** Examples cover:

- name landmark versus descriptive-sentence heading;
- specific action versus Submit;
- visitor error versus runtime narration;
- result-specific link versus Click/Learn more;
- one safety warning versus several passcode explanations.

The current backstage calibration was reproduced from `src/pages/backstage.astro`:

| Element | Measured | Applicable ceiling | Result |
| --- | ---: | ---: | --- |
| Intro lede | 25 words / 132 characters | 20 / 120 | Fails both |
| Safety note | 25 / 149 | 20 / 120 | Fails both |
| Gate paragraph | 22 / 114 | 20 / 120 | Fails words |

The cluster additionally fails the adjacency rule because unlock, passcode, and session-memory
explanation repeats around one gate.

## Step 9 — state exceptions and enforcement boundary

**Complete.** Exceptions are limited to externally fixed legal, safety, or provider wording.
The source and shortest usable form must be documented beside the implementation. Existing copy,
preference, and long official names are explicitly not exceptions.

The final section states that no automated copy gate exists and preserves charter N4: objective
counts discover drift but cannot decide audience fit, warmth, or convincingness.

## Step 10 — targeted content audit

**Complete.** Checks executed from the repository root.

### File and structure

- `test -f docs/knowledge/copy-voice-standard.md` — passed.
- `wc -l docs/knowledge/copy-voice-standard.md` — 189 lines.
- Heading-order script — 12 planned headings found in order.
- Matrix script — all 14 planned labels and numeric pairs found.
- Required phrase searches — passed for:
  - `plain kitchen-table English`;
  - `names as wayfinding`;
  - `specific verb`;
  - `Both maximums apply`;
  - `one explanation per task`;
  - `automated copy gate`;
  - `charter N4`.

### Calibration counts

A read-only Node script counted the exact current source strings:

- intro: 25 words, 132 characters;
- note: 25 words, 149 characters;
- gate: 22 words, 114 characters;
- action-link example: 6 words, 25 characters.

All results match the values recorded in the document.

### Diff and scope

- `git diff --check` — passed.
- `git diff --name-only` before implementation staging showed only:
  - Lisa's existing ticket phase diff;
  - the new knowledge document (untracked files are not listed by `git diff`).
- `git status --short` confirmed no source, test, pointer, or workflow file changed.
- The ticket frontmatter remains unstaged.

## Audit correction

The first audit caught an incorrect illustrative character count: `Leave a note for the team`
was initially recorded as 29 characters. The script measured 25. The document was corrected to
25 and the full audit reran green. This was an implementation correction, not a plan or design
change.

## Deviations from plan

None. The implementation follows the planned file boundary, outline, ceiling values, examples,
and verification approach. No extra file, automated gate, copy rewrite, or wiring change was
introduced.

## Files in the implementation unit

### Created

- `docs/knowledge/copy-voice-standard.md`
- `docs/active/work/T-009-01-01/progress.md`

### Modified

- None.

### Deleted

- None.

## Remaining work

1. Commit the knowledge document and this progress artifact together.
2. Inspect the committed diff and ticket commit sequence.
3. Write `review.md` with acceptance coverage, test evidence, gaps, and downstream concerns.
4. Commit Review and stop without changing ticket phase or status.
