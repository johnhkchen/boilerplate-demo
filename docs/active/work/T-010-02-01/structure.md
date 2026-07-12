# Structure — T-010-02-01

## Modified files

### `src/lib/ops-check.ts`

- Import `BoundaryContract` as a type.
- Remove receipt constant, verifier, and receipt type imports.
- Keep `BoundaryCheckConfig` runtime-only and non-generic.
- Make `BoundaryCheckValue<Body>` generic.
- Rename its payload field from `receipt` to `body`.
- Make `BoundaryCheckResult<Body>` generic.
- Delete the private receipt assertion.
- Add the contract as the first `runBoundaryCheck` argument.
- Use `contract.name` as `runOperation.name`.
- Use `contract.assertShape` after JSON parsing.
- Use `contract.verify` when a key is present.
- Return the asserted body.
- Make `formatBoundaryTrace<Body>` accept a generic result.
- Remove formatter reads of receipt-only fields.
- Preserve success/failure outcome wording and stack-free behavior.

### `src/lib/integration-check.ts`

- Remove the receipt constant import.
- Add a small exported or internal `BoundaryIdentity` shape with `name: string`.
- Change `IntegrationCheckResult.boundary` to `string`.
- Add boundary identity as the first `runIntegrationChecks` argument.
- Replace every result assignment with `boundary.name`.
- Leave command ordering, deadline behavior, failure normalization, formatting,
  redaction, and report schema otherwise unchanged.

### `test/ops-check.test.mjs`

- Import `receiptBoundary` for existing exemplar cases.
- Pass it to every existing `runBoundaryCheck` invocation.
- Read `result.value.body` instead of `result.value.receipt`.
- Add a fake alternate contract fixture.
- Add pass, wrong-shape, and bad-signature assertions.
- Assert the alternate name appears in the trace.
- Keep all existing receipt behaviors covered.

### `test/fault.test.mjs`

- Import `receiptBoundary`.
- Pass it into the existing corrupted-boundary check.
- Do not change fault construction or expectations.

### `test/integration-check.test.mjs`

- Import `receiptBoundary`.
- Pass it to every `runIntegrationChecks` invocation.
- Preserve all current expected receipt summary text.
- Update the invalid-budget invocation shape.

### `scripts/ops-check.ts`

- Import `receiptBoundary`.
- Pass it as the first argument to `runBoundaryCheck`.
- Do not change URL or key environment resolution in this ticket.

### `scripts/release-shared.ts`

- Import `receiptBoundary`.
- Pass it as the first argument to the release smoke check.
- Do not change its existing receipt route construction.

### `scripts/integration-check.ts`

- Import `receiptBoundary`.
- Pass it as the first argument to `runIntegrationChecks`.
- Do not change child command URLs or environments in this ticket.

## Created files

- No source or test file is created.
- RDSPI artifacts are created only in the attempt work directory.

## Deleted files

- None.

## Public type boundaries

```ts
export interface BoundaryCheckConfig {
  url: string;
  timeBudgetMs: number;
  key?: string;
  fetchImpl?: typeof fetch;
}

export interface BoundaryCheckValue<Body> {
  body: Body;
  signatureVerified: boolean;
}

export type BoundaryCheckResult<Body> =
  OperationResult<BoundaryCheckValue<Body>>;
```

```ts
export async function runBoundaryCheck<Body>(
  contract: BoundaryContract<Body>,
  config: BoundaryCheckConfig,
): Promise<BoundaryCheckResult<Body>>
```

```ts
export interface BoundaryIdentity {
  name: string;
}

export async function runIntegrationChecks(
  boundary: BoundaryIdentity,
  options: RunIntegrationChecksOptions,
): Promise<IntegrationRunResult>
```

## Runtime flow

```text
executable edge
  -> selects receiptBoundary
  -> supplies runtime config
  -> generic core
       -> names operation/result from declaration
       -> performs fetch or child commands
       -> delegates shape and verification to declaration where applicable
       -> returns normalized evidence
  -> formatter/report reads normalized evidence
```

## Error boundary

- Invalid budgets still reject before meaningful work.
- Fetch rejection remains an operation failure.
- Overall deadlines remain timeout failures.
- HTTP errors remain operation failures with status evidence.
- Contract assertion throws remain operation failures.
- Contract verification false remains an operation failure.
- Runner rejections in integration remain execution evidence.
- No raw stack is added to results or formatting.

## Generic payload boundary

- Untrusted JSON stays `unknown` until `contract.assertShape` returns.
- Only the returned typed body reaches `contract.verify`.
- Only the returned typed body enters successful result values.
- The generic formatter does not inspect body fields.
- Concrete body rendering remains outside the current contract.

## Naming boundary

- Ops traces use `contract.name` before network invocation.
- Integration results use the supplied declaration's `name` in all branches.
- Formatters consume the name stored in settled evidence.
- No core imports receipt identity.

## Scope boundary with T-010-02-02

- This ticket makes declaration selection explicit.
- It does not derive URLs from `contract.path`.
- It does not derive environment lookups from `contract.keyEnv`.
- It does not remove `/api/receipt` from scripts.
- Those changes remain fully available to the dependent ticket.

## Commit boundary

The meaningful source unit is the generic core migration plus all required caller and
test adaptations. It must be committed through one `lisa commit-ticket` invocation with
only the eight exact source/test paths above. Attempt artifacts are not included.

## Verification boundary

- Focused ops test demonstrates alternate contract behavior.
- Focused integration test protects result identity and orchestration.
- Existing fault test protects concrete corrupted-signature behavior.
- Full test suite protects cross-module compatibility.
- Typecheck protects TypeScript executable callers and generic exports.
- Exact grep proves forbidden symbols are absent from both core files.
- Diff inspection proves next-ticket and unrelated paths were not absorbed.
