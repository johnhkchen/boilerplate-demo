# Progress — T-004-01-02 spike-container-sleep-wake-survival

## Phase entry

Research, Design, Structure, and Plan were completed in order and committed as scoped commit
`67da49c` (`docs(spike): plan Sandbox sleep wake experiment`). The ticket frontmatter was not
edited. Existing Lisa/user/concurrent E-004 work remains outside this ticket’s commits.

## Prerequisite checks

- Host Node: `v26.5.0`.
- Host npm: `11.17.0`.
- Wrangler: `4.110.0`.
- Docker server: `29.6.1`.
- Local Docker engine: available.
- Retained prerequisite image: available as
  `demo-runway-t004-sandbox-spike-sandbox:worker`.
- Wrangler authentication: present with Containers write scope.
- Production Containers entitlement: unavailable.
- Live `wrangler containers list`: rejected because the account does not have Containers
  access and requires the Workers Paid plan.
- No plan upgrade, production deployment, DNS, route, or stable Worker mutation was attempted.

Account identity and local credential paths printed by Wrangler were deliberately excluded
from all committed artifacts.

## Disposable harness

A transient tree was created at `/tmp/t004-sleep-wake` with:

- `@cloudflare/sandbox` `0.12.3`;
- Wrangler `4.110.0`;
- TypeScript `6.0.3`;
- a one-line Dockerfile extending the exact retained prerequisite image;
- one local Sandbox Durable Object/container binding;
- a fixed Sandbox ID, `t004-sleep-wake`;
- `sleepAfter: "10m"`;
- `keepAlive: false`;
- control endpoints for health, setup, first wake, relaunch, and destroy.

The harness reuses the image that contains:

- Node `22.23.1`;
- Astro `7.0.7`;
- code-server `4.127.0` / Code `1.127.0`;
- the minimal app under `/workspace/demo`;
- the Sandbox `0.12.3` base entrypoint.

## Harness validation

- `npm install`: pass; 43 packages audited, 0 vulnerabilities.
- `npm run typecheck`: pass.
- `npm run deploy:dry`: pass.
- Disposable Worker bundle: 594.86 KiB / 129.27 KiB gzip.
- Docker image build: pass using the retained image digest.
- Local Worker started on `http://localhost:8791`.
- `GET /health`: 200 at `2026-07-10T23:38:35.974Z` and explicitly did not touch the Sandbox.

The npm client printed its informational allow-scripts review warning for `esbuild`, `workerd`,
and `sharp`; required package binaries were already usable and all validation commands passed.

## Pre-idle setup

`POST /setup` completed successfully.

Lifecycle configuration:

- `sleepAfter`: `10m`;
- `keepAlive`: `false`;
- no tunnel or exposed port;
- no preview/editor request or WebSocket remains active;
- no status/log polling is scheduled.

Service startup:

| Service | Process ID | PID | Status | Ready port |
|---|---|---:|---|---:|
| Astro dev | `astro-dev` | 85 | running | 4321 |
| code-server | `code-server` | 173 | running | 8080 |

- Combined service startup measurement: 4,090 ms.
- Astro command: `npm run dev` in `/workspace/demo`.
- code-server command: `code-server --bind-addr 0.0.0.0:8080 --auth none
  --disable-telemetry /workspace/demo`.
- Both internal port checks: listening.
- `/workspace/idle-sentinel.txt`: present with the non-secret test marker.
- Astro source marker: post-boot `IDLE MUTATION` present.
- Astro source SHA-256:
  `c3ced8a59d809a793b8a23812147873d7cc3189dc7c54edd7ac36c6d8a9b12f8`.
- Explicit shell session `idle-shell`: available.
- Shell environment marker: present.
- Local placement ID: unavailable (`null`), so placement comparison will not be used as a
  verdict input.

Final pre-idle snapshot: `2026-07-10T23:38:41.680Z`.

## Completed idle window

The first wake request was held until after `2026-07-10T23:48:56.680Z`. During the interval,
the implementation issued no Sandbox API, preview, editor, tunnel, WebSocket, log-stream,
Docker-exec, or process-status request.

- Last pre-idle activity: `2026-07-10T23:38:41.680Z`.
- First wake request began: `2026-07-10T23:49:10.512Z`.
- Idle before the request: 628,832 ms (10m28.832s).
- First wake snapshot completed: `2026-07-10T23:49:11.934Z`.
- Snapshot-to-snapshot duration: 630,254 ms (10m30.254s).
- Wrangler emitted `Activity expired, signalling container to stop` before the wake request.

The Worker stayed running. No explicit destroy, process kill, Docker stop, or Wrangler stop
caused the lifecycle transition.

## First wake — before relaunch

`POST /wake` was the first post-idle Sandbox operation. The endpoint had no service-start,
file-write, or restore call path.

| Observation | Before idle | After wake | Outcome |
|---|---|---|---|
| Astro process | PID 85, running | absent | did not resume |
| code-server process | PID 173, running | absent | did not resume |
| port 4321 | listening | closed | listener lost |
| port 8080 | listening | closed | listener lost |
| sentinel file | present | absent | ordinary filesystem write lost |
| Astro marker | `IDLE MUTATION` | `HMR BEFORE` | source edit lost; image restored |
| Astro hash | `c3ced8…b12f8` | `961b54…44a9` | content reverted to image baseline |
| shell marker | present | empty | shell environment lost |

The same Sandbox ID remained addressable. The explicit session name could be wrapped again,
but its exported variable was empty; session naming did not preserve shell state. Local
transport supplied no placement ID, so it was not used as evidence.

## Relaunch probe

Only after the first-wake response was captured did `POST /relaunch` run.

- Relaunch duration: 4,090 ms.
- Astro: new PID 122, running, port 4321 listening.
- code-server: new PID 210, running, port 8080 listening.
- Sentinel after relaunch: still absent.
- Astro source after relaunch: baked `HMR BEFORE` baseline.
- Shell marker after relaunch: still empty.

Both applications can be started deterministically from a fresh image, but application
relaunch does not recover the collaborative workspace.

## Verdict

**RELAUNCH REQUIRED.**

- **NO-GO for transparent resume:** neither Astro nor code-server survives idle sleep.
- **CONDITIONAL GO for `S-004-03`:** the fresh container can launch both services, but the
  permanent lifecycle must restore externally durable workspace state first and supervise
  service startup idempotently.

The downstream lifecycle must detect fresh state, restore/mount the worktree, start both
services, wait for their ports, and re-establish transient forwarding before reporting ready.
It must treat terminals and shell state as fresh. `keepAlive: true` can avoid automatic sleep
during an actively shared session, but it requires explicit disable/destroy and does not
replace persistence.

An in-container supervisor cannot survive container sleep. Worker/DO-level orchestration is
the required wake mechanism; an in-container init can only help with crashes while active.

## Durable artifacts

- `docs/active/work/T-004-01-02/sleep-wake-evidence.json` contains the redacted structured
  snapshots, comparison, relaunch, consequence, cleanup, and limitations.
- `docs/knowledge/sandbox-sleep-wake-spike.md` contains the human-readable committed finding,
  exact configuration, timeline, go/no-go, and `S-004-03` requirements.

Both artifacts explicitly label the experiment local and preserve the separate production and
browser gaps from `T-004-01-01`.

## Cleanup

- `POST /destroy`: success at `2026-07-10T23:49:28.601Z`.
- Wrangler local server: stopped cleanly.
- Residual `cloudflare/proxy-everything` helper: identified and stopped.
- Transient `/tmp/t004-sleep-wake` tree: removed.
- Remote resources created: none.
- Stable App Worker/DNS/routes: untouched.

## Plan adherence so far

- The retained image made a shortened-timeout preflight unnecessary.
- The actual acceptance run began directly with `sleepAfter: "10m"`.
- The shell marker is observed through an explicit named SDK session.
- Local placement IDs are not surfaced by this transport; process IDs, ports, filesystem,
  source, and shell state provide the comparison.
- The first-wake endpoint has no start/write/restore call path.
- The first-wake snapshot was captured before the relaunch request.
- The observed result matched current platform documentation but the verdict comes from the
  empirical snapshots.
- Cleanup completed immediately after the relaunch evidence.

## Remaining before Review

1. Commit the durable finding/evidence/Progress.
2. Write Review.

## Verification

Artifact checks:

- `sleep-wake-evidence.json` parsed successfully with Node’s standard JSON parser.
- `git diff --check` passed for all ticket artifacts and the knowledge note.
- A first keyword-oriented sensitive scan matched explanatory words such as “OAuth” and
  “credentials”; it correctly stopped the combined command before repository tests, but these
  were prose, not values.
- The scan was refined to actual sensitive values/patterns: the known account email, account
  identifier, local Sandbox/trace identifiers, Bearer values, and `sk-` tokens.
- The refined sensitive-value scan passed with no matches.

Repository checks:

- `npm test`: **100/100 pass**, 0 failures, 0 skips.
- `npm run typecheck`: Astro **0 errors / 0 warnings / 0 hints**; TypeScript passed; generated
  Worker types are current.
- `npm run build`: passed.
- `npm run deploy:dry`: passed; stable App Worker bundle and bindings packaged successfully.
- The stable dry run included only the existing D1, Assets, version metadata, and
  `DEMO_FAULT` bindings; no Sandbox/container binding entered production configuration.

The build/typecheck emitted the repository’s existing informational deprecation warning for
Astro’s string-form memory session driver. It is unrelated to this documentation/evidence-only
ticket.

## Implementation state before Review

- All empirical observations are captured in durable artifacts.
- The local Sandbox and helper resources are cleaned up.
- No production resource was created or mutated.
- Research, Design, Structure, Plan, and Implement artifacts are complete.
- The ticket frontmatter remains untouched.
- Review is the only remaining RDSPI phase.
