# Collaborative session image

**Ticket:** `T-004-03-01`  
**Validated:** 2026-07-10 (America/Los_Angeles) / 2026-07-11 UTC  
**Local cold readiness:** **4,430 ms against a 60,000 ms budget**  
**Production cold readiness:** **not yet observed — Containers entitlement required**

This is the durable build and readiness contract for the one-session Sandbox image. It
complements `sandbox-session-spike.md` and `sandbox-sleep-wake-spike.md`.

## Boundary

The repository has two independent Workers:

```text
wrangler.jsonc          -> public stable App Worker -> demo.b28.dev
wrangler.sessions.jsonc -> private Sessions Worker  -> Sandbox container
```

The App Worker remains static-first and owns D1, Assets, release metadata, stable secrets, and
the public hostname. It has no Sandbox binding.

The Sessions Worker owns the Sandbox class, container declaration, Durable Object namespace,
and migration. `T-004-03-02` adds lifecycle commands, isolated worktrees, branded routes, and
WebSocket proxying. This image ticket exposes no process-control API.

## Exact pins

| Component | Pin | Verification |
|---|---|---|
| Sandbox npm SDK | `@cloudflare/sandbox@0.12.3` | exact package dependency + lockfile |
| Sandbox base | `docker.io/cloudflare/sandbox:0.12.3` | final `SANDBOX_VERSION` |
| Sandbox digest observed | `sha256:23f67e16131b780865a5fa5aa3c8607408a730105c248836409f4e02bb6bf042` | Docker resolution |
| Node source | `node:24.18.0-bookworm-slim` | exact Docker stage |
| Node digest observed | `sha256:cb4e8f7c443347358b7875e717c29e27bf9befc8f5a26cf18af3c3dec80e58c5` | Docker resolution |
| Runtime Node | `v24.18.0` | build assertion + image check |
| Runtime npm | `11.16.0` | image check |
| code-server | `4.127.0` | build assertion + image check |
| code-server archive | SHA-256 `2684cd3237181d837e8fe8757d98096e2d050a7d1687ee68ac39dd45a7a100d9` | checked before extraction |
| Wrangler | `4.110.0` | Sessions Worker dry run |

The SDK and Sandbox base versions must remain identical. Upgrade them together.

## Architecture

The final image targets `linux/amd64`.

Sandbox `0.12.3` resolved as an amd64 base during the local build. The development Docker host
is arm64, so checks use Docker's amd64 emulation. This is deliberate: copying the host's arm64
Node stage into the amd64 Sandbox filesystem produced a non-executable binary during the first
build attempt.

Do not add an arm64 code-server branch unless Cloudflare publishes and supports a compatible
arm64 Sandbox base. A nominal multi-architecture Dockerfile is not useful if its final transport
runtime supports only one architecture.

## Node overlay

The Sandbox base includes an older Node/npm installation. `Dockerfile.session` overlays exact
Node 24 from the official image.

Docker `COPY` merges directories; it does not replace them. The image removes the base's npm
module tree and npm/npx links before copying `/usr/local` from Node 24. Without that removal,
files from two npm releases coexist and npm fails during startup with a class-inheritance error
before dependency resolution.

The Dockerfile asserts Node 24 immediately after the overlay and after project assembly.

## Image filesystem

The baked baseline lives at `/opt/demo-runway`. It contains:

- the exact `package.json` and `package-lock.json`;
- installed `node_modules` from image-build-time `npm ci`;
- the real application `src/` tree;
- migrations and Astro/TypeScript/Wrangler configs;
- generated App and Sessions Worker binding declarations;
- repository operational scripts.

The container starts with:

```text
WORKDIR /workspace
ENTRYPOINT ["/container-server/sandbox"]
```

The entrypoint is inherited from the Sandbox base and must not be replaced. The SDK uses it to
execute commands, manage files/processes, and proxy container traffic.

The baked tree is a runnable baseline and recovery seed. It is not mutable session truth.
Downstream lifecycle code creates/restores the chosen revision under `/workspace` before
reporting ready.

## Ports

| Port | Service | Owner |
|---:|---|---|
| 4321 | Astro/Vite development server | later lifecycle starts it |
| 8080 | code-server browser IDE | later lifecycle starts it |
| 3000 | inherited Sandbox base declaration | unused by this project |

Explicit `EXPOSE 4321 8080` declarations are required for local Wrangler forwarding. Services
must bind to `0.0.0.0` when the Sessions Worker proxies them.

## Build-context security

`.dockerignore` excludes:

- `.git` and source-control metadata;
- `.dev.vars`, `.env`, and variants;
- `.wrangler` state and `.promote` records;
- host dependencies and build output;
- browser reports/traces;
- Lisa/editor/OS state;
- documentation and ticket artifacts.

The Dockerfile also uses explicit `COPY` operations rather than `COPY .`. Sensitive files do
not enter Docker context, and unlisted files do not enter the final image.

No Cloudflare token, account identifier, signing key, passcode, editor password, Git
credential, or agent credential is baked. Runtime/session secrets belong to later launch
injection.

## Commands

Generate and check the separate binding contract:

```bash
npm run session:types
npm run session:types:check
```

Validate TypeScript and Wrangler without deploying:

```bash
npm run session:validate
```

Build only:

```bash
npm run session:image:build
```

Build, inspect, start a clean container, measure the real dev server, and clean up:

```bash
npm run session:image:check
```

Re-check an existing image without rebuilding:

```bash
npm run session:image:check -- --skip-build --image demo-runway-session:local
```

The check never deploys and passes no host environment variables into the container.

## Wrangler contract

`wrangler.sessions.jsonc` declares:

```jsonc
"containers": [{
  "class_name": "Sandbox",
  "image": "./Dockerfile.session",
  "image_build_context": ".",
  "instance_type": "basic",
  "max_instances": 1
}],
"durable_objects": {
  "bindings": [{ "name": "Sandbox", "class_name": "Sandbox" }]
},
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["Sandbox"] }]
```

The Worker module re-exports `Sandbox`. Generated `worker-configuration.sessions.d.ts` contains
only that binding. An explicit empty session-secret declaration stops Wrangler from inferring
the stable App Worker's local `.dev.vars` keys into the separate Worker.

`basic` supplies 1/4 vCPU, 1 GiB memory, and 4 GB disk. It is selected over `lite` because the
session co-locates Sandbox transport, workerd/Astro/Vite, and code-server; `lite` provides only
256 MiB. Production sizing remains unproven until an entitled remote run.

## Cold-start budget

The target remains 60 seconds.

The timer begins immediately before Docker creates/starts a clean container from an already
built image. It ends only when:

1. `npm run dev -- --host 0.0.0.0 --port 4321` runs from `/opt/demo-runway`;
2. the random loopback port answers HTTP 200;
3. the response contains the real project's `Demo Runway` marker.

This includes container creation/start, Node/npm/Astro startup, Cloudflare adapter development
initialization, workerd startup, and first page rendering.

It excludes Docker image build. Building/pushing an immutable image is deployment work, not a
session waking from a provisioned image. It also excludes remote registry pull and Cloudflare
placement because those require an entitled account.

## Latest evidence

The authoritative local run at `2026-07-11T00:14:41.685Z` recorded:

| Observation | Result |
|---|---|
| Budget | 60,000 ms |
| Clean start to valid HTTP | **4,430 ms** |
| Within budget | yes |
| HTTP / marker | 200 / `Demo Runway` found |
| Sandbox / Node / npm | 0.12.3 / v24.18.0 / 11.16.0 |
| code-server | 4.127.0 |
| Entrypoint | `/container-server/sandbox` |
| Host / image | arm64 Docker 29.6.1 / emulated linux/amd64 |
| Cleanup | measurement container removed |

A prior skip-build preflight measured 4,553 ms. Both are far below 60 seconds. The budget was
not revised. Machine evidence is in
`docs/active/work/T-004-03-01/cold-start-evidence.json`.

## Sleep/wake consequence

The Phase 0 idle experiment proved the next request after Sandbox sleep gets a fresh container:
processes, ordinary files, source edits, and shell state do not survive.

This image makes fresh service launch fast, but does not make workspace state durable.
`T-004-03-02` must:

1. detect actual runtime health;
2. restore/provision the selected worktree before readiness;
3. start Astro and code-server idempotently;
4. wait for both ports before proxying collaborators;
5. persist uncommitted work before sleep/destroy;
6. expose restoring/starting/failure states rather than stale ready state.

## Production limitation

The current account lacks Workers Paid Containers entitlement. No plan upgrade was attempted.
This ticket therefore does not claim measurements for:

- registry upload or remote image pull;
- Cloudflare placement/provisioning delay;
- `basic` CPU/memory/disk behavior;
- production cold readiness;
- remote sleep/wake of this exact image.

The local result proves the committed image, pins, dependency bake, real stack, config, and
runtime budget under Docker. Once entitlement exists, append an equivalent platform cold run;
do not replace the local evidence.

## Upgrade procedure

For a Sandbox upgrade:

1. choose an exact `@cloudflare/sandbox` version;
2. set the Docker base to the identical version;
3. verify published architecture and digest;
4. update the dependency lock and generated session types;
5. rebuild without cache at least once;
6. rerun Wrangler dry run and the cold image check;
7. verify entrypoint, ports, image size, and sensitive-path absence;
8. record new local and production evidence.

For Node or code-server, update exact versions and published checksums together. Never replace
checksum verification with a mutable installer or unpinned package channel.

## Known warning

npm 11 reports its `allow-scripts` review warning for esbuild, sharp, and workerd. The lockfile's
platform packages are present, and the actual Astro/workerd dev server returned HTTP 200. Treat
a future missing native binary as a build/readiness failure; do not blanket-approve scripts
without reviewing the packages.
