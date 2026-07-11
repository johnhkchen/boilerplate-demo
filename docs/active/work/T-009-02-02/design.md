# Design — T-009-02-02 rewrite-index-copy-to-standard

## Decision summary

Rewrite the complete authored copy layer in `src/pages/index.astro` in place.

Keep the existing page sections, DOM hooks, behavior, styles, routes, and template slots intact.

Use one short visitor action per orientation string and one short explanation per task area.

Retain conforming copy where it is already the clearest expression of the real behavior.

Do not extract copy to a module or add an automated copy-lint system.

## Design drivers from Research

The index owns all of its page-specific copy in one Astro file.

The existing structure already separates three visitor tasks:

1. understand the demo;
2. watch and refresh a signed server note;
3. leave a thought for the team.

The structure exposes a useful orientation layer:

- display name;
- tagline;
- task eyebrows;
- primary action;
- dynamic receipt status.

No structural work is required to make those elements brief or legible.

The three ledes fail both numeric and one-sentence constraints.

The metadata description fails its word maximum.

The tagline and title suffix fit their counts but narrate the template rather than the action.

The receipt labels and dynamic states fit numerically but are named in ticket scope.

The primary heading and button are template slots with active Playwright coupling.

The later cold-read ticket owns combined device evidence, not this implementation ticket.

## Visitor and action model

The visitor is a person opening the demo to see whether its live boundary works and to respond to
the team.

The first action is to watch the server sign a note.

The second action is to request another signed note.

The third action is to leave a link, example, or feedback for the team.

The page must make the first and third actions visible without explaining the repository or the
template's history.

The receipt task must preserve one safety fact:

- the signing key remains outside the browser.

The note task must preserve one access fact:

- it does not require an account or sign-in.

The display name remains the stable wayfinding noun.

## Option A — Patch only objective failures

This option would change:

- the tagline;
- the browser-title suffix;
- the metadata description;
- the three over-limit ledes.

It would leave headings, eyebrows, receipt labels, and dynamic script strings untouched.

### Benefits

- smallest literal diff;
- every numeric failure can be eliminated;
- lowest risk of incidental test coupling;
- retains familiar existing wording.

### Costs

- does not fully address the acceptance criterion's receipt-copy and script-string sweep;
- keeps mixed language from two authoring passes;
- retains `Start here`, which is generic next-step language;
- misses the standard's required plain-language and glance review for conforming-length strings;
- treats the numeric envelope as the whole standard when the standard explicitly rejects that.

### Assessment

Viable as a limit-only patch, but incomplete against the ticket and author/reviewer contract.

## Option B — Page-local full copy sweep

This option reviews every authored, rendered string in the index and rewrites or retains it based
on its job.

It changes literals in place and preserves all HTML and script behavior.

### Benefits

- covers every acceptance-criterion surface;
- makes the three cards read as one coherent page;
- keeps the copy close to the markup and behavior that give it meaning;
- eliminates all known envelope failures;
- preserves exact template-slot declarations;
- keeps the behavioral test selectors stable;
- avoids new abstractions for one page's small copy set.

### Costs

- produces a broader literal diff than objective-failure-only editing;
- requires manual classification and counting;
- some currently conforming strings may change for voice consistency;
- human quality remains a judgment after numeric checks pass.

### Assessment

Best fit for the ticket and the repository's existing single-file page boundary.

## Option C — Extract a typed copy object

This option would move literals into a separate module or frontmatter object.

The Astro markup and browser script would consume named fields.

### Benefits

- centralized inventory;
- potential future reuse by tests or generated projects;
- easier mechanical enumeration of strings;
- possible path toward later copy checks.

### Costs

- introduces architecture not required by a copy-only ticket;
- makes nearby markup harder to read in isolation;
- browser-script literals require serialization or continued duplication;
- a test-imported copy object could couple behavior tests to prose;
- does not itself improve voice or length;
- conflicts with the story's narrow, page-local sweep.

### Assessment

Rejected because the present source boundary is already clear and no reuse requirement exists.

## Option D — Add an automated copy gate

This option would add a script or test that parses copy and checks envelope limits.

### Benefits

- repeatable numeric enforcement;
- future regressions could fail early;
- counted evidence could live with the code.

### Costs

- the canonical standard explicitly says no automated gate exists yet;
- Astro expressions and dynamic strings require classification metadata to avoid false results;
- numeric checks cannot enforce plainness, adjacency, breath, or glance quality;
- enforcement belongs to a later fleet-level decision, not this page rewrite;
- adds test and maintenance scope unrelated to the acceptance criterion.

### Assessment

Rejected for this ticket. A read-only count audit is sufficient implementation evidence.

## Selected approach

Choose Option B: a full page-local copy sweep.

This design uses the existing three-section information architecture.

It does not add, remove, split, or reorder explanations.

Each section keeps at most one lede.

The rewrite will keep the name and primary-action slot declarations byte-for-byte unchanged.

All IDs, ARIA relationships, routes, event handlers, and receipt payload mappings remain intact.

## Proposed copy contract

### Metadata and orientation

| Surface | Proposed rendered text | Count | Rationale |
| --- | --- | ---: | --- |
| Display name | `Demo Runway` | 2 / 11 | Preserved slot and wayfinding name |
| Browser title | `Demo Runway — Watch the server sign a note` | 9 / 42 | Name first; task second |
| Metadata | `Watch the server sign a fresh note, then leave one for the team.` | 13 / 64 | Both visitor actions in one sentence |
| Intro eyebrow | `Try the demo` | 3 / 12 | Specific task-oriented verb |
| Tagline | `Watch the server sign a note` | 6 / 28 | Verb-forward fragment |
| Intro lede | `Watch the server sign a fresh note, then leave a thought for the team.` | 14 / 70 | One-breath page map |

The browser title interpolates `DEMO_NAME` rather than duplicating its literal.

The tagline remains a frontmatter constant because the current page already uses that shape.

The tagline has no terminal punctuation so it reads as a fragment.

### Receipt task

| Surface | Proposed text | Count | Rationale |
| --- | --- | ---: | --- |
| Eyebrow | `Watch the server sign` | 4 / 21 | Names the visible task |
| Heading | `A fresh signed note` | 4 / 19 | Short result landmark |
| Lede | `The server signs each note with a key that stays out of your browser.` | 14 / 69 | Keeps the safety boundary only |
| Loading | `Asking the server…` | 3 / 18 | Existing clear state retained |
| Timestamp label | `Made at` | 2 / 7 | Existing familiar label retained |
| Nonce label | `One-time ID` | 2 / 11 | Replaces the less familiar `tag` |
| Signature label | `Server signature` | 2 / 16 | Removes unnecessary article/possessive |
| Button | `Ask for a fresh note` | 5 / 20 | Preserved slot; matches behavior |
| Error | `The server didn't answer, so try again.` | 7 / 39 | State plus safe next step, one sentence |

`Server signature` remains necessary vocabulary because the visible task is explicitly a signed
server note.

The nearby lede defines the key boundary once and does not repeat the button instruction.

The error advises retrying without prescribing a full page refresh; the existing button can
perform the retry.

### Team-note task

| Surface | Proposed text | Count | Rationale |
| --- | --- | ---: | --- |
| Eyebrow | `Leave a note` | 3 / 12 | Existing action label retained |
| Heading | `Share a thought with the team` | 6 / 29 | Plain verb-first destination |
| Lede | `Add a link, example, or feedback without an account or sign-in.` | 11 / 63 | Content examples and access fact |
| Link | `Leave a note for the team` | 6 / 25 | Existing truthful action retained |

The heading and link use different verbs because they do different orientation jobs:

- the heading names the broader task;
- the link names the navigation action.

The lede does not repeat the destination or narrate the people building the page.

## Adjacency review

The orientation card has one lede explaining both available page actions.

The receipt card has one lede explaining the signing-key boundary.

The team-note card has one lede explaining acceptable contribution types and access.

No task area gains a second paragraph, help string, or safety note.

The eyebrow, heading, lede, and action retain distinct jobs in each card.

## Slot-preservation design

The declarations remain:

```ts
const DEMO_NAME = 'Demo Runway';
const PRIMARY_ACTION_LABEL = 'Ask for a fresh note';
```

The `h1` continues to render `{DEMO_NAME}`.

The browser title continues to interpolate `DEMO_NAME`.

The button continues to render `{PRIMARY_ACTION_LABEL}`.

No new literal duplicates either slot value in page markup or script.

`tests/support/flow-contract.ts` therefore remains unchanged.

## Behavioral boundaries

The browser script retains the same loading, success, failure, and disabled-state transitions.

Only the rendered error literal changes in the script.

Internal thrown error strings remain unchanged because visitors never receive them.

The receipt endpoint and payload schema remain unchanged.

No CSS selector, ID, class, or ARIA attribute changes.

The backstage link route remains `/backstage`.

## Verification design

Run a rendered-string count audit against every proposed literal.

Check the source diff specifically for unchanged slot declarations.

Run Astro's project check/build command to catch page syntax or compile errors.

Run the complete `tests/demo-flow.spec.ts` across its healthy and stalled projects.

The ticket explicitly requires that spec to pass.

Inspect the page in both outcomes through existing Playwright behavior assertions.

Defer combined phone/projector screenshots and cross-page cold reading to `T-009-02-03`.

Run `git diff --check` before each commit.

## Rejected changes

No component extraction.

No new copy test framework.

No change to `DEMO_NAME`.

No change to `PRIMARY_ACTION_LABEL`.

No test selector update.

No receipt API or cryptographic terminology change outside visible labels.

No backstage copy change.

No styling or layout adjustment.

No ticket frontmatter edit.

## Expected result

The name remains immediately visible.

The tagline tells the visitor what to watch.

Every explanation fits in one sentence and one breath.

The receipt retains the browser/key safety meaning without implementation narration.

The team-note card retains contribution examples and the no-account boundary.

The dynamic error identifies what happened and the next safe action.

All changed strings fit both applicable numeric ceilings.

The established demo flow continues to prove the preserved slots and behaviors.
