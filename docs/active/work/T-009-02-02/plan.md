# Plan — T-009-02-02 rewrite-index-copy-to-standard

## Objective

Conform every authored public-index copy surface to the canonical voice and length standard.

Preserve the `DEMO_NAME` and `PRIMARY_ACTION_LABEL` template slots exactly.

Keep the complete healthy and stalled demo flow passing.

Do not modify ticket phase or status frontmatter.

## Execution principles

Follow the selected page-local rewrite design.

Make only literal copy changes in the runtime page.

Keep one explanation per existing task area.

Verify numeric conformance and human-readable shape separately.

Use the existing behavior suite as the regression boundary.

Stage only ticket-owned files.

Commit each meaningful evidence unit after it passes its checks.

## Step 1 — Reconfirm the implementation baseline

Read the current `src/pages/index.astro` immediately before editing.

Check `git status --short` for concurrent changes.

Check the page diff to determine whether another process changed it after Research.

Record the exact template-slot declaration lines.

Confirm the current test constant still equals the primary-action slot.

Verification:

- `src/pages/index.astro` has no pre-existing unstaged diff;
- slot values match the Research artifact;
- no new user-facing surface has appeared;
- Lisa-owned frontmatter/provenance changes remain distinguishable.

If the page has acquired an overlapping concurrent edit, inspect and incorporate it without
discarding user work.

## Step 2 — Rewrite frontmatter copy

Change the `tagline` value to the selected verb-forward fragment.

Change the interpolated browser-title suffix to the same task language.

Change the metadata description to one short visitor-focused sentence.

Leave the template-slot block unchanged.

Verification:

- title continues to interpolate `DEMO_NAME`;
- browser title begins with the rendered display name;
- tagline is at most 8 words and 60 characters;
- title is at most 10 words and 70 characters at the expected slot value;
- description is at most 20 words and 150 characters;
- tagline is fragment-shaped;
- description contains one sentence.

## Step 3 — Rewrite the orientation section

Replace the generic eyebrow with the selected concrete task label.

Keep `{DEMO_NAME}` as the only `h1` content.

Keep `{tagline}` as the tagline content.

Replace the multi-sentence intro lede with the selected one-sentence page map.

Do not alter the section, heading ID, classes, or ordering.

Verification:

- eyebrow begins with `Try` and fits 4 words / 28 characters;
- `h1` remains slot-backed;
- intro lede fits 20 words / 120 characters;
- intro lede names both available actions once;
- no adjacent explanation is added.

## Step 4 — Rewrite the receipt task copy

Replace the receipt eyebrow with the direct signing action.

Replace the result heading with its shorter noun landmark.

Replace the four-part implementation narrative with the one-sentence key-boundary explanation.

Retain `Asking the server…` as the loading state.

Retain `Made at` as the timestamp label.

Replace `One-time tag` with `One-time ID`.

Replace `The server's signature` with `Server signature`.

Keep `{PRIMARY_ACTION_LABEL}` as the only button content.

Do not change the receipt comment, definition-list structure, values, or element IDs.

Verification:

- eyebrow fits 4 words / 28 characters and starts with `Watch`;
- heading fits 8 words / 60 characters;
- lede fits 20 words / 120 characters and is one sentence;
- lede preserves the browser/key safety fact;
- each data label fits 5 words / 32 characters;
- primary action declaration and rendering remain unchanged;
- receipt payload fields remain unchanged.

## Step 5 — Rewrite the team-note task copy

Keep `Leave a note` as the task eyebrow.

Replace the heading with the selected plain verb-forward heading.

Replace the two-sentence lede with the one-sentence contribution/access explanation.

Keep the existing backstage link text and destination.

Do not alter section IDs, classes, or DOM structure.

Verification:

- heading fits 8 words / 60 characters and starts with `Share`;
- lede fits 20 words / 120 characters;
- lede is one sentence;
- lede preserves contribution examples and the no-account fact;
- action link remains 6 words / 36 characters and starts with `Leave`;
- href remains `/backstage`.

## Step 6 — Rewrite the dynamic error state

Replace only the caught failure's rendered `textContent` literal.

Use one sentence that names the failure and advises retrying.

Keep initial and repeated loading writes aligned with the markup.

Leave internal thrown error strings unchanged.

Leave fetch, parsing, value writes, state hiding, and button re-arming unchanged.

Verification:

- error fits 14 words / 100 characters;
- error is one sentence;
- error uses plain visitor language;
- retry advice matches the existing button behavior;
- no internal diagnostic becomes visible.

## Step 7 — Inspect the runtime diff

Run a focused diff for `src/pages/index.astro`.

Classify every changed hunk as frontmatter copy, markup copy, or rendered script copy.

Search for the exact slot declarations.

Search for the removed descriptive tagline phrase.

Search for all remaining `.lede`, `.tagline`, receipt status, heading, and label surfaces.

Verification:

- no style hunk changed;
- no HTML element, attribute, route, ID, or class changed;
- no client control flow changed;
- `The starting line every demo inherits` is absent from the index;
- both slot lines are exact;
- all intended user-facing surfaces are accounted for.

## Step 8 — Run the copy-conformance audit

Use a read-only Node snippet to calculate whitespace-token words and Unicode code-point
characters for every final expected rendered string.

Include interpolated browser title at expected `DEMO_NAME` value.

Compare each result with its standard class ceiling.

Perform a separate manual shape review:

- name remains a noun and wayfinding landmark;
- task labels begin with concrete verbs;
- tagline is a fragment;
- ledes and status are single sentences;
- each task area has one explanation;
- technical terms are necessary and locally understandable;
- no template/repository/history narration remains;
- no instruction is repeated across adjacent elements.

Verification:

- every count is at or below both applicable maximums;
- no externally fixed exception is needed;
- manual author/reviewer checklist has no known failure.

## Step 9 — Run static project verification

Run `git diff --check` for the implementation and artifacts.

Inspect `package.json` for the repository's supported Astro validation commands.

Run the available build command.

If the repository exposes a type/check command, run it as well.

Verification:

- no whitespace errors;
- Astro parses and builds the page;
- TypeScript in the browser script remains valid;
- no generated build output is staged.

## Step 10 — Run the required healthy flow

Execute the healthy Playwright project for `tests/demo-flow.spec.ts`.

This covers:

- visible `Demo Runway` heading;
- initial signed receipt;
- hidden loading state after success;
- valid nonce and signature shapes;
- primary button under the preserved accessible name;
- fresh receipt after activation;
- re-enabled action after completion.

Verification:

- the healthy test passes within its named budgets;
- no locator or expected name requires modification.

## Step 11 — Run the stalled flow

Execute the stalled Playwright project for `tests/demo-flow.spec.ts`.

This covers:

- visible display-name heading;
- visible loading narration while the request never resolves;
- hidden receipt body;
- preserved accessible action name;
- disabled action after activation during the stalled request.

Verification:

- the stalled test passes within its named budgets;
- the retained loading string remains a visible state;
- no false receipt is shown.

## Step 12 — Write implementation progress

Create `progress.md` after the code and tests settle.

Document:

- completed plan steps;
- exact files changed;
- copy-count evidence;
- build and test commands/results;
- slot-preservation evidence;
- any deviations and rationale;
- remaining Review work;
- unrelated worktree state left untouched.

If a plan deviation becomes necessary, record it before continuing beyond the affected step.

## Step 13 — Commit meaningful units

Commit the completed preimplementation RDSPI artifacts as a planning unit.

After the runtime rewrite and verification pass, commit:

- `src/pages/index.astro`;
- `docs/active/work/T-009-02-02/progress.md`;
- any planned artifacts amended with corrected evidence.

Do not stage:

- ticket frontmatter;
- Lisa provenance;
- sibling ticket files;
- unrelated user changes;
- generated output or test reports.

For each commit:

- inspect staged name-status;
- run `git diff --cached --check`;
- use a ticket-scoped commit message;
- inspect the resulting commit.

## Step 14 — Review the completed diff

Diff the ticket commit range and final worktree against the implementation baseline.

Re-read the acceptance criterion word by word.

Audit every source change against the selected Design and Structure artifacts.

Check whether test coverage exercises each behavioral risk.

Identify human-review gaps honestly.

Verification:

- tagline is verb-forward and old phrase absent;
- all ledes conform;
- receipt labels and states conform;
- metadata conforms;
- script-rendered copy conforms;
- slots are untouched;
- required spec passes;
- no out-of-scope file is included.

## Step 15 — Write the Review handoff

Create `review.md` summarizing:

- outcome;
- files created, modified, and deleted;
- final copy map and counts;
- acceptance-criterion assessment;
- tests and checks run;
- coverage strengths and gaps;
- deviations;
- open concerns and TODOs;
- critical issues requiring human attention;
- exact unrelated worktree state.

Run a final artifact existence and line-count check.

Run a final `git diff --check` over ticket-owned changes.

Commit the Review artifact as the final handoff unit.

Stop after `review.md` is complete.

Lisa owns subsequent phase and status transitions.

## Test strategy summary

### Unit tests

No new unit test is warranted.

The change does not modify a pure function, schema, or data transformation.

Numeric conformance is verified by a read-only audit rather than production test machinery.

### Integration tests

`tests/demo-flow.spec.ts` is the ticket's required integration test.

Both healthy and stalled project variants are relevant.

The healthy variant protects the success path and repeated action.

The stalled variant protects visible loading and disabled-state behavior.

### Build verification

Astro build/check protects frontmatter, markup, and client-script parsing.

### Human review

The author/reviewer pass checks qualities counts cannot:

- kitchen-table plainness;
- action clarity;
- non-repetition;
- one-breath reading;
- glance-level orientation.

Phone/projector cold-read evidence remains owned by dependent ticket `T-009-02-03`.

## Completion criteria

All six RDSPI artifacts exist.

`src/pages/index.astro` contains only the selected copy changes.

Every in-scope rendered string conforms to its envelope.

`DEMO_NAME` is unchanged as a slot.

`PRIMARY_ACTION_LABEL` is unchanged as a slot.

The old descriptive tagline phrase is absent.

The required healthy and stalled demo-flow cases pass.

The Review artifact records test coverage and open concerns.

No ticket frontmatter field is manually changed.
