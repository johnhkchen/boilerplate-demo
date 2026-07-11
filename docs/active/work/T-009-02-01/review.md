# Review — T-009-02-01 rewrite backstage copy to standard

## Outcome

The ticket is complete.

`src/pages/backstage.astro` now conforms to the binding copy voice and length standard across the
ticket-named static, metadata, accessible, and dynamic surfaces.

The named regression is removed:

- no two-paragraph passcode lecture;
- no descriptive-sentence browser title;
- no stakeholder/builder self-reference in visitor copy;
- no raw protocol validation issues shown to visitors;
- one direct safety note still says not to paste secrets and gives a safe next step.

The one-passcode checklist behavior, security boundary, DOM contract, API calls, storage, focus,
and responsive layout are unchanged.

## Visitor-visible result

The locked page now answers two questions quickly:

- what is this: a shared Backstage checklist for links and notes;
- what do I do: enter the shared passcode to open it.

The orientation layer is:

1. `Share with your team`;
2. `Backstage`;
3. `One shared list, from first note to done.`;
4. `Share links and notes in one checklist.`;
5. `Don't paste passwords, keys, or other secrets here; send them securely instead.`.

The gate then supplies one instruction: `Enter your shared passcode to open the list.`

The redundant “one unlock for this visit” help sentence was removed.

The open dashboard now uses:

- `Shared checklist`;
- `Add a link or note, then mark or delete each item.`;
- `What will you add?`;
- `On the list`.

Validation and failure states now use short direct actions such as `Enter`, `Add`, `Shorten`,
`Check`, and `Reload`.

## Binding standard applied

The implementation follows `docs/knowledge/copy-voice-standard.md`.

### Plain kitchen-table English

Pass.

Visitor copy no longer includes:

- stakeholder classification;
- account/sign-in narration;
- “shared knock” and “vault” metaphor;
- page-memory/reload implementation detail;
- “handing us” builder voice;
- raw JSON/type/protocol validation issues;
- indirect “just now,” “give it a moment,” and “didn't go through” phrasing.

The technical word `http` remains only in the actionable invalid-link state. The visitor needs it
to correct the field, so it meets the standard's necessary-term exception.

### Brevity

Pass.

A reproducible read-only count audit checked 62 fixed strings. All 62 fit both their applicable
word and character ceilings.

The known regression changed as follows:

| Surface | Before | After | Maximum | Result |
| --- | ---: | ---: | ---: | --- |
| Intro lede | 25 words / 132 chars | 7 / 39 | 20 / 120 | Pass |
| Safety note | 25 / 149 | 12 / 79 | 20 / 120 | Pass |
| Gate paragraph | 22 / 114 | 8 / 44 | 20 / 120 | Pass |

Other high-level final counts:

| Surface | Final | Maximum | Result |
| --- | ---: | ---: | --- |
| Browser title | 1 / 9 | 10 / 70 | Pass |
| Metadata description | 12 / 70 | 20 / 150 | Pass |
| Dashboard paragraph | 11 / 50 | 20 / 120 | Pass |
| Longest fixed error | 12 / 67 | 14 / 100 | Pass |

Every paragraph, safety note, hint, validation message, error, and confirmation now has one
sentence. Review caught that the initially retained delete confirmation had two sentences despite
fitting its numeric ceiling. The final `Delete entry {id} for good?` is one sentence, 4 authored
words / 22 characters around its opaque ID, and preserves the irreversible-action warning.

### Names as wayfinding

Pass.

`Backstage` remains the visible `h1`, is now the complete browser title, appears in metadata,
identifies the open status, and remains in the list's accessible name.

### Action-forward labels

Pass.

Buttons and task headings retain accurate verbs:

- `Open backstage`;
- `Add something`;
- `Add to the list`;
- `Delete`.

The new task eyebrow begins with `Share`. Loading variants begin with the corresponding action.
Names, field labels, option labels, and stable statuses remain nouns where the standard allows it.

### One explanation per task

Pass.

The prior cluster spread unlock/session explanation across lede, note, gate paragraph, and field
help.

The final strings have separate non-repeating roles:

- lede: page purpose;
- note: safety rule plus safe next step;
- gate paragraph: direct passcode instruction.

The repeated field help is gone. No string explains page-memory or reload behavior to the visitor.

## Acceptance criteria assessment

### `.note` conforms and preserves safety meaning

Pass.

The note is 12 words / 79 characters and one sentence. It explicitly prohibits passwords, keys,
and other secrets and says to send them securely instead.

### `.section-copy` conforms

Pass.

The two final paragraphs are:

- gate: 8 words / 44 characters;
- dashboard: 11 / 50.

Both are one sentence, plain, and below the 20 / 120 body ceiling.

### Intro lede conforms

Pass.

`Share links and notes in one checklist.` is 7 words / 39 characters and one sentence.

### Title and description metadata conform

Pass.

The title is the one-word place name rather than a descriptive sentence. The description is one
12-word visitor-focused action sentence.

Fresh built HTML assertions found both exact values.

### User-facing script strings conform

Pass.

All fixed dynamic strings were inventoried. Rewritten states fit the 14-word / 100-character
error/status ceiling or the tighter success/button ceiling.

The 422 branch no longer allows server-owned issue arrays to create unbounded technical copy.

### No insider self-reference

Pass.

The built Backstage page was checked for the old stakeholder, builder, and team-instruction
phrases and none were present.

Operator-only comments still mention runtime and implementation behavior. The canonical standard
explicitly excludes code comments from user-facing scope.

### `tests/backstage-flow.spec.ts` passes

Pass.

`npm run test:flow:backstage` passed its one Pixel 5 test and all six boxed flow steps in 4.3
seconds.

The only test-source change updates the expected focused heading from `The shared checklist` to
`Shared checklist`.

### No passcode or secret on public copy

Pass for browser-delivered output and live page/response surfaces.

After a fresh production build, the unchanged checker ran twice over `dist/client`:

1. configured signing secret marker plus live receipt response;
2. configured backstage passcode marker plus live Backstage page response.

Each run checked 5 client assets and 1 response body with zero findings. No credential value was
printed in evidence.

The built page also contains the new safety rule and omits the old lecture.

## Files modified

### `src/pages/backstage.astro`

- rewrote title and metadata;
- rewrote intro, safety, gate, dashboard, option, hint, and empty copy;
- removed one unreferenced passcode help paragraph;
- rewrote validation/error states;
- shortened the delete confirmation to one direct question;
- stopped rendering raw server validation issue strings.

### `tests/backstage-flow.spec.ts`

- updated one role-based focused-heading expectation.

## Files created

- `docs/active/work/T-009-02-01/research.md` — 298 lines;
- `docs/active/work/T-009-02-01/design.md` — 328 lines;
- `docs/active/work/T-009-02-01/structure.md` — 332 lines;
- `docs/active/work/T-009-02-01/plan.md` — 352 lines;
- `docs/active/work/T-009-02-01/progress.md` — 333 lines;
- `docs/active/work/T-009-02-01/review.md` — this handoff.

## Files deleted

None.

## Implementation commits

Sibling `T-009-02-02` commits landed between this ticket's commits on the shared branch, as the
story's parallel wave intended.

This ticket's commits before Review are:

- `e27ebe9` — Research;
- `a1c8f28` — Design;
- `963ae13` — Structure;
- `5740b2d` — Plan;
- `4c91ef5` — page and coupled test implementation;
- `8526992` — Implement progress and evidence;
- `5253d7b` — Review-discovered confirmation shape correction;
- `17f3006` — corrected Implement evidence.

Only `4c91ef5` and `5253d7b` change runtime/test source.

## Verification performed

### Copy contract

- 62 fixed strings classified and counted;
- 62/62 within both ceilings;
- manual plain-language pass;
- manual one-explanation/adjacency pass;
- manual wayfinding and action-label pass;
- fresh built-copy assertions for title, metadata, lede, safety, old-lecture absence, and insider
  phrase absence.

### Static and compile

- implementation `git diff --check` — passed;
- staged `git diff --cached --check` — passed;
- implementation `git show --check` — passed;
- `npm run typecheck` — passed across Astro, TypeScript, and Worker generated types;
- `npm run build` — passed and prerendered `/backstage/index.html`.

### Runtime

- `npm run test:flow:backstage` — passed before Review and again after the confirmation fix;
- wrong passcode refusal — passed;
- unlock/focus/credential clearing — passed;
- no second credential prompt — passed;
- add, complete, delete, and feed reflection — passed.

### Disclosure

- signing-secret marker over browser bundle + live response — passed;
- backstage-passcode marker over browser bundle + live page — passed;
- no marker value recorded in artifacts;
- owned dev server stopped after checking.

## Test coverage assessment

### Covered

- Astro and inline-script type integrity;
- production compilation and prerendering;
- phone viewport through the full backstage lifecycle;
- accessible selector/focus behavior;
- wrong credential refusal;
- credential input clearing and no second prompt;
- client bundle disclosure for both configured credential classes;
- live response disclosure;
- complete fixed-string numeric envelope;
- targeted built-copy semantics.

### Not run

- full `npm test` unit suite;
- complete `npx playwright test` across index healthy/stalled projects;
- deployed-URL smoke;
- projector screenshot/cold-read artifact;
- never-seen-it human read.

These gaps are proportionate to the ticket:

- no library, API, data, or server behavior changed, so unit contracts are unaffected;
- this ticket owns and passed the focused Backstage phone flow;
- `T-009-02-02` independently owns the index flow;
- `T-009-02-03` explicitly owns combined full Playwright, projector/phone screenshots, leak proof,
  and cold-read evidence;
- the epic's human counter read remains the honest human gate.

## Design and implementation deviations

### Known default leak-scope failure

The default `npm run leak:check` scans all of `dist` and failed because current Astro output copied
the development vars file into `dist/server/.dev.vars`.

Earlier repository work already documents this behavior. It was reproduced here and not hidden.

The acceptance surface is browser-delivered output, so the unchanged checker was rerun with its
supported `LEAK_CHECK_DIR=dist/client` configuration and exact out-of-band markers. Both browser
checks passed.

No leak checker, build configuration, or secret packaging code was changed because this story is
explicitly string-only.

### Raw 422 details removed

Design selected one fixed 422 message rather than shortening the prefix around raw `issues`.

This was necessary because server issues can be technical, multi-sentence, and unbounded. Client
validation already gives field-specific corrections for normal visitor input. Unexpected server
disagreement now yields a safe next step without protocol narration.

### Delete confirmation corrected during Review

Design retained the existing two-sentence delete confirmation because its numeric count fit and
its warning was useful. Review found that this missed the standard's one-sentence shape.

The confirmation changed to `Delete entry {id} for good?`. A focused shape/count check passed,
the Pixel 5 flow passed again, and no dialog handler or destructive-action behavior changed. The
Implement artifact was corrected to preserve this review trail rather than hiding the miss.

## Open concerns

### 1. Server build can contain development vars

High-priority repository concern, not introduced by this ticket.

Current Astro build behavior can place `.dev.vars` under `dist/server`. The default leak checker
flags it, and deployment tooling must continue to refuse or strip that file. The browser bundle is
clean, but treating the whole build tree as harmless would be unsafe.

### 2. Leak-check default does not match adapter layout

The checker calls everything under default `dist` a client asset, although this adapter separates
`dist/client` from `dist/server`. A follow-up should either default to `dist/client` for the browser
assertion or explicitly model server-package disclosure as a distinct surface.

This should not be fixed casually by ignoring `server/`; the `.dev.vars` packaging hazard still
needs a blocking deployment guard.

### 3. Copy conformance is not a committed automated test

The 62-string count audit is implementation evidence, not a repository tool. Future edits can
regress lengths unless authors follow the wired standard and reviewer pass.

This is consistent with the standard's current enforcement boundary. A future gate must not claim
to automate plainness or human cold-read judgment.

### 4. Fixed 422 message is intentionally less diagnostic

If client and server validation diverge, the visitor sees `Check the entry and try again.` rather
than a detailed protocol issue. This is safer and conforming but less specific. If a real visitor
hits this state, the better follow-up is a bounded mapping from server issue codes to field-level
visitor copy, not raw issue display.

### 5. Final cold read belongs to the next ticket

This session performed a source/built-output glance and the existing phone flow, but it did not
claim projector screenshot or never-seen-it-human evidence. `T-009-02-03` owns that combined proof
after both Backstage and index stop moving.

## Critical issues requiring immediate human attention

None introduced by this change.

The pre-existing `dist/server/.dev.vars` packaging concern is serious and should remain visible in
deployment review, but the ticket's browser/public-copy acceptance passes and this change does not
alter build or deployment behavior.

## Final scope audit

In scope and complete:

- Backstage metadata rewrite;
- static copy rewrite;
- safety-note compression;
- dynamic state rewrite;
- removal of raw server issue copy;
- one coupled test expectation;
- focused flow, type, build, count, and disclosure evidence;
- all RDSPI artifacts.

Correctly left out:

- auth, storage, API, and passcode handling changes;
- BaseLayout, CSS, and tokens;
- leak tooling and build-secret packaging;
- index copy and its tests;
- full-story screenshot/cold-read proof;
- automated copy enforcement;
- ticket phase/status edits.

Lisa advanced the ticket's frontmatter during the work. Those unstaged automation changes remain
Lisa-owned and were not included in any ticket commit.
