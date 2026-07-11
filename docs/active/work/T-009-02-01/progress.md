# Progress — T-009-02-01 rewrite backstage copy to standard

## Implement outcome

Implementation is complete.

Backstage now presents one short orientation, one explicit safety rule, one gate instruction, and
short visitor-owned dashboard states. The one-passcode checklist behavior is unchanged.

Implementation commits:

`4c91ef5 feat(T-009-02-01): conform backstage copy`

`5253d7b fix(T-009-02-01): shorten delete confirmation`

## Completed plan steps

### 1. Baseline captured

Complete.

Before editing, both implementation targets were clean relative to `HEAD`:

- `src/pages/backstage.astro`;
- `tests/backstage-flow.spec.ts`.

The worktree already contained Lisa-owned changes to provenance and ticket frontmatter. Those
paths remained unstaged and were not edited by this implementation.

### 2. Metadata and intro rewritten

Complete.

Changes in `src/pages/backstage.astro`:

- browser title: descriptive sentence reduced to `Backstage`;
- metadata: rewritten as one visitor-action sentence;
- eyebrow: rewritten as `Share with your team`;
- `h1`: retained as `Backstage`;
- tagline: retained because it already fits the tagline class;
- lede: reduced from 25 words / 132 characters and two sentences to 7 / 39 and one sentence;
- safety note: reduced from 25 / 149 and two sentences to 12 / 79 and one sentence.

The new note explicitly says not to paste passwords, keys, or other secrets and tells the visitor
to send them securely instead.

### 3. Locked gate simplified

Complete.

- Gate heading retained: `Open the backstage list`.
- Gate paragraph reduced from 22 words to 8 words.
- Passcode label and submit button retained.
- Redundant `One unlock ... for this visit` field help removed.

No password-input attribute, form ID, alert region, DOM hook, or unlock handler changed.

### 4. Dashboard orientation rewritten

Complete.

- Dashboard heading shortened to `Shared checklist`.
- Dashboard paragraph replaced with one 11-word action summary.
- Builder-centered `What are you handing us?` replaced with `What will you add?`.
- Reference and feedback options shortened and converted to one-sentence hints.
- Text help rewritten as `Describe what it is and why it matters.`.
- List heading shortened to `On the list`.
- Empty state reduced to one action sentence.

Field IDs, radio values, action buttons, live regions, entry-list accessible name, and forms are
unchanged.

### 5. Client-rendered states rewritten

Complete.

Short replacements cover:

- completion failure;
- deletion failure;
- missing passcode;
- wrong passcode;
- open/service failure;
- unlock connection failure;
- missing note;
- long note;
- invalid URL;
- missing reference URL;
- expired unlock;
- invalid submission;
- save failure;
- save connection failure.

Loading labels, confirmations, entry card statuses, counts, and accessible entry actions that
already conformed were retained.

The 422 branch no longer renders joined server `issues` text. It shows the fixed visitor-owned
message `Check the entry and try again.` and keeps focus behavior unchanged.

Removing the issue renderer also removed its now-unused response parse/narrow/join block. Server
validation and response shapes were not changed.

### 6. Copy-coupled test updated

Complete.

`tests/backstage-flow.spec.ts` now expects the focused dashboard heading name
`Shared checklist`.

All other selectors and behavior assertions remain unchanged.

### 7. Fixed-string count audit run

Complete and green.

A read-only Node audit classified and counted 62 fixed rendered strings across:

- title and metadata;
- static intro/gate/dashboard copy;
- headings, labels, hints, and controls;
- accessible list and entry-action names;
- entry statuses and confirmations;
- unlock validation/loading/error states;
- add-form validation/loading/success/error states.

Result:

`62/62 fixed strings within envelope`

The audit used whitespace-separated tokens and Unicode code-point character counts. Opaque IDs,
localized times, counts, URLs, and user content were excluded from surrounding-label counts as
required by the standard.

Key final counts:

| Surface | Final | Maximum | Result |
| --- | ---: | ---: | --- |
| Browser title | 1 word / 9 chars | 10 / 70 | Pass |
| Metadata | 12 / 70 | 20 / 150 | Pass |
| Intro lede | 7 / 39 | 20 / 120 | Pass |
| Safety note | 12 / 79 | 20 / 120 | Pass |
| Gate paragraph | 8 / 44 | 20 / 120 | Pass |
| Dashboard paragraph | 11 / 50 | 20 / 120 | Pass |
| Longest fixed error | 12 / 67 | 14 / 100 | Pass |

The orientation layer was also manually reviewed for shape and adjacency. Purpose, safety, and
gate instruction each have one distinct job; the old multi-string unlock lecture is gone.

During Review, the retained delete confirmation exposed a gap in this first manual shape pass: it
fit the numeric status ceiling but contained two sentences. It was replaced with the one-sentence
question `Delete entry {id} for good?`, which is 4 authored words / 22 characters around the
opaque ID. The focused flow was rerun and passed. The numeric result remains 62/62, and the final
shape review now passes.

### 8. Static and type checks run

Complete and green.

`git diff --check -- src/pages/backstage.astro tests/backstage-flow.spec.ts`

- exit 0;
- no whitespace errors.

`npm run typecheck`

- Astro checked 60 files;
- 0 errors;
- 0 warnings;
- 0 hints;
- TypeScript no-emit check passed;
- generated Worker types were current.

Astro printed the repository's existing deprecated `session.driver` signature notice. It did not
fail the check and is unrelated to this copy change.

### 9. Backstage phone flow run

Complete and green.

Command:

`npm run test:flow:backstage`

Result:

- 1 Playwright test passed;
- 6 boxed steps passed;
- test duration 815 ms;
- total run duration 4.3 s;
- device project: Pixel 5.

The flow proved:

1. locked Backstage loads;
2. wrong passcode is refused;
3. correct passcode unlocks and focuses `Shared checklist`;
4. passcode input is cleared;
5. dashboard contains no second password field;
6. adding an entry succeeds;
7. completing an entry succeeds;
8. deleting an entry succeeds;
9. the gated feed reflects each transition.

Only the six named `BACKSTAGE_STEP` boxes are reported; the last three proof points occur within
those action boxes.

### 10. Build and disclosure checks run

Complete, with one known tooling caveat documented below.

`npm run build`

- passed;
- `/backstage/index.html` prerendered;
- Cloudflare server output built;
- fresh browser output written under `dist/client`.

#### Default leak-check attempt

The first `npm run leak:check` used its default `LEAK_CHECK_DIR=dist` and failed because Astro
copies the repository's development vars file into `dist/server/.dev.vars`.

This is a known repository hazard documented by earlier tickets. It is not browser output and was
not introduced by this change, but the failure is real for the default directory and is not
reported as a pass.

Changing leak-check defaults or build secret packaging is outside this string-only ticket.

#### Browser-bundle signing-secret check

The unchanged leak command was rerun with:

- `LEAK_CHECK_DIR=dist/client`;
- a live local receipt response;
- the configured signing secret supplied out of band.

Result:

- passed;
- 5 client assets checked;
- 1 response body checked;
- 0 findings.

#### Browser-bundle backstage-passcode check

The same unchanged checker was run a second time with:

- `LEAK_CHECK_DIR=dist/client`;
- the configured backstage passcode used as the out-of-band marker;
- the live `/backstage` page used as the response surface.

Result:

- passed;
- 5 client assets checked;
- 1 response body checked;
- 0 findings.

No credential value was printed or copied into an artifact.

#### Built-copy assertions

Fresh `dist/client/backstage/index.html` passed targeted checks for:

- name-only title;
- visitor-focused metadata;
- compressed lede;
- explicit secret safety rule;
- absence of the old unlock lecture;
- absence of stakeholder, builder, and team-instruction phrases named in the sweep.

The owned local server was stopped after the checks.

### 11. Implementation committed

Complete.

Only these paths were staged:

- `src/pages/backstage.astro`;
- `tests/backstage-flow.spec.ts`.

`git diff --cached --check` passed.

Commit `4c91ef5` contains:

- 37 insertions;
- 55 deletions;
- 2 modified files.

`git show --check` passed.

Review then produced the small corrective commit `5253d7b`, changing only the delete-confirmation
literal in `src/pages/backstage.astro`. Its focused string check and `git show --check` passed.

## Plan deviations

### Leak-check scope clarification

The Plan called for the established leak check against fresh output and a separate silent
credential scan.

The default command's stale `dist` scope encountered the known server `.dev.vars` packaging issue.
Implementation therefore recorded that red result and used the checker's existing
`LEAK_CHECK_DIR` configuration to run the intended browser-surface assertion twice, once per
credential class.

This is not a source-code deviation and no check was weakened: browser assets and live responses
were scanned with exact configured markers. The server-package hazard remains open.

### No separate raw credential-scanner command

The two exact-marker leak-check runs subsumed the planned silent `dist/client` credential scan and
also covered live response bodies. A separate duplicate recursive scanner was unnecessary.

### No test expansion for the safety sentence

The Plan did not require a new committed copy assertion. The fixed-string audit and built-output
check directly verified the note. The canonical standard intentionally retains human review rather
than adding a one-page automated voice gate.

### Review-discovered confirmation shape correction

Design and the initial implementation retained `Delete entry {id}? This can't be undone.` because
it was short and preserved destructive-action meaning. Review correctly found that it violated
the status/confirmation one-sentence shape even though it passed numeric limits.

The final copy is `Delete entry {id} for good?`. It remains direct, preserves the irreversible
meaning in kitchen-table English, fits the envelope, and passed a fresh phone flow. No handler or
dialog behavior changed.

## Files modified in Implement

- `src/pages/backstage.astro`;
- `tests/backstage-flow.spec.ts`.

## Files created in Implement

- `docs/active/work/T-009-02-01/progress.md`.

## Files deleted in Implement

None.

One unreferenced `.help` paragraph was removed from the Astro markup; no file was deleted.

## Remaining work

- inspect the complete ticket commit range;
- assess acceptance criteria against final source and evidence;
- document test gaps and the default leak-scope hazard;
- write and commit `review.md`.

No implementation task remains.
