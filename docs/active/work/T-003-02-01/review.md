# Review — T-003-02-01 passcode-gated-submission-route

## Outcome

The ticket is complete. `POST /api/backstage/entries` now gates requests with the shared
server-side passcode, validates a strict JSON submission, supplies the canonical server timestamp,
persists the entry to the configured D1-shaped store, and returns the stored representation with
status 201. Route-level tests prove a valid entry can be retrieved through the production store
module and prove gate/validation failures write zero rows.

No ticket phase or status field was changed. No remote resource was created, modified, or queried.

## Acceptance criteria

> A test hits the route: valid passcode + well-formed payload returns success and the entry is
> retrievable from the store; wrong passcode or malformed payload is rejected with a distinct
> status and nothing is written.

| Acceptance clause | Implementation | Evidence |
|---|---|---|
| Test hits the route | Test imports and invokes the real exported `POST` handler with a real `Request` | `test/backstage-route.test.mjs` |
| Valid passcode | `guardPasscode` reads `x-demo-passcode` against runtime `DEMO_PASSCODE` | happy-path route test |
| Well-formed payload | Exact `{ type, url, text }` validated at runtime | validator + happy-path test |
| Returns success | Creation returns JSON status **201** | asserted in two success tests |
| Entry retrievable | Test calls production `listEntries` after POST | deep-equals response entry |
| Wrong passcode rejected | Existing shared gate returns **403** `passcode_mismatch` | asserted; store equals `[]` |
| Malformed payload rejected | Route returns **422** `invalid_entry` | asserted; store equals `[]` |
| Distinct statuses | Test directly asserts malformed 422 is not gate 403 | route test |
| Nothing written | Each gate/shape/JSON/media rejection lists the store as `[]` | five rejection cases |

Every acceptance clause is met.

## Files changed

### Created

| File | Purpose |
|---|---|
| `src/lib/backstage-submission.ts` | Portable client submission contract, runtime validator, and canonical entry conversion |
| `src/pages/api/backstage/entries.ts` | Astro on-demand POST route composing gate, validator, server clock, and store |
| `test/backstage-route.test.mjs` | Ten route integration cases against real SQLite and the committed migration |
| `docs/active/work/T-003-02-01/research.md` | Repository and boundary map |
| `docs/active/work/T-003-02-01/design.md` | Options, tradeoffs, and decisions |
| `docs/active/work/T-003-02-01/structure.md` | File/module/interface blueprint |
| `docs/active/work/T-003-02-01/plan.md` | Ordered implementation and verification plan |
| `docs/active/work/T-003-02-01/progress.md` | Implementation record, commits, deviations, and check evidence |
| `docs/active/work/T-003-02-01/review.md` | This handoff |

### Modified

| File | Change |
|---|---|
| `package.json` | Added `test/backstage-route.test.mjs` to the explicit test command |

No file was deleted. Existing `backstage-entry.ts`, `backstage-store.ts`, `passcode.ts`,
`src/env.d.ts`, the migration, Astro config, and Wrangler config were reused without modification.

## Public HTTP contract

### Request

```http
POST /api/backstage/entries
content-type: application/json
x-demo-passcode: <shared passcode>
```

```json
{
  "type": "reference",
  "url": "https://example.com/docs",
  "text": "This reference belongs in the demo."
}
```

The client intentionally does **not** send `submittedAt`. The route supplies it from server time.

### Success

Status 201:

```json
{
  "entry": {
    "type": "reference",
    "url": "https://example.com/docs",
    "text": "This reference belongs in the demo.",
    "submittedAt": "2026-07-10T18:00:00.000Z"
  }
}
```

The route awaits the database write before returning, so 201 means persistence completed. The
response entry is the exact canonical object passed into `saveEntry`.

### Error matrix

| Status | Error | Meaning |
|---:|---|---|
| 401 | `passcode_missing` | Header absent/blank; supplied by shared gate |
| 403 | `passcode_mismatch` | Wrong shared passcode; supplied by shared gate |
| 415 | `json_required` | Content type is not `application/json` |
| 400 | `invalid_json` | Body cannot be parsed as JSON |
| 422 | `invalid_entry` | Parsed JSON does not meet submission contract |
| 500 | `gate_misconfigured` | Server passcode blank/unset |
| 500 | `store_misconfigured` | D1 binding absent at runtime |
| 500 | `entry_write_failed` | Store write rejected |

Route-owned errors name boundary `backstage_entries`. No response echoes a passcode, submitted
body, SQL statement, database exception, binding internals, or account identifier.

## Validation behavior

Accepted input must be a JSON object with exactly three own enumerable fields:

- `type`: `reference` or `feedback`, sourced from the canonical entry tuple;
- `url`: string up to 2,048 UTF-16 code units;
- `text`: nonblank string up to 20,000 UTF-16 code units.

An empty URL is allowed so general feedback need not pretend to be page-specific. A nonempty URL
must parse as `http:` or `https:`. Accepted URL/text bytes are not trimmed or normalized before
persistence. Extra fields are rejected, notably client-owned `submittedAt`, `passcode`, or `id`.

The validator returns a fresh object, so the route does not persist arbitrary extra fields or the
original input object. The converter then adds only the server timestamp.

## Processing and security order

```text
Request
  -> shared passcode guard
  -> JSON media type
  -> JSON parse
  -> exact shape validation
  -> database binding check
  -> server timestamp
  -> awaited saveEntry
  -> 201 response
```

This ordering is the central write-safety property. Unauthorized, unparsable, and invalid requests
return before the database is consulted for a write. The gate also precedes parsing, so an
unauthorized caller cannot use the endpoint as a validation oracle.

The gate remains appropriate only for the product’s stated low-stakes stakeholder collaboration.
The route does not turn it into account authentication and must not be presented as a safe channel
for credentials or sensitive data.

## Test coverage

### New route suite: 10/10 passing

1. Correct passcode + reference payload -> 201.
2. Response has JSON content type and exactly one `entry` envelope.
3. Server timestamp matches ISO UTC form and parses as a date.
4. `listEntries` returns exactly the response entry after the write.
5. Feedback with empty URL and newline text succeeds and round-trips.
6. Wrong passcode -> 403 and empty real store.
7. Invalid type + non-string URL -> 422, multiple issues, empty store.
8. Extra/server-owned `submittedAt` -> 422 and empty store.
9. Invalid JSON -> 400 and empty store.
10. Wrong media type -> 415 and empty store.
11. Blank server passcode runs before invalid JSON -> safe gate 500 and empty store.
12. Missing database -> safe configuration 500.
13. Rejected database write -> safe 500 with raw exception absent.

The numbered behaviors are covered by ten test functions; several functions assert multiple
properties. SQLite is the actual engine D1 uses, and the fixture executes the committed migration,
so the success test crosses the real schema and production insert/read mapping rather than mocks.

### Regression suite

`npm test` at this ticket’s committed package state: **70 tests, 70 passed, 0 failed**.

### Build and deployment checks

- `npm run build`: passed. Generated Astro manifest contains `/api/backstage/entries` as an
  endpoint with `prerender: false`; `/` remains prerendered.
- `npm run deploy:dry`: passed. Wrangler recognized `BACKSTAGE_DB` as D1 and exited before any
  deployment.
- `git diff --check`: passed for all ticket files.

### Typecheck

`npx tsc --noEmit` still exits nonzero for exactly two pre-existing errors in
`src/lib/passcode.ts` (`GateDecision.reason` and `.status` boolean-discriminant narrowing). The
route originally exposed the same TypeScript narrowing behavior for its own union; commit
`c072bd3` changed it to safe property-presence narrowing. Final typecheck has no ticket-owned
error.

## Coverage gaps and limitations

### Direct handler rather than live network

The primary test hits the real exported Astro handler with web-standard `Request`/`Response`
objects, real gate/validator/store code, and real SQLite. It does not launch Astro/Wrangler or make
a socket-level request. The next phone-form ticket owns browser-to-running-route Playwright
coverage; the build manifest and Wrangler dry-run cover routing/bundling meanwhile.

### Request body size before parsing

Field limits are enforced after `request.json()` has loaded the body. This prevents oversized
values from persistence but is not a streaming or `Content-Length` transport cap. Cloudflare has
platform request limits, but a future hardening pass could reject a declared oversized body before
parsing and/or add edge rate limiting. This is not required by the low-stakes ticket acceptance.

### Length unit

Limits use JavaScript string `.length` (UTF-16 code units), not UTF-8 bytes or Unicode grapheme
clusters. They are operational abuse bounds, not user-visible character quotas. The downstream
form may mirror them for convenience but server validation remains authoritative.

### Exact-key contract

Extra fields are rejected. This prevents accidental credential/timestamp persistence and catches
client drift early, but future protocol evolution must deliberately update the validator rather
than relying on forward-compatible ignored keys.

### Clock injection

The route calls `new Date()` directly. Tests assert valid ISO shape and exact response/store
agreement, not a fixed instant. If time-dependent policy grows later, introduce an injected clock
in a framework-free orchestration core; current one-line timestamping does not justify it.

### Remote D1 lifecycle

No remote database was provisioned and migrations were not applied remotely. Deployment operators
still need the authenticated D1 creation/migration workflow documented by the storage ticket. A
missing binding gets a safe 500; a bound database missing its table becomes `entry_write_failed`.

### Low-stakes gate boundaries

There is no account identity, CSRF token, brute-force rate limit, audit trail, or per-entry author.
The custom passcode header and same-origin UI reduce ordinary form misuse, but the shared passcode
can be copied. This matches the explicit Day 1 product model and is unsuitable for secrets.

## Concurrent-work note

The shared branch received commit `cf04a27` for T-003-03-01 during implementation, and that work
left its own unstaged `package.json`/test additions afterward. This ticket preserved them and did
not stage or revert them. Ticket commits remain path-scoped; the T-003-02-01 package commit adds
only `test/backstage-route.test.mjs` relative to its parent.

## Commits

1. `f503487` — Define backstage submission route workflow.
2. `a0533bb` — Add backstage submission validation.
3. `fa2549f` — Add passcode-gated backstage entry route.
4. `dc20a72` — Test backstage submission route end to end.
5. `c072bd3` — Narrow submission validation for project typecheck.
6. Final artifact commit records Implement/Review documentation.

## Downstream handoff

T-003-02-02 can submit the exact three-field JSON contract to `/api/backstage/entries`, put the
entered passcode in `x-demo-passcode`, and treat 201 as confirmation. It can render `detail` for
safe error copy and use status/error slugs for field/gate handling. It should never offer a
`submittedAt` control and should label the surface as inappropriate for secrets.

T-003-03-01 can rely on canonical stored entries always containing server-generated `submittedAt`
and exactly the four public contract fields.

## Open concerns requiring human attention

- **Critical issues:** none.
- **Known project check issue:** the two pre-existing `passcode.ts` TypeScript errors keep the
  repository-wide `tsc` command red even though tests/build/deploy dry-run pass. A small follow-up
  should switch that module to property-presence/switch narrowing, as this route already does.
- **Operational prerequisite:** apply the D1 migration to the actual bound database before using
  the route in a deployed environment.
- **Security framing:** keep the UI’s “no secrets” warning explicit; this is a shared Day 1 passcode,
  not a credential vault or user-auth system.

## Final assessment

The implementation is small, compositional, and evidence-backed. It reuses the completed gate and
store rather than duplicating them, defines a clear client/server ownership boundary, makes every
expected client rejection occur before persistence, returns safe machine-readable failures, and
proves the full write/read acceptance path against the committed schema. It is ready for Lisa’s
post-Review transition and for the downstream phone-friendly backstage form.
