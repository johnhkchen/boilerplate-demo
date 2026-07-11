# One collaborative session lifecycle

**Ticket:** `T-004-03-02`

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

Destroy the runtime:

```bash
npm run session -- down
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
| POST | `/__session/down` | none |

The `up` body is streamed with a 4 KiB maximum, including requests with no Content-Length.
Malformed JSON is 400, an oversized body is 413, an invalid/mutable revision is 400, and a
different desired commit while a session exists is 409.

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

## Idempotency

Repeated `up` with the same revision:

- keeps the detached worktree and edits;
- keeps already-running `astro-dev` and `code-server` processes;
- rechecks their ports;
- returns `changed: false` when nothing required repair;
- retains the original `createdAt` timestamp;
- updates `updatedAt` after convergence.

The local proof retained Astro PID 155 and code-server PID 260 across the second `up`.

Repeated `down` is also idempotent: the first call destroys and clears state with
`changed: true`; the second returns idle with `changed: false`.

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
Object metadata or copied into Workers structured logs.

## Keepalive, cost, and teardown

The active one-session Sandbox uses `keepAlive: true`. The sleep/wake spike proved automatic
sleep destroys processes and `/workspace` state; keeping it alive avoids silently losing
uncommitted collaborator work during the MVP session.

This means the operator must run `down`. The command calls `sandbox.destroy()` and deletes
desired state only after destroy succeeds. A failed destroy leaves a `failed` record for
diagnosis.

Local teardown destroyed the Sandbox, stopped Wrangler, and manually stopped Wrangler's
residual `proxy-everything` helper container. No session container or helper remained running.

## Security gate

This ticket does not claim production authorization.

code-server currently uses `--auth none` because Cloudflare Access is the decided identity
layer. `T-004-04-01` must put Access on both exact Custom Domains and validate origin assertions
before this Worker is deployed for collaboration. The control API must also be protected; it
has no shared bypass token by design.

No token, password, Cloudflare credential, Git credential, `.dev.vars`, or agent credential is
baked into the image, stored in the coordinator, returned by the API, or placed in docs.

## Durability gate

The active keepalive choice reduces sleep loss but does not make uncommitted work durable
against platform replacement or explicit `down`.

The later safety ticket must commit/push or back up/restore a recoverable patch before allowing
teardown or automatic sleep. Until then:

- `down` destroys uncommitted session work;
- platform replacement can lose the worktree;
- a desired record can survive while runtime files do not;
- same-revision `up` restores the commit and services, not lost edits.

Use this only with trusted/semi-trusted teammates and treat uncommitted work as ephemeral.

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
10. implement and test uncommitted-work preservation;
11. measure remote image placement, cold readiness, and `basic` instance behavior;
12. run `down` and verify no retained runtime cost.

The local result proves the implementation path and exact pinned image. It does not substitute
for paid-platform TLS, Access, code-server browser, or remote replacement evidence.
