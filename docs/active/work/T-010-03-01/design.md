# Design — T-010-03-01

## Design goal

Make the healthy and stalled demo flow read its page landmark, evidence locators,
primary action name, and boundary route glob from the portable receipt declaration.
A declaration-only heading, selector, action-name, or route change should require
no edit to `tests/demo-flow.spec.ts`.

The browser spec should continue to prove the same behavior:

- the static shell has the declared accessible heading;
- the real response reveals the declared result body;
- the loading status hides on success;
- every declared evidence value matches its declared format;
- activating the primary action produces a fresh response;
- an unresolved boundary stays visibly narrated;
- the action responds even while the boundary is stalled.

## Option A — import `receiptBoundary` directly in the spec

The spec could import the portable declaration from
`../src/lib/boundary-contract.ts` and address every nested property directly.

Advantages:

- shortest support-module diff;
- no aliases can drift from the declaration;
- the source of each value is visually explicit.

Costs:

- bypasses the existing Playwright support boundary;
- does not meet the explicit requirement to re-export heading and action name
  through `flow-contract.ts`;
- mixes source-layer imports with flow modes, steps, and budgets from support;
- makes future fixture selection a concern of the spec rather than support.

Decision: reject. It fails an explicit acceptance boundary.

## Option B — re-export the entire boundary object only

`flow-contract.ts` could import `receiptBoundary` and export it under a flow name.
The spec could access nested landmark fields from that object.

Advantages:

- minimal transformation;
- preserves types and regex objects exactly;
- one runtime object contains all required values.

Costs:

- heading and primary action are only indirectly available as nested properties;
- “re-exported through flow-contract” would be technically true but less clear
  against the acceptance wording;
- the spec gains server-only contract fields it does not use;
- a generic browser spec becomes tied to the concrete receipt object name.

Decision: reject as the only interface. The export surface is broader and the
two specifically named re-exports remain ambiguous.

## Option C — export individual aliases for every field

The support module could publish constants for heading, status selector, body
selector, evidence, action name, and route glob.

Advantages:

- very explicit spec imports;
- easy to grep and understand;
- heading and action-name re-exports are unmistakable.

Costs:

- expands a flat namespace with several related values;
- makes it easy for consumers to mix values from different future boundaries;
- adds repetitive declarations and imports;
- loses the grouping already designed into `BoundaryLandmark`.

Decision: reject as the complete interface. A few compatibility aliases are
useful, but flattening the whole declaration weakens cohesion.

## Option D — grouped flow boundary plus named compatibility re-exports

The support module can derive a compact browser-facing record from
`receiptBoundary`:

- `pathGlob` derived from `receiptBoundary.path`;
- `landmark` referenced from `receiptBoundary.landmark`.

It can also export named aliases for the two acceptance-named values:

- `DEMO_HEADING` from the landmark heading;
- `PRIMARY_ACTION_NAME` from the landmark action name.

The spec imports the grouped contract for selectors, evidence, and route glob,
and the named aliases for heading and action lookup.

Advantages:

- meets the explicit heading/action re-export requirement visibly;
- keeps related landmark data grouped;
- does not expose response validation, verification, key environment, or other
  server-only operations to the browser spec;
- derives every export from a single declaration with no duplicated literal;
- preserves the existing `PRIMARY_ACTION_NAME` import name for minimal churn;
- creates one obvious place to select a different exemplar in the future.

Costs:

- heading and action are accessible both through the grouped landmark and named
  aliases;
- introduces one small adapter object in flow support;
- `pathGlob` is Playwright-specific data not present in the portable contract.

Decision: choose Option D. The duplicate access paths are aliases to one value,
not duplicate definitions, and they directly satisfy the acceptance language.

## Flow support interface

Use a browser-facing export named `DEMO_FLOW_BOUNDARY` with this conceptual
shape:

```ts
{
  pathGlob: `**${receiptBoundary.path}`,
  landmark: receiptBoundary.landmark,
}
```

The `as const` inference preserves readonly structure and exact field types.
The glob is derived once outside the spec. If the declared route changes, the
stalled interception follows it.

Expose:

```ts
export const DEMO_HEADING = DEMO_FLOW_BOUNDARY.landmark.heading;
export const PRIMARY_ACTION_NAME =
  DEMO_FLOW_BOUNDARY.landmark.primaryActionName;
```

These statements define no user-facing literal. The only literal definitions
remain in `boundary-contract.ts`.

## Evidence strategy

The healthy receipt step should iterate over `landmark.evidence` and assert each
declared selector against its declared regex. This removes receipt field names,
selectors, and patterns from the spec.

The freshness proof needs a stable witness. The receipt declaration orders nonce
before signature, and both change on a fresh response. Select the first evidence
record as the freshness evidence and fail clearly if the declaration provides no
evidence.

A small local helper can enforce that precondition:

```ts
const freshnessEvidence = DEMO_FLOW_BOUNDARY.landmark.evidence[0];
if (!freshnessEvidence) throw new Error(...);
```

This keeps the spec independent of the name `nonce`. It also prevents a vacuous
activation test if a future declaration accidentally removes all evidence.

After clicking, the spec should assert:

- the freshness selector no longer has its previous text;
- its new text matches its declared pattern;
- the action re-enables.

The initial receipt step already validates every evidence item.

## Locator strategy

Continue using role locators for visitor-facing heading and action:

- heading via `DEMO_HEADING`;
- button via `PRIMARY_ACTION_NAME`.

Continue using CSS locators for declared implementation evidence:

- status selector;
- body selector;
- each evidence selector.

This preserves the existing distinction between accessibility contract and DOM
evidence contract.

## Stalled route strategy

Register `page.route(DEMO_FLOW_BOUNDARY.pathGlob, () => {})` before navigation.
The glob builder uses the declared absolute path with a leading `**`, preserving
the existing match against any local origin.

Do not use a regular expression. A string glob is simpler, keeps current
Playwright behavior, and makes route-path derivation transparent.

## Comment strategy

Acceptance scans the entire spec, not only executable strings. Rewrite comments
to refer to “the declared boundary,” “status,” “body,” and “freshness evidence.”
Do not retain endpoint or DOM selector examples in comments.

This is engineering prose, not user-facing copy. It should remain concise and
describe the behavior without leaking exemplar-specific literals back into the
generic flow.

## Test strategy

Run the exact source grep:

```sh
grep -En 'Demo Runway|#receipt-|/api/receipt' tests/demo-flow.spec.ts
```

An empty result proves the spec has no forbidden exemplar literals.

Run both required integration commands:

```sh
npm run test:flow
npm run test:flow:stalled
```

Run `npm run typecheck` because the change relies on inferred readonly array
element types and cross-directory TypeScript imports.

Run the focused boundary unit test to confirm the declaration being consumed is
still intact. No new user-facing behavior or boundary validation behavior is
introduced.

## Copy decision

Preserve both public strings byte-for-byte. Their only definitions remain in
`src/lib/boundary-contract.ts`. The flow support exports references, and the spec
consumes those references. No copy authoring, visual surface change, or adjacent
explanation change occurs.
