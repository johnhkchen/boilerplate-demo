# Progress — T-004-03-01 session-container-image

## Status

All RDSPI phases are complete. Implementation, evidence, verification, and Review are ready for
handoff to Lisa.

The Research, Design, Structure, and Plan artifacts are complete and committed. The ticket
frontmatter has not been edited.

## Completed phases and commits

1. Research — `96e7d8b` (`docs(session): research container image`)
2. Design — `35fb63a` (`docs(session): design container image`)
3. Structure — `73eb782` (`docs(session): structure container image`)
4. Plan — `70ff447` (`docs(session): plan container image implementation`)
5. Implementation — `87685a0` (`feat(session): build and verify pinned Sandbox image`)
6. Evidence — `93b5865` (`docs(session): record image cold-start evidence`)
7. Type-boundary fix — `8dbd25a` (`fix(session): isolate Worker type projects`)
8. Final evidence refresh — `2fcd625` (`docs(session): refresh final image evidence`)
9. Review — final ticket commit

## Implementation checklist

- [x] Add exact Sandbox SDK dependency.
- [x] Create separate Sessions Worker config and passive entrypoint.
- [x] Generate/check separate binding types.
- [x] Validate the Sessions Worker through Wrangler dry run.
- [x] Add secret-safe Docker context boundary.
- [x] Build the pinned linux/amd64 Sandbox/Node/code-server image.
- [x] Add unit-tested image check tooling.
- [x] Run the clean-container cold readiness measurement.
- [x] Inspect entrypoint, versions, ports, baked deps/source, and sensitive-path absence.
- [x] Write machine evidence and durable image documentation.
- [x] Run full repository verification.
- [x] Write Review.

## Baseline observations

- Host Node: `v26.5.0`.
- npm: `11.17.0`.
- Wrangler: `4.110.0`.
- Docker server: `29.6.1`, `aarch64`.
- Current Sandbox SDK registry version: `0.12.3`.
- Current exact Node 24 image reports `v24.18.0`.
- Selected code-server release: `4.127.0`.
- Cold readiness target: `60,000 ms` from clean container start to valid real-app HTTP 200.

## Shared-worktree boundary

Pre-existing `.lisa/provenance.jsonl`, `docs/active/demand.md`, E-004 board files, other ticket
work, and `docs/knowledge/demo-environments-decisions.md` remain unrelated and will not be
staged. Only T-004-03-01 files and intentional shared package/config files are in scope.

## Deviations

### Sandbox image architecture

The Design/Structure expected an amd64/arm64 image selected through `TARGETARCH`. The first
build proved Sandbox `0.12.3` resolves as `linux/amd64` while the development host is arm64.
Docker initially copied an arm64 Node stage into the amd64 Sandbox filesystem, and `node` could
not execute.

The image now pins both stages to `linux/amd64`, which is the actual Cloudflare Sandbox target.
Local checks run that image under Docker's amd64 emulation. The code-server arm64 branch was
removed because it cannot produce a runnable final image with the current Sandbox base. This
narrows the artifact to the deployment architecture rather than pretending it is portable.

### Node overlay npm tree

The first corrected-architecture build reached `npm ci` but npm exited during startup. Copying
`/usr/local` merges directories; the Sandbox base's older npm files remained mixed with Node
24.18.0's npm `11.16.0` files. A diagnostic invocation surfaced `Class extends value undefined
is not a constructor or null`.

The Dockerfile now removes the old npm module directory and npm/npx links before copying the
official Node runtime. After that change, `npm ci` installed 303 packages, audited 304 packages,
and found zero vulnerabilities. The final real Astro server started successfully.

### Separate TypeScript projects

Self-review found that placing both generated binding declarations in the root TypeScript
project would merge their global `Cloudflare.Env` interfaces. That could make stable App code
appear to have a Sandbox binding even though its Wrangler config does not.

`tsconfig.json` now excludes the Sessions Worker and its generated declaration while preserving
Astro's inherited `dist` exclusion. `tsconfig.sessions.json` independently checks only the
Sessions Worker and its declaration. `session:validate` uses that project. Both projects pass,
and the image copies both configs for the real repository baseline.

## Implemented files

- `wrangler.sessions.jsonc` — separate Sessions Worker; `basic` container, Sandbox DO binding,
  and `v1` SQLite migration.
- `src/session-worker.ts` — required Sandbox export plus passive health response.
- `worker-configuration.sessions.d.ts` — generated binding contains only `Sandbox`; an explicit
  empty session-secret contract prevents stable `.dev.vars` inference.
- `Dockerfile.session` — Sandbox `0.12.3`, Node `24.18.0`, code-server `4.127.0`, locked deps,
  real source, and exposed 4321/8080 ports.
- `.dockerignore` — excludes Git, secrets, Cloudflare/local state, dependencies, builds, reports,
  and docs from Docker context.
- `scripts/session-image-check.ts` — build, inspect, version, cold HTTP, budget, and cleanup
  verification.
- `test/session-image-check.test.mjs` — 9 focused tests for CLI, parsing, pin, entrypoint, and
  evidence logic.
- `package.json` / `package-lock.json` — exact SDK dependency and session commands.

## Wrangler validation

`npm run session:validate` passed:

- generated session bindings were current;
- TypeScript passed;
- Wrangler bundled 573.57 KiB (124.23 KiB gzip);
- Wrangler built the configured image;
- dry-run reported `env.Sandbox (Sandbox)` as a Durable Object;
- dry-run reported the `demo-runway-sessions-sandbox` container from `Dockerfile.session`;
- dry-run exited without deployment.

The `v1` `new_sqlite_classes: ["Sandbox"]` migration is present in the validated config.

## Cold readiness evidence

The final build+check run completed at `2026-07-11T00:20:54.809Z` after separating the App and
Sessions Worker TypeScript projects:

- budget: 60,000 ms;
- clean-container start to valid HTTP response: 4,485 ms;
- result: within budget;
- response: HTTP 200 containing `Demo Runway`;
- image: `demo-runway-session:local`, linux/amd64;
- Sandbox: expected/observed `0.12.3`;
- Node: expected/observed `v24.18.0`;
- npm: `11.16.0`;
- code-server: expected/observed `4.127.0`;
- entrypoint: `/container-server/sandbox`;
- ports: inherited 3000 plus declared 4321 and 8080;
- measurement container: removed.

An earlier skip-build preflight also passed in 4,553 ms. The committed evidence uses the final
one-command build+check result.

## Image safety inspection

A one-shot inspection verified:

- `/opt/demo-runway/.git` absent;
- `/opt/demo-runway/.dev.vars` absent;
- `/opt/demo-runway/.env` absent;
- `/opt/demo-runway/.wrangler` absent;
- baked `node_modules` present;
- real `src/pages/index.astro` present;
- image history scan found no token/password/secret/private-key marker;
- no `demo-runway-session-check-*` container remained.

The final local image size is 581,788,253 bytes. This is below the `basic` instance's 4 GB disk
but remote pull time remains unmeasured.

## Warnings

npm 11 printed its existing `allow-scripts` warning for esbuild, sharp, and workerd during image
install. The locked platform packages are present, and the real Astro/workerd development server
returned HTTP 200. No install vulnerability was reported.

The existing Astro string-form memory-session-driver deprecation warning appeared during type
check/build. It predates this ticket and remains informational. Build also selected inspector
port 9230 because the default 9229 was occupied; this did not affect output or verification.

## Full repository verification

The final combined gate passed:

- evidence JSON parse: pass;
- `npm test`: 109/109 pass, 0 failures/skips (100 existing + 9 image-check tests);
- `npm run session:validate`: session binding types current, TypeScript pass, Wrangler image
  build/config dry-run pass;
- `npm run typecheck`: 48 Astro files, 0 errors/warnings/hints; TypeScript pass; stable Worker
  bindings current;
- `npm run build`: pass;
- `npm run deploy:dry`: pass;
- `git diff --check`: pass.

The stable App Worker dry run still reports only:

- `BACKSTAGE_DB` D1;
- Assets;
- Worker version metadata;
- `DEMO_FAULT` variable.

It reports no Sandbox Durable Object or container. The two-Worker boundary is intact.

After the self-review type-project fix, the affected gates were rerun: session validation,
root typecheck (46 files, zero diagnostics), the 9 image-check tests, a fresh image build, and
the cold check all passed. The refreshed final cold measurement is 4,485 ms.

## Remaining work

None. Lisa owns ticket phase/status transitions.
