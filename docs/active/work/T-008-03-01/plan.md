# Plan — T-008-03-01 unified dashboard page

## 1. Establish workflow artifacts

- Write Research from the ticket, dependency reviews, runtime code, tests, and scripts.
- Write Design with viable alternatives and the selected page-local state model.
- Write Structure with exact production/test files and interfaces.
- Write this Plan before implementation.
- Verify ticket frontmatter and Lisa provenance are not staged.
- Commit the four artifacts as the pre-implementation checkpoint.

Verification:

- all four files exist under `docs/active/work/T-008-03-01/`;
- `git diff --cached --check` is clean;
- staged paths contain only the four owned artifacts.

## 2. Reframe backstage markup around unlock

- Update title/description and explanatory copy for a unified dashboard.
- Add a dedicated unlock form as the only initially interactive form.
- Move the passcode field into that form.
- Add a hidden dashboard container with a focusable heading.
- Retain entry type, URL, and text fields inside a credential-free submit region.
- Add list status, error, empty, and checklist containers.
- Remove confirmation markup and “Send another.”

Verification:

- initial HTML exposes the passcode form but hides submission/list controls;
- the dashboard has accessible section labels;
- the submission form contains no passcode input;
- no obsolete confirmation ids remain.

## 3. Implement page-memory unlock state

- Add a closure variable for the unlocked passcode.
- Validate the feed envelope and canonical entries at runtime.
- Make the gate submit issue a feed GET with the candidate passcode.
- Map wrong credentials to a scoped refusal message.
- Keep the page locked on every failed response.
- Commit passcode state only after a valid 200 feed response.
- Clear the password input immediately after successful unlock.
- Reveal the dashboard, render entries, and focus its heading.
- Do not use cookies or browser storage.

Verification:

- wrong credential yields a 403 and never reveals the dashboard;
- correct credential yields a 200 and renders current entries;
- source contains no localStorage, sessionStorage, cookie, or URL credential flow;
- the password DOM field is blank after unlock.

## 4. Render the canonical checklist

- Build entries with DOM APIs and `textContent`.
- Use stable ids for control identity and API paths.
- Render native checked state from `completedAt`.
- Disable already-completed checkboxes.
- Render a textual complete state.
- Format submitted timestamps without making parsing a requirement.
- Render optional server-validated web links safely.
- Render an empty state for a successful zero-entry feed.

Verification:

- seeded existing content is visible after unlock;
- arbitrary text is not parsed as markup;
- completed state is accessible without color;
- long content and URLs wrap at phone width.

## 5. Integrate submission into the dashboard

- Preserve existing friendly validation.
- Remove submission-time passcode input validation.
- Send POST with the closure passcode header.
- Keep payload exactly `type`, `url`, and `text`.
- On 201, clear entry content fields and refresh the feed.
- Announce success in the unified list region.
- Retain bounded mappings for 401/403, 422, server, and network failures.

Verification:

- there is no second credential input after unlock;
- submitted content appears in the checklist after canonical refresh;
- server-side validation remains authoritative;
- the old separate confirmation surface is absent.

## 6. Integrate completion and deletion

- Wire incomplete checkbox changes to PATCH by id.
- Disable addressed controls while the request is pending.
- Refresh the feed after successful completion.
- Restore canonical rendering and announce on failure.
- Wire delete to an entry-specific button.
- Require native confirmation before DELETE.
- Refresh the feed after successful deletion.
- Prove cancellation performs no deletion.

Verification:

- PATCH uses the closure passcode and addressed stable id;
- the selected row becomes checked and remains present;
- DELETE uses the same credential and addressed stable id;
- the deleted row disappears while siblings remain;
- neither action prompts for another credential.

## 7. Evolve browser acceptance coverage

- Update backstage step constants for the new flow.
- Seed one existing row through the real API before navigation.
- Assert locked initial state on the Pixel 5 project.
- Submit a wrong passcode and capture the 403 response.
- Unlock with the correct passcode and capture the 200 feed.
- Assert seeded row is listed.
- Submit a unique entry through the unlocked form.
- Complete it through its checkbox and assert PATCH 200.
- Submit a second unique entry.
- Delete it through its button, accept confirmation, and assert DELETE 200.
- Read the feed and assert completed/deleted canonical states.

Verification:

- `npx playwright test tests/backstage-flow.spec.ts --project=backstage` passes;
- each network transition is tied to its expected method and path;
- assertions use unique markers to tolerate prior local rows.

## 8. Run regression and disclosure gates

Run focused and broad checks:

```text
npm test
npm run typecheck
npm run build
npm run leak:check
git diff --check
```

For leak evidence:

- run a built local server with a deterministic passcode marker;
- point the checker at a reachable raw response;
- set the checker’s scan marker to that same passcode value;
- retain output in `progress.md`.

Verification criteria:

- all Node tests pass;
- Astro/TypeScript checks report no errors;
- production build succeeds;
- exact runtime passcode marker is absent from emitted browser assets;
- no whitespace errors exist.

## 9. Record implementation progress and commit

- Create `progress.md` before or alongside implementation edits.
- Mark each plan item complete as evidence lands.
- Document deviations before following a changed approach.
- Stage only the page, flow test/contract, and progress artifact.
- Inspect staged diff and run staged whitespace check.
- Commit as the meaningful feature unit.

Expected implementation paths:

- `src/pages/backstage.astro`;
- `tests/backstage-flow.spec.ts`;
- `tests/support/flow-contract.ts`;
- `docs/active/work/T-008-03-01/progress.md`.

## 10. Review and handoff

- Inspect the final commit and working tree.
- Reconcile every acceptance clause with code and test evidence.
- Write `review.md` summarizing created/modified/deleted files.
- Report test coverage strengths and intentional gaps.
- Report disclosure evidence and passcode lifetime.
- Surface open concerns, TODOs, and any human-review issue.
- Leave ticket frontmatter and Lisa provenance untouched.
- Commit only the review artifact.
- Stop after `review.md` is written and committed.

## Atomic commit intent

1. `docs(T-008-03-01): research through implementation plan`
2. `feat(T-008-03-01): unify backstage dashboard`
3. `docs(T-008-03-01): complete implementation review`

## Rollback boundary

The feature commit can be reverted without schema or backend rollback. The old APIs remain stable,
and no persisted data shape changes. Reverting restores only the earlier submit-only browser surface
and its earlier flow contract.
