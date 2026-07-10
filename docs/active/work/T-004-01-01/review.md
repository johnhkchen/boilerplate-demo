# Review — T-004-01-01 spike-sandbox-runs-dev-and-editor

## Review outcome

**The spike produced useful evidence but did not satisfy the ticket acceptance criterion.**

Result: **PARTIAL / NO-GO**.

What passed locally:

- one Sandbox SDK container ran Astro and code-server concurrently;
- one minimal Worker proxied both HTTP surfaces by exact hostname;
- the preview host accepted a Vite `vite-hmr` WebSocket upgrade through the Worker;
- the socket delivered `connected` and then `full-reload` after a source mutation;
- the exact successful local Vite `allowedHosts`/`hmr` configuration is committed;
- both processes remained running and the resulting preview contained the changed marker.

What did not pass:

- the edit was not made through code-server’s browser UI;
- the production Cloudflare container could not deploy on this account;
- therefore edge TLS/`wss`, remote placement, and production proxy behavior remain unproved.

This is the correct kind of failed spike: it narrows the uncertainty and blocks permanent
session code before the project mistakes local feasibility for end-to-end readiness.

## Acceptance criterion assessment

Ticket criterion:

> A committed spike note shows an edit made in the browser IDE reflected in the preview via HMR
> over WebSocket through a minimal Worker proxy, including the exact Vite allowedHosts/hmr
> config required.

| Clause | Review evidence | Verdict |
|---|---|---|
| committed spike note | `docs/knowledge/sandbox-session-spike.md` | PASS |
| Astro dev in Sandbox | process status, logs, preview 200 | PASS locally |
| code-server in Sandbox | process status, logs, editor redirect→200 | PASS locally for HTTP |
| minimal Worker proxy | exact host→port `containerFetch`/`wsConnect` | PASS locally |
| HMR WebSocket | `connected` + `full-reload` frames | PASS locally |
| reflected preview content | before/after HTTP markers | PASS after API mutation |
| exact Vite configuration | complete successful local block committed | PASS locally |
| edit made in browser IDE | browser runtime unavailable; API mutation substituted | **FAIL** |
| production sovereign runtime | account lacks Workers Paid Containers entitlement | **BLOCKED** |

The acceptance checkbox must remain unchecked. Lisa may transition workflow artifacts, but a
human should not interpret artifact completion as product acceptance.

## Files created

### Durable knowledge

`docs/knowledge/sandbox-session-spike.md`

- begins with PARTIAL / NO-GO;
- records pinned versions and tested topology;
- reproduces the exact successful local Astro/Vite server configuration;
- distinguishes the untested production `wss` translation from observed configuration;
- records HTTP, process, and WebSocket evidence;
- maps every acceptance clause;
- records account/browser blockers and the required next run;
- documents remote and local cleanup;
- links primary Cloudflare and Coder references.

### Workflow artifacts

`docs/active/work/T-004-01-01/research.md`

- maps ticket, epic, decisions, neighboring-ticket boundaries, repository/toolchain, current
  Sandbox APIs, transport surfaces, and evidence constraints.

`docs/active/work/T-004-01-01/design.md`

- evaluates local Docker, quick tunnels, wildcard exposed ports, path proxying, and exact custom
  domains;
- selects a deterministic disposable production experiment;
- defines evidence, auth posture, process startup, cleanup, and explicit deferrals.

`docs/active/work/T-004-01-01/structure.md`

- defines persistent versus temporary files;
- specifies Worker/image/demo interfaces and exact routing boundaries;
- preserves production files and ticket frontmatter;
- defines change ordering and commit boundaries.

`docs/active/work/T-004-01-01/plan.md`

- sequences prerequisites, remote deploy, browser proof, evidence, cleanup, verification, and
  review;
- defines abort and rollback conditions;
- makes remote cleanup mandatory.

`docs/active/work/T-004-01-01/progress.md`

- records pre-deploy corrections;
- records the remote entitlement failure before changing course;
- records the browser limitation before substituting the API mutation;
- records exact local results, cleanup, commits, and repository verification.

### Machine-readable evidence

`docs/active/work/T-004-01-01/hmr-websocket-evidence.json`

- redacted socket URL;
- `vite-hmr` protocol;
- open timestamp;
- `connected` and `full-reload` frames;
- mutation issue/response timestamps;
- no Vite token value.

`docs/active/work/T-004-01-01/process-evidence.json`

- process commands/statuses;
- host-to-port routes;
- pinned versions;
- before/after HTTP results;
- remote attempt and cleanup outcome;
- no account ID or OAuth material.

## Files modified or deleted

No existing production, application, configuration, package, ticket, epic, story, or decision
file was intentionally modified by this ticket.

No committed file was deleted.

The disposable `/tmp/t004-sandbox-spike` tree was removed after evidence transcription. It
contained the experimental Worker, generated binding types, Dockerfile, minimal Astro app,
lockfiles, and raw probe script. Keeping it out of the repository was deliberate: permanent
session source belongs to `T-004-03-01`/`T-004-03-02` after this gate passes.

## Commits

1. `a7e5f08 docs(spike): plan Sandbox editor HMR experiment`
   - Research, Design, Structure, Plan.
2. `8045654 docs(spike): record Sandbox HMR no-go finding`
   - durable note, machine evidence, Progress.
3. Final handoff commit
   - final Progress verification and this Review.

Commits were staged by explicit path. Pre-existing/concurrent worktree changes were preserved.

## Verification performed

### Disposable spike verification

- authenticated Wrangler account detected with Workers/Containers OAuth scopes;
- Docker engine 29.6.1 running;
- current Sandbox SDK/image 0.12.3 retrieved and matched;
- Worker bindings generated from temporary Wrangler config;
- temporary TypeScript check passed;
- temporary `wrangler deploy --dry-run` passed;
- Sandbox image built with its original `/container-server/sandbox` entrypoint;
- checksum-verified code-server standalone release installed;
- image shell reported Node 22.23.1, Astro 7.0.7, code-server 4.127.0;
- local `/setup` started both processes;
- preview HTTP 200 contained Vite client and `HMR BEFORE`;
- editor HTTP redirect followed to 200;
- status showed both processes `running`;
- token-authenticated Vite WebSocket upgraded through the Worker;
- same socket received `connected`, then `full-reload` after mutation;
- resulting preview HTTP contained `HMR AFTER`;
- process logs corroborated listeners and version state.

### Repository verification

- `npm test` → 80/80 pass.
- `npm run typecheck` → 0 Astro diagnostics, TypeScript pass, Worker types current.
- `npm run build` → pass.
- `npm run deploy:dry` → pass.
- `git diff --check` → pass for ticket artifacts.
- targeted staged secret/token/private-key grep → no matches.

The existing Astro memory-session-driver deprecation warning remains informational and
unrelated.

## Evidence quality and limits

The HMR evidence is strong for the local Worker bridge:

- the client fetched Vite’s own token exactly as `/@vite/client` does;
- the `vite-hmr` socket returned `101 Switching Protocols` at the Worker;
- `connected` proves the container-side Vite server answered;
- the mutation response and reload frame are timestamped 2 ms apart;
- the after-marker was independently fetched from the preview.

It is not browser evidence. The raw WebSocket probe does not execute Vite client JavaScript,
and the after-marker fetch is not the same as observing an existing browser DOM update. It also
does not exercise code-server’s browser WebSocket or editor save path.

No screenshot was committed because the supported browser runtime reported no available
browser. Generating a synthetic screenshot would reduce evidence quality, not improve it.

## Open concerns

### Critical — Cloudflare plan entitlement

The account rejected the managed image push and explicitly requires the Workers Paid plan for
Containers. OAuth already includes Containers write scope. This cannot be repaired in code or
by relogging Wrangler.

Human action required: decide whether to enable the paid plan on the sovereign project account
or run the gate in another entitled project-owned account. Do not silently shift the runtime to
a centrally owned account; that would violate P6.

### Critical — browser IDE acceptance remains unverified

The browser runtime was unavailable and discovery returned an empty list. A human/CI rerun with
a supported browser must open code-server, edit the file through its UI, save, and observe the
already-open preview. That rerun should capture the preview `wss` connection and code-server’s
own WebSocket.

### Production Vite config is an inference

The local block is proven. Changing `ws`→`wss`, hostname→production host, and client port
8787→443 is technically grounded but unobserved. The durable note labels it accordingly.

### Astro page edit generated `full-reload`

Vite used its HMR WebSocket but sent `full-reload` for the `.astro` page rather than a granular
module update. This still removes manual reload, but the product language should say “live
update via the Vite HMR channel” unless a future test proves state-preserving hot replacement.

### code-server auth was intentionally disabled locally

The spike used `--auth none` behind loopback-only local routing. No remote unauthenticated
editor survived cleanup. Production must remain gated on Cloudflare Access plus independent
origin assertion validation under `T-004-04-01`.

### Node and sizing are not permanent findings

The base image supplied Node 22.23.1 and the local run had Docker host resources. This does not
settle Node 24, `basic` versus another remote instance type, image size, or cold-start budget.
`T-004-03-01` still owns those.

### Sleep/wake remains untouched

No ten-minute idle cycle was attempted. `T-004-01-02` should run only after this gate receives
the missing remote/browser evidence, otherwise it would test lifecycle on an unaccepted path.

## Cleanup review

- partial remote Worker deletion succeeded;
- targeted deployment lookup confirms the Worker no longer exists;
- remote container image never pushed;
- exact remote spike hosts did not resolve;
- local Sandbox destroy returned success;
- Wrangler local process shut down normally;
- residual local proxy helper container was explicitly stopped;
- temporary build tree was removed;
- no production Worker or `demo.b28.dev` mutation was issued.

Cleanup is complete. No known exposed editor or billable spike container remains.

## Recommended disposition

Keep the durable finding committed and treat the ticket as **not accepted / externally gated**.
The next action is not permanent implementation. It is a rerun of this same acceptance chain
after:

1. Containers entitlement exists on the sovereign account; and
2. a supported browser is available.

On that rerun, retain the same exact-host allowlist discipline, use `wss`/443, make the edit in
code-server, capture both WebSockets, and update this note with observed production evidence.
Only then should the sleep/wake spike and permanent session image proceed.

## Critical issues requiring human attention

1. **Workers Paid plan decision** — unavoidable platform prerequisite for the chosen runtime.
2. **Browser-enabled rerun** — unavoidable evidence prerequisite for the ticket wording.

No critical code defect was introduced because no production code was committed.
