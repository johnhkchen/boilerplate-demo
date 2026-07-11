# Structure — T-008-03-01 unified dashboard page

## Change set

### Modify `src/pages/backstage.astro`

This remains the single stakeholder route and the only production file changed.

Frontmatter retains:

- `BaseLayout` import;
- page title and description;
- the shared entry-type option data.

Frontmatter copy changes from submit-only language to one unlocked workspace language.

### Markup regions

`#backstage-gate`

- visible on initial render;
- contains `#bs-unlock-form`;
- owns `#bs-passcode`, `#bs-unlock`, and `#bs-unlock-error`;
- describes page-memory-only lifetime;
- does not contain submission fields.

`#backstage-dashboard`

- hidden on initial render;
- labelled by a focusable dashboard heading;
- contains the submit and checklist regions;
- is the sole post-unlock surface.

`#backstage-form`

- retains type, URL, and text controls;
- contains no passcode field;
- retains validation error and submit button;
- no longer swaps into a separate confirmation panel.

`#backstage-list-region`

- contains polite `#bs-list-status`;
- contains assertive `#bs-list-error`;
- contains `#bs-empty` empty state;
- contains `#bs-entry-list` as the live checklist container.

### Client state

Private module state:

```ts
let unlockedPasscode = '';
let entries: BackstageEntryView[] = [];
```

`BackstageEntryView` mirrors the six-field public feed contract.

No state is attached to `window` or stored outside the module closure.

### Client helpers

`isRecord(value)`

- runtime narrowing for JSON values.

`isEntry(value)`

- validates id, type, URL/text/timestamps, and nullable completion.

`isFeed(value)`

- validates the feed envelope and every entry.

`headers(extra?)`

- produces the shared passcode header;
- optionally adds JSON content type;
- reads only `unlockedPasscode`.

`readFeed(passcode)`

- performs the gated GET;
- returns both response and parsed/validated data;
- supports unlock with a candidate before state is committed.

`refreshEntries(message?)`

- reads with the unlocked closure value;
- replaces canonical entries;
- renders the checklist;
- optionally announces success.

`renderEntries()`

- clears and rebuilds list DOM;
- toggles empty/list states;
- delegates each card to `renderEntry`.

`renderEntry(entry)`

- creates semantic DOM nodes;
- uses `textContent` for untrusted content;
- wires completion and delete handlers by stable id;
- creates a safe optional URL anchor.

`showUnlockError`, `showFormError`, `showListError`

- set scoped alert text and focus where appropriate.

`setListStatus`

- updates polite mutation/refresh status.

### Event flows

Unlock submit:

1. locally reject blank passcode;
2. disable unlock button;
3. GET feed with candidate passcode;
4. on wrong passcode remain locked;
5. on valid feed set closure state and entries;
6. clear password DOM value;
7. hide gate and reveal dashboard;
8. render entries and focus dashboard heading.

Entry submit:

1. validate type, URL, and text;
2. POST using closure passcode;
3. on 201 clear content inputs;
4. refresh canonical feed;
5. announce addition.

Completion:

1. react only to checking an incomplete entry;
2. disable addressed controls;
3. PATCH using closure passcode;
4. refresh canonical feed;
5. announce completion;
6. on failure restore via rerender and alert.

Deletion:

1. ask for native confirmation;
2. if accepted, disable addressed controls;
3. DELETE using closure passcode;
4. refresh canonical feed;
5. announce deletion;
6. on failure rerender and alert.

### Styles

Retain existing token-only invariant.

Add or adapt selectors for:

- `.gate-form` compact passcode layout;
- `.dashboard` and `.dashboard-section` vertical rhythm;
- `.section-heading` header/status grouping;
- `.entry-list` reset and grid;
- `.entry-card` inset/raised item boundary;
- `.entry-check` full-width checkbox label;
- `.entry-meta`, `.entry-text`, and `.entry-link` wrapping;
- `.entry-actions` action alignment;
- `.entry-card.is-complete` visible complete treatment;
- `.empty` successful empty state;
- shared alert/status presentation.

No hard-coded visual tokens are added beyond the existing 1px control border convention.

### Remove from `src/pages/backstage.astro`

- passcode field inside the submit form;
- submit-time passcode validation;
- post-submit confirmation panel;
- “Send another” behavior;
- comments describing the page as a submit-only form;
- CSS used only by confirmation detail rows.

## Modify `tests/backstage-flow.spec.ts`

Replace the submit-only scenario with the unified dashboard acceptance flow.

### Test setup

- remain restricted to `FLOW_PROJECT.backstage`;
- create unique markers per run;
- seed one pre-existing entry through POST before visiting the page;
- use the same `BACKSTAGE_PASSCODE` header for setup and final verification.

### Browser assertions

- page initially exposes passcode gate;
- submission controls and list are hidden initially;
- wrong passcode request returns 403;
- wrong attempt leaves dashboard hidden and shows refusal copy;
- correct unlock request returns 200;
- correct unlock reveals the dashboard and seeded entry;
- passcode field is cleared and hidden after unlock;
- submission requires no second passcode field;
- submitted marker appears in a rendered card;
- checking its checkbox sends PATCH and leaves it checked/disabled;
- second submitted marker appears;
- clicking its delete button and accepting confirmation sends DELETE;
- deleted marker disappears;
- first marker remains complete.

### Final API assertions

- feed contains seeded entry;
- completed marker has a non-null completion timestamp;
- deleted marker is absent;
- no credential beyond the original unlock was entered in the UI.

## Modify `tests/support/flow-contract.ts`

Update `BACKSTAGE_STEP` names to describe the unified flow:

- open locked dashboard;
- refuse wrong passcode;
- unlock and list existing entries;
- submit without second credential;
- complete from checklist;
- delete from checklist;
- confirm canonical store state.

Keep project names, passcode value, base URL, and budgets stable unless runtime evidence requires
an adjustment.

## Create workflow artifacts

`docs/active/work/T-008-03-01/research.md`

- codebase and boundary map.

`docs/active/work/T-008-03-01/design.md`

- options, decision, state model, and test strategy.

`docs/active/work/T-008-03-01/structure.md`

- this file-level blueprint.

`docs/active/work/T-008-03-01/plan.md`

- atomic execution sequence.

`docs/active/work/T-008-03-01/progress.md`

- implementation record, test evidence, deviations, and commits.

`docs/active/work/T-008-03-01/review.md`

- final handoff and coverage assessment.

## Files intentionally unchanged

- `src/lib/backstage-entry.ts`: settled public entry contract.
- `src/lib/backstage-retrieval.ts`: settled gated feed.
- `src/lib/backstage-route.ts`: settled collection POST.
- `src/lib/backstage-management.ts`: settled PATCH/DELETE behavior.
- all API Astro edges: already expose the required methods.
- `src/lib/backstage-store.ts`: no persistence change.
- migrations: no schema change.
- Wrangler config and generated types: bindings are unchanged.
- package scripts and lockfile: existing commands cover verification.
- ticket phase/status frontmatter and Lisa provenance: automation-owned.

## Change ordering

1. land the four pre-implementation artifacts;
2. replace page markup and state logic as one coherent production unit;
3. update flow names and browser acceptance in the same feature unit;
4. run focused browser verification and fix state/accessibility issues;
5. run full unit, type, build, leak, and diff gates;
6. record progress and commit implementation;
7. write review and commit the handoff artifact.

The page and its browser acceptance belong in one implementation commit because either side alone
would leave the branch with a knowingly stale contract.
