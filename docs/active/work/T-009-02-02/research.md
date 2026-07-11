# Research — T-009-02-02 rewrite-index-copy-to-standard

## Research scope

This artifact maps the current public index copy before any rewrite.

The ticket starts in `research` and requires all remaining RDSPI phases.

The acceptance criterion names one implementation file:

- `src/pages/index.astro`.

It also names one required verification target:

- `tests/demo-flow.spec.ts`.

The requested change is limited to user-facing copy.

The ticket explicitly preserves two template slots:

- `DEMO_NAME`;
- `PRIMARY_ACTION_LABEL`.

The ticket explicitly includes:

- the tagline;
- ledes;
- receipt copy;
- metadata;
- browser-script strings.

No styling, receipt protocol, API, or backstage behavior is part of the criterion.

## Governing repository instructions

`AGENTS.md` points every agent to `CLAUDE.md` as the project source of truth.

Both root instruction files require the copy standard to be read before user-facing copy changes.

`docs/knowledge/rdspi-workflow.md` requires six continuous phases and one artifact per phase.

The workflow says ticket `phase` and `status` remain owned by Lisa.

The workflow also requires copy-changing Research to cite the standard and map every affected
user-facing surface before Design.

The binding source is `docs/knowledge/copy-voice-standard.md`.

Its four combined rules are:

1. use plain kitchen-table English;
2. keep every element within its classified word and character limits;
3. preserve names as wayfinding;
4. begin action labels with a specific verb.

The standard applies to visible text, accessible text, metadata, and dynamic interface states.

It excludes comments, internal errors, protocol names, and opaque generated values unless the
interface renders or announces them.

## Relevant length-envelope rows

The current index uses these standard classifications:

| Class | Word maximum | Character maximum | Shape |
| --- | ---: | ---: | --- |
| Display name / `h1` | 5 | 40 | Name, not description |
| Page or section heading | 8 | 60 | One thought |
| Eyebrow | 4 | 28 | Fragment; action for a task |
| Tagline | 8 | 60 | Fragment, not descriptive sentence |
| Button or action link | 6 | 36 | Specific verb first |
| Data label | 5 | 32 | Familiar noun or short question |
| Lede / paragraph | 20 | 120 | One sentence |
| Status / error | 14 | 100 | State or next step in one sentence |
| Browser title | 10 | 70 | Product or page name first |
| Metadata description | 20 | 150 | One visitor-focused sentence |

Both maximums are binding.

Words are whitespace-separated tokens.

Characters include punctuation and internal spaces after trimming.

Authored interpolation is counted at its expected rendered value.

User content and opaque identifiers are not counted as surrounding-label text.

The standard also limits each task area to one adjacent explanatory paragraph or safety note.

## Page assembly

`src/pages/index.astro` is an Astro page with frontmatter, markup, one browser script, and scoped
styles in the same file.

The frontmatter imports `BaseLayout`.

`BaseLayout` accepts optional `title` and `description` props.

It renders the title into `<title>` and the description into a metadata description tag.

`BaseLayout` does not add page-specific literal copy.

The index frontmatter declares the two generated-demo slots together near the top.

Current slot values are:

- `DEMO_NAME = 'Demo Runway'`;
- `PRIMARY_ACTION_LABEL = 'Ask for a fresh note'`.

The surrounding comment says generated demos derive both from the idea.

The current page derives a literal `tagline`, interpolated `title`, and literal `description`.

The markup contains three stacked `section` elements inside `main`.

Each section is labelled by a heading through `aria-labelledby`.

The middle receipt section additionally uses `aria-live="polite"`.

## Orientation section inventory

The first section exposes these rendered surfaces:

| Surface | Current rendered text | Class | Current result |
| --- | --- | --- | --- |
| Eyebrow | `Start here` | Eyebrow | Within numeric limits |
| `h1` | `Demo Runway` | Display name | 2 words / 11 chars |
| Tagline | `The starting line every demo inherits.` | Tagline | 6 / 38; sentence-shaped |
| Intro lede | `You've landed on a working demo page — live right now, and yours to try. Two things to do here: watch the card below get a freshly signed answer from the server, and further down, leave the team a note of your own.` | Lede | 43 / 214; two sentences |

The display name is already visible as the primary landmark.

The tagline is short enough numerically but describes the template rather than orienting the
visitor toward an action.

The intro lede exceeds both lede ceilings and contains two sentences.

It includes throat-clearing (`You've landed on`) called out by the standard.

It also narrates page liveness and layout before naming two visitor actions.

## Metadata inventory

The expected default browser title renders as:

`Demo Runway — the starting line every demo inherits`

It is 9 whitespace-separated tokens and 51 characters.

It leads with the display name and fits the numeric browser-title limits.

Its suffix repeats the same descriptive template sentence used by the tagline.

The metadata description is:

`A live demo page: watch the server answer with a freshly signed note, and leave the team a note of your own.`

It is 22 words and 108 characters.

It exceeds the metadata word ceiling by one word.

It is one sentence and describes both top-level visitor actions.

## Receipt section inventory

The receipt task area contains:

| Surface | Current text | Class | Count/result |
| --- | --- | --- | --- |
| Eyebrow | `Watch the server answer` | Eyebrow | 4 / 23; verb-first |
| Heading | `A signed note, made just now` | Section heading | 6 / 28 |
| Lede | Receipt explanation beginning `The page around this card...` | Lede | 49 / 242; three sentences |
| Loading state | `Asking the server…` | Status | 3 / 18 |
| Data label | `Made at` | Data label | 2 / 7 |
| Data label | `One-time tag` | Data label | 2 / 12 |
| Data label | `The server's signature` | Data label | 3 / 22 |
| Button | `Ask for a fresh note` | Button | 5 / 20; verb-first |

The receipt lede explains static delivery, the live request, signing, browser key isolation,
the returned result, and repeatability.

The adjacent code comment contains more detailed implementation and safety narration, but it is
not rendered and is outside the copy standard.

The receipt values are dynamic opaque values.

Their authored `<dt>` labels remain in scope.

The issued timestamp is localized in the browser.

The nonce and signature come from the API payload.

Those three values are not authored copy.

## Note section inventory

The final task area contains:

| Surface | Current text | Class | Count/result |
| --- | --- | --- | --- |
| Eyebrow | `Leave a note` | Eyebrow | 3 / 12; verb-first |
| Heading | `Pass the team a thought` | Section heading | 5 / 23 |
| Lede | `Got a link, an example, or a bit of feedback for the people building this? There's a page for that — no account, no sign-in.` | Lede | 25 / 124; two sentences |
| Link | `Leave a note for the team` | Action link | 6 / 25; verb-first |

The lede exceeds both applicable limits and uses two sentences.

The heading and link both identify the same note-sharing task.

The link navigates to `/backstage`.

Backstage copy and behavior belong to sibling ticket `T-009-02-01` and are not modified here.

## Browser-script inventory

`loadReceipt()` owns the receipt panel's dynamic visitor-facing states.

Before each request it writes `Asking the server…` and unhides the status.

On success it hides the status and reveals the receipt body.

On failure it writes:

`The server didn't answer just now — try a refresh.`

The error is 10 words and 50 characters.

It fits the status limits and is one sentence.

The script also creates internal error messages:

- `server answered ${res.status}`;
- `unexpected receipt response`.

Those messages are thrown and caught locally without being rendered, logged, or announced.

They are not user-facing surfaces under the standard.

The primary action is disabled during a request and re-enabled in `finally`.

No separate disabled-state label is authored.

## Test coupling

`tests/demo-flow.spec.ts` runs the page under `healthy` and `stalled` Playwright projects.

Both flows locate the page by its `Demo Runway` heading.

Both locate the primary button by `PRIMARY_ACTION_NAME` from `tests/support/flow-contract.ts`.

That shared constant is `Ask for a fresh note`, matching the template slot.

The healthy flow verifies receipt visibility, nonce/signature shape, action response, and re-arm.

The stalled flow verifies that loading remains visible and the receipt body remains hidden.

Neither test matches the tagline, ledes, metadata, receipt labels, or error text literally.

The tests therefore protect the two preserved slots and behavior while allowing surrounding copy
to change.

The ticket names `tests/demo-flow.spec.ts` as the required passing test.

The package shortcut `npm run test:flow` runs the healthy project only.

The spec itself contains both healthy and stalled-project cases.

## Dependency and ownership boundaries

`T-009-01-01` created the canonical standard.

Its review explicitly assigns index copy rewriting and runtime flow coverage to this ticket.

`T-009-01-02` wired the standard into the root and RDSPI read paths.

Its downstream evidence requirement names this ticket's Research citation and surface map.

`T-009-02-03` depends on this ticket and the backstage rewrite.

That later ticket owns combined projector, phone, leak, and full-flow cold-read evidence.

The story excludes changes to receipt APIs, storage, auth, CSS, and clay tokens.

## Repository state and constraints

The worktree was not clean at Research start.

Lisa-owned provenance and ticket frontmatter files were already modified.

The only diff in this ticket file changes `phase: ready` to `phase: research`.

That transition must remain unstaged and untouched by this work.

The implementation must preserve unrelated concurrent changes.

The workflow calls for incremental commits after meaningful implementation units.

Artifacts are part of the ticket work and are stored under this ticket's work directory.

## Research conclusions

The index is a single-file public surface with no component boundary needed to locate its copy.

All authored copy relevant to the ticket is local to `src/pages/index.astro`.

The only behavior-coupled literals are the `h1` name and primary action label.

Both are explicit slots and already conform numerically and structurally.

The present numeric failures are the metadata description and all three ledes.

The present shape failure is the descriptive-sentence tagline and its repeated title suffix.

The receipt and script states mostly fit numeric envelopes, but remain part of the required
plain-language author/reviewer pass.

The existing Playwright contract can verify behavior and slot preservation without test-copy
rewrites.

No externally fixed wording or documented exception applies to this page.
