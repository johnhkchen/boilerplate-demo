# Design — T-004-03-01 session-container-image

## Decision summary

Create a separate Sessions Worker configuration and entrypoint, backed by a custom Sandbox
image that:

- extends `docker.io/cloudflare/sandbox:0.12.3`;
- overlays exact Node `24.18.0` from the official multi-architecture Node image;
- installs checksum-verified code-server `4.127.0` for amd64 and arm64;
- runs `npm ci` while building, before copying application source;
- carries a real-project baseline at `/opt/demo-runway`;
- exposes Astro port 4321 and code-server port 8080;
- preserves the Sandbox base entrypoint.

Declare one `basic` Sandbox container in `wrangler.sessions.jsonc`, with its required Durable
Object binding and `v1` SQLite-class migration. Keep this declaration out of the stable App
Worker configuration.

Add a deterministic local image check that builds the image, verifies the pins and entrypoint,
starts a clean container, launches the real repository's Astro development command, waits for
an HTTP response, and fails if readiness exceeds the existing 60-second budget.

## Decision 1 — Worker/configuration boundary

### Option A — add Sandbox declarations to root `wrangler.jsonc`

This is mechanically simple and would reuse the existing generated `CloudflareEnv`.

Rejected because root `wrangler.jsonc` is the stable public App Worker. It owns D1, assets,
production secrets, and `demo.b28.dev`. Adding a session container would violate the recorded
two-Worker architecture and unnecessarily couple public-demo deploys to Docker, Containers
entitlement, private session code, and a new Durable Object migration.

### Option B — create a nested package for the Sessions Worker

A `sessions/` package could own its own dependencies, config, lockfile, and source tree.

This gives maximum isolation, but duplicates Wrangler/TypeScript/Sandbox dependency management
and complicates the image build context. The image must bake the real root project, while a
nested Dockerfile cannot safely copy parent files without an explicit nonlocal build context.
The MVP has one repository and one session, so a second package is unnecessary ceremony.

### Option C — separate root-level config and entrypoint

Use `wrangler.sessions.jsonc` plus `src/session-worker.ts`, while sharing the root package graph.
Give it a distinct generated binding declaration.

Chosen. It preserves the deployment boundary without multiplying package graphs. Commands
must always pass `--config wrangler.sessions.jsonc`, so stable commands retain their current
behavior.

## Decision 2 — Sessions Worker surface in this ticket

### Option A — implement lifecycle endpoints now

The Worker could immediately expose cold-start, routing, logs, and teardown endpoints.

Rejected because `T-004-03-02` explicitly owns those behaviors, including isolation,
idempotency, branded routing, and WebSockets. Implementing a temporary public bootstrap route
would add an unauthenticated process-control surface and create code likely to be replaced.

### Option B — export Sandbox and expose only a passive health response

The entrypoint re-exports the SDK's `Sandbox` class as the platform requires. Its default
handler returns a small Sessions Worker health document and no Sandbox operation.

Chosen. It is sufficient for Wrangler bundling/type validation, creates the correct downstream
binding seam, and has no process-start or proxy authority. `T-004-03-02` can extend the handler
without migrating config or replacing the image contract.

## Decision 3 — instance size

Current predefined sizes relevant to this ticket are:

| Type | vCPU | memory | disk |
|---|---:|---:|---:|
| `lite` | 1/16 | 256 MiB | 2 GB |
| `basic` | 1/4 | 1 GiB | 4 GB |
| `standard-1` | 1/2 | 4 GiB | 8 GB |

### `lite`

It is the official minimal example and cheapest option. It is also the risk already called out
in the architecture decision: the intended container simultaneously runs the Sandbox server,
Node 24, Astro's workerd development runtime, Vite, and code-server. A 256 MiB ceiling leaves
little room for dependency graph load, TypeScript analysis, editor extensions, or builds.

Rejected as the permanent default. Local Docker success would not prove that a memory-starved
remote `lite` instance is viable.

### `standard-1`

It provides substantial safety margin and faster CPU, but assigns 4 GiB before the project has
production measurements. That conflicts with the scale-to-zero cost goal and right-sizing.

Rejected as the first default. It remains the escalation if an entitled production run shows
`basic` missing the cold/interactive budget.

### `basic`

Chosen. One GiB is a credible floor for the two development services, and 1/4 vCPU is four
times `lite` while preserving a small scale-to-zero footprint. The choice is conservative
relative to the unmeasured remote workload, not claimed as production-proven.

## Decision 4 — pinning Node 24

### Option A — use the Node already in the Sandbox base

Rejected. Sandbox `0.12.3` currently carries Node 22, while the ticket and CI require Node 24.
Relying on an unversioned base runtime would also make the project version implicit.

### Option B — install from a mutable package-manager channel

NodeSource or a generic `apt install nodejs` can install Node 24.

Rejected because repository/key availability becomes part of every build and the patch version
is not visible in `FROM`. A channel can advance without a Dockerfile change.

### Option C — copy exact official Node image runtime in a multi-stage build

Use `node:24.18.0-bookworm-slim` as a named stage and copy `/usr/local` into the pinned Sandbox
base.

Chosen. The patch version is explicit, Docker selects the target architecture, and the final
image preserves the Sandbox filesystem and entrypoint. The cold probe asserts `v24.18.0`, so a
tag mutation or compatibility problem is visible.

The tag is an exact semantic pin rather than a manifest digest because a single digest copied
from the arm64 development host would defeat multi-architecture builds. The observed manifest
digest is recorded in evidence; production reproducibility can move to architecture-specific
digest pins if Cloudflare's builder contract requires it.

## Decision 5 — code-server installation

### Option A — `npm install -g code-server`

Rejected. The npm registry's current package version differs from the current GitHub standalone
release, native/postinstall behavior is more variable, and a global npm install expands the
dependency resolver's role in the image.

### Option B — official install script

Rejected. It is convenient but adds a moving installer and obscures the selected asset and
checksum.

### Option C — exact standalone archives with release digests

Chosen. Docker's `TARGETARCH` selects `linux-amd64` or `linux-arm64`; unsupported architectures
fail explicitly. The archive is checked against the SHA-256 digest published in GitHub release
metadata before extraction. `/usr/local/bin/code-server` points to the pinned installation.

This follows the prior spike's successful installation shape and avoids baking credentials or
editor authentication. Authentication belongs at Cloudflare Access and the later Sessions
Worker boundary.

## Decision 6 — dependency/source layout

### Option A — run `npm ci` on every cold session

Rejected. Dependencies are immutable for a selected image/lockfile, network availability would
become a readiness dependency, and the architecture record already identifies runtime `npm ci`
as a threat to the 60-second budget.

### Option B — bake only a dependency cache tarball

This minimizes image coupling to the current source but requires downstream extraction,
node_modules linking, and version checks before the first server can start.

Rejected for this ticket's cold proof because it would not itself contain a runnable real
project. It may be useful later when provisioning arbitrary revisions with a different lockfile.

### Option C — bake a runnable baseline with layered dependencies

Chosen. Copy only package manifests, run `npm ci`, then copy the runtime project files into
`/opt/demo-runway`. Dependency layers remain cached when source changes. The baseline is:

- the exact app used by the cold proof;
- a known-good recovery/reference tree after Sandbox sleep;
- a seed that downstream lifecycle code can copy or compare.

It is not the durable mutable worktree. `T-004-03-02` still creates the selected isolated
worktree under `/workspace` and must handle revisions whose lockfile differs from the image.

## Decision 7 — Docker context boundary

Add a root `.dockerignore` that excludes secrets, Git metadata, local Cloudflare state,
dependencies, builds, reports, agent/editor state, and docs. The Dockerfile also uses explicit
`COPY` statements rather than `COPY .`.

Both measures matter:

- `.dockerignore` prevents sensitive files from entering the context sent to Docker;
- explicit copies prevent an accidentally unignored file from entering the final image.

The image includes only files needed to run and develop the actual project. It never includes
`.dev.vars`, `.env*`, `.git`, `.wrangler`, or owner credentials.

## Decision 8 — cold-start measurement

### Option A — time `docker build`

Rejected. Build/pull time is a deployment concern, not a session starting from an already built
image. Official docs say an initial local build can take minutes, which would conflate two
different budgets.

### Option B — time only the Astro child process inside an already-running container

Rejected as too narrow. It excludes container create/start and runtime initialization.

### Option C — start a new container and poll the real app

Chosen. The check:

1. verifies Docker availability;
2. optionally builds the image using the committed Dockerfile;
3. verifies the default Sandbox entrypoint by image inspection;
4. verifies Node and code-server versions in a one-shot diagnostic container;
5. starts a new clean container with the command overridden only for measurement;
6. launches `npm run dev -- --host 0.0.0.0 --port 4321` in `/opt/demo-runway`;
7. discovers Docker's random loopback host port;
8. polls `/` until HTTP 200 and checks the response is the actual Demo Runway page;
9. measures from container-start invocation to successful application response;
10. fails at 60,000 ms and prints container logs;
11. removes the measurement container in all outcomes.

Overriding the entrypoint is limited to the diagnostic because the Sandbox binary otherwise
owns process creation through its API. A separate assertion confirms the shipped image's real
entrypoint remains `/container-server/sandbox`.

## Decision 9 — evidence and durable documentation

Add `docs/knowledge/session-image.md` to document:

- exact version pins and paths;
- build/validation/check commands;
- the 60-second budget definition;
- the latest measured local result;
- production entitlement and pull/placement limitations;
- the downstream worktree/relaunch boundary.

Record the machine-readable measurement under this ticket's work directory. `progress.md` and
`review.md` will map it to acceptance.

## Decision 10 — generated types and verification

Install exact `@cloudflare/sandbox@0.12.3` as a production dependency. Add dedicated package
scripts for:

- Sessions Worker type generation/check;
- Sessions Worker dry-run validation;
- image build;
- cold image check.

Generate `worker-configuration.sessions.d.ts` without overwriting the stable App Worker type
file. The existing `typecheck` remains stable-App-focused; a session-specific validation script
composes generated type checking and Wrangler dry run.

## Acceptance interpretation

Acceptance passes locally when:

- Wrangler parses, types, and dry-runs the separate configuration with `Sandbox` container,
  binding, and `v1` migration;
- the built image retains the Sandbox entrypoint;
- the image reports Node `v24.18.0` and code-server `4.127.0`;
- the real application returns HTTP 200 from a clean container in at most 60 seconds;
- the elapsed measurement and environment are committed;
- no secret-bearing context enters the image.

Remote image pull, Cloudflare placement, production `basic` resource behavior, and production
cold readiness cannot be claimed while the account lacks Containers entitlement. The local
result validates the image and budget discipline; the limitation must remain prominent rather
than silently revising or declaring the production target proven.
