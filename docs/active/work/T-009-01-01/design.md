# Design — T-009-01-01 author-voice-length-standard-doc

Options, tradeoffs, and decisions for the binding copy contract. Decisions here are
grounded in the repository map in `research.md` and remain within the ticket's doc-only
scope.

## Design objective

Create one short knowledge document that lets an author or reviewer answer two different
questions:

1. Does this string fit the measurable envelope for its job?
2. Does it sound like the established house voice when read by the intended visitor?

The first question needs deterministic limits. The second retains human judgment, as required
by charter N4. The contract must make both visible instead of blending them into “keep it short
and friendly.”

## Option 1 — principles only

Document “plain,” “warm,” “brief,” “names as wayfinding,” and “verb-forward” with good and bad
examples.

### Advantages

- Short and memorable.
- Faithful to the language already present in E-005.
- Flexible across generated product ideas.
- No counting burden during authoring.

### Disadvantages

- “Brief” remains subjective.
- Two reviewers can reach opposite conclusions about the backstage lecture.
- A loop session cannot reliably tell whether a 25-word paragraph drifted.
- The ticket explicitly requires a concrete, checkable envelope and per-element ceiling.

### Decision

Rejected as the complete contract. These principles belong in the standard, but cannot carry
the acceptance criterion alone.

## Option 2 — one universal word or character cap

Give every user-facing string the same maximum, for example 12 words or 80 characters.

### Advantages

- Extremely easy to state and count.
- Easy to automate later.
- Clearly rejects long paragraphs.

### Disadvantages

- A button, page title, field hint, safety warning, and metadata description do different jobs.
- A useful error needs more room than an eyebrow.
- A 12-word button is already much too long while a 12-word safety warning can be reasonable.
- Character count alone penalizes ordinary long names unpredictably.
- It would encourage authors to split one lecture into many individually conforming strings.

### Decision

Rejected. The research shows a real surface hierarchy, so the envelope must follow that
hierarchy.

## Option 3 — element matrix plus voice checks

Classify each rendered string, apply both a word and character ceiling, then apply a small set
of voice and adjacency checks.

### Advantages

- Directly satisfies “per surface element.”
- Authors can classify and check copy without new tooling.
- Both words and characters catch different forms of visual sprawl.
- Adjacency checks prevent a lecture from being fragmented across several legal strings.
- Human checks preserve audience fit and warmth without pretending they are machine proof.
- A later epic can automate the objective half without redefining the contract.

### Disadvantages

- Requires a table and a counting convention.
- Classification can be ambiguous for hybrid elements.
- Exact limits are judgment calls that must be calibrated against current surfaces.
- Generated products may occasionally have legitimate exceptions.

### Decision

Chosen. The document will make classification and exceptions explicit so the added detail stays
usable.

## Option 4 — implement a linter with the document

Create an AST/HTML copy scanner, configuration, and CI gate alongside the prose standard.

### Advantages

- Immediate enforcement of word and character limits.
- Repeatable results across pages.
- Low reviewer counting cost after implementation.

### Disadvantages

- Explicitly outside S-009-01 and E-009's right-size boundary.
- Astro interpolation and dynamic client strings require nontrivial extraction rules.
- A linter cannot reliably judge audience, jargon, duplicate explanation, or convincingness.
- It would couple this foundational contract to a first implementation before the later sweep
  tests the limits.

### Decision

Rejected for this ticket. The standard should be automation-ready but not claim an automated
gate exists.

## Decision 1 — scope of “user-facing copy”

The standard will cover text a visitor can read or hear from the product surface:

- visible static text;
- control accessible names;
- labels, hints, validation, status, empty, success, and error states;
- document title and metadata description;
- client or server strings rendered into the UI;
- alt text and equivalent accessible descriptions when authored.

It will exclude code comments, logs visible only to operators, engineering documentation,
machine slugs, protocol field names, user-provided content, URLs, and opaque generated values.
If an internal error string is directly shown to a visitor, it becomes user-facing at that seam.

Why: the current UI includes static Astro strings and script-generated states. Restricting the
contract to markup would miss a large part of backstage and the index error path.

## Decision 2 — counting convention

Every classified element must fit both its word ceiling and character ceiling.

- Words are whitespace-separated tokens in the final rendered string.
- Hyphenated terms count as one word.
- Characters include letters, numbers, punctuation, symbols, and internal spaces.
- Leading/trailing whitespace and formatting-only line breaks do not count.
- Interpolated authored copy counts at its expected rendered value.
- Dynamic user content and opaque identifiers do not count toward the surrounding label.
- A sentence is delimited by terminal `.`, `?`, or `!`; abbreviations do not create a new
  sentence.
- If an element fits two classes, use the tighter ceiling unless the matrix names it explicitly.
- A string that exceeds either ceiling is drift.

Why both: word count measures reading load while character count catches long technical tokens
and narrow-phone wrapping.

## Decision 3 — length matrix

The standard will bind these maxima:

| Element | Words | Characters | Additional shape |
| --- | ---: | ---: | --- |
| Display name / `h1` landmark | 5 | 40 | Name, not a descriptive sentence |
| Page or section heading | 8 | 60 | One line of thought; no paragraph punctuation |
| Eyebrow / overline / chip | 4 | 28 | Fragment; orient with a verb when it describes a task |
| Tagline | 8 | 60 | Fragment, not a descriptive sentence |
| Button or action link | 6 | 36 | Starts with a specific verb |
| Field, option, or data label | 5 | 32 | Familiar noun or short question is allowed |
| Help text / option hint | 12 | 80 | One sentence |
| Lede / body / section paragraph | 20 | 120 | One sentence |
| Safety note | 20 | 120 | One sentence; state rule and safe next step |
| Status / validation / error / empty state | 14 | 100 | One sentence; name state or next step |
| Success / confirmation | 12 | 80 | One sentence |
| Browser title | 10 | 70 | Lead with the page or product name |
| Metadata description | 20 | 150 | One sentence; visitor benefit or available action |
| Alt or accessible description | 20 | 140 | Describe purpose, not decorative detail |

The paragraph ceiling is intentionally below the current drift examples. Research counted the
backstage intro lede at 25 words / 132 characters, safety note at 25 / 149, and gate paragraph at
22 / 114. Each exceeds at least the word ceiling; the first two exceed both. The standard thus
flags the named regression without relying only on a subjective read.

## Decision 4 — adjacent-copy budget

Per-element limits alone can be gamed by splitting one explanation into multiple strings.
Therefore a single task area may have at most:

- one heading;
- one explanatory paragraph or safety note before the control;
- one field-specific hint where needed.

Adjacent elements may not repeat the same instruction, reassurance, or implementation detail.
If safety meaning is necessary, it replaces general explanation rather than being appended as a
second mini-essay.

This rule catches the backstage cluster's repeated unlock/passcode/session explanation even
after individual strings are shortened.

## Decision 5 — plain kitchen-table English

The contract will define plainness through substitutions and an outsider test:

- Address the visitor and their task, not the repository or implementation.
- Prefer familiar concrete words: page, link, note, team, server, try, open, add.
- Avoid insider terms on general visitor surfaces: runtime, boundary, implementation, generated
  project, environment variable, D1, Worker, repository, agent, schema.
- Use a necessary technical term only when the audience needs it to act; define it once nearby.
- Prefer active voice and contractions that sound natural aloud.
- Remove throat-clearing such as “you've landed on,” “this is,” and “in order to” when the
  sentence works without it.
- Do not narrate the template's history or explain why the team built the interface.

“Server” remains allowed because the current demo visibly teaches a browser/server distinction
and uses the word in ordinary language. The rule is audience need, not a blanket jargon list.

## Decision 6 — names as wayfinding

- Put the product or place name in the primary page landmark.
- Use the same short display name in browser title, page heading, and destination references.
- Keep a name as a noun; do not stretch it into a descriptive sentence.
- Give an unusually long official name a short display form for the interface.
- Do not replace the name with generic headings such as “Welcome” or “Dashboard.”
- Section names may be plain nouns when they locate a stable place or object.

This preserves E-005's important exception: `Demo Runway` can remain the `h1` even though it does
not begin with a verb.

## Decision 7 — verb-forward labels

Action controls and task-orienting labels begin with the visitor's action: Open, Add, Ask, Leave,
Mark, Remove, Try, Watch. Use the smallest verb that truthfully describes the result.

Exceptions are explicit:

- product/place names;
- field and data labels;
- stable status names;
- unavoidable noun landmarks.

Generic verbs such as Submit, Continue, Click, Manage, and Learn more fail when a specific result
can be named. A pressable label must match a real response, carrying E-005's “what looks pressable
is pressable” behavior into the copy contract.

## Decision 8 — one-glance and one-breath review

“Half-second legible” applies to the orientation layer: name, heading/eyebrow, primary action, and
status. A visitor should identify the place and next action in one glance. It does not literally
claim a person reads 20 body words in half a second.

Supporting copy gets a one-breath test: read it aloud once without pausing to decode a term or
recover a buried action. The phone and projector pass remains a human check, not a word-count
claim.

## Decision 9 — exceptions

An exception is allowed only for externally fixed legal, safety, or provider wording. It must be
documented beside the source, preserve the shortest usable version, and never justify repeating
the same explanation elsewhere. Product preference or existing copy is not an exception.

Long product names use an interface display name rather than bypassing the wayfinding ceiling.
User-provided text and opaque values are outside the count, but their labels remain inside it.

## Document organization

The final standard will be optimized for an authoring session:

1. purpose and binding language;
2. scope and exclusions;
3. four house rules;
4. counting convention;
5. ceiling matrix;
6. adjacency and exception rules;
7. a short author/reviewer checklist;
8. conforming/drifted examples, including backstage;
9. automation and human-judgment boundary.

## Rejected additions

- No CSS or typography guidance: the clay kit owns visual presentation.
- No complete rewrite catalog: S-009-02 owns current surfaces.
- No marketing-style persona framework: the standard serves ordinary UI authoring.
- No banned-word linter: plainness depends on audience and context.
- No wiring change: `T-009-01-02` owns the injected path.
- No claim that passing counts makes copy convincing: N4 remains binding.

## Design outcome

The chosen contract turns the existing brand voice into a checkable envelope without replacing
human reading. The matrix makes length failures deterministic; the audience, adjacency,
wayfinding, and verb rules catch drift that counting cannot. It is strict enough to reject the
known backstage lecture, portable enough for generated demos, and shaped for later automation
without including that automation here.
