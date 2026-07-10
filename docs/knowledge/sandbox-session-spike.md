# Sandbox session spike — Astro + code-server + Worker WebSocket proxy

**Ticket:** T-004-01-01  
**Observed:** 2026-07-10  
**Finding:** **PARTIAL / NO-GO for ticket acceptance**  
**Production Sandbox deployment:** **BLOCKED — Workers Paid plan required**

This note records the Phase 0 experiment honestly. The local Sandbox SDK container hosted
Astro and code-server at the same time; a minimal Worker proxied both HTTP surfaces; and a
real Vite HMR WebSocket carried a `full-reload` frame after a source edit. However:

1. the source mutation was issued through the Sandbox API, not code-server’s browser UI,
   because the supported browser runtime was unavailable in this execution environment; and
2. the production container image could not be pushed because this Cloudflare account does
   not have the required Workers Paid plan.

Therefore this run does **not** satisfy the ticket’s required browser-IDE observation and does
**not** clear the session build gate. It narrows the remaining work: local process co-residency,
HTTP proxying, Vite host checks, and Worker-to-Sandbox HMR transport all worked on the pinned
versions below.

## Question tested

Can one Cloudflare Sandbox SDK container run:

- an Astro/Vite dev server;
- code-server over HTTP;
- both behind a minimal Worker proxy;
- with a Vite HMR WebSocket surviving that proxy;
- so a source edit appears at the preview without a manual refresh?

The ticket additionally requires the edit to be made inside the browser IDE. That final input
path was not observable here and remains the reason for NO-GO.

Sleep/wake survival was deliberately not tested. `T-004-01-02` owns that question, but should
not begin its acceptance run until the production entitlement and browser evidence gaps are
resolved.

## Versions actually exercised

| Component | Version |
|---|---:|
| `@cloudflare/sandbox` Worker SDK | 0.12.3 |
| `docker.io/cloudflare/sandbox` image | 0.12.3 |
| Wrangler | 4.110.0 |
| Container Node | 22.23.1 |
| Astro | 7.0.7 |
| code-server | 4.127.0 |
| embedded Code | 1.127.0 |
| Docker Desktop engine | 29.6.1 |

The code-server standalone archive was verified against the SHA-256 digest published on its
GitHub release asset before it was extracted into the image. No repository secret, Wrangler
credential, `.dev.vars`, or `.git` directory entered the build context.

The permanent image ticket (`T-004-03-01`) still owns pinning Node 24 and running the real
project stack. This minimal image used the current Sandbox base’s Node 22 runtime only to answer
the transport question.

## Topology actually exercised

```text
raw Vite WS / HTTP client
  -> http://preview.t004.localhost:8787
  -> local Wrangler Worker
  -> sandbox.wsConnect(request, 4321)       [WebSocket]
     sandbox.containerFetch(request, 4321)  [HTTP]
  -> Sandbox DO + SDK container
  -> Astro/Vite on 0.0.0.0:4321

HTTP client
  -> http://editor.t004.localhost:8787
  -> the same local Wrangler Worker
  -> sandbox.containerFetch(request, 8080)
  -> the same Sandbox container
  -> code-server on 0.0.0.0:8080
```

The Worker selected the target port from an exact hostname and routed WebSocket upgrades with
the SDK’s public `wsConnect` API:

```ts
const proxyPort =
  url.hostname === 'preview.t004.localhost'
    ? 4321
    : url.hostname === 'editor.t004.localhost'
      ? 8080
      : null;

if (proxyPort !== null) {
  if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return sandbox.wsConnect(request, proxyPort);
  }
  return sandbox.containerFetch(request, proxyPort);
}
```

This was a real Worker boundary running under Wrangler, not a direct host-port mapping to the
application container. It does not prove Cloudflare edge TLS or remote container placement.

## Exact successful Astro/Vite configuration

This is the complete `server` block that passed the local proxy/HMR probe:

```js
server: {
  host: '0.0.0.0',
  port: 4321,
  strictPort: true,
  allowedHosts: ['preview.t004.localhost'],
  hmr: {
    protocol: 'ws',
    host: 'preview.t004.localhost',
    clientPort: 8787,
  },
},
```

Why each field was necessary:

- `host: '0.0.0.0'`: the Sandbox port proxy cannot reach a loopback-only listener.
- `port: 4321` + `strictPort: true`: keeps the Worker routing contract deterministic.
- `allowedHosts`: Vite otherwise rejects the non-localhost host header presented by the
  host-based Worker proxy. Use the exact preview host, not `true`.
- `hmr.protocol: 'ws'`: the successful local edge was plain HTTP.
- `hmr.host`: makes the injected Vite client reconnect through the Worker hostname rather than
  the container’s internal address.
- `hmr.clientPort: 8787`: the client connects to Wrangler’s external port while Vite continues
  to listen internally on 4321.
- no `hmr.port`: Vite HTTP and HMR share the internal 4321 listener, so one proxy route handles
  both.

### Production target configuration — not yet observed

For the intended HTTPS hostname, the direct translation is:

```js
server: {
  host: '0.0.0.0',
  port: 4321,
  strictPort: true,
  allowedHosts: ['4321-t004-spike-preview.b28.dev'],
  hmr: {
    protocol: 'wss',
    host: '4321-t004-spike-preview.b28.dev',
    clientPort: 443,
  },
},
```

Do **not** treat this second block as proven. It is the exact planned edge-TLS translation,
but the account entitlement stopped the remote run before the container image existed on the
platform. The future branded `demo-<slug>.b28.dev` host should replace the generated spike host
when `T-004-03-02` defines production routing.

## Image and process shape

The disposable image extended `docker.io/cloudflare/sandbox:0.12.3`, preserving its
`/container-server/sandbox` entrypoint. It baked a minimal Astro app and the checksum-verified
code-server standalone release, then declared ports 4321 and 8080.

The Worker started both as managed Sandbox background processes:

```text
cwd=/workspace/demo  id=astro-dev
npm run dev

cwd=/workspace/demo  id=code-server
code-server --bind-addr 0.0.0.0:8080 --auth none --disable-telemetry /workspace/demo
```

Both reported `running`. Astro reached ready in 1,182 ms after process start. code-server logged
that it was listening on `0.0.0.0:8080`. `--auth none` was acceptable only for this local,
short-lived spike; it is not the production security design. Cloudflare Access and independent
origin assertion validation remain owned by `T-004-04-01`.

## Observed HTTP results

- `GET http://preview.t004.localhost:8787/` → 200 and `HMR BEFORE`.
- The HTML contained Vite’s `/@vite/client` module.
- `GET http://editor.t004.localhost:8787/` → application redirect, then 200.
- After the controlled source mutation, the preview HTML contained `HMR AFTER`.
- `GET /status` continued to report both background processes as `running`.

The editor 200 proves code-server’s HTTP surface traversed the Worker proxy. It does not prove
the complete workbench WebSocket/session because no supported browser could open the UI.

## Observed HMR WebSocket result

The probe fetched `/@vite/client`, extracted Vite’s short-lived `wsToken`, and opened:

```text
ws://preview.t004.localhost:8787/?token=<redacted>
Sec-WebSocket-Protocol: vite-hmr
```

Timeline (UTC):

| Time | Event |
|---|---|
| 23:24:29.808 | Worker-proxied WebSocket opened |
| 23:24:29.809 | Vite frame `{"type":"connected"}` received |
| 23:24:30.310 | change from `HMR BEFORE` to `HMR AFTER` issued |
| 23:24:30.401 | Sandbox file-write endpoint returned 200 / `changed: true` |
| 23:24:30.403 | Vite frame `{"type":"full-reload"}` received on the same socket |
| 23:24:30.430 | subsequent preview render contained `HMR AFTER` |

The `full-reload` frame is Vite’s HMR control channel for this `.astro` page edit. It is not a
CSS-module hot patch, but it does cause an already-open Vite client to refresh without a user
pressing reload. The frame arrived 93 ms after the edit was issued and 2 ms after the write
response.

Machine-readable corroboration is committed at:

- `docs/active/work/T-004-01-01/hmr-websocket-evidence.json`;
- `docs/active/work/T-004-01-01/process-evidence.json`.

## Browser IDE result

**Not observed.** After the local preview and editor were live, the supported Browser runtime
was initialized and asked to select the preview URL. It returned “No browser is available.”
The required troubleshooting discovery returned an empty browser list. Repository instructions
for that tool prohibit substituting an unrelated standalone browser-control backend.

The experiment therefore used a narrow Worker control endpoint backed by
`sandbox.readFile()`/`writeFile()` to mutate the same file code-server had opened as its
workspace. This proves the file-watch and HMR path, but it does not prove browser IDE input,
save semantics, or code-server’s own browser WebSocket.

That distinction is load-bearing: the ticket says “an edit made in the browser IDE.” This run
must not be marked accepted based on the transport probe alone.

## Remote deployment result

The first `wrangler deploy` successfully uploaded the uniquely named Worker version
`3bdb31b1-9ae9-44f8-b613-83a1561e84fb`. The subsequent managed container image push failed
with `Unauthorized`.

A targeted `wrangler containers list` returned the actionable explanation: this account does
not have access to Cloudflare Containers and deploying containers requires the Workers Paid
plan. The OAuth session already listed Containers write scope; this is an account-plan gate,
not missing OAuth consent.

No plan upgrade was attempted because it is a financial action outside ticket authority. The
partially uploaded Worker was deleted immediately. A deployment lookup then returned Cloudflare
error 10007, “This Worker does not exist on your account.” Neither exact planned custom domain
resolved before or after the attempt.

## Acceptance mapping

| Ticket requirement | Evidence | Result |
|---|---|---|
| Sandbox hosts Astro dev | running process, HTTP 200, Astro logs | PASS locally |
| Sandbox hosts code-server | running process, redirect→200, logs | PASS locally for HTTP |
| minimal Worker proxy | host→port `containerFetch`/`wsConnect` | PASS locally |
| HMR over proxied WebSocket | connected + full-reload frames | PASS locally |
| exact `allowedHosts`/`hmr` config | successful block above | PASS locally |
| edit made in browser IDE | browser unavailable; API write substituted | **FAIL / unverified** |
| chosen sovereign remote runtime | Paid-plan entitlement blocked image push | **FAIL / blocked** |

Overall ticket finding: **NO-GO**. Do not advance into permanent session implementation on the
strength of this run alone.

## Required next run

Before this gate can be cleared:

1. enable Cloudflare Containers on the project account (Workers Paid plan or another entitled
   sovereign account);
2. rerun the checksum-pinned image and Worker on the real platform;
3. use two exact first-level `b28.dev` hosts or the final branded session hosts;
4. open both surfaces in a supported browser;
5. edit `src/pages/index.astro` inside code-server and save;
6. observe the already-open preview update and retain its `wss` network record;
7. verify code-server’s own browser WebSocket also stays open;
8. only then mark this ticket’s acceptance criterion met;
9. proceed to `T-004-01-02` for forced idle sleep/wake.

## Cleanup

- Remote partial Worker: deleted; follow-up deployment lookup says it does not exist.
- Remote container: never pushed/provisioned.
- Remote exact custom domains: did not resolve.
- Local Sandbox: destroyed after evidence capture.
- Local Wrangler process: stopped after destroy.
- Disposable `/tmp/t004-sandbox-spike`: removed after final evidence was transcribed.
- Stable `demo-runway` App Worker and `demo.b28.dev`: not targeted by any spike command.

## Primary references

- [Sandbox ports API](https://developers.cloudflare.com/sandbox/api/ports/)
- [Sandbox WebSocket connections guide](https://developers.cloudflare.com/sandbox/guides/websocket-connections/)
- [Sandbox production deployment](https://developers.cloudflare.com/sandbox/guides/production-deployment/)
- [Sandbox get started](https://developers.cloudflare.com/sandbox/get-started/)
- [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [code-server reverse-proxy guide](https://coder.com/docs/code-server/guide)
- [code-server requirements](https://coder.com/docs/code-server/requirements)
- [Sandbox SDK local WebSocket issue #689 and 0.11.0 fix note](https://github.com/cloudflare/sandbox-sdk/issues/689)
