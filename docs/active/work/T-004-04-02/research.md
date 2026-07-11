# Research — T-004-04-02 secrets-and-uncommitted-work-safety

## Ticket state and scope

- The ticket begins in `phase: research` and requires the full RDSPI sequence.
- Its single acceptance criterion contains two independent safety boundaries:
  - runtime secrets must not enter the image, worktree, logs, or CLI output;
  - teardown must preserve dirty session work or require explicit destructive confirmation.
- The ticket advances P3 and P6, so the safety behavior belongs to the sovereign
  Cloudflare session runtime rather than an external hosted control plane.
- The ticket depends on `T-004-03-02`, which is complete and supplies the one-session
  lifecycle that this ticket must harden.
- The ticket does not name a particular application secret, Git remote credential, or
  agent credential.
- The epic explicitly calls out agent credentials as an example and says they must be
  injected at launch, never baked, and not shared from the owner by default.
- Access authorization is owned by sibling ticket `T-004-04-01`, not this ticket.

## Existing runtime boundary

- `wrangler.sessions.jsonc` defines a separate Sessions Worker.
- `wrangler.jsonc` continues to define the stable public App Worker.
- The Sessions Worker has exact routes for `demo-session.b28.dev` and
  `code-session.b28.dev`.
- The fixed MVP session is coordinated by `SessionCoordinator`, a SQLite-backed Durable
  Object named `primary`.
- The execution runtime is a Sandbox Durable Object named `demo-runway-session`.
- `getSandbox()` is called with `keepAlive: true` and no default execution session.
- The Sandbox container owns `/workspace`, the mutable worktree, and the two managed
  services.
- Desired session state is stored under `desired-session` in coordinator storage.
- The stored record contains only version, slug, revision, phase, timestamps, and an
  optional bounded error.

## Current image and build-context behavior

- `Dockerfile.session` assembles the session image from explicit `COPY` instructions.
- It never uses `COPY .`.
- The baked project baseline is stored at `/opt/demo-runway`.
- The mutable session worktree is created later at `/workspace/session`.
- `.dockerignore` excludes `.git`, `.dev.vars`, `.env` variants, `.wrangler`, `.promote`,
  Lisa state, documentation, test output, editor state, and dependencies.
- The Dockerfile copies only package manifests, application/configuration files,
  migrations, and scripts.
- The existing image documentation states that no Cloudflare token, signing key,
  passcode, editor password, Git credential, or agent credential is baked.
- The image check starts containers without forwarding host environment variables.
- `wrangler.sessions.jsonc` currently declares `"secrets": { "required": [] }`.
- Its comment reserves session launch secrets for later lifecycle work.
- Generated `worker-configuration.sessions.d.ts` therefore contains no session-secret
  binding today.

## Current workspace provisioning

- `buildProvisionCommand()` returns a fixed shell program.
- Dynamic repository URL and revision values are supplied through an `exec()` environment.
- Revisions must be full lowercase 40-character SHA-1 values.
- Repository URLs must be credential-free HTTPS URLs.
- A new session creates a bare repository at `/workspace/repository.git`.
- It fetches the exact revision and creates a detached worktree at
  `/workspace/session`.
- An existing worktree is retained only when its `HEAD` matches the requested revision.
- Same-revision convergence deliberately preserves collaborator edits.
- A different requested revision is refused rather than resetting the worktree.
- Dependencies are linked from `/opt/demo-runway/node_modules` when manifests match or
  installed in the worktree otherwise.
- No credential helper or authenticated push remote is configured.
- The current public repository URL permits fetch but provides no write path.

## Current service launch and secret exposure points

- Astro is launched through `sandbox.startProcess()` as process `astro-dev`.
- code-server is launched the same way as process `code-server`.
- `ProcessOptions` in Sandbox SDK 0.12.3 supports an `env` object.
- The SDK documents those values as command-invocation environment overrides.
- Neither managed process currently receives an explicit environment map.
- Service command strings contain no credentials.
- The generated Astro config is written outside the Git worktree under
  `/workspace/session-runtime`.
- code-server opens the entire `/workspace/session` worktree.
- A collaborator can open an editor terminal, so any secret placed in a process or
  terminal environment should be considered available to that trusted/semi-trusted
  collaborator.
- The project threat model is explicitly trusted/semi-trusted teammates, not hostile
  arbitrary code isolation.

## Current logging and output behavior

- `logs()` obtains stdout and stderr for both managed processes.
- `boundedLog()` returns the latest 32 KiB and metadata about truncation and original
  byte length.
- `boundedLog()` limits size but does not redact content.
- Complete process logs are not copied into coordinator durable state.
- Structured Worker logs include operation, phase, slug, revision, change state, error
  code, and sanitized error text.
- `safeErrorMessage()` converts errors to a single line and truncates to 500 characters.
- It does not redact known secret values.
- Provision failures include combined command stderr/stdout in a public error.
- Process startup/readiness failures can likewise reach stored errors, structured logs,
  API errors, and the CLI.
- `scripts/session.ts` prints the complete parsed Worker JSON response.
- Successful JSON goes to stdout and failed JSON goes to stderr.
- The CLI has no independent redaction layer.
- The repository already contains a value-based redaction pattern in
  `src/lib/integration-check.ts` and `scripts/integration-check.ts`.
- Those helpers replace exact known secret values with `[REDACTED]` before persistence or
  output.

## Current teardown behavior

- `POST /__session/down` accepts no request body.
- The CLI syntax is `npm run session -- down` with no flags.
- `SessionCoordinator.down()` serializes with other lifecycle mutations.
- If no record exists, down returns an idempotent idle result.
- Otherwise it marks the record `stopping`, immediately calls `sandbox.destroy()`, then
  deletes the stored desired state.
- If destroy fails, it stores a bounded failure and retains the desired record.
- No Git status check occurs before destruction.
- No commit, push, patch, backup, or export occurs before destruction.
- The lifecycle documentation explicitly warns that current down destroys uncommitted
  work.
- `keepAlive: true` avoids the automatic sleep loss observed in the spike while the
  session is active.
- Keepalive does not protect against explicit down or platform replacement.

## Git facts relevant to preservation

- The worktree is detached at the selected immutable revision.
- A detached worktree can still produce commits, but it has no local branch by default.
- The configured origin is credential-free and currently public/read-only.
- Automatic commit and push would require an authenticated writable remote and a target
  ref policy that do not exist in the current session contract.
- Git diff alone excludes untracked files.
- A binary-safe recoverable export needs both tracked changes and untracked files.
- Git can create a portable bundle only for commits/refs, not arbitrary dirty work
  without first committing it.
- The Sandbox SDK supplies backup/restore APIs backed by external storage, but no R2
  binding or backup lifecycle exists in this repository.
- A patch returned only in an HTTP response is not durable if the client disconnects or
  output is truncated.
- A recoverable export can instead be downloaded before destroy if the protocol makes
  preservation and acknowledgement explicit.

## Existing API and validation seams

- Control routing is centralized in `classifyControlRequest()`.
- `readBoundedJson()` provides a stream-enforced request-body limit.
- `parseUpInput()` enforces an exact object shape.
- Operation results use a shared success/failure discriminated union.
- `jsonResponse()` sets JSON content type and `cache-control: no-store`.
- The Worker handler owns request parsing and delegates typed values to the coordinator.
- The CLI has a pure argument parser and injectable fetch/stdout/stderr dependencies.
- Unit tests directly import pure lifecycle and CLI helpers with Node's type stripping.
- The default `npm test` suite includes `test/session-lifecycle.test.mjs`.
- `session:validate` checks generated bindings, the Sessions TypeScript project, and a
  Wrangler dry run.

## Constraints and assumptions surfaced by the codebase

- The acceptance criterion permits either commit+push or a recoverable patch.
- No writable remote, R2 binding, or session backup store currently exists.
- Therefore the existing infrastructure can prove a patch handoff more directly than an
  automatic push.
- Destructive teardown remains permitted only when confirmation is explicit.
- A confirmation must be represented in the request, not inferred from an interactive
  terminal prompt, because the control API is the source of truth.
- Secrets must not be accepted in the `up` request body because request bodies can be
  logged or retained by clients and would cross the control API boundary.
- Cloudflare Worker secret bindings are the repository's established production secret
  mechanism.
- Secret names and values need validation before process launch.
- Redaction must happen before values enter durable errors, structured logs, API bodies,
  and CLI output.
- Exact value replacement is possible only for secrets known to the Worker.
- Arbitrary collaborator-created credentials cannot be redacted unless they are part of
  the configured launch-secret set.
- The ticket frontmatter must remain unchanged; Lisa owns phase and status transitions.

## Verification surfaces

- Pure tests can verify secret-map parsing, name constraints, exact-value redaction,
  launch environment wiring, dirty-work classification, preservation commands, and down
  request parsing.
- CLI tests can verify explicit destructive syntax and output redaction.
- Type checking can verify the Worker secret binding and Sandbox process options.
- Wrangler dry-run validation can verify the separate Sessions Worker configuration.
- Docker/image inspection can continue to prove that configured runtime values are absent
  from the baked image.
- A local Sandbox lifecycle can prove dirty-work refusal and export-before-destroy when
  Docker/Local Wrangler are available.
- Automatic push cannot be honestly proven without a writable test remote and credential
  policy.

## Research conclusion

The repository already has strong image-context exclusion, exact lifecycle seams, bounded
input/output, and idempotent mutation serialization. The missing safety behavior is at runtime:
there is no launch-secret contract, no value-aware redaction, and down destroys the Sandbox
without inspecting or exporting its detached worktree. The current credential-free public
remote makes patch preservation the available acceptance-criterion path; destructive teardown
needs to become an explicit, typed exception rather than the default.
