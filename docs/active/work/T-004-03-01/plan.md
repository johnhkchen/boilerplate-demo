# Plan — T-004-03-01 session-container-image

## Goal

Deliver a separately deployable, Wrangler-valid Sessions Worker and a pinned Sandbox image that
starts the repository's real Astro development stack from a clean container within 60 seconds.
Retain reproducible local evidence and clearly separate it from unobserved production pull and
placement behavior.

## Preconditions and invariants

Before implementation:

- preserve every pre-existing shared-worktree modification;
- do not edit ticket `phase` or `status`;
- do not deploy, add routes, mutate DNS, or upgrade the Cloudflare account;
- do not expose or copy `.dev.vars`, `.env*`, `.git`, `.wrangler`, or credentials;
- keep stable `wrangler.jsonc` behavior unchanged;
- keep Sandbox npm/image versions identical;
- keep the 60,000 ms target unless measured evidence forces a documented revision.

Every commit uses path-scoped staging.

## Step 1 — add the Sandbox dependency

Run the package manager to add exact `@cloudflare/sandbox@0.12.3` as a production dependency.

Expected changes:

- `package.json` gains a `dependencies` section or exact entry;
- `package-lock.json` records the SDK and transitive graph;
- existing dev dependency versions remain unchanged except lockfile normalization required by
  npm itself.

Verification:

```text
npm ls @cloudflare/sandbox
```

must resolve exactly `0.12.3` with no invalid/duplicate root version.

## Step 2 — create the Sessions Worker configuration

Create `wrangler.sessions.jsonc` with:

- distinct name `demo-runway-sessions`;
- `src/session-worker.ts` entrypoint;
- current compatibility date and `nodejs_compat`;
- one Sandbox container using `Dockerfile.session` and root build context;
- `basic` instance type;
- one maximum instance;
- `Sandbox` Durable Object namespace binding;
- immutable `v1` `new_sqlite_classes` migration;
- logs/traces observability.

Do not add stable-demo assets, D1, secrets, version metadata, routes, or custom domains.

Static verification:

- parse JSONC through Wrangler rather than a plain JSON parser;
- compare binding/class names exactly;
- inspect against installed `config-schema.json` if Wrangler reports ambiguity.

## Step 3 — create the Worker entrypoint

Create `src/session-worker.ts`.

It must:

- re-export `Sandbox` from `@cloudflare/sandbox`;
- use the generated `SessionWorkerEnv` type;
- implement an `ExportedHandler<SessionWorkerEnv>` default export;
- return a passive JSON health response;
- perform no Sandbox operation and hold no mutable global state.

Verify TypeScript can resolve the SDK and Worker platform types.

## Step 4 — add session type/validation commands

Modify `package.json` scripts to include:

- `session:types` — generate `worker-configuration.sessions.d.ts`;
- `session:types:check` — ensure the generated file is current;
- `session:validate` — run session types check, `tsc --noEmit`, and Wrangler dry run using the
  separate config.

Run `session:types`, inspect the generated binding, then run `session:types:check`.

Wrangler dry run may require the Dockerfile to exist before it accepts the image path. If so,
create the Dockerfile skeleton in Step 5 before completing dry-run verification; document that
ordering adjustment in Progress rather than weakening validation.

Commit boundary A:

- package manifests;
- session config;
- session Worker entrypoint;
- generated session bindings;
- package scripts.

Commit message: `feat(session): declare Sandbox worker runtime`.

## Step 5 — create the Docker context boundary

Create `.dockerignore` before the first build.

Verify ignored sensitive paths using Docker's context/build output and source inspection. The
Dockerfile must never use `COPY .`, even with the ignore file present.

Check that every explicit Dockerfile input remains available after ignores.

## Step 6 — create the pinned image

Create `Dockerfile.session` with:

1. exact Node 24.18.0 multi-stage source;
2. exact Sandbox 0.12.3 final base;
3. exact Node version assertion;
4. architecture selection for amd64/arm64;
5. official code-server 4.127.0 release download;
6. architecture-specific SHA-256 verification before extraction;
7. package-manifest copy and `npm ci` layer;
8. explicit real-project file copies;
9. build-time version/dependency assertions;
10. workspace default and exposed 4321/8080 ports;
11. inherited Sandbox entrypoint.

Do not set auth, editor password, application secrets, git credentials, or agent credentials.

Build with:

```text
docker build --file Dockerfile.session --tag demo-runway-session:t004-03-01 .
```

If the copied official Node runtime is incompatible with the Sandbox base, stop and record the
exact linker error. The allowed fallback is an exact, checksum-verified Node binary install,
not a mutable apt channel.

## Step 7 — implement pure image-check helpers

Create `scripts/session-image-check.ts` with pure exported parsing/validation/evidence helpers
first.

Create `test/session-image-check.test.mjs` and add it to the explicit `npm test` command.

Run the targeted unit test before adding Docker orchestration:

```text
node --experimental-strip-types --test test/session-image-check.test.mjs
```

Required unit cases:

- defaults and all supported overrides;
- malformed CLI arguments;
- invalid budgets;
- port parsing variants/failures;
- exact version pass/failure;
- entrypoint pass/failure;
- stable evidence shape.

## Step 8 — implement Docker orchestration

Extend `scripts/session-image-check.ts` to:

- check Docker;
- build unless `--skip-build`;
- inspect the image entrypoint;
- query Node and code-server versions;
- start a uniquely named clean container on a random loopback port;
- run the actual root `npm run dev` in `/opt/demo-runway`;
- poll with short bounded requests;
- require HTTP 200 and a Demo Runway marker;
- calculate elapsed monotonic milliseconds;
- fail at the configured budget;
- print logs on failure;
- always remove the container;
- print machine-readable JSON on success.

Avoid `exec` with interpolated shell commands on the host. Docker command arguments remain
arrays. The only shell string runs inside the controlled image and contains no user input.

Add package scripts:

- `session:image:build`;
- `session:image:check`.

Re-run targeted tests and then all `npm test` tests.

Commit boundary B:

- `.dockerignore`;
- `Dockerfile.session`;
- image-check script;
- unit test;
- package script updates and lockfile only if required.

Commit message: `feat(session): build and verify pinned session image`.

## Step 9 — validate Wrangler config

Run:

```text
npm run session:types:check
npx tsc --noEmit
npx wrangler deploy --dry-run --config wrangler.sessions.jsonc
```

Acceptance evidence must show:

- Worker bundled successfully;
- Sandbox DO binding named `Sandbox`;
- container class named `Sandbox`;
- migration tag `v1` with `new_sqlite_classes: ["Sandbox"]`;
- image path accepted;
- no remote deployment performed.

If Wrangler dry-run builds the image, record the behavior and duration separately from session
cold readiness.

## Step 10 — run cold-start measurement

First run the check with build enabled to prove the committed Dockerfile builds.

Then run the same check with `--skip-build` if needed to isolate the cold runtime from build
duration. The authoritative `elapsed_ms` begins immediately before clean `docker run` and ends
after the first valid real-app HTTP response.

Capture:

- UTC timestamp;
- host Docker version/architecture;
- image tag or ID;
- expected/observed Sandbox, Node, and code-server versions;
- inherited image entrypoint;
- configured 60,000 ms budget;
- elapsed milliseconds;
- HTTP status and project marker;
- cleanup result.

Failure rule:

- If no valid response arrives by 60 seconds, retain logs, inspect the cause, and optimize
  immutable work before considering a budget revision.
- Revise the budget only if the ready stack is correct and an irreducible measured platform
  constraint remains. Any revision must update the decision/knowledge record and acceptance
  mapping with evidence.

## Step 11 — inspect image safety and contents

Run read-only image/container assertions:

- inspect configured entrypoint and exposed ports;
- verify `node --version`;
- verify `npm --version`;
- verify `code-server --version`;
- verify `/opt/demo-runway/node_modules` and real source exist;
- verify `.git`, `.dev.vars`, `.env`, and `.wrangler` do not exist under the baseline;
- inspect image history/metadata for secret values or unexpected build args;
- ensure no test container remains.

Use targeted names/patterns; do not dump the host environment or secret files.

## Step 12 — write evidence and durable knowledge

Create `cold-start-evidence.json` from the successful run and parse it with a JSON parser.

Create `docs/knowledge/session-image.md` with:

- the exact build/runtime contract;
- commands;
- latest local timing;
- budget definition;
- sleep/wake recovery consequence;
- security boundary;
- remote entitlement limitation;
- safe pin-upgrade procedure.

Create/update `progress.md` before proceeding. It records each completed plan step, deviations,
commit IDs, measurement, cleanup, and remaining checks.

Commit boundary C:

- evidence JSON;
- knowledge document;
- Progress artifact.

Commit message: `docs(session): record image cold-start evidence`.

## Step 13 — full verification

Run in this order:

```text
npm test
npm run session:validate
npm run typecheck
npm run build
npm run deploy:dry
git diff --check
```

The stable App Worker dry run must continue to show only its existing D1, Assets, version
metadata, application variables/secrets contract, and observability. It must not show Sandbox
or container declarations.

Run the sensitive-path/image inspection again after all image changes.

Record exact pass counts, warnings, dry-run outcome, and any environmental failures in
Progress.

## Step 14 — review against acceptance

Create `review.md` only after implementation and verification are complete.

Review must include:

- outcome first;
- acceptance criterion table;
- file-by-file change summary;
- version and architecture pins;
- local cold measurement and exact budget definition;
- Wrangler config evidence;
- unit/integration/repository test coverage;
- stable Worker non-regression;
- security/context inspection;
- commit list;
- cleanup status;
- production evidence gap;
- open concerns requiring human attention.

Critical review questions:

1. Does the image truly use Node 24 at runtime, not only in a discarded stage?
2. Does the final image retain the Sandbox entrypoint?
3. Is code-server available on both declared architectures and checksum-verified?
4. Was `npm ci` executed at build rather than cold runtime?
5. Did the real application—not a fixture—produce readiness?
6. Is elapsed time below 60,000 ms from clean container start?
7. Does Wrangler validate all three Sandbox config pieces?
8. Did stable App Worker config/output remain separate?
9. Are credentials and local state absent from context/image?
10. Is local evidence clearly distinguished from unobserved production placement?

Commit boundary D:

- final Progress update;
- `review.md`.

Commit message: `docs(session): review container image ticket`.

## Abort and recovery conditions

Stop mutation and diagnose before continuing if:

- Docker is unavailable;
- package resolution selects a Sandbox version other than 0.12.3;
- Wrangler rejects the required DO migration/config shape;
- Docker sends known secret/local-state paths into context;
- code-server digest verification fails;
- final runtime reports a non-24 Node version;
- the Sandbox entrypoint is replaced;
- the real project cannot boot from baked dependencies;
- cleanup cannot remove the measurement container;
- an unrelated concurrent edit overlaps a target file.

Remote entitlement failure is not an implementation abort because no deploy is planned. It is
a documented evidence limitation.

## Done conditions

The Plan phase is implemented when:

- all planned production/test/document files exist;
- session config types and dry run pass;
- image builds on the local arm64 Docker engine;
- exact versions and Sandbox entrypoint pass inspection;
- real Astro returns a validated response within 60 seconds from clean container start;
- evidence and budget documentation are committed;
- full existing repository verification passes or unrelated failures are precisely recorded;
- no remote or residual local resource remains;
- Review is written;
- ticket frontmatter is untouched.
