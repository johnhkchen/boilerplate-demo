# Design — T-004-01-01 spike-sandbox-runs-dev-and-editor

Options and decisions for obtaining trustworthy Phase 0 evidence without prematurely
committing the production session runtime.

## Decision in one line

Deploy a uniquely named, disposable Sandbox Worker whose `proxyToSandbox()` call fronts two
deterministic exposed-port hostnames on `b28.dev`; run a minimal Astro app and code-server in
the Sandbox; edit the Astro source through code-server in a browser while the preview is open;
capture HMR WebSocket evidence; then commit only the spike finding and RDSPI artifacts and
remove the remote spike Worker.

## What “prove” means here

The ticket is not asking whether the components work independently. The decisive observation
is one causal chain:

1. one Sandbox hosts both processes;
2. code-server is reached through the Worker proxy;
3. Astro preview is reached through the same Worker proxy mechanism;
4. the browser IDE writes the source file;
5. Vite detects that file change;
6. the already-open preview receives an HMR update over `wss`;
7. the rendered marker changes without a browser reload.

The durable note will label each link in this chain and retain enough exact configuration for
the experiment to be repeated.

## Option 1 — local Docker-only spike

Run the Sandbox image with `wrangler dev`, expose ports locally, and automate browser editing.

Advantages:

- fastest iteration;
- no DNS or certificate dependencies;
- no remote resource cleanup;
- local logs are easy to inspect.

Rejected as final evidence because the acceptance criterion names a Worker proxy and the epic
is specifically gated on Cloudflare’s sovereign runtime. Local Miniflare/container plumbing
does not prove the production Worker-to-Durable-Object-to-Container routing layer or edge
WebSocket upgrade behavior. It remains useful as a preflight if remote deployment fails.

## Option 2 — Sandbox quick tunnels

Use `sandbox.tunnels.get()` for Astro and code-server, producing two `trycloudflare.com` URLs.

Advantages:

- no custom DNS configuration;
- direct public URLs;
- documented WebSocket support;
- convenient for disposable development.

Rejected because the request path is fronted by Cloudflare Tunnel rather than the minimal
Sessions Worker proxy the architecture decision calls load-bearing. It would prove the
container and both applications, but not `proxyToSandbox()` or custom Worker routing.

## Option 3 — generated exposed-port hosts behind a wildcard Worker route

Deploy the Worker with `*.b28.dev/*` and a wildcard DNS record, call `exposePort()` for ports
4321 and 8080, and let `proxyToSandbox()` route the generated hostnames.

Advantages:

- directly follows the current SDK production deployment guide;
- supports arbitrary sandbox IDs and tokens;
- closely resembles a multi-session future.

Rejected for this spike because a blanket `*.b28.dev/*` route is larger than the ticket and
could overlap existing or concurrently created hosts. The repository’s concurrency rule says
shared surfaces should have explicit dependencies; this ticket has no dependency on stable
domain work. A zone-wide route is unnecessary risk for two deterministic hosts.

## Option 4 — custom HTTP/WS forwarding on a workers.dev path

Use `sandbox.containerFetch()` for HTTP and `sandbox.wsConnect()` for upgrades, switching on
paths such as `/preview` and `/editor` at a single workers.dev hostname.

Advantages:

- no DNS mutation;
- Worker controls routing explicitly;
- directly exercises container HTTP and WebSocket APIs.

Rejected for the acceptance run because both Astro and code-server assume origin-root assets
and WebSocket paths. A single-host path proxy would require response rewriting, cookie/path
handling, and Vite base/HMR path changes. Those mechanics are unrelated to the intended
host-per-surface architecture and would make the “minimal proxy” less minimal. Two Worker
deployments could avoid the path collision, but would no longer represent one Sessions Worker.

## Option 5 — deterministic exposed hosts with exact custom-domain routes (chosen)

Use a fixed lowercase sandbox ID and fixed valid exposure tokens:

- sandbox ID: `t004-spike`;
- preview token: `preview`;
- editor token: `editor`;
- preview port: 4321;
- editor port: 8080.

Those inputs make the SDK URL shapes deterministic:

- `4321-t004-spike-preview.b28.dev`;
- `8080-t004-spike-editor.b28.dev`.

Declare only these two exact Worker custom-domain routes. Wrangler provisions DNS and edge
certificates for those exact names. The Worker remains reachable at its unique workers.dev
hostname for a `/setup` control request. `proxyToSandbox()` runs before `/setup`, exactly as
the Sandbox docs require.

Advantages:

- uses the platform’s actual exposed-port HTTP/WS proxy;
- uses one Worker and one Sandbox;
- exercises the first-level wildcard hostname depth intended by the decision record;
- avoids a zone-wide wildcard Worker route;
- exact hostnames make Vite configuration reproducible before container build;
- cleanup is bounded to a uniquely named Worker and two exact custom domains.

Cost: it mutates remote DNS/custom-domain state temporarily. The Worker name and hosts contain
the ticket identifier, and the plan includes explicit deletion and DNS-resolution checks.

## Spike application scope

The app inside the image is intentionally smaller than the repository’s production app. It
contains:

- a minimal Astro package pinned through a generated lockfile;
- one page with a single visible marker and an element ID;
- one `astro.config.mjs` containing the exact server/HMR configuration;
- code-server installed at a pinned version;
- no application secrets, repo credentials, or account tokens.

Why a minimal app instead of cloning this repository: the question is transport feasibility,
not application feature fidelity. The production project includes Cloudflare development
bindings, D1, secret gates, and build behavior that add unrelated failure modes. The later
session-image ticket owns running the real stack with baked dependencies and Node 24.

## Sandbox image choice

Extend the published Sandbox image at the same version as the SDK used by the Worker. At the
time of the spike, the current package is `@cloudflare/sandbox@0.12.3`; use
`docker.io/cloudflare/sandbox:0.12.3`.

Install code-server at an explicit package version during image build. Install the minimal
Astro dependency with `npm ci` from its lockfile. Add `EXPOSE 4321` and `EXPOSE 8080`; although
production does not require Docker `EXPOSE`, it keeps the artifact locally runnable and makes
port intent visible.

No secret is passed as a Docker build argument or environment variable. code-server runs with
`--auth none` only for the short-lived tokenized spike URL. The note must state that this is
not the production auth design; `T-004-04-01` owns Access and origin assertion validation.

## Minimal Worker interface

The disposable Worker has only these behaviors:

- first, `await proxyToSandbox(request, env)` and return a matching response;
- `POST /setup`: obtain the fixed Sandbox; ensure the two long-lived processes are running;
  wait for both ports; expose both ports with deterministic tokens and `b28.dev` as hostname;
  return the two URLs and process states;
- `GET /status`: return process and exposed-port status for evidence/debugging;
- `POST /destroy`: destroy the Sandbox for cleanup;
- anything else: 404.

All promises are awaited. There is no mutable request state at module scope. Responses are
bounded JSON. The disposable config enables `nodejs_compat`, generated binding types, and
basic observability. This applies the current Worker best-practice guidance even though the
source itself will not be committed.

## Process startup design

Use `sandbox.startProcess()` for each long-lived service:

- Astro: `npm run dev` in `/workspace/demo`;
- code-server: bind `0.0.0.0:8080`, disable its own auth and telemetry, and open
  `/workspace/demo`.

Use stable process identifiers returned by the SDK and inspect existing processes before
starting duplicates. Wait for port readiness before exposing URLs. The `/setup` response is
idempotent enough for experimentation, but production convergence belongs to `T-004-03-02`.

## Exact Vite configuration decision

The successful target configuration is:

```js
server: {
  host: '0.0.0.0',
  port: 4321,
  strictPort: true,
  allowedHosts: ['4321-t004-spike-preview.b28.dev'],
  hmr: {
    protocol: 'wss',
    host: '4321-t004-spike-preview.b28.dev',
    clientPort: 443,
  },
}
```

`allowedHosts` is an exact hostname rather than `true` or a broad suffix. The browser connects
to public TLS on port 443, while Vite listens internally with its normal HTTP/WS service on
4321. Omitting `hmr.port` keeps the server-side HMR listener on the Astro HTTP port, allowing
the same exposed-port proxy to carry both page HTTP and the upgrade.

If observation shows Astro/Vite requires an `hmr.path`, `hmr.port`, or `origin`, any change
will be recorded as a deviation before the note declares the exact successful block.

## Browser evidence design

Use the interactive browser surface, not a direct Sandbox file API, for the acceptance edit.
Open preview and editor tabs. In the editor:

1. open `src/pages/index.astro`;
2. replace a unique marker such as `HMR BEFORE` with `HMR AFTER`;
3. save the file.

In the already-open preview, observe the marker change without navigation/reload. Inspect the
preview’s browser network/performance entries or live WebSocket state to identify a successful
`wss://4321-t004-spike-preview.b28.dev/...` connection. Capture screenshots before/after and
retain them under the ticket work directory if they do not reveal the editor exposure token
beyond the deterministic non-secret host already recorded.

The committed note records timestamps, visible markers, WebSocket URL shape/status, process
status, versions, and caveats. It does not claim sleep/wake survival.

## Persistent artifact decision

Commit a durable finding at `docs/knowledge/sandbox-session-spike.md`. It is a repository-wide
technical gate that future session tickets need, so it belongs in knowledge rather than only
inside active workflow artifacts.

The experimental Worker, Dockerfile, and mini app remain in a disposable temporary directory.
Their exact relevant contents are reproduced in the note. This avoids creating production-
looking runtime code before `T-004-03-01` and `T-004-03-02` have run their own RDSPI phases.

## Cleanup and failure policy

After evidence collection:

- call the spike’s `/destroy` endpoint if available;
- delete the uniquely named Worker with Wrangler;
- verify its workers.dev endpoint no longer serves;
- verify exact custom-domain DNS no longer resolves or no longer routes to the Worker;
- remove the temporary local directory.

If any part fails, the note reports the actual failure and the ticket cannot claim the
acceptance criterion. A documentation-only inference is not substituted for observed HMR.

## Explicitly deferred

- forced idle sleep/wake (`T-004-01-02`);
- Node 24/permanent image/cold-start budget (`T-004-03-01`);
- real repository worktree lifecycle and branded host mapping (`T-004-03-02`);
- Cloudflare Access and origin assertion enforcement (`T-004-04-01`);
- secret injection and teardown work preservation (`T-004-04-02`);
- stable demo promotion or rollback (`S-004-02`).
