# Plan — T-008-03-02 backstage dashboard end-to-end flow

## Goal

Turn the existing unified-dashboard Playwright scenario into the ticket's exact collaboration proof:
the browser performs unlock, submit, completion, and deletion, while a gated direct feed read after
each transition proves the agent seam reports the test-owned entry verbatim.

## Implementation principles

- Keep the browser as the mutation driver.
- Treat the feed as the canonical observation seam.
- Compare complete six-field entry objects.
- Source ids and timestamps from authoritative server responses.
- Isolate test data with a unique marker rather than resetting persistent local D1.
- Keep failure output close to the transition that caused it.
- Do not change production application behavior.
- Do not modify Lisa-owned ticket phase/status fields or provenance.

## Step 1 — add canonical test types

Modify `tests/backstage-flow.spec.ts`.

Actions:

1. Add type-only imports for `BackstageEntry` and `NewBackstageEntry`.
2. Add a type-only import for `BackstageFeed`.
3. Define narrow submission, completion, and deletion response interfaces.
4. Keep all runtime imports and existing project gating unchanged.

Verification:

- TypeScript resolves explicit `.ts` type imports.
- No emitted runtime dependency is introduced.
- Interface fields match current API response contracts.

Atomic boundary:

- The spec has vocabulary for exact expected state but behavior is not yet changed.

## Step 2 — add a direct feed oracle

Within the existing Playwright test, add a local `readFeed` helper.

Actions:

1. GET `/api/backstage/feed` through the API request fixture.
2. Present the shared passcode header.
3. Read response text once for both diagnostics and parsing.
4. Assert status 200.
5. Parse the JSON as `BackstageFeed`.
6. Assert schema version `1`.
7. Assert gate marker `backstage`.
8. Assert `count` equals `entries.length`.
9. Return the parsed envelope.

Verification:

- The helper uses the same running server and passcode as the browser flow.
- A failed feed status prints the bounded response body.
- No whole-feed count assumption is made.

Atomic boundary:

- The spec can perform repeatable canonical reads with a stable envelope assertion.

## Step 3 — make the seed authoritative

Update pre-navigation seed setup.

Actions:

1. Retain the seed POST response status assertion.
2. Capture the response body once.
3. Parse the body as `SubmissionResponse`.
4. Declare an `expectedSeed` object for assignment after the id is known.
5. Keep the unique marker and linkless feedback input unchanged.

Verification:

- POST response entry exactly matches the submitted type, URL, and text.
- The submitted timestamp is retained rather than recomputed.

Atomic boundary:

- Seed data has an authoritative four-field basis for later feed comparison.

## Step 4 — assert unlock feed verbatim

Extend the successful unlock/list step.

Actions:

1. Keep the browser's successful unlock response and locked/unlocked UI checks.
2. Wait until the unique seed list item is visible.
3. Call the direct feed helper.
4. Find the seed feed row by its unique text.
5. Assert that the row exists.
6. Construct `expectedSeed` from the row id, seed POST entry, and null completion.
7. Deep-compare the actual row to `expectedSeed`.

Verification:

- Unlock state is still driven by the rendered form.
- The agent feed exposes the exact seeded values.
- The expected object includes all six public fields.

Atomic boundary:

- The human unlock and initial agent read are composed end to end.

## Step 5 — assert submission feed verbatim

Extend the rendered submission step.

Actions:

1. Retain form fill and POST response wait.
2. Capture response body text for diagnostics and JSON parsing.
3. Parse the response as `SubmissionResponse`.
4. Keep UI visibility and link checks.
5. Read the new row id from its `data-entry-id` attribute.
6. Assert the id is positive.
7. Construct `expectedLifecycle` with all POST fields and `completedAt: null`.
8. Call the direct feed helper.
9. Select by stable id.
10. Deep-compare the feed row to `expectedLifecycle`.

Verification:

- The browser submits without another credential input.
- The exact type, URL, text, submitted timestamp, id, and null completion reach the feed.

Atomic boundary:

- The new incomplete lifecycle state is proven through both UI and agent seam.

## Step 6 — assert completion feed verbatim

Extend the completion step.

Actions:

1. Address the PATCH wait using `expectedLifecycle.id`.
2. Trigger completion through the native checkbox.
3. Read the PATCH response body once.
4. Assert status 200 with response diagnostics.
5. Parse as `CompletionResponse`.
6. Assert the response names the lifecycle id.
7. Assert its timestamp is a valid string timestamp.
8. Keep checked, disabled, and textual complete UI assertions.
9. Replace `expectedLifecycle.completedAt` with the exact PATCH timestamp.
10. Call the direct feed helper.
11. Select the lifecycle row by id.
12. Deep-compare the complete feed row to the expected object.

Verification:

- The browser checkbox drives the mutation.
- The feed reports the exact authoritative completion timestamp.
- All other public entry fields remain byte-for-byte equal.

Atomic boundary:

- The completed lifecycle state is proven through UI and agent seam.

## Step 7 — delete the same lifecycle row and assert absence

Replace the deletion-only second submission with deletion of the completed lifecycle entry.

Actions:

1. Locate the list item by the lifecycle text.
2. Accept the native confirmation dialog once.
3. Wait for DELETE against the lifecycle id.
4. Click the entry-specific delete button.
5. Read the DELETE response body once.
6. Assert status 200 with response diagnostics.
7. Parse as `DeletionResponse`.
8. Assert the response names the lifecycle id.
9. Assert the lifecycle item is absent from the DOM.
10. Assert the seed item remains visible.
11. Call the direct feed helper.
12. Assert no feed entry has the lifecycle id.
13. Assert one feed entry deeply equals `expectedSeed`.

Verification:

- Delete remains a rendered, confirmed user action.
- The same row is traced across incomplete, complete, and absent states.
- Feed availability and survivor integrity remain proven after deletion.

Atomic boundary:

- The deletion transition and final agent state are proven without a generic tail assertion.

## Step 8 — remove superseded final-step contract

Modify both test files.

Actions:

1. Delete the standalone `confirmCanonical` test step.
2. Remove `confirmCanonical` from `BACKSTAGE_STEP`.
3. Remove second-row variables and text used only by the previous deletion arrangement.
4. Remove sentinel id variables superseded by typed expected objects.
5. Update the spec's leading comment to describe per-transition feed assertions.

Verification:

- Every remaining shared step key is referenced.
- No direct canonical assertion is deferred beyond its causal transition.
- No unused locals or imports remain.

Atomic boundary:

- Test organization matches the chosen lifecycle and reporting model.

## Step 9 — create implementation progress artifact

Create `docs/active/work/T-008-03-02/progress.md` before verification.

Record:

- completed research, design, structure, and plan;
- exact files changed;
- implementation checklist;
- verification still pending;
- deviations, if any;
- pre-implementation commit id.

Update it after each verification command with concrete results.

## Step 10 — focused browser verification

Run:

```text
npm run test:flow:backstage
```

Pass criteria:

- the backstage project starts its owned server;
- migrations apply successfully;
- the one backstage test passes;
- unlock, submit, complete, and delete steps all pass;
- exact feed comparisons pass at all four observation points;
- no timeout budget change is needed.

If it fails:

- inspect the named step and exact-object diff;
- use retained trace only if terminal diagnostics are insufficient;
- document any plan deviation before changing architecture.

## Step 11 — static and regression verification

Run:

```text
npm run typecheck
npm test
```

Pass criteria:

- Astro diagnostics are clean;
- TypeScript accepts the spec types and application imports;
- generated Worker types remain current;
- the full existing Node suite passes;
- no production contract regression appears.

## Step 12 — patch and ownership verification

Run:

```text
git diff --check
git diff -- tests/backstage-flow.spec.ts tests/support/flow-contract.ts
git status --short
```

Pass criteria:

- no whitespace errors;
- executable diff is limited to the planned test files;
- artifact diff is limited to this ticket's work directory;
- Lisa-owned ticket and provenance changes remain unstaged;
- ticket phase/status are not edited by this work.

## Step 13 — implementation commit

Stage only:

- `tests/backstage-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `docs/active/work/T-008-03-02/progress.md`.

Commit with a ticket-scoped message after focused and regression verification pass. Re-check status
immediately afterward to confirm only pre-existing Lisa-owned changes and the pending review remain.

## Step 14 — Review

Create `docs/active/work/T-008-03-02/review.md`.

Include:

- acceptance outcome;
- files created, modified, and deleted;
- exact lifecycle and feed assertions;
- command results and test counts;
- coverage strengths and gaps;
- persistent-store isolation rationale;
- known limitations or open concerns;
- commit ids;
- confirmation that ticket metadata was not manually changed.

Update `progress.md` to complete if final evidence or commit ids need correction. Commit the review
artifact and any final progress update without staging Lisa-owned files.

## Completion criteria

- All six RDSPI artifacts exist.
- The browser drives unlock, submit, mark complete, and delete.
- Direct feed reads observe every transition.
- Exact entry comparisons cover all public fields.
- `npm run test:flow:backstage` is green.
- Type and unit regression gates are green.
- The final review names test coverage and open concerns.
- Ticket phase/status fields remain under Lisa's control.
