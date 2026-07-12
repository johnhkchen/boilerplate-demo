# Design — T-010-02-02

## Decision summary

Use the selected `receiptBoundary` declaration as the sole script-level source of the
default route and key environment name. Keep full URL overrides unchanged, normalize a
trailing base slash before joining, parameterize `.dev.vars` parsing by the declared key
name, and pass the declaration into integration helper boundaries that resolve config or
construct child commands.

## Option 1 — replace literals with direct `receiptBoundary` property reads

Each script could reference `receiptBoundary.path` and `receiptBoundary.keyEnv` directly
at every current literal site.

Advantages:

- Small patch.
- Meets the route grep criterion.
- Runtime values originate in the declaration.
- No new shared module or public API.

Disadvantages:

- Integration `commandFor` would remain implicitly coupled to the concrete import.
- The acceptance wording calls out construction from `contract.path`, indicating the
  helper should receive a declaration rather than close over it.
- Local helpers would be harder to reason about or reuse with another declaration.

Decision: use direct access only where the surrounding function is already the concrete
receipt edge; thread a declaration through integration helpers.

## Option 2 — create a shared script configuration module

A new module could own base/path joining, environment lookup, and `.dev.vars` parsing for
all three executable edges.

Advantages:

- Removes duplicated `.dev.vars` parsing between ops and leak scripts.
- Centralizes URL normalization.
- Could be unit tested independently.

Disadvantages:

- Expands a focused declaration-wiring ticket into script infrastructure design.
- The two parsers intentionally have slightly different surrounding config shapes.
- Integration does not read `.dev.vars`; it creates an isolated key and Wrangler config.
- A new abstraction would carry more API surface than the current behavior needs.

Decision: rejected for this ticket.

## Option 3 — pass a narrow runtime declaration through every helper

Local helpers could accept `{ path, keyEnv }` rather than the full contract.

Advantages:

- Makes dependencies explicit.
- Avoids unused assertion, verifier, and landmark fields in helper types.
- Permits simple fake values in future unit tests.

Disadvantages:

- Introduces another declaration-shaped interface.
- Can drift from `BoundaryContract` unless defined as a `Pick`.
- Adds ceremony to simple concrete executable edges.

Decision: chosen for integration helper boundaries where explicit threading is material;
ops and leak remain concrete edges and read the imported declaration directly.

## URL policy

Preserve precedence:

1. A check-specific full URL override wins.
2. Otherwise read `DEMO_BASE_URL` or the script default.
3. Remove one trailing slash from the base.
4. Append `contract.path`.

This yields the same current receipt URLs while making the route declaration-owned. The
normalization preserves leak-check behavior and improves ops-check consistency for a base
override ending in `/`.

No general URL resolver is added. The declared path is an absolute path by contract
convention, and `new URL()` would introduce different path semantics for base URLs that
contain a prefix. Simple base-plus-declared-path matches the story's explicit model.

## Key environment policy

Treat `contract.keyEnv` strictly as the name of the secret-bearing variable.

- Process lookup uses `process.env[contract.keyEnv]`.
- `.dev.vars` parsing compares parsed names to a supplied `keyEnv` argument.
- Integration's temporary Wrangler `vars` uses `[contract.keyEnv]`.
- Integration child environments use `[contract.keyEnv]`.

The value flow remains unchanged: local edges prefer the process environment and fall
back to `.dev.vars`; integration prefers the process environment and otherwise generates
a random per-run value. No secret is embedded in the declaration.

## Ops edge design

- Keep `receiptBoundary` as the executable's selected declaration.
- Change `readDevVarsKey(path)` to `readDevVarsKey(path, keyEnv)`.
- Compare parsed names to `keyEnv`.
- Resolve the default URL with `receiptBoundary.path`.
- Resolve the environment key with `process.env[receiptBoundary.keyEnv]`.
- Pass the same name into `.dev.vars` lookup.
- Preserve timeout parsing, error classes, output, and exit codes.

## Leak edge design

- Import `receiptBoundary`.
- Parameterize `readDevVarsKey` with `keyEnv` as in ops-check.
- Resolve `responseUrl` from the normalized base and `receiptBoundary.path`.
- Resolve `secret` through `receiptBoundary.keyEnv` in both process and file sources.
- Preserve bundle directory, timeout, formatting, and exit behavior.

## Integration edge design

Define a local narrow type from the canonical interface:

```ts
type RuntimeBoundary = Pick<BoundaryContract<unknown>, 'path' | 'keyEnv'>;
```

The generic parameter is irrelevant because neither helper touches bodies, assertions, or
verification. A type-only import prevents runtime coupling beyond the concrete instance.

Thread `RuntimeBoundary` through:

- `resolveConfig(contract)` for environment key lookup;
- `createTemporaryConfig(config, contract)` for Wrangler variable declaration;
- `commandFor(check, config, contract)` for child environment and URLs.

`main` selects `receiptBoundary` once and supplies it at each boundary. The existing
`runIntegrationChecks(receiptBoundary, …)` call remains unchanged.

For operation and leak children, build full URLs as:

```ts
const boundaryUrl = `${config.baseUrl}${contract.path}`;
```

Integration's internally generated base URL never has a trailing slash. Compute the URL
once per `commandFor` invocation and assign it to `OPS_CHECK_URL` or `LEAK_CHECK_URL`.
The flow child continues to receive only the base URL.

## Release helper design

Replace both release URL suffix literals with `receiptBoundary.path`. The helper already
selects and passes that declaration, so no new import or signature is needed. This is a
mechanical consistency edit required by the exact `scripts/` grep.

## Testing design

No pure core behavior changes, so new response or cryptographic test cases are not needed.
Verification uses complementary layers:

- `rg -n '/api/receipt' scripts` must return no matches.
- `rg -n 'DEMO_SIGNING_KEY'` in the three target edges must return no executable
  literals; comments should also be made declaration-neutral where touched.
- Existing boundary declaration tests continue to lock the current concrete values.
- Existing unit suite catches type/runtime regressions in shared check behavior.
- Typecheck verifies computed property names and helper signatures.
- `npm run integration:check` proves build, isolated server vars, operation child, flow
  child, leak child, reporting, and cleanup end to end.
- The standalone ops and leak commands can be run against the integration-style receipt
  dev server when practical; integration itself already invokes both exact npm scripts.

## Rejected test-only export

Exporting `commandFor` directly from the executable would make isolated testing awkward
because importing the module executes `main`. Adding an import guard or moving the helper
to a new module is disproportionate to this configuration-only change. End-to-end
integration plus source grep directly verifies the acceptance boundary.

## Copy decision

No visitor-facing copy changes. Comments become declaration-neutral where their existing
text incorrectly names a concrete key, but operator output remains byte-for-byte stable.

## Risks and mitigations

- Risk: a missed script literal fails acceptance. Mitigation: exact recursive grep.
- Risk: computed env properties fail to reach Wrangler or child commands. Mitigation:
  run the full integration executable.
- Risk: full URL overrides lose precedence. Mitigation: preserve existing nullish-coalescing
  order and inspect diffs.
- Risk: generated key leaks. Mitigation: retain the existing redaction path and report tests.
- Risk: browser flow is accidentally rewired. Mitigation: leave its base-only environment
  unchanged; its contract-path migration belongs to `S-010-03`.
- Risk: unrelated working-tree changes enter the commit. Mitigation: exact Lisa includes and
  post-commit path cleanliness checks.

## Chosen outcome

The Node executable layer will select one concrete declaration and consistently use its
route and key variable name at every runtime boundary. Current receipt behavior remains
unchanged, while replacing the declaration becomes possible without editing these script
defaults again.
