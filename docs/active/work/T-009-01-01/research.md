# Research — T-009-01-01 author-voice-length-standard-doc

Descriptive map of the voice sources, present copy surfaces, downstream consumers,
and repository boundaries relevant to the ticket. This phase records what exists; it
does not choose the standard's final limits or wording.

## Ticket position

- Ticket: `docs/active/tickets/T-009-01-01.md`.
- Parent story: `docs/active/stories/S-009-01.md`.
- Parent epic: `docs/active/epic/E-009.md`.
- Current ticket phase: `research`.
- Deliverable named by the acceptance criterion:
  `docs/knowledge/copy-voice-standard.md`.
- The deliverable is a documentation contract, not an application surface.
- The ticket has no dependencies.
- `T-009-01-02` depends on this ticket and will wire the settled document path and
  section names into the authoring read-path.
- `T-009-02-01` and `T-009-02-02` depend on both standard tickets and will rewrite
  the backstage and index copy.
- `T-009-02-03` will perform the projector/phone cold read and full flow checks.

## Acceptance criterion decomposed

The new document must make four existing voice ideas concrete enough to distinguish
conforming copy from drift:

1. plain kitchen-table English;
2. a brevity or length ceiling for each surface element;
3. names as wayfinding;
4. verb-forward labels.

The ticket supplies one calibration case: the old backstage passcode explanation must
fail the contract because it is too long. The contract therefore needs observable rules,
not only adjectives such as “warm,” “brief,” or “clear.”

## Repository instruction chain

- `AGENTS.md` delegates all project context to `CLAUDE.md`.
- `CLAUDE.md` names `docs/knowledge/rdspi-workflow.md` as the RDSPI source.
- `docs/knowledge/rdspi-workflow.md` defines the six artifacts and continuous phase
  progression.
- The current workflow contains no link to a copy standard.
- The story assigns that wiring to `T-009-01-02`, not this ticket.
- No `docs/knowledge/copy-voice-standard.md` exists at research time.
- Existing knowledge documents use Markdown headings, short introductory prose, lists,
  tables, and explicit boundaries. They do not use a separate schema or build step.

## Durable product constraints

### `docs/knowledge/charter.md`

- P3 requires the public demo to remain legible on a projector and usable on a phone.
- P4 requires collaboration without workplace or account tax.
- N4 says automated checks do not replace human judgment about whether a demo convinces.
- Guardrails keep secrets out of browser bundles and stakeholder comments.
- The template's planning history and demand must not leak into generated projects.
- The admission tests favor machine-checkable contracts over stale explanation.

### `docs/knowledge/product-spec.md`

- The public demo calls for projector-readable type, controls, progress, and results.
- It also calls for a mobile-first responsive layout and touch targets.
- The backstage surface is for stakeholders, not repository specialists.
- Backstage must label its low security level and direct secrets elsewhere.
- Prose is reserved for durable intent and boundaries; current truth belongs in tests and
  programs where possible.
- Human testing remains the gold standard for whether a demo is convincing.

### `docs/knowledge/vision.md`

- The template standardizes the runway rather than the product idea.
- Teammates and stakeholders must be able to shape a demo early.
- Generated demos remain free to replace placeholder behavior and product language.

## Existing house voice

The most explicit repository statement is in E-005 and its completed work artifacts:

- “Parlor, not portfolio” means arranging the surface for the visitor rather than
  displaying implementation or maker history.
- The tone is described as warm host energy.
- Visitor copy uses plain kitchen-table English and avoids category jargon.
- Names are wayfinding: the product or place name remains available as a stable landmark.
- Labels explain what a visitor does and therefore begin with an action where practical.
- Pressable-looking controls must perform a real action.
- One obvious primary action is preferred over a group of competing calls to action.
- Generated projects replace the demo name and primary action from the product idea.

These rules currently live in `docs/active/epic/E-005.md` and
`docs/active/work/T-005-01-01/research.md`; there is no single durable knowledge document
that a new authoring session can apply.

## Current public copy surface

`src/pages/index.astro` is the front door. Its visible content includes:

- eyebrow labels such as “Start here,” “Watch the server answer,” and “Leave a note”;
- the wayfinding name “Demo Runway” in the `h1`;
- a descriptive tagline, “The starting line every demo inherits”;
- two multi-sentence ledes;
- a shorter note-card lede;
- a verb-forward primary action, “Ask for a fresh note”;
- a verb-forward link, “Leave a note for the team”;
- receipt field labels and live loading/error status text;
- page title and description metadata.

The E-005 implementation established two explicit template slots:

- `DEMO_NAME`;
- `PRIMARY_ACTION_LABEL`.

E-005's cold-read artifact found that the name survived projector-distance shrinking but
the eyebrow labels did not. It also found the primary action below the projector fold.
Those are layout/type hierarchy observations rather than copy-length rules, but they show
that the shortest, most important words must carry the orientation.

## Current backstage copy surface

`src/pages/backstage.astro` is a static page over passcode-gated APIs. Its visible copy
includes:

- page title and metadata description;
- intro eyebrow, `h1`, tagline, lede, and a safety note;
- gate heading, explanatory paragraph, field label, help, and action;
- dashboard eyebrow, heading, explanatory paragraph, and form instructions;
- option labels and hints;
- empty, loading, success, validation, and network states in the client script;
- entry-management actions and confirmations.

The named regression spans adjacent intro and gate explanation:

- the intro lede explains unlock, viewing, adding, checklist management, and account state;
- the following safety note explains the “shared knock, not a vault” metaphor and lists
  forbidden secret types;
- the next card repeats how to use the passcode and how long it remains in memory;
- field help repeats that one unlock opens the checklist for the visit.

This is the “two-paragraph passcode lecture” named by demand signal 7 and E-009. The copy
contains necessary safety meaning, but distributes it through several explanatory elements.

## Existing observable patterns

- The index uses short eyebrows as section labels.
- The name remains a noun because it serves navigation and identity.
- Buttons and links mostly begin with verbs: Ask, Leave, Open, Add, Mark, Remove.
- Some backstage headings are noun phrases: “The shared checklist” and “What the team has.”
- Field labels are compact nouns: Link, Shared passcode.
- Questions are used for form legends and help: “What are you handing us?”
- Loading and error strings state the affected thing and a next step.
- Metadata is longer and less visible than controls, but still visitor-facing.
- Code comments are much longer and more technical than UI copy; they are not rendered.
- API error details are machine-consumed and sometimes surfaced by clients, so the boundary
  between UI copy and internal prose must be named.

## Existing checks and their limits

- Playwright locates primary controls by accessible role and name.
- Stable accessible names are therefore behavioral contracts, not decoration.
- `tests/demo-flow.spec.ts` covers the index's visible server response.
- `tests/backstage-flow.spec.ts` covers gate and backstage management behavior on a phone.
- `npm run leak:check` protects configured secret values from public output.
- Build and type checks validate syntax, not voice.
- No linter counts words or characters in user-facing strings.
- No test currently identifies jargon, insider self-reference, sentence-like headings, or
  duplicated explanation.
- The charter explicitly prevents automated checks from claiming subjective quality.

## Downstream consumers of the standard

`T-009-01-02` needs a stable file path and sections that can be linked from the workflow and
knowledge pointers.

`T-009-02-01` needs limits for metadata, intro copy, section copy, safety notes, field help,
buttons, and script-generated statuses. It must preserve the warning not to paste secrets.

`T-009-02-02` needs limits for metadata, taglines, ledes, receipt labels, and script statuses.
It must preserve `DEMO_NAME` and `PRIMARY_ACTION_LABEL` as editable slots.

`T-009-02-03` needs a human-readable review procedure that can answer “what is this?” and
“what do I do?” at projector distance and on a phone without treating a word count as proof
of convincingness.

Future authoring sessions need a quick way to classify an element, apply a ceiling, and review
language without reconstructing E-005's history.

## Scope boundaries

- This ticket creates one knowledge document and its RDSPI artifacts.
- It does not modify `src/pages/index.astro` or `src/pages/backstage.astro`.
- It does not modify tests, layout, tokens, clay primitives, auth, storage, or APIs.
- It does not wire the document into `AGENTS.md`, `CLAUDE.md`, or the RDSPI workflow.
- It does not build an automated copy gate.
- It does not define per-product marketing claims for generated demos.
- It does not replace human cold reading.
- It does not change the ticket's phase or status frontmatter.

## Assumptions and constraints surfaced

1. “Per surface element” covers both visible UI elements and visitor-facing metadata or
   dynamic state, not repository comments and engineering documentation.
2. A length rule must identify its counting unit so two authors reach the same result.
3. Different elements perform different jobs; a universal character cap would erase that
   distinction.
4. Safety copy may need more room than a button, but repetition across adjacent elements is
   still drift.
5. Names, field labels, and unavoidable technical values can be noun phrases without violating
   a verb-forward rule intended for actions and orientation labels.
6. The standard must separate hard, checkable envelope rules from judgment-based reading tests.
7. The backstage regression is the acceptance calibration case, while the later rewrite owns
   the actual correction.
8. Because wiring is a dependent ticket, this document must stand alone at its final path before
   any pointer is added.

## Research conclusion

The repository has a coherent voice in prior work but no durable authoring contract. Its rules
are distributed across an epic, implementation artifacts, the charter, and current examples.
The missing piece is not a new brand concept; it is a compact classification and checking
envelope that carries those established rules into future sessions while preserving the
difference between objective limits and human judgment.
