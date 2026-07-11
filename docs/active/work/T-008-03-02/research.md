# Research — T-008-03-02 backstage dashboard end-to-end flow

## Ticket position

- The ticket starts in `research`.
- It depends on `T-008-03-01`.
- The dependency has implementation and review artifacts.
- The dependency has already landed the unified backstage dashboard.
- This ticket owns the end-to-end proof of that dashboard and its agent-facing seam.
- The acceptance names `tests/backstage-flow.spec.ts` explicitly.
- The acceptance names `npm run test:flow:backstage` explicitly.
- The required sequence is unlock, submit, mark complete, and delete.
- Each change must be reflected by `GET /api/backstage/feed` verbatim.
- Ticket phase and status are Lisa-owned and must remain untouched.

## Existing browser specification

- `tests/backstage-flow.spec.ts` already exists.
- It imports Playwright `expect` and `test`.
- It imports the shared `PASSCODE_HEADER` constant.
- It imports the backstage passcode, step names, budgets, and project name.
- It skips unless the active project is `backstage`.
- It uses both Playwright's browser `page` and API `request` fixtures.
- It generates a per-run marker from the current timestamp.
- The marker distinguishes test-created rows from persistent local D1 rows.
- It creates a seed feedback row through the real POST endpoint before navigation.
- It opens `/backstage` and proves the page is initially locked.
- It submits a wrong passcode and observes the real feed denial.
- It submits the configured test passcode and observes a real feed success.
- It proves the seed row renders after unlock.
- It proves the password input is cleared after unlock.
- It submits a reference row through the rendered form.
- It locates the new row after the dashboard's canonical refresh.
- It reads the assigned id from the row's `data-entry-id` attribute.
- It marks that row complete through its native checkbox.
- It observes the addressed PATCH response.
- It creates a separate feedback row for deletion.
- It accepts the browser confirmation dialog.
- It observes the addressed DELETE response.
- It proves the deleted row leaves the DOM.
- It performs one direct gated feed read at the end.

## Current assertion boundary

- The final direct feed assertion checks the seed text is present.
- It finds the completed row by text.
- It checks that row's id equals the DOM-derived id.
- It checks `completedAt` has string type.
- It checks no row has the deleted id or deleted text.
- It does not compare the feed entry to an exact expected six-field object.
- It does not directly read the feed after unlock as an API fixture assertion.
- It does not directly read the feed immediately after submission.
- It does not directly read the feed immediately after completion.
- It does not directly read the feed immediately after deletion until the final step.
- The browser itself refreshes the feed after every successful mutation.
- Those browser refresh responses are awaited indirectly through the resulting DOM.
- Their bodies are runtime-validated by the page client.
- The spec currently proves UI state more strongly than agent-seam state.

## Playwright project

- `playwright.config.ts` defines a dedicated `backstage` project.
- Its `testMatch` selects `backstage-flow.spec.ts`.
- It uses Playwright's Pixel 5 device preset.
- The preset supplies a phone viewport, touch, and mobile browser context.
- The repository disables full parallelism.
- The repository uses one Playwright worker.
- The test timeout is 35 seconds.
- The global run timeout is 60 seconds.
- The action timeout is 10 seconds.
- The assertion timeout is 8 seconds.
- Traces are retained on failure.
- The reporter writes a list view and JSON flow report.

## Owned server and data store

- The backstage project normally starts its own Astro development server.
- The owned server listens on `127.0.0.1:4323`.
- An external `PLAYWRIGHT_BASE_URL` disables the owned server.
- The owned server uses an isolated Wrangler configuration.
- `tests/support/backstage.wrangler.jsonc` declares `BACKSTAGE_DB`.
- The configuration points migrations at the repository migration directory.
- Playwright applies local D1 migrations before Astro starts.
- The migration and server share `.wrangler/state` persistence.
- The configured database is persistent across local test invocations.
- The spec therefore cannot assume an empty feed or fixed ids.
- Unique marker-based lookup is the established isolation mechanism.
- The server receives a deterministic local test passcode.
- The same passcode constant is used by the spec.
- The passcode is a test knock, not a production secret.

## Package command

- `package.json` defines `test:flow:backstage`.
- The command is `playwright test --project=backstage`.
- The project match limits that command to the backstage specification.
- The repository's `verify` command already includes this flow command.
- No new package script is required for the named acceptance command to exist.

## Dashboard request sequence

- Unlock sends `GET /api/backstage/feed`.
- A successful unlock stores the typed passcode in a lexical variable.
- The password input is then cleared.
- Submission sends `POST /api/backstage/entries`.
- A successful submission immediately refreshes with a feed GET.
- Completion sends `PATCH /api/backstage/entries/[id]`.
- A successful completion immediately refreshes with a feed GET.
- Deletion sends `DELETE /api/backstage/entries/[id]`.
- A successful deletion immediately refreshes with a feed GET.
- Every request uses the shared `x-demo-passcode` header.
- No later dashboard action asks the visitor for another credential.

## Feed contract

- `src/lib/backstage-retrieval.ts` owns the feed contract.
- Success returns schema version `1`.
- Success returns gate marker `backstage`.
- Success returns `count` equal to the entries array length.
- Entries are returned oldest-first.
- Entries come directly from `listEntries` without projection.
- Each entry uses the `BackstageEntry` interface.
- `id` is a positive numeric D1 primary key.
- `type` is `reference` or `feedback`.
- `url` is the persisted string, including an empty string for linkless feedback.
- `text` is the submitted text unchanged.
- `submittedAt` is a server-generated ISO timestamp string.
- `completedAt` is initially `null`.
- `completedAt` becomes a server-generated ISO timestamp when marked complete.
- Hard-deleted entries are absent from later feed reads.
- Existing unrelated rows may remain around the test-created rows.

## Submission response boundary

- The POST route returns status 201 on success.
- Its body contains the insert-ready entry.
- That object includes type, URL, text, and submitted timestamp.
- It does not include the D1-assigned id.
- It does not include `completedAt`.
- The canonical feed refresh is therefore the first complete public representation.
- Exact expected feed objects can combine POST response fields with feed-owned id and null completion.

## Completion response boundary

- PATCH returns status 200 on success.
- Its body contains boundary marker `backstage_management`.
- Its nested entry contains the addressed id.
- Its nested entry contains the authoritative completion timestamp.
- The completed feed row should otherwise match the submitted feed row.
- The returned timestamp can anchor an exact post-completion expectation.

## Deletion response boundary

- DELETE returns status 200 on success.
- Its body contains boundary marker `backstage_management`.
- Its nested deleted object contains the addressed id.
- Deletion is a hard delete.
- The exact post-delete feed condition is absence of the prior complete object.
- Other test-created and pre-existing objects remain unchanged.

## Existing supporting coverage

- `test/backstage-route.test.mjs` covers POST validation and persistence.
- `test/backstage-retrieval.test.mjs` covers the full feed envelope and ordering.
- `test/backstage-management.test.mjs` covers PATCH and DELETE mappings.
- `test/backstage-store.test.mjs` covers exact persisted state transitions.
- `T-008-03-01` reviewed page behavior and phone interaction.
- This ticket's distinct boundary is composition against a running server.

## Repository state and constraints

- Lisa has modified ticket frontmatter and `.lisa/provenance.jsonl` in the worktree.
- Those modifications predate this implementation session.
- They must not be staged or committed by this ticket.
- The ticket frontmatter diff is `phase: ready` to `phase: research`.
- The workflow requires all remaining phase artifacts under this ticket's work directory.
- Implementation progress belongs in `progress.md`.
- Review must summarize changes, coverage, and open concerns.
- The repository workflow requires incremental commits for meaningful units.
- No application source change is implied by the acceptance criterion.

## Research conclusion

- The running-server infrastructure and named package command already exist.
- The dashboard already performs the requested human interaction sequence.
- The current specification already verifies the rendered UI transition sequence.
- The remaining observable gap is mutation-by-mutation, exact feed-contract proof.
- The exact values needed for that proof are exposed by POST, feed, PATCH, and DELETE responses.
- Persistent local data requires selecting test-owned rows instead of asserting the entire feed array.
