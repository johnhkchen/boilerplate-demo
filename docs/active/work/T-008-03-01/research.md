# Research — T-008-03-01 unified dashboard page

## Ticket position

- The ticket starts in `research` and depends on `T-008-02-01` and `T-008-02-02`.
- Both dependencies have completed implementation and review artifacts.
- The requested surface is `src/pages/backstage.astro`.
- The ticket requires one passcode entry to unlock reading and all mutations.
- It explicitly forbids a separate submit-only surface.
- It explicitly requires the passcode to remain in page memory only.
- It names `npm run leak:check` as disclosure evidence.
- Ticket phase and status are Lisa-owned and must not be edited.

## Current page

- `src/pages/backstage.astro` is a prerendered/static Astro page.
- It imports only `BaseLayout` in frontmatter.
- It renders an introduction followed immediately by a submission form.
- The form contains the shared passcode field.
- Entry inputs are type, URL, and text.
- Reference is the default type.
- Reference requires a URL; feedback permits an empty URL.
- The page has a post-submit confirmation panel.
- The confirmation replaces the form after a successful POST.
- “Send another” restores the form and retains the passcode input value.
- There is no list, completion control, delete control, or unlock state.
- There is no initial feed request.
- A wrong passcode is discovered only while submitting.
- Therefore the existing page is the submit-only surface the ticket replaces.

## Current browser behavior

- The inline Astro client script reads the passcode at runtime.
- It sends it in `x-demo-passcode`.
- It never puts the passcode in a URL or JSON request body.
- It does not use cookies, local storage, or session storage.
- It validates submission fields before POST.
- It checks response status and basic response shape.
- It uses `textContent` for echoed content, avoiding HTML interpretation.
- It manages focus for errors and confirmation.
- It disables only the submit button during a POST.
- The current passcode remains resident in the password DOM input after submission.
- That DOM value is page memory, but it keeps the credential tied to the form UI.

## Read seam

- `GET /api/backstage/feed` is implemented by `src/pages/api/backstage/feed.ts`.
- The edge delegates to `readBackstageFeed`.
- The request passcode is read from the shared header.
- Missing passcode returns 401.
- Wrong passcode returns 403.
- Missing server configuration returns 500.
- Gate checks happen before store access.
- Successful output has `schemaVersion`, `gate`, `count`, and `entries`.
- Entries are oldest-first by stable numeric id.
- Each entry contains `id`, `type`, `url`, `text`, `submittedAt`, and `completedAt`.
- `completedAt: null` is incomplete.
- A timestamp string is complete.
- The feed returns the canonical store objects without a client-specific projection.

## Submit seam

- `POST /api/backstage/entries` is implemented by the collection edge.
- It uses the same shared passcode header and gate.
- It accepts exactly `type`, `url`, and `text` in JSON.
- The server owns `submittedAt`.
- D1 owns `id` and initial `completedAt`.
- The success response contains the insert-ready four-field entry, not its assigned id.
- Consequently the page cannot append a complete canonical entry from the POST response alone.
- A feed refresh after POST is the existing way to learn its id and completion state.
- Validation failures use 422; gate failures use 401/403.
- Storage and unexpected failures use bounded 500 responses.

## Management seams

- `PATCH /api/backstage/entries/[id]` completes one entry.
- `DELETE /api/backstage/entries/[id]` hard-deletes one entry.
- Both use the same passcode header.
- Both strictly require a canonical positive integer id.
- PATCH generates the completion timestamp on the server.
- PATCH success returns the id and completion timestamp.
- DELETE success returns the deleted id.
- Authorized unknown ids return 404.
- Gate denial happens before id parsing, clock access, and persistence.
- There is no uncomplete operation in the current management core.
- The ticket says “marks one complete,” so one-way completion matches the backend.

## Persistence and ordering

- D1 schema is established by migrations 0001 and 0002.
- `backstage_entries.id` is the stable integer primary key.
- `completed_at` is nullable.
- `listEntries` explicitly selects all six public columns.
- Store order is `ORDER BY id ASC`.
- Hard deletion does not renumber survivors.
- The dashboard can use id as both rendering identity and route handle.
- Presentation can retain feed order without additional sorting.

## Existing styles and accessibility

- The page uses the clay visual language shared with the public demo.
- Page CSS resolves colors, spacing, radii, shadows, and typography through tokens.
- Controls use the shared minimum control height for phone touch targets.
- Form errors use `role="alert"` and assertive live announcement.
- Confirmation uses a polite live region.
- Labels and fieldsets provide accessible names.
- The layout is a single centered column sized by `--measure`.
- `[hidden]` is used as the state boundary for form and confirmation.
- Any unified view must preserve keyboard focus after unlock and mutations.
- Checklist semantics can be expressed with native checkboxes.
- Completed entries should make their state visible beyond color alone.

## Existing end-to-end coverage

- `tests/backstage-flow.spec.ts` runs only in the `backstage` Playwright project.
- That project uses the Pixel 5 device preset.
- It owns a deterministic local passcode.
- Its web server applies both D1 migrations before Astro starts.
- It currently verifies opening the form, submitting a reference, confirmation, and feed retrieval.
- It does not verify a wrong unlock.
- It does not verify a list in the browser.
- It does not verify completion or deletion from the browser.
- It directly reads the feed only as a final persistence check.
- The local D1 may contain prior entries, so tests use per-run markers.
- The flow contract centralizes step names and time budgets.
- Playwright runs one worker and the backstage flow has a 20-second test budget.

## Existing unit and type coverage

- `test/backstage-retrieval.test.mjs` covers feed shape, ordering, gate order, and CLI output.
- `test/backstage-management.test.mjs` covers PATCH/DELETE success and refusals.
- `test/backstage-route.test.mjs` covers submission and validation.
- `test/backstage-store.test.mjs` covers exact-row persistence behavior.
- `npm test` explicitly enumerates the Node test files.
- `npm run typecheck` runs Astro checking, TypeScript, and generated Worker type verification.
- A page-only state change is best covered by the existing browser flow rather than a new DOM unit harness.

## Leak-check behavior

- `npm run leak:check` runs `scripts/leak-check.ts`.
- It scans emitted client assets and one raw HTTP response for an exact configured marker.
- The marker source is `DEMO_SIGNING_KEY`, not `DEMO_PASSCODE` by name.
- It deliberately excludes `_worker.js`, because that is server output.
- It requires a built `dist` and a reachable response URL.
- The passcode claim can be exercised by setting `DEMO_SIGNING_KEY` to the same runtime marker as the test passcode.
- The page must contain only credential-handling code, never the configured credential value.
- Astro client code can safely contain the header name and environment variable name.
- Neither is the credential itself.

## Repository and workflow constraints

- The worktree already contains Lisa-owned modifications to ticket frontmatter and provenance.
- Those paths must remain unstaged and uncommitted.
- Multiple tickets share the branch; commits must contain only this ticket’s files.
- The workflow requires artifacts for Research, Design, Structure, Plan, Implement, and Review.
- Implementation progress belongs in `progress.md`.
- Meaningful implementation units should be committed incrementally.
- The existing dependency-ticket pattern uses one pre-implementation docs commit, one feature commit, and one review commit.

## Boundaries and assumptions

- “One unlock” means a successful feed request establishes page-local authorized state.
- The configured passcode remains server-only; the browser retains only what the visitor typed.
- Reloading or navigating away intentionally loses the unlocked state and passcode.
- No account, cookie, token exchange, or session is introduced.
- All later requests reuse the in-memory passcode in the same header.
- The server remains authoritative for authorization and every mutation.
- The dashboard should refresh from the feed after submission and management changes.
- Empty state is a normal successful dashboard state.
- Existing entries can include arbitrary text and web URLs within settled validation limits.
- A URL should render as a safe link only from the server-validated http(s) value.
- Completion is one-way because the existing API is one-way.
- Delete is destructive and should require explicit visitor intent in the interface.
- No backend behavior needs to change to satisfy this ticket.
