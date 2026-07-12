# Structure — T-010-02-02

## Change boundary

This ticket modifies four existing executable script modules and no core, server, browser,
package, or documentation source files.

## File map

| File | Action | Responsibility after change |
| --- | --- | --- |
| `scripts/ops-check.ts` | modify | Resolve operation URL and signing key through `receiptBoundary` |
| `scripts/leak-check.ts` | modify | Resolve response URL and secret through `receiptBoundary` |
| `scripts/integration-check.ts` | modify | Thread declared path/key name through isolated config and child commands |
| `scripts/release-shared.ts` | modify | Build release smoke URLs from the already imported declaration |

No files are created or deleted in the source tree.

## Unchanged modules

- `src/lib/boundary-contract.ts`: canonical interface and receipt instance stay unchanged.
- `src/lib/ops-check.ts`: already generic from the dependency ticket.
- `src/lib/leak-check.ts`: already accepts complete runtime configuration.
- `src/lib/integration-check.ts`: already derives result identity from a declaration.
- `src/pages/api/receipt.ts`: route implementation remains at its current filesystem path.
- `tests/` flow support: browser path migration belongs to `S-010-03`.
- `package.json`: command entry points remain unchanged.

## `scripts/ops-check.ts`

### Import boundary

The existing runtime import of `receiptBoundary` remains the selected concrete contract.
No new module dependency is required.

### `.dev.vars` helper

Change the private signature from:

```ts
readDevVarsKey(path: string): string | undefined
```

to:

```ts
readDevVarsKey(path: string, keyEnv: string): string | undefined
```

The helper remains tolerant of missing files, malformed lines, comments, blank values, and
read errors. Only the name comparison becomes data-driven.

### Runtime resolution

`resolveConfig` keeps its private no-argument interface. It selects `receiptBoundary` from
module scope and returns the same `{ url, timeBudgetMs, key }` shape.

URL flow:

```text
OPS_CHECK_URL
  or DEMO_BASE_URL/default base
       -> strip one trailing slash
       -> append receiptBoundary.path
```

Key flow:

```text
process.env[receiptBoundary.keyEnv]
  or readDevVarsKey('.dev.vars', receiptBoundary.keyEnv)
```

### Stable behavior

- Same default host and timeout.
- Same explicit override names.
- Same check core call and contract argument.
- Same exit status and formatted output.

## `scripts/leak-check.ts`

### Import boundary

Add a runtime import of `receiptBoundary` from `src/lib/boundary-contract.ts` beside the
existing leak-core import.

### `.dev.vars` helper

Mirror the ops helper signature change to accept `keyEnv`. Keep all existing tolerant
parsing behavior.

### Runtime resolution

The returned config shape remains:

- `bundleDir`;
- `responseUrl`;
- `secret`;
- `timeBudgetMs`.

Only `responseUrl` and `secret` source their defaults from the declaration. Check-specific
overrides and empty-secret rejection remain owned by the existing edge/core path.

## `scripts/integration-check.ts`

### Type boundary

Add a type-only import of `BoundaryContract` and define:

```ts
type RuntimeBoundary = Pick<BoundaryContract<unknown>, 'path' | 'keyEnv'>;
```

This local type documents precisely what executable configuration needs. It does not create
a new public interface or runtime object.

### `resolveConfig`

Change the private signature to:

```ts
resolveConfig(contract: RuntimeBoundary): IntegrationConfig
```

The returned `IntegrationConfig` remains unchanged. The signing key source changes from a
literal environment property to `process.env[contract.keyEnv]`.

### `createTemporaryConfig`

Change the private signature to:

```ts
createTemporaryConfig(
  config: IntegrationConfig,
  contract: RuntimeBoundary,
): Promise<{ directory: string; path: string }>
```

Construct the `vars` record with `[contract.keyEnv]: config.signingKey`. Fault variable
insertion remains conditional and unchanged.

### `commandFor`

Change the private signature to:

```ts
commandFor(
  check: IntegrationCheckName,
  config: IntegrationConfig,
  contract: RuntimeBoundary,
): { args: string[]; env: NodeJS.ProcessEnv }
```

Internal organization:

1. Build `boundaryUrl` from `config.baseUrl` and `contract.path`.
2. Build shared environment from `process.env`, computed key name, and base URL.
3. Operation branch assigns `OPS_CHECK_URL: boundaryUrl`.
4. Flow branch retains `PLAYWRIGHT_BASE_URL: config.baseUrl`.
5. Leak branch assigns `LEAK_CHECK_URL: boundaryUrl`.

### `main`

`main` remains the lifecycle owner and concrete selection point. It supplies
`receiptBoundary` to:

- `resolveConfig`;
- `createTemporaryConfig`;
- `commandFor`;
- existing `runIntegrationChecks`.

No lifecycle, timeout, subprocess, output, redaction, report, or cleanup ordering changes.

## `scripts/release-shared.ts`

The module already imports `receiptBoundary`. Replace only the suffix in:

- local boundary check URL;
- deployed version hostname polling URL.

Both expressions retain their existing base values and `runBoundaryCheck` behavior.

## Public interfaces

No exported source interface changes. All modified helpers are module-private. Package npm
script names and environment override names remain stable.

## Secret boundary

- The declaration contributes only the name of an environment variable.
- The secret remains in process memory and temporary Wrangler config as before.
- Temporary config mode remains `0o600`.
- Captured subprocess/server output remains redacted by the actual key value.
- Report creation retains its existing redaction pass.
- No declaration value is sent to the browser solely because of this ticket.

## Implementation ordering

1. Modify ops and leak edges as one local declaration-resolution unit.
2. Modify integration helpers and their call sites as the lifecycle unit.
3. Modify release URLs to close the recursive grep boundary.
4. Run focused static and type validation.
5. Run unit and executable integration validation.
6. Commit all four interdependent script paths as one meaningful source unit.

The four files form one atomic behavior change: committing fewer would either leave an edge
literal behind or fail the exact acceptance grep.

## Verification boundary

- Recursive route grep under `scripts/`: no matches.
- Key literal grep in target executable edges: no hardcoded receipt key lookup.
- `git diff --check`: no whitespace or patch errors.
- Focused check unit suites: existing core behavior stays green.
- Full `npm test`: repository regression coverage stays green.
- `npm run typecheck`: helper signatures and computed env properties compile.
- `npm run integration:check`: current receipt build/server/check lifecycle passes.
- Post-commit exact file status: all four source paths clean.

## Artifact boundary

Research, Design, Structure, Plan, Progress, and Review remain under the attempt-private
directory. They are not included in the Lisa source commit. Lisa publishes admitted copies
after lease verification.
