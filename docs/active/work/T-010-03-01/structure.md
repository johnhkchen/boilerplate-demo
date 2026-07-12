# Structure — T-010-03-01

## Change set

Two repository source files are modified:

```text
tests/
├── demo-flow.spec.ts          MODIFY — consume declared browser contract
└── support/
    └── flow-contract.ts       MODIFY — adapt and re-export receipt declaration
```

No production page, boundary route, contract declaration, unit test, package
script, or Playwright configuration file is created, modified, or deleted.

The private workflow directory receives `research.md`, `design.md`,
`structure.md`, `plan.md`, `progress.md`, and `review.md`. Those artifacts are
not part of the ticket-owned source commit.

## Module boundary

The data path becomes:

```text
src/lib/boundary-contract.ts
  receiptBoundary
    ├── path
    └── landmark
         ├── heading
         ├── statusSelector
         ├── bodySelector
         ├── evidence[]
         └── primaryActionName
             │
             ▼
tests/support/flow-contract.ts
  DEMO_FLOW_BOUNDARY
    ├── pathGlob
    └── landmark
  DEMO_HEADING
  PRIMARY_ACTION_NAME
             │
             ▼
tests/demo-flow.spec.ts
  healthy and stalled Playwright flows
```

The portable boundary declaration remains the sole literal source. Flow support
adapts it to Playwright needs. The spec consumes only flow support.

## `tests/support/flow-contract.ts`

### New import

Import `receiptBoundary` from `../../src/lib/boundary-contract.ts`.

The import is safe because:

- the declaration is free of I/O;
- it has no Node-only imports;
- it is already designed for Playwright support consumption;
- its Web Crypto-dependent verification function is referenced but never called
  during support-module initialization.

### New grouped export

Add `DEMO_FLOW_BOUNDARY` near the existing flow project and step exports.

Public shape:

```ts
export const DEMO_FLOW_BOUNDARY = {
  pathGlob: `**${receiptBoundary.path}`,
  landmark: receiptBoundary.landmark,
} as const;
```

Responsibilities:

- adapt an absolute route path into a Playwright glob;
- expose only the browser-observation portion of the declaration;
- retain the nested landmark grouping;
- carry evidence selectors and regex instances unchanged.

Non-responsibilities:

- response shape validation;
- signature verification;
- environment-key selection;
- page rendering;
- server routing;
- test behavior or timing.

### New heading re-export

Add:

```ts
export const DEMO_HEADING = DEMO_FLOW_BOUNDARY.landmark.heading;
```

This is the named, flow-level accessible heading used by both projects. It is an
alias, not a new user-facing string definition.

### Changed primary-action export

Keep the existing public name `PRIMARY_ACTION_NAME`, but replace its string
initializer with:

```ts
DEMO_FLOW_BOUNDARY.landmark.primaryActionName
```

Update its engineering comment to state that the value is re-exported from the
boundary declaration. Remove the obsolete instruction to edit the flow constant
alongside the page.

Keeping the export name prevents churn in other consumers and makes the explicit
acceptance condition easy to audit.

### Existing exports unchanged

The following retain their names and values:

- `FLOW_PROJECT`;
- `FLOW_STEP`;
- `BACKSTAGE_STEP`;
- `BACKSTAGE_PASSCODE`;
- `FLOW_BUDGET_MS`;
- `LOCAL_BASE_URL`.

No caller outside the public demo flow needs modification.

## `tests/demo-flow.spec.ts`

### Imports

Add:

- `DEMO_FLOW_BOUNDARY`;
- `DEMO_HEADING`.

Retain:

- `FLOW_BUDGET_MS`;
- `FLOW_PROJECT`;
- `FLOW_STEP`;
- `PRIMARY_ACTION_NAME`.

All test data continues to enter through `./support/flow-contract`.

### Local landmark binding

Bind the grouped landmark once near the imports:

```ts
const { landmark } = DEMO_FLOW_BOUNDARY;
```

This keeps repeated locator expressions readable while preserving the visible
source relationship to the grouped boundary.

### Freshness helper

Add a small pure helper or top-level checked binding for the first evidence row.
It must return a concrete evidence record or throw a clear configuration error
when the declaration contains no evidence.

Preferred interface:

```ts
function requireFreshnessEvidence() {
  const evidence = landmark.evidence[0];
  if (!evidence) {
    throw new Error('the demo flow boundary must declare freshness evidence');
  }
  return evidence;
}
```

This avoids non-null assertions and preserves a useful failure if the declaration
becomes incomplete.

### Load steps

Both load steps use:

```ts
page.getByRole('heading', { name: DEMO_HEADING })
```

No display-name literal remains in the spec or its comments.

### Healthy receipt step

Use:

- `landmark.bodySelector` for result visibility;
- `landmark.statusSelector` for status hiding;
- a loop over `landmark.evidence` for format assertions.

Each loop item supplies both its selector and its `RegExp`. The evidence name can
be included in assertion diagnostics without special-casing receipt fields.

### Healthy activation step

Continue locating the action through `PRIMARY_ACTION_NAME`.

Obtain the freshness record through `requireFreshnessEvidence()`. Use its
selector to read the previous value, assert changed text, and assert its declared
pattern after the click.

No evidence field name, selector, or regex literal remains in the spec.

### Stalled setup

Use `DEMO_FLOW_BOUNDARY.pathGlob` in `page.route`.

No route literal remains in executable code or comments.

### Stalled observation and activation

Use `landmark.statusSelector` and `landmark.bodySelector` for all visibility
assertions. Continue using `PRIMARY_ACTION_NAME` for the action.

### Comments

Replace concrete endpoint and selector references with declaration-oriented
language. Retain explanations of navigation commit timing, unresolved routing,
and freshness proof because those explain non-obvious behavior.

## Public interfaces after the change

`tests/support/flow-contract.ts` gains:

```ts
DEMO_FLOW_BOUNDARY: {
  readonly pathGlob: string;
  readonly landmark: BoundaryLandmark;
}

DEMO_HEADING: string
```

Its existing `PRIMARY_ACTION_NAME: string` export remains source-compatible.

No production public API changes.

## Ordering

1. Add the declaration import and derived support exports.
2. Rewire the spec imports and shared bindings.
3. Replace healthy-flow heading and landmark literals.
4. Replace freshness-specific evidence literals.
5. Replace stalled-flow route and landmark literals.
6. Remove forbidden literals from comments.
7. Run source grep and typecheck.
8. Run healthy and stalled flows.
9. Inspect and commit the two-file source unit through Lisa.

## Atomic source unit

The support adapter and spec consumer form one meaningful unit. Committing only
the support file would add unused API; committing only the spec would not compile.
Both exact paths belong in one `lisa commit-ticket` invocation.

## Deletion policy

- Delete the duplicate action-name literal from flow support.
- Delete all forbidden exemplar literals from the public demo spec.
- Delete no files.
- Preserve all other flow and backstage exports.
