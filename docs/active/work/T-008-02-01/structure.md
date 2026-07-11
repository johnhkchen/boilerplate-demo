# Structure — T-008-02-01 feed exposes id and completion

## Change map

The implementation modifies four existing files and creates this ticket's workflow artifacts.
No runtime module, test file, migration, route, package script, or configuration file is created.
No tracked file is deleted.

Runtime/type change:

- `src/lib/backstage-retrieval.ts`

Acceptance coverage:

- `test/backstage-retrieval.test.mjs`

Public seam documentation:

- `docs/knowledge/backstage-retrieval-seam.md`

Workflow artifacts:

- `docs/active/work/T-008-02-01/research.md`
- `docs/active/work/T-008-02-01/design.md`
- `docs/active/work/T-008-02-01/structure.md`
- `docs/active/work/T-008-02-01/plan.md`
- `docs/active/work/T-008-02-01/progress.md`
- `docs/active/work/T-008-02-01/review.md`

## Unchanged architecture

```text
agent / npm run backstage:feed
              |
              v
GET /api/backstage/feed
src/pages/api/backstage/feed.ts
              |
              v
readBackstageFeed(request, configured, db)
src/lib/backstage-retrieval.ts
       | gate first       | allowed only
       v                  v
guardPasscode         listEntries(db)
src/lib/passcode.ts   src/lib/backstage-store.ts
                             |
                             v
                       BACKSTAGE_DB / D1
```

The ticket changes the entry payload at the retrieval-core output. It does not move any boundary
or add another route.

## `src/lib/backstage-retrieval.ts`

### Imports

Replace the combined type import of `BackstageEntry` and `NewBackstageEntry` with only the
complete persisted contract:

```ts
import type { BackstageEntry } from './backstage-entry.ts';
```

The module no longer needs the insert-ready type because retrieval publishes persisted objects.

### Exported feed interface

Retain these members unchanged:

```ts
schemaVersion: typeof FEED_SCHEMA_VERSION;
gate: typeof GATE_NAME;
count: number;
```

Change only the entry collection:

```ts
entries: BackstageEntry[];
```

This makes the public TypeScript contract match JSON runtime output.

### Removed internal projection

Delete `toCurrentFeedEntry` entirely. It currently accepts `BackstageEntry` and returns
`NewBackstageEntry` by copying only type, URL, text, and submission timestamp. Its staged purpose
ends in this ticket.

No replacement mapper is introduced. Physical-to-public translation remains exclusively in
`backstage-store.ts`.

### Success composition

Replace:

```ts
const entries = (await listEntries(input.db)).map(toCurrentFeedEntry);
```

with:

```ts
const entries = await listEntries(input.db);
```

The envelope construction remains otherwise unchanged. `count` derives from the same array that
is serialized.

### Comments

Remove dependency-era comments that promise a four-field feed or defer publication to this ticket.
Document that entries are canonical complete persisted values. Retain comments describing the
gate as the outer wall, store-presence order, oldest-first behavior, and versioned envelope.

### Stable interfaces

These exports keep their names and signatures:

- `FEED_SCHEMA_VERSION`
- `BackstageFeed` except its evolved entries element type
- `ReadBackstageFeedInput`
- `readBackstageFeed(input): Promise<Response>`

No caller signature changes.

## `test/backstage-retrieval.test.mjs`

### Imports

Extend built-in imports for CLI testing:

- `execFile` from `node:child_process`
- `createServer` from `node:http`
- `promisify` from `node:util`

Extend store imports:

- `deleteEntry`
- `listEntries`
- `saveEntry`
- `setEntryCompletion`

Define a promisified child-process helper at module scope.

### Existing SQLite fixture

Keep `createEntryStore` and both committed migrations unchanged. The fixture already supports the
mutation calls because its statements expose `run()`.

No copied schema or hand-authored table definition is added.

### Persisted expectation helper

Tests that save a single `NewBackstageEntry` must expect database-owned fields:

```js
{
  id: 1,
  ...submitted,
  completedAt: null,
}
```

Assertions continue to compare hard content explicitly.

### Oldest-first test

After three saves, derive expected values with stable assigned ids and null completion, or compare
against `listEntries(store)`. Assert ids `[1, 2, 3]`, original content order, and count 3.

### Envelope-shape test

Rename the old "never exposes id" test. Assert exact sorted keys:

```text
completedAt
id
submittedAt
text
type
url
```

Retain assertions for schema version, gate marker, and count.

### Lifecycle acceptance test

Add a dedicated test with this state sequence:

1. Save three entries.
2. Read canonical store values to learn assigned ids.
3. Complete one surviving entry with a fixed timestamp.
4. Delete a different entry by its id.
5. Read canonical store state again.
6. Retrieve the feed with the valid passcode.
7. Deep-compare `body.entries` with canonical current store state.
8. Assert the completed id and timestamp.
9. Assert the deleted id is absent.
10. Assert surviving order remains oldest-first.

This test is the central acceptance proof and should mention complete/delete in its name.

### Gate-read trap

Add a helper database object that records `prepare` calls and throws if reached. Use it for the
missing, wrong, and blank-configured passcode tests, or add one table-driven test over all three.
Assert:

- status matches 401, 403, or 500;
- response has no entries;
- prepare-call count remains zero.

Existing real-store gate tests may be consolidated if their status/body coverage is preserved.

### CLI server helper

Add a small promise-based helper that:

- creates a loopback HTTP server;
- listens on an ephemeral port;
- records the request passcode header;
- sends a controlled JSON feed envelope;
- returns its URL, captured-header accessor, and close function.

Keep the helper local to the test file; it is test infrastructure, not product code.

### CLI acceptance test

Construct a two-entry fixture containing:

- numeric ids;
- one null completion;
- one fixed completion timestamp;
- hard content in URL/text;
- existing type and submittedAt fields.

Run:

```text
npm run backstage:feed --silent
```

with child environment overrides:

- `BACKSTAGE_FEED_URL=<loopback URL>`
- `DEMO_PASSCODE=<fixture passcode>`
- `BACKSTAGE_FEED_TIMEOUT_MS=5000`

Assert parsed stdout deeply equals the fixture entry array and the server saw the passcode header.
Close the server in `finally`.

### Existing retained coverage

Keep tests for:

- empty store;
- hard content fidelity;
- missing store after a valid gate;
- account-free retrieval and absence of cookies.

## `docs/knowledge/backstage-retrieval-seam.md`

### Response example

Add `id` and `completedAt` to each shown entry. Show both states:

- one entry with `completedAt: null`;
- one entry with a fixed ISO completion timestamp.

### Contract prose

Replace "exactly four fields" with the six-field public contract. Explain:

- `id` is a stable numeric handle assigned by persistence;
- `completedAt` is null while incomplete and a timestamp string when complete;
- the four existing submission fields remain verbatim;
- deletes disappear from subsequent reads;
- completion changes appear without content reshaping.

### Guarantees

Delete the obsolete "No id leak" guarantee. Replace it with a lifecycle-state guarantee covering
identity, completion, and deletion reflection. Retain content fidelity, server-side passcode, and
sovereignty guarantees.

### Verification prose

State that tests execute both committed migrations and exercise a completed and deleted entry.
Mention the package command is tested against a local HTTP feed.

## Explicitly unchanged files

- `src/lib/backstage-entry.ts` — settled six-field contract.
- `src/lib/backstage-store.ts` — canonical read/mutation behavior.
- `src/pages/api/backstage/feed.ts` — thin env-owning delegation already inherits the change.
- `scripts/backstage-feed.ts` — already shape-transparent.
- `src/lib/backstage-route.ts` — submission behavior remains four-field.
- `src/pages/api/backstage/entries.ts` — POST edge unchanged.
- `migrations/0001_create_backstage_entries.sql` — base schema unchanged.
- `migrations/0002_add_backstage_entry_completion.sql` — additive state schema unchanged.
- `package.json` and lockfile — existing command/test wiring is sufficient.
- ticket frontmatter and Lisa provenance — workflow-owned.

## Ordering of changes

1. Update feed runtime/type contract and remove the mapper.
2. Update existing feed expectations to six fields.
3. Add complete/delete lifecycle proof.
4. Add direct gate-before-read proof.
5. Add package-command CLI proof.
6. Update public seam documentation.
7. Run focused and repository-wide gates.
8. Record evidence and review.

Runtime and tests should land in the same implementation commit so no committed revision exposes
the new payload without matching acceptance evidence.

## Ownership and commit boundaries

The first documentation commit may contain Research, Design, Structure, and Plan artifacts. The
implementation commit contains only the retrieval core, named test, seam documentation, and
`progress.md`. The review artifact lands after verification. Explicit path staging prevents Lisa
and sibling-ticket changes from entering this ticket's commits.
