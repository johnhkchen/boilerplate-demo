# Design — T-003-02-01 passcode-gated-submission-route

## Decision summary

Add `POST /api/backstage/entries` as an on-demand Astro route. It will run the existing
passcode guard before reading the body, parse JSON, validate an exact three-field submission,
create the canonical `BackstageEntry` with a server timestamp, persist it through `saveEntry`,
and return the stored entry with status 201. Put reusable runtime validation in a small pure
module and drive the exported route handler with a real `Request` plus the existing SQLite-backed
D1-shaped test store.

## Option 1 — Route shape and pathname

### Chosen: `POST /api/backstage/entries`

- The plural resource name describes what is created rather than the UI action.
- It leaves the same resource path available to a future gated `GET` retrieval seam.
- It sits under `/api/*`, which the Astro/Cloudflare build already sends to the Worker.
- `POST` is the HTTP method with creation semantics and is directly usable by the phone form.
- A successful creation returns 201 rather than a generic 200.

### Rejected: `POST /api/backstage/submit`

- Action naming works, but creates an avoidable second path when retrieval later needs entries.
- It encodes the UI verb instead of the portable resource contract.

### Rejected: extend `/api/receipt`

- Receipt signing and backstage persistence are unrelated security and data boundaries.
- Sharing the file would weaken ownership and make route behavior method-dependent without benefit.

## Option 2 — Client payload versus canonical entry

### Chosen: client sends `{ type, url, text }`; server supplies `submittedAt`

- `submittedAt` describes when this server accepted the entry, so the server is the natural clock.
- A phone/browser client can have a wrong clock or deliberately fabricate a timestamp.
- The downstream form has fewer fields and cannot influence deterministic feed chronology metadata.
- The route converts a validated `BackstageSubmission` into the existing `BackstageEntry`.
- The success body returns the resulting entry, including its server-assigned timestamp.

The accepted payload is exact:

```json
{
  "type": "reference",
  "url": "https://example.com/reference",
  "text": "This API is relevant"
}
```

### Rejected: require all four `BackstageEntry` fields from the client

- It exposes storage metadata as untrusted input and forces every client to manufacture time.
- Runtime validation could prove timestamp syntax but not honesty.
- The ticket asks the route to persist an entry, not to trust a fully canonical entry from outside.

### Rejected: permit optional `submittedAt`

- Two timestamp authorities create unclear and hard-to-test semantics.
- It invites downstream callers to accidentally depend on different chronology behavior.

## Option 3 — Validation strictness

### Chosen: exact object, allowed type, string fields, practical size limits

Validation accepts only a non-null, non-array object with exactly `type`, `url`, and `text`:

- `type` must be one of the shared `BACKSTAGE_ENTRY_TYPES` values.
- `url` must be a string no longer than 2,048 UTF-16 code units.
- `text` must be a string no longer than 20,000 UTF-16 code units.
- `text` must contain at least one non-whitespace character.
- `url` may be empty because feedback can be general rather than page-linked.
- A nonempty URL must parse as `http:` or `https:`.
- Extra keys are rejected, including `submittedAt`, `passcode`, or storage fields.
- Values are persisted byte-for-byte; validation does not trim or normalize accepted strings.

This supplies meaningful boundary semantics missing from the SQL `NOT NULL` constraints while
remaining compatible with both references and general feedback. Limits bound accidental or
hostile request amplification without adding a schema library to a dependency-light template.

### Rejected: check only `typeof` and type membership

- It permits whitespace-only entries, unlimited payload fields, and arbitrarily large content.
- A syntactically typed but operationally useless payload would count as well formed.

### Rejected: require a nonempty valid URL for every entry

- General feedback does not inherently refer to a URL.
- The schema and product spec both allow comments not tied to a page or section.

### Rejected: add Zod or another schema dependency

- The contract is three fields with two literals; a dependency adds more footprint than value.
- A short type guard can reuse the existing type tuple and be exhaustively route-tested.

## Option 4 — Validation module boundary

### Chosen: pure `src/lib/backstage-submission.ts`

The module exports:

```ts
interface BackstageSubmission { type; url; text }
validateBackstageSubmission(value): ValidationResult
toBackstageEntry(submission, submittedAt): BackstageEntry
```

- The Astro route stays an adapter: env, Request, Response, and persistence orchestration only.
- The mobile form or future CLI can import the submission type without importing an API page.
- Runtime rules remain colocated and share `BACKSTAGE_ENTRY_TYPES` with the canonical contract.
- A discriminated result preserves useful error details without exceptions for expected input.

### Rejected: private validator inside the page route

- It is the smallest file count but couples the portable payload contract to Astro filesystem
  routing and makes reuse awkward.
- Route tests could cover it, but future clients would have no named submission type.

## Option 5 — Request processing order

### Chosen order

1. Read runtime environment.
2. Call `guardPasscode(request, env?.DEMO_PASSCODE)`.
3. Return its denial immediately if present.
4. Check JSON content type.
5. Parse the body once.
6. Validate the parsed value.
7. Stamp the canonical entry with `new Date().toISOString()`.
8. Call `saveEntry(env.BACKSTAGE_DB, entry)`.
9. Return 201 with the entry.

The gate runs before body parsing so unauthorized callers cannot exercise parser/validation work,
and wrong-passcode requests cannot write. Every expected rejection precedes persistence.

### Rejected: parse and validate before gating

- It spends work on unauthorized traffic and exposes payload-validation distinctions before access.
- It makes the security ordering harder to audit.

### Rejected: persist then validate or compensate with deletion

- It directly violates “nothing is written” and creates unnecessary transaction complexity.

## Option 6 — Error and success statuses

| Outcome | Status | Body slug |
|---|---:|---|
| Created | 201 | `{ entry }` |
| Missing passcode | 401 | existing `passcode_missing` |
| Wrong passcode | 403 | existing `passcode_mismatch` |
| Non-JSON media type | 415 | `json_required` |
| Invalid JSON syntax | 400 | `invalid_json` |
| Parsed but malformed shape | 422 | `invalid_entry` |
| Missing database binding | 500 | `store_misconfigured` |
| Store write failure | 500 | `entry_write_failed` |

Wrong passcode and malformed shape are visibly distinct (403 versus 422), satisfying the explicit
acceptance clause. Error bodies carry stable `error` and plain `detail` fields; validation may add
`issues`, but must never echo the rejected payload or passcode.

### Error alternatives rejected

- One generic 400 for every failure loses the gate/payload distinction the ticket requires.
- Returning database exception messages risks exposing SQL, schema, or infrastructure details.
- Returning 200 on creation weakens normal resource semantics and downstream UI clarity.

## Option 7 — Testing level

### Chosen: direct route-handler integration with real SQLite persistence

Import `POST` from the actual route module and invoke it with:

- a web-standard `Request` targeting the real path;
- a minimal `locals.runtime.env` object;
- the same D1-shaped adapter backed by in-memory SQLite and the committed migration.

Then call production `listEntries` against that store. This test genuinely crosses the exported
route boundary, shared passcode guard, runtime validator, canonical-entry construction, production
persistence module, SQL migration, and readback mapper. It is hermetic and fast.

Required cases:

- valid passcode + reference payload -> 201; response entry equals stored entry;
- valid passcode + feedback without URL -> 201;
- wrong passcode + valid payload -> 403 and store remains empty;
- correct passcode + malformed shape -> 422 and store remains empty;
- invalid JSON and wrong content type -> their distinct client statuses, no write;
- extra/server-owned fields -> 422, no write;
- blank server passcode -> existing 500, no write;
- missing DB and write failure -> safe 500 responses.

### Rejected: only test the validator and persistence separately

- Both dependencies already have unit coverage; it would not meet “a test hits the route.”
- It would miss composition/order errors, env wiring, and response mapping.

### Deferred: launch Astro/Wrangler and fetch over a socket

- It adds server lifecycle and D1 local-state complexity for no additional route-logic coverage.
- The direct handler uses the real route export and real web objects; the downstream Playwright
  ticket will cover the running browser-to-server path.

## Scope boundaries

- No backstage page or form.
- No retrieval HTTP method.
- No account authentication, CSRF token, rate limiter, or secret-exchange workflow.
- No remote D1 provisioning or migration application.
- No change to the ticket frontmatter.
- No broad refactor of existing passcode or persistence modules.

## Final rationale

This design keeps the HTTP edge thin while giving “well formed” a concrete, portable meaning.
It composes the two completed dependencies without duplicating their logic, makes timestamps an
explicit server invariant, fails before writes on every client rejection, and proves the complete
write/read path with a real database engine. The resulting contract is immediately consumable by
the next phone-form ticket and leaves a natural resource path for later retrieval.
