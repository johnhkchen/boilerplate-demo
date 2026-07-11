# Structure — T-009-02-02 rewrite-index-copy-to-standard

## Blueprint summary

The implementation changes one runtime source file and creates the remaining ticket artifacts.

The page architecture remains unchanged.

Copy literals stay beside the markup or state transition that renders them.

No new runtime module, component, style, route, dependency, or test helper is introduced.

## File inventory

### Runtime file modified

- `src/pages/index.astro`

### Test files modified

- none expected;
- `tests/demo-flow.spec.ts` is exercised, not edited;
- `tests/support/flow-contract.ts` is audited, not edited.

### Work artifacts created

- `docs/active/work/T-009-02-02/research.md`;
- `docs/active/work/T-009-02-02/design.md`;
- `docs/active/work/T-009-02-02/structure.md`;
- `docs/active/work/T-009-02-02/plan.md`;
- `docs/active/work/T-009-02-02/progress.md`;
- `docs/active/work/T-009-02-02/review.md`.

### Files deleted

- none.

### Files explicitly untouched

- `docs/active/tickets/T-009-02-02.md` frontmatter;
- `.lisa/provenance.jsonl`;
- `src/layouts/BaseLayout.astro`;
- `src/pages/api/receipt.ts`;
- `src/lib/receipt.ts`;
- `src/pages/backstage.astro`;
- `src/styles/base.css`;
- `src/styles/tokens.css`;
- `tests/support/flow-contract.ts`;
- all package and deployment configuration.

## Existing page boundary

`src/pages/index.astro` remains a four-part Astro source file:

1. server/frontmatter declarations;
2. static HTML-like page markup;
3. client-side receipt script;
4. page-scoped styles.

This ticket touches only the first three parts where visitor-facing strings live.

The scoped style block remains byte-for-byte unchanged.

The page continues to use `BaseLayout` for document framing and metadata rendering.

No public component API changes.

## Frontmatter structure

### Template slot boundary

The template-slot block remains in its current location and shape.

It retains these exact declarations:

```ts
const DEMO_NAME = 'Demo Runway';
const PRIMARY_ACTION_LABEL = 'Ask for a fresh note';
```

The comments around the block remain unchanged.

These are the only two idea-derived editable slots on the page.

### Derived page-copy declarations

The three declarations after the slot block remain:

```ts
const tagline = '...';
const title = `${DEMO_NAME} — ...`;
const description = '...';
```

Their values change to the selected Design copy.

`title` continues to interpolate `DEMO_NAME`.

`tagline` continues to be rendered through `{tagline}`.

`description` continues to pass directly to `BaseLayout`.

No copy configuration object is added.

## Metadata interface

The call remains:

```astro
<BaseLayout title={title} description={description}>
```

The rendered browser title leads with the expected slot value.

The metadata description remains optional at the layout boundary but present for this page.

There is no Open Graph, social-card, canonical-link, or JSON-LD copy in current scope.

The layout interface is not expanded.

## Orientation section structure

The first `section.clay-surface` retains:

- `aria-labelledby="title"`;
- one eyebrow paragraph;
- the slot-backed `h1` with `id="title"`;
- one tagline paragraph;
- one lede paragraph.

The copy order remains eyebrow, name, tagline, explanation.

The new eyebrow begins with a concrete action.

The new tagline becomes a verb-forward fragment.

The new lede contains a single sentence and both top-level actions.

No extra help or safety paragraph is added.

## Receipt section structure

The receipt `section` retains:

- class names `clay-surface receipt`;
- `aria-labelledby="receipt-heading"`;
- `aria-live="polite"`;
- one task eyebrow;
- one `h2` result landmark;
- one lede;
- one inset receipt panel;
- one slot-backed primary button.

The section's internal comments remain engineering-only and need no copy-standard rewrite.

### Receipt panel

The panel retains:

- `id="receipt-status"` for the live loading/error state;
- `id="receipt-body"` for the success payload;
- the initial `hidden` state on the body;
- three `receipt-row` containers;
- all three value element IDs.

The definition list remains the semantic interface for label/value pairs.

Only the nonce and signature label literals change.

The timestamp label remains `Made at`.

The row order remains:

1. issued time;
2. one-time identifier;
3. server signature.

No dynamic payload field changes.

### Primary action

The button retains:

- `type="button"`;
- `id="primary-action"`;
- classes `clay-button primary-action`;
- `{PRIMARY_ACTION_LABEL}` as its content.

Its accessible name therefore remains the existing slot value.

The button still represents the only clay-styled primary action on the page.

## Team-note section structure

The final section retains:

- `aria-labelledby="note-heading"`;
- one task eyebrow;
- `h2#note-heading`;
- one lede;
- one link to `/backstage`.

The link retains:

- `id="backstage-link"`;
- class `backstage-link`;
- its current href;
- its current action label.

Only the section heading and lede change in this task area.

The result remains one explanation before one navigation action.

## Client-script structure

The client script retains the following local interfaces:

- `statusEl`;
- `bodyEl`;
- `set(id, value)`;
- `ReceiptPayload`;
- `isReceiptPayload(value)`;
- `loadReceipt()`;
- `primaryAction` click wiring.

### Dynamic-state contract

`loadReceipt()` continues to implement this sequence:

```text
request starts
  -> show loading status
  -> hide receipt body
  -> fetch /api/receipt
     -> success: write values, hide status, show body
     -> failure: replace status with one retry sentence
```

The initial markup and request-start branch continue to use the same loading literal.

The error branch changes only its visitor-facing `textContent` value.

The thrown internal error details remain unchanged.

The click handler still disables the action for the full request and re-enables it in `finally`.

No additional success status is introduced because the definition list itself communicates
success when revealed.

## DOM and accessibility invariants

These IDs are invariant:

- `title`;
- `receipt-heading`;
- `receipt-status`;
- `receipt-body`;
- `receipt-issued`;
- `receipt-nonce`;
- `receipt-signature`;
- `primary-action`;
- `note-heading`;
- `backstage-link`.

These semantic relationships are invariant:

- each section points to its heading;
- the receipt region remains polite live content;
- the receipt label/value structure remains a `dl`;
- the primary action remains a native button;
- the backstage navigation remains a native link.

No new `aria-label` duplicates visible text.

No hidden explanatory text is introduced.

## Test boundary

`tests/demo-flow.spec.ts` remains the integration contract.

It finds the `h1` by the preserved `Demo Runway` accessible name.

It finds the button through `PRIMARY_ACTION_NAME`.

It verifies the healthy receipt-state transition.

It verifies a second action produces a new nonce.

It verifies the stalled request retains visible narration and hides fabricated receipt data.

The source changes do not require selector or expectation changes.

If the existing test fails after copy-only edits, the failure indicates an unintended structural
or syntax change, not an expected copy-coupling update.

## Verification boundaries

### Static checks

Inspect the source diff for literal-only runtime changes.

Verify both slot declaration lines remain exact.

Count every final rendered authored string using the standard convention.

Confirm each string is below both maximums for its class.

Confirm each lede and dynamic status is one sentence.

Confirm action-oriented eyebrows and controls begin with a specific verb.

Run `git diff --check`.

### Build/type checks

Run the repository's available Astro check or build command.

No new TypeScript interfaces should be necessary.

### Runtime checks

Run the healthy and stalled projects that execute `tests/demo-flow.spec.ts`.

The healthy project covers initial and repeat receipt requests.

The stalled project covers the retained loading narration.

An explicit browser-error-path interception may be used for visual/manual review, but no new
automated assertion is required by existing scope.

### Deferred checks

Cross-page leak checks and full-suite cold reading belong to `T-009-02-03`.

Projector and phone screenshots also belong to that dependent ticket.

## Commit structure

The meaningful implementation unit is the coherent page-copy rewrite.

It should be committed with its already-completed Research, Design, Structure, and Plan artifacts
after static validation.

Runtime verification and `progress.md` form the next meaningful evidence unit.

`review.md` is the final handoff unit.

Only files owned by this ticket are staged in those commits.

Lisa-owned ticket and provenance changes remain unstaged.

## Structure invariants

One page file owns all public index copy.

One canonical standard owns classifications and limits.

One display-name slot owns page wayfinding.

One primary-action slot owns the main button label.

One lede explains each task area.

One client function owns receipt state transitions.

One Playwright spec protects the public demo flow.

The implementation changes language inside these boundaries without changing the boundaries.
