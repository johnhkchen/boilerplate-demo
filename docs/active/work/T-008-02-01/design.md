# Design — T-008-02-01 feed exposes id and completion

## Decision summary

Publish the canonical `BackstageEntry[]` returned by `listEntries` directly in the existing feed
envelope. Remove the temporary four-field projection and type `BackstageFeed.entries` as
`BackstageEntry[]`. Retain schema version 1, gate behavior, envelope keys, count calculation, and
oldest-first store order. Strengthen the SQLite-backed retrieval test into a lifecycle scenario
that completes one entry, deletes another, compares the feed deeply to the canonical store read,
and proves denied requests cause zero store prepares. Exercise the actual `npm run backstage:feed`
command against a local test server to pin transparent CLI printing. Update the retrieval-seam
knowledge document to describe the evolved six-field contract.

## Decision drivers

1. The feed must expose the store's stable id and completion state verbatim.
2. Existing content fields must remain byte-for-byte unchanged.
3. Store ordering is already canonical and must not be reimplemented.
4. Completed and deleted state must be observable in one acceptance scenario.
5. Gate precedence must be measured directly.
6. The CLI must remain a transparent entry-array consumer.
7. The submission boundary must remain four-field and unchanged.
8. The solution should avoid a duplicate feed-entry contract.
9. Tests must use committed migrations and a real SQLite engine.
10. No live Cloudflare resource should be required.

## Feed publication options

### Option A — return `listEntries` results directly

Shape:

```ts
const entries = await listEntries(input.db);
```

Advantages:

- Publishes the canonical six-field `BackstageEntry` contract.
- Preserves all values with no transformation opportunity.
- Preserves store ordering exactly.
- Removes temporary compatibility code.
- Makes future type drift visible at compile time.
- Keeps one mapping boundary: physical rows in `backstage-store.ts`.

Costs:

- Existing consumers see two additive fields.
- The retrieval module becomes deliberately coupled to the persisted public contract.

Assessment: chosen. This coupling is the ticket's purpose, and direct publication is the strongest
interpretation of "matching the store byte-for-byte."

### Option B — replace the temporary mapper with a six-field mapper

Advantages:

- Makes the feed projection explicit.
- Could insulate the feed from later store additions.

Costs:

- Copies every field without adding policy.
- Creates a second public contract that can drift.
- Weakens the literal store-to-feed equivalence.
- Adds needless opportunities to normalize or omit values.

Assessment: rejected. The settled `BackstageEntry` is already the intended feed entry shape.

### Option C — spread store entries into new objects

Advantages:

- Returns fresh objects from the retrieval module.

Costs:

- Adds allocation without a boundary benefit.
- Still relies implicitly on store keys.
- Does not improve serialization or safety.

Assessment: rejected. Store mapping already constructs fresh public objects.

## Feed type options

### Option A — use `BackstageEntry[]`

Advantages:

- Reuses the settled contract.
- Pins id as numeric and completion as nullable string.
- Lets TypeScript detect incomplete publication.
- Removes the obsolete `NewBackstageEntry` import.

Costs:

- Changes the exported `BackstageFeed` TypeScript contract.

Assessment: chosen. Runtime and static contracts should evolve together.

### Option B — define a duplicate `BackstageFeedEntry`

Advantages:

- Allows the feed to diverge intentionally later.

Costs:

- Today it would duplicate all six properties.
- The ticket explicitly calls for the same entries verbatim.

Assessment: rejected. Introduce a distinct type only when semantics actually differ.

### Option C — leave the old type and cast

Advantages:

- Minimal textual change.

Costs:

- Makes the exported type lie about runtime values.
- Hides the exact protocol evolution acceptance asks to settle.

Assessment: rejected.

## Schema-version options

### Option A — retain `schemaVersion: 1`

Advantages:

- Matches the ticket's additive evolution language.
- Leaves the envelope unchanged beyond the added entry fields.
- Avoids implying a parallel v2 endpoint or negotiation mechanism.
- Aligns with ordinary JSON forward-compatible added properties.

Costs:

- Strict consumers that reject unknown entry keys can break despite the unchanged marker.
- The marker does not distinguish pre- and post-management entry shape.

Assessment: chosen. The ticket explicitly asks for the existing feed to gain these fields and for
the CLI to remain unchanged beyond them. No consumer negotiation exists, and bumping the literal
alone would not provide compatibility. Documentation will make the additive contract explicit.

### Option B — bump to schema version 2

Advantages:

- Signals a contract change to consumers.

Costs:

- Goes beyond acceptance.
- Existing tests and documentation would need a version transition policy.
- There is no endpoint selection, accept header, or dual response implementation.
- It changes the envelope in addition to the requested fields.

Assessment: rejected for this ticket. A future incompatible redesign should define actual version
handling rather than only incrementing a number.

## Lifecycle acceptance-test design

Arrange three inserted entries with hard content and tied timestamps where useful. Read the
canonical store to capture their assigned ids. Complete one surviving row with a fixed ISO string.
Delete a different row. Read `listEntries` again to establish the exact canonical expected state.
Call `readBackstageFeed` with the valid passcode and compare `body.entries` deeply to that store
snapshot.

This proves together:

- ids are the database-assigned values;
- completion is the exact stored timestamp;
- incomplete completion remains null;
- deleted identity is absent;
- surviving ids are stable and not renumbered;
- content fields survive unchanged;
- order matches `id ASC` after deletion;
- count equals the current store length;
- envelope fields remain stable.

The test should also assert the exact six keys so neither physical snake-case fields nor private
future columns escape accidentally.

## Test organization options

### Option A — evolve existing focused tests and add one lifecycle test

Advantages:

- Preserves useful granular regression diagnostics.
- Adds direct acceptance coverage without discarding hard-content tests.
- Keeps all feed guarantees in the named test file.

Costs:

- Some assertions overlap.

Assessment: chosen. Small overlap is valuable at a protocol boundary.

### Option B — replace all success tests with one large lifecycle test

Advantages:

- Less test code.

Costs:

- A failure is harder to localize.
- Empty, hard-content, and account-free cases remain independent concerns.

Assessment: rejected.

## Gate-precedence proof options

### Option A — inject a trap database and assert no `prepare`

Use an object whose `prepare()` increments a counter and throws. Exercise missing, wrong, and
misconfigured passcodes. Each response must be the expected gate denial and the counter must stay
zero.

Advantages:

- Observes the precise persistence boundary.
- Would fail immediately if gate/list ordering regressed.
- Does not depend on database contents.
- Covers all denial modes.

Costs:

- Adds a small test helper.

Assessment: chosen.

### Option B — infer precedence from absence of entries in denial bodies

Advantages:

- Already mostly covered.

Costs:

- The implementation could read the store and then discard results.
- It does not satisfy the acceptance wording strongly.

Assessment: rejected as insufficient.

### Option C — mock `listEntries`

Advantages:

- Directly counts function calls.

Costs:

- Native ESM bindings are awkward to replace without a mocking framework.
- A database trap proves the same boundary with less machinery.

Assessment: rejected.

## CLI-verification options

### Option A — run `npm run backstage:feed` against a local HTTP server

The server returns an envelope containing six-field fixture entries. The test starts the package
command as a child process with `BACKSTAGE_FEED_URL` and `DEMO_PASSCODE`, captures stdout/stderr,
and compares parsed stdout deeply to the fixture array.

Advantages:

- Proves the exact user-facing command.
- Covers fetch, envelope selection, and serialization together.
- Detects any future CLI allowlist/projection.
- Requires no external service.

Costs:

- Uses a subprocess and a local socket.
- Slightly increases focused-test runtime.

Assessment: chosen. The acceptance names the command, so executable evidence is worth the small
cost.

### Option B — inspect or unit-test copied parsing logic

Advantages:

- Faster and simpler.

Costs:

- Does not prove the package script wiring or top-level executable.
- Copying parser logic into a test can drift.

Assessment: rejected.

### Option C — rely on direct source reasoning only

Advantages:

- No test change beyond the feed.

Costs:

- Leaves half of the acceptance unexercised.

Assessment: rejected.

## CLI fixture and process details

- Bind a Node HTTP server on loopback with an ephemeral port.
- Return JSON only for the request made by the child.
- Capture the presented `x-demo-passcode` header.
- Pass a stable test value through the child environment.
- Set `BACKSTAGE_FEED_TIMEOUT_MS` high enough for CI scheduling.
- Use `execFile` or `spawn` without a shell.
- Invoke `npm` with arguments `run`, `backstage:feed`, and `--silent`.
- Parse stdout as JSON rather than comparing whitespace.
- Assert child exit code success through the promisified process API.
- Close the server in `finally`.
- Avoid printing the fixture passcode in production output assertions.

## Documentation design

Update `docs/knowledge/backstage-retrieval-seam.md` in place:

- show `id` and `completedAt` in the response example;
- include one null and one completed timestamp;
- describe exactly six public fields;
- identify id as the stable public management handle;
- explain completion null/string semantics;
- retain oldest-first rationale;
- replace the obsolete no-id guarantee;
- state completion/deletion changes are reflected on the next read;
- describe tests executing both committed migrations.

The endpoint, passcode, status codes, CLI configuration, and account-free boundary remain intact.

## Error-handling decision

Do not catch store exceptions in the retrieval core. This ticket does not change error policy.
Existing behavior lets unexpected persistence failures reject to the runtime boundary, while only
the known missing-binding case receives the safe `store_unavailable` response. Adding id and
completion does not create a new expected error.

## Security and privacy assessment

- Stable ids and completion are intentionally public to passcode holders.
- The passcode remains server-side configuration and request-header input.
- No response includes the configured passcode.
- Gate ordering remains the outer wall and gains direct regression coverage.
- No account, cookie, or per-user identity is added.
- No new database identifiers or Cloudflare account metadata are committed.
- Entry content retains the documented low-stakes warning.

## Rejected scope

- Do not change `BackstageEntry` or `NewBackstageEntry`.
- Do not change migrations or store SQL.
- Do not change the submission response.
- Do not implement PATCH or DELETE HTTP routes.
- Do not add dashboard rendering.
- Do not add pagination or filtering.
- Do not reorder entries for human presentation.
- Do not add agent write-back.

## Expected outcome

The feed becomes a transparent gated serialization of the store's canonical current entry list.
Its only protocol delta is two fields per entry: stable numeric `id` and nullable string
`completedAt`. The same list is printed by the existing CLI, while tests make lifecycle state and
gate-before-read ordering explicit.
