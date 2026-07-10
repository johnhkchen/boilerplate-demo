# Plan — T-003-02-01 passcode-gated-submission-route

## Goal

Deliver a tested on-demand POST route that composes the completed passcode gate and persistence
module around strict runtime validation. Prove success by reading the created entry back through
the production store function, and prove all representative rejections occur before a write.

## Verification strategy

- **Primary acceptance test:** invoke the exported Astro route handler with real `Request` objects
  and a D1-shaped store backed by real in-memory SQLite plus the committed migration.
- **Focused check:** run the new route test by itself during implementation.
- **Regression check:** run the complete explicit `npm test` suite.
- **Static check:** run `npx tsc --noEmit`; distinguish ticket-caused from pre-existing failures.
- **Build check:** run `npm run build` to exercise Astro page discovery and Cloudflare output.
- **Deployment config check:** run `npm run deploy:dry` if local tooling permits, without remote
  credentials or state changes.
- **Diff check:** inspect only ticket-owned files plus `package.json`, then inspect overall status
  to ensure unrelated dirty files were not staged or modified.

## Step 1 — Create portable submission validation

**File:** `src/lib/backstage-submission.ts`.

1. Import the canonical entry tuple and types.
2. Declare the three-field `BackstageSubmission` interface.
3. Export practical URL and text maximums.
4. Declare a discriminated validation result.
5. Implement plain-record and entry-type narrowing helpers.
6. Implement empty-or-HTTP(S) URL validation.
7. Validate exact keys, field types, nonblank text, and length limits.
8. Construct and return a clean submission object on success.
9. Implement the server-timestamp conversion to `BackstageEntry`.
10. Keep validation pure, deterministic, and independent of Astro/Cloudflare.

**Independent verification:** import through the forthcoming route tests; run typecheck after the
route and test exist so the public types are exercised in context.

**Atomic commit:** `Add backstage submission validation (T-003-02-01)`.

## Step 2 — Add the on-demand POST route

**File:** `src/pages/api/backstage/entries.ts`.

1. Set `prerender = false`.
2. Add consistent private JSON/error response helpers.
3. Add a media-type predicate for `application/json` with optional parameters.
4. Export `POST` as an Astro `APIRoute`.
5. Read runtime env and invoke `guardPasscode` first.
6. Return existing gate denial responses unchanged.
7. Reject non-JSON content type with 415.
8. Parse JSON once and map syntax/body-read failure to 400.
9. Validate parsed input and map failure to 422 with safe issue messages.
10. Detect absent DB binding and return safe 500.
11. Build the canonical entry with a server ISO timestamp.
12. Persist through `saveEntry`, mapping thrown storage failure to a safe 500.
13. Return `{ entry }` with 201 after the awaited write succeeds.

**Independent verification:** Astro build after tests; route is discovered at
`/api/backstage/entries` and is absent from static prerender output.

**Atomic commit:** `Add passcode-gated backstage entry route (T-003-02-01)`.

## Step 3 — Drive the route and store together

**Files:** `test/backstage-route.test.mjs`, `package.json`.

1. Build an isolated SQLite-backed D1-shaped fixture from the committed migration.
2. Add helpers for POST requests and minimal Astro context invocation.
3. Test the happy reference path:
   - correct `x-demo-passcode`;
   - exact three-field JSON payload;
   - status 201 and JSON response;
   - server ISO timestamp;
   - production `listEntries` returns exactly the response entry.
4. Test a feedback entry with an empty URL.
5. Test wrong passcode -> 403; assert zero stored rows.
6. Test malformed field type/missing field -> 422; assert zero stored rows.
7. Assert wrong-passcode and malformed-shape statuses are distinct.
8. Test extra `submittedAt` -> 422; assert zero stored rows.
9. Test invalid JSON -> 400; assert zero stored rows.
10. Test non-JSON media type -> 415; assert zero stored rows.
11. Test blank configured passcode -> gate 500; assert zero stored rows.
12. Test missing DB binding -> `store_misconfigured` 500.
13. Test rejecting store -> `entry_write_failed` 500 and no raw error leak.
14. Register the new test file in `npm test` without changing other scripts.

**Independent verification:**

```sh
node --experimental-strip-types --test test/backstage-route.test.mjs
npm test
```

**Atomic commit:** `Test backstage submission route end to end (T-003-02-01)`.

## Step 4 — Validate runtime and build integration

1. Run `npx tsc --noEmit`.
2. If it fails, identify whether failures are introduced by this ticket.
3. Fix ticket-owned type failures before proceeding.
4. Run `npm run build`.
5. Inspect generated route metadata for `/api/backstage/entries` if useful.
6. Run `npm run deploy:dry` to validate Wrangler’s bundle/config without deployment.
7. Confirm no passcode value, payload, database exception, or account identifier was introduced.
8. Confirm ticket frontmatter is unchanged.

**Verification criteria:** all route and regression tests pass; build completes; dry-run completes
or any environment-only blocker is recorded precisely.

No separate code commit unless verification requires a correction. Any correction is committed as
its own meaningful unit and documented as a deviation.

## Step 5 — Track implementation

**File:** `docs/active/work/T-003-02-01/progress.md`.

Record:

- each completed plan step;
- commit identifiers and messages;
- focused/full test counts;
- typecheck, build, and dry-run results;
- any deviations made before executing the changed direction;
- unrelated worktree changes that were preserved;
- remaining work until Review.

The progress artifact is updated during Implement, not reconstructed only after coding.

## Step 6 — Review and handoff

**File:** `docs/active/work/T-003-02-01/review.md`.

1. Inspect the final ticket-specific diff and commits.
2. Summarize every created/modified/deleted file.
3. Map each acceptance clause to implementation and evidence.
4. Explain the route contract for the downstream phone form.
5. Report exact test coverage and commands.
6. Identify gaps: direct handler versus live socket, absence of rate limiting/CSRF, length-unit
   semantics, remote D1 lifecycle, or other discovered limitations.
7. Flag critical issues distinctly; state explicitly if none exist.
8. List safe next-ticket handoff details without expanding this ticket.
9. Write `review.md` and stop; do not edit phase or status.

## Expected commits

1. `Add backstage submission validation (T-003-02-01)`.
2. `Add passcode-gated backstage entry route (T-003-02-01)`.
3. `Test backstage submission route end to end (T-003-02-01)`.
4. `Record submission route implementation (T-003-02-01)` for work artifacts, after code checks.

Research/design/structure/plan artifacts may be committed together before implementation because
they form the approved blueprint for the code units; they remain separate reviewable files.

## Completion conditions

- `research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md`, and `review.md` exist.
- Valid gated input returns 201 and round-trips through the real local store.
- Wrong passcode returns 403 and writes zero rows.
- Malformed shape returns 422 and writes zero rows.
- Rejection statuses are distinct.
- Server owns `submittedAt`.
- Full tests and Astro build pass.
- No unrelated work is included in ticket commits.
- Ticket phase/status fields are unchanged.
