# Structure — T-004-03-02 one-session-lifecycle-and-routing

## Change boundary

This ticket changes only the separately deployed Sessions Worker and its operator/test/docs
surface. The stable Astro App Worker remains independent.

```text
owner CLI
  -> Sessions Worker module handler
       -> SessionCoordinator Durable Object (desired state + serialization)
            -> Sandbox Durable Object (Git, processes, HTTP, WebSockets)
                 -> /workspace/session isolated worktree
                    -> Astro :4321
                    -> code-server :8080
```

The implementation uses one fixed logical coordinator name and one fixed Sandbox name because
the ticket and parent story allow exactly one session.

## Files created

### `src/lib/session-lifecycle.ts`

Workers-independent contract and pure helpers shared by the Worker and Node tests.

Exports:

- lifecycle constants:
  - control prefix and operation paths;
  - workspace/repository/config paths;
  - Sandbox/coordinator identity;
  - Astro/code-server process IDs and ports;
  - readiness timeout and log byte limit;
- domain types:
  - `SessionPhase`;
  - `SessionRecord`;
  - `SessionConfig`;
  - `SessionProcessSnapshot`;
  - `SessionStatusPayload`;
  - `SessionLogsPayload`;
  - `SessionOperationResult`;
  - `SessionUpInput`;
- validation and classification:
  - `isCommitRevision(value)`;
  - `parseUpInput(value)`;
  - `parseSessionConfig(envLike)`;
  - `classifyControlRequest(request)`;
  - `classifyProxyHost(hostname, config)`;
  - `isWebSocketUpgrade(request)`;
- formatting/build helpers:
  - `sessionUrls(config)`;
  - `boundedLog(value, limit?)`;
  - `buildProvisionCommand()`;
  - `buildAstroConfig(config)`;
  - `buildAstroCommand()`;
  - `buildCodeServerCommand()`;
  - `jsonResponse(payload, init?)`;
  - error normalization that never serializes a stack or arbitrary object graph.

This module imports no `cloudflare:workers` or Sandbox package code. Node's built-in test runner
can import it directly with TypeScript stripping.

Validation is strict:

- revisions are exactly 40 lowercase hexadecimal characters;
- slug is a lower-case DNS label and fixed by config;
- base domain has DNS-label syntax and no scheme/path;
- repository URL is HTTPS;
- host matching is exact after lowercasing and removing no implicit port (URL.hostname already
  excludes it).

The provision command is a constant shell program. Dynamic values are passed only through
quoted environment variables by the platform module.

### `scripts/session.ts`

Owner-facing CLI adapter.

Exports testable functions:

- `parseSessionArguments(argv)`;
- `runSessionCommand(options)` with injectable `fetch` and output stream;
- `main()`.

Supported syntax:

```text
session up <commit-sha>
session status
session logs
session down
```

`SESSION_WORKER_URL` supplies the already-deployed Worker origin. The script builds URLs with
the standard `URL` API, sends JSON only for `up`, checks response content type, prints formatted
JSON, and sets a nonzero exit code for HTTP or transport failures.

No Wrangler deploy, DNS mutation, secret management, or Cloudflare REST call occurs here.

### `test/session-lifecycle.test.mjs`

Node unit tests for both the pure contract and the CLI.

Coverage groups:

1. revision validation and `up` payload parsing;
2. Worker variable/config validation;
3. exact preview/editor host classification;
4. control method/path classification and 405 behavior;
5. case-insensitive WebSocket upgrade detection;
6. exact session URL generation;
7. tail-bounded stdout/stderr with truncation metadata;
8. provision command invariants and absence of interpolated user data;
9. generated Astro config exact host/HMR values;
10. stable process commands and paths;
11. CLI argument parsing;
12. CLI request methods, URLs, body, output, and failure handling.

The test does not emulate Durable Object storage or Sandbox transport. Actual platform calls
are validated by TypeScript and Wrangler dry run.

### `docs/knowledge/session-lifecycle.md`

Durable operator and architecture guide outside active ticket artifacts.

Contents:

- exact one-session URLs and fixed-slug rationale;
- required Worker variables and no-secret public-repository assumption;
- CLI commands and examples;
- lifecycle state meanings;
- idempotency and revision-conflict behavior;
- worktree and dependency provisioning shape;
- process IDs, ports, readiness budget, and log bounds;
- HTTP versus WebSocket proxy behavior;
- `keepAlive`/`down` cost and safety consequence;
- current Access and uncommitted-work preservation gates;
- local validation and later production verification checklist.

This guide does not claim remote deployment evidence.

## Files modified

### `src/session-worker.ts`

Expand the current passive handler into the Sessions Worker platform boundary.

Exports retained/added:

- retain `export { Sandbox } from '@cloudflare/sandbox'`;
- add `export class SessionCoordinator extends DurableObject<SessionWorkerEnv>`;
- retain a default `ExportedHandler<SessionWorkerEnv>` module handler.

Imports:

- `DurableObject` from `cloudflare:workers`;
- `getSandbox` and relevant public SDK types from `@cloudflare/sandbox`;
- pure constants/types/helpers from `src/lib/session-lifecycle.ts`.

`SessionCoordinator` internal organization:

- private storage key constant imported from the pure module;
- private `mutationTail: Promise<void>` used only to serialize current live mutations;
- private `sandbox()` returns the fixed normalized Sandbox with `keepAlive: true` and default
  session disabled;
- private `record()` / `storeRecord()` storage helpers;
- private `enqueueMutation()` chains `up` and `down` without `blockConcurrencyWhile()`;
- private `provisionWorkspace()` executes the fixed Git/worktree program and writes the
  generated Astro config;
- private `processSnapshot()` refreshes actual process status;
- private `ensureProcess()` reuses a running named process or replaces stale state;
- private `reconcile()` provisions then waits for both service ports;
- public RPC `up(input)` persists transitions and returns typed results;
- public RPC `status()` combines desired record with actual process/placement facts;
- public RPC `logs()` returns bounded process output;
- public RPC `down()` marks stopping, destroys Sandbox, then deletes desired state;
- public `fetch(request)` verifies ready desired state and forwards to the selected service.

The class logs structured lifecycle summaries. It never logs headers, bodies, full process logs,
or environment variables.

Default module handler organization:

1. parse `SessionConfig` from generated variables;
2. classify a reserved control path before hostname routing;
3. validate method and body;
4. obtain `env.SESSION_COORDINATOR.getByName('primary')`;
5. call the typed lifecycle RPC and map result status to JSON;
6. for exact branded hosts, add an internal target header and call coordinator `fetch()`;
7. return a passive health payload only at `/` on unrecognized hosts;
8. otherwise return bounded JSON 404/405/500 responses.

The internal proxy target header is overwritten by the Worker and is not trusted from the
client. The coordinator also checks the desired record and configured target.

All Sandbox promises are awaited. Errors are normalized before response/storage; original
errors appear only in structured `console.error` metadata with a safe message.

### `wrangler.sessions.jsonc`

Add non-secret configuration:

```jsonc
"vars": {
  "SESSION_SLUG": "session",
  "SESSION_DOMAIN": "b28.dev",
  "SESSION_REPOSITORY_URL": "https://github.com/johnhkchen/boilerplate-demo.git"
}
```

Add exact custom domains:

```jsonc
"routes": [
  { "pattern": "demo-session.b28.dev", "custom_domain": true },
  { "pattern": "code-session.b28.dev", "custom_domain": true }
]
```

Set `workers_dev: true` so the CLI can still target a Worker development origin when required.
The exact domains do not overlap `demo.b28.dev`.

Extend the Durable Object binding list:

```jsonc
{ "name": "SESSION_COORDINATOR", "class_name": "SessionCoordinator" }
```

Retain migration `v1` for the SDK `Sandbox`, then append:

```jsonc
{ "tag": "v2", "new_sqlite_classes": ["SessionCoordinator"] }
```

Do not alter the `Sandbox` container declaration, image, instance size, maximum instances,
existing migration, compatibility settings, or observability sampling.

### `worker-configuration.sessions.d.ts`

Regenerate exclusively through:

```text
npm run session:types
```

Expected binding additions:

- `SESSION_COORDINATOR: DurableObjectNamespace<SessionCoordinator>`;
- literal string variables for slug/domain/repository URL.

No hand edits.

### `package.json`

Add:

```json
"session": "node --experimental-strip-types scripts/session.ts"
```

Append `test/session-lifecycle.test.mjs` to the existing `test` script. Preserve all other
scripts and exact Sandbox dependency pin.

No new npm package is required.

### `docs/active/work/T-004-03-02/progress.md`

Created during Implement and updated after each meaningful unit:

- configuration/types;
- pure contract/tests;
- coordinator lifecycle;
- branded proxy;
- CLI/docs;
- complete verification;
- deviations and remote limitations.

### `docs/active/work/T-004-03-02/review.md`

Created during Review with:

- acceptance mapping;
- files created/modified/deleted;
- architecture and public interfaces;
- exact test results;
- Workers/Sandbox best-practice review;
- security/durability caveats;
- remote entitlement and Custom Domain/WebSocket gaps;
- commit list and cleanup state.

## Files not modified

- `docs/active/tickets/T-004-03-02.md` frontmatter and body;
- `wrangler.jsonc` and `worker-configuration.d.ts` for the stable App Worker;
- `astro.config.mjs` in the repository (session overrides are generated at runtime);
- `Dockerfile.session`, image pins, and `.dockerignore`;
- stable application pages, APIs, D1 migration, promotion/rollback tooling;
- story/epic/demand/Lisa state and unrelated active work.

## Public response contracts

`up` success:

```json
{
  "ok": true,
  "operation": "up",
  "session": {
    "slug": "session",
    "revision": "<sha>",
    "phase": "ready",
    "previewUrl": "https://demo-session.b28.dev",
    "editorUrl": "https://code-session.b28.dev"
  },
  "changed": true
}
```

Repeated converged `up` uses `changed: false` if workspace and both named services were already
healthy. Repairing a missing service uses `changed: true`.

Status has no side effects beyond observing the current Sandbox generation. It reports desired
phase plus process states and placement ID when available. `logs` has the same session identity
and two bounded entries. `down` returns whether a desired session existed.

Failures share:

```json
{
  "ok": false,
  "operation": "up",
  "error": { "code": "revision_conflict", "message": "..." }
}
```

Error codes are stable programmatic identifiers. Messages are actionable but do not expose
shell commands, environment values, stack traces, or SDK response bodies.

## Implementation ordering constraints

1. Pure types/constants must land before the Worker imports them.
2. Wrangler binding/migration changes and generated types must land with the coordinator export
   so every intermediate commit typechecks.
3. Unit tests land with the helpers they test.
4. The CLI lands after the control response contract is stable.
5. Documentation is written from verified commands/results, not anticipated output.
6. Review runs only after the final generated-type check and dry-run pass.

## Deletion policy

No tracked file is deleted by this ticket. Runtime `down` deletes the desired-state record and
destroys only the fixed session Sandbox; it does not touch the stable Worker or repository.
