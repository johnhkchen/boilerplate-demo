# Design — T-004-04-02 secrets-and-uncommitted-work-safety

## Decision summary

Add one Worker-secret binding containing a validated JSON map of launch environment variables,
inject that map only into the two Sandbox service processes, and redact its values at every
Worker/API/CLI output boundary. Replace unconditional teardown with a preservation protocol:
clean worktrees destroy immediately; dirty worktrees produce a bounded binary Git patch, the
CLI writes it locally, and destruction occurs only after the Worker regenerates the patch and
matches its digest. An explicit `--force` path is the only way to destroy dirty work without a
verified export.

## Design goals

- Keep secrets out of build arguments, image layers, repository files, generated runtime files,
  durable coordinator state, and lifecycle request bodies.
- Make launch injection deterministic and idempotent.
- Prevent known injected values from appearing in process logs, errors, API bodies, structured
  Worker logs, or CLI output.
- Preserve tracked modifications, deletions, executable-bit changes, binary changes, and
  untracked files before a normal down.
- Detect edits made between export and destroy.
- Refuse unsafe teardown by default.
- Keep the one-session API and CLI small.
- Avoid adding storage infrastructure or authenticated Git policy not present in the epic MVP.

## Secret source options

### Option A — secrets in the `up` request

The owner could send a secret map with the revision.

Advantages:

- naturally session-specific;
- easy to change without redeploying a binding.

Disadvantages:

- places credentials in shell history, client memory, request bodies, and potentially edge
  request logs;
- encourages CLI flags or files that are easy to commit;
- makes retry/idempotency payloads sensitive;
- conflicts with the repository's established Wrangler-secret boundary.

Decision: reject.

### Option B — individual Worker secret bindings

Every supported environment name could be a distinct binding and explicit TypeScript field.

Advantages:

- strongest platform-native separation;
- simple value access;
- each secret can rotate independently.

Disadvantages:

- the template cannot know future demo/agent variable names;
- each new variable requires source, generated-type, and configuration edits;
- enumerating bindings into a process environment remains custom code.

Decision: viable for a fixed application, too rigid for a reusable demo template.

### Option C — one JSON Worker secret map

Define `SESSION_RUNTIME_SECRETS` through `wrangler secret put`. Its value is a JSON object from
environment-variable name to string value.

Advantages:

- remains a platform Worker secret rather than a committed var;
- supports demo-specific and agent-specific names without code changes;
- gives the Worker the complete set of values required for exact redaction;
- can be passed directly through Sandbox `ProcessOptions.env`;
- is absent from the `up` request and coordinator record.

Disadvantages:

- rotating one member rotates the entire JSON binding;
- malformed JSON could block session operations;
- names and sizes require strict validation;
- all managed processes receive the same configured set.

Decision: choose Option C for the MVP.

## Secret map contract

`SESSION_RUNTIME_SECRETS` is required and contains a JSON object. The empty object is valid,
allowing deployments that need no runtime credentials while retaining one explicit contract.
Keys must match portable uppercase environment names: `^[A-Z_][A-Z0-9_]*$`. Reserved session
configuration names and dangerous process-loader names are rejected. Values must be non-empty
strings of at least eight characters. The parser limits entry count and aggregate size.

The parser never includes input text, names, or values in an error. Misconfiguration responses
use a fixed public message. The parsed map lives only in Worker invocation memory and is passed
to `startProcess()` for Astro and code-server. It is not supplied to provisioning `exec()`,
written to `/workspace/session-runtime`, or stored in the session record.

Passing the map to code-server means editor terminals can inherit it. That is intentional within
the epic's trusted/semi-trusted teammate boundary, and documentation must state it plainly. The
design prevents accidental persistence and output, not access by code intentionally running in
the authorized session.

## Redaction options

### Pattern-only redaction

Mask strings that look like tokens.

This misses arbitrary values and creates false confidence. Reject.

### Name-aware redaction

Mask `KEY=value` forms for known names.

This misses a secret echoed without its name. Reject as the only mechanism.

### Exact known-value redaction

Replace every configured value with `[REDACTED]`, longest values first. Apply after converting
errors/logs to strings and before truncation or serialization.

This is deterministic, aligns with existing integration-check code, and covers raw echoes.
Choose it. Name-aware replacement can supplement it, but exact values are authoritative.

Redaction boundaries:

- provisioning and process-start errors before durable storage;
- structured coordinator/Worker error logs;
- `logs()` stdout and stderr before `boundedLog()`;
- all public error messages;
- CLI response text before JSON parsing and printing as defense in depth.

The CLI obtains the same map from its local `SESSION_RUNTIME_SECRETS` environment only when
present. The server is the primary boundary; CLI redaction protects against a future accidental
server regression and transport/mock failures that include a configured value.

## Dirty-work preservation options

### Option A — automatic commit and push

Stage changes, commit on a generated branch, and push before destroy.

Advantages:

- durable and naturally reviewable;
- promotion can select the resulting commit.

Disadvantages in this repository:

- the session remote is credential-free and read-only;
- no branch naming, author identity, protected-branch, fork, or credential policy exists;
- owner credentials must not be shared by default;
- adding GitHub authentication would materially expand scope and trust decisions.

Decision: reject for this ticket; retain as a future enhancement.

### Option B — R2/Sandbox backup

Store a patch or workspace backup in R2 before destroy.

Advantages:

- durable even when the CLI disconnects;
- can support replacement/sleep restoration.

Disadvantages:

- no R2 bucket, binding, retention, encryption, object naming, cleanup, or restore workflow is
  present;
- adds infrastructure and lifecycle policy beyond this ticket.

Decision: reject for the current ticket, recommended for multi-session/automatic-sleep work.

### Option C — verified client-side Git patch handoff

Stage the worktree with `git add -A`, generate `git diff --cached --binary --full-index HEAD`,
and return a bounded base64 payload plus SHA-256 digest. The CLI writes a `.patch` file locally,
then requests destroy with that digest. The Worker regenerates the patch; only an exact digest
match permits destruction.

Advantages:

- uses the current Git worktree and CLI without new infrastructure;
- includes tracked, untracked, deleted, renamed, binary, and mode changes;
- produces a human-inspectable, recoverable artifact;
- closes the race between export and destroy;
- provides explicit proof that the client received the exact version being destroyed.

Disadvantages:

- ignored files are excluded;
- patch size must be capped for Worker/RPC/CLI safety;
- local disk failure prevents teardown;
- patch application may need `git apply --binary` against the recorded base revision;
- staging modifies the disposable worktree index.

Decision: choose Option C.

## Preservation protocol

The down request becomes a discriminated JSON body:

```text
{ "mode": "preserve" }
{ "mode": "destroy", "preservationSha256": "<64 lowercase hex>" }
{ "mode": "destroy", "force": true }
```

Normal CLI `down` first sends preserve mode.

If the worktree is clean, the coordinator destroys immediately and returns idle. No empty patch
is created.

If dirty, the coordinator:

1. stages all non-ignored work with `git add -A`;
2. writes a full-index binary diff outside the worktree;
3. measures it and refuses when it exceeds the configured bound;
4. computes SHA-256;
5. reads it as base64 through the Sandbox file API;
6. returns the base revision, digest, byte count, and payload without destroying.

The CLI decodes base64, independently verifies byte count and SHA-256, writes a filename based
on session slug/revision/digest using exclusive creation, and reports its path. Only after the
write succeeds does it send destroy mode with the digest.

The coordinator regenerates the staged binary patch and compares its digest. If it differs,
down returns `409 workspace_changed`; the runtime remains intact and the CLI retains the first
patch. The owner reruns down to export the newer state. If it matches, the coordinator destroys
and clears durable state.

`down --force` sends `{mode:"destroy", force:true}`. The CLI prints a prominent destructive
message, and the API treats the explicit boolean as confirmation. There is no implicit force,
environment toggle, or empty-body compatibility path.

## Size and recovery policy

Set a conservative patch cap of 2 MiB. This is large enough for source-focused demo edits and
small enough for base64 JSON transport. If the patch exceeds the cap, return a refusal that
instructs the owner to commit/push manually or use explicit force. Never truncate a patch.

The response uses `cache-control: no-store`. Patch content is not included in structured logs or
durable storage. The local artifact header is the ordinary Git binary patch; metadata returned
alongside it records the exact base revision. Documentation gives the recovery command:

```bash
git checkout --detach <base-revision>
git apply --binary <artifact.patch>
```

Because `git diff --cached HEAD` includes staged state after `git add -A`, it represents the
complete non-ignored working state relative to the exact session base. Empty directories remain
unrepresentable because Git does not track them.

## Failure behavior

- Missing or malformed launch-secret configuration: fixed 500 misconfiguration response;
  no source input echoed.
- Secret-containing service output: exact values replaced before API response.
- Preservation command failure: 502, session retained.
- Oversized patch: 409 safety refusal, session retained.
- Invalid base64/digest at CLI: no destroy request.
- Local file collision: exclusive write refuses, no destroy request.
- Local write failure: no destroy request.
- Patch changed after export: 409, session retained.
- Force flag absent on destructive request: invalid request/refusal.
- Sandbox destroy failure: failed desired record retained as today, with redacted message.

## Compatibility decision

The old empty-body `POST /down` is intentionally removed. Silent compatibility would retain the
unsafe behavior. Both repository CLI and Worker change atomically. Callers receive `400` until
they select preserve or explicit force.

## Testing strategy

- Pure unit tests cover secret parsing, reserved names, limits, exact-value redaction, down input
  parsing, preservation metadata parsing, fixed command invariants, and patch size/digest checks.
- CLI unit tests cover normal clean down, dirty two-step export/destroy, force mode, digest
  mismatch, exclusive-file failure, and redacted transport/output failures.
- Existing lifecycle tests remain regression coverage for image, routing, and up behavior.
- TypeScript/Workers dry-run verifies the new binding and process environment types.
- A local Git fixture can execute the fixed preservation command against text, binary, untracked,
  deleted, and mode changes without requiring Docker.
- Full local Sandbox evidence is desirable but not necessary to validate cryptographic handoff
  logic; production Access and remote Containers remain separate gates.

## Rejected scope

- accepting secret values via HTTP or CLI arguments;
- persisting launch secrets in Durable Object storage;
- writing `.env` files in the worktree or runtime directory;
- printing secret names/values for diagnostics;
- owner GitHub/agent credential sharing by default;
- automatic authenticated push without an explicit repository policy;
- adding R2 solely for this one-session MVP;
- backing up ignored caches, terminal state, or empty directories;
- automatic sleep/replacement recovery, since keepalive remains active;
- changing ticket phase/status frontmatter.

## Design decision

The selected design uses the infrastructure already present while turning both safety claims
into enforceable runtime behavior. Secrets cross only the Worker-binding-to-process launch
boundary and are known to the redactor. Normal teardown becomes a verified transaction between
the live worktree and an owner-held recovery artifact. Any inability to prove preservation
leaves the session running; destruction without proof requires an explicit `--force` request.
