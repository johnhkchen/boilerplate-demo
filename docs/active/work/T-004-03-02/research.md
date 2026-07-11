# Research — T-004-03-02 one-session-lifecycle-and-routing

## Ticket contract

The ticket starts in `phase: research` and defines the core single-session capability for
epic E-004. Its acceptance criterion combines four operator actions with two branded proxy
surfaces:

- `up` provisions one isolated session at a chosen Git revision;
- `status` reports the session and its two services;
- `logs` exposes bounded diagnostics for those services;
- `down` stops the session;
- `demo-<slug>.b28.dev` proxies Astro, including Vite HMR WebSocket upgrades;
- `code-<slug>.b28.dev` proxies code-server, including its WebSocket upgrades;
- repeated `up` calls converge rather than creating duplicate processes or workspaces.

The ticket advances P4 (a collaborator needs only links and a browser) and P6 (the project
owns the runtime in its own Cloudflare account). It is explicitly scoped to one session.

The ticket frontmatter depends on `T-004-03-01`, whose image and Sessions Worker are present.
The frontmatter itself is managed by Lisa and is outside this ticket's write surface.

## Binding architecture

`docs/knowledge/demo-environments-decisions.md` fixes the high-level topology:

```text
demo.b28.dev        -> stable App Worker (public)
demo-<slug>.b28.dev -> Sessions Worker (Access) -> Sandbox port 4321
code-<slug>.b28.dev -> Sessions Worker (Access) -> Sandbox port 8080
```

The stable App Worker and Sessions Worker are physically separate. The session runtime does
not mutate or proxy the stable demo. Cloudflare Access and origin assertion validation are
owned by downstream ticket `T-004-04-01`; this ticket supplies the route and proxy seam they
protect.

The decision record uses first-level subdomains because a single `*.b28.dev` certificate can
cover both brands. The hostname itself carries the session slug; a path prefix does not.

## Existing Sessions Worker

`src/session-worker.ts` is currently a minimal module. It:

- re-exports `Sandbox` from `@cloudflare/sandbox`, which the container binding requires;
- defines a default module handler satisfying `ExportedHandler<SessionWorkerEnv>`;
- returns only `{ service: "demo-runway-sessions", status: "ok" }`;
- has no request parsing, lifecycle operation, process management, or proxy routing.

`tsconfig.sessions.json` checks only the generated session binding declaration and this entry
module. The stable App TypeScript project deliberately excludes both so global
`Cloudflare.Env` declarations cannot merge across independent Workers.

## Existing Sessions Worker configuration

`wrangler.sessions.jsonc` is independently deployable as `demo-runway-sessions`. It currently
declares:

- compatibility date `2026-07-10` and `nodejs_compat`;
- `workers_dev: true` and preview URLs;
- a single `basic` container with `max_instances: 1`;
- a `Sandbox` Durable Object namespace binding;
- the initial SQLite class migration `v1`;
- full log sampling and 10% trace sampling;
- an explicit empty required-secret list.

It does not declare `demo-*.b28.dev` or `code-*.b28.dev` routing, a repository URL, a session
slug, or lifecycle secrets. Cloudflare's current Custom Domain contract requires exact
hostnames and does not support wildcard Custom Domains. Worker routes support a leading
wildcard hostname, but require a matching proxied DNS record in the zone.

The current Wrangler schema accepts route entries with a pattern plus `zone_name`; it also
distinguishes Custom Domain entries with `custom_domain: true`.

## Existing container image

`Dockerfile.session` extends `docker.io/cloudflare/sandbox:0.12.3` and pins Node 24.18.0 plus
code-server 4.127.0. It installs the lockfile dependencies and copies the real project into
`/opt/demo-runway`.

The final working directory is `/workspace`. Ports 4321 and 8080 are exposed for Astro and
code-server. The inherited `/container-server/sandbox` entrypoint remains intact.

The baked `/opt/demo-runway` tree is a runnable baseline, but is not a Git repository:
`.dockerignore` excludes `.git`, and the Dockerfile uses explicit copies. It is therefore not
itself a worktree capable of resolving arbitrary revisions.

The image includes project dependencies in `/opt/demo-runway/node_modules`. A separately
cloned repository under `/workspace` does not automatically share those dependencies because
Node resolution walks ancestors of the clone, not a sibling directory.

## Repository source

The checked-out repository has an HTTPS origin:

```text
https://github.com/johnhkchen/boilerplate-demo.git
```

The remote URL is local Git metadata and is absent from the container image and generated
Worker binding types. The Sessions Worker needs a deploy-time source if it is to clone a
chosen revision without embedding host Git state into the image.

The repository uses a lockfile and `npm ci`. For the current revision, the image already has
the exact dependency graph. A chosen older or newer revision may have a different lockfile;
the lifecycle must be able to detect that distinction before borrowing baked dependencies.

## Sandbox SDK surface

The installed runtime and image both use `@cloudflare/sandbox@0.12.3`. Its current public
surface includes:

- `getSandbox(namespace, id, options)` for stable Durable Object identity;
- `exec(command, options)` for foreground shell commands;
- `startProcess(command, options)` with caller-selected `processId`;
- `listProcesses()`, `getProcess()`, and `getProcessLogs()`;
- `Process.getStatus()`, `waitForPort()`, `getLogs()`, and `kill()`;
- `containerFetch(request, port)` for HTTP proxying;
- `wsConnect(request, port)` for WebSocket upgrades;
- `destroy()` for immediate teardown;
- `gitCheckout()` for branch-oriented clones;
- backup and restore methods that require an R2 binding and credentials.

`ProcessOptions` accepts `cwd`, environment variables, a custom ID, timeout settings, and
readiness conditions. `Process.status` can be `starting`, `running`, `completed`, `failed`,
`killed`, or `error`.

The `gitCheckout()` convenience method exposes `branch`, depth, target directory, and clone
timeout, but no independent commit/ref argument. Exact arbitrary revision checkout therefore
requires a Git command sequence after fetching repository data.

## Lifecycle evidence from prerequisite tickets

The Phase 0 co-residency spike proved locally that one Sandbox can run Astro and code-server
at the same time. Astro HTTP, code-server HTTP, and a Worker-proxied Vite HMR WebSocket all
worked through the installed SDK. A browser IDE save and remote paid-container run were not
observed.

The idle sleep/wake spike found that the same Sandbox ID does not preserve the running
container. After inactivity:

- managed processes were gone;
- ports 4321 and 8080 were closed;
- `/workspace` writes were gone;
- baked files reverted to their image state;
- named shell state was gone.

Both services could be relaunched in roughly four seconds. The durable Sandbox ID is a routing
identity, not durable filesystem or process state.

The image ticket measured a clean local real-project Astro start in 4,485 ms against a
60-second budget. Remote image placement and paid-account behavior remain unobserved.

## Existing application development behavior

The root `npm run dev` delegates to `astro dev`. Astro 7 uses the Cloudflare adapter and
workerd development integration. Application routes can consume the root Wrangler config and
local bindings during development.

Astro and Vite must bind to `0.0.0.0` inside the container. Dynamic external hosts also need
to be accepted by Vite; otherwise a branded `Host` header can be rejected before the page is
served. HMR uses the incoming WebSocket hostname and protocol when not forced to a mismatched
endpoint.

code-server must bind to `0.0.0.0:8080`. The Phase 0 spike used `--auth none`; the architectural
boundary expects Access on the Sessions Worker route, with origin validation added by
`T-004-04-01`. No code-server password is currently configured or baked.

## Operator interface patterns

The repository's existing operator capabilities (`promote`, `rollback`, checks) use typed
TypeScript scripts invoked through package scripts. Unit tests import exported functions from
those scripts or supporting `src/lib` modules and execute them under Node's test runner.

There is no existing session CLI, HTTP lifecycle convention, or shared session state module.
There is also no central control-plane service. N3 rules out making one mandatory.

A CLI running on the owner's machine cannot directly call Sandbox bindings. It must call the
Sessions Worker control interface or invoke a deployment/runtime command that reaches it. The
current Worker has no authentication layer; Access protection is a later ticket.

## Concurrency and single-session boundary

Wrangler sets `max_instances: 1`, and the ticket requires one session. A fixed normalized
Sandbox ID maps all requests to one Durable Object and one possible container.

Worker module globals cannot safely store lifecycle truth: isolates are reused across requests
and can be evicted. Actual processes and files live in the Sandbox container and must be
inspected through SDK calls. Durable Object storage belongs to the exported SDK class, not to
the module handler.

Repeated or concurrent `up` calls can observe partially completed provisioning. Named process
IDs make duplicate service detection possible, but workspace provisioning also needs a
container-visible convergence marker or Git inspection.

## Request and proxy boundaries

The control plane and proxy plane share one Worker entrypoint but have different selectors:

- control operations are naturally selected by URL paths and HTTP methods;
- preview/editor traffic is selected by the request hostname prefix;
- all remaining hosts/paths need an explicit not-found response.

WebSocket upgrades are identified by the `Upgrade: websocket` header. The SDK provides a
separate `wsConnect()` method, while ordinary HTTP uses `containerFetch()`.

Proxying should preserve path, query, method, headers, and body. The inbound hostname should
remain visible to Astro/Vite and code-server because redirects, asset URLs, and HMR connections
are host-sensitive.

## Logs and diagnostics

The SDK retains accumulated stdout and stderr for named managed processes through
`getProcessLogs()` while the current container generation exists. A sleep/replacement loses
those records along with the processes. The Worker already has structured Workers Logs and
Traces enabled, but current source emits no lifecycle events.

Returning complete unbounded logs would enlarge responses and expose arbitrary application
output. The ticket asks for `logs`, not indefinite streaming or durable archival.

## Testing surfaces

The repository's default `npm test` runs Node tests and currently passes 109 tests according
to the dependency ticket review. `npm run session:validate` regenerates/checks session binding
types, runs the isolated TypeScript project, and performs a Wrangler dry-run bundle.

Local end-to-end Sandbox tests require Docker and build/start a roughly 582 MB amd64 image.
The account cannot deploy Containers remotely without a paid entitlement. Tests therefore
need a fast unit seam for request parsing and lifecycle decisions, plus dry-run/type evidence;
full platform routing remains an environment-dependent check.

## Constraints and assumptions surfaced

- Exactly one active slug/session is in scope; multi-session lookup is not.
- The selected revision must be a Git commit resolved from a configured repository.
- The repository may be public for the MVP; private clone credentials are not defined here.
- The worker must not bake or log source credentials.
- A session is ephemeral; durable unsaved-work preservation is required by the epic's later
  safety story and is not represented by a binding in the current ticket configuration.
- `down` can destroy the active container, but doing so loses uncommitted files today.
- Access enforcement is downstream, so local/unit verification cannot claim the control plane
  or branded hosts are production-authorized yet.
- Wildcard custom domains are unavailable; wildcard Worker routes depend on zone DNS setup.
- The ticket's one-session runtime can be implemented and validated locally without changing
  the stable App Worker.

## Primary sources inspected

- `AGENTS.md`, `CLAUDE.md`, and `docs/knowledge/rdspi-workflow.md`;
- ticket `T-004-03-02`, story `S-004-03`, and epic `E-004`;
- `docs/knowledge/demo-environments-decisions.md`;
- `docs/knowledge/session-image.md`;
- Phase 0 session and sleep/wake findings;
- all RDSPI artifacts for dependency `T-004-03-01`;
- `src/session-worker.ts`, `wrangler.sessions.jsonc`, `Dockerfile.session`;
- `.dockerignore`, `astro.config.mjs`, package scripts, generated bindings, and TypeScript config;
- installed Sandbox 0.12.3 public declarations and README;
- installed Wrangler 4.110.0 schema;
- current Cloudflare Sandbox, Worker routing, Wrangler configuration, and Workers best-practice
  documentation retrieved on 2026-07-10.
