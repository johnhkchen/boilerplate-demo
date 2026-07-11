# Research — T-008-02-01 feed exposes id and completion

## Ticket state and scope

- Ticket `T-008-02-01` starts in the `research` phase.
- It depends on completed store ticket `T-008-01-02`.
- It is the read-seam half of story `S-008-02`.
- The sibling ticket owns the complete/delete HTTP mutation route.
- This ticket owns publication of already-settled store fields through the feed.
- Acceptance names `test/backstage-retrieval.test.mjs` as executable evidence.
- The feed must expose entry identity and completion state.
- Values must match the store byte-for-byte.
- Ordering must remain oldest-first.
- The observed feed must reflect a completed row.
- The observed feed must omit a deleted row.
- The passcode gate must precede every store read.
- `npm run backstage:feed` must print the evolved entry objects unchanged.
- Ticket `phase` and `status` are Lisa-owned and must remain untouched.

## Settled entry contract

- `src/lib/backstage-entry.ts` defines the portable entry contracts.
- `BackstageEntry` is the complete persisted/public shape.
- It contains `id: number`.
- It contains `type: 'reference' | 'feedback'`.
- It contains `url: string`.
- It contains `text: string`.
- It contains `submittedAt: string`.
- It contains `completedAt: string | null`.
- Null is the only incomplete state.
- A string carries the completion timestamp verbatim.
- `NewBackstageEntry` omits `id` and `completedAt`.
- Submission code uses the insert-ready four-field type.
- Retrieval can now use the complete six-field type without changing submission.

## Settled database schema

- Migration `0001` creates `backstage_entries`.
- Its primary key is `id INTEGER PRIMARY KEY`.
- It stores content in `type`, `url`, `text`, and `submitted_at`.
- Migration `0002` adds nullable `completed_at TEXT`.
- Existing and newly inserted rows are incomplete until mutated.
- The primary key is stable for the row's lifetime.
- Hard deletion removes a row rather than marking it hidden.
- No soft-delete column or audit history exists.
- The feed therefore reflects deletion by absence.

## Settled store behavior

- `src/lib/backstage-store.ts` is the only persistence mapping.
- `saveEntry` inserts the four caller-owned fields.
- D1 assigns identity and null completion.
- `listEntries` explicitly selects all six persisted fields.
- It maps physical snake case to public camel case.
- It returns `Promise<BackstageEntry[]>`.
- Its SQL orders by `id ASC`.
- This is deterministic insertion/oldest-first order.
- It does not order by caller-supplied timestamps.
- `setEntryCompletion` updates one row by id.
- It accepts the exact `string | null` completion representation.
- `deleteEntry` hard-deletes one row by id.
- Both mutations return whether exactly one row changed.
- These operations are sufficient to arrange the acceptance fixture.

## Current retrieval core

- `src/lib/backstage-retrieval.ts` is framework-free.
- `readBackstageFeed` receives request, configured passcode, and store.
- It composes `guardPasscode` and `listEntries`.
- It reads no environment variable directly.
- It imports no Astro or Cloudflare runtime module.
- `FEED_SCHEMA_VERSION` is currently literal `1`.
- `BackstageFeed` has `schemaVersion`, `gate`, `count`, and `entries`.
- Its current `entries` type is `NewBackstageEntry[]`.
- That type represents the old four-field publication contract.
- The store already returns complete `BackstageEntry` values.
- A private `toCurrentFeedEntry` mapper removes `id` and `completedAt`.
- This mapper was deliberately added by the dependency ticket.
- Its comment explicitly assigns removal to this ticket.
- The runtime maps every listed row through that projection.
- No other transformation occurs in the retrieval core.

## Gate ordering

- `readBackstageFeed` calls `guardPasscode` first.
- A denial returns immediately.
- Store presence is checked only after the gate allows.
- `listEntries` is called only after both checks.
- Missing passcode returns the shared gate's 401 response.
- Wrong passcode returns the shared gate's 403 response.
- Blank server passcode returns the shared gate's safe 500 response.
- Missing store after successful authentication returns `store_unavailable`.
- Existing tests verify denial bodies do not contain entries.
- Existing tests do not directly count or trap store reads.
- Acceptance strengthens this to prove precedence, not merely infer it.

## HTTP edge

- `src/pages/api/backstage/feed.ts` is the dynamic Astro route.
- It delegates directly to `readBackstageFeed`.
- It passes `env.DEMO_PASSCODE` and `env.BACKSTAGE_DB`.
- It has no entry-shape mapping of its own.
- The edge therefore inherits the core's evolved envelope automatically.
- No route source change is required for field publication.
- There is no second feed implementation to synchronize.

## Repo-local CLI

- `scripts/backstage-feed.ts` backs `npm run backstage:feed`.
- It calls `GET /api/backstage/feed` over HTTP.
- It presents the passcode through `x-demo-passcode`.
- On success it parses the response body.
- If an `entries` property exists, it selects that array.
- It serializes the selected value with `JSON.stringify`.
- It does not enumerate, rename, or project entry keys.
- It therefore preserves added `id` and `completedAt` fields by construction.
- It also preserves the existing content fields and ordering.
- On unexpected body shape it prints the parsed body or raw text.
- Current retrieval tests do not execute the CLI.
- The acceptance wording calls for evidence that the command still prints entries.

## Existing retrieval tests

- `test/backstage-retrieval.test.mjs` uses Node's test runner.
- It executes both committed migrations in an in-memory SQLite database.
- Its adapter exposes the same narrow store surface used by production.
- It imports `saveEntry` and `readBackstageFeed`.
- The first test currently expects the old submitted object exactly.
- Hard-content coverage pins newlines, Unicode, quotes, and encoded URLs.
- Multi-row coverage pins insertion order and count.
- Empty-store coverage pins the empty envelope.
- The envelope test explicitly asserts four keys.
- It explicitly asserts absence of both `id` and `completedAt`.
- Those assertions are now intentionally obsolete.
- Gate tests cover missing, wrong, and blank configured passcodes.
- Missing-store coverage confirms the safe post-gate 500.
- Account-free coverage confirms no cookie/session is issued.
- No existing test completes or deletes a row before reading the feed.
- No existing test directly observes whether a denied call touched the store.
- No existing test invokes `npm run backstage:feed`.

## Test-fixture capabilities

- The in-memory adapter supports `run()` and `all()`.
- It can support `setEntryCompletion` and `deleteEntry` without changes.
- Store reads can be trapped with a wrapper around `prepare` or the whole database.
- A throwing database object is enough to prove denial short-circuiting.
- It is stronger to count attempted `prepare` calls and assert zero.
- The feed response can be compared with `listEntries(store)`.
- That comparison uses the same canonical public mapping as production.
- A snapshot taken after complete/delete establishes the expected store state.
- Comparing deep objects pins field names, values, and order together.

## CLI test constraints

- The CLI is a top-level executable and calls `process.exit`.
- Importing it in-process would terminate the test runner.
- It should be exercised in a child process.
- The package script already includes Node's strip-types flag.
- A local HTTP server can return a controlled feed envelope.
- The child can receive `BACKSTAGE_FEED_URL` pointing to that server.
- The child can receive a non-secret fixture `DEMO_PASSCODE`.
- Capturing stdout proves the actual package command's print behavior.
- Capturing the request header can also prove it used the configured passcode.
- No live Worker, D1, or external network is needed.
- The server must be closed even if the child command fails.

## Documentation state

- `docs/knowledge/backstage-retrieval-seam.md` documents this public seam.
- Its example currently shows four-field entries.
- It says every entry has exactly four fields.
- It calls `id` storage-private and promises it never leaks.
- Its guarantees repeat the no-id claim.
- Those statements become incorrect under this ticket.
- The document does not mention completion state.
- It should describe stable public identity and nullable completion.
- Its example should show incomplete and completed rows.
- Verification prose currently says one committed migration in the singular.
- Tests now execute both migrations.

## Versioning observation

- The envelope exposes `schemaVersion: 1`.
- Adding keys to each entry changes the payload contract.
- The ticket says the command is unchanged in shape "beyond the added fields."
- No acceptance criterion asks for a schema-version increment.
- The story describes evolving the existing seam, not introducing v2.
- The dependency comment calls the current mapper temporary publication staging.
- Existing consumers are expected to tolerate added fields.
- Whether to bump the marker is a Design decision.

## Relevant boundaries and non-goals

- The POST submission route remains the four-field insert boundary.
- The new mutation route belongs to sibling `T-008-02-02`.
- The human dashboard belongs to story `S-008-03`.
- This ticket adds no editing, threading, moderation, or assignment.
- The agent remains read-only through the retrieval seam.
- It adds no second credential or user identity.
- It does not change D1 bindings or migrations.
- It does not deploy or mutate a remote database.
- It does not modify ticket frontmatter.

## Repository and concurrency state

- Lisa has modified provenance and several ticket frontmatter files.
- Those workflow files are not owned by this implementation.
- `docs/active/work/T-008-02-02/` exists from the parallel sibling ticket.
- The story declares the two tickets file-disjoint.
- The sibling owns new management files, not retrieval files.
- Commits must stage only this ticket's owned paths.
- Existing user/Lisa changes must remain preserved.

## Verification surfaces

- Focused test: `node --experimental-strip-types --test test/backstage-retrieval.test.mjs`.
- Full unit gate: `npm test`.
- Type gate: `npm run typecheck`.
- Diff hygiene: `git diff --check` and commit checks.
- A focused test can prove feed state, gate ordering, and CLI output without metered services.
- The full suite protects submission, store, session, and operational regressions.
