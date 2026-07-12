# Design — T-010-02-01

## Decision summary

Require a `BoundaryContract<Body>` as the first argument to the ops check and a
boundary-name declaration as the first argument to the integration coordinator.
Make the ops result generic over `Body`, call the declaration's assertion and
verification functions, and keep trace formatting body-agnostic.

## Option 1 — import the concrete declaration in each core

The cores could replace direct receipt imports with `receiptBoundary`.

Advantages:

- Smallest caller change.
- Removes the exact forbidden imports from both core files.
- Reuses canonical validation.

Disadvantages:

- A slice swap still requires editing core imports.
- A fake alternate contract cannot be passed through the public API.
- The core remains concretely receipt-bound despite a cleaner import graph.
- It satisfies the grep mechanically but not the behavioral acceptance.

Decision: rejected.

## Option 2 — optional contract with a receipt default

The ops and integration functions could accept an optional contract while defaulting
to `receiptBoundary`.

Advantages:

- Existing callers need no changes.
- Alternate-contract tests can explicitly override the default.
- Migration can be gradual.

Disadvantages:

- The pure core retains a hidden concrete boundary dependency.
- Tests that omit the contract continue to conceal the coupling.
- The next ticket must remove a compatibility path that has no long-term use.
- A missing declaration silently selects a potentially wrong boundary.

Decision: rejected.

## Option 3 — required declaration argument

Both public runners receive boundary identity explicitly. The ops runner receives the
full generic contract; the integration runner needs only the name-bearing portion.

Advantages:

- Dependencies are visible at every invocation.
- Alternate contracts are first-class and type-safe.
- There is no receipt fallback in either core.
- Down-server and timeout traces still use the declared name.
- The next ticket can use the same declaration for URL and environment resolution.

Disadvantages:

- Every current caller and test must pass `receiptBoundary`.
- Generic result types require small assertion updates.
- Formatting cannot assume receipt-only evidence fields.

Decision: chosen.

## Public ops API

Use this conceptual shape:

```ts
runBoundaryCheck<Body>(
  contract: BoundaryContract<Body>,
  config: BoundaryCheckConfig,
): Promise<BoundaryCheckResult<Body>>
```

The contract is separate from runtime config because it is the stable boundary
declaration, while URL, budget, key, and fetch are invocation configuration. This also
makes the dependency visually explicit at call sites.

`BoundaryCheckValue<Body>` will expose:

- `body: Body`, the asserted response body;
- `signatureVerified: boolean`, preserving current keyless semantics.

The old property name `receipt` is rejected because it would encode the exemplar in a
generic result. All repository callers are available for coordinated update.

## Ops execution behavior

1. Select the injected or platform fetch implementation.
2. Determine whether a non-empty key is present.
3. start `runOperation` with `contract.name`.
4. Fetch the configured URL with the existing signal and accept header.
5. Reject non-OK HTTP statuses with the existing message.
6. Parse JSON once.
7. Call `contract.assertShape` once and retain its typed return value.
8. If a key exists, await `contract.verify(key, body)`.
9. Reject a false verification result with the existing signature message.
10. Return the asserted body and verification flag.

Thrown assertion or verification errors continue through `runOperation` normalization.

## Trace formatting

The formatter becomes generic only in its accepted result type. It will not need the
contract separately because the settled trace already stores `contract.name`.

Passed output retains:

- boundary name;
- passed outcome;
- elapsed milliseconds;
- whether the signature was verified or merely present without a key.

It drops receipt-only `issuedAt` and `nonce` lines. A generic contract does not declare
how arbitrary bodies should be rendered, and inventing a formatting callback is beyond
the contract established by the dependency ticket.

Failure output remains unchanged and body-independent.

## Integration API

The integration coordinator only needs a stable name. Accepting the full generic
contract would introduce an unused type parameter and imply shape verification occurs
there. Instead use a structural input compatible with a full contract:

```ts
interface BoundaryIdentity { name: string }
runIntegrationChecks(boundary: BoundaryIdentity, options: ...)
```

Callers can pass `receiptBoundary` directly. Every result branch writes
`boundary.name`. `IntegrationCheckResult.boundary` becomes `string`.

This is deliberately structural: it keeps the integration module independent from the
contract module while still deriving results from the same declaration at the edge.

## Test design

Add a fake contract in `test/ops-check.test.mjs` whose body has fields unrelated to a
receipt. Its assertion validates its own declared name and numeric proof. Its verifier
compares a key-derived proof. One test performs three runs:

- well-formed valid body passes and returns the typed conceptual body;
- wrong shape fails through the contract assertion;
- bad proof fails when the contract verifier returns false.

Existing ops tests pass `receiptBoundary` and update returned value access from
`receipt` to `body`. Existing fault coverage passes the same declaration. Existing
integration tests pass `receiptBoundary`, preserving expected output.

## Caller compatibility

- `scripts/ops-check.ts` passes `receiptBoundary`; URL and key stay unchanged here.
- `scripts/release-shared.ts` passes `receiptBoundary`; release route stays unchanged.
- `scripts/integration-check.ts` passes `receiptBoundary`; command construction stays unchanged.
- The next ticket remains responsible for contract-derived paths and environment names.

## Copy decision

No visitor-facing copy changes. The operator formatter remains concise and stack-free.
Removing receipt field detail is an architectural consequence, not a visitor copy edit.

## Risks and mitigations

- Risk: missed callers fail type checking. Mitigation: repository-wide search and typecheck.
- Risk: tests pass while core still uses receipt helpers. Mitigation: exact forbidden-symbol grep.
- Risk: fake assertion is too receipt-like. Mitigation: use an unrelated body shape and name.
- Risk: next-ticket scope is consumed. Mitigation: do not alter path/key resolution in scripts.
- Risk: a keyless malformed signature passes shape. Mitigation: contract assertion remains responsible for structural signature shape, as designed.

## Chosen outcome

The core runners will have no implicit exemplar. The current executable edges explicitly
select `receiptBoundary`, while alternate unit evidence proves the ops runner honors a
different contract's name, shape, and verification behavior.
