# Research — T-004-01-02 spike-container-sleep-wake-survival

Descriptive map of the ticket, its prerequisite evidence, the repository boundary, the
current Sandbox lifecycle contract, and the execution environment available for the forced
idle experiment. This phase records what exists and what must be observed; it does not choose
the lifecycle design.

## Ticket boundary

- Ticket: `docs/active/tickets/T-004-01-02.md`.
- Type: spike.
- Status at the start of work: `open`.
- Current phase at the start of work: `research`.
- Priority: high.
- Agent route: Codex.
- Parent story: `S-004-01`, “container-session-spike.”
- Dependency: `T-004-01-01`.
- Lisa owns phase and status transitions.
- This work must not edit the ticket frontmatter.
- The sole acceptance criterion requires a committed finding.
- The finding must come from a forced approximately ten-minute idle sleep and wake.
- It must record whether both Astro dev and code-server resume.
- It must record whether either process must be relaunched.
- It must record what state is lost.
- It must state a go/no-go.
- It must state the consequence for the `S-004-03` lifecycle design.

## Place in E-004

`docs/active/epic/E-004.md` defines collaborative demo environments as a permanent
Cloudflare-first capability. One Sandbox container is intended to host an isolated worktree,
Astro dev server, and code-server. A Sessions Worker will front private preview and editor
hostnames. The stable public demo remains a separate App Worker.

The epic names sleep/wake process survival as its highest recorded risk. Its intended user
experience assumes a teammate can return to a session that still feels alive. The epic gates
the permanent session build on Phase 0 evidence for both WebSocket proxying and idle lifecycle.

`docs/knowledge/demo-environments-decisions.md` records the current architecture binding:

- Cloudflare Containers through the Sandbox SDK, not an owner-managed VM or tunnel host;
- one Sandbox per collaborative session;
- Astro and code-server co-resident in that Sandbox;
- isolated worktree state inside the session;
- uncommitted work preserved before explicit teardown;
- secrets injected at launch, not baked into the image or worktree;
- trusted or semi-trusted teammates, not hostile public multi-tenancy.

The decision record originally described filesystem survival across sleep as uncertain. The
current platform documentation now states the lifecycle behavior explicitly, but this ticket
still requires an empirical cycle with the intended processes.

## Prerequisite ticket result

`T-004-01-01` produced a local Sandbox SDK spike and durable note at
`docs/knowledge/sandbox-session-spike.md`. Its Review labels the result PARTIAL / NO-GO for its
own acceptance criterion.

Observed locally in that spike:

- Sandbox SDK and image version `0.12.3`;
- Wrangler `4.110.0`;
- Astro `7.0.7` listening on `0.0.0.0:4321`;
- code-server `4.127.0` listening on `0.0.0.0:8080`;
- both services ran concurrently as Sandbox background processes;
- a minimal local Worker proxied HTTP to both services;
- a Vite `vite-hmr` WebSocket crossed the local Worker/Sandbox path;
- a source mutation caused a `full-reload` frame on the same socket;
- preview content changed from `HMR BEFORE` to `HMR AFTER`;
- both background processes still reported `running` before cleanup.

Not observed in that spike:

- a browser-UI edit through code-server;
- a production container deployment;
- production edge TLS and `wss`;
- code-server’s browser WebSocket;
- any idle sleep/wake cycle.

The local spike used a disposable image extending `docker.io/cloudflare/sandbox:0.12.3`. The
image baked the minimal Astro app and code-server and preserved the Sandbox base entrypoint.
The transient source tree was removed, but the built Docker image remains locally as
`demo-runway-t004-sandbox-spike-sandbox:worker` and is suitable for reproducing the same two
processes without altering production repository code.

## Current repository shape

The production repository is an Astro application deployed as a Cloudflare Worker.

- `package.json` requires Node `>=22.12.0`.
- The current host has Node `v26.5.0` and npm `11.17.0`.
- Astro is `^7.0.7`.
- Wrangler is `^4.110.0`; the installed command reports `4.110.0`.
- The root package does not depend on `@cloudflare/sandbox`.
- The root has no Sandbox Worker entrypoint or Dockerfile.
- `wrangler.jsonc` belongs to the stable App Worker.
- That production config has no container, Sandbox Durable Object, or migration declaration.
- No permanent session lifecycle implementation exists yet.

The repository already contains unrelated and concurrent uncommitted E-004 planning and
implementation files. Ticket work must use path-scoped edits and must preserve all existing
changes. The ticket file itself is currently untracked and belongs to Lisa/user planning.

## Current account and local runtime availability

Wrangler is authenticated and the OAuth grant includes Containers write scope. A live
`wrangler containers list` check still fails because the account does not have Cloudflare
Containers entitlement. The error says Containers require the Workers Paid plan. This is an
account-plan gate, not a missing OAuth permission.

No plan change is authorized by this ticket. A remote production sleep/wake experiment cannot
run on this account in its current state.

Docker Desktop is running locally. The Docker server reports version `29.6.1`. The disposable
Sandbox image from `T-004-01-01` remains in the local image store. Local Wrangler plus Docker
therefore provides the available empirical path for this ticket.

## Current Sandbox lifecycle contract

The official Sandbox lifecycle documentation, updated May 27, 2026, describes four relevant
states:

1. referencing a sandbox ID creates its Durable Object identity;
2. the first operation lazily starts its container;
3. active state retains files, processes, shell sessions, variables, and interpreter state;
4. after the inactivity timeout, the container stops; the next request starts a fresh
   container in the initial image state.

The documented default inactivity timeout is ten minutes. `getSandbox()` accepts
`sleepAfter` as either a duration string or seconds. `keepAlive: true` disables automatic
sleep by sending periodic heartbeats and causes `sleepAfter` to be ignored.

The current documentation explicitly says that after idle stop:

- files written to ordinary container paths are deleted;
- background processes terminate;
- shell state resets;
- interpreter contexts clear;
- the same sandbox ID wakes into a clean container.

The Sandbox identity is durable; the container’s ordinary filesystem and processes are not.
Mounted object storage is the documented persistence mechanism for state that must survive a
container lifecycle. The SDK also has backup/restore capabilities, but neither is present in
the project today.

Official references inspected:

- <https://developers.cloudflare.com/sandbox/concepts/sandboxes/>
- <https://developers.cloudflare.com/sandbox/configuration/sandbox-options/>
- <https://developers.cloudflare.com/sandbox/guides/background-processes/>
- <https://developers.cloudflare.com/sandbox/tutorials/persistent-storage/>

## Background-process behavior while active

The Sandbox SDK’s current long-running service API is `startProcess()`. It is intended for web
servers, development servers, watch modes, and other background services. A process can be
waited on for a port or log marker, listed, inspected, and killed.

While a container remains active, background processes continue running. Merely starting a
long-running process does not keep the container active through an otherwise idle period. The
background-process guide tells callers to use `keepAlive: true` when processes must run
indefinitely despite request inactivity.

The prerequisite spike used managed background processes and stable process IDs. Those IDs
belong to the active container’s process registry; they are not documented as restart
declarations or durable supervisor configuration.

## Meaning of “idle” for the experiment

The timeout is based on Sandbox request/activity traffic, not on whether an internal process
is still computing or listening. An experiment that polls status during the interval would
renew activity and prevent the target sleep. An open editor, terminal, preview WebSocket, or
HMR WebSocket may likewise keep a real interactive session active and must be absent during
the forced idle window.

The evidence cycle therefore needs:

- setup calls that create state and start both services;
- a final pre-idle snapshot;
- no Sandbox API, preview, editor, status, or WebSocket traffic for approximately ten minutes;
- a first post-idle wake operation;
- post-wake inspection performed only after the sleep should have occurred.

The wall-clock interval should exceed the configured/default threshold by a small margin so
scheduler precision does not create an ambiguous boundary result.

## State categories to observe

Process survival alone is insufficient for the acceptance criterion. The experiment can
observe distinct categories without storing secrets:

- Astro background-process record and PID;
- code-server background-process record and PID;
- preview port reachability;
- editor port reachability;
- a marker written to `/workspace` after container start;
- a mutation to the baked Astro source file;
- a shell/session environment marker;
- process logs or process identifiers from before idle;
- the fresh image’s original baked source after wake.

Ordinary image contents should reappear because a new container starts from the image. Files
and mutations created after start should disappear if the documented lifecycle applies.

## Evidence quality constraints

- A ten-minute host `sleep` without setting Sandbox inactivity would be ambiguous if requests
  or keepalive traffic were still occurring.
- Calling `destroy()` is not equivalent to idle sleep; it explicitly deletes the sandbox and
  would not test the timeout path.
- Killing processes manually is not equivalent to container sleep.
- Restarting Wrangler is not equivalent to Sandbox idle eviction.
- A shortened `sleepAfter` can preflight the mechanics, but the acceptance run must retain an
  approximately ten-minute threshold/window.
- Local evidence exercises the SDK’s local Durable Object/container orchestration, not remote
  Cloudflare placement or production eviction timing.
- Documentation can corroborate the observed result but cannot replace the forced cycle.
- The finding must not overstate local results as production account evidence.

## Downstream boundary

`S-004-03` contains the permanent one-session implementation tickets. `T-004-03-01` owns the
session image and Wrangler Containers configuration. `T-004-03-02` owns the one-session
`up/status/logs/down` lifecycle and branded routing.

This spike can determine requirements for those tickets, but should not add the permanent
session runtime itself. The durable output is evidence and a lifecycle consequence. Any
supervisor, restore mechanism, keepalive policy, or persisted workspace belongs downstream.

## Research constraints and assumptions

- The ticket explicitly instructs work to continue through all remaining RDSPI phases.
- The prerequisite ticket’s unresolved production/browser gate remains real.
- The current account cannot supply remote container evidence without a financial plan change.
- The local image faithfully represents the exact Astro/code-server versions used in the
  prerequisite spike.
- The local run can answer how this SDK version handles the two processes across its idle
  lifecycle, while the official lifecycle contract supplies production semantics.
- No production Worker, route, DNS record, or stable-demo configuration needs modification.
- No credentials, account identifiers, generated exposure tokens, or local Wrangler paths
  belong in committed evidence.
- Cleanup must destroy the local sandbox, stop Wrangler, and remove transient source while
  preserving the reusable Docker image unless removal is necessary.
