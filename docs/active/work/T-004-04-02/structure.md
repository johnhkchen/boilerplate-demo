# Structure — T-004-04-02 secrets-and-uncommitted-work-safety

## Change map

```text
Cloudflare Worker secret
  SESSION_RUNTIME_SECRETS (JSON object)
    -> parseRuntimeSecrets()
       -> Astro startProcess.env
       -> code-server startProcess.env
       -> value-aware redaction

owner CLI: down
  -> POST /__session/down { mode: "preserve" }
     -> clean: destroy + idle
     -> dirty: binary patch + digest, runtime retained
        -> verify and write local artifact
        -> POST /__session/down {
             mode: "destroy",
             preservationSha256
           }
           -> regenerate + digest compare
           -> destroy only on match

owner CLI: down --force
  -> POST /__session/down { mode: "destroy", force: true }
     -> explicit destructive bypass
```

## Files modified

### `src/lib/session-lifecycle.ts`

Own all pure contracts and fixed programs for the safety behavior.

Add constants:

- `SESSION_RUNTIME_SECRETS_BINDING` — diagnostic-safe binding name;
- `SESSION_PRESERVATION_PATH` — patch path outside the Git worktree;
- `SESSION_PATCH_LIMIT_BYTES` — complete patch transport bound;
- secret count/value/aggregate bounds as private implementation details.

Extend `SessionConfig` only if non-secret preservation configuration is required. Do not place
secret values in this existing object because it is used broadly for routing and URLs.

Add types:

- `RuntimeSecrets = Record<string, string>`;
- `SessionDownInput` discriminated union for preserve and destroy requests;
- `SessionPatch` with base revision, SHA-256, byte count, and base64 content;
- `PreservationInspection` for parsed fixed-command metadata.

Add pure functions:

- `parseRuntimeSecrets(value)` validates the JSON Worker-secret binding;
- `redactSecrets(value, secrets)` performs longest-first exact replacement;
- `safePublicError(error, secrets, limit?)` composes redaction, line folding, and bounding;
- `parseDownInput(value)` enforces exact down body shapes;
- `isPatchDigest(value)` checks 64 lowercase hexadecimal SHA-256 strings;
- `buildPreservationCommand()` stages and generates a binary/full-index patch;
- `parsePreservationInspection(stdout)` validates command metadata without shell trust;
- `validatePatchPayload(...)` verifies declared byte length, digest, and size bound where
  platform-independent APIs permit it.

Retain `safeErrorMessage()` for callers with no secret set, implemented through the new safe
public error function to prevent behavioral drift.

Change control-body semantics only through `parseDownInput`; the route classifier remains
unchanged because down is still POST at the same path.

### `src/session-worker.ts`

Read and validate launch secrets at the Worker boundary.

Configuration organization:

- parse non-secret `SessionConfig` as today;
- parse `env.SESSION_RUNTIME_SECRETS` separately;
- pass the parsed secret map as a typed RPC argument to coordinator operations that need it;
- never store that map in fields, Durable Object storage, or session records.

Coordinator changes:

- `ensureProcess()` accepts a runtime environment and passes it to `startProcess()`;
- `reconcile()` passes the same launch environment to Astro and code-server;
- `up(input, runtimeSecrets)` uses redacted error handling throughout;
- `logs(runtimeSecrets)` redacts each stdout/stderr value before byte bounding;
- `down(input, runtimeSecrets)` uses preservation inspection before destroy and redacts failures.

Add private preservation helpers:

- run the fixed preservation command with a timeout;
- parse clean/dirty, base revision, size, and digest metadata;
- enforce the patch size cap before reading content;
- read dirty patch content with base64 encoding;
- validate returned content against the command metadata;
- compare a supplied acknowledgement digest with a freshly generated result.

Down result shapes:

- clean/destroyed response: existing idle result plus preservation status;
- dirty/export response: `changed:false`, current phase, and a `preservation` object;
- acknowledged destroy response: idle plus the matched digest;
- force destroy response: idle plus `forced:true` so the exception is auditable.

The coordinator logs only metadata: operation, phase, slug, revision, patch bytes/digest, and
forced flag. It never logs base64 content or runtime-secret keys/values.

Worker handler changes:

- use `readBoundedJson()` for down as well as up;
- parse through `parseDownInput()`;
- call coordinator with typed input and parsed secrets;
- return a fixed configuration error if the secret map is invalid;
- redact generic handler errors using the known secret set.

### `scripts/session.ts`

Extend the CLI command model.

Argument shapes:

- `down` — safe preservation workflow;
- `down --force` — explicit destructive workflow;
- all other down arguments remain invalid.

Add injectable file-system dependencies to `SessionCommandOptions` so tests do not touch the
real filesystem:

- exclusive artifact writer;
- current working directory or artifact directory;
- optional cryptographic helper if required for deterministic tests.

Add pure helpers:

- construct safe artifact filename from server-provided validated metadata;
- decode and verify a preservation payload;
- redact raw response/transport messages using locally configured secret values.

Normal down orchestration:

1. request preserve;
2. if server reports idle, print result and exit zero;
3. verify dirty preservation payload;
4. write patch with exclusive creation and restrictive permissions;
5. request acknowledged destroy with digest;
6. print final result including local artifact path but excluding patch body.

Force down sends one request with explicit force and prints the server's forced marker. No prompt
is added because API-level explicitness must also work in automation; the flag itself is the
confirmation.

Never print the base64 patch body. On any payload or write error, exit nonzero without sending
the destroy acknowledgement.

### `test/session-lifecycle.test.mjs`

Extend the existing consolidated session suite.

Pure contract tests:

- valid empty and populated secret maps;
- invalid JSON, arrays, names, reserved names, short/blank values, too many entries, oversize;
- longest-first redaction and safe error composition;
- exact accepted/rejected down request objects;
- fixed preservation command uses fixed paths and includes `git add -A`, binary/full-index diff,
  byte count, and SHA-256;
- strict metadata parser rejects malformed/unexpected output.

CLI tests:

- parser recognizes down and down force;
- clean normal down is one request and no file write;
- dirty normal down verifies, writes, and acknowledges in order;
- written artifact uses exclusive/restrictive semantics;
- digest/base64/length mismatch refuses before second request;
- file-write failure refuses before second request;
- force sends the only destructive bypass body;
- secret values in HTTP JSON, malformed responses, and transport errors are redacted.

Keep existing up/status/logs behavior covered.

### `wrangler.sessions.jsonc`

Change the explicit required-secret declaration from empty to:

```jsonc
"secrets": { "required": ["SESSION_RUNTIME_SECRETS"] }
```

Keep non-secret vars unchanged. Add comments documenting that the value is JSON and is supplied
through `wrangler secret put`, never committed.

### `worker-configuration.sessions.d.ts`

Regenerate with `npm run session:types` after configuration changes. Expected structural change:

- `SESSION_RUNTIME_SECRETS: string` appears on `SessionWorkerEnv`;
- Node process-env generated picks may include the new binding depending on Wrangler output.

Do not hand-edit the generated declaration.

### `docs/knowledge/session-lifecycle.md`

Replace the current durability warning with the implemented contract.

Document:

- how to configure an empty or populated launch-secret JSON value with a non-echoing Wrangler
  secret command;
- exact injection boundary and trusted-collaborator visibility;
- image/worktree/durable-state exclusions;
- redaction scope and its known-value limitation;
- normal and force down syntax;
- patch naming, maximum size, exact contents, and recovery command;
- the digest recheck race protection;
- refusal behavior and ignored/empty-directory limitations;
- remaining platform replacement risk.

### `package.json`

No new runtime dependency is expected. Node crypto and filesystem APIs are sufficient for the
CLI; Web Crypto/Sandbox metadata support the Worker. The existing test and validation scripts
remain the command surface.

Modify only if a separate focused safety-check script becomes necessary during implementation.

## Files created

### `docs/active/work/T-004-04-02/progress.md`

Implementation ledger updated after each meaningful unit and before its commit. It records
completed steps, validation, commits, and design deviations.

### `docs/active/work/T-004-04-02/review.md`

Final handoff summarizing code/docs changes, acceptance-criterion evidence, test coverage,
security analysis, limitations, and open production gates.

## Files not modified

- `docs/active/tickets/T-004-04-02.md` phase/status frontmatter;
- stable App Worker source/configuration;
- `Dockerfile.session`, unless implementation reveals a missing image-exclusion assertion;
- `.dockerignore`, whose existing secret exclusions and explicit-copy pairing are sufficient;
- Access policy/configuration owned by `T-004-04-01`;
- promotion/rollback code;
- epic/story/demand/Lisa state;
- unrelated uncommitted files already present in the shared worktree.

## Public interface changes

### Environment

```text
SESSION_RUNTIME_SECRETS='{"EXAMPLE_TOKEN":"value-at-least-eight-characters"}'
```

This is a Worker secret binding in production. Local Wrangler may supply it from `.dev.vars`,
which is already ignored and excluded from Docker context.

### Control API

```text
POST /__session/down
Content-Type: application/json

{ "mode": "preserve" }
{ "mode": "destroy", "preservationSha256": "..." }
{ "mode": "destroy", "force": true }
```

The up/status/logs routes and host proxy contract stay stable.

### CLI

```text
npm run session -- down
npm run session -- down --force
```

The safe command may create one patch in the current directory. The force command never creates
one.

## Change ordering

1. Add pure safety types/helpers and tests.
2. Add Worker secret parsing, injection, redaction, and tests/type validation.
3. Add preservation protocol in coordinator and handler.
4. Add CLI patch handoff and force behavior.
5. Regenerate bindings and update durable documentation.
6. Run full validation and targeted adversarial checks.
7. Complete progress and review artifacts.

## Boundary invariants

- No secret value is interpolated into a command string.
- No secret map is placed in a request body or coordinator storage.
- No patch content is logged or printed.
- No dirty worktree is destroyed on a normal request without matching an owner-acknowledged
  digest.
- No oversize or truncated patch is treated as recoverable.
- No client-side write failure is followed by destroy.
- No force behavior is inferred.
- No ticket phase/status field is changed.
