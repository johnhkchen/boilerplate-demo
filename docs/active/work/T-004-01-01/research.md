# Research — T-004-01-01 spike-sandbox-runs-dev-and-editor

Descriptive map of the repository, ticket boundary, current platform contract, and
available execution environment. This phase records what exists; it does not select an
implementation.

## Ticket reading

- Ticket: `docs/active/tickets/T-004-01-01.md`.
- Type: spike.
- Status: `open`.
- Current phase: `research`.
- Priority: high.
- Agent route: Codex.
- Dependencies: none.
- Parent story: `S-004-01`, “container-session-spike.”
- The acceptance criterion asks for a committed spike note.
- That note must show an edit made in a browser IDE.
- The edit must appear in the preview through Vite HMR.
- The HMR connection must be a WebSocket passing through a minimal Worker proxy.
- The note must include the exact Vite `allowedHosts` and `hmr` configuration used.
- Lisa, rather than this work session, owns ticket phase and status transitions.

## Place in E-004

`docs/active/epic/E-004.md` defines the larger collaborative-demo-environments play.
The intended user receives two links: a preview and a browser editor. The teammate should
need only a browser and identity login, with no clone, runtime, tunnel, or IDE install.

The epic binds the session runtime to Cloudflare Containers through the Sandbox SDK. It
also binds the eventual topology to two separate Workers:

- the public App Worker for the stable demo;
- a private Sessions Worker for preview/editor routing;
- one Sandbox container for a session runtime.

The epic calls this ticket part of a prerequisite Phase 0 spike. Session implementation is
gated on the spike evidence. The permanent session image and lifecycle are not yet present.

## Recorded architecture decisions

`docs/knowledge/demo-environments-decisions.md` is the repository’s existing decision record.
Its current status says the MVP shape is decided but implementation has not started.

The binding decisions relevant here are:

- Cloudflare Containers/Sandbox SDK, not a VM behind an owner-managed tunnel.
- One Sandbox is the runtime for the editor and dev server.
- The future Sessions Worker owns branded `demo-<slug>` and `code-<slug>` hostnames.
- Cloudflare Access belongs on the future Worker route.
- The public stable demo is physically separate from private session surfaces.
- The container must not contain secrets in its image or worktree.
- The trust boundary is trusted or semi-trusted teammates, not hostile multi-tenancy.

The decision record lists WebSocket proxying as an open Phase 0 risk. It specifically names
Astro/Vite HMR and code-server as WebSocket consumers and calls out Vite
`server.allowedHosts` and `server.hmr` for the dynamic preview hostname.

## Neighboring ticket boundaries

`T-004-01-02` depends on this ticket. It separately owns the forced idle sleep/wake test,
including process resumption, lost state, the go/no-go, and lifecycle consequences. A
ten-minute idle result is therefore outside this ticket’s acceptance boundary.

`T-004-03-01` depends on the sleep/wake spike. It owns the permanent session image and
Wrangler Containers configuration: pinned Node 24, code-server and dependencies baked into
the image, and cold-start-budget evidence.

`T-004-03-02` owns the production one-session lifecycle and branded routing. Its acceptance
criterion covers `up/status/logs/down`, isolated worktrees, idempotency, and production
`demo-<slug>`/`code-<slug>` hostnames.

This ticket can use disposable spike assets without committing production session code.
The committed finding is the durable product of the spike.

## Existing application and toolchain

The repository is an Astro application deployed to Cloudflare Workers.

- `package.json` names the project `demo-runway`.
- The package is ESM and private.
- The declared Node floor is `>=22.12.0`.
- The current shell reports Node `v26.5.0` and npm `11.17.0`.
- Astro is `^7.0.7`.
- `@astrojs/cloudflare` is `^14.1.2`.
- Wrangler is `^4.110.0`; `npx wrangler --version` reports `4.110.0`.
- The repository has no `@cloudflare/sandbox` dependency.
- The repository has no Dockerfile.
- The repository has no Sessions Worker entrypoint.
- The repository has no code-server installation or configuration.

`astro.config.mjs` uses `defineConfig` with:

- `output: 'static'` by default;
- the Cloudflare adapter;
- an inert memory session driver;
- no `server` block;
- therefore no explicit host allowlist and no explicit HMR host/protocol/port.

The production `wrangler.jsonc` describes the existing App Worker. It contains static assets,
D1, runtime vars, secret declarations, and observability. It has no container declaration,
Sandbox Durable Object binding, Sandbox migration, or session routes.

## Existing application verification

The current package scripts include unit tests, type checking, Astro build, integration
checks, Playwright flows, and Wrangler dry deployment. Those checks exercise the stable demo,
receipt boundary, backstage gate/store/routes, operational checks, and deployment packaging.
None currently starts code-server, creates a Sandbox, or tests an HMR WebSocket.

The normal dev command is `astro dev`, which defaults to port 4321. A server inside a
container must listen beyond loopback to be reachable through a container port proxy.

## Current Cloudflare account/runtime availability

The environment has an authenticated Wrangler OAuth session. `wrangler whoami` reports one
account and includes Workers write plus Containers write permissions. The command did not
print any token value.

Docker Desktop is installed. At the start of Research the Docker socket existed at the
Docker Desktop path but the daemon was stopped. Starting Docker is possible from this host.

The repository worktree was already dirty before this ticket’s work began. The pre-existing
changes are planning material for E-004: `docs/active/demand.md`, E-004 epic/story/ticket
files, and `docs/knowledge/demo-environments-decisions.md`. These files belong to the user or
Lisa workflow and must be preserved. This ticket’s commits need path-scoped staging.

## Current Sandbox SDK port contract

Cloudflare’s current Sandbox documentation (last updated June 2026) describes two exposure
families: tunnels and Worker-fronted exposed ports. It recommends tunnels for most direct
public URLs, but identifies exposed ports as appropriate when a Worker must front the request
for authentication, rewriting, or same-host RPC.

The documented exposed-port flow is:

1. obtain a Sandbox with `getSandbox`;
2. start a service listening on a container port;
3. call `sandbox.exposePort(port, options)`;
4. call the module-level `proxyToSandbox(request, env)` first in the Worker fetch handler;
5. return the response when the request matches an exposed-port URL.

The port API documentation states that `proxyToSandbox` supports HTTP and WebSocket upgrade
requests. The function returns either a matching proxied `Response` or `null` for ordinary
application routing.

Current production exposed-port URLs require a custom domain with wildcard DNS. Local
development uses a localhost path. Port 3000 is reserved by the Sandbox runtime and cannot be
exposed. The docs show generated production hostnames carrying port, sandbox identifier, and
token components.

The Sandbox Worker must re-export `Sandbox` from `@cloudflare/sandbox`. Its Wrangler config
must connect the container class, Durable Object binding, and migration. Sandbox operations
start the container lazily.

## Current process and file APIs

The Sandbox SDK exposes file operations such as `writeFile` and command operations such as
`exec`. Long-lived services are represented as background processes rather than a blocking
foreground `exec`. The SDK also exposes process inspection/logging APIs. These APIs execute
inside the session container and are callable from the Worker over the Sandbox binding.

The Sandbox base image includes a Node runtime, but the existing decision record says the
permanent image must pin Node 24. That permanent image constraint belongs to `T-004-03-01`;
this ticket only needs to establish whether the core interaction works.

## Browser IDE transport facts

The code-server documentation says WebSockets are required for browser/server communication.
It supports reverse proxies and recommends preserving the host header for correct external
address behavior. It can run with its own password authentication or with authentication
disabled behind an external authentication layer.

This ticket’s isolated spike need not establish the future Access policy. The eventual
private editor is protected by Cloudflare Access under `T-004-04-01`. For a disposable spike,
the generated exposed-port URL contains an unguessable exposure token, while the durable note
must not record credentials.

## Vite/Astro host and HMR surfaces

Astro passes its `server` configuration to Vite. The relevant Vite fields are:

- `server.host`: address on which the dev server listens;
- `server.allowedHosts`: hostnames allowed by the dev server’s host check;
- `server.hmr.protocol`: WebSocket scheme used by the browser client;
- `server.hmr.host`: hostname to which the browser HMR client connects;
- `server.hmr.clientPort`: externally visible WebSocket port;
- `server.hmr.port`: server-side HMR listener port when different from HTTP.

The external preview runs over HTTPS, so its browser-side HMR scheme is secure WebSocket
(`wss`). The Worker/exposed-port edge terminates public TLS before forwarding to the container
service. The public HMR host is not the container’s loopback or internal hostname.

Vite’s host check compares the incoming request hostname. A generated proxy hostname is not
the same as `localhost`; it must be explicitly permitted or covered by a constrained suffix.
The exact successful values remain an empirical output of the spike.

## Evidence needed for acceptance

The acceptance wording requires an observed causal chain, not merely a deployable example:

- the browser editor loads through the Worker/Sandbox path;
- a source file is changed in that editor;
- the preview is already open through the Worker/Sandbox path;
- the preview changes without a manual reload;
- browser network evidence identifies the Vite HMR WebSocket;
- the note records the public editor and preview URL shapes without leaking tokens;
- the note records the exact Astro/Vite `server` block used;
- the note separates observed results from follow-on risks.

## Constraints and assumptions surfaced

- A remote deployment is necessary to exercise Cloudflare’s real container and proxy path.
- A local-only Docker proxy would not prove the Worker-to-Sandbox production hop.
- A scripted file write would prove HMR but not the required “edit made in browser IDE.”
- Browser interaction is therefore part of the acceptance observation.
- The spike must not modify the existing App Worker configuration or deploy over its name.
- A unique disposable Worker name avoids disturbing `demo-runway`.
- Any public token-bearing URL is evidence-sensitive and should be redacted in committed docs.
- Cleanup must remove the disposable remote Worker after evidence collection unless retaining
  it is explicitly needed for the next sleep/wake ticket.
- Removing the Worker may also remove the disposable container binding and exposure surface;
  the committed note is the lasting evidence.
- Sleep/wake survival remains intentionally unresolved for `T-004-01-02`.

## Sources inspected

- Repository: ticket, E-004 epic, S-004-01 story, architecture decisions, neighboring tickets,
  package/config files, scripts, tests, and prior RDSPI artifacts.
- Cloudflare Sandbox SDK: ports API, expose-services guide, execute/background-process guides,
  architecture/get-started material, and upstream repository examples.
- Cloudflare Workers: current Worker best practices and Wrangler command/config documentation.
- Coder: code-server requirements and reverse-proxy guidance.
