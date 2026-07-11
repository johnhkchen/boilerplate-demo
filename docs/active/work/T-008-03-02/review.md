# Review — T-008-03-02 backstage dashboard end-to-end flow

## Outcome

The ticket acceptance criterion is met. `tests/backstage-flow.spec.ts` drives the complete unified
backstage dashboard sequence against a running Astro/Cloudflare server on the dedicated Pixel 5
Playwright project:

1. open the locked dashboard;
2. refuse a wrong passcode;
3. unlock with the shared passcode;
4. submit an entry without another credential;
5. mark that entry complete;
6. delete that same entry.

After every successful state transition, a separate gated `GET /api/backstage/feed` observes the
canonical store through the agent seam. The test compares complete six-field objects rather than
partial predicates, then proves the completed row is absent after deletion. The named command
`npm run test:flow:backstage` is green.

## Acceptance criterion assessment

### `tests/backstage-flow.spec.ts` drives unlock

Met.

- Navigation begins at `/backstage` on the mobile project.
- The dashboard and submission action are hidden while locked.
- A known wrong passcode causes the real feed endpoint to return 403.
- The page remains locked and announces the refusal.
- The configured test passcode causes the real feed endpoint to return 200.
- The gate hides and the unified dashboard becomes visible.
- Focus moves to the shared checklist heading.
- The password input is cleared.
- There is no password input inside the unlocked dashboard.
- A uniquely seeded entry appears in the checklist.

### Feed reflects unlock/list state verbatim

Met.

- The seed is created against the running server before navigation.
- Its POST response supplies the authoritative submitted timestamp.
- A direct gated feed read follows successful browser unlock.
- The unique seed row is selected without assuming an empty persistent store.
- Its full object is compared exactly:
  - D1 id;
  - `feedback` type;
  - empty URL;
  - exact marked text;
  - exact server-returned submitted timestamp;
  - null completion.
- The feed envelope also pins schema version, gate marker, and count consistency.

### Browser submits without a second credential

Met.

- The rendered dashboard form fills a reference URL and marked text.
- No passcode is entered again.
- The browser observes the real POST response with status 201.
- The POST response retains the exact type, URL, and text.
- The newly refreshed checklist row becomes visible.
- Its rendered link retains the exact URL.
- Its server-assigned id is read from canonical dashboard state.

### Feed reflects submitted state verbatim

Met.

- A direct gated feed read follows the dashboard's successful submit refresh.
- The row is selected by its stable server-assigned id.
- The exact expected object uses test-owned type, URL, and text.
- It uses the authoritative POST submitted timestamp.
- It requires `completedAt` to be exactly null.
- Deep equality covers every public field and refuses extras or transformations.

### Browser marks the entry complete

Met.

- The rendered native checkbox drives the action.
- The test waits for PATCH at the exact id-addressed route.
- The response is status 200.
- The response boundary is exactly `backstage_management`.
- The response id equals the lifecycle id.
- The response completion value is a valid timestamp string.
- The refreshed checkbox is checked and disabled.
- The row contains the textual `Complete` state.

### Feed reflects completion verbatim

Met.

- A direct gated feed read follows the dashboard's successful completion refresh.
- The row is selected by the same stable id.
- The expected complete object is copied from the exact incomplete object.
- Only `completedAt` changes.
- Its value is the authoritative timestamp returned by PATCH.
- Deep equality proves id, type, URL, text, and submitted timestamp remain unchanged.

### Browser deletes the entry

Met.

- The same completed lifecycle row is used for deletion.
- The rendered entry-specific delete button drives the action.
- The native confirmation dialog is accepted.
- The test waits for DELETE at the exact id-addressed route.
- The response is status 200.
- The response boundary is exactly `backstage_management`.
- The deleted id equals the lifecycle id.
- The row disappears from the dashboard.
- The seed row remains visible.

### Feed reflects deletion verbatim

Met.

- A direct gated feed read follows the dashboard's successful deletion refresh.
- No feed entry has the deleted lifecycle id.
- The exact original seed object remains in the feed.
- This distinguishes a correct hard delete from an empty, broken, or wholesale-cleared feed.

### Named package command is green

Met.

`package.json` already exposes:

```text
test:flow:backstage = playwright test --project=backstage
```

The command ran successfully without script or configuration changes.

## Files created

### Workflow artifacts

- `docs/active/work/T-008-03-02/research.md`
- `docs/active/work/T-008-03-02/design.md`
- `docs/active/work/T-008-03-02/structure.md`
- `docs/active/work/T-008-03-02/plan.md`
- `docs/active/work/T-008-03-02/progress.md`
- `docs/active/work/T-008-03-02/review.md`

Research maps the pre-existing flow and identifies the missing per-transition exact seam proof.
Design evaluates three observation strategies and chooses independent direct feed reads. Structure
defines the two-file executable boundary. Plan sequences implementation, verification, and commits.
Progress records commands, results, ownership, and deviations. This document is the final handoff.

## Files modified

### `tests/backstage-flow.spec.ts`

- Imports canonical entry and feed contracts as types only.
- Adds narrow response types for POST, PATCH, and DELETE.
- Adds a gated direct-feed helper.
- Adds envelope assertions to every direct feed read.
- Captures authoritative server timestamps from mutation responses.
- Builds exact six-field expected entry objects.
- Compares the seed after unlock.
- Compares the lifecycle row after submit.
- Compares the same row after completion.
- Deletes that same completed row.
- Proves exact lifecycle absence and exact seed survival after deletion.
- Removes the partial, deferred final feed assertion.
- Removes the second row that existed only to exercise deletion.

### `tests/support/flow-contract.ts`

- Removes the obsolete `confirmCanonical` step label.
- Leaves project names, passcode, ports, and budgets unchanged.

### `docs/active/work/T-008-03-02/progress.md`

- Tracks completed work, verification, commits, and deviations.

## Files deleted

None.

## Production files unchanged

- No Astro page changed.
- No API route changed.
- No library contract changed.
- No store or migration changed.
- No Wrangler configuration changed.
- No package command changed.
- No dependency changed.
- No generated type file changed.

The implementation is strictly an acceptance-proof improvement over the already completed unified
dashboard and settled backstage seams.

## Verification evidence

### Focused browser acceptance

Command:

```text
npm run test:flow:backstage
```

Result:

```text
Running 1 test using 1 worker
1 passed (4.1s)
```

All six boxed steps passed. The test body completed in 794 ms. It ran through the backstage project
against the owned migrated local D1 server and used the Pixel 5 device preset.

### TypeScript preflight

Command:

```text
npx tsc --noEmit --pretty false
```

Result: exit code 0 with no diagnostics.

### Full type gate

Command:

```text
npm run typecheck
```

Result:

```text
Astro files: 60
errors: 0
warnings: 0
hints: 0
Worker types: up to date
```

The existing Astro `session.driver` deprecation notice appeared before diagnostics. It is unrelated
to this test-only change.

### Full Node regression

Command:

```text
npm test
```

Result:

```text
tests 172
pass 172
fail 0
skipped 0
```

This includes all backstage entry contract, SQLite store, POST route, management, retrieval, CLI,
and passcode tests, plus the broader repository suite.

### Patch hygiene

Command:

```text
git diff --check
```

Result: exit code 0; no whitespace errors.

The scoped executable diff was inspected before commit. It contained only the two planned test
files. The implementation commit staged only those files plus this ticket's progress artifact.

## Test coverage strengths

- Exercises a real browser page rather than calling mutations directly.
- Exercises a real running Astro/Cloudflare server.
- Exercises local D1 after repository migrations.
- Uses a real wrong-passcode denial.
- Proves a correct passcode is entered only once.
- Covers phone viewport and touch/mobile project configuration.
- Observes all four HTTP method boundaries used by the dashboard.
- Reads the agent seam independently after each successful transition.
- Pins feed schema version, gate marker, and count integrity.
- Deep-compares all six fields for present states.
- Uses server-authoritative ids and timestamps.
- Proves completion changes only completion state.
- Proves deletion removes exactly the lifecycle row.
- Proves a sibling survives deletion unchanged.
- Avoids false failures from unrelated persisted rows.
- Produces named boxed steps and retained traces on failure.

## Coverage gaps and limitations

### Persistent seed rows

The owned local D1 state persists across local runs. The test deletes its lifecycle entry through
the required human flow but intentionally leaves the seed entry used to prove unlock/list state.
Unique markers prevent collisions and whole-feed counts are not assumed. Repeated local runs can
still grow the development database over time. This is non-blocking and matches the predecessor's
established isolation model; a future harness-wide database reset could address it separately.

### Test-local response casts

The spec parses JSON into TypeScript response interfaces after checking HTTP status. It does not
runtime-validate every response property before using it. Exact equality assertions immediately
pin the fields needed by this flow, and dedicated route/retrieval unit suites validate malformed
and contract behavior. A shared runtime test decoder would add abstraction beyond this one ticket.

### No delete-cancel branch

The accepted destructive path is covered; cancellation of the native confirmation dialog is not.
That is unchanged in scope and does not affect the required complete/delete loop.

### External base URL mode

The named command normally owns an isolated local server. If `PLAYWRIGHT_BASE_URL` is explicitly
set, Playwright targets that external server instead and its data/configuration are caller-owned.
This is existing project behavior, not introduced here.

## Open concerns

No critical issue requires human attention.

Non-blocking repository warnings observed during verification:

- Astro reports the existing deprecated `session.driver` string signature.
- Playwright/server processes report existing `NO_COLOR` versus `FORCE_COLOR` warnings.

Neither warning changes behavior or test outcome, and neither is in this ticket's scope.

## Deviations from plan

None.

- The selected direct-feed strategy was implemented.
- The same lifecycle row was submitted, completed, and deleted.
- Production and configuration files remained unchanged.
- Existing timeout budgets were sufficient.
- Planned focused, type, unit, and diff checks passed.

## Commits

- `0b637f6 docs(T-008-03-02): research through implementation plan`
- `e625edf test(T-008-03-02): prove backstage feed lifecycle`
- Final review commit will contain only `review.md` and the final progress update.

## Metadata and ownership

The worktree contained Lisa-owned changes to `.lisa/provenance.jsonl` and ticket frontmatter before
this ticket's implementation. Those files were neither staged nor committed here. In particular,
`docs/active/tickets/T-008-03-02.md` was not manually edited by this work; its phase and status remain
under Lisa's artifact-driven transition control.

## Final handoff

The dashboard now has an explicit end-to-end executable proof that connects human actions to the
agent seam after every state change. The named backstage Playwright command is green, complete feed
objects are compared verbatim for present states, the completed object is absent after deletion,
and all repository type/unit gates pass. There are no blocking concerns or follow-up changes needed
for this ticket.
