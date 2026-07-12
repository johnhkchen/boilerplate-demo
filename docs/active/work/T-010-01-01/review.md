# Review — T-010-01-01

## Outcome

The ticket is complete. The repository now has a portable generic boundary
contract and a receipt instance that declares the server operation and the page
surface in one place. Focused acceptance coverage, the complete unit suite, and
the full typecheck are green. The exact ticket-owned source unit is committed.

## Commit

- Commit: `55f1f185761a7863ab5228834fd6a373d0d64fbf`.
- Message: `feat: define receipt boundary contract`.
- Commit mechanism: `lisa commit-ticket`.
- Exact included paths:
  - `src/lib/boundary-contract.ts`;
  - `test/boundary-contract.test.mjs`;
  - `package.json`.
- Commit stat: 3 files changed, 226 insertions, 1 deletion.
- Ticket-owned source paths are clean after the commit.
- No ordinary-index `git add` or ordinary `git commit` was used.

## Files created

### `src/lib/boundary-contract.ts`

Adds the portable public declaration shape:

- `BoundaryContract<Body>`;
- `BoundaryLandmark`;
- `BoundaryEvidence`.

Adds `receiptBoundary: BoundaryContract<Receipt>` as the first instance.

The instance declares:

- boundary name: `receipt`;
- route path: `/api/receipt`;
- verification key environment name: `DEMO_SIGNING_KEY`;
- page heading: `Demo Runway`;
- status selector: `#receipt-status`;
- body selector: `#receipt-body`;
- nonce evidence selector and 32-lowercase-hex pattern;
- signature evidence selector and 64-lowercase-hex pattern;
- primary action accessible name: `Ask for a fresh note`.

The instance delegates authenticity checking to the existing pure
`verifyReceipt` helper.

### `test/boundary-contract.test.mjs`

Adds seven focused Node tests for:

- exact receipt server and page declaration values;
- acceptance of a genuinely signed receipt;
- rejection of a non-object body;
- rejection of a wrong boundary name;
- rejection of every missing required receipt field;
- rejection of blank and incorrect fixed fields;
- rejection of non-hex, uppercase, short, and long nonce/signature values;
- successful verification of a real signature;
- failed verification of a shape-valid corrupted signature.

The verification test intentionally confirms the corrupted signature still
passes structural shape validation. This locks the design boundary: structural
validity and cryptographic authenticity are independent contract operations.

## File modified

### `package.json`

Adds `test/boundary-contract.test.mjs` to the explicitly enumerated `npm test`
command. No other script, dependency, version, or package metadata changed.

## Files deleted

- None.

## Runtime shape review

`receiptBoundary.assertShape` requires a non-null object with:

- `boundary === 'receipt'`;
- a nonblank string `issuedAt`;
- a nonce of exactly 32 lowercase hexadecimal characters;
- `algorithm === 'HMAC-SHA256'`;
- a signature of exactly 64 lowercase hexadecimal characters;
- `keySource === 'server-env'`.

On success it returns the original value narrowed to `Receipt`.

Additional properties are permitted. That is intentional. The current explicit
leak fault adds a diagnostic key field to an otherwise valid receipt, and secret
inspection belongs to the leak checker rather than basic response shape parsing.

The wrong-boundary error names both actual and expected boundaries. Other invalid
fields use the existing operation check's stable general shape-error language.
These messages are operator/test evidence, not visitor-facing copy.

## Portability review

- The new module imports only `./receipt.ts`.
- It has no `node:*` imports.
- It reads no environment variables.
- It accesses no argv, stdout, files, fetch, Astro runtime, or DOM.
- It relies on the receipt helper's platform Web Crypto implementation only when
  `verify` is called.
- Static strings and regular expressions are safe for both Node scripts and
  Playwright support imports.
- The source grep required by the ticket returned no matches.

## Public interface review

The generic response type is carried through both contract behaviors:

- `assertShape(body: unknown): Body`;
- `verify(key: string, body: Body): Promise<boolean>`.

This lets a downstream check validate unknown JSON once, then pass the narrowed
value to boundary-specific verification without receipt casts. A later
differently-shaped fixture can implement the same interface with its own body
type.

Browser proof is grouped under `landmark`, separating it from route and key data
without creating a second declaration. Evidence is an iterable list of
name/selector/pattern records, so a generic flow need not know receipt field
names.

## Acceptance-criterion mapping

### Signed receipt accepted

Pass. The focused test creates a receipt with `makeReceipt(KEY)` and confirms
`receiptBoundary.assertShape` returns that object.

### Wrong boundary rejected

Pass. The focused test changes only `boundary` to `parcel` and asserts a throw
that expects `receipt`.

### Missing field rejected

Pass. A table removes each of the six required response fields in turn and every
candidate throws.

### Blank field rejected

Pass. Blank boundary, issued-at, nonce, algorithm, signature, and key-source
cases throw. Whitespace-only `issuedAt` is also rejected.

### Non-hex rejected

Pass. Both nonce and signature reject non-hex characters, uppercase hex, values
one character too short, and values one character too long.

### Valid signature accepted

Pass. `receiptBoundary.verify` returns `true` for the genuinely signed receipt and
its original key.

### Corrupted signature rejected

Pass. `corruptSignature` preserves lowercase-hex shape and length, but
`receiptBoundary.verify` returns `false` against the original key.

### No Node built-in import

Pass. The import grep over `src/lib/boundary-contract.ts` produced no `node:`
matches.

## Verification evidence

### Focused ticket test

Command:

```sh
node --experimental-strip-types --test test/boundary-contract.test.mjs
```

Result:

- 7 tests;
- 7 passed;
- 0 failed;
- 0 skipped or cancelled.

### Aggregate unit suite

Command:

```sh
npm test
```

Result:

- 179 tests;
- 179 passed;
- 0 failed;
- 0 skipped or cancelled.

The aggregate output includes all seven new boundary-contract tests, confirming
the package script registration works.

### Typecheck

Command:

```sh
npm run typecheck
```

Result:

- Astro check passed across 63 files;
- 0 errors;
- 0 warnings;
- 0 hints;
- TypeScript `--noEmit` passed;
- Wrangler reported generated Worker types up to date.

Astro printed an existing deprecation notice for the `session.driver` string
signature. It did not fail the check and is unrelated to this ticket.

### Diff quality

- `git diff --check` passed before commit.
- Commit inspection shows only the three exact ticket-owned source paths.
- Post-commit status for those paths is clean.

## Test coverage assessment

Coverage is strong for this declaration-only unit:

- every declared consumer literal is locked;
- every response field has a missing-field case;
- open string fields have blank cases;
- fixed literal fields have wrong-value cases;
- both hexadecimal fields have syntax and exact-length cases;
- real Web Crypto generation and verification are exercised;
- shape-valid corruption proves authenticity failure;
- portability is checked statically;
- aggregate registration and TypeScript compatibility are verified.

No server integration test was added because this ticket does not rewire or
change the route. The fixture uses the same `makeReceipt` implementation as the
real route, which is the correct pure-unit boundary here.

## Copy review

No user-facing surface changed. The declaration stores two exact existing public
literals for future flow consumption:

- `Demo Runway`: 2 words, 11 characters; valid display name and `h1` wayfinding.
- `Ask for a fresh note`: 5 words, 20 characters; valid action label beginning
  with the specific verb `Ask`.

The copy standard therefore required literal inventory and conformance review,
not page editing, projector review, or phone review.

## Scope review

The implementation stayed within `S-010-01`:

- no check script changed;
- no operation/integration/leak pure core changed;
- no Playwright spec or support contract changed;
- no API route changed;
- no index page changed;
- no receipt cryptography changed;
- no second shipped boundary was introduced;
- no provider abstraction or registry was introduced;
- no environment seam was replaced.

## Known limitations and downstream work

The declaration currently has no production consumer. That is the parent story's
explicit honest boundary, not a missing part of this ticket.

Deferred dependent work:

- `T-010-02-01` makes the Node operation/integration cores generic over
  `BoundaryContract`.
- `T-010-02-02` points runnable URLs and key lookup at `path` and `keyEnv`.
- `T-010-03-01` points healthy/stalled Playwright flow assertions at `landmark`.
- `T-010-04-01` proves a differently-shaped throwaway boundary works by
  declaration only.
- `T-010-04-02` proves a missing declared route fails loudly and runs final
  end-to-end verification.

Until those tickets land, the current consumers intentionally retain duplicate
receipt literals. This ticket does not claim the harness is swap-proof yet.

## Open concerns

- There are no critical implementation concerns.
- `issuedAt` is required to be nonblank but is not parsed as an ISO date. The
  ticket and current guard require presence, while signature verification binds
  its exact value. Date-syntax enforcement can be added only if the boundary
  contract later declares that requirement.
- Extra response fields are permitted by shape validation, as discussed above;
  leak detection remains a separate check.
- Page literals can still drift from this declaration until `T-010-03-01` makes
  the flow read the declaration.

## Repository-state note

Unrelated pre-existing modifications remain in Lisa configuration/hooks and the
active ticket. Lisa also materialized detected phase artifacts under
`docs/active/work/T-010-01-01/` and left its empty `.lisa-commit.lock`. None of
those paths were included in the source commit, edited as ticket source, or
cleaned up by this attempt.

## Final assessment

Ready for Lisa admission. The portable contract shape is small, typed, pure,
fixture-proven, and sufficient for the dependent harness and flow migrations.
All direct acceptance criteria pass, proportional regression coverage is green,
and there are no critical issues requiring human intervention before the next
dependent ticket proceeds.
