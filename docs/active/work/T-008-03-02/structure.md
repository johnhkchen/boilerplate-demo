# Structure — T-008-03-02 backstage dashboard end-to-end flow

## Change surface

This ticket changes one existing test file and its shared step-name contract, plus the required
workflow artifacts. It creates no application module, route, migration, configuration, or package
script. It deletes no tracked file.

## Files created

- `docs/active/work/T-008-03-02/research.md`
- `docs/active/work/T-008-03-02/design.md`
- `docs/active/work/T-008-03-02/structure.md`
- `docs/active/work/T-008-03-02/plan.md`
- `docs/active/work/T-008-03-02/progress.md`
- `docs/active/work/T-008-03-02/review.md`

## Files modified

- `tests/backstage-flow.spec.ts`
- `tests/support/flow-contract.ts`

## Files deleted

- None.

## Explicitly unchanged files

- `src/pages/backstage.astro`
- `src/pages/api/backstage/feed.ts`
- `src/pages/api/backstage/entries.ts`
- `src/pages/api/backstage/entries/[id].ts`
- `src/lib/backstage-entry.ts`
- `src/lib/backstage-retrieval.ts`
- `src/lib/backstage-route.ts`
- `src/lib/backstage-management.ts`
- `src/lib/backstage-store.ts`
- `playwright.config.ts`
- `tests/support/backstage.wrangler.jsonc`
- `package.json`
- `docs/active/tickets/T-008-03-02.md`
- `.lisa/provenance.jsonl`

## Runtime architecture

```text
Playwright browser / Pixel 5
  |
  | unlock, submit, checkbox, delete button
  v
src/pages/backstage.astro
  |
  | GET /feed, POST /entries, PATCH /entries/:id, DELETE /entries/:id
  v
owned Astro + Cloudflare local runtime
  |
  v
local migrated D1 store
  ^
  |
  | independent gated GET after each browser transition
  |
Playwright API request context
```

The browser remains the mutation driver. The API request context is an observer of the same
running server and canonical store, representing the agent read seam.

## `tests/backstage-flow.spec.ts`

### Role

Own the single running-server acceptance proof for the unified backstage dashboard. The file
continues to execute only in the `backstage` Playwright project.

### Type imports

Add type-only imports from settled application contracts:

```ts
import type { BackstageEntry, NewBackstageEntry } from '../src/lib/backstage-entry.ts';
import type { BackstageFeed } from '../src/lib/backstage-retrieval.ts';
```

These imports create no runtime application dependency in the Playwright bundle. They keep field
names synchronized with the canonical feed contract.

### Test-local response interfaces

Define narrow interfaces near the imports:

```ts
interface SubmissionResponse {
  entry: NewBackstageEntry;
}

interface CompletionResponse {
  boundary: 'backstage_management';
  entry: { id: number; completedAt: string };
}

interface DeletionResponse {
  boundary: 'backstage_management';
  deleted: { id: number };
}
```

The literal boundary types document the current HTTP response contract. Runtime equality checks
will pin the values that matter to the composed flow.

### Gated feed helper

Define `readFeed` inside the test so it closes over `request` and the shared test passcode.

Public test-local signature:

```ts
const readFeed = async (): Promise<BackstageFeed>;
```

Responsibilities:

- issue GET `/api/backstage/feed`;
- present `PASSCODE_HEADER` with `BACKSTAGE_PASSCODE`;
- read response text once;
- assert status 200 with response text in the message;
- parse the text as `BackstageFeed`;
- assert `schemaVersion` equals `1`;
- assert `gate` equals `backstage`;
- assert `count` equals `entries.length`;
- return the parsed feed.

Keeping it test-local avoids adding a broad support abstraction for one spec.

### Seed fixture

Keep one pre-navigation POST seed. Parse its successful response rather than discarding it.

Seed inputs:

- type: `feedback`;
- URL: empty string;
- text: unique `seedText`.

Captured response value:

- `seedSubmission.entry` supplies exact type, URL, text, and submitted timestamp.

The seed id remains unknown until the unlock feed. After selecting the feed row by unique text,
construct and retain `expectedSeed: BackstageEntry` from the feed id, submitted response fields,
and `completedAt: null`.

### Unlock step

Retain locked-state and wrong-passcode steps unchanged.

In the successful unlock step:

- retain the browser response/status and UI checks;
- call `readFeed` after the seeded list item is visible;
- find the seed row by exact unique text;
- assert the row exists;
- construct `expectedSeed`;
- compare the selected feed row to `expectedSeed` with `toEqual`.

This establishes the verbatim agent seam baseline immediately after unlock.

### Submission step

Continue filling a reference URL and text in the rendered form.

Change response handling:

- retain the POST response object;
- assert status 201 with body diagnostics;
- parse the body as `SubmissionResponse`;
- retain UI visibility and link assertions;
- read the DOM-assigned id from `data-entry-id`;
- construct `expectedLifecycle: BackstageEntry` with that id, response entry fields, and null
  completion;
- call `readFeed`;
- find by stable id;
- assert deep equality with `expectedLifecycle`.

This is the exact incomplete state.

### Completion step

Use `expectedLifecycle.id` rather than a separate loosely initialized numeric variable.

Change response handling:

- wait for the addressed PATCH response;
- assert status 200 with body diagnostics;
- parse as `CompletionResponse`;
- assert response id matches the lifecycle id;
- assert the completion timestamp is a string and parses as a valid date;
- retain checked, disabled, and textual UI state checks;
- replace `expectedLifecycle` with a copy carrying the exact response timestamp;
- call `readFeed`;
- find by id and deep-compare to the new complete expected object.

This proves completion changes only `completedAt` in the feed.

### Deletion step

Delete the same lifecycle row instead of submitting a second deletion-only row.

Sequence:

- locate the complete lifecycle list item;
- attach one-time dialog acceptance;
- wait for addressed DELETE response;
- click its entry-specific delete button;
- assert status 200 with body diagnostics;
- parse as `DeletionResponse`;
- assert deleted id matches the lifecycle id;
- assert the lifecycle row leaves the DOM;
- assert the seed row remains visible;
- call `readFeed`;
- assert no feed row has the lifecycle id;
- assert the feed still contains a row deeply equal to `expectedSeed`.

This is the exact absent state after deletion.

### Removed final step

Remove the standalone `confirmCanonical` step. Its partial assertions are superseded by strict
feed reads colocated with unlock, submission, completion, and deletion.

### State variables

Use definite assignment for objects established in prior test steps:

```ts
let expectedSeed: BackstageEntry;
let expectedLifecycle: BackstageEntry;
```

Playwright executes steps serially inside one test. Each later use is guarded by earlier assertions
and would not execute if the establishing step failed.

Avoid sentinel id value `0`; the lifecycle object's typed id becomes the single handle.

## `tests/support/flow-contract.ts`

### Role

Continue owning stable project names, test passcode, budgets, and human-readable step names.

### Modification

Remove:

```ts
confirmCanonical: 'confirm canonical store state'
```

The exact canonical assertions now belong inside each transition step. All remaining keys continue
to correspond one-to-one with an active `test.step` block.

### Unchanged budget

Keep the 35-second test timeout and 60-second run timeout. Four direct local feed reads add only
small in-process HTTP/D1 round trips. The existing server startup budget is unchanged.

## Workflow artifacts

### `research.md`

Describes repository state, test infrastructure, contracts, gaps, and constraints without choosing
an implementation.

### `design.md`

Evaluates final-only, captured-refresh, and independent-read options; selects direct exact reads.

### `structure.md`

Defines this file-level blueprint and ownership boundaries.

### `plan.md`

Sequences implementation and verification in independently checkable units.

### `progress.md`

Records completed steps, command evidence, remaining work, deviations, and ticket-scoped commits.

### `review.md`

Summarizes final changes, acceptance coverage, verification, limitations, and open concerns.

## Commit boundaries

Commit 1 contains pre-implementation workflow artifacts only:

- research;
- design;
- structure;
- plan.

Commit 2 contains the executable acceptance change and implementation progress:

- backstage flow spec;
- flow-contract cleanup;
- progress artifact.

Commit 3 contains the final review and any final progress evidence update.

Lisa-owned ticket/provenance changes remain outside all three commits.

## Verification boundaries

Focused acceptance:

```text
npm run test:flow:backstage
```

Static/type contract:

```text
npm run typecheck
```

Repository regression:

```text
npm test
```

Patch hygiene:

```text
git diff --check
git status --short
git diff -- tests/backstage-flow.spec.ts tests/support/flow-contract.ts
```

## Final invariants

- Every mutation is initiated through the rendered dashboard.
- Every transition is independently observed through a gated feed GET.
- Exact comparisons cover all six public fields of test-owned rows.
- Server-generated timestamps are compared using server-returned authoritative values.
- Persistent unrelated rows cannot cause false failures.
- The named backstage package command remains the acceptance entry point.
- No production behavior or public contract changes.
- No ticket phase/status edit by this work.
