# Design — T-010-01-01

## Decision summary

Add one generic, portable `BoundaryContract<Body>` interface and one
`receiptBoundary` instance in `src/lib/boundary-contract.ts`. The instance will
validate the complete receipt response shape, delegate cryptographic verification
to `verifyReceipt`, and declare the receipt route, key environment variable, page
landmark, flow selectors, evidence patterns, and primary action name. Add a focused
Node test that exercises the declaration as a public unit.

## Design goals

- Give every later harness consumer one declaration to read.
- Make the receipt an instance rather than the harness's abstract shape.
- Preserve all current receipt behavior and public literals.
- Keep the module pure and importable in Node and browser-oriented tooling.
- Type the asserted response for downstream consumers.
- Keep signature verification separate from structural validation.
- Make selectors and evidence expectations data rather than test code.
- Avoid introducing a schema dependency for a six-field fixed response.
- Avoid migrating any consumer in this ticket.

## Contract type options

### Option A — receipt-specific object without an interface

Export only a `receiptBoundary` object inferred by TypeScript.

Benefits:

- Smallest immediate source addition.
- Literal member types remain narrow automatically.
- The receipt test can call `assertShape` and `verify` directly.

Costs:

- Later alternate-contract tests have no explicit portable shape to implement.
- Generic Node check APIs would need to derive or recreate the interface.
- The parent story explicitly asks for a `BoundaryContract` shape.
- The abstraction would remain implicit and receipt-led.

Decision: reject. It satisfies the narrow ticket calls but misses the story's
portable contract boundary.

### Option B — non-generic interface returning `unknown`

Define `BoundaryContract` with `assertShape(body: unknown): unknown` and
`verify(key: string, body: unknown): Promise<boolean>`.

Benefits:

- Alternate instances can all share one simple type.
- No generic syntax reaches consumers.

Costs:

- Successful assertion does not give the operation checker a typed body.
- `verify` would need to narrow the same value again or cast it.
- The declaration would encode less safety than the current private
  `assertReceiptShape` function.
- Formatters that use declared bodies would lose useful field types.

Decision: reject. The contract should carry the body type it proves.

### Option C — generic interface returning the asserted body

Define `BoundaryContract<Body>` with
`assertShape(body: unknown): Body` and
`verify(key: string, body: Body): Promise<boolean>`.

Benefits:

- Structural validation is the single narrowing boundary.
- Verification receives the narrowed response without a second cast.
- Later tests can define a differently-shaped alternate body.
- The Node harness can be generic over the contract instance.
- TypeScript documents exactly what successful validation establishes.

Costs:

- Downstream generic APIs carry a type parameter.
- An implementation can still lie with a cast, so tests remain necessary.

Decision: choose. This matches the repository's TypeScript style and the later
generic-harness story.

## Contract member design

### Identity and server edge

- `name: string` identifies the boundary in traces and response validation.
- `path: string` declares the relative route `/api/receipt`.
- `keyEnv: string` names `DEMO_SIGNING_KEY` without reading process or runtime
  environment state.

The name is distinct from the path because trace identity and routing serve
different consumers. The environment member names the lookup seam; the contract
does not own secret access.

### Structural assertion

- `assertShape(body: unknown): Body` returns the narrowed body.
- It throws an `Error` when the value does not satisfy the declared shape.
- Throwing matches the existing operation runner, which converts exceptions into
  bounded failure traces.
- Returning the body matches the current private receipt guard's use.
- Error messages should distinguish a wrong boundary from general malformed
  response fields where useful.

An assertion-signature form such as
`asserts body is Body` was considered. It narrows a caller variable but returns
`void`, which is less convenient when validation occurs inline on `await
res.json()`. Returning `Body` is chosen.

### Verification

- `verify(key: string, body: Body): Promise<boolean>` returns a boolean.
- It delegates to the boundary's existing signing helper.
- Structural validation and authenticity remain two explicit checks.
- Verification does not catch malformed bodies; callers assert first.
- Verification does not read the key from the environment.

### Page landmark

Group browser-facing declaration data under `landmark`:

- `heading` — existing page heading used to prove the shell loaded;
- `statusSelector` — the live loading/failure narration element;
- `bodySelector` — the response container shown after success;
- `evidence` — selector/pattern pairs for concrete response proof;
- `primaryActionName` — accessible name used to activate the boundary again.

Grouping avoids crowding server and page concerns at the contract root while
keeping one boundary declaration. It also lets later flow support re-export one
landmark object.

### Evidence representation options

#### Parallel selector and pattern records

Example: `evidenceSelectors.nonce` plus `evidencePatterns.nonce`.

- Easy direct access by semantic key.
- Risks selector/pattern key drift.
- Requires two data structures for one assertion.

#### Tuple list

Example: `[['#receipt-nonce', /^[0-9a-f]{32}$/], ...]`.

- Compact and easy to loop.
- Positional meaning is less readable.
- Harder to extend with an evidence name for diagnostics.

#### Object list

Example: `{ name, selector, pattern }[]`.

- Keeps each selector beside its expected pattern.
- Provides a stable evidence name for legible test steps or messages.
- Supports any number of evidence points for an alternate boundary.
- Slightly more verbose.

Decision: choose an immutable object list. The harness can iterate without knowing
receipt field names, which is necessary for a differently-shaped alternate
boundary.

## Receipt shape validation options

### Reuse the current private guard

This is impossible without exporting or moving it from `src/lib/ops-check.ts`,
which is explicitly outside ticket scope. It also lacks required hex checks.

Decision: reject.

### Add a runtime schema dependency

A library could describe and parse the receipt fields declaratively.

Benefits:

- Standardized errors and reusable schema combinators.

Costs:

- Adds dependency and bundle surface for six checks.
- The repository does not currently use a runtime schema library here.
- The epic rejects framework-by-inertia and speculative abstraction.

Decision: reject.

### Implement a small explicit guard

Check object-ness, required string fields, fixed literals, and exact lowercase-hex
patterns.

Benefits:

- No dependency.
- Exact acceptance behavior is visible.
- Portable across supported runtimes.
- Easy to test with isolated mutations.

Costs:

- Some field checks are handwritten.
- Later receipt shape evolution requires updating the declaration.

Decision: choose. Updating one declaration when the boundary changes is the
intended contract behavior.

## Exact receipt validation policy

The validator will require:

- a non-null object;
- `boundary` equal to `BOUNDARY_NAME` (`receipt`);
- nonblank `issuedAt`;
- `nonce` matching exactly 32 lowercase hexadecimal characters;
- `algorithm` equal to `HMAC-SHA256`;
- `signature` matching exactly 64 lowercase hexadecimal characters;
- `keySource` equal to `server-env`.

The validator will permit additional fields. This preserves separation of
concerns: the explicit leak fault adds a diagnostic secret field to an otherwise
valid response, and the leak checker—not structural validation—owns detection of
secret material. The ticket does not request an exact-key whitelist.

Whitespace-only `issuedAt` is treated as blank. The fixed and hex fields reject
whitespace through exact comparisons/patterns. Date parsing is not added because
the contract only requires a present receipt field here, while authenticity binds
the actual value. No ticket criterion defines date syntax validation.

## Error behavior

- All malformed ordinary fields throw a stable general shape error.
- A wrong boundary throws an error naming actual and expected boundary values,
  matching the current operation check's useful diagnostic.
- Error strings are operator evidence and not user-facing page copy.
- Tests should assert that errors occur rather than overspecifying every message.

## Literal mapping

| Contract member | Declared receipt value | Existing source |
| --- | --- | --- |
| `name` | `receipt` | `BOUNDARY_NAME` |
| `path` | `/api/receipt` | route/page/check literals |
| `keyEnv` | `DEMO_SIGNING_KEY` | route and scripts |
| `landmark.heading` | `Demo Runway` | index `DEMO_NAME` / flow heading |
| `landmark.statusSelector` | `#receipt-status` | index / flow |
| `landmark.bodySelector` | `#receipt-body` | index / flow |
| nonce evidence selector | `#receipt-nonce` | index / flow |
| nonce evidence pattern | 32 lowercase hex | receipt generation / flow |
| signature evidence selector | `#receipt-signature` | index / flow |
| signature evidence pattern | 64 lowercase hex | HMAC / flow |
| `landmark.primaryActionName` | `Ask for a fresh note` | page slot / flow contract |

## Copy-standard review

No rendered copy changes. The two stored visitor strings remain exact current
values. `Demo Runway` stays within the display-name envelope and remains the `h1`
wayfinding name. `Ask for a fresh note` stays within the button envelope, begins
with the specific verb `Ask`, and matches the button behavior. There is no new
adjacent explanation or dynamic state.

## Test design

Create `test/boundary-contract.test.mjs` using `node:test` and
`node:assert/strict`.

Coverage groups:

- declared literals equal current receipt route/page values;
- `assertShape` returns a real `makeReceipt` result;
- wrong boundary throws;
- every required field missing or blank throws;
- non-hex and wrong-length nonce cases throw;
- non-hex and wrong-length signature cases throw;
- valid signature verifies;
- `corruptSignature` stays shape-valid but verification returns false.

Add the focused file to the explicit `npm test` list so future aggregate runs do
not omit the new contract lock. Also run the exact focused Node command and a
source grep for Node built-in imports.

## Rejected expansion

- Do not delete or export the private guard in `ops-check.ts` yet.
- Do not point scripts at `receiptBoundary` yet.
- Do not re-export flow values yet.
- Do not alter the index page to import the declaration.
- Do not introduce runtime environment lookup helpers.
- Do not define a provider or multi-boundary registry.
- Do not add a fake second shipped instance.
- Do not alter receipt cryptography or response fields.

## Risks and mitigations

- Risk: current page literals can still drift before the flow migration.
  Mitigation: focused tests lock the declaration values now; `S-010-03` removes
  the duplicate consumers.
- Risk: a structurally valid but corrupted receipt passes `assertShape`.
  Mitigation: intentional two-stage contract; `verify` catches authenticity.
- Risk: hidden consumer expectations prefer direct evidence properties.
  Mitigation: use explicit, readable `landmark` and `evidence` names grounded in
  story language, with a generic iterable shape.
- Risk: new test is forgotten by aggregate verification.
  Mitigation: register it in `package.json`'s enumerated `test` command.

## Chosen outcome

The declaration will be a small typed data-and-behavior object. It will depend
only on the existing pure receipt helper, own no I/O, and expose enough server and
page facts for all downstream stories without changing any consumer in this
ticket.
