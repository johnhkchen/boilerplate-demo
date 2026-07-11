# Review — T-009-02-02 rewrite-index-copy-to-standard

## Outcome

The ticket is complete.

`src/pages/index.astro` now conforms to the canonical copy voice and length standard across:

- tagline;
- browser title;
- metadata description;
- all three ledes;
- task eyebrows and headings;
- receipt data labels;
- loading and error states;
- action labels.

The descriptive `the starting line every demo inherits` phrase is gone.

The replacement tagline is the verb-forward fragment `Watch the server sign a note`.

The template name and primary-action slots remain exact and in their original locations.

The required healthy and stalled `tests/demo-flow.spec.ts` cases pass.

## Files modified

### `src/pages/index.astro`

Changed visitor-facing literals only.

The runtime diff contains:

- shorter frontmatter metadata copy;
- a direct orientation eyebrow and tagline;
- one-sentence ledes for each page card;
- shorter receipt headings and data labels;
- a shorter dynamic error with a retry next step.

The diff does not change:

- template-slot declarations;
- HTML elements or ordering;
- IDs, classes, routes, or ARIA relationships;
- receipt payload handling;
- request or button-state control flow;
- scoped styles.

## Files created

RDSPI artifacts:

- `docs/active/work/T-009-02-02/research.md` — 320 lines;
- `docs/active/work/T-009-02-02/design.md` — 347 lines;
- `docs/active/work/T-009-02-02/structure.md` — 368 lines;
- `docs/active/work/T-009-02-02/plan.md` — 407 lines;
- `docs/active/work/T-009-02-02/progress.md` — 329 lines;
- `docs/active/work/T-009-02-02/review.md` — this handoff.

## Files deleted

None.

## Final copy map

### Page orientation and metadata

| Surface | Final text | Actual | Limit | Result |
| --- | --- | ---: | ---: | --- |
| Display name | `Demo Runway` | 2 words / 11 chars | 5 / 40 | Pass |
| Browser title | `Demo Runway — Watch the server sign a note` | 9 / 42 | 10 / 70 | Pass |
| Metadata | `Watch the server sign a fresh note, then leave one for the team.` | 13 / 64 | 20 / 150 | Pass |
| Eyebrow | `Try the demo` | 3 / 12 | 4 / 28 | Pass |
| Tagline | `Watch the server sign a note` | 6 / 28 | 8 / 60 | Pass |
| Lede | `Watch the server sign a fresh note, then leave a thought for the team.` | 14 / 70 | 20 / 120 | Pass |

The display name remains the primary wayfinding landmark.

The browser title leads with that same name.

The tagline is a fragment and begins with the action the visitor can observe.

The intro lede maps the two top-level tasks in one sentence.

### Receipt task

| Surface | Final text | Actual | Limit | Result |
| --- | --- | ---: | ---: | --- |
| Eyebrow | `Watch the server sign` | 4 / 21 | 4 / 28 | Pass |
| Heading | `A fresh signed note` | 4 / 19 | 8 / 60 | Pass |
| Lede | `The server signs each note with a key that stays out of your browser.` | 14 / 69 | 20 / 120 | Pass |
| Loading | `Asking the server…` | 3 / 18 | 14 / 100 | Pass |
| Data label | `Made at` | 2 / 7 | 5 / 32 | Pass |
| Data label | `One-time ID` | 2 / 11 | 5 / 32 | Pass |
| Data label | `Server signature` | 2 / 16 | 5 / 32 | Pass |
| Button | `Ask for a fresh note` | 5 / 20 | 6 / 36 | Pass |
| Error | `The server didn't answer, so try again.` | 7 / 39 | 14 / 100 | Pass |

The lede retains the necessary safety meaning: the signing key stays outside the browser.

It no longer narrates static files, implementation boundaries, page source, and repeat behavior
in one paragraph.

The receipt task contains one heading, one explanation, one result panel, and one action.

The error names the state and a safe next step in one sentence.

### Team-note task

| Surface | Final text | Actual | Limit | Result |
| --- | --- | ---: | ---: | --- |
| Eyebrow | `Leave a note` | 3 / 12 | 4 / 28 | Pass |
| Heading | `Share a thought with the team` | 6 / 29 | 8 / 60 | Pass |
| Lede | `Add a link, example, or feedback without an account or sign-in.` | 11 / 63 | 20 / 120 | Pass |
| Link | `Leave a note for the team` | 6 / 25 | 6 / 36 | Pass |

The lede preserves the useful contribution examples and access boundary.

It removes builder-focused narration and fits in one sentence.

The link remains a truthful verb-first navigation action.

## Acceptance criterion assessment

### Tagline fits the envelope

Pass.

The new tagline is 6 words and 28 characters against an 8-word/60-character limit.

It is a verb-forward fragment rather than a descriptive sentence.

### Ledes fit the envelope

Pass.

All three ledes are one sentence and under 20 words/120 characters:

- orientation — 14 / 70;
- receipt — 14 / 69;
- team note — 11 / 63.

The former ledes were 43 / 214, 49 / 242, and 25 / 124 respectively.

### Receipt copy fits the envelope

Pass.

The eyebrow, heading, explanation, three labels, loading state, action, and failure state all fit
their classified limits.

Necessary signing terminology remains because it identifies the result being demonstrated.

### Metadata fits the envelope

Pass.

The browser title is 9 / 42 and begins with `Demo Runway`.

The metadata description is 13 / 64 and names both visitor actions in one sentence.

### Script strings fit the envelope

Pass for visitor-facing script strings.

The script restores `Asking the server…` on each request and renders the 7-word retry error on
failure.

Internal thrown strings remain outside the interface and outside the copy standard's scope.

### Required phrase replacement

Pass.

Committed-source search finds no `starting line every demo inherits` phrase in the index.

The new tagline tells the visitor what to watch.

### Template slots remain untouched

Pass.

Committed source retains:

```ts
const DEMO_NAME = 'Demo Runway';
const PRIMARY_ACTION_LABEL = 'Ask for a fresh note';
```

The `h1`, browser title, and button continue to consume those slots as before.

No duplicate literal replaces slot-backed markup.

### `tests/demo-flow.spec.ts` passes

Pass.

Both applicable project variants completed successfully.

## Design-quality review

### Strengths

- The change matches the current page-local ownership boundary.
- The orientation layer can be read as name, task, primary action, and status at a glance.
- Each task area has one explanation rather than split or repeated reassurance.
- Copy distinguishes authored labels from opaque receipt values.
- The safety claim remains truthful to the existing receipt architecture.
- Retry language matches the actual still-available primary action.
- Test selectors remain based on stable slots and behavior rather than surrounding prose.
- No new abstraction or copy-lint mechanism was introduced for a one-page rewrite.

### Accepted tradeoffs

- `Server signature` remains a technical phrase, but the visitor needs it to understand the signed
  note and the nearby lede supplies the key context.
- The intro lede and metadata summarize the same two page actions for different surfaces; this is
  intentional orientation rather than adjacent on-page repetition.
- Manual counts and human review remain necessary because the repository has no automated copy
  gate.
- The page still contains detailed engineering comments, correctly outside visitor-facing scope.

## Verification performed

### Copy audit

A read-only Node audit counted 20 final rendered surface instances.

The count uses the standard's whitespace-token word rule and Unicode code-point characters.

All 20 passed both class maximums.

The initial markup and script loading states were counted separately because both author the same
rendered state at different moments.

The manual author/reviewer pass confirmed:

- plain visitor language;
- name-led wayfinding;
- verb-first task labels and actions;
- one-sentence explanations and statuses;
- one explanation per task area;
- no repository or template-history narration;
- no required external exception.

### Static and build checks

`npm run typecheck` passed:

- Astro checked 60 files;
- 0 errors;
- 0 warnings;
- 0 hints;
- TypeScript no-emit check passed;
- Worker generated-type check passed.

`npm run build` passed.

The build prerendered the public index and backstage page successfully.

`git diff --check` passed for the runtime and artifact changes before commits.

Both staged implementation inventories were inspected before committing.

### Integration flow

Command:

```sh
npx playwright test tests/demo-flow.spec.ts --project=healthy --project=stalled
```

Result:

- 2 passed;
- 2 intentionally skipped by project guards;
- 0 failed;
- 4.2 seconds.

The healthy flow covered initial receipt rendering, nonce/signature shape, fresh receipt on
activation, and action re-arming.

The stalled flow covered visible loading narration, hidden receipt content, and observable action
response while the server route remained unresolved.

## Test coverage assessment

Coverage is proportionate to a copy-only source change.

The integration spec protects the two untouched template-slot accessible names and all runtime
behavior adjacent to the changed copy.

Astro typecheck and build protect frontmatter, markup, and client-script syntax.

The copy audit protects objective length limits for all in-scope strings.

### Coverage gaps

The Playwright spec does not assert:

- exact tagline, lede, heading, label, or metadata prose;
- the caught error state's exact text;
- word or character limits automatically.

Those omissions are intentional:

- prose-coupled behavior tests would make harmless future rewrites noisy;
- the ticket's audit records exact conformance evidence;
- the standard states that automated counts cannot replace human judgment;
- `T-009-02-03` owns combined cold-read and device evidence after both public surfaces settle.

No new unit test was added because no function, schema, or data transformation changed.

The repository-wide unit suite and backstage Playwright flow were not run because this ticket
does not touch those paths; the named demo-flow spec, typecheck, and build are the relevant gates.

## Implementation commits

Ticket-owned commits are:

- `f0c708c docs(T-009-02-02): plan index copy rewrite`;
- `0b69109 feat(T-009-02-02): tighten public index copy`.

A concurrent sibling-ticket commit landed between them:

- `e27ebe9 docs(T-009-02-01): map backstage copy surface`.

That sibling commit is not part of this ticket's scope.

Review therefore inspected the two named ticket commits individually rather than treating the
interleaved contiguous range as ticket-owned.

## Deviations

No runtime implementation deviation from Design, Structure, or Plan occurred.

An optional explicit browser interception for the caught error path was not added.

The final error literal was directly counted, the client script compiled, and surrounding state
transitions passed integration coverage.

This leaves an acknowledged literal-rendering gap without changing the acceptance result.

## Open concerns

### Human cold read

This session performed the required author/reviewer glance and breath pass, but not a new-person
projector/phone screenshot study.

That combined evidence is explicitly owned by dependent ticket `T-009-02-03` after the backstage
and index rewrites are both complete.

### Existing tool warnings

Astro commands report a deprecated `session.driver` string signature.

Playwright also reports the existing `NO_COLOR`/`FORCE_COLOR` environment warning.

Neither warning was introduced by this copy change, and neither affected verification.

### Automated enforcement

There is still no repository copy linter.

That is the canonical standard's documented boundary, not missing scope from this ticket.

Future copy changes must continue to run the author/reviewer pass unless a later epic deliberately
adds suitable tooling.

## Critical issues

None.

No human intervention is required before Lisa advances the ticket.

## Unrelated worktree state

Lisa-owned modifications remain unstaged in:

- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-009-01-01.md`;
- `docs/active/tickets/T-009-01-02.md`;
- `docs/active/tickets/T-009-02-01.md`;
- `docs/active/tickets/T-009-02-02.md`.

The phase-only change in this ticket was not authored, staged, or committed here.

## Final handoff

All six RDSPI artifacts now exist.

The acceptance criterion is satisfied.

The runtime change is committed and verified.

The dependent combined cold-read ticket can proceed.

Lisa owns all subsequent ticket phase and status transitions.
