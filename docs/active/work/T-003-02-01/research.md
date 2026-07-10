# Research — T-003-02-01 passcode-gated-submission-route

Descriptive map of the repository surfaces relevant to the submission route. This phase
records what exists and the constraints it establishes; it does not select an implementation.

## Ticket contract and position

- Ticket: `T-003-02-01`, high-priority task in story `S-003-02`.
- Current phase in ticket frontmatter: `research`.
- Status is `open`; Lisa, not this work session, owns phase/status transitions.
- Context: expose the write half of the backstage door.
- The route has three explicit duties: gate on the shared passcode, validate the entry shape,
  and persist the entry.
- Acceptance requires a test to hit the route.
- A valid passcode plus a well-formed payload must return success.
- The successfully written entry must be retrievable from the store.
- A wrong passcode and a malformed payload must be rejected with distinct statuses.
- Neither rejected request may write anything.
- Dependencies `T-003-01-02` and `T-003-01-03` are both phase `done`.
- Downstream ticket `T-003-02-02` depends on this route and will build the phone-friendly form.
- The form therefore needs a stable HTTP request/response contract but is outside this ticket.

## Product and security context

- The product specification calls this surface the “Stakeholder backstage.”
- It is for nontechnical collaborators and deliberately avoids account registration on Day 1.
- Access is a shared passcode sent alongside a project link.
- The passcode is explicitly a low-stakes gate, not authentication for sensitive data.
- The backstage accepts references, feature requests, feedback, and similar context.
- It must refuse secrets; richer secret-exchange UX is outside this route ticket.
- Submitted material must be available through a stable machine-readable seam later.
- Initial freshness can be one to two minutes; real-time delivery is unnecessary.
- The template is sovereign: persistence remains in the project owner’s Cloudflare account.
- Server endpoint boundaries must validate environment and keep credentials out of clients.

## Runtime and route conventions

- The application is Astro 5 with `output: 'static'` and the Cloudflare adapter.
- On-demand routes opt out individually with `export const prerender = false`.
- Existing `src/pages/api/receipt.ts` is the only current API route.
- It exports an Astro `APIRoute` handler and constructs web-standard `Response` objects.
- It accesses bindings through `locals.runtime.env` at request time.
- It uses JSON bodies formatted with two-space indentation.
- JSON responses use `content-type: application/json; charset=utf-8`.
- Server misconfiguration is represented as status 500 with safe machine and human fields.
- `astro.config.mjs` describes `/api/*` as Worker-routed while static pages stay asset-served.
- Adding another `/api/*` route fits the existing generated Worker routing boundary.
- `src/env.d.ts` declares the runtime `Env` used by Astro locals.
- `Env.DEMO_PASSCODE` is a required string at type level but can be absent at runtime.
- `Env.BACKSTAGE_DB` is typed as the persistence module’s minimal database interface.

## Entry contract

- `src/lib/backstage-entry.ts` is the portable public data contract.
- `BACKSTAGE_ENTRY_TYPES` is the readonly tuple `['reference', 'feedback']`.
- `BackstageEntryType` is derived from that tuple.
- `BackstageEntry` contains exactly four fields:
  - `type: 'reference' | 'feedback'`;
  - `url: string`;
  - `text: string`;
  - `submittedAt: string`.
- The contract module explicitly says untrusted boundaries still own runtime validation.
- No runtime validator currently exists for this shape.
- No dependency such as Zod, Valibot, or JSON Schema validator is installed.
- The package has no runtime `dependencies`; only development/tooling dependencies.
- The database migration repeats the type constraint with a SQL `CHECK`.
- The migration makes every public field `NOT NULL`.
- The migration does not constrain URL format, text length, or timestamp format.
- `submittedAt` maps to the physical `submitted_at` column.
- Storage-private `id` is not part of the public contract.

## Shared passcode gate

- `src/lib/passcode.ts` implements the completed shared gate dependency.
- `PASSCODE_HEADER` is `x-demo-passcode`.
- The header keeps the passcode out of URLs, persisted bodies, and ordinary referrers.
- `guardPasscode(request, configured)` is the route-facing adapter.
- It returns `null` when the route may proceed.
- It returns a complete JSON `Response` when access is denied.
- Missing passcode produces status 401 and error `passcode_missing`.
- Wrong passcode produces status 403 and error `passcode_mismatch`.
- Blank server configuration produces status 500 and error `gate_misconfigured`.
- Configuration is checked before presented input, so the gate fails closed.
- Denial bodies name the gate as `backstage` and never echo the configured passcode.
- The passcode comparison is exact and does not trim or case-fold nonblank values.
- `test/passcode.test.mjs` already covers all gate states and response bodies.

## Persistence module

- `src/lib/backstage-store.ts` implements the completed persistence dependency.
- It is framework-free and receives a database handle as an argument.
- `saveEntry(db, entry)` inserts the four public fields.
- It returns `Promise<void>` and does not swallow database errors.
- `listEntries(db)` reads all entries in ascending storage-id order.
- It maps rows back to the public camelCase entry shape.
- Explicit SQL columns prevent the storage-private id from escaping.
- The module trusts its typed input; runtime payload validation belongs to this route.
- `test/backstage-store.test.mjs` uses real in-memory SQLite with the committed migration.
- Existing persistence tests prove exact round trips, hard Unicode content, both types,
  duplicates, deterministic ordering, empty reads, and database rejection of invalid types.
- The minimal database seam is `prepare -> bind -> run/all`.

## Test infrastructure

- Unit and route-adapter tests use Node’s built-in test runner and `assert/strict`.
- `npm test` explicitly enumerates each `test/*.test.mjs` file.
- Node runs TypeScript source directly with `--experimental-strip-types`.
- Existing tests import TypeScript modules by their `.ts` paths.
- Web globals `Request`, `Response`, and `Headers` are available in the Node test runtime.
- There is no existing helper for invoking an Astro route directly.
- Astro route handlers are ordinary exported functions, so they can be called with a minimal
  context object at runtime despite their TypeScript `APIRoute` annotation.
- The SQLite D1-shaped test adapter currently lives locally in `backstage-store.test.mjs`.
- There is no shared test-support module for the database adapter.
- Playwright tests cover the public demo flow, not backstage routes.
- The acceptance wording requires hitting the route, but does not require a live HTTP server.
- The product testing philosophy prefers meaningful boundary tests and exact store evidence.

## Repository state and constraints

- The worktree contains unrelated modified and untracked files from other work.
- Relevant completed dependency files are tracked and have no local diff.
- This ticket should avoid modifying unrelated dirty files.
- `package.json` is tracked and currently clean, but registering a new test will modify it.
- Route and test files can be new, minimizing collision risk.
- RDSPI requires all six artifacts under `docs/active/work/T-003-02-01/`.
- Implement phase requires `progress.md` and incremental commits.
- The ticket’s frontmatter must not be edited.

## Observable boundaries and unanswered details

- No route pathname has previously been reserved for backstage submission.
- No response schema for submission success exists yet.
- The entry type contract includes `submittedAt`, but the ticket does not say whether the client
  or server supplies it.
- The downstream phone form will be untrusted and can fabricate any client-provided timestamp.
- The schema permits empty strings and arbitrary strings in all non-type columns.
- “Well-formed payload” therefore needs boundary semantics beyond TypeScript’s interface.
- The ticket does not prescribe URL schemes, maximum lengths, whitespace treatment, extra-field
  handling, JSON media-type enforcement, or error-body details.
- Wrong-passcode status is already fixed by the shared gate as 403.
- A distinct malformed-payload status can use the conventional client-error range.
- Persistence failures have no established route-level mapping in this feature yet.
- The acceptance criterion’s “nothing is written” makes ordering important: gate and validation
  must complete before `saveEntry` is invoked.

## Research conclusion

The route is a thin composition boundary between three already-established pieces: the
`guardPasscode` adapter, the `BackstageEntry` contract, and `saveEntry`. The missing repository
capability is runtime JSON validation plus the Astro POST adapter that orders gate, parse,
validate, and persistence. Existing Node tests can exercise the exported route handler against
the same real SQLite-backed D1-shaped store used by the persistence suite, allowing the test to
prove both HTTP outcomes and actual post-request store contents without remote resources.
