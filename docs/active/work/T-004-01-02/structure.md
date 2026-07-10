# Structure — T-004-01-02 spike-container-sleep-wake-survival

File-level blueprint, transient experiment boundaries, HTTP interfaces, evidence schema, and
ordering constraints for the forced idle test.

## Persistent repository changes

```text
docs/
├─ active/work/T-004-01-02/
│  ├─ research.md
│  ├─ design.md
│  ├─ structure.md
│  ├─ plan.md
│  ├─ progress.md
│  ├─ sleep-wake-evidence.json
│  └─ review.md
└─ knowledge/
   └─ sandbox-sleep-wake-spike.md
```

No application source, root dependency, production Wrangler configuration, ticket
frontmatter, story, epic, or existing decision record is modified by this spike.

## `research.md`

Owns the descriptive baseline:

- ticket and acceptance boundary;
- epic and decision-record context;
- prerequisite spike result;
- current repository and toolchain;
- account entitlement and local Docker availability;
- current official Sandbox lifecycle contract;
- background-process and inactivity semantics;
- state categories and evidence limitations;
- downstream ownership boundaries.

It contains no selected implementation.

## `design.md`

Owns the experiment decision:

- documentation-only, remote, raw Docker, shortened-local, and ten-minute-local options;
- selection of a real ten-minute local Sandbox cycle;
- exact inactivity posture;
- setup, first-wake, and relaunch semantics;
- go/no-go decision rules;
- expected downstream lifecycle consequences;
- safety and cleanup.

## `structure.md`

This file defines persistent and transient files, module responsibilities, HTTP contracts,
evidence shape, sequencing constraints, and commit boundaries. It is the blueprint and does
not contain the experimental Worker implementation.

## `plan.md`

Owns the ordered execution and verification steps. It distinguishes:

- harness validation;
- pre-idle evidence;
- the no-traffic wait;
- first-wake capture;
- relaunch observation;
- durable finding;
- cleanup;
- repository verification;
- Review handoff.

## `progress.md`

Tracks actual execution rather than intended execution. It records:

- environment and account prerequisite results;
- disposable harness versions and build results;
- exact pre-idle timestamp;
- wait start and end;
- first-wake snapshot;
- relaunch result;
- deviations from Design/Plan;
- cleanup;
- verification commands and outcomes;
- commits if repository conditions allow incremental commits.

It must state clearly if production evidence remains unavailable.

## `sleep-wake-evidence.json`

Machine-readable, credential-free empirical evidence. Proposed top-level shape:

```ts
interface SleepWakeEvidence {
  capturedAt: string;
  scope: "local-sandbox-sdk";
  verdict: "resume" | "relaunch-required" | "unusable";
  goNoGo: "go" | "conditional-go" | "no-go";
  versions: {
    sandboxSdk: string;
    sandboxImage: string;
    wrangler: string;
    docker: string;
    nodeInContainer: string;
    astro: string;
    codeServer: string;
  };
  lifecycle: {
    sandboxId: string;
    sleepAfter: string;
    keepAlive: false;
    lastActivityAt: string;
    wakeRequestedAt: string;
    idleDurationMs: number;
  };
  before: Snapshot;
  afterWakeBeforeRelaunch: Snapshot;
  comparison: Comparison;
  relaunch: RelaunchEvidence;
  cleanup: CleanupEvidence;
  limitations: string[];
}
```

Snapshot shape:

```ts
interface Snapshot {
  capturedAt: string;
  processes: Array<{
    id: string;
    command: string;
    status: string;
    pid?: number;
  }>;
  ports: {
    astro4321: "listening" | "closed" | "unknown";
    codeServer8080: "listening" | "closed" | "unknown";
  };
  sentinel: {
    exists: boolean;
    value?: string;
  };
  astroSource: {
    marker: string | null;
    hash: string | null;
  };
  shellState: {
    sessionAvailable: boolean;
    marker: string | null;
  };
}
```

Comparison shape:

```ts
interface Comparison {
  sameSandboxId: boolean;
  astroProcessSurvived: boolean;
  codeServerProcessSurvived: boolean;
  processIdsPreserved: boolean;
  portsStayedReady: boolean;
  sentinelPreserved: boolean;
  sourceMutationPreserved: boolean;
  shellStatePreserved: boolean;
  imageStateRestored: boolean;
  lostState: string[];
}
```

Relaunch evidence shape:

```ts
interface RelaunchEvidence {
  attempted: boolean;
  astroReady: boolean;
  codeServerReady: boolean;
  processIds: string[];
  durationMs: number | null;
  workspaceRestored: boolean;
  note: string;
}
```

Cleanup shape:

```ts
interface CleanupEvidence {
  sandboxDestroyed: boolean;
  wranglerStopped: boolean;
  transientTreeRemoved: boolean;
  residualContainersStopped: boolean;
}
```

The JSON uses fixed descriptive strings and redacted non-secret identifiers. It excludes raw
logs unless bounded and reviewed.

## `docs/knowledge/sandbox-sleep-wake-spike.md`

The durable human-readable finding contains:

1. headline verdict and go/no-go;
2. scope and why production was unavailable;
3. tested versions;
4. exact lifecycle configuration;
5. experiment procedure;
6. pre-idle state;
7. idle timeline;
8. first-wake state before relaunch;
9. process survival finding;
10. state-loss finding;
11. relaunch finding;
12. consequence for `S-004-03`;
13. relationship to the prerequisite NO-GO;
14. limitations and required production confirmation;
15. cleanup;
16. primary official references.

The note must not imply that an SDK-managed process registry is a service supervisor if the
post-wake process list is empty.

## `review.md`

Owns the handoff:

- overall result;
- acceptance mapping;
- persistent files created/modified/deleted;
- transient resources used and removed;
- test and evidence coverage;
- local-versus-production limitations;
- downstream lifecycle requirements;
- open concerns and critical human actions.

## Transient experiment tree

The disposable tree is created outside the repository, under a ticket-specific temporary
path. Logical layout:

```text
t004-sleep-wake/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ wrangler.jsonc
├─ Dockerfile
└─ src/
   └─ worker.ts
```

The tree is never committed.

### `package.json`

Pins the harness to the prerequisite versions:

- `@cloudflare/sandbox` `0.12.3`;
- `wrangler` `4.110.0`;
- TypeScript compatible with the installed toolchain.

Scripts may include typecheck, dry-run validation, and local dev. The root project dependency
graph is untouched.

### `Dockerfile`

Uses the retained local image as its base:

```dockerfile
FROM demo-runway-t004-sandbox-spike-sandbox:worker
```

It preserves the image entrypoint, baked `/workspace/demo`, Astro installation, and
code-server installation. It adds no credentials and does not modify the image’s application
state.

### `wrangler.jsonc`

Declares only the disposable local Worker:

- unique name unrelated to `demo-runway`;
- `src/worker.ts` entrypoint;
- current compatibility date and `nodejs_compat`;
- one `Sandbox` container using the transient Dockerfile;
- local instance type matching the prerequisite spike;
- max instance count one;
- `Sandbox` Durable Object binding;
- SQLite migration for `Sandbox`.

It has no route, custom domain, production variable, secret, D1, or asset binding.

### `src/worker.ts`

Responsibilities:

- re-export `Sandbox` from `@cloudflare/sandbox`;
- centralize the fixed sandbox ID and options;
- route control requests;
- serialize JSON responses and safe errors;
- start named background processes;
- wait for ports;
- create and inspect filesystem/source/session markers;
- capture snapshots without relaunch side effects;
- destroy the sandbox.

Public control surface:

```text
GET  /health      -> Worker-only readiness; does not touch Sandbox
POST /setup       -> initialize markers/processes and return pre-idle snapshot
POST /wake        -> first post-idle snapshot; must not start services
POST /relaunch    -> start missing services and report readiness/timing
POST /destroy     -> destroy Sandbox
```

No `/status` endpoint is used during the idle wait because polling would reset inactivity.

## Internal helper boundaries

`getSpikeSandbox(env)` is the only constructor:

```ts
getSandbox(env.Sandbox, SANDBOX_ID, {
  sleepAfter: "10m",
  keepAlive: false,
});
```

`startServices(sandbox)`:

- checks existing processes by stable name/ID;
- starts Astro in `/workspace/demo` only when absent;
- starts code-server in `/workspace/demo` only when absent;
- waits for 4321 and 8080;
- returns process metadata and elapsed time.

`captureSnapshot(sandbox, expectedSessionId?)`:

- lists processes;
- checks listeners with bounded one-time commands;
- reads sentinel with an absence-safe command/API;
- reads and hashes the Astro source;
- queries the session marker when possible;
- never calls `startProcess()`.

`safeExec()` and absence handling must distinguish expected non-zero probes from harness
errors. A missing sentinel is evidence, not an HTTP 500.

## Ordering constraints

1. Build and typecheck the disposable harness before touching a Sandbox.
2. Validate the Worker-only health endpoint.
3. Run setup and save its response outside the repo.
4. Verify both services and all state markers in that response.
5. Record the final activity timestamp.
6. Make no Sandbox request for the full idle interval.
7. Call `/wake` exactly once as the first post-idle Sandbox operation.
8. Save the raw wake response before any relaunch.
9. Only then call `/relaunch`.
10. Write durable evidence from saved responses.
11. Destroy the Sandbox and stop local processes.
12. Verify no residual container remains.
13. Remove the transient tree.
14. Run repository verification.
15. Write Review last.

## Commit boundaries

The workflow asks for incremental commits, but the shared worktree contains concurrent
untracked E-004 planning files including this ticket. If commits are safe and the required
ticket paths are already under the current ticket’s ownership, use:

1. Research/Design/Structure/Plan;
2. durable finding, JSON evidence, and Progress;
3. Review and final Progress verification.

If committing would capture or interfere with Lisa/user-owned concurrent work, document the
constraint in Progress and leave scoped changes unstaged. Under no circumstance stage all
changes or alter unrelated files merely to satisfy a commit boundary.

## Invariants

- Ticket phase and status remain untouched.
- The first wake snapshot precedes all relaunch work.
- The idle interval contains no Sandbox activity.
- Missing state is reported, not repaired during inspection.
- Local evidence is labeled local.
- Production entitlement remains an open limitation.
- No secret or account identity enters committed artifacts.
- The stable App Worker and `demo.b28.dev` are never targeted.
