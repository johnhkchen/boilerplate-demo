# Sandbox idle sleep/wake finding

**Ticket:** `T-004-01-02`  
**Date:** 2026-07-10  
**Scope:** Cloudflare Sandbox SDK `0.12.3`, Wrangler local mode, Docker  
**Verdict:** **RELAUNCH REQUIRED**  
**Go/no-go:** **NO-GO for transparent resume; CONDITIONAL GO for `S-004-03` only with
durable workspace restore plus idempotent service supervision.**

## Finding

Astro dev and code-server do **not** survive a Sandbox idle sleep. After an untouched
ten-minute inactivity window, the first Sandbox request started a fresh container from the
baked image:

- the managed process list was empty;
- Astro’s port 4321 was closed;
- code-server’s port 8080 was closed;
- a post-boot sentinel under `/workspace` was gone;
- a post-boot edit to the baked Astro source was gone;
- an exported variable in an explicit named shell session was gone;
- the original baked Astro source returned with its original checksum.

Both services could be relaunched from the image in 4,090 ms and became reachable on their
ports with new PIDs. Relaunch did not restore the missing workspace or shell state.

The session runtime therefore cannot treat wake as process continuation. The same Sandbox ID
is a durable routing identity, not durable process, filesystem, editor, or terminal state.

## Why this was tested locally

The project account’s authenticated Wrangler grant includes Containers write scope, but the
account still rejects `wrangler containers list`: Cloudflare Containers require the Workers
Paid plan. No plan upgrade was attempted because that is a financial action outside the
ticket’s authority.

The experiment used the exact disposable image retained from `T-004-01-01`, which had already
proven local co-residency for Astro and code-server. Local evidence does not replace a future
production confirmation, but it exercises the Sandbox SDK inactivity path rather than raw
Docker stop/start behavior.

## Tested versions

| Component | Version |
|---|---|
| `@cloudflare/sandbox` | 0.12.3 |
| Sandbox base/image | 0.12.3 |
| Wrangler | 4.110.0 |
| Docker server | 29.6.1 |
| Node in container | 22.23.1 |
| Astro | 7.0.7 |
| code-server | 4.127.0 |
| Code inside code-server | 1.127.0 |

SDK and image versions matched, avoiding the lifecycle/API mismatch warned about in the
Sandbox documentation.

## Exact lifecycle configuration

Every control request resolved the same Sandbox with:

```ts
getSandbox(env.Sandbox, "t004-sleep-wake", {
  sleepAfter: "10m",
  keepAlive: false,
  enableDefaultSession: true,
});
```

No `setKeepAlive(true)` call was made. No preview or editor route was exposed. No tunnel,
WebSocket, status poll, log stream, Docker exec, or Sandbox API call remained active during
the idle interval.

The local Worker stayed running throughout. The lifecycle transition came from the SDK’s
activity timeout, not from stopping Wrangler, calling `destroy()`, killing either process, or
manually stopping the Docker container.

## Process commands

Astro ran as a managed Sandbox background process:

```text
cwd=/workspace/demo
processId=astro-dev
npm run dev
```

code-server ran as a separate managed background process:

```text
cwd=/workspace/demo
processId=code-server
code-server --bind-addr 0.0.0.0:8080 --auth none --disable-telemetry /workspace/demo
```

`--auth none` was safe only because the harness was local and no port was publicly exposed.
It is not a production auth decision.

## Pre-idle snapshot

Final snapshot: `2026-07-10T23:38:41.680Z`.

| Observation | Before idle |
|---|---|
| Astro process | `astro-dev`, PID 85, running |
| code-server process | `code-server`, PID 173, running |
| port 4321 | listening |
| port 8080 | listening |
| `/workspace/idle-sentinel.txt` | present |
| Astro source marker | `IDLE MUTATION` |
| Astro source SHA-256 | `c3ced8a59d809a793b8a23812147873d7cc3189dc7c54edd7ac36c6d8a9b12f8` |
| explicit shell marker | `T004_IDLE_SHELL_20260710` |

The service startup step took 4,090 ms. Both ports were checked from inside the Sandbox after
startup, so the process records represented ready services rather than merely spawned
commands.

## Idle interval

- Last Sandbox activity: `2026-07-10T23:38:41.680Z`.
- First wake request began: `2026-07-10T23:49:10.512Z`.
- Idle before the wake request: 628,832 ms, or 10m28.832s.
- First wake snapshot completed: `2026-07-10T23:49:11.934Z`.
- Snapshot-to-snapshot interval: 630,254 ms, or 10m30.254s.

Wrangler emitted the lifecycle line:

```text
Activity expired, signalling container to stop
```

This appeared before the first post-idle request. The harness had not polled the Sandbox.

## First wake snapshot — before relaunch

The first post-idle endpoint was deliberately read-only with respect to application state. It
listed processes, checked ports, and read state; it had no call path to `startProcess()`, file
writes, or restoration.

Snapshot: `2026-07-10T23:49:11.934Z`.

| Observation | After wake, before relaunch | Result |
|---|---|---|
| managed processes | empty list | both processes terminated |
| port 4321 | closed | Astro did not resume |
| port 8080 | closed | code-server did not resume |
| sentinel | absent | ordinary `/workspace` write lost |
| Astro source marker | `HMR BEFORE` | post-boot edit lost; image baseline restored |
| Astro source SHA-256 | `961b549038c8d6bc093b93e2c556461a0e632c95521e24da6466ac99063244a9` | original image content |
| explicit shell marker | empty | exported shell state lost |

The SDK could return a wrapper for the same explicit session name, but the exported variable
was empty. Session naming is therefore not evidence that the underlying shell state survived.

Local transport returned no placement ID. The fresh-container finding does not depend on a
placement identifier: the empty process list, closed ports, absent sentinel, lost source
mutation, lost shell marker, restored image checksum, and Wrangler activity-expired signal all
agree.

## Relaunch result

Only after the first-wake response was captured did the harness call the separate relaunch
endpoint.

| Service | New PID | Status | Port |
|---|---:|---|---:|
| Astro dev | 122 | running | 4321 listening |
| code-server | 210 | running | 8080 listening |

Relaunch took 4,090 ms. Both services recovered from the baked image. Their old PIDs did not
return, and neither did any post-boot workspace or shell state.

This is a service-bootstrap success, not session recovery. A collaborator would see the
image’s original project unless an external durable workspace were restored first.

## State lost

The experiment directly observed loss of:

1. the Astro background process and PID 85;
2. the code-server background process and PID 173;
3. both listening sockets;
4. a new file under `/workspace`;
5. an edit to a file baked into the image;
6. an environment variable exported in an explicit shell session.

By platform contract, other ordinary container state should be treated the same way:
uncommitted work, editor/server runtime state, terminal cwd/environment, caches, and
interpreter contexts are ephemeral unless stored outside the container lifecycle.

## Go/no-go

### Transparent resume: NO-GO

Neither application resumes. A process manager *inside the same stopped container* cannot
solve this because the container and the supervisor process are both terminated. Cached
process IDs in Worker or Durable Object state would be stale after wake.

### One-session build: CONDITIONAL GO

The chosen runtime remains viable only because a clean container can start both services
quickly and deterministically from the baked image. `S-004-03` may proceed if it makes fresh
container recovery a first-class lifecycle state rather than an exceptional failure.

## Required consequence for `S-004-03`

The permanent session lifecycle must implement this ordering:

```text
request for session
  → obtain Sandbox identity
  → detect fresh/missing runtime state
  → restore or mount durable workspace
  → idempotently start Astro and code-server
  → wait for both ports/health checks
  → re-establish transient forwarding if needed
  → report ready
```

Specific requirements:

1. **External workspace durability.** The mutable worktree cannot live only on ordinary
   `/workspace`. Use current Sandbox backup/restore backed by R2, an appropriate durable mount,
   or a commit/push plus recoverable patch workflow.
2. **Restore before readiness.** Never start the editor against the baked baseline and call the
   session healthy before the collaborator’s workspace is restored.
3. **Idempotent service supervision.** On every session request or lifecycle action, inspect
   actual current processes/ports and start missing services. Do not trust stored PIDs.
4. **Fresh terminals.** Editor terminal processes and shell state do not survive. The UI/runbook
   should describe reconnect as a fresh shell even when files have been restored.
5. **Active-session keepalive.** Use `keepAlive: true` while a collaborative session is meant to
   remain immediately live, or accept a visible restore/relaunch cold wake. Explicitly disable
   keepalive or destroy at the end to avoid indefinite resource use.
6. **Persist before sleep/down.** Save uncommitted work before allowing the container to idle or
   before destroy. A teardown-only save is insufficient if automatic sleep remains enabled.
7. **Recreate transient routing.** Current SDK docs say tunnel/forwarding activation may need to
   be established again after a restart; routing health belongs in wake bootstrap.
8. **Expose lifecycle state.** `status` should distinguish `sleeping`, `restoring`, `starting`,
   `ready`, and `failed`, rather than treating one durable Sandbox ID as “running.”
9. **Bound recovery.** Restore and service-start failures need bounded logs and an actionable
   error without serving a stale or blank workspace.

The design does not require a traditional init daemon merely to keep processes alive across
sleep; no in-container daemon can outlive the container. It requires Worker/DO-level
orchestration that launches services inside each fresh runtime. An init/supervisor inside the
container can still help reap children or restart a crashed service *while the container is
active*, but it is not the sleep/wake mechanism.

## Relationship to `T-004-01-01`

The prerequisite spike remains PARTIAL / NO-GO for its own acceptance criterion because a
browser IDE edit and production container path were not observed. This ticket does not erase
that gate.

What this ticket adds is a decisive lifecycle finding for the exact local image/process shape:
co-residency and local HMR are feasible while active, but all runtime state is replaced after
idle sleep.

## Production confirmation still required

Before claiming the complete epic gate is cleared, rerun on an entitled sovereign Cloudflare
account and confirm:

- production inactivity causes the same fresh-container behavior;
- backup/mount restore works across a real production sleep;
- both services restart within the product’s wake budget;
- preview HMR and code-server WebSockets reconnect after restore/relaunch;
- the editor shows the restored worktree rather than the image baseline;
- Access and origin validation remain intact across wake.

The current local result is strong enough to shape `S-004-03`; it is not evidence for remote
cold-start time, placement, edge TLS, production WebSockets, or paid-account behavior.

## Cleanup

- Sandbox `destroy()` succeeded at `2026-07-10T23:49:28.601Z`.
- Wrangler local server stopped cleanly.
- One residual Wrangler `proxy-everything` helper container was identified and stopped.
- The transient `/tmp/t004-sleep-wake` source/dependency tree was removed.
- No remote Worker, container, route, custom domain, DNS record, or secret was created.
- The stable `demo-runway` Worker and `demo.b28.dev` were never targeted.

## Evidence

Machine-readable observations are committed at:

- `docs/active/work/T-004-01-02/sleep-wake-evidence.json`.

The JSON includes the exact snapshots, durations, comparisons, relaunch result, downstream
requirements, limitations, and cleanup status without account identity or credentials.

## Primary references

- [Sandbox lifecycle](https://developers.cloudflare.com/sandbox/concepts/sandboxes/)
- [Sandbox options (`sleepAfter`, `keepAlive`)](https://developers.cloudflare.com/sandbox/configuration/sandbox-options/)
- [Background processes](https://developers.cloudflare.com/sandbox/guides/background-processes/)
- [Backup and restore](https://developers.cloudflare.com/sandbox/guides/backup-restore/)
- [Persistent storage with R2](https://developers.cloudflare.com/sandbox/tutorials/persistent-storage/)
