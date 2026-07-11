# Progress — T-004-03-02 one-session-lifecycle-and-routing

## Outcome

Implementation is complete and locally exercised through the real Wrangler Worker, coordinator
Durable Object, Sandbox container, public Git repository, Astro dev server, and code-server.

The one-session lifecycle supports `up`, `status`, `logs`, and `down`. Exact branded host
routing carries preview/editor HTTP and uses the SDK WebSocket path for upgrades. Repeated
same-revision `up` converges without replacing the worktree or either running process.

No remote deployment, custom-domain mutation, Access policy, plan upgrade, stable Worker
change, secret mutation, or ticket frontmatter update occurred.

## Baseline

Before implementation:

- `npm test`: 109/109 passed;
- `npm run session:validate`: passed;
- session binding: only `Sandbox`;
- session handler: passive JSON health only;
- no lifecycle CLI or session unit tests;
- no branded routes or repository/session variables.

The dirty worktree already contained Lisa/user artifacts listed in Research. All commits used
path-scoped staging, leaving those files unstaged.

## Phase artifacts completed

| Artifact | Commit |
|---|---|
| Research | `508f562` |
| Design | `75468ee` |
| Structure | `a9f87da` |
| Plan | `de003a6` |

## Implementation units

### 1. Pure lifecycle contract

Commit `474c234` (`feat(session): define lifecycle contracts`) added:

- immutable full-SHA validation;
- fixed paths, ports, process IDs, identities, and budgets;
- Worker variable validation;
- exact control and host classification;
- URL generation;
- byte-bounded log tails;
- fixed Git/worktree provision command;
- generated Astro/HMR configuration;
- stable Astro/code-server command builders;
- safe public error and JSON response helpers;
- 12 initial Node tests.

Verification: targeted test file passed 12/12.

### 2. Coordinator namespace and routes

Commit `5d62288` (`feat(session): declare coordinator and branded domains`) added:

- exact `demo-session.b28.dev` Custom Domain;
- exact `code-session.b28.dev` Custom Domain;
- non-secret slug/domain/repository variables;
- `SESSION_COORDINATOR` binding;
- SQLite DO migration `v2`;
- generated environment/binding declarations;
- minimal exported coordinator class.

Verification:

- generated types check passed;
- session TypeScript passed;
- Wrangler dry run built the image and reported both DO bindings and all variables.

### 3. Worktree, services, lifecycle, and proxy

Commit `09e821b` (`feat(session): reconcile worktree and services`) implemented:

- durable desired state;
- live mutation serialization for up/down;
- provisioning/ready/failed/stopping transitions;
- bare repository plus detached worktree at exact SHA;
- same-revision preservation and conflicting-revision refusal;
- baked dependency reuse or fallback `npm ci`;
- generated session-only Astro config outside the worktree;
- named Astro/code-server process reconciliation;
- readiness gates for ports 4321 and 8080;
- status with desired/actual state and placement ID;
- bounded logs with absent-process handling;
- idempotent Sandbox teardown;
- readiness-gated exact-host HTTP and WebSocket proxying;
- control API and structured lifecycle logs.

Verification:

- session TypeScript passed;
- generated types remained current;
- Wrangler dry run passed with a 611.83 KiB upload / 133.04 KiB gzip bundle;
- image built successfully.

### 4. Owner CLI

Commit `55082c4` (`feat(session): add lifecycle operator CLI`) added:

- `npm run session -- up <sha>`;
- `status`, `logs`, and `down` commands;
- strict Worker origin validation;
- exact HTTP method/path/body mapping;
- structured success/failure output;
- mocked fetch and CLI failure tests;
- integration into the default `npm test` script.

Verification: targeted test file passed 16/16.

### 5. Runtime-discovered Astro command corrections

The first real local `up` provisioned the worktree successfully but Astro exited before port
readiness. `logs` showed:

```text
Unknown command: astro dev /workspace/session
```

Astro 7 interprets the positional root after `dev` as a subcommand. This deviated from the
planned command shape. Commit `b3333d8` moved `--root` and `--config` before `dev`.

The second local `up` showed:

```text
ConfigNotFound: Unable to resolve an absolute --config path
```

Direct CLI checks confirmed Astro 7 accepts relative config paths and rejects the absolute
form even when the file exists. Commit `8f38f05` retained the generated config outside the
worktree but passed it as `../session-runtime/astro.config.mjs` relative to the root.

Both deviations were documented before continuing. Targeted tests passed after each fix.

### 6. Bounded control request streaming

Commit `bfe9820` (`fix(session): bound control request bodies`) replaced a Content-Length-only
guard plus `request.json()` with a streaming 4 KiB reader. Chunked requests cannot bypass the
limit. A new unit test covers valid, malformed, and oversized bodies.

Verification: targeted test file passed 17/17; session TypeScript passed.

## Local lifecycle evidence

Wrangler ran on `http://127.0.0.1:8793` with the real pinned image. The chosen public origin
commit was:

```text
ec9dd46678419afdb22bf5aa1e8d5ec7a9adc119
```

Initial `status` returned idle with no processes.

Clean `up` result:

| Observation | Result |
|---|---|
| HTTP | 200 |
| request duration | 12,866 ms |
| Git/dependency provision | 7,424 ms |
| desired phase | ready |
| Astro | `astro-dev`, PID 155, running |
| Astro reported ready | 2,887 ms |
| code-server | `code-server`, PID 260, running |
| exact revision | verified by provision program |

`status` returned ready and both actual processes. Local placement ID was null, as expected.

`logs` returned bounded Astro stdout/stderr and code-server stdout/stderr. Astro output included
its ready line and code-server output included its 0.0.0.0:8080 listener.

Repeated same-revision `up` result:

| Observation | Result |
|---|---|
| HTTP | 200 |
| changed | false |
| request duration | 159 ms |
| worktree check | 58 ms |
| Astro PID | 155 before and after |
| code-server PID | 260 before and after |

This is direct convergence evidence: no duplicate workspace or service process was created.

## Proxy evidence

Using exact Host headers against local Wrangler:

- preview `/` returned HTTP 200 and the real `Demo Runway` marker;
- editor `/` returned HTTP 200;
- preview HMR returned `101 Switching Protocols`;
- `Sec-WebSocket-Protocol: vite-hmr` survived;
- the socket emitted Vite `connected` and `full-reload` frames.

The raw code-server `/websocket` curl probe timed out without a response because a complete VS
Code reconnection handshake was not supplied. The code path selects `wsConnect()` for editor
upgrades exactly as it does for preview, but the browser IDE WebSocket remains a production
browser verification gap.

Machine-readable evidence is in `local-lifecycle-evidence.json`.

## Teardown and cleanup

The first `down`:

- returned HTTP 200;
- destroyed the Sandbox;
- cleared desired state;
- returned `changed: true` and idle;
- completed in 225 ms.

The second `down` returned 200, `changed: false`, and idle.

Wrangler was stopped. One residual Wrangler `proxy-everything` helper container remained after
the local dev process exited; it was identified by this session's deterministic Sandbox hash
and stopped manually. Final matching running-container count was zero.

No remote resource existed to clean up.

## Current file changes

Created:

- `src/lib/session-lifecycle.ts`;
- `scripts/session.ts`;
- `test/session-lifecycle.test.mjs`;
- `docs/knowledge/session-lifecycle.md`;
- `docs/active/work/T-004-03-02/local-lifecycle-evidence.json`;
- all six RDSPI artifacts for this ticket.

Modified:

- `src/session-worker.ts`;
- `wrangler.sessions.jsonc`;
- `worker-configuration.sessions.d.ts` (generated);
- `package.json`.

Deleted: none.

## Planned versus actual

The core architecture, API, route shape, state model, worktree layout, process IDs, log bounds,
CLI, and test strategy match Design/Structure/Plan.

Documented deviations:

1. two Astro command syntax corrections from real runtime evidence;
2. `local-lifecycle-evidence.json` added although Structure did not enumerate it, because the
   real lifecycle run produced acceptance-grade evidence worth retaining;
3. lifecycle and proxy implementation landed in one runtime commit rather than separate proxy
   commit, because both share the coordinator fetch/readiness boundary.

No deviation expands the product scope.

## Remaining verification before Review

- full `npm test` after documentation;
- `npm run session:types:check`;
- session TypeScript and Wrangler dry run via `npm run session:validate`;
- stable root `npm run typecheck`;
- `git diff --check`;
- prohibited-pattern and full-file review;
- final generated binding check;
- Review artifact and final Progress update.

## Open gates

- Workers Paid Containers entitlement still blocks remote deployment.
- Cloudflare Access/origin validation is downstream and required before collaboration.
- browser IDE save and code-server WebSocket are not locally proven.
- remote TLS/Custom Domain routing is not proven.
- uncommitted work is not yet backed up before destroy/platform replacement.
- the one-session keepalive must be explicitly torn down to avoid idle cost.
