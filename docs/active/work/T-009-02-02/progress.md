# Progress — T-009-02-02 rewrite-index-copy-to-standard

## Current state

Implementation is complete.

The public index copy has been rewritten in place.

All planned static, build, type, and flow checks pass.

Review remains after this artifact and the implementation commit.

## Completed phase artifacts

- `research.md` — complete;
- `design.md` — complete;
- `structure.md` — complete;
- `plan.md` — complete;
- `progress.md` — complete with this update;
- `review.md` — remains.

## Planning unit commit

The four preimplementation artifacts were committed as:

`f0c708c docs(T-009-02-02): plan index copy rewrite`

The staged inventory contained only:

- `docs/active/work/T-009-02-02/research.md`;
- `docs/active/work/T-009-02-02/design.md`;
- `docs/active/work/T-009-02-02/structure.md`;
- `docs/active/work/T-009-02-02/plan.md`.

`git diff --cached --check` passed before that commit.

Lisa-owned ticket and provenance changes remained unstaged.

## Plan execution

### Step 1 — Baseline reconfirmation

Complete.

`src/pages/index.astro` had no pre-existing diff immediately before implementation.

The page still exposed the same copy surfaces mapped in Research.

The exact slot declarations were present:

```ts
const DEMO_NAME = 'Demo Runway';
const PRIMARY_ACTION_LABEL = 'Ask for a fresh note';
```

`tests/support/flow-contract.ts` still used `Ask for a fresh note` as the primary-action name.

No overlapping user or concurrent-agent edit needed reconciliation.

### Step 2 — Frontmatter copy

Complete.

Changed:

- tagline;
- interpolated browser-title suffix;
- metadata description.

The title continues to interpolate `DEMO_NAME`.

The slot block and its comments are unchanged.

### Step 3 — Orientation section

Complete.

Changed:

- `Start here` to `Try the demo`;
- the 43-word/two-sentence intro lede to a 14-word sentence.

Preserved:

- section structure;
- `aria-labelledby="title"`;
- `h1#title`;
- `{DEMO_NAME}` rendering;
- `{tagline}` rendering.

### Step 4 — Receipt task

Complete.

Changed:

- task eyebrow;
- result heading;
- 49-word/three-sentence receipt lede;
- nonce data label;
- signature data label.

Retained:

- `Asking the server…` loading state;
- `Made at` label;
- `{PRIMARY_ACTION_LABEL}` button content;
- all receipt IDs and payload fields;
- definition-list structure;
- engineering-only implementation comment.

The new lede keeps the essential browser/key safety boundary in one sentence.

### Step 5 — Team-note task

Complete.

Changed:

- section heading;
- 25-word/two-sentence lede.

Retained:

- `Leave a note` eyebrow;
- `Leave a note for the team` action link;
- `/backstage` destination;
- section semantics and IDs.

The new lede keeps contribution examples and the no-account/no-sign-in fact.

### Step 6 — Dynamic error state

Complete.

Changed the rendered caught-error string to:

`The server didn't answer, so try again.`

The new state is one sentence, 7 words, and 39 characters.

The script's loading literal, internal diagnostic errors, request behavior, DOM writes, and button
state transitions are unchanged.

### Step 7 — Runtime diff inspection

Complete.

The focused diff contains only visitor-facing literals and source wrapping around those literals.

No style hunk changed.

No HTML element, attribute, route, ID, class, or client control-flow statement changed.

The phrase `starting line every demo inherits` is absent from `src/pages/index.astro`.

Both exact slot declaration lines remain present.

### Step 8 — Copy-conformance audit

Complete.

A read-only Node audit used whitespace-separated words and Unicode code-point characters.

All final expected rendered strings passed:

| Surface | Class | Actual | Maximum | Result |
| --- | --- | ---: | ---: | --- |
| `Demo Runway` | Display name | 2 / 11 | 5 / 40 | Pass |
| Browser title | Browser title | 9 / 42 | 10 / 70 | Pass |
| Metadata description | Metadata | 13 / 64 | 20 / 150 | Pass |
| `Try the demo` | Eyebrow | 3 / 12 | 4 / 28 | Pass |
| Tagline | Tagline | 6 / 28 | 8 / 60 | Pass |
| Intro lede | Lede | 14 / 70 | 20 / 120 | Pass |
| Receipt eyebrow | Eyebrow | 4 / 21 | 4 / 28 | Pass |
| Receipt heading | Heading | 4 / 19 | 8 / 60 | Pass |
| Receipt lede | Lede | 14 / 69 | 20 / 120 | Pass |
| Loading state | Status | 3 / 18 | 14 / 100 | Pass |
| `Made at` | Data label | 2 / 7 | 5 / 32 | Pass |
| `One-time ID` | Data label | 2 / 11 | 5 / 32 | Pass |
| `Server signature` | Data label | 2 / 16 | 5 / 32 | Pass |
| Primary action | Button | 5 / 20 | 6 / 36 | Pass |
| Note eyebrow | Eyebrow | 3 / 12 | 4 / 28 | Pass |
| Note heading | Heading | 6 / 29 | 8 / 60 | Pass |
| Note lede | Lede | 11 / 63 | 20 / 120 | Pass |
| Backstage link | Action link | 6 / 25 | 6 / 36 | Pass |
| Script loading state | Status | 3 / 18 | 14 / 100 | Pass |
| Script error state | Status | 7 / 39 | 14 / 100 | Pass |

The duplicate loading row is intentional: the markup supplies the initial state and the script
restores the same state on each request.

Manual shape review also passed:

- name remains a noun landmark;
- title begins with the name;
- tagline is a verb-forward fragment;
- task labels use `Try`, `Watch`, `Ask`, `Share`, `Add`, or `Leave` where action-oriented;
- every lede is one sentence;
- each card has one explanatory paragraph;
- the error names the state and next step in one sentence;
- no visitor copy narrates the repository or template history;
- no external-wording exception is required.

### Step 9 — Static project verification

Complete.

`git diff --check -- src/pages/index.astro` passed.

`npm run typecheck` passed.

The typecheck result covered:

- `astro check` — 60 files, 0 errors, 0 warnings, 0 hints;
- `tsc --noEmit` — passed;
- `wrangler types ... --check` — generated Worker types are current.

`npm run build` passed.

Astro built the server and prerendered `/index.html` and `/backstage/index.html`.

The commands emitted the repository's existing deprecated `session.driver` signature notice.

That warning is unrelated to this copy-only change and did not affect either command.

### Step 10 — Healthy flow

Complete.

Command:

```sh
npx playwright test tests/demo-flow.spec.ts --project=healthy --project=stalled
```

The healthy project's applicable test passed.

It proved:

- the `Demo Runway` heading remains visible;
- a signed receipt appears;
- loading hides after success;
- nonce and signature values retain their shapes;
- the preserved accessible action exists and is enabled;
- activation returns a fresh nonce;
- the action re-arms after completion.

### Step 11 — Stalled flow

Complete in the same command.

The stalled project's applicable test passed.

It proved:

- the display-name heading remains visible;
- loading narration remains visible while the route never answers;
- the receipt body remains hidden;
- the preserved accessible action responds by becoming disabled.

Combined Playwright result:

- 2 passed;
- 2 skipped by the spec's intentional project guards;
- duration 4.2 seconds.

Playwright emitted existing `NO_COLOR`/`FORCE_COLOR` and Astro session-driver warnings.

No test failure or retry occurred.

## Files changed in implementation

### Modified

- `src/pages/index.astro` — page-local visitor copy only.

### Created

- `docs/active/work/T-009-02-02/progress.md` — this evidence record.

### Deleted

- none.

### Audited but not modified

- `tests/demo-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `src/layouts/BaseLayout.astro`;
- `docs/knowledge/copy-voice-standard.md`.

## Deviations from Plan

No implementation-scope deviation occurred.

The selected copy and file boundaries match Design and Structure.

The Plan allowed an explicit browser-error-path interception as optional evidence.

That optional check was not added because:

- the script literal was statically counted;
- Astro typecheck compiled the client script;
- existing integration coverage protects the surrounding loading/success/stalled transitions;
- a new prose-coupled expectation would not improve the ticket's behavioral contract.

This is a documented coverage boundary, not an incomplete required step.

## Remaining work

1. stage only `src/pages/index.astro` and `progress.md`;
2. run cached-diff checks and commit the implementation unit;
3. review the committed diff against the acceptance criterion;
4. write `review.md` with coverage and open concerns;
5. commit the Review artifact;
6. stop without editing ticket phase or status.

## Unrelated worktree state

Lisa-owned files were modified before implementation and remain outside this ticket's staging:

- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-009-01-01.md`;
- `docs/active/tickets/T-009-01-02.md`;
- `docs/active/tickets/T-009-02-01.md`;
- `docs/active/tickets/T-009-02-02.md`.

Those files are not implementation deliverables and must remain automation-owned.
