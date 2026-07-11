# One collaborative session lifecycle

**Tickets:** `T-004-03-02`, `T-004-04-02`

**Validated locally:** 2026-07-10 (America/Los_Angeles) / 2026-07-11 UTC

**Scope:** one fixed session, Cloudflare Sandbox SDK 0.12.3

This is the durable operator and runtime contract for the MVP's one collaborative session.
It complements `session-image.md`, `sandbox-session-spike.md`, and
`sandbox-sleep-wake-spike.md`.

## Boundary

The repository retains two independent Workers:

```text
demo.b28.dev              -> stable App Worker (public)
demo-session.b28.dev      -> Sessions Worker -> Sandbox Astro :4321
code-session.b28.dev      -> Sessions Worker -> Sandbox code-server :8080
```

The session routes are two exact Custom Domains. They do not match or intercept
`demo.b28.dev`. Cloudflare Custom Domains do not support wildcards, and a broad wildcard
Worker route would also capture the stable public hostname. The fixed slug `session` is the
right-sized result for the one-session MVP.

Arbitrary slugs, route automation, invitations, expiry, garbage collection, and a fleet
control plane remain out of scope.

## Runtime ownership

The Sessions Worker contains two Durable Object namespaces:

```text
SessionCoordinator (name: primary)
  -> durable desired slug/revision/phase
  -> serializes up/down mutations
  -> validates readiness and proxy state

Sandbox (name: demo-runway-session)
  -> one Cloudflare Container
  -> Git repository + detached worktree
  -> Astro and code-server processes
  -> HTTP and WebSocket forwarding
```

`SessionCoordinator` is a SQLite-backed DO added by migration `v2`. The SDK's `Sandbox`
remains the SQLite-backed DO added by `v1`. The coordinator stores only small desired-state
metadata; it does not cache mutable process truth as authoritative state.

## Configuration

`wrangler.sessions.jsonc` defines three non-secret values:

| Variable | Value | Purpose |
|---|---|---|
| `SESSION_SLUG` | `session` | fixed MVP slug |
| `SESSION_DOMAIN` | `b28.dev` | branded base domain |
| `SESSION_REPOSITORY_URL` | public HTTPS GitHub URL | chosen-revision source |

The repository URL must be credential-free HTTPS. Private-repository clone credentials are
not part of this ticket. Do not add a token to the URL or Wrangler vars.

`SESSION_RUNTIME_SECRETS` is a required Worker secret binding whose value is a JSON object from
portable uppercase environment-variable name to secret string. Configure it through Wrangler's
non-echoing secret input, never as a committed `vars` value:

```bash
npx wrangler secret put SESSION_RUNTIME_SECRETS --config wrangler.sessions.jsonc
```

Enter `{}` when the demo needs no runtime credentials. A populated value has this shape (use
real values only in the secret prompt):

```json
{"DEMO_API_TOKEN":"<secret-at-least-eight-bytes>"}
```

The map accepts at most 32 entries and 16 KiB aggregate name/value data. Names must match
`[A-Z_][A-Z0-9_]*`; process-loader variables, core shell variables, and the Worker's own
`SESSION_*` configuration names are rejected. Values must be strings between 8 bytes and 4 KiB.
Malformed configuration produces a fixed error that does not echo the source.

Generated binding types are owned by:

```bash
npm run session:types
npm run session:types:check
```

## Owner commands

Set the already-deployed Sessions Worker origin in the shell:

```bash
export SESSION_WORKER_URL=https://demo-runway-sessions.<account>.workers.dev
```

For local Wrangler development:

```bash
export SESSION_WORKER_URL=http://127.0.0.1:8787
```

Bring up an immutable commit:

```bash
npm run session -- up <40-character-lowercase-commit-sha>
```

Inspect desired and actual state:

```bash
npm run session -- status
```

Read bounded Astro and code-server output:

```bash
npm run session -- logs
```

Safely destroy the runtime, exporting dirty work first:

```bash
npm run session -- down
```

Explicitly discard dirty work only when preservation is intentionally unwanted:

```bash
npm run session -- down --force
```

The CLI accepts only an HTTP(S) origin without credentials, path, query, or fragment. It prints
the Worker's JSON on success and exits nonzero for invocation, network, or HTTP failures.

## HTTP control API

The CLI is a thin client over:

| Method | Path | Body |
|---|---|---|
| POST | `/__session/up` | `{ "revision": "<full SHA>" }` |
| GET | `/__session/status` | none |
| GET | `/__session/logs` | none |
| POST | `/__session/down` | `{ "mode": "preserve" }` |
| POST | `/__session/down` | `{ "mode": "destroy", "preservationSha256": "<digest>" }` |
| POST | `/__session/down` | `{ "mode": "destroy", "force": true }` |

The `up` body is streamed with a 4 KiB maximum, including requests with no Content-Length.
Malformed JSON is 400, an oversized body is 413, an invalid/mutable revision is 400, and a
different desired commit while a session exists is 409.

The down body is also required and stream-bounded. Empty or ambiguous requests are rejected;
there is no compatibility path to unconditional destruction.

The control prefix is reserved by the Sessions Worker and is not proxied to Astro or
code-server.

## Lifecycle phases

| Phase | Meaning |
|---|---|
| `idle` | no desired session record |
| `provisioning` | Git/dependencies/services are converging |
| `ready` | exact revision and both named services passed readiness |
| `failed` | latest up/down failed; bounded reason retained |
| `stopping` | Sandbox destroy is in progress |

`ready` is not inferred from a durable Sandbox ID. It is stored only after Astro responds on
4321 and code-server accepts connections on 8080.

Status reads current managed process records when a desired session exists. Placement ID is
`null` in local Wrangler and appears when the platform reports one.

## Worktree provisioning

The runtime uses:

```text
/workspace/repository.git     bare Git repository
/workspace/session            detached isolated worktree
/workspace/session-runtime    generated configuration outside Git worktree
```

`up` requires a full lowercase SHA. The fixed program:

1. reuses an existing worktree only if its `HEAD` is the requested SHA;
2. preserves every collaborator modification on a same-revision rerun;
3. refuses a different existing SHA instead of resetting possible work;
4. initializes a bare repository when no worktree exists;
5. fetches the requested commit at depth one;
6. adds a detached worktree at `FETCH_HEAD`;
7. verifies the resulting `HEAD` exactly;
8. reuses baked dependencies only when package and lock files equal the image baseline;
9. otherwise runs `npm ci` in the selected worktree.

Repository URL and revision enter the fixed shell program as quoted environment values. The
revision validator prevents option injection and mutable branch/tag selection.

The initial local public-repository provision took 7,424 ms. A repeated same-revision check
took 58 ms and did not restart either service.

## Service contract

| Process ID | Command role | Port | Readiness |
|---|---|---:|---|
| `astro-dev` | Astro/Vite dev server | 4321 | HTTP 200–399 at `/` |
| `code-server` | browser editor | 8080 | TCP accept |

Both run from `/workspace/session` with `autoCleanup: false`, retaining failed logs for the
operator. A stale named process is killed/cleaned before a replacement uses the same ID.

The generated Astro config merges the selected revision's config and pins:

```js
server: {
  host: '0.0.0.0',
  port: 4321,
  strictPort: true,
  allowedHosts: ['demo-session.b28.dev'],
  hmr: {
    protocol: 'wss',
    host: 'demo-session.b28.dev',
    clientPort: 443,
  },
}
```

Astro 7 requires global flags before `dev` and requires `--config` to be expressed relative
to `--root`. The final command therefore uses:

```text
./node_modules/.bin/astro --root /workspace/session \
  --config ../session-runtime/astro.config.mjs dev
```

code-server binds `0.0.0.0:8080`, disables telemetry, and opens the exact worktree.

The parsed runtime-secret map is passed to both managed services through Sandbox
`startProcess.env`. It is not interpolated into either command, supplied to the Git provisioning
command, written to the worktree/runtime directory, or stored in coordinator state. code-server
and its child terminals inherit the environment, so an authorized collaborator can intentionally
read these values. This is a launch/persistence boundary for trusted or semi-trusted teammates,
not isolation from code running inside the session. Do not inject the owner's agent credentials
by default.

## Idempotency

Repeated `up` with the same revision:

- keeps the detached worktree and edits;
- keeps already-running `astro-dev` and `code-server` processes;
- rechecks their ports;
- returns `changed: false` when nothing required repair;
- retains the original `createdAt` timestamp;
- updates `updatedAt` after convergence.

The local proof retained Astro PID 155 and code-server PID 260 across the second `up`.

Repeated safe `down` is also idempotent: a clean first call destroys and clears state with
`changed: true`; the second returns idle with `changed: false`. A dirty first call performs the
two-step export described below before destruction.

## Proxy contract

The Worker selects a target only by exact hostname:

- `demo-session.b28.dev` -> 4321;
- `code-session.b28.dev` -> 8080;
- every other hostname -> no session proxy.

The coordinator requires desired phase `ready` and a running target process before forwarding.
It returns 503 rather than serving the baked baseline or a stale workspace.

Ordinary requests use `sandbox.containerFetch(request, port)`. Case-insensitive WebSocket
upgrades use `sandbox.wsConnect(request, port)`. After removing one internal routing header,
the original URL, hostname, path, query, method, headers, body, cookies, and WebSocket
subprotocol reach the service.

Local evidence observed:

- preview HTTP 200 with the real `Demo Runway` marker;
- editor HTTP 200;
- Vite HMR `101 Switching Protocols`;
- `Sec-WebSocket-Protocol: vite-hmr` preserved;
- Vite `connected` and `full-reload` frames on the proxied socket.

The browser IDE's own WebSocket was not proven by the raw curl probe. A real production browser
test remains required.

## Logs

`logs` returns one entry for each stable process ID. Each stdout and stderr field retains the
most recent 32 KiB and includes:

- `truncated`;
- `originalBytes`;
- current process status;
- PID/exit code when present.

An absent process yields an explicit `absent` entry. Complete logs are not stored in Durable
Object metadata or copied into Workers structured logs. Every known configured launch-secret
value is replaced with `[REDACTED]` before byte bounding or API serialization. Error paths apply
the same longest-value-first replacement before single-line conversion, truncation, durable
failure storage, structured logging, or CLI output. Exact-value redaction cannot recognize a
credential that was not part of the configured launch-secret map.

## Keepalive, cost, and teardown

The active one-session Sandbox uses `keepAlive: true`. The sleep/wake spike proved automatic
sleep destroys processes and `/workspace` state; keeping it alive avoids silently losing
uncommitted collaborator work during the MVP session.

This means the operator must run `down`. A failed preservation or destroy leaves the runtime and
desired record available for diagnosis/retry.

Normal down inspects the exact detached worktree. It stages all non-ignored changes with
`git add -A` and generates a `git diff --cached --binary --full-index HEAD` patch outside the
worktree. This represents modified/deleted/renamed tracked files, executable-mode changes,
untracked files, and binary content. Git-ignored files and empty directories are not represented.

If the worktree is clean, the Worker destroys it immediately. If it is dirty:

1. the Worker measures the complete patch and refuses patches over 2 MiB without truncating;
2. the Worker computes SHA-256 and returns base64 patch bytes with the base revision;
3. the CLI decodes and independently verifies byte count and SHA-256;
4. the CLI creates a mode-`0600` patch in its current directory using exclusive creation;
5. the CLI acknowledges the digest only after the local write succeeds;
6. the Worker regenerates the patch and destroys only when the new digest matches.

An edit between export and acknowledgement returns `409 workspace_changed`; the first recovery
artifact remains local and the live session remains intact. Rerun down to export the newer state.
A local name collision or disk error likewise stops before the destroy request.

Artifacts use this form:

```text
demo-runway-session-<12-char-base>-<12-char-digest>.patch
```

Recover against the recorded base revision in a repository with the same history:

```bash
git checkout --detach <base-revision>
git apply --binary <artifact.patch>
```

`down --force` is the only preservation bypass. It sends an explicit API boolean and returns a
`forced:true` audit marker. It is non-interactive so automation can use it, but the flag is the
destructive confirmation; never add an implicit environment toggle.

Local teardown destroyed the Sandbox, stopped Wrangler, and manually stopped Wrangler's
residual `proxy-everything` helper container. No session container or helper remained running.

## Security gate

This ticket does not claim production authorization.

code-server currently uses `--auth none` because Cloudflare Access is the decided identity
layer. `T-004-04-01` must put Access on both exact Custom Domains and validate origin assertions
before this Worker is deployed for collaboration. The control API must also be protected; it
has no shared bypass token by design.

No token, password, Cloudflare credential, Git credential, `.dev.vars`, or agent credential is
baked into the image or stored in the coordinator/worktree. Configured secret values are passed
only to process launch and are redacted from owned logs/API/CLI output. Patch content is
transported with `cache-control: no-store` but is never printed, logged, or durably stored by the
Worker.

## Durability gate

Safe explicit down now preserves uncommitted work through the verified owner-held patch. The
active keepalive choice still does not protect against platform replacement before down, owner
disconnect after export but before acknowledgement, or an operator choosing `--force`.

A desired record can survive while runtime files do not, and same-revision `up` restores only the
commit/services when the container was replaced. R2 backup/restore or authenticated commit/push
remains necessary before automatic sleep, replacement recovery, or multi-session garbage
collection can be considered durable. Use the MVP only with trusted/semi-trusted teammates.

## Validation

Fast repository validation:

```bash
npm test
npm run session:validate
npm run typecheck
```

Local runtime validation requires Docker:

```bash
npx wrangler dev --config wrangler.sessions.jsonc
export SESSION_RUNTIME_SECRETS='{}'
SESSION_WORKER_URL=http://127.0.0.1:8787 npm run session -- up <sha>
SESSION_WORKER_URL=http://127.0.0.1:8787 npm run session -- status
SESSION_WORKER_URL=http://127.0.0.1:8787 npm run session -- logs
SESSION_WORKER_URL=http://127.0.0.1:8787 npm run session -- down
```

Always run `down`, stop Wrangler, and inspect Docker for residual helpers after a local run.

## Production checklist

Before claiming the epic's production handoff:

1. enable Workers Paid Containers on the sovereign project account;
2. deploy the Sessions Worker and image;
3. configure Access on both exact Custom Domains and the control API;
4. verify both domains' certificates and DNS;
5. bring up an exact production commit;
6. open preview and code-server in a clean authenticated browser;
7. save an edit in code-server;
8. observe the already-open preview update over `wss`;
9. verify code-server's own WebSocket remains connected;
10. configure the launch-secret binding through non-echoing Wrangler input;
11. exercise secret injection/redaction with a disposable marker credential;
12. edit tracked, untracked, and binary files and verify safe down produces an applicable patch;
13. measure remote image placement, cold readiness, and `basic` instance behavior;
14. run safe `down` and verify no retained runtime cost.

The local result proves the implementation path and exact pinned image. It does not substitute
for paid-platform TLS, Access, code-server browser, or remote replacement evidence.
