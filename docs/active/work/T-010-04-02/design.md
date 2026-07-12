# Design — T-010-04-02

## Decision summary

Extend the existing swap-proof harness with one `missing` server mode and one expected-red
subtest. In that mode, the fixture still serves the page and alternate declaration, but the
exact declared route answers HTTP 404 as if its route module were omitted. Run the unchanged
operation and healthy browser-flow edges, require both children to exit non-zero, assert the
operation trace names `parcel-proof` and the HTTP 404, then normalize both records and assert an
aggregate failure naming `parcel-proof [operation]` and `parcel-proof [flow]`. Finally run the
complete repository `npm run verify` chain against the live receipt exemplar.

## Goals

- Represent a deleted or omitted declared route without mutating the shared checkout.
- Prove the runnable operation check cannot pass when the route is missing.
- Prove the healthy browser flow cannot pass when declared response evidence never appears.
- Preserve the declared alternate boundary name in raw and normalized failure output.
- Distinguish missing-route failure from broken-signature and stalled-route failure.
- Keep the parent `npm test` suite green by asserting expected child failures.
- Leave the shipped `receiptBoundary` and `/api/receipt` route unchanged.
- Finish with the exact end-to-end command required by acceptance.
- Avoid new dependencies, commands, production abstractions, or visitor-facing copy.

## Option 1 — Temporarily remove the real receipt route

Rename or delete `src/pages/api/receipt.ts`, run a harness command, and restore the file in a
`finally` block.

### Advantages

- Reproduces the ticket wording literally in the shipped Astro application.
- Exercises Astro's missing-route behavior directly.
- Requires little new test code.

### Costs and rejection

- Mutates a tracked production file in the shared worktree during testing.
- A crash or forced termination can strand the route as deleted.
- Concurrent Lisa work or commands can observe the temporary broken state.
- Git status and build caches can become nondeterministic.
- Restoration proves process hygiene, not immutable test isolation.
- The prior ticket deliberately established a mirror to avoid this class of shared-state risk.

This option is rejected as unsafe for the repository's concurrent workflow.

## Option 2 — Add a production fault flag for missing-route behavior

Teach the real receipt handler or dev server to return 404 under a new environment-controlled
fault mode, then exercise that mode through integration check.

### Advantages

- Uses the real Astro route and full integration runner.
- Could support later demonstrations of route omission.
- Avoids renaming files during the test.

### Costs and rejection

- A present handler returning 404 is not actually an omitted handler.
- It expands production fault-injection behavior solely for a test.
- It changes shipped source and configuration surface.
- It could accidentally make a deployment route conditional.
- The ticket requires proof, not a new runtime feature.

This option is rejected as unnecessary production complexity.

## Option 3 — Unit-test a mocked 404 fetch only

Add a test to `test/ops-check.test.mjs` that injects a response with status 404 into
`runBoundaryCheck`.

### Advantages

- Very fast and deterministic.
- Directly proves the operation core exits its success path.
- Requires no HTTP server or browser.

### Costs and rejection

- The operation core already has non-OK response coverage.
- It does not prove the runnable script exits non-zero.
- It does not exercise the declared route path through an actual server.
- It does not prove the browser flow turns red.
- It does not use the swap-proof harness named by acceptance.

This option is rejected as insufficient cross-harness evidence.

## Option 4 — Omit the route in the existing isolated fixture server

Add a `missing` scenario to the existing alternate-boundary swap proof. The page continues to
fetch `/api/parcel-proof`, but the fixture server returns 404 from that exact path.

### Advantages

- Reuses the established safe mirror and alternate declaration.
- Keeps all real consumer files unchanged.
- Exercises an actual HTTP 404 at the declared path.
- Runs the real operation CLI and real healthy Playwright spec.
- Produces raw process exit codes rather than inferred unit outcomes.
- Uses existing normalization and contract naming.
- Requires a compact change in one ticket-owned test file.
- Leaves the live receipt route continuously available.

### Costs

- The missing route is represented by the fixture server rather than Astro's file router.
- Running the browser child adds roughly five seconds to the default suite.
- The parent test timeout may need adjustment because the new scenario is sequential.

This option is selected because it gives the strongest safe proof using the harness the previous
ticket established.

## Missing-route server semantics

The fixture server will preserve three facts:

1. `/` still serves the parcel page, proving the demo shell itself is reachable.
2. The page and copied consumers still declare `/api/parcel-proof` as their contract route.
3. `/api/parcel-proof` answers 404 with no parcel body, modeling an omitted route handler.

The branch belongs before ticket allocation, signing, and other response modes. No signed body
is created. This makes the mode materially distinct from:

- broken: route exists and answers a shape-valid body with invalid proof;
- stalled: route exists but never settles;
- leak: route exists and answers a valid body containing forbidden data.

## Operation proof

The subtest executes the existing `runOperation` helper, which launches the byte-copied real
`scripts/ops-check.ts` from the mirror.

Required raw assertions:

- exit code is not zero;
- output contains `parcel-proof` and `[operation]`;
- output contains `boundary answered HTTP 404`.

Together these establish that the executable check:

- followed the alternate declaration;
- reached the declared path;
- observed that no successful route contract was present;
- named the declared contract despite receiving no valid response body;
- converted the unsatisfied contract into a process failure.

## Browser-flow proof

The subtest also executes the existing `runFlow` helper against the same server.

- The page load and alternate `Parcel Window` heading succeed.
- The inline request receives 404 and never reveals the hidden parcel card.
- The unchanged healthy flow fails waiting for the declared body.
- The Playwright child exits non-zero.
- Its output should retain the named step or assertion text for the awaited boundary response.

The browser child adds an independent false-green guard. A harness that checked only page
reachability could incorrectly pass because `/` still works; the declared evidence assertion
prevents that.

## Normalized failure proof

Feed operation and flow child evidence into the existing `normalize` helper. The leak check is
not relevant to absence and receives the established zero-exit placeholder.

Assert:

- aggregate result is `failed`;
- operation record names boundary `parcel-proof`;
- operation failure kind is `operation`;
- flow record names boundary `parcel-proof`;
- flow failure kind is `flow`;
- formatted summary contains `parcel-proof [operation]`;
- formatted summary contains `parcel-proof [flow]`.

The raw trace communicates the specific absence through HTTP 404. The normalized summary
communicates which declared contract and harness slices are unsatisfied.

## Test organization

Keep the new scenario as a sibling subtest inside the existing parent test. Place it after the
healthy scenario and before broken/stalled/leak scenarios so the matrix reads:

1. healthy route passes;
2. missing route fails operation and flow;
3. present but invalid route fails verification;
4. present but stalled route times out;
5. present but leaking route fails disclosure checks.

This ordering makes route presence the first fault distinction after the baseline.

## Timeout decision

The current parent timeout is 45 seconds, while observed execution is about seven seconds. The
new missing browser failure is expected to consume the declared five-second receipt step. The
combined observed duration should remain well below 45 seconds, so no timeout increase is
planned initially. If focused execution demonstrates inadequate headroom, adjust only the
parent timeout and record the evidence in Progress.

## Full verification design

After the focused swap proof and normal test/type checks pass, run exactly:

```sh
npm run verify
```

Do not alter or inject the alternate contract for this command. It must run from the repository
root with the shipped `src/lib/boundary-contract.ts` and `src/pages/api/receipt.ts` intact.

Acceptance evidence from this command must record successful completion of:

- Node test suite, including the asserted missing-route expected-red children;
- Astro and TypeScript type checks;
- integration check against the live receipt boundary;
- backstage Playwright flow with local D1 migration;
- Astro build and Wrangler dry-run deploy.

## Copy-standard decision

- No shipped user-facing string will change.
- No existing fixture-page visible string will change.
- New assertions may match operator-only output such as HTTP status and contract names.
- RDSPI artifacts describe engineering behavior and are not rendered product copy.
- Therefore no copy inventory, counts, screenshot, projector, or phone cold-read is required for
  this source change.
- If implementation unexpectedly changes a rendered string, pause and perform the full copy
  author/review pass before committing it.

## Commit decision

The meaningful ticket-owned source unit is the missing-route swap proof in
`test/swap-proof.test.mjs`. Commit it with one exact include:

```text
lisa commit-ticket --ticket-id T-010-04-02 \
  --message "test: prove missing boundary route fails" \
  --include test/swap-proof.test.mjs
```

Attempt-private RDSPI artifacts are not included; Lisa publishes admitted artifacts separately.
Unrelated worktree paths remain excluded.

## Risks and mitigations

- Risk: 404 is confused with a broken handler.
  - Mitigation: no route-mode body is produced, and raw assertion requires exact HTTP 404.
- Risk: only operation turns red while the audience flow stays green.
  - Mitigation: run and assert the real healthy Playwright child non-zero.
- Risk: normalized flow classification becomes timeout due Playwright wording.
  - Mitigation: inspect focused output; classify according to actual established coordinator
    behavior and keep the raw missing-route assertion authoritative.
- Risk: default suite becomes slow.
  - Mitigation: run one missing browser child only and reuse existing five-second step budget.
- Risk: route deletion affects shared work.
  - Mitigation: represent omission exclusively inside the isolated fixture server.
- Risk: final verification uses stale alternate state.
  - Mitigation: never rewrite the live declaration or route at any point.
- Risk: verification-generated files enter the source commit.
  - Mitigation: use exact Lisa include paths and inspect status before and after commit.

## Out of scope

- No new missing-route production fault mode.
- No change to the integration result schema or failure kinds.
- No change to operation, leak, or browser consumer source.
- No change to the alternate contract declaration.
- No change to the shipped receipt boundary or route.
- No change to visitor-facing copy.
- No manual ticket phase/status update.

## Expected outcome

The default test suite contains a green meta-proof that two real harness edges go red when the
declared route is absent. The operation trace explicitly reports `parcel-proof`, `[operation]`,
and HTTP 404; normalized evidence also reports the failed operation and flow for
`parcel-proof`. The unchanged repository then passes the complete `npm run verify` chain with
the shipped signed-receipt boundary, demonstrating both loud failure and restored health.
