# Structure — T-010-01-01

## Change inventory

### Create

- `src/lib/boundary-contract.ts`
  - Defines the portable generic contract types.
  - Defines receipt structural validation.
  - Exports the `receiptBoundary` instance.

- `test/boundary-contract.test.mjs`
  - Locks the receipt declaration's current literals.
  - Exercises structural acceptance and rejection.
  - Exercises authentic and corrupted signature verification.

### Modify

- `package.json`
  - Adds the new test file to the explicitly enumerated `npm test` command.

### Delete

- None.

### Explicitly unchanged

- `src/lib/receipt.ts`.
- `src/lib/fault.ts`.
- `src/lib/ops-check.ts`.
- `src/lib/integration-check.ts`.
- `src/pages/api/receipt.ts`.
- `src/pages/index.astro`.
- `scripts/ops-check.ts`.
- `scripts/leak-check.ts`.
- `scripts/integration-check.ts`.
- `tests/demo-flow.spec.ts`.
- `tests/support/flow-contract.ts`.
- Ticket frontmatter.

## Module boundary

`src/lib/boundary-contract.ts` is a pure declaration module.

It may:

- import pure values and types from `src/lib/receipt.ts`;
- inspect an unknown in-memory response value;
- call the pure async `verifyReceipt` helper;
- expose strings and regular expressions as static data;
- throw validation errors.

It may not:

- import `node:*` modules;
- access `process`, argv, stdout, files, or environment values;
- call `fetch`;
- import Astro or route modules;
- manipulate the DOM;
- own timeout or retry logic;
- read a signing key by name;
- create an additional real boundary.

## Public types

### `BoundaryEvidence`

Purpose: describe one page-visible fact produced by a healthy boundary.

Members:

```ts
export interface BoundaryEvidence {
  name: string;
  selector: string;
  pattern: RegExp;
}
```

Semantics:

- `name` is a stable diagnostic label, such as `nonce`.
- `selector` is consumed by the browser flow.
- `pattern` checks the rendered evidence text.
- A selector and pattern remain inseparable in one record.

### `BoundaryLandmark`

Purpose: describe the browser-visible surface that demonstrates the boundary.

Members:

```ts
export interface BoundaryLandmark {
  heading: string;
  statusSelector: string;
  bodySelector: string;
  evidence: readonly BoundaryEvidence[];
  primaryActionName: string;
}
```

Semantics:

- `heading` proves the intended page loaded.
- `statusSelector` exposes waiting or failure narration.
- `bodySelector` exposes the successful response container.
- `evidence` contains boundary-specific visible proof.
- `primaryActionName` identifies the action that makes another request.
- `readonly` prevents callers from accidentally changing instance evidence.

### `BoundaryContract<Body>`

Purpose: join one server boundary with the page surface that demonstrates it.

Members:

```ts
export interface BoundaryContract<Body> {
  name: string;
  path: string;
  keyEnv: string;
  assertShape(body: unknown): Body;
  verify(key: string, body: Body): Promise<boolean>;
  landmark: BoundaryLandmark;
}
```

Semantics:

- `name` labels operation results and validates response identity.
- `path` is relative to the configured demo base URL.
- `keyEnv` names the out-of-band verification key source.
- `assertShape` is the only unknown-to-`Body` narrowing boundary.
- `verify` checks authenticity after structural narrowing.
- `landmark` supplies the browser flow's stable page contract.

## Internal organization of `boundary-contract.ts`

The module is ordered from reusable public shape to receipt implementation:

1. Import `BOUNDARY_NAME`, `verifyReceipt`, and the `Receipt` type.
2. Export `BoundaryEvidence`.
3. Export `BoundaryLandmark`.
4. Export `BoundaryContract<Body>`.
5. Define the shared malformed-shape error text.
6. Define exact lowercase-hex regexes for nonce and signature.
7. Define small internal record/string validation helpers if they improve
   readability.
8. Define `assertReceiptShape(body: unknown): Receipt` as a private function.
9. Export `receiptBoundary: BoundaryContract<Receipt>`.

The private validator belongs next to the receipt instance because validation is
behavior declared by that instance. It is not exported as another receipt-specific
consumer seam.

## Receipt validator flow

```text
unknown body
  -> require non-null object
  -> inspect as Record<string, unknown>
  -> require boundary string
  -> compare boundary with BOUNDARY_NAME
  -> require nonblank issuedAt
  -> require nonce against 32-lowercase-hex regex
  -> require algorithm === HMAC-SHA256
  -> require signature against 64-lowercase-hex regex
  -> require keySource === server-env
  -> return original body as Receipt
```

The original object is returned rather than reconstructed. Downstream behavior
matches the current operation check: validation narrows the response while
preserving it for formatting or leak inspection.

## Receipt instance layout

```ts
export const receiptBoundary: BoundaryContract<Receipt> = {
  name: BOUNDARY_NAME,
  path: '/api/receipt',
  keyEnv: 'DEMO_SIGNING_KEY',
  assertShape: assertReceiptShape,
  verify: verifyReceipt,
  landmark: {
    heading: 'Demo Runway',
    statusSelector: '#receipt-status',
    bodySelector: '#receipt-body',
    evidence: [
      {
        name: 'nonce',
        selector: '#receipt-nonce',
        pattern: /^[0-9a-f]{32}$/,
      },
      {
        name: 'signature',
        selector: '#receipt-signature',
        pattern: /^[0-9a-f]{64}$/,
      },
    ],
    primaryActionName: 'Ask for a fresh note',
  },
};
```

The exact spelling is part of the declaration contract. Later tickets replace
consumer literals with these members.

## Test file structure

`test/boundary-contract.test.mjs` follows repository conventions:

1. Import `assert` from `node:assert/strict`.
2. Import `test` from `node:test`.
3. Import `receiptBoundary` from the new TypeScript module.
4. Import `makeReceipt` from the receipt helper.
5. Import `corruptSignature` from the fault helper.
6. Define one local test key.
7. Define a helper that copies a receipt with one field changed or removed only
   if it reduces repetitive test code.
8. Add literal declaration test.
9. Add real signed shape acceptance test.
10. Add wrong-boundary rejection test.
11. Add table-driven missing/blank required-field rejection test.
12. Add table-driven malformed nonce/signature rejection test.
13. Add valid/corrupt verification test.

## Required-field test matrix

The complete validator should be locked, not only one arbitrary field:

| Field | Missing | Blank | Wrong fixed value |
| --- | --- | --- | --- |
| `boundary` | yes | yes | wrong boundary test |
| `issuedAt` | yes | yes | not required |
| `nonce` | yes | yes | malformed-hex tests |
| `algorithm` | yes | not applicable as allowed value | wrong literal |
| `signature` | yes | yes | malformed-hex tests |
| `keySource` | yes | not applicable as allowed value | wrong literal |

The ticket's direct acceptance can pass with fewer cases, but full field coverage
prevents the declared response contract from silently weakening.

## Hex test matrix

For `nonce`:

- non-hex character with otherwise correct length;
- uppercase hex character;
- 31-character lowercase hex;
- 33-character lowercase hex.

For `signature`:

- non-hex character with otherwise correct length;
- uppercase hex character;
- 63-character lowercase hex;
- 65-character lowercase hex.

Exact anchors ensure the patterns reject partial matches.

## Verification test boundary

- Generate a valid receipt with `makeReceipt(TEST_KEY)`.
- Pass it through `receiptBoundary.assertShape` before verification.
- Expect `receiptBoundary.verify(TEST_KEY, validated)` to return `true`.
- Corrupt only the signature with `corruptSignature(validated)`.
- Expect the corrupt body still to pass `assertShape`.
- Expect verification against the same key to return `false`.
- This proves shape and authenticity are deliberately independent.

## Package script modification

Insert `test/boundary-contract.test.mjs` into the existing `test` script's explicit
file sequence. Place it near other core library tests, before operation-runner or
ops-check coverage. Do not reformat unrelated script entries or dependencies.

## Source commit units

### Unit 1 — contract and focused tests

Ticket-owned source paths:

- `src/lib/boundary-contract.ts`;
- `test/boundary-contract.test.mjs`;
- `package.json`.

These three paths form one meaningful unit because the public declaration, its
executable lock, and aggregate test registration must land together. Commit them
through `lisa commit-ticket` with exactly those includes.

Phase artifacts remain attempt-private and are not included in the source commit.

## Verification boundary

Focused verification:

- `node --experimental-strip-types --test test/boundary-contract.test.mjs`.
- grep imports in `src/lib/boundary-contract.ts` for `node:` and require no match.

Regression verification:

- `npm test`.
- `npm run typecheck`.

Diff verification:

- source diff contains only the three ticket-owned source paths;
- no ticket-owned source file remains modified, staged, or untracked after the
  Lisa commit;
- unrelated pre-existing working-tree changes remain untouched.

## Copy surfaces

The source declaration duplicates, but does not render or alter:

- `Demo Runway` — display name, 2 words / 11 characters;
- `Ask for a fresh note` — button label, 5 words / 20 characters.

No other user-facing copy is introduced. Validation error strings are
operator-only evidence.

## Downstream extension points

- `S-010-02` can parameterize the pure Node checks with
  `BoundaryContract<Body>`.
- Runnable scripts can build the URL from `path` and look up a key through
  `keyEnv`.
- `S-010-03` can read `landmark` without receipt selectors in the flow spec.
- `S-010-04` can implement the same generic interface for a throwaway alternate
  fixture.
- None of those downstream edits are included here.
