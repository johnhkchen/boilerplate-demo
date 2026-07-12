# Research — T-010-04-01

## Ticket state and scope

- The ticket starts in `research` and requires all six RDSPI phases.
- Its single acceptance criterion asks for an executable swap proof.
- The proof must use an alternate `BoundaryContract` and a stub.
- Healthy operation, leak, and browser-flow checks must pass.
- Broken, stalled, and leaking cases must fail.
- Failure evidence must name the boundary and failure kind.
- The swap must not edit `scripts/*` or `tests/demo-flow.spec.ts`.
- The alternate boundary is test-only, not another shipped product boundary.
- Missing-route behavior and the final full `npm run verify` belong to T-010-04-02.

## Repository and workflow constraints

- `CLAUDE.md` is the project source of truth referenced by `AGENTS.md`.
- RDSPI artifacts belong in the attempt-private work directory.
- Lisa publishes admitted artifacts to the shared work directory.
- The ticket frontmatter phase and status are Lisa-owned.
- Ticket source commits must use `lisa commit-ticket` with exact include paths.
- The worktree already contains unrelated Lisa/Codex changes.
- Those paths must remain untouched and excluded from the ticket commit.
- The ordinary Git index must not be used.

## Boundary declaration

- `src/lib/boundary-contract.ts` defines `BoundaryContract<Body>`.
- A contract declares a boundary name, path, and signing-key environment name.
- `assertShape` turns an unknown response into the boundary body type or throws.
- `verify` checks the shaped body with an out-of-band key.
- The page landmark declares heading and status/body selectors.
- It also declares evidence names, selectors, and regular-expression patterns.
- It declares the primary action's accessible name.
- `receiptBoundary` is the only shipped instance.
- The declaration module is portable between Node and Playwright consumers.
- It has no I/O and no Node-only import requirement at the interface level.

## Operation check path

- `src/lib/ops-check.ts` exports `runBoundaryCheck(contract, config)`.
- The core gets its operation name from `contract.name`.
- It fetches the configured URL with an abort signal.
- Non-2xx responses become operation failures.
- Successful JSON passes through `contract.assertShape`.
- When a key exists, the core calls `contract.verify`.
- Failed verification becomes an operation failure.
- A pending fetch becomes a timeout failure at the supplied budget.
- `formatBoundaryTrace` includes the boundary name and failure kind.
- `scripts/ops-check.ts` is the runnable edge.
- That edge imports the exported symbol named `receiptBoundary`.
- Its default URL joins the base URL to the declaration's path.
- It reads the key at the declaration's `keyEnv` name.
- Full URL and timeout environment overrides already exist.

## Leak check path

- `src/lib/leak-check.ts` scans emitted browser assets and one raw response.
- It treats the configured secret as the disclosure marker.
- The server bundle subtree is excluded from browser-asset scanning.
- A secret in a browser asset produces an `asset` finding.
- A secret in the raw response produces a `response` finding.
- A stalled or unreadable response rejects within the supplied budget.
- `formatLeakCheck` reports `secret reached` when findings exist.
- `scripts/leak-check.ts` is the runnable edge.
- It imports the same exported `receiptBoundary` symbol.
- Its default response URL and key lookup follow the declaration.
- Bundle directory, full URL, and timeout overrides already exist.

## Integration normalization

- `src/lib/integration-check.ts` coordinates operation, flow, then leak evidence.
- `runIntegrationChecks` accepts only a boundary identity plus a runner.
- Every normalized check result records the supplied boundary name.
- A failed operation parses `operation` or `timeout` from formatted output.
- Flow output containing timeout language normalizes to `timeout`.
- Other flow failures normalize to `flow`.
- Leak output containing `secret reached` normalizes to `leak`.
- Other leak failures normalize to `evidence`.
- Ordinary failures do not prevent later checks from running.
- `formatIntegrationSummary` prints boundary, kind, check, and outcome.
- Existing unit tests lock these classification rules.

## Browser-flow path

- `tests/support/flow-contract.ts` imports the exported `receiptBoundary` symbol.
- It derives the Playwright route glob from the declared path.
- It re-exports the declared heading and primary action name.
- It exposes the declaration's original landmark object.
- `tests/demo-flow.spec.ts` imports only those browser-facing values.
- The healthy project navigates to `/` and finds the declared heading.
- It expects the declared result body to become visible.
- It expects the declared loading/status element to become hidden.
- It iterates all declared evidence and applies each declared pattern.
- It uses the first evidence entry as the freshness witness.
- Clicking the declared action must change that evidence and re-enable the action.
- The stalled project intercepts the declared path glob.
- The ordinary `test:flow` command selects the healthy project.
- Against a server that never answers, that healthy flow fails at its named wait.

## Playwright configuration

- `playwright.config.ts` uses `PLAYWRIGHT_BASE_URL` when supplied.
- With that variable set, Playwright does not start its owned Astro server.
- The config's test directory and project selection are relative to the config.
- The healthy project is pinned to `tests/demo-flow.spec.ts`.
- The repository already contains the Playwright package and browser setup.
- A temporary mirror below the repository can resolve root `node_modules`.
- The existing config can therefore run against a fixture server without edits.

## Existing test patterns

- Tests use Node's built-in `node:test` and strict assertions.
- Async filesystem fixtures use `mkdtemp` and `t.after` cleanup.
- HTTP behavior is commonly supplied by local stubs or injectable `fetch` functions.
- Child checks are already exercised through npm and direct Node invocations elsewhere.
- The package test script enumerates test files explicitly.
- A new swap-proof test must be added to that enumeration to join the default suite.
- Test output and Playwright artifacts live under ignored `test-results` paths.

## Isolation observations

- Replacing the live declaration during a test would mutate the shared checkout.
- Multiple Lisa tickets can run on the same branch and filesystem.
- A live replacement could race with other tests or agents.
- An isolated temporary mirror avoids changing tracked production paths.
- Only the files imported by the two script edges and browser flow are needed.
- The real scripts and flow spec can be copied byte-for-byte into that mirror.
- A test fixture can occupy the mirrored declaration path.
- The mirrored export can retain the name `receiptBoundary` for compatibility.
- Its value can be a genuinely different contract instance.
- The stub can be an in-process HTTP server owned by the test.
- Environment overrides can point every runnable edge to that server.

## Fault behavior available to a stub

- Healthy mode can return a correctly shaped, verifiable alternate response.
- Broken mode can return the same shape with an invalid signature.
- This distinguishes semantic verification from a naive HTTP-200 check.
- Stalled mode can accept the declared request without ending the response.
- The operation budget will classify that as `timeout`.
- The healthy Playwright project will fail its declared response wait.
- Leak mode can return a healthy response plus the exact out-of-band key.
- Shape validation may tolerate the extra field while leak scanning catches it.
- A static browser-asset fixture is sufficient for the clean asset side.

## Copy-standard applicability

- `docs/knowledge/copy-voice-standard.md` applies to fixture page text visitors can see.
- Although the page is test-only, its heading, button, status, and labels are rendered.
- The fixture display name must be at most 5 words and 40 characters.
- The action must be at most 6 words and 36 characters and begin with a verb.
- Status copy must be at most 14 words and 100 characters.
- Data labels must be at most 5 words and 32 characters.
- Operator-only test names, diagnostics, and protocol fields are outside its scope.
- Research therefore cites the standard and maps all affected surfaces before Design.

## Copy surface map

- Primary heading: alternate fixture display name.
- Loading/status element: visible while the request is pending.
- Primary button: accessible and visible action label.
- Evidence label one: visible label for the freshness value.
- Evidence label two: visible label for the signature value.
- No metadata, help text, validation message, or alternate accessible description is needed.

## Assumptions and boundaries

- “By declaration alone” means the reusable harness consumers remain unchanged.
- A test-only stub page is explicitly allowed by the parent story.
- The alternate declaration may keep the exported identifier `receiptBoundary` because consumers
  depend on the declaration slot, while its name/path/body/landmarks are alternate.
- The proof should execute runnable edges rather than only call their pure cores.
- Normalized integration evidence is the existing place to assert boundary and failure kind.
- This ticket does not need to alter production behavior or public pages.
- This ticket does not prove the missing-route case reserved for its dependent ticket.
- This ticket does not run the final receipt-wide `npm run verify` reserved for that ticket.
