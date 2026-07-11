# Design — T-008-03-02 backstage dashboard end-to-end flow

## Decision summary

Extend the existing single Playwright flow rather than creating a second overlapping scenario.
Keep the rendered phone interactions as the driver, and add a small typed feed reader inside the
spec. After unlock, submission, completion, and deletion, read the real gated feed directly and
compare the test-owned entry to an exact six-field object built from authoritative server values.

The resulting test has two observation planes:

1. the human plane proves the visitor can perform the action in the unified dashboard;
2. the agent plane proves the documented feed reports the resulting canonical state verbatim.

## Acceptance interpretation

“Drives unlock → submit → mark complete → delete” means the browser must initiate every dashboard
transition. API fixtures may seed initial state and inspect the agent seam, but must not replace the
human action under test.

“Asserts GET `/api/backstage/feed` reflects each change verbatim” means direct successful feed
reads must follow the relevant browser transitions and must compare every public entry field, not
only text, id, or the type of a completion value.

The sequence uses one submitted reference row as the lifecycle subject:

- after submit it exists with `completedAt: null`;
- after mark complete it exists with the exact PATCH timestamp;
- after delete it is absent.

The unlock read additionally proves the seeded row arrives verbatim before mutations begin.

## Option 1 — keep the existing final partial feed assertion

The current flow already reads the feed after all browser actions. It could be considered enough
if “reflects each change” is interpreted cumulatively.

Advantages:

- no implementation change;
- one direct API read;
- current UI checks cover intermediate visual state.

Disadvantages:

- submission is never observed in its incomplete feed state;
- completion is checked only by id and timestamp type;
- deletion is checked only by two negative predicates;
- a mapper that changes type, URL, text, or submitted timestamp could pass;
- the agent seam is not independently observed after each human action.

Rejected because it does not establish the ticket's explicit verbatim seam contract.

## Option 2 — capture only the dashboard's automatic feed responses

The page already refreshes the feed after every successful mutation. The test could wait for those
responses, parse their bodies, and assert them directly.

Advantages:

- no extra HTTP reads;
- proves the exact response consumed by the UI;
- keeps the request sequence compact.

Disadvantages:

- response waits become coupled to the page's internal refresh implementation;
- the existing mutation waits currently target POST, PATCH, and DELETE, not the following GET;
- multiple same-path GETs require careful promise ordering;
- unlock already consumes a feed response under a separate purpose;
- a response-body failure could be harder to identify than a named direct oracle read;
- it proves UI refresh traffic but less clearly represents an independent agent read.

Viable, but not chosen because the acceptance emphasizes what an agent reads from the seam after
the human action, and an independent read expresses that boundary more directly.

## Option 3 — add direct typed feed reads after every transition

Create a local `readFeed` helper using Playwright's API request context and the same deterministic
passcode header. It checks status, parses the success envelope, checks count consistency, and
returns typed entries. Call it after unlock, submit, completion, and deletion.

Advantages:

- maps one named assertion point to each required state transition;
- observes the API independently of dashboard rendering;
- failures identify the feed state that diverged;
- exact-object comparison catches transformed or omitted public fields;
- persistent unrelated rows do not matter when selecting by a unique marker/id;
- the helper centralizes gate and envelope boilerplate.

Disadvantages:

- adds four small HTTP reads to the flow;
- adds local test-only types that mirror the public contract;
- requires capturing authoritative mutation response bodies.

Chosen because it is the clearest executable proof of the collaboration seam and remains within
the existing test budget and server architecture.

## Lifecycle subject

Use the existing submitted reference entry as the single lifecycle subject. Its type, URL, and text
are uniquely marked. Its POST response provides `submittedAt`; the canonical feed provides its id;
the PATCH response provides `completedAt`.

Deleting the same completed entry makes the state machine linear and stronger:

```text
absent -> submitted/incomplete -> completed -> absent
```

The prior flow created a second row solely for deletion. That proves two controls, but it weakens
the sense that the feed reflects one exact row through all requested changes. A single subject
matches the ticket wording and reduces setup and runtime.

The seed entry remains separate. It proves unlock/list behavior and supplies an exact pre-mutation
feed fixture. It is not deleted, so the post-delete state still proves the feed remains available
and does not merely return an empty or malformed result.

## Authoritative expected values

Avoid manufacturing timestamps in the test.

For the seed row:

- POST returns `type`, `url`, `text`, and `submittedAt`;
- the unlock feed supplies `id` and initial `completedAt`;
- the expected exact object combines the response value with the feed id and `null`.

For the lifecycle row after submit:

- the form inputs own `type`, `url`, and `text`;
- POST response supplies the exact `submittedAt`;
- feed supplies the stable id;
- initial completion must be exactly `null`.

For the lifecycle row after completion:

- PATCH response supplies the exact `completedAt`;
- every other field must remain identical to the post-submit object.

For deletion:

- DELETE response must name the exact same id;
- the next feed must have no entry deeply equal to or addressed by that lifecycle id;
- the exact seed object must still be present.

## Test-local contracts

Import the repository's `BackstageEntry` and `BackstageFeed` as type-only dependencies. This avoids
maintaining handwritten field declarations in the spec while emitting no browser/runtime import.

Define narrow response types for the two mutation response shapes that are not already exported as
public interfaces:

- submission response: `{ entry: NewBackstageEntry }`;
- completion response: `{ boundary: string; entry: { id: number; completedAt: string } }`;
- deletion response: `{ boundary: string; deleted: { id: number } }`.

These casts do not replace assertions. The test checks status and the values later through exact
feed comparisons; addressed ids are explicitly compared at each management response.

## Feed helper

The local helper performs:

1. `request.get('/api/backstage/feed')` with `x-demo-passcode`;
2. status assertion with response text available in the failure message;
3. JSON parse as `BackstageFeed`;
4. schema version assertion;
5. gate marker assertion;
6. count-to-array-length assertion;
7. return of the full feed.

It does not reproduce all runtime validation already performed by the application and unit suite.
Its job is to make each lifecycle assertion concise while pinning the stable envelope markers.

## Verbatim entry assertion

Use Playwright/Jest-style `toEqual` on complete objects. Do not use `objectContaining`, partial
property checks, or truthy timestamp predicates for the lifecycle states.

Select test-owned rows by their stable unique text or stable id, then compare the selected value
to the full expected `BackstageEntry` object. This tolerates persistent unrelated D1 rows while
remaining strict about every public field of the row under test.

## Step organization

Retain the existing named UI steps because they produce useful trace/report output. Put the direct
feed assertion immediately within the step that establishes the new state:

- unlock step: exact seed entry;
- submit step: exact new incomplete entry;
- complete step: exact same entry with authoritative completion timestamp;
- delete step: exact entry absence and exact seed survival.

The separate final “confirm canonical store state” step becomes redundant and should be removed.
Its strongest checks move into the transition steps, where failures have better causal locality.
The flow contract's unused final step name should also be removed.

## Request ordering and race safety

Continue waiting for the mutation response before inspecting UI. The dashboard awaits its own feed
refresh before the relevant row/state is rendered, so the existing visibility or checked-state
assertion acts as the refresh-complete boundary. Only then perform the direct feed read.

This ordering prevents the direct read from racing the browser's canonical refresh. Persistence has
already committed before the mutation response, and the rendered post-mutation state confirms the
dashboard refresh has completed.

## Persistent database isolation

Do not assert the whole entries array or absolute count. Prior local runs may have left rows in the
shared persisted development database. Use a per-run unique marker, exact selection of test-owned
objects, and relative assertions about the lifecycle id.

The seed and lifecycle rows are intentionally not cleaned up outside the user-driven delete step.
The lifecycle row is removed by the flow. The seed row remains like the existing behavior and is
safe because future tests use unique markers.

## Failure diagnostics

Every API status assertion should include the response body in its message. This preserves bounded
server error details in Playwright output when setup or a mutation fails. Exact object diffs then
show which public feed field diverged.

Named `test.step` blocks continue to box failures and use the action budget. The feed reads occur
inside the causal step rather than under a generic final assertion label.

## Scope boundaries

- no dashboard source change;
- no API route change;
- no persistence or migration change;
- no Playwright configuration change;
- no package script change;
- no new browser spec;
- no test database reset mechanism;
- no credential persistence;
- no application contract duplication beyond type-only imports.

## Verification strategy

Run the named acceptance command first. It must execute the backstage project against its owned,
migrated server and pass on the Pixel 5 preset. Then run type checking because the TypeScript spec
adds imports and response types. Run the complete unit suite to guard the settled API contracts.
Finally run `git diff --check` and inspect the scoped diff and worktree so Lisa-owned files remain
unstaged and ticket phase/status remain unchanged by this work.
