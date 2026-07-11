# Plan — T-004-03-02 one-session-lifecycle-and-routing

## Goal

Deliver a validated one-session Sessions Worker whose owner commands converge an isolated Git
worktree and two managed services, and whose exact branded domains proxy HTTP and WebSocket
traffic to those services.

The implementation must leave the ticket frontmatter and stable App Worker unchanged, preserve
unrelated dirty-worktree files, and record every verification limitation honestly.

## Acceptance decomposition

The ticket acceptance criterion is complete only when the repository demonstrates:

1. `up` accepts an immutable chosen revision;
2. it provisions `/workspace/session` as an isolated detached Git worktree at exactly that SHA;
3. it starts Astro and code-server from the worktree;
4. it waits for ports 4321 and 8080 before reporting ready;
5. repeated `up` for the same SHA preserves the worktree and avoids duplicate services;
6. a conflicting SHA is refused rather than overwriting active work;
7. `status` reports desired and actual runtime state;
8. `logs` returns bounded stdout/stderr for both named services;
9. `down` destroys the one Sandbox and clears desired state;
10. `demo-session.b28.dev` proxies HTTP and WebSocket requests to 4321;
11. `code-session.b28.dev` proxies HTTP and WebSocket requests to 8080;
12. exact Custom Domains do not intercept stable `demo.b28.dev`;
13. generated bindings, TypeScript, and Wrangler config validate;
14. unit tests cover request/validation/convergence helpers and the owner CLI;
15. open Access, durability, paid-account, and remote transport concerns are documented.

## Step 1 — Establish a clean path-scoped baseline

Actions:

1. Record `git status --short`.
2. Confirm existing modifications/untracked files belong to Lisa/user/other tickets.
3. Confirm no existing `docs/active/work/T-004-03-02/progress.md` or implementation files were
   created by another process after Structure.
4. Run the current targeted baseline:
   - `npm test`;
   - `npm run session:validate`.
5. Record failures that predate this ticket before making implementation changes.

Verification:

- baseline test counts and validation outcome are known;
- only ticket paths will be staged;
- no ticket frontmatter change appears in the staged diff.

Commit: none; this is diagnostic evidence for Progress.

## Step 2 — Add the pure session contract

Create `src/lib/session-lifecycle.ts` with constants, types, validators, control/host
classification, URL generation, bounded-log helpers, fixed command builders, generated Astro
config, and JSON/error helpers.

Implementation details:

1. Define fixed paths, ports, process IDs, identities, timeouts, and storage key.
2. Keep the provision program a constant multi-line string.
3. Pass repository URL and revision to that program through environment variables only.
4. Validate revisions as exact lowercase SHA-1 strings.
5. Parse runtime config once per request from generated Worker variables.
6. Use exact host equality, never suffix-only matching.
7. Make log truncation retain the tail because recent diagnostics are most actionable.
8. Generate Astro config with a JSON-encoded host string and a constant import target.
9. Normalize public errors to stable codes and bounded messages.

Create the first part of `test/session-lifecycle.test.mjs` concurrently with each helper.

Verification:

- `node --experimental-strip-types --test test/session-lifecycle.test.mjs`;
- `npx tsc --noEmit --project tsconfig.sessions.json` is expected to remain unchanged until
  the Worker imports the module, so direct test import is the primary check here;
- inspect the provision command to ensure it contains no input interpolation.

Atomic commit:

```text
feat(session): define lifecycle contracts
```

## Step 3 — Declare the coordinator and exact domains

Modify `wrangler.sessions.jsonc`:

1. add `SESSION_SLUG`, `SESSION_DOMAIN`, and `SESSION_REPOSITORY_URL` vars;
2. add exact `demo-session` and `code-session` Custom Domains;
3. add `SESSION_COORDINATOR` binding;
4. append migration `v2` for `SessionCoordinator`;
5. retain all Sandbox/container/image/observability settings.

Add a minimal exported `SessionCoordinator` class to `src/session-worker.ts` at the same time so
Wrangler can resolve the binding. Extend the handler only enough to compile against the new
generated variables.

Run `npm run session:types` to regenerate `worker-configuration.sessions.d.ts`.

Verification:

- generated declarations contain both DO namespaces and all three variables;
- migration `v1` remains byte-for-byte semantically intact;
- routes list only the two exact session hosts;
- `npm run session:types:check`;
- `npx tsc --noEmit --project tsconfig.sessions.json`;
- `npx wrangler deploy --dry-run --config wrangler.sessions.jsonc`.

Atomic commit:

```text
feat(session): declare coordinator and branded domains
```

## Step 4 — Implement durable lifecycle state and serialization

Expand `SessionCoordinator`:

1. add a small mutation-tail queue for `up`/`down`;
2. read/write/delete one versioned `SessionRecord` in DO storage;
3. obtain the fixed Sandbox with `normalizeId: true`, `keepAlive: true`, and no implicit default
   session;
4. persist `provisioning`, `ready`, `failed`, and `stopping` transitions;
5. include timestamps and a bounded safe failure message;
6. return stable operation-result unions instead of throwing application conflicts.

Concurrency verification:

- repeated queued `up` sees the result of the prior call;
- `down` cannot destroy the Sandbox halfway through an accepted `up`;
- status/log reads may observe `provisioning` but never rely on module-level state;
- no `blockConcurrencyWhile()` wraps Sandbox I/O;
- the mutation tail absorbs rejection and remains usable for the next action.

Extend tests for result mapping and failure normalization where pure seams apply.

Verification:

- targeted unit tests;
- session TypeScript;
- inspect every storage transition and external promise for `await`/return handling.

No standalone commit yet if lifecycle cannot provision; combine with Step 5 as one coherent
runtime unit.

## Step 5 — Implement exact worktree provisioning

Implement `provisionWorkspace()` using `sandbox.exec()` and the fixed program.

Program behavior:

1. if worktree exists, resolve its current `HEAD`;
2. if it equals `SESSION_REVISION`, leave it and all edits untouched;
3. if it differs, exit with a dedicated conflict code/message;
4. if absent, remove only incomplete fixed session paths;
5. `git init --bare /workspace/repository.git`;
6. add the quoted HTTPS origin;
7. fetch only the full validated commit with depth one;
8. add a detached worktree at `FETCH_HEAD`;
9. verify the exact resulting SHA;
10. compare package and lock files against `/opt/demo-runway`;
11. symlink baked `node_modules` for an exact dependency-contract match;
12. otherwise run bounded `npm ci` in the worktree;
13. emit a short machine-readable convergence marker on stdout.

After the program succeeds, write the generated Astro config to the fixed path outside the
worktree. Do not use shell `printf` for generated JavaScript.

Failure handling:

- include only bounded stderr/stdout tails in the stored public error;
- log an operation/category summary, not the repository URL or complete command output;
- leave a failed record available to `status`/`logs`;
- a later same-revision `up` may repair incomplete fixed paths.

Verification:

- command-builder unit invariants;
- generated-config syntax/content test;
- TypeScript signatures match installed Sandbox 0.12.3 declarations;
- no `any`, double cast, or internal SDK client appears.

## Step 6 — Reconcile Astro and code-server

Implement named process reconciliation:

1. list processes from the current Sandbox generation;
2. find `astro-dev` and `code-server` by exact ID;
3. refresh status with `getStatus()`;
4. reuse only `running` processes;
5. kill stale records defensively and start the fixed command with the same process ID;
6. set `autoCleanup: false` so failed logs remain inspectable;
7. set fixed cwd and no secret environment;
8. wait for HTTP 200–399 on Astro `/` and TCP/HTTP readiness for code-server;
9. use 60,000 ms maximum per readiness check;
10. inspect both processes again before storing `ready`.

Return a `changed` flag if provisioning or either process start changed runtime state.

Implement `status()`:

- desired record or `idle`;
- actual process snapshots;
- container placement ID if observed;
- exact URLs only when a desired record exists.

Implement `logs()`:

- absent-safe process lookup;
- 32 KiB tail bounds per stdout/stderr;
- truncation booleans and current status;
- no streaming in the control API.

Implement `down()`:

- serialize after mutations;
- mark stopping;
- call `sandbox.destroy()`;
- delete desired record only after success;
- return idempotent success if no record exists, while still attempting fixed Sandbox cleanup
  only when appropriate.

Verification:

- targeted helper tests;
- TypeScript and dry run;
- review process commands and readiness API signatures against installed declarations.

Atomic commit for Steps 4–6:

```text
feat(session): reconcile worktree and services
```

## Step 7 — Implement control and proxy routing

Expand the default Worker handler:

1. parse runtime config with a safe 500 if deploy variables are invalid;
2. obtain the fixed coordinator stub with `getByName()`;
3. dispatch exact control paths/methods;
4. parse `up` JSON with a bounded body assumption (small operator payload);
5. map operation results to their status codes;
6. reject unsupported control methods with 405 and `Allow`;
7. classify exact preview/editor hostnames;
8. overwrite an internal proxy-target header;
9. forward proxy traffic to `SessionCoordinator.fetch()`;
10. return health only for `/` on a non-branded/non-control host;
11. return JSON 404 for all other traffic.

Implement coordinator `fetch()`:

1. read desired state;
2. require `ready` and exact configured slug;
3. select only a Worker-supplied `preview` or `editor` target;
4. strip the internal routing header before the container request;
5. call `wsConnect()` for case-insensitive WebSocket upgrades;
6. call `containerFetch()` otherwise;
7. preserve the rest of the original Request.

Verification:

- unit tests for classification/method behavior;
- TypeScript proves typed DO RPC and fetch calls;
- Wrangler dry run validates migrations/routes/bundle;
- source audit confirms exact host selection and no broad wildcard route.

Atomic commit:

```text
feat(session): route lifecycle and branded proxies
```

## Step 8 — Add the owner CLI

Create `scripts/session.ts` and complete CLI tests.

Actions:

1. parse only the four supported commands;
2. require one SHA only for `up`;
3. require `SESSION_WORKER_URL` and validate HTTP(S);
4. map command to exact method/path/body;
5. set `accept: application/json` and content type only when a body exists;
6. parse JSON responses safely;
7. print formatted JSON to stdout;
8. print concise failures to stderr and return nonzero;
9. add package script and test entry.

Verification:

- mocked fetch request tests;
- CLI help/error tests;
- package script can display usage without network access;
- full `npm test`.

Atomic commit:

```text
feat(session): add lifecycle operator CLI
```

## Step 9 — Document and record progress

Create `docs/knowledge/session-lifecycle.md` from the implemented behavior.

Create/update `progress.md` with:

- baseline and final test results;
- completed steps and commit hashes;
- exact route/variable/migration shape;
- exact API and CLI commands;
- idempotency behavior;
- any implementation deviation from Design/Structure/Plan;
- remote paid entitlement limitation;
- Access and preservation gates;
- cleanup state.

Verification:

- every documented command exists in `package.json`;
- examples use the fixed slug and a 40-character SHA;
- docs do not imply remote deploy, Access, browser IDE, or production WebSocket proof;
- ticket phase/status frontmatter has not been manually changed.

Atomic commit:

```text
docs(session): document one-session lifecycle
```

## Step 10 — Full implementation verification

Run in this order:

1. `npm test`;
2. `npm run session:types:check`;
3. `npx tsc --noEmit --project tsconfig.sessions.json`;
4. `npx wrangler deploy --dry-run --config wrangler.sessions.jsonc`;
5. `npm run session:validate` as the combined authoritative check;
6. `npm run typecheck` to ensure stable App/session declaration isolation remains intact;
7. `git diff --check`;
8. `git status --short` and path-scoped staged-diff review;
9. search for prohibited patterns:
   - mutable request state at module scope;
   - `Math.random()`;
   - floating Sandbox promises;
   - `passThroughOnException()`;
   - `any`/double casts in new runtime code;
   - hardcoded secret-like values;
   - broad wildcard session routes.

Optional local integration if practical without rebuilding the image:

- start Wrangler locally only if the coordinator migration/Container support and Docker state
  allow it without modifying external state;
- use a public committed SHA and call `up`, `status`, `logs`, repeated `up`, then `down`;
- record evidence and always destroy the local Sandbox;
- do not let inability to perform a paid remote run erase unit/type/dry-run evidence.

If a failure appears, document the deviation in Progress before altering the implementation.

## Step 11 — Review

Read every changed file in full, not only the diff. Compare behavior against the ticket and all
prior artifacts.

Review checklist:

- chosen SHA is immutable and exactly verified;
- existing same-revision worktree is never reset;
- conflicting revision cannot overwrite edits;
- repeated `up` cannot duplicate named processes;
- readiness requires both ports;
- proxy refuses non-ready state;
- original HTTP/WS request semantics are preserved;
- stable demo hostname is outside session routes;
- coordinator desired state is durable;
- mutation queue remains usable after rejection;
- logs and errors are bounded;
- all environment/config types are generated;
- no secret is in source/config/docs;
- `keepAlive` is paired with explicit destroy;
- Access and work preservation are clearly open gates;
- no remote success is claimed.

Write `review.md` with acceptance mapping, changed files, tests, best-practice assessment,
limitations, and human actions. Update Progress to completed. Commit both artifacts.

Final atomic commit:

```text
docs(session): review one-session lifecycle
```

## Testing strategy summary

| Layer | Evidence | Purpose |
|---|---|---|
| Pure unit | Node test file | validation, routing, commands, logs, CLI |
| Existing regression | full `npm test` | preserve repository behavior |
| Type contract | session TypeScript | SDK/DO/binding signatures |
| Generated config | `session:types:check` | Wrangler-env drift |
| Bundle/config | Wrangler dry run | routes, migrations, containers, exports |
| Stable boundary | root `typecheck` | prevent Env merge/regression |
| Image runtime | prior image check | real pinned Astro environment |
| Local lifecycle | optional Wrangler + Docker | actual Git/process convergence |
| Remote edge | deferred entitlement run | TLS, domains, Access, both WebSockets |

## Rollback and cleanup

Code rollback is path-scoped Git revert of this ticket's commits. Runtime cleanup for any local
integration run is `session down`, followed by checking for residual Wrangler/Docker processes.

No remote deployment, DNS mutation outside dry-run declarations, Access policy change, plan
upgrade, secret mutation, or stable Worker deployment is authorized by this plan.
