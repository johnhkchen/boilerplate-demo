# Review — T-004-01-02 spike-container-sleep-wake-survival

## Review outcome

**The ticket’s requested sleep/wake finding is complete and committed.**

Empirical result: **RELAUNCH REQUIRED**.

Go/no-go:

- **NO-GO for transparent process resume.** Neither Astro dev nor code-server survives a
  Sandbox idle sleep.
- **CONDITIONAL GO for the `S-004-03` session build.** A fresh container relaunched both
  services successfully, but the permanent lifecycle must restore durable workspace state and
  supervise startup before reporting the session ready.

The forced local idle interval lasted 10m28.832s before the first wake request. Wrangler
reported that activity expired and signalled the container to stop. The first wake snapshot,
captured before any repair, found no processes, closed service ports, no sentinel file, the
baked source restored, and the shell environment marker gone.

## Acceptance criterion assessment

Ticket criterion:

> A committed finding from a forced ~10-minute idle sleep and wake records whether both
> processes resume or must be relaunched, what state is lost, a go/no-go, and the consequence
> for the S-004-03 lifecycle design.

| Clause | Evidence | Verdict |
|---|---|---|
| committed finding | `docs/knowledge/sandbox-sleep-wake-spike.md`, commit `efead31` | PASS |
| forced approximately ten-minute idle | 628,832 ms before first wake request | PASS |
| actual activity timeout | Wrangler: `Activity expired, signalling container to stop` | PASS locally |
| Astro resume/relaunch result | PID 85 absent; port closed; relaunched as PID 122 | PASS |
| code-server resume/relaunch result | PID 173 absent; port closed; relaunched as PID 210 | PASS |
| state loss recorded | process, sockets, file, source edit, shell env itemized | PASS |
| go/no-go | transparent resume NO-GO; session build CONDITIONAL GO | PASS |
| `S-004-03` consequence | restore-before-ready and idempotent supervision requirements | PASS |

The criterion does not explicitly require a production deployment. The local evidence meets
the requested finding shape, while this Review clearly flags that production confirmation is
still required before the epic’s full Phase 0 gate can be called cleared.

## What changed

### RDSPI artifacts created

`docs/active/work/T-004-01-02/research.md`

- maps the ticket, epic, prerequisite result, repository, account/runtime state, current
  Sandbox lifecycle contract, state categories, and evidence constraints;
- stays descriptive and does not select the implementation.

`docs/active/work/T-004-01-02/design.md`

- evaluates documentation-only, remote, raw-Docker, shortened-timeout, and actual-ten-minute
  local options;
- selects the available ten-minute local Sandbox cycle;
- defines snapshot, relaunch, go/no-go, cleanup, and downstream decision rules.

`docs/active/work/T-004-01-02/structure.md`

- defines persistent and transient files;
- specifies control endpoints and first-wake-before-relaunch ordering;
- defines the evidence schema, helper boundaries, commit boundaries, and invariants.

`docs/active/work/T-004-01-02/plan.md`

- sequences prerequisites, harness creation, setup, untouched idle, wake, relaunch, evidence,
  cleanup, verification, commits, and Review;
- defines abort conditions and verification gates for every step.

`docs/active/work/T-004-01-02/progress.md`

- records actual versions, account entitlement, harness validation, pre-idle state, idle
  timestamps, first-wake results, relaunch, verdict, cleanup, deviations, and verification;
- distinguishes the explanatory-keyword scan false positive from the successful sensitive-
  value scan.

`docs/active/work/T-004-01-02/review.md`

- provides this final acceptance mapping, change summary, evidence assessment, coverage,
  limitations, and human handoff.

### Evidence created

`docs/active/work/T-004-01-02/sleep-wake-evidence.json`

- records tested versions and local scope;
- records exact lifecycle options and timestamps;
- retains the complete before/after snapshots;
- compares processes, ports, sentinel, source, and shell state;
- records new PIDs and relaunch time;
- lists downstream requirements and cleanup;
- excludes account identity, credentials, trace IDs, and local Sandbox identifiers.

### Durable knowledge created

`docs/knowledge/sandbox-sleep-wake-spike.md`

- leads with RELAUNCH REQUIRED;
- gives the exact `getSandbox()` options and process commands;
- explains why the experiment was local;
- records the 10m28.832s untouched idle interval;
- distinguishes the first wake from subsequent relaunch;
- itemizes state loss;
- explains why an in-container supervisor cannot survive sleep;
- defines Worker/DO-level restore and service orchestration for `S-004-03`;
- preserves the prerequisite ticket’s separate unresolved gaps;
- links current official Cloudflare lifecycle, options, process, backup, and persistence docs.

## Files modified or deleted

No existing production, application, test, package, configuration, ticket, story, epic, or
decision file was intentionally modified by this ticket.

No committed file was deleted.

The transient `/tmp/t004-sleep-wake` harness was removed after evidence capture. It contained
the disposable Worker entrypoint, config, Dockerfile, package graph, and dependencies. Keeping
it out of the repository preserves downstream ownership: permanent session image/runtime code
belongs to `T-004-03-01` and `T-004-03-02`.

## Ticket frontmatter

`docs/active/tickets/T-004-01-02.md` was not edited. Its `phase` and `status` remain under
Lisa’s control, exactly as requested.

The ticket file was already an untracked Lisa/user artifact in the shared worktree. This work
did not stage or commit it.

## Commits

1. `67da49c` — `docs(spike): plan Sandbox sleep wake experiment`
   - Research, Design, Structure, Plan.
2. `efead31` — `docs(spike): record Sandbox sleep wake finding`
   - Progress, machine evidence, durable knowledge note.
3. Final Review commit
   - this Review and final Progress handoff.

All commits used explicit path-scoped staging. Pre-existing/concurrent worktree changes were
preserved.

## Empirical coverage

### Pre-idle service state

- Astro managed process `astro-dev`, PID 85, running.
- code-server managed process `code-server`, PID 173, running.
- port 4321 listening.
- port 8080 listening.
- `/workspace` sentinel present.
- baked Astro source mutated after boot.
- named explicit shell session contained an exported marker.
- combined startup/readiness measurement: 4,090 ms.

### Idle discipline

- `sleepAfter: "10m"`.
- `keepAlive: false`.
- no tunnel or exposed service.
- no preview/editor traffic.
- no WebSocket.
- no status poll or Sandbox log stream.
- no Docker exec.
- Wrangler Worker remained running.
- first wake began 628,832 ms after final pre-idle activity.
- Wrangler independently logged the activity-expired stop signal.

### First wake before relaunch

- managed process list empty;
- Astro port closed;
- code-server port closed;
- sentinel absent;
- source mutation absent;
- source hash matched the baked image baseline;
- shell marker absent;
- same logical Sandbox ID still addressable.

This proves the difference between durable Sandbox identity and ephemeral container state.

### Relaunch

- relaunch occurred only after the first-wake response was captured;
- Astro started as PID 122 and reached port 4321;
- code-server started as PID 210 and reached port 8080;
- total relaunch readiness: 4,090 ms;
- workspace and shell state remained unrestored.

## Repository verification

- evidence JSON parse: pass;
- `git diff --check`: pass;
- targeted sensitive-value scan: pass;
- `npm test`: **100/100 pass**, 0 failures, 0 skips;
- `npm run typecheck`: Astro 0 diagnostics, TypeScript pass, Worker types current;
- `npm run build`: pass;
- `npm run deploy:dry`: pass.

The stable App Worker dry run showed only its existing D1, Assets, version metadata, and
`DEMO_FAULT` bindings. No Sandbox/container declaration entered the production package.

The existing Astro string-form memory-session-driver deprecation warning remains
informational and unrelated.

## Cleanup review

- Sandbox destroy succeeded at `2026-07-10T23:49:28.601Z`.
- Wrangler stopped cleanly.
- the residual Wrangler `proxy-everything` helper container was stopped;
- the transient harness tree was removed;
- no remote Worker or managed container was created;
- no route, custom domain, DNS record, secret, or stable demo resource was changed.

Cleanup is complete. No known exposed or billable ticket resource remains.

## Evidence quality

The evidence is strong for Sandbox SDK `0.12.3` local lifecycle semantics:

- two intended real services were ready before idle;
- multiple independent runtime-state markers agreed before and after;
- the no-traffic interval exceeded the configured timeout;
- Wrangler reported the actual activity-expired transition;
- inspection preceded relaunch;
- the restored source checksum proves a fresh image baseline rather than merely crashed
  application processes;
- relaunch with new PIDs proves the image remained operational.

The official May 2026 Sandbox lifecycle documentation independently states the same contract:
idle stop terminates processes and clears ordinary files/shell state; the next request starts
a fresh container. The artifact verdict is based on the experiment, with documentation as
corroboration.

## Test and evidence gaps

### Production container lifecycle

The account lacks Workers Paid Containers entitlement. Remote Cloudflare placement, eviction
timing, cold start, production filesystem restore, and production relaunch were not exercised.

This is the most important remaining confirmation for this ticket’s downstream use.

### Placement identifier

Local transport returned `null` for placement ID, so the evidence cannot compare placement
identities. The lifecycle conclusion remains well-supported by process, port, file, source,
shell, checksum, and Wrangler-event evidence.

### Workspace restore implementation

This spike proved state loss and clean-image relaunch. It did not implement or time R2-backed
Sandbox backup/restore, a persistent mount, git restore, or patch recovery. Those are design
requirements for `S-004-03`, not hidden implementation in this spike.

### Browser/editor reconnection

No browser was used. The prerequisite `T-004-01-01` still lacks its required browser-IDE edit
and production WebSocket evidence. This ticket tested lifecycle, not the browser interaction.

### Crash-while-active supervision

The experiment tested idle container replacement, not one service crashing while the
container remains active. An in-container init or Worker-level monitor may still be useful for
active-runtime failures, but it cannot provide sleep persistence.

## Required `S-004-03` lifecycle design

The downstream implementation must:

1. persist/back up the mutable worktree outside ordinary container state;
2. detect fresh runtime state from actual process/port/file health;
3. restore or mount workspace before service readiness;
4. start Astro and code-server idempotently on each fresh wake;
5. wait for both health checks before routing users;
6. re-establish transient forwarding after restart when applicable;
7. expose `restoring`/`starting` rather than falsely returning `ready`;
8. treat terminal/shell sessions as fresh after wake;
9. use keepalive deliberately during active collaboration or accept cold recovery;
10. persist uncommitted work before disabling keepalive, automatic sleep, or destroy;
11. explicitly destroy keepalive sessions at end-of-life;
12. bound and surface restore/start failures.

A container-internal supervisor alone is insufficient because it dies with the container.
Wake orchestration belongs at the Worker/Durable Object layer, with optional in-container
supervision only for active-runtime process crashes.

## Open concerns requiring human attention

1. **Workers Paid plan decision.** Production confirmation and the actual session runtime
   cannot deploy on the current account until Containers entitlement exists.
2. **Persistence mechanism selection.** `S-004-03` must select Sandbox backup/restore, a durable
   mount, or a git/patch recovery design and prove it across production sleep.
3. **User-experience policy.** Decide whether live sessions use `keepAlive: true` for immediate
   continuity or expose a restore/relaunch cold wake after inactivity.
4. **Prerequisite gate remains partial.** The browser IDE edit and production proxy/WebSocket
   chain from `T-004-01-01` still need an entitled browser-enabled rerun.
5. **Wake budget.** The 4.09-second local service relaunch excludes remote image cold start and
   workspace restore; it is not the production wake latency.

## Final disposition

Accept this spike’s lifecycle finding and carry its requirements into `S-004-03`. Do not design
the permanent session around process resumption or container-local filesystem durability.

Before calling the epic’s full Phase 0 gate cleared, obtain Containers entitlement and rerun
the end-to-end production browser/HMR plus sleep/restore/relaunch chain. Until then, the chosen
runtime is conditionally viable, not production-proven.
