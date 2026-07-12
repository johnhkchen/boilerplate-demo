# Review — T-010-03-01

## Outcome

The ticket is complete. The healthy and stalled public demo flows now consume
the receipt boundary's declared heading, status/body selectors, evidence
selectors and patterns, primary-action name, and route path through
`tests/support/flow-contract.ts`.

The browser spec contains none of the acceptance-forbidden exemplar literals.
Both Playwright commands pass, the declaration-focused unit suite passes, and
the repository typecheck passes.

## Commit

- Commit: `6ff7a6270e22c7c88547d71b1ce6dcc591e2429e`.
- Message: `test: read demo flow from boundary declaration`.
- Commit mechanism: `lisa commit-ticket`.
- Exact included paths:
  - `tests/support/flow-contract.ts`;
  - `tests/demo-flow.spec.ts`.
- Commit stat: 2 files changed, 56 insertions, 23 deletions.
- Both ticket-owned source paths are clean after the commit.
- No ordinary `git add` or `git commit` was used.
- Unrelated automation and concurrent-ticket changes were excluded.

## Files modified

### `tests/support/flow-contract.ts`

The flow support boundary now imports `receiptBoundary` and exports a small
browser-facing adapter:

- `DEMO_FLOW_BOUNDARY.pathGlob` is derived from `receiptBoundary.path`;
- `DEMO_FLOW_BOUNDARY.landmark` references the original declared landmark;
- `DEMO_HEADING` re-exports the declared heading;
- `PRIMARY_ACTION_NAME` retains its existing public name but now re-exports the
  declared action name.

The module no longer contains a duplicate primary-action string. It also does
not copy heading, status/body selectors, or evidence rows.

Existing flow projects, step names, backstage values, timing budgets, and local
base URL are unchanged.

### `tests/demo-flow.spec.ts`

Both projects now locate the page heading through `DEMO_HEADING`.

The healthy project now:

- observes the result body through the declared body selector;
- observes status hiding through the declared status selector;
- iterates every declared evidence record;
- checks each evidence selector against its declared `RegExp`;
- includes the declared evidence name in mismatch diagnostics;
- uses the first declared evidence record as its freshness witness;
- confirms that witness changes after action activation;
- confirms its replacement value still matches the declaration;
- continues to require the action to re-enable.

The stalled project now:

- intercepts `DEMO_FLOW_BOUNDARY.pathGlob` before navigation;
- observes status/body state through declared selectors;
- continues to verify action existence, enabled state, disabled response, visible
  narration, and absence of a fake result.

Concrete endpoint and selector examples were also removed from spec comments so
the architectural source gate covers prose as well as executable code.

## Files created

- None in the ticket-owned source commit.
- RDSPI artifacts were authored in the attempt-private work directory as required.

## Files deleted

- None.

## Data-flow review

The resulting ownership chain is:

```text
receiptBoundary declaration
  -> flow-contract browser adapter and named aliases
  -> healthy/stalled demo flow
```

This preserves the intended boundaries:

- production declaration owns exemplar literals and regexes;
- test support adapts the route path into Playwright glob syntax;
- the spec owns behavioral sequencing and assertions;
- the production page remains independent and is checked for agreement at
  runtime.

The browser adapter intentionally exposes only `pathGlob` and `landmark`. It does
not expose the boundary key environment name, response parser, or signature
verification behavior because the browser spec does not use them.

## Acceptance-criterion mapping

### Healthy flow passes

Pass. `npm run test:flow` exited zero.

- 1 healthy active test passed;
- 1 stalled test skipped under its existing project guard;
- load, response, and action steps all completed;
- active test duration was 321 ms;
- total Playwright command duration was 3.7 seconds.

### Stalled flow passes

Pass. `npm run test:flow:stalled` exited zero.

- 1 stalled active test passed;
- 1 healthy test skipped under its existing project guard;
- load, stalled observation, and action steps all completed;
- active test duration was 180 ms;
- total Playwright command duration was 2.4 seconds.

### Forbidden literal grep is empty

Pass. Exact command:

```sh
grep -En 'Demo Runway|#receipt-|/api/receipt' tests/demo-flow.spec.ts
```

The command produced no output. The expected grep no-match status was converted
to a successful shell check during implementation.

### Heading is defined once and re-exported

Pass. Scoped search finds `Demo Runway` only in
`src/lib/boundary-contract.ts`. `DEMO_HEADING` in flow support is derived from
`DEMO_FLOW_BOUNDARY.landmark.heading` and consumed by both spec tests.

### Primary-action name is defined once and re-exported

Pass. Scoped search finds `Ask for a fresh note` only in
`src/lib/boundary-contract.ts`. The existing `PRIMARY_ACTION_NAME` export is now
derived from `DEMO_FLOW_BOUNDARY.landmark.primaryActionName` and remains the
spec's action-locator input.

### Landmark and evidence follow the declaration

Pass. Status/body locators read the landmark fields. Healthy evidence assertions
iterate the declaration array and use each record's selector and pattern.

### Route glob follows the declaration

Pass. Flow support derives `**${receiptBoundary.path}` once, and the stalled spec
uses that export for interception.

## Verification evidence

### Typecheck

`npm run typecheck`: passed.

- Astro: 63 files checked;
- 0 errors;
- 0 warnings;
- 0 hints;
- TypeScript `--noEmit`: passed;
- Wrangler generated worker types: up to date.

Astro emitted the repository's existing deprecated `session.driver` signature
notice. It is unrelated to this ticket and did not fail verification.

### Focused declaration tests

`node --experimental-strip-types --test test/boundary-contract.test.mjs`:

- 7 tests;
- 7 passed;
- 0 failed, skipped, or cancelled.

This confirms that the declaration values consumed by the flow remain locked,
including heading, action name, selectors, and evidence regexes.

### Diff quality

- `git diff --check` passed for both source paths.
- Commit inspection shows only the exact two included paths.
- Post-commit status shows both paths clean.
- No visible Playwright report or trace artifact was left untracked.

## Test coverage assessment

Coverage is proportional and directly exercises the changed seam:

- the focused unit suite locks the declaration values;
- typecheck validates the source-to-support import and readonly evidence types;
- the healthy browser project proves selectors, patterns, accessible names, and
  freshness work through the new exports;
- the stalled browser project proves the derived route glob and declared stalled
  landmarks work through the new exports;
- the grep enforces removal of concrete spec literals.

No new unit test was added for the support aliases. Such a test would mostly
repeat the boundary unit test and static definition search, while both live
Playwright projects already import and exercise the aliases.

## Copy review

No rendered or announced copy changed. The copy standard was applied to the two
public literals whose ownership changed:

- `Demo Runway`: 2 words, 11 characters; valid display-name landmark and stable
  wayfinding name;
- `Ask for a fresh note`: 5 words, 20 characters; within the action envelope and
  begins with the specific verb `Ask`.

Both strings remain byte-for-byte unchanged and now have one definition each in
the boundary declaration. No visual cold-read is needed because the public page
surface did not change.

## Open concerns and limitations

The activation freshness check intentionally uses the first declared evidence
record. The current declaration orders nonce first, and the focused boundary test
locks that order. Both nonce and signature change on a genuinely fresh receipt,
so the current behavior is sound.

If a future boundary's first evidence item is stable across responses, that
fixture must order a changing item first or evolve the portable contract with an
explicit freshness designation. The checked helper fails clearly if the evidence
array is empty, preventing a vacuous activation proof.

The production page still owns its rendered literals and selectors separately
from `receiptBoundary`. That is intentional for this ticket: browser failures
make page/declaration drift observable. Generating the page from the declaration
would be a different architectural change.

No critical issue, TODO, security concern, data migration, or human intervention
is required for this ticket.
