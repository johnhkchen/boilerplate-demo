# Design — T-004-01-02 spike-container-sleep-wake-survival

Options, tradeoffs, and decisions for obtaining an honest idle sleep/wake finding from the
available environment while keeping permanent session implementation out of this spike.

## Decision in one line

Run a disposable local Sandbox SDK Worker against the exact retained image from
`T-004-01-01`, configure `sleepAfter: "10m"` with `keepAlive: false`, start Astro and
code-server as managed background processes, write several post-boot state markers, leave the
Sandbox completely untouched for slightly more than ten minutes, then make one wake request
that inspects process, port, filesystem, source, and shell state before any service relaunch.

## What this spike must decide

The downstream lifecycle cannot be designed around the vague phrase “Sandbox wakes.” The
relevant distinction is:

- **resume:** the same process instances and post-boot filesystem state continue;
- **relaunch:** a fresh container exists, but the application must restore workspace state and
  start Astro/code-server again;
- **unusable:** neither a reliable resume nor a bounded restore/relaunch path exists.

The acceptance criterion also requires a go/no-go. For this spike:

- GO means `S-004-03` can proceed with an explicit lifecycle consistent with observed and
  documented behavior;
- NO-GO means the intended one-session experience has no credible lifecycle on the chosen
  platform.

A GO does not have to mean transparent process resumption. It may mean the platform’s
sleep/wake contract is deterministic enough to design a restore-and-relaunch lifecycle.

## Option 1 — rely only on current documentation

The current official Sandbox lifecycle page already states that idle stop deletes ordinary
files, terminates all processes, resets shell state, and clears interpreter contexts. That
answer is direct and current.

Advantages:

- no ten-minute wall-clock wait;
- no transient Worker/image setup;
- production semantics come from the platform owner;
- avoids interpreting local emulation details.

Rejected as the complete ticket result because the acceptance criterion requires a finding
“from a forced ~10-minute idle sleep and wake.” Documentation is corroboration, not the
requested empirical observation.

## Option 2 — remote production Sandbox cycle

Deploy the disposable Worker/image to Cloudflare, use the default ten-minute timeout, and
observe the real edge/container lifecycle.

Advantages:

- strongest evidence for production placement and eviction behavior;
- exercises the same managed service intended by the epic;
- removes differences between local Docker orchestration and Cloudflare Containers.

Rejected as executable in the current environment. A live `wrangler containers list` call
returns an entitlement error stating that the account lacks Containers access and requires
the Workers Paid plan. The OAuth token already has Containers write scope. Upgrading a paid
plan is a financial action outside this ticket’s authority.

This remains the preferred follow-up confirmation once the sovereign project account is
entitled.

## Option 3 — direct Docker stop/start

Run the retained image directly, start both services, stop the Docker container for ten
minutes, and start it again.

Advantages:

- simple control over exact stop/start timing;
- direct observation of process and writable-layer behavior;
- no Worker or Durable Object setup.

Rejected because Docker stop/start is not the Sandbox SDK inactivity path. Docker normally
preserves a stopped container’s writable layer, while the documented Sandbox path starts a
fresh container. It would answer the wrong lifecycle question and could produce the opposite
filesystem result.

## Option 4 — local Sandbox with a shortened timeout

Use `sleepAfter: "30s"` or `"1m"` to validate the experiment mechanics quickly.

Advantages:

- fast feedback on whether local Wrangler honors inactivity;
- catches accidental polling or keepalive behavior;
- allows iteration before the long acceptance run.

Selected only as an optional preflight. A short run cannot replace the required
approximately-ten-minute cycle. If used, its result will be labeled preflight and excluded
from the acceptance verdict.

## Option 5 — local Sandbox with the actual ten-minute timeout

Use Wrangler local mode, the SDK’s Sandbox Durable Object, the retained spike image, and
`getSandbox(..., { sleepAfter: "10m", keepAlive: false })`.

Advantages:

- exercises the SDK’s actual inactivity management rather than raw Docker controls;
- runs the exact Astro/code-server image already proven to start locally;
- requires no account mutation or plan change;
- can inspect process and file APIs before and after the same timeout;
- satisfies the ticket’s requested wall-clock shape.

Limitations:

- local Docker is not remote Cloudflare placement;
- local scheduler precision may differ;
- it does not settle production cold-start duration;
- it cannot clear the prerequisite ticket’s missing browser/remote evidence.

Selected as the available empirical experiment, corroborated by current official lifecycle
documentation and explicitly scoped as local evidence.

## Test topology

The disposable tree lives outside the repository and contains:

```text
temporary Worker
  ├─ Sandbox Durable Object binding
  ├─ fixed sandbox ID: t004-sleep-wake
  ├─ lifecycle/control HTTP endpoints
  └─ local Docker container
       ├─ /workspace/demo (baked minimal Astro app)
       ├─ Astro dev on 4321
       └─ code-server on 8080
```

The Worker does not expose public preview URLs. Control endpoints call Sandbox APIs directly.
HTTP readiness can be checked from inside the container with one-time commands before idle.
Removing exposed ports and WebSockets from the acceptance cycle avoids accidental traffic that
would keep the Sandbox active.

## Exact idle configuration

Every endpoint obtains the same Sandbox identity with:

```ts
getSandbox(env.Sandbox, "t004-sleep-wake", {
  sleepAfter: "10m",
  keepAlive: false,
});
```

The experiment does not call `setKeepAlive(true)`. No periodic status request, log stream,
preview request, editor request, HMR socket, code-server socket, tunnel, or exposed-port proxy
remains active during the idle window.

The wait target is slightly longer than ten minutes. The authoritative timestamps are UTC
times captured immediately before the last pre-idle response and at the first post-idle
request. The first wake request should occur at least ten minutes and fifteen seconds later.

## Setup behavior

`POST /setup` will:

1. obtain the fixed Sandbox;
2. remove stale background processes if a prior local run exists;
3. restore the baked Astro marker to a known pre-test value if needed;
4. write `/workspace/idle-sentinel.txt` with a unique non-secret run marker;
5. mutate a baked Astro page marker from its image value to an idle-test value;
6. create an explicit shell session and export a non-secret environment marker;
7. start `npm run dev` in `/workspace/demo` as `astro-dev`;
8. start code-server in `/workspace/demo` as `code-server`;
9. wait for ports 4321 and 8080;
10. capture process IDs, statuses, source hash/content marker, sentinel content, and session
    environment output;
11. return the final pre-idle snapshot and timestamp.

No request follows until the wake probe.

## First-wake behavior

`POST /wake` must inspect before it starts or repairs anything. It will:

1. obtain the same Sandbox ID with the same options;
2. trigger the lazy wake through a read-only operation;
3. list current managed background processes;
4. inspect whether the pre-idle process IDs exist;
5. test whether the two service ports are listening without starting services;
6. read the post-boot sentinel path;
7. inspect the Astro source marker/hash;
8. query the pre-idle shell session or equivalent state if the SDK exposes it;
9. record errors as evidence rather than treating expected absence as harness failure;
10. return a single post-wake snapshot.

Only after that snapshot may a separate relaunch endpoint start services and measure whether
the clean image can recover operationally.

## State matrix

| State | Expected if processes truly resume | Expected if fresh container starts |
|---|---|---|
| Astro process ID | same and running | absent |
| code-server process ID | same and running | absent |
| port 4321 | listening | closed |
| port 8080 | listening | closed |
| `/workspace/idle-sentinel.txt` | present | absent |
| post-boot Astro mutation | present | reverted to baked image |
| shell environment marker | present | absent/session missing |
| same Sandbox ID | yes | yes |

The combination matters more than any single field. A fresh container can share the same
Sandbox ID while containing none of the previous runtime state.

## Relaunch probe

After the first-wake snapshot is durably captured, `POST /relaunch` will start the two commands
again and wait for both ports. This does not alter the survival verdict. It answers the second
ticket question: whether the services can be relaunched and what would be required.

The relaunch probe should not reconstruct the missing sentinel or mutated source. Successful
ports demonstrate service recoverability from the image, while absent post-boot files show why
workspace restoration must precede relaunch in the permanent lifecycle.

## Evidence artifacts

The committed durable finding will live at:

- `docs/knowledge/sandbox-sleep-wake-spike.md` — human-readable result;
- `docs/active/work/T-004-01-02/sleep-wake-evidence.json` — redacted machine evidence.

The JSON will include:

- tested versions and topology;
- configured timeout;
- last-active and first-wake timestamps;
- actual idle duration;
- pre-idle process IDs/statuses and readiness;
- post-wake process list and port state;
- sentinel/source/session comparisons;
- relaunch outcome and timing;
- local-versus-production scope;
- cleanup result.

It will not include account ID, email, OAuth paths, credentials, preview tokens, or secrets.

## Go/no-go decision rule

Three outcomes are possible:

1. **Processes and state resume:** GO with ordinary health checks; supervisor is defensive.
2. **Fresh container, deterministic restore/relaunch succeeds:** conditional GO for
   `S-004-03`, requiring external workspace persistence plus idempotent bootstrap/supervision.
3. **Fresh container cannot reliably restore/relaunch:** NO-GO for the chosen runtime.

Based on the current platform contract, outcome 2 is expected, but the artifact will report
the observation rather than treating that expectation as evidence.

## Downstream design consequences to evaluate

If outcome 2 is observed, `S-004-03` must not model wake as process continuation. Its lifecycle
needs:

- an external durable source of workspace truth;
- restore/mount before service readiness;
- idempotent start-or-restart logic for Astro and code-server;
- health checks based on ports/processes, not cached Durable Object state;
- regenerated transient tunnels/exposures if used;
- a warming response or readiness state during restore;
- explicit keepalive policy for live collaborative sessions;
- cleanup that persists work before disabling keepalive/destroying;
- recovery after Worker/DO hibernation without assuming container continuity.

## Safety and cleanup

- Use only a temporary Worker tree and local Docker.
- Do not deploy, change DNS, change routes, or mutate the stable App Worker.
- Do not write secrets to the container or artifacts.
- Capture first-wake evidence before relaunch.
- Call `sandbox.destroy()` after all observations.
- Stop Wrangler cleanly.
- Stop any residual local proxy/container helper if necessary.
- Remove transient source after the durable evidence is written.
- Preserve unrelated worktree changes.

## Final decision

Proceed with Option 5. Use Option 4 only if needed to validate the timeout harness. Treat the
official lifecycle documentation as corroboration, the local ten-minute run as ticket
evidence, and the account entitlement failure as an explicit production-evidence limitation.
