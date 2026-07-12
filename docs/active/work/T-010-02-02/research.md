# Research — T-010-02-02

## Assignment and workflow

- Ticket `T-010-02-02` starts in the Research phase.
- The assignment requires all remaining RDSPI phases in one uninterrupted pass.
- Phase artifacts belong in this attempt-private work directory.
- Lisa owns ticket phase and status transitions.
- Source commits must use `lisa commit-ticket` with exact repository-relative paths.
- Ordinary `git add` and `git commit` are prohibited for ticket work.
- The working tree already contains unrelated Lisa, Codex, and ticket metadata changes.
- Those existing changes must remain untouched and excluded from the ticket commit.

## Ticket intent

- This task is the second half of story `S-010-02`, `node-harness-reads-contract`.
- Dependency `T-010-02-01` already made the check cores generic over declarations.
- The executable Node edges now pass `receiptBoundary` into those cores.
- They still derive runtime URLs and signing-key values from receipt-specific literals.
- This ticket removes that remaining edge-level duplication.
- Acceptance names `npm run ops:check`, `npm run leak:check`, and
  `npm run integration:check` as the runnable evidence.
- Acceptance requires no `/api/receipt` literal anywhere under `scripts/`.
- Acceptance specifically requires integration `commandFor` to derive both child-check
  URLs from `contract.path`.

## Canonical declaration

- `src/lib/boundary-contract.ts` exports the `BoundaryContract<Body>` interface.
- Every contract declares a stable `name`.
- Every contract declares an absolute route `path`.
- Every contract declares the environment variable name in `keyEnv`.
- Every contract supplies response-shape assertion and verification behavior.
- Browser landmark fields are also present but are outside this ticket.
- `receiptBoundary` is the current concrete declaration.
- Its current path is `/api/receipt`.
- Its current key environment name is `DEMO_SIGNING_KEY`.
- The declaration module is portable and has no environment or filesystem access.
- Runnable edges therefore remain responsible for reading runtime values.

## Ops executable edge

- `scripts/ops-check.ts` imports `receiptBoundary` and passes it to
  `runBoundaryCheck`.
- `DEFAULT_BASE_URL` is `http://localhost:4321`.
- `OPS_CHECK_URL` can override the full target URL.
- Otherwise `resolveConfig` currently appends a hardcoded `/api/receipt`.
- `DEMO_BASE_URL` can override the base URL.
- The source expects the normal base URL form to have no trailing slash.
- `readDevVarsKey` reads `.dev.vars` for convenient local verification.
- That helper currently compares each parsed name to the literal
  `DEMO_SIGNING_KEY`.
- Runtime environment lookup also directly reads `process.env.DEMO_SIGNING_KEY`.
- The same declaration already passed into the core can supply both missing values.
- No exported API exists in this executable file.

## Leak executable edge

- `scripts/leak-check.ts` is a thin executable over `src/lib/leak-check.ts`.
- The pure leak core already receives a complete `responseUrl` and `secret`.
- No pure-core change is necessary.
- `LEAK_CHECK_URL` can override the full response URL.
- Otherwise the edge strips one trailing base slash and appends the hardcoded route.
- Its `.dev.vars` parser directly compares against `DEMO_SIGNING_KEY`.
- Its environment lookup directly reads the same literal property.
- The script does not yet import the boundary declaration.
- Importing `receiptBoundary` gives it the same route and key source as ops-check.

## Integration executable edge

- `scripts/integration-check.ts` owns build, server lifecycle, three child commands,
  deadline handling, redaction, reporting, and cleanup.
- `resolveConfig` creates or reads the signing key.
- Its environment read is hardcoded to `DEMO_SIGNING_KEY`.
- `createTemporaryConfig` writes the temporary Wrangler `vars` object.
- That object uses a hardcoded `DEMO_SIGNING_KEY` property.
- `commandFor` builds environments for operation, flow, and leak checks.
- Its shared child environment uses a hardcoded `DEMO_SIGNING_KEY` property.
- Its operation URL uses `${config.baseUrl}/api/receipt`.
- Its leak URL uses the same literal construction.
- The flow child receives only `PLAYWRIGHT_BASE_URL`; its browser path migration is
  explicitly deferred to story `S-010-03`.
- `commandFor` is private to the executable module.
- `main` already passes `receiptBoundary` to `runIntegrationChecks`.
- The contract can also be threaded through local config and command helpers.

## Release helper grep boundary

- `scripts/release-shared.ts` already imports `receiptBoundary`.
- It calls the generic `runBoundaryCheck(receiptBoundary, config)`.
- Two URL constructions still contain `/api/receipt` literals.
- One is the local release readiness check.
- One is the deployed version-host polling URL.
- These are not among the ticket's three named runnable checks.
- They are nevertheless inside `scripts/` and would violate the exact grep criterion.
- Both already have the canonical declaration in scope.
- Replacing only their route suffixes with `receiptBoundary.path` preserves behavior.

## Existing tests and evidence

- `test/boundary-contract.test.mjs` locks the current declared path and key name.
- `test/ops-check.test.mjs` exercises the generic core rather than executable env lookup.
- `test/leak-check.test.mjs` exercises complete core configs and injectable fetch.
- `test/integration-check.test.mjs` exercises the generic integration coordinator.
- The executable `commandFor` helper has no direct isolated test today.
- `npm run ops:check` requires a running receipt dev server and a usable key.
- `npm run leak:check` additionally requires a built `dist` client bundle.
- `npm run integration:check` builds once, starts its own isolated server, supplies a
  generated key, runs all three checks, and cleans up.
- The integration command is therefore the strongest executable acceptance proof.
- A literal grep is the direct proof that no script route default remains duplicated.
- Type checking covers dynamic environment indexing and computed Wrangler vars.

## URL construction constraints

- Contract paths begin with `/` under the current interface and instance.
- Default base URLs in ops and integration have no trailing slash.
- Leak-check already tolerates a single trailing slash in `DEMO_BASE_URL`.
- Preserving that normalization avoids a behavior regression for its existing callers.
- Ops-check can use the same normalization while adopting the declaration.
- Full URL overrides must retain precedence over base-plus-path construction.
- Flow configuration must remain base-only because Playwright owns its route separately.

## Key lookup constraints

- `keyEnv` contains a variable name, never the secret value.
- Node supports dynamic lookup with `process.env[contract.keyEnv]`.
- `.dev.vars` parsing should accept the desired variable name as data.
- Temporary Wrangler configuration supports a computed property name.
- Child process environment objects support the same computed property.
- The generated integration key must remain redacted from captured output and reports.
- No key value should be logged or copied into browser-facing data.

## Copy scope

- No visitor-visible page copy, accessible label, metadata, or UI state changes.
- Existing comments and operator-only CLI output are not user-facing product copy.
- The copy voice standard therefore does not govern this ticket's edited surfaces.
- No copy inventory is required before Design.

## Repository constraints

- The ticket and Lisa metadata are already modified outside source scope.
- A `.lisa-commit.lock` and Lisa hook files are also present.
- Attempt artifacts are private workflow evidence, not source-commit inputs.
- Exact include paths are necessary to avoid capturing concurrent work.
- After the Lisa commit, every ticket-owned source path must be clean.

## Research conclusion

- The declaration is already imported by two relevant script modules and can be added
  to the third without changing any core interface.
- All URL and key literals targeted by the story have been identified.
- Release helper route literals must also migrate for the exact scripts grep to pass.
- The change is edge configuration only: no core algorithm, browser flow, server route,
  response shape, signing behavior, or product copy needs modification.
