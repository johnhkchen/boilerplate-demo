# Research — T-009-02-01 rewrite backstage copy to standard

## Research scope

- Ticket: `docs/active/tickets/T-009-02-01.md`.
- Current ticket phase at session start: `research`.
- Runtime surface: `src/pages/backstage.astro`.
- Flow acceptance: `tests/backstage-flow.spec.ts`.
- Shared flow configuration: `tests/support/flow-contract.ts` and `playwright.config.ts`.
- Page shell: `src/layouts/BaseLayout.astro`.
- Binding authoring contract: `docs/knowledge/copy-voice-standard.md`.
- Workflow contract: `docs/knowledge/rdspi-workflow.md`.
- Story boundary: `docs/active/stories/S-009-02.md`.

This artifact is descriptive. It maps the current page, copy, behavior, tests, and constraints
before a rewrite is selected.

## Ticket requirement

The ticket names the backstage page as a regression and requires its user-facing copy to return
to the repository standard.

The acceptance criterion explicitly includes:

- the intro `.note`;
- every `.section-copy`;
- the intro lede;
- browser title and metadata description;
- user-facing strings authored in the inline client script;
- preservation of the warning not to paste secrets;
- no insider self-reference;
- a passing `tests/backstage-flow.spec.ts`;
- public copy free of passcode or secret values.

The ticket does not authorize changes to phase or status frontmatter. Lisa owns those fields.

## Binding copy standard

`docs/knowledge/copy-voice-standard.md` is the canonical contract for this ticket.

It applies to visible copy, accessible names, metadata, validation states, loading states,
success states, errors, empty states, and client strings rendered into the interface.

The four governing rules are:

1. use plain kitchen-table English;
2. keep each element within its classified word and character ceilings;
3. keep the short place or product name visible as wayfinding;
4. begin action labels with a specific verb.

The directly relevant ceilings are:

| Class | Maximum words | Maximum characters | Shape |
| --- | ---: | ---: | --- |
| Display name / `h1` | 5 | 40 | Name, not sentence |
| Page or section heading | 8 | 60 | One thought |
| Eyebrow | 4 | 28 | Fragment or task action |
| Tagline | 8 | 60 | Fragment |
| Button/action link | 6 | 36 | Specific opening verb |
| Field/option/data label | 5 | 32 | Familiar noun or question |
| Help text/option hint | 12 | 80 | One sentence |
| Lede/body/section paragraph | 20 | 120 | One sentence |
| Safety note | 20 | 120 | Rule and safe next step |
| Status/validation/error/empty | 14 | 100 | State or next step |
| Success/confirmation | 12 | 80 | One sentence |
| Browser title | 10 | 70 | Lead with page/product name |
| Metadata description | 20 | 150 | Visitor-focused sentence |
| Accessible description | 20 | 140 | Describe purpose |

The standard also allows only one explanation before a control in a task area, apart from a
necessary non-repeating field hint. A safety warning replaces optional explanation rather than
joining a stack of explanations.

The standard itself records the current backstage cluster as its calibration case:

- intro lede: 25 words / 132 characters, over both body limits;
- intro safety note: 25 / 149, over both safety limits;
- gate paragraph: 22 / 114, over the body word limit;
- the three adjacent explanations repeat unlock/passcode/session meaning.

## Page architecture

`src/pages/backstage.astro` is one static Astro page composed through `BaseLayout`.

Its frontmatter provides:

- `title`, passed to the document `<title>`;
- `description`, passed to `<meta name="description">`;
- two `entryTypes` option records with labels and hints.

Its markup contains two visitor states:

1. an intro plus locked gate shown initially;
2. a dashboard revealed after a successful gated feed read.

The inline module script owns all interactions. The current passcode remains in the variable
`unlockedPasscode` in page memory and is forwarded in the `x-demo-passcode` request header.

The script renders entry cards, statuses, confirmations, validation messages, loading labels,
and errors with `textContent`. It does not use HTML string insertion for visitor content.

The page-local style block controls layout only. Copy replacement does not require a CSS change.

## Base layout boundary

`src/layouts/BaseLayout.astro` contains no visitor-facing title or description literal.

It receives the page's `title` and optional `description` props and renders them into the head.
It also imports the shared token and base styles and supplies the responsive `.page` shell.

The story explicitly classifies `BaseLayout` as audited but not edited for this sweep.

## Static copy inventory: metadata and introduction

| Surface | Current rendered string | Classification | Current state |
| --- | --- | --- | --- |
| Title | `Backstage — one shared list for the room` | Browser title | Fits numeric ceiling; name plus description |
| Description | `A passcode-gated checklist where stakeholders and the team share references and feedback without accounts.` | Metadata | Fits numeric ceiling; uses stakeholder/account framing |
| Intro eyebrow | `You're on the list` | Eyebrow | Fits; phrase is not task-orienting |
| `h1` | `Backstage` | Display name | Fits and supplies wayfinding |
| Tagline | `One shared list, from first note to done.` | Tagline | Fits |
| Intro lede | `Unlock once ... No account and no second sign-in.` | Lede | Fails words, characters, and one-sentence shape |
| Intro note | `That passcode is a shared knock ...` | Safety note | Fails words and characters; preserves the required warning |

The `h1` is the short place name and appears in the browser title, satisfying the current
wayfinding relationship.

The intro lede and note sit together before the gate task. The lede explains unlock/account
behavior, while the note explains passcode risk and prohibited secret content.

## Static copy inventory: locked gate

| Surface | Current rendered string | Classification | Current state |
| --- | --- | --- | --- |
| Gate heading | `Open the backstage list` | Task heading | Fits; starts with action |
| Gate paragraph | `Use the passcode ... forgotten when you leave or reload.` | Section paragraph | Fails word ceiling |
| Field label | `Shared passcode` | Field label | Fits |
| Field help | `One unlock opens the whole checklist for this visit.` | Help text | Fits; repeats unlock/session explanation |
| Submit button | `Open backstage` | Button | Fits; specific verb and accurate result |

The intro lede, safety note, gate paragraph, and field help all appear before the same unlock
control. Four supporting strings currently explain overlapping aspects of one task.

## Static copy inventory: open dashboard

| Surface | Current rendered string | Classification | Current state |
| --- | --- | --- | --- |
| Dashboard eyebrow | `Backstage is open` | Status/eyebrow | Fits |
| Dashboard heading | `The shared checklist` | Section heading | Fits |
| Dashboard paragraph | `Add what the team should see ...` | Section paragraph | Fits at 19 words; lists three actions |
| Add heading | `Add something` | Task heading | Fits and begins with action |
| Fieldset legend | `What are you handing us?` | Field label/question | Fits; first-person team voice |
| Reference label | `A link or reference` | Option label | Fits |
| Reference hint | `A page, doc, or example you want the team to look at.` | Option hint | Fits at its ceiling |
| Feedback label | `A bit of feedback` | Option label | Fits |
| Feedback hint | `A thought, request, or comment. A link is optional.` | Option hint | Fits words/chars but has two sentences |
| URL label | `Link` | Field label | Fits |
| URL help | `Paste the web address for a reference.` | Help text | Fits and begins with action |
| Text label | `Say more` | Field label | Fits |
| Text help | `What is it, and what should the team know about it?` | Help text | Fits |
| Submit button | `Add to the list` | Button | Fits; specific verb |
| List heading | `What the team has` | Section heading | Fits; team-oriented wording |
| Empty state | `Nothing here yet. Add the first link or note above.` | Empty state | Fits ceiling; two sentences |
| List accessible name | `Backstage entries` | Accessible name | Fits and keeps place name |

The ticket names `.section-copy` as an affected surface. There are two such paragraphs: the gate
paragraph and dashboard paragraph.

## Script-rendered copy inventory: entry cards

- Checkbox accessible name: `Mark entry {id} complete`.
- Incomplete state: `Ready to review`.
- Completed state: `Complete`.
- Entry kind: `Link or reference` or `Feedback`.
- Entry metadata: `Added {localized time} · Entry {id}`.
- Delete button visible label: `Delete`.
- Delete button accessible name: `Delete entry {id}`.
- Completion loading status: `Completing entry {id}…`.
- Completion success: `Entry {id} is complete.`.
- Completion error: `That entry couldn't be completed just now — refresh or try again.`.
- Delete confirmation: `Delete entry {id}? This can't be undone.`.
- Delete loading label and status: `Deleting…` and `Deleting entry {id}…`.
- Delete success: `Entry {id} was deleted.`.
- Delete error: `That entry couldn't be deleted just now — refresh or try again.`.
- Count status: `{count} entry` or `{count} entries`.

Opaque identifiers and localized user data are excluded from the surrounding-label count by the
standard, but the authored label around each value remains in scope.

## Script-rendered copy inventory: unlock and form

- Missing passcode: `Pop in the passcode the team gave you.`.
- Unlock loading label: `Opening…`.
- Wrong passcode: `That passcode didn't work — check it with the team and try again.`.
- Open failure: `Backstage couldn't open just now — give it a moment and try again.`.
- Connection failure: `Couldn't reach backstage just now — check your connection and try again.`.
- Dynamic URL help: `Paste the web address for a reference.` or `A link is optional for feedback.`.
- Missing text: `Add a line or two so the team knows what this is.`.
- Long text: `That note is a bit long — trim it down and try again.`.
- Invalid URL: `That link should be a web address starting with http.`.
- Reference without URL: `A reference needs a link — paste the web address.`.
- Submit loading label: `Adding…`.
- Submit success: `Added to the shared list.`.
- Expired unlock: `This page is no longer unlocked — reload and open it again.`.
- Generic invalid submission: `That didn't go through — give it another look and resend.`.
- Server-provided validation: `That didn't go through: {issues}`.
- Server failure: `The server couldn't take it just now — give it a moment and resend.`.
- Connection failure: `Couldn't reach the server just now — check your connection and resend.`.

All fixed script strings fit their numeric class ceilings. The server-provided `issues` segment
is external runtime content; the authored prefix remains in scope. Several messages use indirect
phrasing such as “just now,” “give it a moment,” “didn't go through,” and “Pop in.”

## Behavior boundaries

Copy is interleaved with stable behavior, but the ticket is string-only.

The following identifiers and behaviors are load-bearing:

- `backstage-gate` and `backstage-dashboard` visibility transitions;
- `bs-unlock-form`, `bs-passcode`, and `bs-unlock` unlock flow;
- `dashboard-heading` focus after unlock;
- `backstage-form`, radio values, URL/text field IDs, and submit handler;
- `bs-list-status`, alert regions, empty state, and entry-list hooks;
- `reference` and `feedback` protocol values;
- four API paths/methods and `x-demo-passcode` request header;
- in-memory-only credential lifecycle;
- API response validation and entry rendering.

Changing those would exceed the story's explicit string-only scope.

## Test coverage and copy coupling

`tests/backstage-flow.spec.ts` runs only in the `backstage` Playwright project.

The project uses the Pixel 5 device preset, so its existing flow is already a phone-viewport
interaction test.

The spec asserts exact accessible names for:

- `Backstage` as the page heading;
- `Shared passcode` as the password field;
- `Open backstage` as the unlock button;
- `The shared checklist` as the focused dashboard heading;
- `Link` and `Say more` as fields;
- `Add to the list` as the submit button;
- `Delete entry {id}` as the delete action.

It asserts only a substring of the wrong-passcode error: `That passcode didn't work`.

Most prose, metadata, notes, and dynamic messages are not asserted. Copy-coupled selectors can
remain unchanged or the spec must be updated in the same implementation unit.

The flow also proves the wrong passcode is refused, the correct passcode unlocks once, the input
is cleared, no password input appears in the dashboard, and submit/complete/delete operations
reuse the in-memory credential.

## Leak-check boundary

`npm run leak:check` scans built client assets and a receipt response for the configured signing
secret. Its executable configuration does not currently scan for the backstage passcode.

The backstage flow config supplies a deterministic local test passcode from
`tests/support/flow-contract.ts`. The configured production/developer passcode remains server-side
and is not authored as page copy.

For this ticket, the relevant public-copy evidence is therefore two-part:

- run the established leak check after a build;
- inspect built public output for configured credential values and unsafe literal disclosure.

No credential value should be copied into an artifact, source change, or final report.

## Worktree and concurrency state

The branch is shared and was dirty before this ticket's work began.

Pre-existing changes include Lisa-owned ticket/provenance transitions and a sibling work directory
for `T-009-02-02`. That sibling ticket edits `src/pages/index.astro`, while this ticket edits
`src/pages/backstage.astro`, matching the story's intended parallel fan-out.

Only this ticket's page and work artifacts may be staged. Existing unrelated changes must remain
unstaged and unmodified.

## Research constraints

- Preserve the `Backstage` display name and route.
- Preserve the one-passcode, page-memory-only security behavior.
- Preserve the explicit “do not paste secrets here” safety meaning and a safe next step.
- Remove insider or builder-centered wording from affected copy.
- Keep every rendered string within both applicable ceilings.
- Keep one explanation around the unlock task rather than a compressed multi-string lecture.
- Keep action labels verb-forward and truthful.
- Audit all inline-script strings, not only the three known long paragraphs.
- Keep DOM hooks, handlers, API routes, protocol values, styles, and storage untouched.
- Keep the phone Playwright flow green.
- Build before running the established leak check, because it inspects `dist`.
- Do not edit ticket phase or status fields.
