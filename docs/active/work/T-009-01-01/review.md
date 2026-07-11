# Review — T-009-01-01 author-voice-length-standard-doc

Self-assessment and handoff for the completed ticket. This review covers the knowledge
contract, the RDSPI artifacts, verification evidence, and downstream concerns.

## Outcome

The ticket is complete. `docs/knowledge/copy-voice-standard.md` now turns the existing
“parlor, not portfolio” voice into a concrete authoring contract. It supplies:

- plain kitchen-table language rules;
- word and character ceilings for 14 surface-element classes;
- names-as-wayfinding rules;
- verb-forward action-label rules;
- an adjacency rule that prevents explanations from being split into several short strings;
- a repeatable author/reviewer pass;
- measured examples proving the current backstage passcode cluster fails;
- a clear boundary between objective checks and human judgment.

No source copy was rewritten and no read-path wiring was added. Those changes remain correctly
owned by dependent tickets.

## Files created

### Product deliverable

- `docs/knowledge/copy-voice-standard.md` — 189 lines.
  - Canonical binding copy contract.
  - Stable headings for downstream links.
  - One authoritative 14-row length matrix.
  - Explicit counting method.
  - Calibrated backstage regression evidence.
  - Human-review and enforcement boundary.

### RDSPI artifacts

- `docs/active/work/T-009-01-01/research.md` — 221 lines.
- `docs/active/work/T-009-01-01/design.md` — 286 lines.
- `docs/active/work/T-009-01-01/structure.md` — 285 lines.
- `docs/active/work/T-009-01-01/plan.md` — 318 lines.
- `docs/active/work/T-009-01-01/progress.md` — 236 lines.
- `docs/active/work/T-009-01-01/review.md` — this handoff.

## Files modified

None by the agent.

The worktree contains an unstaged phase-only change in
`docs/active/tickets/T-009-01-01.md`. During Review, Lisa had advanced it from `ready` to
`implement`. This is expected automation state, was not authored or staged by this work, and must
remain Lisa-owned.

## Files deleted

None.

## Acceptance criterion assessment

### Required file exists

**Pass.** The exact path is:

`docs/knowledge/copy-voice-standard.md`

### Plain kitchen-table English is concrete

**Pass.** The standard requires visitor/task point of view, active voice, concrete familiar
words, removal of throat-clearing, and no repository/implementation history on a visitor surface.
It gives representative insider terms and a contextual rule for necessary technical language.
This is stronger than a banned-word list because it checks whether a term helps the visitor act.

### Brevity/length ceiling per surface element

**Pass.** The matrix defines both maximum words and maximum characters for:

1. display name / `h1` landmark;
2. page or section heading;
3. eyebrow / overline / chip;
4. tagline;
5. button or action link;
6. field, option, or data label;
7. help text / option hint;
8. lede / body / section paragraph;
9. safety note;
10. status / validation / error / empty state;
11. success / confirmation;
12. browser title;
13. metadata description;
14. alt or accessible description.

Both limits are binding. The document defines word, character, sentence, whitespace,
interpolation, dynamic-value, and ambiguous-class handling so independent authors can reproduce
the result.

### Names as wayfinding

**Pass.** The standard keeps a short display name in the primary page landmark and consistent
across page title and destination references. It prohibits descriptive-sentence names and generic
replacement landmarks, while explicitly allowing names to remain nouns rather than forcing an
unnatural verb.

### Verb-forward labels

**Pass.** Buttons, action links, and task-orienting labels must begin with a specific verb that
truthfully names the result. Examples replace Submit, Continue, Learn more, and Click here with
result-specific actions. Names, fields, data labels, and stable noun landmarks are explicit
exceptions.

### Known backstage lecture is flagged

**Pass.** Counts were reproduced from the current source:

| Element | Actual | Maximum | Result |
| --- | ---: | ---: | --- |
| Intro lede | 25 words / 132 characters | 20 / 120 | Fails both |
| Safety note | 25 / 149 | 20 / 120 | Fails both |
| Gate paragraph | 22 / 114 | 20 / 120 | Fails word count |

The cluster also fails the one-explanation-per-task rule because adjacent strings repeat unlock,
passcode, safety, and session-memory explanation around one control. This ensures the contract
would still catch drift if a lecture were mechanically split into smaller pieces.

## Design quality assessment

### Strengths

- The contract separates measurable conformance from human judgment.
- The element matrix follows the actual surface hierarchy rather than imposing one universal cap.
- Both word and character limits address reading load and narrow-screen sprawl.
- The adjacency rule closes the obvious loophole in per-element limits.
- Dynamic strings and accessible names are in scope, avoiding a markup-only blind spot.
- Explicit noun exceptions preserve useful wayfinding and natural field labels.
- The standard is portable Markdown with no mandatory service or new tooling.
- Stable section names give `T-009-01-02` reliable link targets.

### Tradeoffs accepted

- The numeric ceilings are a first binding calibration based on the existing index/backstage
  surfaces and the named regression, not a fleet-wide empirical study.
- Manual counting has authoring cost until a later automation epic earns a checker.
- A strict one-sentence body rule favors scanability and may require information architecture
  changes when a task is genuinely complex.
- The standard intentionally prefers short interface display names over exact long official names.

These tradeoffs are consistent with E-009's scope and can be revised later from device/cold-read
evidence rather than preference.

## Verification performed

### Structural audit

- File existence check — passed.
- Document line count — 189.
- Required heading inventory — 12 headings found in planned order.
- Ceiling matrix inventory — all 14 planned rows found.
- Matrix values — exact match with Design and Structure artifacts.
- Required concept searches — passed for kitchen-table English, wayfinding, specific verbs,
  dual maximums, adjacency, no automated gate, and charter N4.

### Count audit

A read-only Node script computed exact word/character pairs for the three current backstage
strings and the action-link example. Final results:

- 25 / 132;
- 25 / 149;
- 22 / 114;
- 6 / 25.

The first run caught one incorrect illustrative count (`Leave a note for the team` was written as
29 characters). It was corrected to 25, and the complete audit then passed. The audit therefore
demonstrated useful failure detection rather than merely echoing the prose.

### Repository audit

- `git diff --check` — passed before implementation commit.
- `git diff --cached --check` — passed for the implementation unit.
- `git show --check 194aa44` — passed for the implementation commit.
- Scope inventory across the ticket commit range contains only the knowledge document and this
  ticket's work artifacts.
- Final pre-review worktree contained only Lisa's unstaged ticket phase transition.

## Runtime test coverage

No build, typecheck, unit test, Playwright flow, or leak check was run for this ticket.

That gap is intentional and proportionate:

- no application, test, configuration, script, or runtime dependency changed;
- the deliverable is Markdown with no build-time ingestion yet;
- `T-009-01-02` owns pointer resolution and fresh-session read-path evidence;
- `T-009-02-01` and `T-009-02-02` own runtime copy changes and their corresponding flows;
- `T-009-02-03` owns full Playwright, leak, projector, and phone verification.

The relevant test for this ticket is a content-contract audit, which was performed. Running the
runtime suite would not exercise the new document because it is not wired yet.

## Scope compliance

### In scope and completed

- One canonical voice/length knowledge document.
- Checkable rules for all four acceptance dimensions.
- Exact limits and counting convention.
- Backstage drift calibration.
- Automation/human-review boundary.
- Full RDSPI phase artifacts and incremental commits.

### Correctly left out

- `AGENTS.md`, `CLAUDE.md`, and RDSPI read-path wiring.
- Index and backstage copy rewrites.
- Automated linting or CI enforcement.
- CSS, typography, clay primitives, or layout changes.
- Auth, passcode, storage, API, or security behavior changes.
- Per-demo marketing copy.
- Ticket phase/status edits.

## Open concerns

### 1. Ceiling calibration needs downstream evidence

The 20-word paragraph/safety ceiling deliberately rejects all three named backstage strings and
the current long index ledes. The rewrite tickets may reveal an element class whose job genuinely
cannot fit. If so, do not silently exceed the limit: capture the device/cold-read evidence and
revise the canonical standard in a dedicated change.

### 2. “Character” is human-readable, not Unicode-algorithm-specific

The contract defines what is included but does not distinguish Unicode code points, grapheme
clusters, and JavaScript UTF-16 code units. Current English copy and punctuation are unambiguous.
A future automated checker must choose and document a Unicode-safe counting method before applying
the contract to emoji or combining marks.

### 3. No automatic extraction exists

Astro markup, frontmatter, accessible attributes, and client-script states must currently be
inventoried by the author. This is honest E-009 scope. A future checker should not claim full
coverage unless it can see rendered dynamic and accessible copy.

### 4. Examples are patterns, not approved final rewrites

The illustrative safety note in the standard preserves the shape of rule plus next step, but
`T-009-02-01` still owns the actual backstage wording and must preserve the page's security
meaning. Downstream work should not copy an example blindly without reading the whole task area.

### 5. Wiring is not live yet

The file exists at its settled path, but a fresh RDSPI session will not automatically read it
until `T-009-01-02` updates the authoring read-path. This is expected dependency sequencing, not
an incomplete acceptance item for this ticket.

## Critical issues requiring human attention

None.

The numeric thresholds are the main review judgment. A human reviewer should examine the matrix,
especially the 20-word body/safety cap and one-explanation-per-task rule, before downstream copy
rewrites make them expensive to change. There is no security or runtime risk in the current diff.

## Commit record

- `b11f4fc` — Research artifact.
- `a222bfd` — Design artifact.
- `4b293a3` — Structure artifact.
- `1265ffd` — Plan artifact.
- `194aa44` — Knowledge standard plus implementation progress.
- Review artifact — final ticket commit after this assessment.

Every meaningful phase was committed independently. The implementation is a coherent unit rather
than a partial standard.

## Downstream handoff

### `T-009-01-02`

- Link `docs/knowledge/copy-voice-standard.md` from the injected authoring path.
- Stable anchors to prefer:
  - `#the-contract-in-four-rules`;
  - `#length-envelope`;
  - `#author-and-review-pass`.
- Verify a fresh RDSPI session has the envelope in context.

### `T-009-02-01`

- Apply the body, safety, help, metadata, and status rows to every backstage string.
- Use `#keep-one-explanation-per-task` for the unlock area.
- Preserve “do not paste secrets” meaning while removing repetition.
- Run the backstage phone flow and leak check owned by that ticket.

### `T-009-02-02`

- Preserve `DEMO_NAME` and `PRIMARY_ACTION_LABEL` as template slots.
- Apply the name, tagline, lede, metadata, control, and status rows.
- Keep the display name as the `h1` landmark and put action in the surrounding label.
- Run the index flow owned by that ticket.

### `T-009-02-03`

- Use the author/review pass for projector and phone evidence.
- Treat counts as a prerequisite, not proof of convincingness.
- Confirm the read-path wiring is actually live.

## Final verdict

**Ready for Lisa-managed transition.** The acceptance criterion is satisfied, verification is
proportionate and reproducible, scope is clean, and no critical issue remains. Review is complete;
the agent should stop without changing the ticket's phase or status.
