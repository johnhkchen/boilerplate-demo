# Progress — T-003-02-01 passcode-gated-submission-route

## State

- Implement phase: complete.
- Review phase: next and final.
- Ticket frontmatter: untouched; Lisa owns phase/status transitions.
- Acceptance path: implemented and passing.
- Critical implementation blockers: none.

## Completed work

### 1. Research, Design, Structure, Plan

Completed all pre-implementation artifacts in order:

- `research.md` maps the ticket, product boundary, Astro routing, shared gate, entry contract,
  persistence seam, tests, worktree constraints, and unresolved request semantics.
- `design.md` evaluates route naming, payload ownership, validator strictness, error statuses,
  processing order, module boundaries, and test depth.
- `structure.md` defines the new files, public interfaces, private helpers, route ordering, test
  fixture, assertions, and invariants.
- `plan.md` sequences validator, route, route/store tests, verification, progress, and review.

Commit:

- `f503487 Define backstage submission route workflow (T-003-02-01)`

### 2. Portable submission validator

Created `src/lib/backstage-submission.ts`.

Completed:

- added `BackstageSubmission` with client-owned `type`, `url`, and `text`;
- kept `submittedAt` out of untrusted input;
- reused `BACKSTAGE_ENTRY_TYPES` as the discriminator source of truth;
- exported 2,048-character URL and 20,000-character text bounds;
- required a non-null, non-array JSON object;
- required the exact three-key shape;
- validated `reference | feedback`;
- accepted empty URL for general feedback;
- restricted nonempty URLs to parsed HTTP(S) values;
- rejected blank text;
- returned safe issue strings without echoing submitted values;
- constructed a clean submission object rather than passing the input record through;
- added `toBackstageEntry` to attach a server-owned timestamp.

Commit:

- `a0533bb Add backstage submission validation (T-003-02-01)`

### 3. On-demand Astro POST route

Created `src/pages/api/backstage/entries.ts`.

Completed ordered route behavior:

1. reads runtime bindings from `locals.runtime.env`;
2. runs `guardPasscode` before body inspection;
3. requires `application/json` (optional parameters allowed);
4. parses JSON once;
5. validates the exact submission shape;
6. verifies the D1 binding exists;
7. stamps the canonical entry with server ISO time;
8. awaits `saveEntry`;
9. returns `{ entry }` with status 201.

Completed safe response mappings:

- missing passcode -> existing 401;
- wrong passcode -> existing 403;
- wrong media type -> 415 `json_required`;
- invalid JSON -> 400 `invalid_json`;
- invalid shape -> 422 `invalid_entry` plus safe issues;
- absent database -> 500 `store_misconfigured`;
- rejected write -> 500 `entry_write_failed` without exception details.

The route exports `prerender = false`, retaining the static-first application boundary.

Commit:

- `fa2549f Add passcode-gated backstage entry route (T-003-02-01)`

### 4. Route-to-store test coverage

Created `test/backstage-route.test.mjs` and registered it in `package.json`.

The fixture:

- runs real in-memory SQLite;
- executes the committed D1 migration rather than a copied schema;
- presents the exact `prepare/bind/run/all` surface production code consumes;
- isolates every test in a fresh store and closes it afterward.

Ten route cases now pass:

1. valid passcode + well-formed reference -> 201;
2. response entry matches request content and has server ISO time;
3. production `listEntries` returns exactly the response entry;
4. feedback with empty URL succeeds and round-trips;
5. wrong passcode -> 403 and empty store;
6. malformed shape -> 422, distinct from 403, and empty store;
7. client-supplied `submittedAt`/extra field -> 422 and empty store;
8. invalid JSON -> 400 and empty store;
9. non-JSON content type -> 415 and empty store;
10. blank server passcode, missing DB, and store failure each return safe 500 behavior.

The final bullet comprises three focused tests, for ten test functions total.

Commit:

- `dc20a72 Test backstage submission route end to end (T-003-02-01)`

### 5. Type-narrowing correction

The first `tsc` run found one ticket-owned error: TypeScript under this project configuration did
not narrow `SubmissionValidation` through `if (!validation.valid)`, matching the two known boolean-
discriminant failures in the pre-existing passcode module.

Before proceeding, the route changed to property-presence narrowing:

```ts
if ('issues' in validation) { ... }
```

This removes the ticket-owned error without a cast and preserves runtime behavior. The correction
has its own commit:

- `c072bd3 Narrow submission validation for project typecheck (T-003-02-01)`

## Deviations from Plan

### Explicit `.ts` imports in the route

The initial focused test could not resolve extensionless ESM imports when Node imported the real
route directly. The route’s three internal imports were changed to explicit `.ts` paths. Astro’s
build supports them, Node’s strip-types runner resolves them, and the source modules already use
this convention. This correction was included in the route-test commit.

### Boolean discriminant narrowing

The property-presence correction above was required by the actual project typecheck. It does not
change the planned API or response behavior.

### Concurrent worktree activity

Another ticket committed `cf04a27 feat(backstage): add pure agent-retrieval seam core
(T-003-03-01)` between this ticket’s route and test commits. It also left a new unstaged
`package.json` addition for `test/backstage-retrieval.test.mjs`. This ticket did not stage, revert,
or include that concurrent modification. Its own package commit adds only
`test/backstage-route.test.mjs` relative to its parent.

No design-level deviation was necessary.

## Verification evidence

### Focused test

Command:

```sh
node --experimental-strip-types --test test/backstage-route.test.mjs
```

Final result: **10 tests, 10 passed, 0 failed**.

### Full regression suite

Command at this ticket’s committed package state:

```sh
npm test
```

Result: **70 tests, 70 passed, 0 failed**. This includes the 10 new route tests and all existing
operation, ops, fault, leak, integration, passcode, and backstage-store tests.

### TypeScript

Command:

```sh
npx tsc --noEmit
```

Result: exits 2 with only two known pre-existing errors:

- `src/lib/passcode.ts:93` — `reason` is not narrowed on `GateDecision`;
- `src/lib/passcode.ts:125` — `status` is not narrowed on `GateDecision`.

The first run also showed one ticket-owned `validation.issues` error; commit `c072bd3` fixed it.
The final typecheck has **zero errors in ticket-owned files**.

### Astro build

Command:

```sh
npm run build
```

Result: exit 0. Astro completed server and client builds and prerendered only `/index.html`.
Generated manifest evidence names `/api/backstage/entries` as:

- type `endpoint`;
- component `src/pages/api/backstage/entries.ts`;
- `prerender: false`.

### Wrangler deployment dry-run

Command:

```sh
npm run deploy:dry
```

Result: exit 0. Wrangler 4.110.0 read the built assets, recognized `env.BACKSTAGE_DB` as a D1
binding and `env.ASSETS`, prepared an 818.46 KiB upload (177.98 KiB gzip), and exited at
`--dry-run` without deployment.

Astro emitted existing informational output about optional Cloudflare sessions/KV and a sharp
runtime warning; neither failed the build and neither was introduced by this route.

## Security and data checks

- Passcode remains a server-only environment value.
- Gate response comes from the existing no-echo adapter.
- Gate executes before JSON parsing.
- Validation executes before DB lookup/write.
- Client cannot set `submittedAt`.
- Accepted text and URL are not trimmed or normalized before persistence.
- Extra fields cannot cross the boundary.
- Database failures never expose raw exception text.
- Tests use local in-memory SQLite only; no remote database was read or written.
- No account ID, database UUID, passcode value, or credential was added.

## Remaining work

- Inspect final ticket-specific diff and commit sequence.
- Write `review.md` with change summary, acceptance mapping, test coverage, gaps, and open concerns.
- Stop after Review; Lisa handles the rest.
