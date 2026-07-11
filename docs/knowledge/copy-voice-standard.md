# Copy voice and length standard

This is the binding authoring contract for user-facing Demo Runway copy. It distills the
existing “parlor, not portfolio” voice: arrange the room for the visitor, use plain
kitchen-table English, and make the next move obvious. Copy **must** satisfy every rule below.
A failed rule is **drift**, even when the string fits a numeric limit.

## The contract in four rules

1. **Use plain kitchen-table English.** Write for the visitor doing the task, not the team
   that built the page. Prefer familiar, concrete words and active voice.
2. **Keep each element brief.** Classify the rendered string and keep it within both limits in
   the [length envelope](#length-envelope). Do not split one explanation into several strings.
3. **Use names as wayfinding.** Keep the short product or place name visible and consistent so
   a visitor always knows where they are.
4. **Lead labels with the action.** Buttons, action links, and task labels start with a specific
   verb that tells the visitor what will happen.

The four rules work together. Short insider copy is still drift; warm copy that exceeds its
element limit is also drift.

## What this standard covers

Apply the standard to text a visitor can read or hear from a product surface:

- visible headings, paragraphs, notes, labels, hints, controls, and links;
- accessible names, alt text, and equivalent descriptions;
- browser titles and metadata descriptions;
- validation, loading, empty, success, and error states;
- client or server strings when the interface renders them to a visitor.

It does not cover code comments, operator-only logs, engineering documentation, machine slugs,
protocol field names, URLs, opaque generated values, or text supplied by a user. Labels around
those values remain in scope. An internal string becomes user-facing as soon as the interface
shows or announces it.

## Count the rendered string

Check the final rendered text, not source indentation or template formatting.

- A **word** is a whitespace-separated token. A hyphenated term counts as one word.
- A **character** is a letter, number, punctuation mark, symbol, or internal space.
- Trim leading and trailing whitespace and ignore formatting-only line breaks.
- Count authored interpolation at its expected rendered value.
- Do not count user content or opaque identifiers as part of their surrounding label.
- `.`, `?`, and `!` end a sentence; an abbreviation does not create another sentence.
- When an element fits two rows, use the tighter limits unless the table names it directly.
- Both maximums apply. Exceeding either the word or character maximum is drift.

Example: `Leave a note for the team` is 6 words and 25 characters, so it fits the action-link
row. The source may wrap across lines without changing those counts.

## Length envelope

| Surface element | Maximum words | Maximum characters | Required shape |
| --- | ---: | ---: | --- |
| Display name / `h1` landmark | 5 | 40 | A name, not a descriptive sentence |
| Page or section heading | 8 | 60 | One thought; no paragraph punctuation |
| Eyebrow / overline / chip | 4 | 28 | A fragment; use an action when it labels a task |
| Tagline | 8 | 60 | A fragment, not a descriptive sentence |
| Button or action link | 6 | 36 | Start with a specific verb |
| Field, option, or data label | 5 | 32 | Use a familiar noun or short question |
| Help text / option hint | 12 | 80 | One sentence |
| Lede / body / section paragraph | 20 | 120 | One sentence |
| Safety note | 20 | 120 | State the rule and safe next step in one sentence |
| Status / validation / error / empty state | 14 | 100 | Name the state or next step in one sentence |
| Success / confirmation | 12 | 80 | One sentence |
| Browser title | 10 | 70 | Lead with the page or product name |
| Metadata description | 20 | 150 | One visitor-focused sentence |
| Alt or accessible description | 20 | 140 | Describe purpose, not decorative detail |

These are ceilings, not targets. Use fewer words whenever meaning and safety survive.

## Plain kitchen-table English

- Address the visitor and the thing they came to do.
- Prefer concrete words such as **page**, **link**, **note**, **team**, **server**, **try**,
  **open**, and **add**.
- Prefer active voice and natural contractions: `We couldn't open the list` is plainer than
  `The list could not be initialized`.
- Remove throat-clearing such as `You've landed on`, `This is`, and `In order to` when the
  sentence works without it.
- Do not narrate the template, repository, implementation, or development history.
- Avoid insider terms such as **runtime**, **boundary**, **implementation**, **generated
  project**, **environment variable**, **D1**, **Worker**, **repository**, **agent**, and
  **schema** on a general visitor surface.
- A necessary technical term may appear when the visitor needs it to act. Define it once in
  nearby plain language; do not repeat the explanation.

`Server` is acceptable when the page is demonstrating a browser/server exchange. Plainness is
an audience test, not a banned-word game.

## Names are wayfinding

- Put the short product or place name in the page's primary landmark, normally the `h1`.
- Use that same display name in the browser title and links or headings that identify the
  destination.
- Keep a name as a noun. Do not turn it into a sentence that describes the product.
- Use a short interface display name when an official name exceeds the display-name limit.
- Do not replace the real name with generic landmarks such as `Welcome` or `Dashboard`.

Names, field labels, data labels, and stable noun landmarks do not need a forced opening verb.
`Demo Runway` is useful wayfinding; `Welcome to the starting line every demo inherits` is not.

## Labels lead with the action

Buttons, action links, and task-orienting eyebrows or headings must begin with the visitor's
action: **Open**, **Add**, **Ask**, **Leave**, **Mark**, **Remove**, **Try**, or **Watch**.
Choose the smallest verb that truthfully names the result.

- Use `Add to the list`, not `Submit`.
- Use `Open backstage`, not `Continue`.
- Use `Read the setup guide`, not `Learn more`.
- Use `Try again`, not `Click here`.

Product or place names, field and data labels, stable statuses, and unavoidable noun landmarks
may remain nouns. A pressable label must match a real response: what looks and sounds actionable
must act.

## Keep one explanation per task

A **task area** is a group of adjacent elements supporting one visitor action. Before its
control, a task area may have:

- one heading;
- one explanatory paragraph **or** one safety note;
- one field-specific hint when the field needs it.

Do not repeat an instruction, reassurance, security boundary, or implementation detail across
adjacent elements. A necessary safety warning replaces optional explanation; it does not become
a second mini-essay. Separate fields may each have one necessary, non-repeating hint.

This rule prevents an author from turning one over-limit paragraph into several under-limit
paragraphs. The whole task must scan as one invitation, not a lecture.

## Author and review pass

Run this pass whenever user-facing copy is added or changed:

1. Name the visitor and the action they came to take.
2. Inventory visible copy, accessible names, metadata, and every dynamic state.
3. Classify each rendered string with the length-envelope table.
4. Count words and characters; shorten any string that exceeds either maximum.
5. Check that the display name is short, visible, and consistent.
6. Check that each action label starts with a specific verb and matches real behavior.
7. Remove insider narration, throat-clearing, and repeated explanation.
8. Read the orientation layer — name, task label, primary action, and status — at a glance.
9. Read each supporting string aloud in one breath without decoding a term or finding a buried
   action.
10. For a changed public surface, cold-read it at projector distance and on a phone; document
    any permitted external exception.

Counting gives an objective pass or fail for length. The glance, breath, projector, and phone
checks are human review evidence.

## Examples

| Drifted | Conforming pattern | Rule |
| --- | --- | --- |
| `Welcome to the starting line every demo inherits` | `Demo Runway` | Keep the name as the landmark. |
| `Submit` | `Add to the list` | Name the real action. |
| `The runtime boundary could not be initialized` | `We couldn't open the list — try again.` | Use visitor language and a next step. |
| `Click here to learn more` | `Read the setup guide` | Replace generic verbs with the result. |
| Several passcode explanations before one field | One short warning before the field | Keep one explanation per task. |

The current backstage passcode cluster is the calibration case:

| Current element | Words | Characters | Result |
| --- | ---: | ---: | --- |
| Intro lede beginning `Unlock once to see what the team has…` | 25 | 132 | Fails the body maximums |
| Safety note beginning `That passcode is a shared knock…` | 25 | 149 | Fails the safety-note maximums |
| Gate paragraph beginning `Use the passcode the team gave you…` | 22 | 114 | Fails the body word maximum |

All three fail the 20-word ceiling for their class, and the first two also fail the 120-character
ceiling. Together they repeat unlock and passcode explanation in one task area, so the cluster
also fails the adjacency rule. `Keep passwords and keys out of this list; send secrets another
way.` is an illustrative safety-note shape, not a prescribed rewrite for a specific page.

## Exceptions and enforcement boundary

An element may exceed the envelope only when externally fixed legal, safety, or provider wording
must appear verbatim. Document the source beside the implementation, use the shortest permitted
form, and do not repeat it elsewhere. Existing copy, team preference, and a long official name
are not exceptions; use a short display name for the interface.

This repository does not yet have an automated copy gate. Word and character limits are suitable
for later automation, but counts cannot decide whether language fits its audience, feels warm,
or makes a demo convincing. Human review remains binding, consistent with charter N4: checks
find drift; they do not replace judgment.
