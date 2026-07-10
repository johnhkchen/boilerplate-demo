# Structure — T-003-02-01 passcode-gated-submission-route

## Change inventory

| File | Action | Responsibility |
|---|---|---|
| `src/lib/backstage-submission.ts` | create | Portable submission shape, limits, runtime validation, canonical-entry construction |
| `src/pages/api/backstage/entries.ts` | create | On-demand Astro POST adapter composing gate, validation, clock, and persistence |
| `test/backstage-route.test.mjs` | create | Route-level tests against in-memory SQLite using the committed migration |
| `package.json` | modify | Register the route test in the explicit `npm test` command |
| `docs/active/work/T-003-02-01/progress.md` | create in Implement | Record executed steps, checks, commits, and deviations |
| `docs/active/work/T-003-02-01/review.md` | create in Review | Handoff summary, coverage assessment, and open concerns |

No file is deleted. The ticket file is read-only. Existing passcode, persistence, schema, env,
migration, Astro config, and Wrangler config files are consumed without modification unless a
verification failure exposes a ticket-owned integration defect.

## Module boundary: `src/lib/backstage-submission.ts`

### Imports

Import from `./backstage-entry.ts`:

- runtime `BACKSTAGE_ENTRY_TYPES` for the single source of accepted discriminators;
- types `BackstageEntry` and `BackstageEntryType` for output and submission typing.

### Public constants

```ts
export const MAX_BACKSTAGE_URL_LENGTH = 2_048;
export const MAX_BACKSTAGE_TEXT_LENGTH = 20_000;
```

These are exported so future UI constraints can mirror server rules while the server remains
authoritative.

### Public submission type

```ts
export interface BackstageSubmission {
  type: BackstageEntryType;
  url: string;
  text: string;
}
```

This is deliberately distinct from `BackstageEntry`: it omits server-owned `submittedAt`.

### Validation result

```ts
export type SubmissionValidation =
  | { valid: true; value: BackstageSubmission }
  | { valid: false; issues: string[] };
```

The public result is discriminated and non-throwing. Issue strings are stable enough for a human
response but do not reproduce submitted values.

### Public functions

```ts
export function validateBackstageSubmission(value: unknown): SubmissionValidation;

export function toBackstageEntry(
  submission: BackstageSubmission,
  submittedAt: string,
): BackstageEntry;
```

`validateBackstageSubmission` checks:

1. plain record shape: non-null object and not an array;
2. exact own enumerable key set: `type`, `url`, `text`;
3. discriminator membership via `BACKSTAGE_ENTRY_TYPES`;
4. `url` string type and max length;
5. empty URL allowed; otherwise `new URL(url)` with protocol `http:` or `https:`;
6. `text` string type, nonblank content, and max length.

It returns a newly constructed three-field object rather than returning the original record. This
prevents prototypes, nonenumerable fields, and future extra properties from crossing the boundary.

`toBackstageEntry` returns a newly constructed four-field object and performs no validation; only
validated submissions call it.

### Private helpers

- `isRecord(value): value is Record<string, unknown>` narrows object inputs.
- `isEntryType(value): value is BackstageEntryType` checks the canonical tuple.
- `isSupportedUrl(value)` treats empty as valid and otherwise restricts parsed protocol.
- Key comparison sorts a copied key list and compares with the fixed expected list.

No Astro, Cloudflare, database, Request, Response, or environment types enter this module.

## Route boundary: `src/pages/api/backstage/entries.ts`

### Route declaration and imports

```ts
export const prerender = false;
```

Import:

- `APIRoute` from Astro as a type;
- `guardPasscode` from `src/lib/passcode`;
- `saveEntry` from `src/lib/backstage-store`;
- validator/converter from `src/lib/backstage-submission`.

Relative imports follow the existing route convention and may omit `.ts` for Astro builds.

### Private response helpers

```ts
const json = (body: unknown, status: number): Response => ...;
const error = (status: number, slug: string, detail: string, issues?: string[]): Response => ...;
```

All route-owned responses use JSON plus `application/json; charset=utf-8`. The error helper adds
issues only when present and never serializes exceptions or request bodies.

### JSON media-type helper

Accept `application/json` case-insensitively with optional parameters, using the media type before
the first semicolon. Reject missing and other content types with 415. This makes the browser/form
contract explicit and avoids interpreting arbitrary request bodies as JSON.

### `POST` public handler

```ts
export const POST: APIRoute = async ({ locals, request }) => { ... };
```

Ordered behavior:

1. `const env = locals.runtime?.env`.
2. `guardPasscode(request, env?.DEMO_PASSCODE)`; return denial if non-null.
3. Reject non-JSON media type with 415.
4. `await request.json()` in a narrow try/catch; syntax/read failure -> 400.
5. Validate unknown parsed body; invalid -> 422 with `issues`.
6. Check `env?.BACKSTAGE_DB`; absent -> safe 500.
7. Construct entry with `new Date().toISOString()`.
8. `await saveEntry(db, entry)` in a narrow try/catch; failure -> safe 500.
9. Return `{ entry }` with 201.

The database check occurs after client validation so a malformed authorized request remains a
client error even if the store is also misconfigured. It occurs before timestamp generation and
save. The handler does not log the passcode, body, or database error.

Astro supplies unsupported-method behavior; no `GET` or fallback handler is added here.

## Test boundary: `test/backstage-route.test.mjs`

### Imports

- Node `assert/strict`, `fs`, `path`, `url`, `node:test`, and `node:sqlite`.
- Production `POST` from the route file.
- Production `listEntries` from the store.
- `PASSCODE_HEADER` from the shared gate.

### Real local store fixture

Reuse the established `backstage-store.test.mjs` pattern locally:

- read `migrations/0001_create_backstage_entries.sql` from disk;
- create `DatabaseSync(':memory:')`;
- execute the committed migration;
- adapt prepared statements to `prepare/bind/run/all`;
- return both the D1-shaped store and a cleanup function or underlying close method.

The fixture must expose the same adapter semantics production functions consume. Each test gets
an isolated store so “nothing was written” is unambiguous.

### Request and route invocation helpers

```js
const request = (body, options = {}) => new Request(
  'https://demo.example/api/backstage/entries',
  { method: 'POST', headers, body }
);

const hitRoute = (store, request, configured = SECRET) =>
  POST({ request, locals: { runtime: { env: { DEMO_PASSCODE: configured, BACKSTAGE_DB: store }}}});
```

Tests may cast/ignore the rest of the Astro context because runtime code reads only these fields.
Use JSON string bodies rather than passing objects implicitly, ensuring real request parsing.

### Required assertions

1. Happy path returns 201 and JSON content type.
2. Success body contains exactly one `entry` matching type/url/text and an ISO timestamp.
3. `listEntries(store)` deep-equals the response entry, proving route-to-store-to-readback.
4. Feedback with empty URL succeeds and is stored.
5. Wrong passcode returns 403 and `listEntries` is empty.
6. Malformed shape returns 422 with `invalid_entry` and store is empty.
7. Extra `submittedAt` is rejected with 422 and store is empty.
8. Invalid JSON returns 400 and store is empty.
9. Wrong media type returns 415 and store is empty.
10. Blank server passcode returns 500 and store is empty.
11. Missing DB returns safe 500.
12. A store whose `run()` rejects returns safe 500 without leaking its error text.

The wrong-passcode test uses a well-formed JSON body to isolate the gate outcome. The malformed
test uses the correct passcode to isolate validation. Their status inequality is asserted directly.

## Package script

Append `test/backstage-route.test.mjs` to the existing explicit `node --test` list. Preserve the
existing order and other scripts. Do not reformat unrelated JSON.

## Change ordering

1. Land this structure and the implementation plan before code.
2. Create validation module, then test it indirectly through the route suite.
3. Create the route adapter using the finished module and existing dependencies.
4. Create route tests and register them.
5. Run focused tests, then full tests, typecheck, build, and deployment dry-run if practical.
6. Document exact outcomes and deviations in `progress.md`.
7. Inspect the final diff and write `review.md`.

## Architectural invariants

- Passcode gate precedes body processing.
- Validation precedes every write.
- Canonical timestamp is server supplied.
- Accepted user strings are stored without trimming or normalization.
- Response and stored entry agree exactly on successful creation.
- No denial body contains the passcode, payload, SQL, or raw exception.
- The route remains server-only and on demand.
- Static-first behavior outside `/api/*` is unchanged.
- No remote Cloudflare resource is required for tests.
- Ticket phase and status remain untouched.
