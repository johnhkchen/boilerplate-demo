# Structure — T-004-01-01 spike-sandbox-runs-dev-and-editor

File-level blueprint for the disposable experiment, durable finding, RDSPI artifacts, and
verification evidence. This defines shape and boundaries rather than implementation detail.

## Repository changes

### Create: `docs/knowledge/sandbox-session-spike.md`

Durable, reviewer-facing finding for the Phase 0 transport feasibility gate.

Sections:

1. **Status and scope**
   - ticket/story identifiers;
   - date and platform versions;
   - clear PASS/FAIL result;
   - statement that sleep/wake is not tested here.
2. **Question tested**
   - one Sandbox;
   - Astro dev and code-server;
   - Worker proxy;
   - browser IDE edit;
   - HMR WebSocket.
3. **Topology actually exercised**
   - browser → exact custom domain → Worker `proxyToSandbox` → Sandbox port;
   - separate preview/editor hostnames;
   - one fixed Sandbox identity.
4. **Pinned inputs**
   - Wrangler, Sandbox SDK/image, Astro, code-server, Node versions;
   - Worker/config excerpts;
   - startup commands.
5. **Exact Vite/Astro configuration**
   - full copyable `server` block;
   - rationale for each field;
   - explicit note about `hmr.port` being omitted if that is what succeeded.
6. **Procedure**
   - deployment;
   - setup;
   - opening the two browser surfaces;
   - editing and saving;
   - observing the preview.
7. **Observed evidence**
   - before and after marker text;
   - timestamps;
   - process status;
   - WebSocket URL/status;
   - screenshots linked from the work directory.
8. **Result and implications**
   - acceptance criterion mapping;
   - what later tickets may rely on;
   - what they must not infer.
9. **Cleanup**
   - Sandbox destroy;
   - Worker deletion;
   - endpoint/DNS verification.
10. **Open risks**
    - idle sleep/wake;
    - production authentication;
    - real-project resource use/cold start;
    - permanent route naming.
11. **Sources**
    - primary Cloudflare Sandbox/Workers docs;
    - primary code-server docs.

The note must redact generated/random credentials if any. Deterministic exposure tokens in
this spike are routing capabilities and should be treated as expired after cleanup.

### Create: `docs/active/work/T-004-01-01/research.md`

Descriptive repository/platform map. Already produced in Research. No prescriptive decisions.

### Create: `docs/active/work/T-004-01-01/design.md`

Option analysis and selected experiment. Already produced in Design.

### Create: `docs/active/work/T-004-01-01/structure.md`

This file. Owns the file graph, interfaces, evidence placement, and change ordering.

### Create: `docs/active/work/T-004-01-01/plan.md`

Ordered executable steps and verification checkpoints. It will include remote cleanup as a
required step, not an optional afterthought.

### Create: `docs/active/work/T-004-01-01/progress.md`

Implementation log. Records:

- completed step and commit table;
- disposable deployment name and redacted host shapes;
- versions used;
- browser evidence obtained;
- commands/checks and outcomes;
- deviations from Plan;
- cleanup result;
- remaining work during implementation.

### Create: `docs/active/work/T-004-01-01/review.md`

Final handoff covering changed files, acceptance mapping, verification and evidence quality,
coverage gaps, open risks, critical concerns, remote cleanup, and commit list.

### Optional evidence: ticket work directory PNGs

If screenshots can be captured without leaking an active capability, create:

- `hmr-before.png`: preview visibly rendering the original marker;
- `browser-ide-edit.png`: code-server showing the saved changed marker;
- `hmr-after.png`: the same preview tab rendering the changed marker.

Screenshots are supporting evidence. The textual note remains complete without relying on
image interpretation. Images must not contain Cloudflare credentials, local secrets, browser
profile data, unrelated tabs, or owner identity beyond what the repository already exposes.

## Repository files not modified

- `docs/active/tickets/T-004-01-01.md`: Lisa owns phase/status; acceptance box stays untouched.
- `docs/knowledge/demo-environments-decisions.md`: existing decision record remains source
  context; the new note is an empirical finding, not a rewrite of the decisions.
- `package.json` and `package-lock.json`: no permanent Sandbox dependency in this spike.
- `astro.config.mjs`: the stable app’s dev behavior remains unchanged.
- `wrangler.jsonc`: the stable App Worker must not acquire Sandbox or temporary routes.
- `src/**`: no production runtime/session feature is committed.
- `.dev.vars` and secrets: no credentials are required or written.

## Disposable local experiment tree

Create outside the repository at `/tmp/t004-sandbox-spike/`. This directory is not a
repository artifact and is removed after evidence capture.

```text
/tmp/t004-sandbox-spike/
├── Dockerfile
├── package.json
├── package-lock.json
├── tsconfig.json
├── wrangler.jsonc
├── worker-configuration.d.ts
├── src/
│   └── worker.ts
└── demo/
    ├── package.json
    ├── package-lock.json
    ├── astro.config.mjs
    └── src/
        └── pages/
            └── index.astro
```

The Worker package and the embedded demo have separate manifests. The outer package owns
Wrangler, TypeScript, Worker types, and Sandbox SDK. The inner package owns Astro only and is
copied with installed dependencies into the container image.

## Disposable `wrangler.jsonc` boundary

The configuration declares:

- unique Worker name: `demo-runway-t004-sandbox-spike`;
- `main: src/worker.ts`;
- compatibility date matching the run date;
- `nodejs_compat`;
- `workers_dev: true` for the setup/control endpoint;
- two exact `custom_domain: true` routes for deterministic preview/editor hosts;
- one container declaration using the local Dockerfile;
- class name `Sandbox`;
- a conservative single instance limit;
- Sandbox Durable Object binding named `Sandbox`;
- one SQLite class migration;
- observability logs/traces.

No account ID, API token, secret, or stable app binding appears in this file. Generate
`worker-configuration.d.ts` from this config rather than writing an `Env` type manually.

## Disposable Worker module boundary

`src/worker.ts` imports only current public Sandbox SDK interfaces and re-exports `Sandbox`.

Public HTTP interface:

```text
POST /setup   -> SetupReport
GET  /status  -> StatusReport
POST /destroy -> { destroyed: true }
*             -> 404 JSON
```

Before routing those endpoints, the fetch handler calls `proxyToSandbox(request, env)`. A
non-null response is returned unchanged so response bodies and WebSocket upgrades are streamed
by the SDK rather than buffered in custom code.

`SetupReport` contains only non-secret operational data:

```ts
{
  sandboxId: string;
  previewUrl: string;
  editorUrl: string;
  processes: Array<{ id: string; command: string; status: string }>;
}
```

The worker must not log or return OAuth credentials. Exposure URLs are temporary capabilities;
they may appear in transient command output needed to drive the browser but not in unrelated
logs.

## Disposable image boundary

`Dockerfile` extends `docker.io/cloudflare/sandbox:<same-version-as-SDK>`.

Build-time responsibilities:

- install pinned code-server globally;
- copy the inner demo manifests;
- run `npm ci` for the demo;
- copy the minimal config and page;
- expose ports 4321 and 8080;
- retain the Sandbox base image’s entrypoint/runtime contract.

The Dockerfile must not change to an arbitrary code-server base image because the Sandbox SDK
expects its own container-side API server. It must not copy the host repository or `.git`.

## Embedded Astro demo boundary

`demo/astro.config.mjs` owns only transport configuration. It does not import the Cloudflare
adapter or repository config.

`demo/src/pages/index.astro` owns the observable marker:

```html
<main>
  <h1 id="hmr-marker">HMR BEFORE</h1>
</main>
```

The stable element ID permits deterministic browser inspection before and after the edit.
Styles may be inline and minimal; visual polish is irrelevant to the transport proof.

## Process boundaries

Astro process:

- current working directory `/workspace/demo`;
- package script `astro dev`;
- listens `0.0.0.0:4321`;
- serves HTTP and the Vite HMR WebSocket on the same internal port.

code-server process:

- current working directory `/workspace/demo`;
- listens `0.0.0.0:8080`;
- opens the same working directory;
- uses no internal password during this short-lived experiment;
- disables telemetry.

The Worker starts them as Sandbox background processes and waits for readiness. Neither process
is started in Dockerfile `CMD`; Sandbox’s own runtime entrypoint remains authoritative.

## Routing boundaries

Preview:

```text
https://4321-t004-spike-preview.b28.dev
  -> exact Worker custom domain
  -> proxyToSandbox
  -> Sandbox t004-spike
  -> port 4321
  -> Astro/Vite HTTP or WebSocket
```

Editor:

```text
https://8080-t004-spike-editor.b28.dev
  -> exact Worker custom domain
  -> proxyToSandbox
  -> Sandbox t004-spike
  -> port 8080
  -> code-server HTTP or WebSocket
```

No route targets `demo.b28.dev`. No wildcard Worker route is introduced.

## Ordering constraints

1. RDSPI Research, Design, Structure, and Plan exist before experimental code.
2. Validate the disposable config and type generation before remote mutation.
3. Build the image locally before remote deployment.
4. Deploy once under the unique Worker name.
5. Wait for custom-domain provisioning before invoking `/setup` and opening browsers.
6. Confirm both processes and both HTTP surfaces before the edit.
7. Confirm HMR WebSocket before interpreting the visible update.
8. Capture evidence before destroying the Sandbox or deleting the Worker.
9. Write and commit the durable note before or immediately after cleanup.
10. Run repository checks after artifacts are committed.
11. Write Review last, then stop without touching ticket frontmatter.

## Commit boundaries

The workflow requests incremental commits. The meaningful durable units are:

- Commit A: Research, Design, Structure, and Plan artifacts.
- Commit B: durable spike finding plus supporting evidence and initial Progress log.
- Commit C: final Progress updates and Review artifact after all verification/cleanup.

Each commit stages only `docs/active/work/T-004-01-01/**` and the new knowledge note. Existing
untracked E-004 board files and modified demand material are not swept into these commits.
