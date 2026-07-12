# Research — T-010-04-02

## Ticket state and scope

- Ticket `T-010-04-02` starts in Research.
- It depends on completed ticket `T-010-04-01`.
- The acceptance criterion has two linked proofs:
  - omitting the declared route must make the harness exit non-zero and name the missing or
    unsatisfied contract;
  - with the shipped `receiptBoundary` restored, `npm run verify` must pass end to end.
- Lisa owns ticket phase/status transitions, so ticket frontmatter is not an implementation
  surface.
- Attempt artifacts belong only in `.lisa/attempts/T-010-04-02/1/work/`.
- Ticket source commits must use `lisa commit-ticket` with exact include paths.

## Repository state

- The branch is `main` at completion commit `a61ec47` for T-010-04-01.
- Source commit `af2e6b6` introduced the swap-proof harness and alternate contract fixture.
- The worktree contains unrelated Lisa/Codex configuration, hook, provenance, lock, and ticket
  metadata changes.
- Those paths are owned by orchestration and must remain untouched and excluded from commits.
- The ordinary Git index is empty.
- No nested `AGENTS.md` exists below the repository root.

## Canonical project guidance

- `CLAUDE.md` identifies Demo Runway as a Cloudflare-first Astro template and assembly playbook.
- `AGENTS.md` points all clients to `CLAUDE.md` and requires the RDSPI workflow.
- `docs/knowledge/rdspi-workflow.md` requires all six phases without pausing between them.
- The workflow requires Research, Design, Structure, Plan, Implement, and Review artifacts.
- `docs/knowledge/copy-voice-standard.md` applies before changing visitor-readable or audible
  interface text.
- This ticket is expected to change engineering test behavior and documentation only.
- Existing fixture-page copy is rendered in a browser but is not expected to change.
- Operator-only test output and RDSPI artifacts are outside the copy standard's user-facing
  scope.

## Shipped boundary declaration

- `src/lib/boundary-contract.ts` is the single declaration module.
- It exports `BoundaryContract<Body>` and the live `receiptBoundary` value.
- `receiptBoundary.name` is `signed-receipt`.
- `receiptBoundary.path` is `/api/receipt`.
- `receiptBoundary.keyEnv` is `DEMO_SIGNING_KEY`.
- The declaration also owns response shape validation, signature verification, page landmarks,
  evidence selectors/patterns, and the primary action name.
- The route implementation is `src/pages/api/receipt.ts`.
- Astro maps that file to the declared `/api/receipt` HTTP path.
- The live page is `src/pages/index.astro` and fetches the receipt route.

## Runnable operation check

- `scripts/ops-check.ts` imports `receiptBoundary` directly.
- Its default URL appends `receiptBoundary.path` to the demo base URL.
- Its key lookup uses `receiptBoundary.keyEnv`.
- It calls `runBoundaryCheck` from `src/lib/ops-check.ts`.
- It prints `formatBoundaryTrace` output.
- It exits zero only for a passed operation trace.
- It exits one for a boundary failure.
- It exits two only for invalid check configuration.
- An explicit `OPS_CHECK_URL` can point the unchanged script at a fixture server.

## Operation failure behavior

- `runBoundaryCheck` invokes `fetch` with the operation runner's abort signal.
- A non-2xx response throws `boundary answered HTTP <status>`.
- Invalid response JSON or contract shape also throws within the operation.
- Failed signature verification throws a distinct signature message.
- `src/lib/operation-runner.ts` catches invocation failures into settled trace evidence.
- Non-timeout invocation failures receive failure kind `operation`.
- Time-budget expiry receives failure kind `timeout`.
- Every trace uses `contract.name` as `operationName`, including failures before a body exists.
- `formatBoundaryTrace` therefore names the declared contract on HTTP 404.
- Its failure output includes both `[operation]` and the underlying HTTP status message.

## Browser-flow check

- `tests/support/flow-contract.ts` imports the same `receiptBoundary` declaration.
- It derives the route glob, page heading, landmarks, evidence, and action name from it.
- `tests/demo-flow.spec.ts` imports only that flow support module.
- The healthy project loads the page shell, waits for the declared result body, validates every
  declared evidence field, and activates the declared action.
- A route that answers 404 leaves the fixture result body hidden.
- The healthy flow then fails its named boundary-response step within the five-second step
  budget.
- Playwright exits non-zero for that failure.
- `playwright.config.ts` accepts `PLAYWRIGHT_BASE_URL`, which disables its owned web server and
  lets the swap proof use an in-process fixture server.

## Integration normalization

- `src/lib/integration-check.ts` coordinates `operation`, `flow`, and `leak` checks.
- A non-zero operation child is normalized as `operation` unless its output identifies timeout.
- A non-zero flow child is normalized as `timeout` only for timeout-shaped output; otherwise it
  is normalized as `flow`.
- Every normalized record receives the supplied boundary identity.
- `formatIntegrationSummary` prints the boundary plus bracketed failure kind.
- The coordinator's aggregate outcome is failed unless every check passes.
- The swap proof can supply zero-exit placeholders for checks irrelevant to one focused fault.

## Existing alternate-boundary fixture

- `test/fixtures/alternate-boundary/boundary-contract.ts` is test-only.
- It exports its alternate value through the stable `receiptBoundary` identifier expected by
  unchanged consumers.
- Its actual boundary name is `parcel-proof`.
- Its route is `/api/parcel-proof`.
- Its key environment name is `PARCEL_PROOF_KEY`.
- Its response has parcel-specific fields and HMAC verification.
- Its page landmarks differ from the shipped receipt exemplar.
- This makes accidental receipt literals observable.

## Existing swap-proof harness

- `test/swap-proof.test.mjs` is included in the explicit `npm test` file list.
- It creates a fresh `.swap-proof-*` mirror beneath the repository for each scenario.
- It copies the real operation/leak scripts and their core dependencies.
- It copies the real Playwright config, flow support, and flow spec.
- It installs only the alternate declaration at the mirror's normal declaration path.
- It asserts selected copied consumers remain byte-identical to repository sources.
- It creates a minimal safe `dist` fixture for leak scanning.
- Cleanup removes the mirror recursively.

## Fixture server behavior

- The harness starts an in-process Node HTTP server on loopback and an ephemeral port.
- `/` serves a minimal parcel page.
- The page fetches the declared `/api/parcel-proof` route on load and action activation.
- Unknown paths already answer HTTP 404 with `not found`.
- The declared route currently has healthy, broken, stalled, and leak response modes.
- Healthy returns a signed parcel response.
- Broken returns a shape-valid response with an invalid proof.
- Stalled accepts the route request without completing it.
- Leak returns a valid response containing the deterministic fixture key in an extra field.
- Open sockets are tracked and destroyed during teardown.

## Existing swap-proof assertions

- Healthy runs operation, flow, and leak children and requires all three to exit zero.
- Broken requires the operation child to exit non-zero and names `parcel-proof [operation]`.
- Stalled requires operation and flow children to exit non-zero and normalize as timeouts.
- Leak requires operation to pass, leak detection to fail, and normalization to name the leak.
- The parent suite remains green because expected-red child exits are asserted as behavior.
- The harness outer test timeout is 45 seconds.
- Child processes have a 15-second outer timeout.
- The existing suite takes about seven seconds, dominated by the stalled browser assertion.

## Full verification chain

- `package.json` defines `verify` as a strict `&&` chain.
- It runs `npm test` first.
- It then runs `npm run typecheck`.
- It then runs `npm run integration:check`.
- It then runs `npm run test:flow:backstage`.
- It finally runs `npm run deploy:dry`.
- Any non-zero stage stops the chain and makes `npm run verify` non-zero.
- `integration:check` builds once, starts an isolated local server, and runs operation, healthy
  browser flow, and leak checks against the live receipt exemplar.
- `test:flow:backstage` applies local D1 migrations and exercises the mobile backstage flow.
- `deploy:dry` performs an Astro build and Wrangler dry-run deployment.

## Constraints and assumptions

- The missing route must be demonstrated without deleting the real route in the shared checkout.
- Shared-filesystem safety rules out temporarily renaming `src/pages/api/receipt.ts`.
- The existing isolated fixture server can represent an omitted route without production edits.
- A 404 from the exact declared path is direct evidence that the declaration is unsatisfied.
- Both raw operation output and normalized integration output can name that failure.
- Browser failure adds evidence that the public flow cannot remain falsely green.
- The final `npm run verify` must execute against the unchanged live `receiptBoundary` and route.
- Verification may create ignored build/test artifacts, which are not ticket-owned source.
- No dependency or external network lookup is required for the implementation itself.

## Relevant likely change surface

- `test/swap-proof.test.mjs` is the only source file that needs behavior added.
- `package.json` already runs that harness and likely needs no change.
- The alternate declaration fixture likely needs no change.
- No production `src/`, `scripts/`, Playwright config, or browser-flow source needs change.
- Attempt artifacts are written privately and are published by Lisa after lease verification.

## Research conclusion

The repository already contains all machinery needed to prove this ticket. The alternate
swap-proof server can omit its declared route while continuing to serve the declared page. The
unchanged operation check will turn HTTP 404 into a non-zero, contract-named operation failure;
the unchanged healthy browser flow will also exit non-zero because declared evidence never
appears. Existing normalization can preserve the alternate boundary name in the aggregate
failure summary. After that expected-red case is asserted by the green parent suite, the full
`npm run verify` chain exercises the restored shipped `receiptBoundary` end to end.
