# Review — T-008-03-01 unified dashboard page

## Review verdict

The acceptance criterion is met. `backstage.astro` is now one passcode-first dashboard rather than
a public submit-only form. A successful gated feed read unlocks existing entries as a native
checklist. The typed passcode is retained only in the page module’s private closure, cleared from
the password input, and reused for submit, complete, delete, and canonical feed refreshes. A wrong
passcode receives the real 403 response and never reveals the dashboard.

The phone-viewport acceptance drives the complete behavior against the Astro edge and migrated D1:
wrong unlock, correct unlock, existing entry listing, submission without another credential,
completion, deletion, and final canonical feed state. The full 172-test unit suite, type gate,
production build, and exact-passcode client leak scan are green.

No critical issue requires human intervention before Lisa advances the ticket.

## What changed

### Modified — unified backstage page

`src/pages/backstage.astro`

- Retains the static/prerendered page architecture.
- Reframes the page around one shared checklist.
- Keeps the low-stakes shared-knock guidance visible before unlock.
- Adds an initially visible dedicated passcode gate.
- Makes the dashboard hidden in initial HTML.
- Uses a gated feed GET as credential proof and initial data load.
- Leaves the page locked after a missing or wrong passcode.
- Maps 401/403 to a clear visitor-facing refusal.
- Maps availability, malformed feed, and network failures to bounded gate errors.
- Stores a successful passcode only in a module-private closure variable.
- Clears the password input immediately after unlock.
- Never writes the passcode to DOM text or attributes.
- Never writes the passcode to a URL or request body.
- Never uses local storage, session storage, cookies, or global `window` state.
- Forgets the passcode naturally on reload or navigation.
- Reveals one dashboard after successful unlock.
- Focuses the dashboard heading after unlock.
- Places the submission form and checklist within that dashboard.
- Removes the passcode field from the submission form.
- Removes the old separate confirmation panel.
- Removes “Send another” and the form/confirmation swap state.
- Preserves reference/feedback selection and friendly validation.
- Preserves server-authoritative POST validation.
- Sends exactly type, URL, and text in the POST body.
- Reuses the closure passcode in `x-demo-passcode` for POST.
- Clears entry content after successful submission.
- Refreshes the canonical feed to discover the new database id.
- Announces successful addition within the unified list region.
- Runtime-validates the complete feed envelope before rendering.
- Requires schema version 1 and the backstage gate marker.
- Requires count to equal the validated entries array length.
- Validates every stable positive id and public entry field.
- Renders entries using DOM construction and `textContent`.
- Does not interpret stored entry text as HTML.
- Shows a successful empty-store state explicitly.
- Preserves feed/store oldest-first ordering.
- Uses stable ids as rendering identity and mutation route handles.
- Renders a native checkbox for every entry.
- Maps null completion to unchecked/actionable.
- Maps timestamp completion to checked/disabled.
- Adds visible “Ready to review” or “Complete” state text.
- Adds line-through treatment without relying on color alone.
- Renders optional http(s) links with a safe new-tab relationship.
- Sends PATCH from an incomplete checkbox with the same passcode.
- Disables addressed controls while completion is pending.
- Refreshes the feed after successful completion.
- Restores the checkbox and announces failure if completion fails.
- Adds an entry-specific delete button.
- Requires native confirmation before DELETE.
- Sends DELETE with the same passcode.
- Refreshes the feed after successful deletion.
- Restores controls and announces failure if deletion fails.
- Uses scoped assertive alerts for gate, form, and list failures.
- Uses polite live status for counts and successful mutations.
- Keeps touch controls at the established shared control height.
- Adds phone stacking and content wrapping for checklist cards.
- Keeps page styling on shared design tokens.

### Modified — backstage browser acceptance

`tests/backstage-flow.spec.ts`

- Replaces the submit/read scenario with unified-dashboard acceptance.
- Remains pinned to the mobile backstage Playwright project and Pixel 5 preset.
- Generates unique markers and seeds an existing entry through the real API.
- Proves the dashboard and submit control are initially hidden.
- Attempts a known wrong passcode and asserts the real feed 403.
- Proves the wrong attempt leaves the dashboard hidden.
- Enters the correct passcode once and asserts feed 200.
- Proves the gate hides, the dashboard appears, and focus moves correctly.
- Proves the password field is cleared.
- Proves no password input exists inside the dashboard.
- Proves the seeded existing entry appears.
- Submits a reference without entering another credential.
- Asserts POST 201 and the rendered reference/link.
- Reads the stable id from the canonical rendered entry.
- Checks its completion checkbox and asserts addressed PATCH 200.
- Proves refreshed checked, disabled, and textual Complete states.
- Submits a second feedback entry without another credential.
- Locates its independently assigned stable id.
- Accepts delete confirmation and asserts addressed DELETE 200.
- Proves the deleted row disappears and completed sibling remains.
- Reads the final gated feed.
- Proves the seed remains, completion timestamp exists, and deletion persists.

### Modified — browser flow contract

`tests/support/flow-contract.ts`

- Replaces submit-only step names with seven dashboard transitions.
- Keeps the deterministic test passcode, project, and local port unchanged.
- Raises the per-test budget from 20 to 35 seconds.
- Raises the global flow budget from 40 to 60 seconds.
- Keeps each individual action capped at 10 seconds.
- The observed final flow completes well below the expanded bounds.

### Created — workflow artifacts

- `research.md` maps the page, APIs, persistence, tests, checker, and constraints.
- `design.md` evaluates three options and selects closure-based client unlock.
- `structure.md` defines markup, state, helpers, event flows, styles, and tests.
- `plan.md` sequences implementation, verification, commits, and review.
- `progress.md` records implementation, evidence, deviations, and commits.
- `review.md` provides this handoff.

## Files deleted

None. The old submit-only behavior was removed from the existing page; the route remains the one
canonical backstage location.

## Files intentionally unchanged

- `src/lib/backstage-entry.ts`: settled six-field public contract.
- `src/lib/backstage-retrieval.ts`: settled gated feed and ordering.
- `src/lib/backstage-route.ts`: settled collection POST behavior.
- `src/lib/backstage-management.ts`: settled PATCH/DELETE behavior.
- all Astro API edges: their existing paths and dispatch already satisfy the page.
- `src/lib/backstage-store.ts` and both migrations: no persistence change.
- `src/lib/passcode.ts`: the page reuses its shared header contract.
- Wrangler and generated types: no resource or secret contract changed.
- package and lock files: existing commands and dependencies were sufficient.
- ticket phase/status frontmatter and Lisa provenance were not staged or committed.

## Acceptance mapping

### One surface replaces the submit-only form

Met. The route initially presents only its gate. Submission is nested inside the post-unlock
dashboard, and the old confirmation replacement surface is gone. Browser acceptance proves the
submit control is hidden before unlock and available afterward.

### Correct passcode unlocks existing entries as a checklist

Met. Unlock performs the real feed GET and commits state only after a valid 200 feed. The test seeds
an entry before navigation and observes it after unlock. Entries use native checkboxes, explicit
state labels, canonical ids, content, completion, and order.

### Wrong passcode is refused

Met. The test observes the server’s shared 403. The gate explains the mismatch without echoing the
candidate, stays visible, and never renders entry content.

### One unlocked visitor submits without another credential

Met. The dashboard has no passcode field. POST uses the private page-memory value. The created
reference appears after canonical refresh, and no account or session is issued.

### One unlocked visitor marks an entry complete

Met. The incomplete checkbox sends addressed PATCH with the same passcode. The test observes 200;
refreshed state is checked, disabled, textually Complete, and carries a final feed timestamp.

### One unlocked visitor deletes another entry

Met. The entry-specific button confirms and sends addressed DELETE with the same passcode. The test
observes 200, the row disappears, its sibling remains, and the final feed excludes the id/marker.

### Passcode remains in page memory only

Met. The configured value remains server-only. The presented value moves from the password input to
a lexical closure only after valid unlock; the input is cleared. No storage, cookie, URL, body, DOM
text, or global-state persistence exists. Reload/navigation destroys the closure.

### Leak command confirms no passcode in the bundle

Met. Production output was built first. The unchanged command scanned `dist/client`, with its exact
marker set to the runtime `DEMO_PASSCODE` value, plus the built backstage response. Five client
assets and one response passed with zero findings, and output did not reveal the marker.

## Test results

### Focused unified phone flow

```text
npx playwright test tests/backstage-flow.spec.ts --project=backstage

1 passed
7 boxed steps passed
```

This is the direct acceptance proof over browser UI, real HTTP routes, and local D1.

### Full unit suite

```text
npm test

tests 172
pass 172
fail 0
cancelled 0
skipped 0
todo 0
```

All backend contracts composed by the page remain green.

### Type gate

```text
npm run typecheck

Astro: 0 errors, 0 warnings, 0 hints across 60 files
tsc --noEmit: passed
worker:types:check: generated types up to date
```

The existing Astro `session.driver` deprecation notice remains unrelated.

### Production build

```text
npm run build

/backstage/index.html prerendered
Cloudflare server built
build complete
```

### Exact passcode leak check

```text
npm run leak:check

✓ leak check — passed
    client assets    5 checked
    response bodies  1 checked
```

### Diff quality

- `git diff --check` passed before the feature commit.
- `git diff --cached --check` passed for both ticket commits.
- The implementation commit contains exactly four owned paths.
- Lisa-managed ticket/provenance changes remain outside ticket commits.

## Coverage assessment

### Strong coverage

- Real wrong and correct credential responses are observed, not mocked.
- Locked/unlocked visibility and focus boundaries are asserted.
- A pre-existing row proves initial feed rendering.
- One credential entry is observable across all later operations.
- Real POST, PATCH, DELETE, and GET routes are exercised over migrated D1.
- Stable ids connect rendered controls to item API paths.
- Canonical refresh prevents invention of server-owned state.
- Completion and deletion are checked in UI and final feed.
- A surviving sibling catches broad mutation errors.
- Pixel 5 coverage exercises phone layout and touch controls.
- Exact passcode marker scanning covers every emitted browser asset.
- Full backend suites preserve gate order, validation, isolation, and fidelity.
- Typecheck and production build cover packaging and client-script contracts.

### Intentional gaps

- No deployed remote Worker/D1 was exercised; local Workers emulation is the ticket proof.
- No screenshot regression baseline was added; behavior is asserted at phone viewport.
- No desktop-specific flow was added; the responsive layout uses the same DOM.
- No polling or simultaneous-client synchronization is tested.
- No “uncomplete” behavior exists because the management API exposes completion only.
- No explicit delete-cancel assertion was added; the accepted destructive path is covered.
- Later-operation credential rotation is mapped to an error but not browser-driven.
- Malformed successful-feed handling is defensive code rather than a browser fixture; exact feed
  shape has dedicated unit coverage.

## Open concerns and follow-up ownership

- **Completion is one-way:** completed checkboxes are intentionally checked and disabled. Reopening
  requires a backend contract and should be a separate ticket.
- **Shared-list freshness:** another visitor’s changes appear after the next local mutation or reload.
  Polling, push, or manual refresh can be considered if real use shows confusion.
- **Native delete confirmation:** this is accessible and dependency-free but not visually themed. A
  custom dialog would require focus/cancel behavior and dedicated tests.
- **Leak checker naming:** the checker reads its marker from `DEMO_SIGNING_KEY`; this run supplied it
  the `DEMO_PASSCODE` value. Future tooling could add neutral or multi-marker configuration.
- **Existing deprecation:** Astro still reports the repository’s `session.driver` string signature
  deprecation. It does not affect this dashboard.

## Commits

- `f830b43 docs(T-008-03-01): research through implementation plan`
- `0ebcb29 feat(T-008-03-01): unify backstage dashboard`

The final review artifact is committed separately after staging and whitespace verification.
