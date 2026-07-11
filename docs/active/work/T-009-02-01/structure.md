# Structure — T-009-02-01 rewrite backstage copy to standard

## Structural outcome

The implementation changes one application page and one existing flow assertion.

It creates no runtime module, component, style, route, dependency, schema, or configuration.

The RDSPI work directory receives the six required artifacts as the phase progresses.

## File inventory

### Runtime file modified

`src/pages/backstage.astro`

Responsibilities that remain in this file:

- page metadata values;
- entry-type labels and hints;
- locked intro and passcode gate markup;
- unlocked checklist markup;
- inline browser interaction code;
- page-specific responsive styles.

Only visitor-facing strings and the redundant help node change.

### Test file modified

`tests/backstage-flow.spec.ts`

One exact heading selector changes from `The shared checklist` to `Shared checklist`.

The assertion still verifies that the dashboard heading receives focus after unlock.

No test steps, API assertions, fixtures, budgets, device presets, or behavior expectations change.

### Work artifacts created

- `docs/active/work/T-009-02-01/research.md`;
- `docs/active/work/T-009-02-01/design.md`;
- `docs/active/work/T-009-02-01/structure.md`;
- `docs/active/work/T-009-02-01/plan.md`;
- `docs/active/work/T-009-02-01/progress.md`;
- `docs/active/work/T-009-02-01/review.md`.

### Files deleted

None.

### Files explicitly audited but not modified

- `src/layouts/BaseLayout.astro`;
- `src/styles/base.css`;
- `src/styles/tokens.css`;
- `tests/support/flow-contract.ts`;
- `playwright.config.ts`;
- `src/lib/backstage-submission.ts`;
- `src/lib/backstage-route.ts`;
- all `/api/backstage/*` routes;
- `docs/active/tickets/T-009-02-01.md` phase/status fields.

## `backstage.astro` frontmatter boundary

The existing `BaseLayout` import remains unchanged.

The `title` constant remains a string and changes to the name-only value `Backstage`.

The `description` constant remains a string and changes to one brief visitor-action sentence.

The `entryTypes` array retains:

- two records;
- the values `reference` and `feedback`;
- the `label` and `hint` fields;
- the `as const` typing.

Only the four labels/hints rendered from the records change.

No public TypeScript interface or import boundary changes.

## Locked markup boundary

The following nodes remain with the same element types, IDs, classes, and ARIA relationships:

- intro `<section class="clay-surface intro" aria-labelledby="title">`;
- intro eyebrow paragraph;
- `<h1 id="title">`;
- tagline paragraph;
- `.lede` paragraph;
- `.note[role="note"]` paragraph;
- `#backstage-gate` section;
- `#gate-heading` heading;
- gate `.section-copy` paragraph;
- `#bs-unlock-form`;
- passcode label and `#bs-passcode` input;
- `#bs-unlock-error` alert;
- `#bs-unlock` submit button.

The `.help` paragraph beneath `#bs-passcode` is removed.

That node has:

- no ID;
- no ARIA relationship;
- no script reference;
- no test selector;
- no field validation role.

Its content repeats the gate's unlock/session explanation and is structurally unnecessary.

The safety note remains a semantic `role="note"` node and retains its `.note` class.

## Dashboard markup boundary

The `#backstage-dashboard` section remains hidden on initial render and keeps its
`aria-labelledby="dashboard-heading"` relationship.

The dashboard header retains:

- eyebrow node and class;
- `#dashboard-heading` with `tabindex="-1"`;
- `.section-copy` node.

The heading text changes, but its ID and focus behavior do not.

The add section retains:

- `#add-heading`;
- `#backstage-form`;
- radio `name="type"` and stable protocol values;
- the choice label/body spans;
- URL and text fields with all attributes;
- alert region and submit button.

The list section retains:

- `#list-heading`;
- `#bs-list-status` live region;
- `#bs-list-error` alert;
- `#bs-empty` empty-state node;
- `#bs-entry-list[aria-label="Backstage entries"]`.

No selector, event target, name, value, or accessible relationship changes.

## Inline-script boundary

The following private constants and interfaces remain byte-for-byte stable:

- `PASSCODE_HEADER`;
- `MAX_URL`;
- `MAX_TEXT`;
- `EntryType`;
- `EntryView`;
- `FeedView`.

The following behavior helpers remain structurally stable:

- element lookup;
- record/feed guards;
- alert and status writers;
- request header construction;
- feed reads;
- time formatting;
- safe text-node creation;
- entry rendering;
- feed refresh;
- unlock handling;
- option selection and URL-help synchronization;
- URL validation;
- entry submission.

## Inline-script string replacement map

Entry card creation preserves its node tree and changes only two catch-path error literals:

- completion failure becomes `We couldn't mark that entry complete — refresh and try again.`;
- deletion failure becomes `We couldn't delete that entry — refresh and try again.`.

Unlock handling changes four literals:

- missing passcode;
- wrong passcode;
- service/open failure;
- connection failure.

The `Opening…` loading state remains unchanged.

Form handling changes:

- missing note;
- long note;
- invalid URL;
- missing reference URL;
- expired unlock;
- 422 validation;
- server failure;
- connection failure.

The URL help variants, `Adding…`, and success confirmation remain unchanged.

## 422 response organization

Current shape:

1. parse the response body;
2. narrow `body.issues` to a string array;
3. join the array;
4. render either a generic failure or the joined issue string.

New shape:

1. recognize status 422;
2. render `Check the entry and try again.`;
3. keep focus on the text field.

The response still receives the same client-side branch and no retry or network behavior changes.

The body parse and issue narrowing are removed because their only consumer is removed.

This is a display-boundary change: protocol details stop crossing into visitor copy. It does not
change server validation, response shape, or submission behavior.

## Copy constants versus extraction

No new copy dictionary is introduced.

Static Astro copy stays next to its semantic markup.

Dynamic copy stays next to the state transition that renders it.

This preserves the page's current organization and keeps this ticket from creating a reusable
copy architecture without a demonstrated second consumer.

## Style boundary

The complete `<style>` block remains unchanged.

Removing the passcode help paragraph does not require a layout rule change because the `.field`
container already lays out arbitrary children in flow.

Shorter strings reduce wrapping but do not change class names, responsive measures, or tokens.

## Test boundary

`tests/backstage-flow.spec.ts` retains one end-to-end test with six named steps:

1. open locked;
2. refuse wrong passcode;
3. unlock and list;
4. submit without a second credential;
5. complete from the checklist;
6. delete from the checklist.

The focused-heading selector changes only its expected accessible name.

All other copy-based selectors remain valid by design.

No new copy-count assertion is added. The canonical standard states that the repository has no
automated copy gate, and human review remains binding.

## Credential and security boundary

The implementation must not touch:

- the passcode input type or autocomplete attributes;
- `unlockedPasscode` storage;
- input clearing after unlock;
- `x-demo-passcode` header construction;
- API method/path selection;
- server-side passcode comparison;
- D1 binding or entry storage;
- any configured passcode/signing-key source.

The only security-copy change is the visible safety rule.

No credential value may be embedded in the page, test, or work artifacts.

## Verification structure

### Static copy audit

Use a temporary read-only Node command to count the final fixed strings with:

- whitespace-separated tokens;
- Unicode code-point character count;
- trimmed rendered values.

Compare each against its Design classification.

### Compile/build checks

- `npm run typecheck` validates Astro and inline TypeScript.
- `npm run build` generates the public output used by disclosure checks.

### Flow check

`npm run test:flow:backstage` runs the existing Pixel 5 project and exercises all dashboard
transitions.

### Disclosure checks

- Run the established `npm run leak:check` with a locally running page/API endpoint.
- Scan the fresh built output for configured credential values without printing those values.
- Scan public copy for template/repository development-history language named by the standard.

### Diff checks

- `git diff --check` before staging;
- exact staged-path inventory;
- `git diff --cached --check`;
- post-commit `git show --check`;
- final ticket-range audit.

## Ordering constraints

1. change page copy and 422 display branch together;
2. update the one copy-coupled Playwright assertion in the same implementation unit;
3. count final rendered strings before claiming conformance;
4. typecheck before runtime flow execution;
5. build before the leak check;
6. do not stage concurrent Lisa or sibling-ticket changes;
7. write `progress.md` after implementation evidence is known;
8. write `review.md` only after final scope and test audits.

## Public interface impact

No URL, API, TypeScript export, CSS class, DOM ID, form name, protocol value, header, or data shape
changes.

The only observable interface changes are the authored words visitors read or hear and removal of
one redundant, unreferenced help paragraph.
