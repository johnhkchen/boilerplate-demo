# Review — T-004-03-02 one-session-lifecycle-and-routing

## Outcome

**The ticket is implemented and its one-session lifecycle acceptance criterion passes with
local Wrangler/Docker evidence.**

The Sessions Worker now manages one immutable-revision collaborative session through:

- `up` — provisions an exact detached Git worktree and starts both services;
- `status` — reports desired phase plus actual process/placement state;
- `logs` — returns bounded Astro and code-server diagnostics;
- `down` — destroys the keepalive Sandbox and clears desired state;
- `demo-session.b28.dev` — readiness-gated Astro HTTP/WebSocket proxy;
- `code-session.b28.dev` — readiness-gated code-server HTTP/WebSocket proxy path.

Repeated `up` at the same revision converges without replacing the worktree or duplicating
processes. A conflicting revision is refused until the owner explicitly runs `down`.

No remote deployment occurred. Paid-platform placement, Custom Domain DNS/TLS, Cloudflare
Access, the code-server browser WebSocket, and a browser-originated save remain open gates.

## Acceptance criterion

Ticket criterion:

> up/status/logs/down manage one session; up provisions an isolated worktree at a chosen
> revision and starts dev server plus code-server; demo-<slug>.b28.dev and code-<slug>.b28.dev
> proxy to them including WebSocket upgrades; re-running up converges idempotently.

| Clause | Evidence | Verdict |
|---|---|---|
| one session | fixed coordinator `primary`, Sandbox ID, max container instance 1 | PASS |
| owner `up` | CLI + POST control API | PASS |
| chosen revision | full lowercase SHA required and exact `HEAD` checked | PASS |
| isolated worktree | bare repo + detached `/workspace/session` worktree | PASS |
| preserve same revision | existing matching worktree is not reset | PASS |
| protect active edits | different revision returns 409; requires down first | PASS |
| Astro start | `astro-dev`, HTTP readiness on 4321 | PASS locally |
| code-server start | `code-server`, TCP readiness on 8080 | PASS locally |
| status | ready phase, both process PIDs/statuses, placement field | PASS |
| logs | two stable IDs, 32 KiB tail bounds, absent-safe | PASS |
| down | Sandbox destroy, state delete, repeated down no-op | PASS locally |
| preview hostname | exact `demo-session.b28.dev` Custom Domain and port mapping | PASS config/local host |
| editor hostname | exact `code-session.b28.dev` Custom Domain and port mapping | PASS config/local host |
| preview HTTP | real app HTTP 200 and `Demo Runway` marker | PASS locally |
| editor HTTP | code-server HTTP 200 | PASS locally |
| preview WebSocket | 101, `vite-hmr`, connected/full-reload frames | PASS locally |
| editor WebSocket routing | shared exact `wsConnect()` branch selects port 8080 | PASS by code/type |
| editor WebSocket session | raw probe lacked VS Code reconnection handshake | NOT OBSERVED |
| idempotent repeated up | `changed:false`, same PIDs, 159 ms | PASS locally |
| generated bindings | `session:types:check` | PASS |
| Sessions Worker bundle/config | `session:validate` / dry run | PASS |

The fixed slug is `session`, so the required branded pattern materializes as
`demo-session.b28.dev` and `code-session.b28.dev`. This is intentional one-session scope, not a
claim of arbitrary runtime slug routing.

## Architecture delivered

```text
owner CLI / HTTP control request
  -> demo-runway-sessions Worker
     -> SessionCoordinator DO (SQLite desired state + mutation queue)
        -> Sandbox DO (fixed identity, keepAlive)
           -> /workspace/repository.git
           -> /workspace/session (detached exact-SHA worktree)
              -> Astro :4321
              -> code-server :8080

demo-session.b28.dev HTTP  -> coordinator -> containerFetch(:4321)
demo-session.b28.dev WS    -> coordinator -> wsConnect(:4321)
code-session.b28.dev HTTP  -> coordinator -> containerFetch(:8080)
code-session.b28.dev WS    -> coordinator -> wsConnect(:8080)
```

The stable App Worker and `demo.b28.dev` remain unchanged. The two session routes are exact
Custom Domains; there is no broad `*.b28.dev` route that could intercept the public demo.

## Lifecycle state and convergence

The coordinator persists one versioned record with slug, revision, phase, timestamps, and a
bounded failure reason. It uses SQLite-backed DO storage, not module-level state.

Mutation behavior:

1. `up`/`down` join a per-instance promise chain;
2. the chain survives a rejected operation;
3. desired `provisioning`/`stopping` state is stored before Sandbox I/O;
4. `ready` is stored only after both ports pass;
5. failures persist `failed` plus a bounded message;
6. no `blockConcurrencyWhile()` holds a lock across container/network I/O.

Runtime truth is inspected through the Sandbox process APIs. Stored PIDs are never trusted.

Same-revision reruns preserve the worktree and collaborator edits. They rewrite only the
generated config outside Git, refresh actual process status, wait for both ports, and start
only missing/stale named services.

## Exact local evidence

Machine evidence: `local-lifecycle-evidence.json`.

Environment:

| Item | Value |
|---|---|
| scope | local Wrangler + Docker |
| Wrangler | 4.110.0 |
| Sandbox SDK/image | 0.12.3 |
| Worker origin | `http://127.0.0.1:8793` |
| chosen commit | `ec9dd46678419afdb22bf5aa1e8d5ec7a9adc119` |
| repository | public HTTPS GitHub origin |

Clean `up`:

| Observation | Result |
|---|---|
| request | HTTP 200 in 12,866 ms |
| provision | 7,424 ms |
| Astro | PID 155, running, ready in 2,887 ms |
| code-server | PID 260, running |
| phase | ready |

Repeated `up`:

| Observation | Result |
|---|---|
| request | HTTP 200 in 159 ms |
| provision check | 58 ms |
| changed | false |
| Astro PID | 155 -> 155 |
| code-server PID | 260 -> 260 |

Proxy:

- preview HTTP 200, real project marker found;
- editor HTTP 200;
- preview WebSocket 101;
- `vite-hmr` subprotocol preserved;
- Vite `connected` and `full-reload` frames observed.

Teardown:

- first down: 200, changed true, Sandbox destroyed, idle;
- second down: 200, changed false, idle;
- Wrangler stopped;
- residual local proxy helper identified and stopped;
- zero matching containers remained running.

## Files created

### Runtime and operator surface

| File | Purpose |
|---|---|
| `src/lib/session-lifecycle.ts` | Pure constants, types, validation, routing, bounded I/O, commands/config. |
| `scripts/session.ts` | Owner CLI for up/status/logs/down. |
| `test/session-lifecycle.test.mjs` | 17 lifecycle/CLI unit tests. |

### Documentation and evidence

| File | Purpose |
|---|---|
| `docs/knowledge/session-lifecycle.md` | Durable architecture, commands, operations, risks, production checklist. |
| `docs/active/work/T-004-03-02/local-lifecycle-evidence.json` | Machine-readable local runtime observations. |
| `docs/active/work/T-004-03-02/{research,design,structure,plan,progress,review}.md` | Complete RDSPI record. |

## Files modified

| File | Change |
|---|---|
| `src/session-worker.ts` | Coordinator DO, lifecycle RPC, worktree/process convergence, control and proxy handler. |
| `wrangler.sessions.jsonc` | exact domains, vars, coordinator binding, v2 SQLite migration. |
| `worker-configuration.sessions.d.ts` | regenerated coordinator and variable bindings. |
| `package.json` | session CLI script and lifecycle tests in default suite. |

No file was deleted.

The ticket file, ticket phase/status frontmatter, stable `wrangler.jsonc`, stable generated
bindings, stable application source, Dockerfile/image pins, story, epic, demand, and Lisa state
were not modified by this ticket.

## API and CLI review

Control API:

```text
POST /__session/up       { revision: full SHA }
GET  /__session/status
GET  /__session/logs
POST /__session/down
```

CLI:

```text
npm run session -- up <full-sha>
npm run session -- status
npm run session -- logs
npm run session -- down
```

`SESSION_WORKER_URL` must be a credential-free HTTP(S) origin. CLI invocation errors exit 2;
transport/HTTP failures exit 1; success exits 0.

Control JSON reads are stream-bounded at 4 KiB. Public JSON responses set no-store. Failure
messages are single-line and bounded; stack traces, request headers, cookies, Access assertions,
and process log bodies are not copied into structured lifecycle logs.

## Worktree and dependency review

The provision command is constant. Repository URL and revision enter through quoted command
environment variables. Only full lowercase 40-character SHA-1 values pass validation.

The new worktree is detached and verified after fetch. An existing matching worktree is kept;
an existing mismatch exits with a dedicated conflict.

Dependencies are symlinked from the image only when both package and lock files match. Other
revisions run `npm ci` inside their worktree with a 180-second provision timeout.

No private repository credential exists. The current configuration works for the public
project origin only.

## Service and proxy review

Astro uses the selected revision's config plus an external generated override with exact
allowed host and production HMR hostname/protocol/port. Real local testing discovered and
fixed two Astro 7 syntax details:

- global `--root`/`--config` must appear before `dev`;
- `--config` must be relative to root, not absolute.

code-server uses `--auth none`, binds all interfaces on 8080, disables telemetry, and opens the
isolated worktree. This is acceptable only behind the decided Access boundary and is a critical
deployment gate.

Proxy requests preserve the original Request after deleting one Worker-owned routing header.
Target selection is exact; a client-supplied header is overwritten before coordinator fetch.
The coordinator rechecks that the desired phase is ready and target process is running.

## Test coverage

### Unit/regression

`npm test` passes **126/126**, zero failures/skips.

The 17 new tests cover:

- full immutable SHA validation;
- exact `up` payload shape;
- bounded valid/malformed/oversized JSON bodies;
- safe configuration variables and credential rejection;
- all control paths/methods;
- exact/case-insensitive host mapping;
- WebSocket upgrade recognition;
- byte-bounded Unicode-aware log tails;
- fixed provision command invariants;
- exact Astro HMR config;
- stable service commands;
- safe error bounds;
- all CLI argument mappings;
- Worker origin validation;
- exact CLI request body/method/path;
- CLI HTTP and invocation failures.

The remaining 109 existing tests pass unchanged.

### Types/config/bundle

- `npm run session:types:check`: pass;
- isolated session `tsc`: pass;
- Wrangler dry run: pass;
- final Sessions Worker bundle: 612.77 KiB / 133.24 KiB gzip;
- image assembly during dry run: pass;
- `npm run session:validate`: pass;
- stable `npm run typecheck`: 49 files, zero errors/warnings/hints;
- stable App generated bindings: current;
- `git diff --check`: pass.

### Runtime

The local runtime exercised real Durable Object RPC/storage, Sandbox exec/files/processes,
public Git fetch/worktree, Astro readiness, code-server readiness, both HTTP host routes, Vite
WebSocket proxying, repeated convergence, logs, and teardown.

## Workers/Sandbox best-practice assessment

Passes:

- generated environment/binding types; no hand-written Env;
- current compatibility date and `nodejs_compat` retained;
- logs/traces already enabled;
- structured lifecycle logs;
- no mutable request state at module scope;
- critical desired state persisted in DO storage;
- typed RPC used for lifecycle; fetch reserved for proxy semantics;
- no `blockConcurrencyWhile()` around external I/O;
- all Sandbox promises awaited or returned;
- public SDK methods only;
- SDK/image pins remain identical;
- cryptographic/security IDs are not generated with `Math.random()`;
- no `passThroughOnException()`;
- no Worker call to Cloudflare REST APIs;
- bounded request bodies, logs, and errors;
- exact routes; no wildcard interception of stable demo;
- fixed keepalive Sandbox paired with explicit destroy.

The Durable Objects skill shaped the coordinator/storage/RPC boundary. The Workers and Sandbox
skills shaped generated bindings, structured observability, awaited promise handling, named
processes, exact HTTP/WS proxy methods, and the dry-run/type/runtime validation sequence.

## Commits

1. `508f562` — Research.
2. `75468ee` — Design.
3. `a9f87da` — Structure.
4. `de003a6` — Plan.
5. `474c234` — lifecycle contracts and initial tests.
6. `5d62288` — coordinator binding, migration, vars, domains, generated types.
7. `09e821b` — worktree/services/lifecycle/proxy implementation.
8. `55082c4` — owner CLI and tests.
9. `b3333d8` — correct Astro global flag order from runtime evidence.
10. `8f38f05` — use root-relative Astro config path from runtime evidence.
11. `bfe9820` — stream-bound control request bodies.
12. `ae3c277` — operator docs, Progress, and local evidence.
13. `8294822` — remove stale test import; zero-hint typecheck.
14. Final Review commit — this artifact, completed Progress, and whitespace cleanup.

All commits used path-scoped staging. Pre-existing Lisa/user worktree changes remain unstaged.

## Open concerns

### 1. Access and origin enforcement — critical before deployment

code-server has no native auth. Both session surfaces and the control API must be protected by
Cloudflare Access/origin assertion validation in `T-004-04-01`. `workers_dev: true` is also a
potential alternate origin and must not become an Access bypass.

### 2. Uncommitted work preservation — critical before destructive handoff

`down` destroys `/workspace`, and platform replacement can do the same. Keepalive prevents
normal idle sleep but is not durable storage. The later safety ticket must commit/push or
backup/restore a recoverable patch before teardown/replacement.

### 3. Workers Paid Containers entitlement

The account still cannot run Containers remotely. Enabling a paid plan is a financial action
and was not attempted. Production image placement, `basic` sizing, Custom Domain proxying, and
remote cold readiness remain unobserved.

### 4. code-server browser/WebSocket evidence

Editor HTTP reached 200. A raw `/websocket` curl request lacked the VS Code reconnection
protocol and timed out, so code-server's browser WebSocket and a browser save are not proven.
Use a clean supported browser after Access and remote deployment.

### 5. Fixed slug

This ticket intentionally implements the one-session slug `session`. Arbitrary slugs require
safe route/custom-hostname automation and belong to the out-of-scope fleet/control-plane phase.

### 6. Public repository only

The configured source is credential-free HTTPS. Private repositories need a non-baked,
non-logged credential injection and outbound proxy policy not designed here.

### 7. Revision compatibility and install time

A revision with different dependencies runs `npm ci`, bounded at 180 seconds. Very old/new or
incompatible revisions can fail and remain in `failed` state with bounded logs. That is safer
than silently using the image's mismatched dependencies.

### 8. Local helper cleanup

Wrangler left one stopped-by-us `proxy-everything` helper after clean Sandbox destroy and
Wrangler shutdown. Operators should inspect Docker after local runs. No matching helper remains
running now.

## Human handoff

The repository implementation is ready for the next safety/auth ticket. Do not deploy it as a
collaborative editor until concerns 1 and 2 are resolved. After entitlement and Access exist,
run the production checklist in `docs/knowledge/session-lifecycle.md` and attach real browser
evidence for both WebSockets and an editor save/HMR update.
