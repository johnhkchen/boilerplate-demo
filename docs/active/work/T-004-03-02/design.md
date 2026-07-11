# Design — T-004-03-02 one-session-lifecycle-and-routing

## Decision summary

Implement one desired session as a SQLite-backed `SessionCoordinator` Durable Object in the
Sessions Worker. The coordinator persists the requested revision and lifecycle phase, invokes
the existing Sandbox Durable Object, reconciles two named processes, and proxies branded HTTP
and WebSocket traffic to the correct port.

Use the fixed MVP slug `session`, yielding these exact hostnames:

```text
demo-session.b28.dev -> Astro/Vite on Sandbox port 4321
code-session.b28.dev -> code-server on Sandbox port 8080
```

Expose `up`, `status`, `logs`, and `down` through both a small HTTP control API and an owner-side
`npm run session -- ...` command. `up` accepts a full Git commit SHA and converges the desired
workspace and services. The repository URL, fixed slug, and base domain are non-secret Worker
variables.

This design leaves Access/origin validation and durable preservation of uncommitted work to
their already-sequenced tickets. It does not deploy anything remotely in this ticket.

## Option 1 — Stateless Worker handler over one fixed Sandbox

The smallest implementation would call `getSandbox(env.Sandbox, "session")` directly from the
module handler. Each control request would inspect files and processes, while host routing
would call `containerFetch()` or `wsConnect()`.

Advantages:

- few new files and no second Durable Object class;
- uses the fixed Sandbox identity already implied by `max_instances: 1`;
- straightforward HTTP and WebSocket forwarding;
- minimal Wrangler configuration change.

Disadvantages:

- concurrent `up` calls can interleave across Worker isolates;
- no durable desired slug/revision survives Worker eviction;
- status cannot distinguish a never-created session from a desired session whose container
  was replaced;
- a workspace marker inside `/workspace` disappears on Sandbox sleep or replacement;
- process inspection alone cannot explain which revision should be restored.

This option meets a narrow happy path but weakens the explicit convergence requirement and
ignores the prerequisite sleep/wake finding. It is rejected.

## Option 2 — KV or D1 session registry plus stateless execution

A Worker-accessible KV or D1 binding could store the desired revision and lifecycle metadata,
while the module handler continued to invoke the Sandbox directly.

Advantages:

- desired state survives Worker and container replacement;
- a D1 row would be easy to inspect and extend later;
- no custom Durable Object class is needed.

Disadvantages:

- KV does not supply strongly consistent compare-and-set coordination;
- D1 transactions do not serialize the external Sandbox calls that follow the state update;
- this introduces an account-level data resource for a single coordination atom;
- the project already has a separate stable D1 boundary that sessions should not inherit;
- retries still need a per-session lock or explicit operation generation protocol.

The storage problem and serialization problem would be solved separately. For exactly one
session, a Durable Object combines both more directly. This option is rejected.

## Option 3 — Dedicated coordinator Durable Object

Add a `SessionCoordinator` namespace and route the single logical session to
`getByName("primary")`. The coordinator owns small durable metadata; the SDK's existing
`Sandbox` Durable Object continues to own container execution.

Advantages:

- one coordination atom matches the ticket's one-session boundary;
- SQLite-backed storage survives coordinator eviction and code deployments;
- a deterministic DO name gives every Worker isolate the same authority;
- lifecycle RPC methods can be typed through generated Wrangler declarations;
- a per-instance promise queue can serialize slow external Sandbox operations while they are
  in flight without using `blockConcurrencyWhile()` across network/container I/O;
- proxy `fetch()` can forward WebSocket upgrade responses through the same coordinator;
- the persisted desired revision can explain and repair missing runtime state.

Disadvantages:

- adds a second DO binding, class export, and migration;
- introduces a two-DO call path for every preview/editor request;
- the coordinator is intentionally a single-instance bottleneck;
- Node's current unit test harness cannot instantiate the Workers runtime class directly.

The bottleneck is acceptable and desired for a one-session MVP; multi-session is explicitly
out of scope. The additional hop is small relative to a container-backed dev server and buys
correct serialization. This option is selected.

## Durable Object communication shape

Use RPC methods for lifecycle operations, following current Durable Objects guidance:

- `up(input)`;
- `status()`;
- `logs()`;
- `down()`.

Use `fetch(request)` only for proxy traffic because Request/Response and WebSocket upgrade
forwarding are native fetch semantics. The module handler performs host/path validation before
calling the coordinator.

The class extends `DurableObject<SessionWorkerEnv>`; it does not hand-write a parallel binding
interface. Wrangler regenerates `SessionWorkerEnv` with both namespaces.

Important lifecycle metadata is persisted before being returned. An in-memory promise chain is
only a live-operation mutex, not source of truth. A Durable Object is not evicted while its
operation remains in flight, so the queue covers concurrent mutations on that live instance.

## Durable state model

Store one versioned record under a stable storage key:

```ts
type SessionRecord = {
  version: 1;
  slug: 'session';
  revision: string;
  phase: 'provisioning' | 'ready' | 'failed' | 'stopping';
  createdAt: string;
  updatedAt: string;
  error?: string;
};
```

The record is deliberately small. Process IDs, PIDs, logs, and port health are runtime facts
and are read from the Sandbox rather than persisted as trusted state.

On `up`, persist `provisioning` before external work and `ready` only after both ports pass
readiness checks. On failure, persist a bounded error with `failed`. On `down`, persist
`stopping`, destroy the Sandbox, then delete the desired record.

## Lifecycle API

Reserve a control prefix not used by proxied applications:

```text
POST /__session/up       { "revision": "<40 lowercase hex>" }
GET  /__session/status
GET  /__session/logs
POST /__session/down
```

Control responses are JSON and carry explicit HTTP status codes. Unsupported methods return
405 with `Allow`; malformed JSON or revisions return 400; a different active desired revision
returns 409 and requires `down` first.

The full 40-character lowercase Git SHA is required. Branches and tags are mutable and can be
interpreted as command options; a commit hash gives the chosen-revision requirement an
immutable and shell-safe boundary.

The API will initially be reachable wherever the Worker is reachable. `T-004-04-01` adds Access
and origin assertion checks before production use. The implementation should make that seam
obvious and must not invent a shared bypass token.

## Owner CLI

Add one script with these commands:

```text
npm run session -- up <commit-sha>
npm run session -- status
npm run session -- logs
npm run session -- down
```

The CLI reads `SESSION_WORKER_URL` from the owner's environment and calls the control API. It
does not invoke Cloudflare REST APIs, mutate DNS, or read credentials into command arguments.

Successful `up` output includes the chosen revision, state, and exact preview/editor URLs.
Machine-readable JSON from the Worker remains the canonical response, and the CLI prints it
without reformatting secrets because none belong in the payload.

## Repository and worktree provisioning

Configure the public source repository URL as `SESSION_REPOSITORY_URL`. Inside the Sandbox,
use constants for filesystem paths:

```text
/workspace/repository.git  bare per-session Git repository
/workspace/session         detached isolated worktree
```

Provisioning executes a fixed shell program with the configured repository URL and validated
revision passed through quoted environment variables:

1. inspect an existing `/workspace/session` commit;
2. if it matches the desired SHA, preserve it and all collaborator edits;
3. if no workspace exists, initialize a bare repository;
4. fetch exactly the selected commit with bounded depth;
5. add a detached worktree at that commit;
6. verify `git rev-parse HEAD` equals the selected SHA;
7. link the baked `node_modules` only when package and lock files match the baked baseline;
8. otherwise run `npm ci` in the isolated worktree.

If an existing worktree points at another revision, `up` returns conflict instead of deleting
possibly valuable edits. Changing revision is an explicit `down` then `up` operation.

The repository URL is quoted as data in the shell. No clone credential is designed here;
private-repository support remains a future policy decision.

## Service configuration

Use fixed managed process IDs:

```text
astro-dev
code-server
```

Astro runs from `/workspace/session` on `0.0.0.0:4321`. A generated session-only Astro config
merges the selected revision's own config with:

- strict port 4321;
- exact `demo-session.b28.dev` allowed host;
- HMR protocol `wss`;
- HMR host `demo-session.b28.dev`;
- client port 443.

The generated config lives outside the worktree so it does not appear as a collaborator edit.
Its import target is a constant file URL derived from the fixed workspace path.

code-server runs on `0.0.0.0:8080`, disables telemetry, and opens the same worktree. It uses
`--auth none` only because the binding architecture places Cloudflare Access on both branded
hosts in the next ticket. The review must keep this as a production gate, not a completed
security property.

For each named process, reconcile actual state:

- reuse it only when its refreshed status is `running`;
- kill/clean a stale same-ID record if needed;
- start one replacement with the stable ID;
- wait up to the documented 60-second service budget for its port;
- report ready only after both checks succeed.

Use `keepAlive: true` for the active one-session MVP and require `down()` to destroy the
Sandbox. This avoids automatic sleep silently deleting uncommitted files while collaborators
are active. It trades idle cost for safety until the backup/preservation ticket exists.

## Branded route decision

Cloudflare Custom Domains do not support wildcard DNS records. Worker route wildcard syntax
allows a leading wildcard hostname, not safe infix patterns such as `demo-*.b28.dev` and
`code-*.b28.dev`.

A broad `*.b28.dev/*` Sessions Worker route would also match public `demo.b28.dev`. It could put
the stable public demo behind the later Access policy and violate the separate-auth boundary.
Proxying the stable Worker through the Sessions Worker does not repair that policy problem.

Because this is explicitly the one-session MVP, declare two exact Custom Domains for the fixed
slug `session`. This gives Wrangler-managed DNS/certificates, keeps the public stable hostname
untouched, and gives downstream Access two exact applications/routes to protect.

Arbitrary runtime slugs require route/custom-hostname automation or a separate delegated
subdomain and belong with the out-of-scope multi-session control plane.

## Proxy behavior

Classify only exact configured hosts:

- preview hostname -> port 4321;
- editor hostname -> port 8080;
- any other hostname -> no proxy target.

Before forwarding, require desired state `ready` and exact configured slug. If runtime health
has disappeared, return 503 with a control-plane status payload; do not serve the baked
baseline as though it were the requested revision.

For WebSocket upgrades, call `sandbox.wsConnect(request, port)`. For ordinary requests, call
`sandbox.containerFetch(request, port)`. Preserve the original Request so Host, path, query,
method, headers, body, cookies, and WebSocket subprotocols reach the service.

## Logs design

`logs` returns both stable process IDs, current status, and accumulated stdout/stderr. Bound
each stream to the final 32 KiB and mark whether it was truncated. If a process is absent,
return an explicit absent entry rather than raising a 500.

Workers observability receives structured lifecycle events containing operation, phase, slug,
revision, and error category. Do not log repository credentials, request headers, cookies,
Access assertions, or complete application log bodies.

## Testing decision

Extract parsing, validation, routing classification, bounded-log formatting, command assembly,
and result helpers into a Workers-independent library. Test these under the existing Node test
runner.

Typecheck and dry-run the actual Durable Object, generated bindings, migrations, Custom
Domains, Sandbox calls, and WebSocket response path with `npm run session:validate`.

Use mocked lifecycle adapters for request-level convergence tests rather than requiring Docker
in every `npm test` run. Retain the existing real image check as the executable-environment
evidence. A full remote Custom Domain/WebSocket test cannot run until the paid Containers
entitlement and Access configuration exist; Review must state this gap.

## Rejected expansions

- Multiple slugs or one coordinator per arbitrary user: rejected as the next fleet phase.
- R2 backup/restore in this ticket: rejected because bindings, credentials, retention, and
  teardown safety belong to the explicit safety story.
- Git push on `down`: rejected because repository credentials and conflict policy are not yet
  defined; `down` will warn that work is ephemeral until the safety ticket lands.
- code-server password plus Access: rejected because two auth layers would complicate the
  handoff and the architectural choice is Access; origin enforcement remains downstream.
- public preview bypass: rejected because the decision record makes both session surfaces
  private by default.
- mutable branch/tag revisions: rejected in favor of immutable commit identity.

## Consequences

The result is a complete, idempotent one-session lifecycle and routing implementation that is
honest about its security and durability gates. Repeated `up` at the same revision preserves
the workspace and reuses or repairs services. A different revision cannot overwrite active
work accidentally. Exact hostnames can be deployed without intercepting the public demo.

The Durable Objects skill influenced the selected boundary: persistent desired state uses a
SQLite-backed class, lifecycle methods use typed RPC, and `blockConcurrencyWhile()` is not
held across slow Sandbox I/O. The Workers/Sandbox guidance influenced generated binding types,
structured logs, awaited promises, named processes, bounded responses, and the separate HTTP
versus WebSocket proxy calls.
