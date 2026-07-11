# Research — T-004-03-01 session-container-image

## Ticket contract

The ticket starts in `phase: research` and asks for the permanent session container image and
Wrangler Containers declaration. Its single acceptance criterion has two linked halves:

1. Wrangler validates a Sessions Worker configuration containing the Sandbox class, Durable
   Object binding, and SQLite migration.
2. A cold container built from the Dockerfile reaches a ready instance of this repository's
   real development server within the documented budget, or the budget is revised with
   recorded evidence.

The ticket explicitly requires:

- a Cloudflare Sandbox base image;
- Node 24 pinned in the image;
- code-server baked into the image;
- project dependencies baked into the image;
- cold-start evidence rather than an untested Dockerfile.

The ticket advances P4 (browser-based collaboration without local setup) and P6 (a sovereign,
Cloudflare-first runtime with no owner-managed host).

## Parent architecture

`docs/knowledge/demo-environments-decisions.md` is the binding architecture record.

The stable public demo and collaborative sessions are separate Workers:

```text
demo.b28.dev        -> App Worker (public, immutable promoted build)
demo-<slug>.b28.dev -> Sessions Worker (Access) -> Sandbox Astro dev server
code-<slug>.b28.dev -> Sessions Worker (Access) -> Sandbox code-server
```

The stable App Worker must remain independent of session authentication, routing, container
lifecycle, and failure. The Sandbox is only the ephemeral session runtime and never owns or
mutates the stable public demo.

The decision record names a 60-second cold-start target. Its original risk statement expected
the first hit to pull an image, run `npm ci`, and boot the development server. It specifically
suggests baking dependencies and/or pre-warming so runtime installation does not consume the
budget.

## Downstream ownership boundary

`T-004-03-02` depends on this ticket. It owns:

- `up`, `status`, `logs`, and `down` session lifecycle operations;
- isolated worktree provisioning at a selected revision;
- starting and supervising Astro plus code-server;
- branded preview/editor hostname routing;
- HTTP and WebSocket proxying;
- idempotent convergence.

This ticket therefore supplies the executable environment and valid platform configuration.
It does not need to implement the complete public lifecycle or routing API.

## Phase 0 findings that shape this image

`T-004-01-01` used Sandbox SDK and image `0.12.3`, Wrangler `4.110.0`, Astro `7.0.7`, and
code-server `4.127.0`.

That spike demonstrated locally that one Sandbox can run Astro and code-server together.
Astro reached ready 1,182 ms after its process was started. The code-server HTTP surface also
became reachable. A Worker proxied Astro HTTP and a real Vite HMR WebSocket successfully.

The spike image used the Sandbox base's Node 22 runtime. It deliberately left Node 24 and the
real repository image to this ticket.

The spike could not deploy remotely because the authenticated Cloudflare account lacks the
Workers Paid plan required by Containers. The OAuth grant had Containers scope; entitlement,
not authentication, was the blocker.

`T-004-01-02` then forced a local ten-minute Sandbox idle transition. The next request started
a fresh container:

- managed processes were gone;
- Astro and code-server ports were closed;
- ordinary `/workspace` writes were gone;
- source changes reverted to the baked image;
- shell state was gone.

Both services could be relaunched from the baked image in 4,090 ms. This makes the image the
recovery baseline, not just a one-time installation artifact.

The same Sandbox ID is a durable routing identity, but not durable process or filesystem
state. Downstream readiness must eventually restore a workspace and relaunch services before
reporting ready.

## Existing repository runtime

The repository is an Astro application using the Cloudflare adapter.

Relevant root files are:

- `package.json` — scripts and dependency contract;
- `package-lock.json` — deterministic dependency graph;
- `astro.config.mjs` — Astro/Cloudflare development configuration;
- `tsconfig.json` — Astro TypeScript base;
- `src/` — application pages, API routes, libraries, styles, and layouts;
- `migrations/` — D1 schema used by the application;
- `wrangler.jsonc` — stable App Worker configuration;
- `worker-configuration.d.ts` — generated stable Worker bindings;
- `scripts/`, `test/`, and `tests/` — operational and verification tooling.

`package.json` currently declares Node `>=22.12.0`, Astro `^7.0.7`, Wrangler `^4.110.0`, and
the Cloudflare adapter `^14.1.2`. The lockfile is the reproducible source used by `npm ci`.

The normal development command is `npm run dev`, which delegates to `astro dev`. The real
application imports Cloudflare bindings through the adapter's workerd development path.

The repository currently runs on host Node `26.5.0`, while CI and the session architecture
standardize on Node 24. The current official `node:24-bookworm-slim` manifest resolved locally
to Node `v24.18.0` on 2026-07-10.

## Stable App Worker boundary

Root `wrangler.jsonc` configures the public `demo-runway` App Worker. It includes:

- the `demo.b28.dev` custom domain;
- Workers Static Assets;
- D1 for backstage entries;
- version metadata;
- application secret declarations;
- logging and trace observability.

It does not declare a Sandbox class, container, session Durable Object, or session migration.
Adding those declarations directly would couple the public App Worker to the private session
runtime and conflict with the recorded two-Worker architecture.

The repository has no session Worker entrypoint, session Wrangler config, Dockerfile, or
Docker build ignore file today.

## Current Sandbox platform contract

The current official Sandbox getting-started documentation shows three required configuration
parts:

```jsonc
"containers": [{
  "class_name": "Sandbox",
  "image": "./Dockerfile",
  "instance_type": "lite",
  "max_instances": 1
}],
"durable_objects": {
  "bindings": [{ "class_name": "Sandbox", "name": "Sandbox" }]
},
"migrations": [{ "new_sqlite_classes": ["Sandbox"], "tag": "v1" }]
```

The Worker entrypoint must re-export `Sandbox` from `@cloudflare/sandbox`. Code that later
creates sessions will obtain the binding as a `DurableObjectNamespace<Sandbox>`.

The installed Wrangler `4.110.0` schema recognizes:

- `containers[].class_name`;
- `containers[].image`;
- `containers[].image_build_context`;
- `containers[].instance_type` including `lite`, `basic`, and `standard` variants;
- `containers[].max_instances`;
- Durable Object bindings;
- `new_sqlite_classes` migrations.

The official Sandbox documentation requires the npm package version and Docker base image
version to match. The current registry version is `@cloudflare/sandbox@0.12.3`, matching the
version already exercised by both spikes.

The Sandbox base preserves `/container-server/sandbox` as its platform entrypoint. Extending
that base retains the SDK transport server. Local development requires Docker and requires
each application port to appear in Dockerfile `EXPOSE` directives.

## Image inputs and pins

The image needs two independent versioned runtimes:

1. Cloudflare's Sandbox transport/runtime.
2. Node 24 for this project's application and tools.

The official Node multi-architecture image can supply `/usr/local` in a multi-stage build.
Using the exact `node:24.18.0-bookworm-slim` patch tag records the Node version while allowing
Docker to resolve the appropriate target architecture.

The Sandbox base is pinned as `docker.io/cloudflare/sandbox:0.12.3`, matching the npm SDK.

The prior spike used code-server `4.127.0`. GitHub's official release metadata publishes:

- linux-amd64 SHA-256 `2684cd3237181d837e8fe8757d98096e2d050a7d1687ee68ac39dd45a7a100d9`;
- linux-arm64 SHA-256 `957755006866ed53c8bbcf22452b1522f9c26b85a68f93c593e74600817574d0`.

The local Docker engine is `29.6.1` on `aarch64`, so a testable Dockerfile must handle arm64.
Cloudflare deployment may build or run amd64, so the image definition cannot be host-only.

## Dependency and source placement

`npm ci` requires `package.json` and `package-lock.json`. Running it during image build creates
a deterministic `node_modules` layer that can be cached separately from source changes.

The cold proof must run the real project, not a minimal Astro fixture. The image therefore
needs the files consumed by `npm run dev`, including the application source, Astro config,
TypeScript config, Wrangler config, generated Worker binding declarations, and migrations.

The future lifecycle will create a selected worktree. A baked baseline under a neutral path
can serve both as cold-proof workspace and as a dependency/source seed. Mutable session work
still belongs under `/workspace`, which the Sandbox lifecycle treats as ephemeral.

## Build-context security

The current `.gitignore` excludes local secrets and generated state from Git, but Docker build
context is independent of Git tracking. The repository currently lacks `.dockerignore`.

Potentially sensitive or irrelevant context includes:

- `.git/` history and configuration;
- `.dev.vars` and `.env*` local secret files;
- `.wrangler/` credentials/cache/state;
- `.promote/` local deployment records;
- existing `node_modules/` and `dist/`;
- Playwright traces and reports;
- Lisa and editor-local state;
- documentation and work artifacts not needed by the runtime.

The prior spike explicitly kept `.git`, `.dev.vars`, and Wrangler credentials out of its
image. The permanent build needs the same boundary.

## Validation surfaces

Wrangler configuration validation can be exercised without changing remote state by using
the separate config for:

- generated binding types;
- `wrangler deploy --dry-run`;
- local `wrangler dev` when a full Sandbox API check is needed.

Image validation has distinct questions:

- Does the image build on the developer's architecture?
- Does the default image retain the Sandbox entrypoint?
- Does it report Node 24?
- Does it report the pinned code-server version?
- Are locked project dependencies already present?
- Can the real `npm run dev` reach TCP readiness on port 4321 from a cold container?
- Does readiness occur inside 60 seconds after container creation/start?

Docker build time is separate from session cold-start time. Official documentation notes a
first local image build can take two to three minutes. The ticket's runtime target concerns a
session starting from the built image, not downloading/building all image layers.

## Existing verification conventions

The project exposes:

- `npm test` for Node unit tests;
- `npm run typecheck` for Astro, TypeScript, and generated stable Worker types;
- `npm run build` for the production Astro build;
- `npm run deploy:dry` for the stable App Worker dry run;
- `npm run verify` for the larger combined gate.

The repository generates Worker types rather than maintaining handwritten binding interfaces.
A second config therefore requires its own generated type output or an explicit command that
does not overwrite the stable App Worker declaration.

## Worktree and process constraints

The shared worktree already contains Lisa/user changes and untracked E-004 board material.
Those files are outside this ticket and must not be staged or rewritten. The ticket file's
`phase` and `status` remain under Lisa's control.

The RDSPI workflow requires incremental commits during implementation. Path-scoped staging is
needed so commits contain only this ticket's artifacts and implementation.

## Research conclusions (descriptive)

- The session runtime is a separate Worker/configuration boundary.
- Sandbox SDK and image version `0.12.3` are current and already locally exercised.
- Wrangler `4.110.0` supports every required container/DO/migration field.
- The fixed target is 60 seconds from a built image to ready real dev server.
- The image is also the wake recovery baseline because sleep discards processes and files.
- Runtime `npm ci` would repeat immutable work and consume the cold budget.
- Node 24 and code-server need explicit, multi-architecture pins.
- Docker context needs a secret-safe allow/deny boundary independent of `.gitignore`.
- Remote production cold-start evidence is unavailable until the account gains Containers
  entitlement; local cold-container evidence remains possible with Docker.
