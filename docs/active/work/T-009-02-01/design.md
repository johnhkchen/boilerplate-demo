# Design — T-009-02-01 rewrite backstage copy to standard

## Decision summary

Rewrite the backstage page in place as a copy-only change.

Keep the page name, DOM structure, selectors, action labels, API behavior, and styles stable.
Replace the long orientation and gate explanations with short visitor-focused strings, keep one
direct safety rule with a safe next step, remove the redundant unlock hint, simplify dashboard
language, and shorten every indirect client-rendered state.

Do not render server-authored validation issue text into the page. A short client-owned error will
cover a 422 response instead, keeping the visible state bounded and free of protocol language.

## Design drivers

The selected design must satisfy all of these at once:

1. preserve the short `Backstage` name as wayfinding;
2. explain the page and next action at a glance;
3. preserve the explicit warning against pasting secrets;
4. avoid multiple explanations for one unlock task;
5. keep every fixed string within both copy ceilings;
6. remove builder/team self-reference where the visitor does not need it;
7. preserve exact action meaning;
8. avoid changing security, API, persistence, DOM, focus, or responsive behavior;
9. retain the existing phone flow's accessible selectors where they already conform;
10. avoid creating an automated voice gate, which is outside this story.

## Visitor and task

The visitor is a person who has been given the shared Backstage passcode.

They came to:

- open Backstage;
- add a link or note;
- see what is already on the shared list;
- mark an entry complete;
- remove an entry.

They also need one safety boundary: this list is not a safe place for passwords, keys, or other
secrets, and those must be sent securely another way.

## Option A — minimum known-regression patch

Change only the three strings called out by the standard's calibration table:

- intro lede;
- intro safety note;
- locked-gate paragraph.

Leave metadata, dashboard copy, option text, and all script states unchanged.

### Benefits

- smallest source diff;
- almost no chance of disturbing copy-coupled flow selectors;
- directly fixes the three measured failures.

### Costs

- does not satisfy the ticket's explicit title/description and script-string sweep;
- preserves indirect phrases such as “Pop in,” “give it a moment,” and “didn't go through”;
- preserves first-person builder language in “handing us”;
- can continue exposing technical server validation issues;
- treats the calibration examples as the whole contract rather than applying the contract.

### Result

Rejected. It under-scopes the ticket and leaves visitor-facing drift outside the three known
paragraphs.

## Option B — copy rewrite with stable interaction contract

Audit all page-authored copy and update every string that is too long, repeated, indirect,
builder-centered, unbounded, or shape-invalid.

Keep already conforming names and controls when changing them would add selector churn without
visitor benefit.

Remove the redundant field help rather than rewriting it into another explanation.

Replace the 422 rendering branch's raw issue interpolation with a fixed visitor-owned message.

### Benefits

- covers every ticket-named surface;
- applies the standard to visible, metadata, accessible, and dynamic states;
- preserves a stable accessible interaction contract;
- removes the unlock lecture structurally, not only by shortening individual sentences;
- bounds all application-authored visible error copy;
- remains one-page, string-focused work.

### Costs

- larger copy diff than the minimum patch;
- requires deliberate classification and counting of many strings;
- the server's detailed validation diagnosis is no longer shown to a visitor;
- removing help text slightly changes the gate's rendered node inventory.

### Result

Selected. It meets the full ticket with a narrow runtime footprint.

## Option C — central copy dictionary and automated checker

Extract all backstage strings into a typed module and add a script that enforces length limits.

### Benefits

- gives one searchable inventory;
- could automate word and character ceilings;
- could make future localization or fleet-wide checks easier.

### Costs

- introduces abstraction for one page;
- dynamic strings still need classification and human review;
- count checks cannot decide plainness, wayfinding, or adjacency;
- automated voice enforcement is explicitly outside `S-009-02`;
- increases implementation and test surface without helping the current interaction.

### Result

Rejected. The story explicitly holds the voice gate boundary in `S-009-01`, and this ticket is a
surface rewrite rather than a framework addition.

## Selected information hierarchy

The locked view will read in this order:

1. an action-oriented eyebrow;
2. the `Backstage` name;
3. a short tagline;
4. one sentence explaining the shared-list purpose;
5. one safety rule and safe next step;
6. an action heading for the gate;
7. one direct instruction;
8. the labeled passcode field;
9. the `Open backstage` action.

This separates three jobs without repeating them:

- orientation: what Backstage is for;
- safety: what must not be added;
- task instruction: how to open it.

The field help is removed because the heading and gate instruction already establish the action,
and “one unlock for this visit” is implementation/session detail the visitor does not need before
acting.

## Selected static copy

| Surface | Selected string | Words | Characters | Contract reason |
| --- | --- | ---: | ---: | --- |
| Browser title | `Backstage` | 1 | 9 | Short name, no sentence title |
| Metadata | `Share links and notes in Backstage, then mark or remove finished work.` | 12 | 70 | Visitor action and place name |
| Intro eyebrow | `Share with your team` | 4 | 20 | Task label begins with action |
| `h1` | `Backstage` | 1 | 9 | Stable display name |
| Tagline | `One shared list, from first note to done.` | 8 | 41 | Existing brief orientation |
| Intro lede | `Share links and notes in one checklist.` | 7 | 39 | One plain purpose sentence |
| Safety note | `Don't paste passwords, keys, or other secrets here; send them securely instead.` | 12 | 79 | Direct rule plus safe next step |
| Gate heading | `Open the backstage list` | 4 | 23 | Existing accurate action heading |
| Gate paragraph | `Enter your shared passcode to open the list.` | 8 | 44 | One direct instruction |
| Field label | `Shared passcode` | 2 | 15 | Existing familiar label |
| Gate button | `Open backstage` | 2 | 14 | Existing specific action |

Counts use the standard's whitespace-token and rendered-character rules.

## Selected dashboard copy

| Surface | Selected string | Words | Characters | Contract reason |
| --- | --- | ---: | ---: | --- |
| Eyebrow | `Backstage is open` | 3 | 17 | Stable status |
| Heading | `Shared checklist` | 2 | 16 | Short section landmark |
| Section paragraph | `Add a link or note, then mark or delete each item.` | 11 | 50 | Plain task summary |
| Add heading | `Add something` | 2 | 13 | Existing action heading |
| Legend | `What will you add?` | 4 | 18 | Visitor-centered question |
| Reference label | `Link or reference` | 3 | 17 | Familiar option noun |
| Reference hint | `Add a page, document, or example.` | 6 | 33 | One short action sentence |
| Feedback label | `Feedback` | 1 | 8 | Familiar option noun |
| Feedback hint | `Add a thought, request, or comment; a link is optional.` | 10 | 55 | One sentence, full option meaning |
| URL label | `Link` | 1 | 4 | Stable field selector |
| URL help | `Paste the web address for a reference.` | 7 | 38 | Existing action hint |
| Text label | `Say more` | 2 | 8 | Stable field selector, plain action |
| Text help | `Describe what it is and why it matters.` | 8 | 39 | Visitor-centered prompt |
| Add button | `Add to the list` | 4 | 15 | Existing specific action |
| List heading | `On the list` | 3 | 11 | Short landmark without builder voice |
| Empty state | `Add the first link or note above.` | 7 | 33 | One action sentence |
| List accessible name | `Backstage entries` | 2 | 17 | Existing purpose and place name |

The existing tagline is retained because it already fits its fragment class and quickly conveys
the list's progression. The main regression is supporting-copy load, not the tagline.

## Selected entry-state copy

The following existing strings remain because they are short, plain, accurate, and within their
classes:

- `Mark entry {id} complete`;
- `Ready to review`;
- `Complete`;
- `Link or reference`;
- `Feedback`;
- `Added {time} · Entry {id}`;
- `Delete`;
- `Delete entry {id}`;
- `Completing entry {id}…`;
- `Entry {id} is complete.`;
- `Delete entry {id}? This can't be undone.`;
- `Deleting…`;
- `Deleting entry {id}…`;
- `Entry {id} was deleted.`;
- count forms `{count} entry` and `{count} entries`.

Two indirect errors are shortened:

| State | Selected string | Words | Characters |
| --- | --- | ---: | ---: |
| Complete error | `We couldn't mark that entry complete — refresh and try again.` | 11 | 61 |
| Delete error | `We couldn't delete that entry — refresh and try again.` | 10 | 54 |

## Selected unlock-state copy

| State | Selected string | Words | Characters |
| --- | --- | ---: | ---: |
| Missing passcode | `Enter your shared passcode.` | 4 | 27 |
| Loading | `Opening…` | 1 | 8 |
| Wrong passcode | `That passcode didn't work — check it and try again.` | 10 | 51 |
| Service failure | `Backstage couldn't open — wait a moment and try again.` | 10 | 54 |
| Connection failure | `We couldn't reach Backstage — check your connection and try again.` | 11 | 66 |

These states name the failure or next step directly. They preserve the existing wrong-passcode
substring asserted by Playwright.

## Selected form-state copy

| State | Selected string | Words | Characters |
| --- | --- | ---: | ---: |
| Reference URL help | `Paste the web address for a reference.` | 7 | 38 |
| Feedback URL help | `A link is optional for feedback.` | 6 | 32 |
| Missing note | `Add a note before continuing.` | 5 | 29 |
| Long note | `Shorten the note and try again.` | 6 | 31 |
| Invalid URL | `Enter a web address that starts with http.` | 8 | 42 |
| Missing reference URL | `Add a web address for this reference.` | 7 | 37 |
| Loading | `Adding…` | 1 | 7 |
| Success | `Added to the shared list.` | 5 | 25 |
| Expired unlock | `Reload the page and open Backstage again.` | 7 | 41 |
| Invalid submission | `Check the entry and try again.` | 6 | 30 |
| Server failure | `The server couldn't save the entry — wait and try again.` | 11 | 56 |
| Connection failure | `We couldn't reach the server — check your connection and try again.` | 12 | 67 |

The fixed 422 message replaces both the current generic fallback and the unbounded
`That didn't go through: {issues}` form. Server issues are protocol validation details such as
JSON object shape, field types, and URL syntax; they are not suitable general visitor copy.

## Test design

Keep `tests/backstage-flow.spec.ts` unchanged unless implementation changes a selector it asserts.

The selected design intentionally retains all exact strings currently used as selectors:

- `Backstage`;
- `Shared passcode`;
- `Open backstage`;
- `Shared checklist` changes from `The shared checklist`, so update the focused-heading assertion;
- `Link`;
- `Say more`;
- `Add to the list`;
- `Delete entry {id}`;
- wrong-passcode substring remains stable.

One test selector change is therefore expected for the dashboard heading. This makes the copy
change explicit while preserving the same focus behavior and DOM hook.

Verification should include:

- a reproducible fixed-string word/character count audit;
- `npm run typecheck` for Astro/client script integrity;
- `npm run build` for generated public output;
- `npm run test:flow:backstage` for the phone interaction;
- `npm run leak:check` against the fresh build and a running local response endpoint;
- a targeted scan of built public assets for configured credential values;
- `git diff --check` and a scope audit.

## Security design

The safety meaning is carried by one fixed note:

`Don't paste passwords, keys, or other secrets here; send them securely instead.`

It contains both required parts:

- prohibited content: passwords, keys, and other secrets;
- safe next step: send them securely instead.

No passcode value, signing key, environment value, or secret-derived interpolation enters markup,
metadata, client source, test assertion, artifact, or log.

The passcode's storage and transmission behavior is unchanged.

## Rejected implementation changes

- no edit to `BaseLayout`;
- no CSS or token edit;
- no API or `src/lib` edit;
- no auth, cookie, session, or account change;
- no change to request headers or in-memory passcode handling;
- no rename of protocol option values;
- no new copy abstraction;
- no new copy linter;
- no screenshot/cold-read artifact, which belongs to `T-009-02-03`;
- no ticket phase/status edit.

## Acceptance mapping

| Acceptance requirement | Selected design response |
| --- | --- |
| `.note` conforms | One 12-word safety rule with safe next step |
| `.section-copy` conforms | Gate and dashboard paragraphs are 8 and 11 words |
| Intro lede conforms | One 7-word purpose sentence |
| Title/description conform | Name-only title and 11-word visitor metadata |
| Script strings conform | Full dynamic-state audit and bounded replacements |
| No insider self-reference | Remove `stakeholders`, `handing us`, and unnecessary team narration |
| Warn against secrets | Explicit `Don't paste ... secrets` note retained |
| Flow passes | Stable DOM/actions; one heading selector update |
| No public credential leak | No value introduced; build, leak check, and targeted scan |
