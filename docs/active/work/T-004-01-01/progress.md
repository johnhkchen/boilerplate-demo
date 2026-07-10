# Progress — T-004-01-01 spike-sandbox-runs-dev-and-editor

Live implementation log. The experiment is in progress; Review has not started.

## Completed before deployment

| Step | Outcome |
|---|---|
| Research | Repository, ticket boundary, current SDK APIs, and host prerequisites mapped. |
| Design | Chose a disposable one-Worker/one-Sandbox/two-host exposed-port experiment. |
| Structure | Defined durable note, evidence, temporary tree, interfaces, and cleanup. |
| Plan | Sequenced validation, remote run, browser evidence, cleanup, and review. |
| RDSPI commit | `a7e5f08 docs(spike): plan Sandbox editor HMR experiment` |
| Temporary Worker | Generated bindings; TypeScript check passes. |
| Temporary image | Sandbox 0.12.3 + Node 22.23.1 + Astro 7.0.7 + code-server 4.127.0. |
| Dry run | Worker bundle and container image build pass under Wrangler 4.110.0. |

## Pre-deploy corrections

1. The first dry run found that the inner Astro lockfile had been generated from the outer
   directory. Generated `demo/package-lock.json` from the correct directory and reran checks.
2. code-server’s npm package first required `--unsafe-perm`, then failed its nested VS Code
   dependency install inside the Sandbox base. Switched to Coder’s official standalone Linux
   release, pinned at 4.127.0 and verified during build with its published SHA-256 digest.

These were confined to `/tmp/t004-sandbox-spike`; no repository runtime file changed.

## Plan deviation — remote container entitlement

The remote `wrangler deploy` uploaded Worker version
`3bdb31b1-9ae9-44f8-b613-83a1561e84fb`, then failed while pushing the container image with
`Unauthorized`. A targeted `wrangler containers list` clarified the cause:

> You do not have access to Cloudflare Containers. Deploying containers requires the Workers
> Paid plan.

`wrangler whoami` lists the OAuth container scope, so refreshing OAuth cannot resolve the
account-plan entitlement. Purchasing/upgrading a paid plan is a financial/external action not
authorized by this ticket.

### Adjustment before proceeding

Continue the acceptance interaction under local Wrangler with the same published Sandbox
image and actual Worker runtime boundary:

- `preview.t004.localhost:8787` routes through the Worker to Sandbox port 4321;
- `editor.t004.localhost:8787` routes through the Worker to Sandbox port 8080;
- normal HTTP uses `sandbox.containerFetch()`;
- WebSocket upgrades use `sandbox.wsConnect()`;
- Astro’s exact Vite host/HMR config targets the preview hostname and external port 8787;
- the edit is still made through code-server’s browser UI and observed without reload.

This adjustment proves the acceptance criterion’s minimal Worker proxy/HMR chain locally, but
does **not** prove Cloudflare’s production container registry, remote placement, edge TLS, or
`proxyToSandbox()` exposed-port routing. The durable note and Review will flag that gap and the
Paid-plan gate for human attention. The failed remote Worker is deleted before local testing.

## Implementation outcomes

| Checkpoint | Outcome |
|---|---|
| Partial remote Worker | Deleted; deployment lookup returns Cloudflare code 10007 / does not exist. |
| Planned remote custom domains | Did not resolve before or after the attempt. |
| Local Worker | Served at port 8787 with a same-script Sandbox Durable Object. |
| Preview HTTP proxy | `preview.t004.localhost:8787` → Sandbox 4321 → 200. |
| Editor HTTP proxy | `editor.t004.localhost:8787` → Sandbox 8080 → redirect then 200. |
| Astro process | `running`; ready in 1,182 ms. |
| code-server process | `running`; listening on `0.0.0.0:8080`. |
| Initial marker | Preview HTTP contained `HMR BEFORE`. |
| Vite WebSocket | `vite-hmr` socket opened through Worker; `connected` frame received. |
| Controlled edit | Sandbox API changed source marker to `HMR AFTER`. |
| HMR result | `full-reload` frame arrived on same socket 93 ms after edit issue. |
| Resulting marker | Subsequent preview HTTP contained `HMR AFTER`. |
| Browser IDE edit | **Not observed**; supported browser list was empty. |
| Durable note | `docs/knowledge/sandbox-session-spike.md` written as PARTIAL / NO-GO. |
| Machine evidence | `hmr-websocket-evidence.json` and `process-evidence.json` written. |
| Local cleanup | Sandbox destroy 200; Wrangler stopped; residual proxy container stopped; temp tree removed. |

## Browser evidence limitation

After both local proxied surfaces returned HTTP 200, the supported browser runtime was
initialized according to the repository’s available Browser skill. Target selection returned
“No browser is available”; the required troubleshooting discovery returned an empty browser
list. The skill explicitly forbids substituting an unrelated standalone browser-control
backend after this condition.

Therefore the implementation cannot honestly complete the “edit made in the browser IDE”
observation in this environment. It will continue with:

- a real WebSocket client connected through the Worker’s preview hostname;
- a controlled file mutation through the Sandbox API while that socket is open;
- assertion that Vite emits the HMR update on that same socket;
- HTTP/status/log corroboration for both Astro and code-server.

This isolates the Worker→Sandbox HMR transport but is not equivalent to a browser-UI edit. The
durable finding will be marked **PARTIAL / NO-GO for ticket acceptance** unless a supported
browser becomes available before Review.

## Exact local HMR observation

The successful WebSocket used the Vite-provided short-lived token (redacted in the artifact):

```text
ws://preview.t004.localhost:8787/?token=<redacted>
Sec-WebSocket-Protocol: vite-hmr
```

Timeline:

- 23:24:29.808Z — socket opened;
- 23:24:29.809Z — `{"type":"connected"}`;
- 23:24:30.310Z — controlled source edit issued;
- 23:24:30.401Z — edit endpoint returned 200 and `changed: true`;
- 23:24:30.403Z — `{"type":"full-reload"}` received;
- subsequent preview HTTP contained `HMR AFTER`.

An initial probe without Vite’s query token returned 400. Fetching `/@vite/client` and using
its `wsToken` matched Vite 7’s client behavior and produced the successful connection. The
token value was not committed.

Wrangler logged `101 Switching Protocols`. It also logged `Network connection lost` when the
probe deliberately closed immediately after capturing the reload frame; this occurred after
the success frame, not before it.

## Cleanup record

- `POST /destroy` returned `{"destroyed":true}` and logged a 57 ms successful destroy.
- Wrangler’s local process exited normally with the `x` control.
- A residual `cloudflare/proxy-everything` helper container remained after Wrangler exit and
  was explicitly stopped.
- `/tmp/t004-sandbox-spike` was removed.
- The stable `demo-runway` Worker was never named by a mutation command.

## Remaining before Review

1. Commit durable finding/evidence/Progress as the implementation unit.
2. Run repository verification and record outcomes.
3. Inspect artifact scope, write `review.md`, commit the handoff, and stop.

## Durable implementation commit

`8045654 docs(spike): record Sandbox HMR no-go finding`

This commit contains only the durable knowledge note, two redacted machine-readable evidence
files, and this Progress log. The disposable Worker/image source remained outside the repository
and was removed after cleanup.

## Repository verification

Completed after the empirical commit:

- `npm test` → **80/80 pass**, 0 failures, 0 skips.
- `npm run typecheck` → Astro check **0 errors / 0 warnings / 0 hints**; `tsc --noEmit`
  passes; generated Worker types are current.
- `npm run build` → succeeds; static pages and server entrypoints emitted.
- `npm run deploy:dry` → succeeds; Wrangler bundles the stable App Worker and exits at dry run.
- `git diff --check` on ticket artifacts → clean.
- targeted credential/token/private-key grep on staged spike text → no matches.

The build prints the repository’s existing informational deprecation warning for Astro’s
string-form memory session driver. It is unrelated to this documentation-only ticket.

`npm run leak:check` was not run as a standalone live probe because it targets a separately
running stable demo server. Its pure coverage ran inside `npm test`, and the spike’s staged
artifacts received a separate credential grep. No production application code changed here.

## Final implementation state

- Research, Design, Structure, Plan, and Implement artifacts are written.
- The durable technical finding is PARTIAL / NO-GO, not an acceptance claim.
- All spike remote/local resources are cleaned up.
- No ticket phase/status/checkbox edit was made.
- Review is the only remaining phase artifact.
