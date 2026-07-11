# Review — T-004-03-01 session-container-image

## Outcome

**The ticket is implemented and passes its acceptance criterion with local Docker evidence.**

The repository now contains:

- a separately deployable Sessions Worker configuration;
- the required Sandbox class export, Durable Object binding, and SQLite migration;
- a pinned Cloudflare Sandbox image with Node 24, code-server, locked dependencies, and the
  real project baked;
- a repeatable cold-readiness check;
- machine-readable and durable human documentation.

The final clean-container measurement reached a valid HTTP 200 from the real Demo Runway Astro
application in **4,485 ms**, inside the existing **60,000 ms** budget. The budget was not revised.

No remote deployment occurred. Production registry pull, Cloudflare placement, configured
`basic` resources, and remote cold readiness remain unobserved because the account lacks the
Workers Paid Containers entitlement.

## Acceptance criterion

Ticket criterion:

> Wrangler validates a config declaring the Sandbox class, DO binding, and migration; a cold
> session from the Dockerfile (sandbox base, Node 24 pinned, code-server and deps baked) reaches
> a ready dev server within the documented budget, or the budget is revised with recorded
> evidence.

| Clause | Evidence | Verdict |
|---|---|---|
| separate Wrangler config | `wrangler.sessions.jsonc`, `npm run session:validate` | PASS |
| Sandbox class available | `src/session-worker.ts` re-export; Wrangler bundle | PASS |
| Durable Object binding | dry run reports `env.Sandbox (Sandbox)` | PASS |
| SQLite migration | validated `v1`, `new_sqlite_classes: ["Sandbox"]` | PASS |
| container declaration | dry run reports `demo-runway-sessions-sandbox` | PASS |
| Sandbox base pinned | npm/image both exact `0.12.3`; runtime env asserted | PASS |
| Node 24 pinned | exact `24.18.0` source; runtime `v24.18.0` | PASS |
| code-server baked | `4.127.0`, published SHA-256 verified | PASS |
| dependencies baked | image-build `npm ci`; 303 packages; no runtime install | PASS |
| real project, not fixture | `/opt/demo-runway/src`; HTTP contains `Demo Runway` | PASS |
| documented budget | `docs/knowledge/session-image.md`: 60,000 ms definition | PASS |
| cold session inside budget | 4,485 ms clean-container start → valid HTTP | PASS locally |
| evidence retained | `cold-start-evidence.json` | PASS |

## Architecture delivered

The stable and session deployment boundaries remain separate:

```text
stable App Worker
  wrangler.jsonc
  -> D1 + Assets + version metadata + stable secret contract
  -> demo.b28.dev

Sessions Worker
  wrangler.sessions.jsonc
  -> Sandbox Durable Object
  -> Dockerfile.session
  -> later session lifecycle/routing in T-004-03-02
```

The stable App Worker dry run reports no Sandbox binding or container. The Sessions Worker has
no stable D1, Assets, application secret, version metadata, route, or custom-domain declaration.

## Files created

### Runtime and configuration

| File | Purpose |
|---|---|
| `.dockerignore` | Excludes Git, secrets, Cloudflare/local state, dependencies, builds, reports, docs, and agent/editor state from Docker context. |
| `Dockerfile.session` | Builds the linux/amd64 Sandbox image with exact Sandbox/Node/code-server versions, baked lockfile dependencies, real source, and ports 4321/8080. |
| `wrangler.sessions.jsonc` | Declares the separate Worker, `basic` container, Sandbox binding, `v1` migration, and observability. |
| `src/session-worker.ts` | Re-exports the SDK's Sandbox class and returns a passive health response. |
| `worker-configuration.sessions.d.ts` | Generated `SessionWorkerEnv` with only the Sandbox namespace binding. |
| `tsconfig.sessions.json` | Independently checks the Sessions Worker and generated binding declarations. |

### Verification

| File | Purpose |
|---|---|
| `scripts/session-image-check.ts` | Builds/inspects the image, verifies pins/entrypoint/ports, starts a clean real server, enforces 60 seconds, emits JSON, and always removes the container. |
| `test/session-image-check.test.mjs` | Nine tests for CLI parsing, budget validation, Docker port parsing, versions, entrypoint, and evidence serialization. |

### Documentation and evidence

| File | Purpose |
|---|---|
| `docs/knowledge/session-image.md` | Durable pins, commands, architecture, security, budget, result, sleep/wake consequences, limitations, and upgrade procedure. |
| `docs/active/work/T-004-03-01/cold-start-evidence.json` | Exact local environment, image identity, versions, 4,485 ms result, config proof, safety checks, cleanup, and limitations. |
| `docs/active/work/T-004-03-01/{research,design,structure,plan,progress,review}.md` | Complete RDSPI record and handoff. |

## Files modified

| File | Change |
|---|---|
| `package.json` | Exact Sandbox runtime dependency; session type/validation/image commands; new unit test included in `npm test`. |
| `package-lock.json` | Locks `@cloudflare/sandbox@0.12.3` and its graph. |
| `tsconfig.json` | Preserves Astro's `dist` exclusion and excludes session globals/entrypoint from the stable App project. |

No file was deleted.

Root `wrangler.jsonc`, `worker-configuration.d.ts`, application routes, stable deployment
workflow, ticket frontmatter, story, epic, and decision record were not modified by this ticket.

## Exact image contract

| Item | Final value |
|---|---|
| target platform | linux/amd64 |
| Sandbox npm/image | 0.12.3 / 0.12.3 |
| Node source/runtime | 24.18.0-bookworm-slim / v24.18.0 |
| npm runtime | 11.16.0 |
| code-server | 4.127.0 |
| code-server SHA-256 | `2684cd3237181d837e8fe8757d98096e2d050a7d1687ee68ac39dd45a7a100d9` |
| baseline project | `/opt/demo-runway` |
| default workdir | `/workspace` |
| entrypoint | `/container-server/sandbox` |
| project ports | 4321, 8080 |
| image size | 581,788,253 bytes |

The final image also reports inherited port 3000 from the Sandbox base. This project does not
use it.

## Cold-start evidence

Authoritative run: `2026-07-11T00:20:54.809Z`.

```text
host Docker:        29.6.1, aarch64
image execution:    linux/amd64 under local emulation
budget:             60,000 ms
elapsed:            4,485 ms
response:           HTTP 200
project marker:     Demo Runway found
container cleanup:  complete
```

The timer began immediately before `docker run` for a clean container and stopped after the
real Astro page returned 200 with its project marker. It includes container start, Node/npm,
Astro, Cloudflare adapter/workerd development initialization, and first rendering.

Docker build time is deliberately outside that runtime budget. Remote registry pull and
Cloudflare placement are also outside this local result and remain an explicit gap.

A prior skip-build preflight passed at 4,553 ms. The final measurement followed a fresh build of
the exact final Dockerfile after the TypeScript-project isolation fix.

## Test coverage

### Unit coverage

`npm test` passes **109/109** tests, zero failures/skips.

Nine new image-check tests cover:

- documented defaults and every supported CLI override;
- missing/unknown flags;
- zero, negative, and nonnumeric budgets;
- Docker IPv4/IPv6 published-port parsing and invalid ports;
- exact Sandbox entrypoint validation;
- Node/code-server diagnostic parsing;
- attributed version mismatches;
- incomplete diagnostics;
- stable JSON formatting.

The remaining 100 existing unit tests pass unchanged.

### Integration/configuration coverage

- real Docker image builds on the arm64 host for linux/amd64;
- release asset SHA-256 is checked during build;
- image build asserts Node, code-server, Astro deps, and real source;
- image inspection asserts architecture, Sandbox version, entrypoint, and ports;
- a clean container runs the real Astro app and returns a validated page;
- timeout and cleanup logic bound the check;
- Wrangler types generated/check passed for the Sessions Worker;
- isolated Sessions Worker TypeScript project passed;
- Wrangler session deploy dry-run bundled the Worker and built the image;
- root App TypeScript/Astro checks passed independently;
- stable App Worker deploy dry-run passed independently.

### Full repository verification

- evidence JSON parse: pass;
- `npm test`: 109/109 pass;
- `npm run session:validate`: pass;
- `npm run typecheck`: 46 App-project files, zero diagnostics; stable bindings current;
- `npm run build`: pass;
- `npm run deploy:dry`: pass;
- `git diff --check`: pass after correcting one documentation trailing space found by the final
  combined gate.

The existing Astro memory-session-driver deprecation warning remains informational. npm 11's
`allow-scripts` review warning for esbuild/sharp/workerd also remains; platform packages were
present and the actual workerd-backed dev server passed.

## Security review

The final image inspection verified absence of:

- `/opt/demo-runway/.git`;
- `.dev.vars`;
- `.env`;
- `.wrangler`.

It verified baked dependencies and real source are present. Image history contained no matched
token/password/secret/private-key marker. No environment dump or secret value entered evidence.

The Sessions Worker explicitly declares no current secrets, which prevents stable App Worker
local keys from being inferred into generated session bindings. Later session credentials must
be injected at launch, never added to the Dockerfile.

## Self-review findings resolved

### Sandbox base architecture

The planned multi-architecture build was incorrect for the actual base. Sandbox `0.12.3`
resolved as amd64; an arm64 Node stage produced a non-executable final binary. Both stages now
pin the Cloudflare target architecture. The artifact no longer claims unsupported arm64 output.

### npm overlay merge

Copying Node's `/usr/local` initially merged two npm installations and npm failed before
resolution. The Dockerfile now removes the old npm tree/links before overlay. The corrected
image installs the lockfile and starts the real server.

### Worker type namespace isolation

Both generated declarations initially entered one TypeScript project, allowing global
`Cloudflare.Env` namespace merging. Separate App/Session TypeScript projects now prevent the
stable App type surface from acquiring a nonexistent Sandbox binding. Both projects pass.

## Commits

1. `96e7d8b` — Research.
2. `35fb63a` — Design.
3. `73eb782` — Structure.
4. `70ff447` — Plan.
5. `87685a0` — Sessions Worker, pinned image, checker, and tests.
6. `93b5865` — initial cold evidence, knowledge, and Progress.
7. `8dbd25a` — isolate stable/session TypeScript projects.
8. `2fcd625` — refresh final image evidence and documentation.
9. Final Review commit — this artifact and completed Progress.

All commits used path-scoped staging. Pre-existing Lisa/user worktree changes remain unstaged.

## Cleanup

- every measurement container was removed;
- no `demo-runway-session-check-*` container remains;
- no Worker/container image was pushed to Cloudflare;
- no route, DNS record, custom domain, secret, account plan, or stable resource changed;
- local tagged images remain as non-running build outputs for repeatable development checks.

## Open concerns

### 1. Workers Paid Containers entitlement — human action required

The account still cannot run Containers remotely. Enabling a paid plan is a financial action and
was correctly not attempted. Production acceptance for the larger epic remains gated on this.

### 2. Production cold start and sizing

The 4,485 ms result excludes registry pull and placement and runs with local amd64 emulation, not
the configured remote `basic` limits. After entitlement, measure first placement and warm/cold
wake on `basic`. Escalate to `standard-1` only from evidence.

### 3. Image size and pull latency

The image is about 582 MB. It fits `basic` disk, but remote pull time is unknown. If production
misses 60 seconds, inspect image layers and unnecessary development tools before revising the
budget.

### 4. Revision/dependency mismatch

The baked dependencies match this image's lockfile. `T-004-03-02` can provision another commit;
it must detect a different lockfile and choose a bounded install/rebuild strategy rather than
silently reusing incompatible modules.

### 5. Durable work and service supervision

This image does not solve the proven sleep/wake state loss. The next lifecycle must restore the
worktree and idempotently start both services before returning ready. Container-internal
supervision cannot survive a fresh-container wake by itself.

### 6. Editor authentication and routes

code-server is installed but not automatically started or configured with auth. Cloudflare
Access, origin assertion, branded routing, WebSocket proxying, and safe launch arguments belong
to `T-004-03-02`/`T-004-04-01`. Do not expose code-server with `--auth none` remotely.

## Handoff

The image/config foundation is ready for `T-004-03-02`. That ticket can import the generated
`SessionWorkerEnv`, call the Sandbox SDK, restore an isolated worktree under `/workspace`, and
start Astro/code-server without changing the image's version, binding, migration, ports, or
entrypoint contract.

The ticket frontmatter remains untouched for Lisa to transition automatically.
