# Review — T-004-04-02 secrets-and-uncommitted-work-safety

## Outcome

The ticket's safety guardrails are implemented and locally verified.

- Runtime secrets are declared as a required Cloudflare Worker secret, parsed as a bounded
  launch map, and passed only through Sandbox process environment options.
- Known configured values are redacted before owned logs, stored errors, API errors, and CLI
  output.
- Normal down no longer destroys a dirty worktree directly.
- Dirty tracked/untracked/binary/mode changes are exported to an owner-held Git patch and
  cryptographically acknowledged before destroy.
- Managed editor/dev processes are stopped before the final digest inspection to close the
  service-save race.
- Unverified preservation failures retain the Sandbox.
- Destruction without a verified patch requires the explicit `down --force` request.

No remote Cloudflare deployment or paid Containers run occurred. The implementation, image
build/dry run, exact Git recovery behavior, and repository regressions are proven locally.

## Acceptance criterion

Ticket criterion:

> Secrets are absent from the image and worktree and redacted from logs/CLI output; down commits
> and pushes (or exports a recoverable patch of) uncommitted session work before destroy, or
> refuses without explicit destructive confirmation.

| Clause | Evidence | Verdict |
|---|---|---|
| secrets not baked | `.dockerignore` exclusions + explicit Dockerfile copies + runtime binding only | PASS |
| secrets not in worktree | no secret file/write path; process `env` injection only | PASS |
| Worker secret source | `secrets.required: SESSION_RUNTIME_SECRETS`; generated binding type | PASS |
| launch injection | both Astro/code-server receive `startProcess({env})` | PASS |
| logs redacted | exact configured values replaced before `boundedLog()` | PASS |
| Worker errors redacted | redaction before structured log, durable record, API body | PASS |
| CLI redacted | success/error/non-JSON/transport output defense in depth | PASS |
| dirty state captured | `git add -A` + full-index binary cached diff | PASS |
| untracked/binary/mode recovery | real Git fixture recovers identical index tree | PASS |
| patch not truncated | hard 2 MiB refusal before read/transport | PASS |
| owner persistence first | CLI verifies then exclusive mode-0600 write before acknowledgement | PASS |
| workspace race detection | Worker regenerates and compares SHA-256 | PASS |
| final save race | managed services quiesced before final inspection | PASS |
| unsafe default refused | down requires typed preserve/digest/force JSON | PASS |
| explicit destruction | `down --force` -> `{mode:"destroy",force:true}` | PASS |
| destroy failure | desired state retained with redacted failure | PASS |

The selected acceptance path is recoverable patch export, not commit/push. The existing origin is
credential-free/read-only and the project has no branch, author, credential, or protected-ref
policy for automatic pushes.

## Secret flow

```text
interactive Wrangler secret input
  -> encrypted Worker binding SESSION_RUNTIME_SECRETS
     -> strict JSON/name/value/size parser
        -> plain in-memory map passed over typed DO RPC
           -> Sandbox startProcess.env (Astro + code-server)

known values
  -> longest-first exact replacement
     -> process log bounding
     -> public/stored error bounding
     -> CLI serialization
```

The map is never accepted through the lifecycle request, interpolated into a shell command,
written to `/workspace/session`, written to `/workspace/session-runtime`, included in desired
session storage, or emitted as structured success metadata.

The JSON object may be `{}` for demos needing no runtime credentials. It accepts up to 32 safe
uppercase environment names and 16 KiB aggregate data; dangerous loader/shell/session config
names are rejected. Invalid configuration produces a fixed message without echoing its source.

code-server terminals inherit the environment. That is intentional for the epic's trusted or
semi-trusted collaborator model. This is persistence/output safety, not isolation from authorized
code executing in the session. Owner agent credentials should not be injected by default.

## Teardown protocol

```text
CLI down
  -> preserve request
     -> clean: stop services, recheck, destroy
     -> dirty: return bounded base64 patch + SHA-256, keep session
        -> CLI decode/length/hash verification
        -> exclusive local 0600 patch write
        -> digest acknowledgement
           -> stop managed services
           -> regenerate patch
           -> mismatch: retain container and failed record
           -> match: destroy and clear desired record

CLI down --force
  -> explicit force request
  -> destroy without inspection, return forced:true
```

The patch is generated relative to the session record's exact full commit SHA. A revision mismatch
refuses teardown. Patch content remains outside the worktree and is neither logged nor stored in
the coordinator.

The CLI never prints the base64 response. It prints only the final teardown result and local
artifact metadata. If the second request fails, it reports the already-written recovery path.

## Recovery evidence

`test/session-work-safety.test.mjs` creates a real temporary Git repository, commits a base, and
then introduces:

- a tracked text modification;
- a tracked deletion;
- an untracked text file;
- an untracked binary file containing NUL/high bytes;
- an executable-mode change.

It runs the same generated preservation program, checks byte count and SHA-256, clones the base,
applies the patch using `git apply --binary --index`, and compares `git write-tree` values. The
source and recovered index trees are identical.

Documented recovery:

```bash
git checkout --detach <base-revision>
git apply --binary <artifact.patch>
```

## Files created

| File | Purpose |
|---|---|
| `test/session-work-safety.test.mjs` | executable Git patch recovery integration test |
| `docs/active/work/T-004-04-02/research.md` | codebase and constraint map |
| `docs/active/work/T-004-04-02/design.md` | options, tradeoffs, and selected safety design |
| `docs/active/work/T-004-04-02/structure.md` | file/interface blueprint |
| `docs/active/work/T-004-04-02/plan.md` | ordered implementation and verification strategy |
| `docs/active/work/T-004-04-02/progress.md` | implementation/validation/commit ledger |
| `docs/active/work/T-004-04-02/review.md` | this handoff |

## Files modified

| File | Ticket-owned change |
|---|---|
| `src/lib/session-lifecycle.ts` | secret/down types, parsers, redaction, preservation program/metadata |
| `src/session-worker.ts` | injection, redaction, preservation, quiescence, safe destroy behavior |
| `scripts/session.ts` | typed force mode, patch verification/write/acknowledgement, CLI redaction |
| `test/session-lifecycle.test.mjs` | pure contracts and CLI preservation/adversarial cases |
| `wrangler.sessions.jsonc` | required runtime-secret declaration |
| `worker-configuration.sessions.d.ts` | generated secret binding type |
| `package.json` | default suite includes Git recovery test |
| `docs/knowledge/session-lifecycle.md` | durable secret/down/recovery operations contract |

No file was deleted. `Dockerfile.session` and `.dockerignore` did not need changes: existing
explicit-copy and context exclusions already enforce the image boundary.

The shared branch was concurrently receiving sibling `T-004-04-01`. Commit `e07939f` touched the
overlapping `src/session-worker.ts` after that ticket's Access proxy hunks appeared in the working
file, so Git included those existing hunks in the same commit. This review attributes only the
secret/teardown changes above; the sibling ticket owns Access behavior and its uncommitted/config
artifacts. No sibling change was reverted.

## Commits

- `1034245` — RDSPI blueprint artifacts.
- `6506457` — pure secret and teardown contracts.
- `7dcafd8` — launch injection, redaction, Worker/CLI verified teardown.
- `8219149` — executable recovery fixture and durable documentation.
- `e07939f` — final service-quiescence race hardening (with concurrent shared-file Access hunks).
- Final Review/progress commit follows this artifact.

## Test coverage

Final shared-worktree validation:

| Check | Result |
|---|---|
| `npm test` | 146/146 pass, zero failures/skips |
| targeted lifecycle + recovery | 27/27 pass |
| `npm run session:validate` | pass; generated types, TS, Worker/container dry run |
| `npm run typecheck` | pass; Astro 51 files, zero diagnostics, App types current |
| `npm run deploy:dry` | pass; stable App Worker dry run |
| `git diff --check` | pass |
| latest Workers types | `@cloudflare/workers-types@5.20260710.1` inspected |
| Wrangler schema/docs | `secrets.required` confirmed current and generated types current |

The 26 lifecycle unit tests cover secret shape/limits/redaction, exact down inputs, preservation
command/metadata, CLI clean/dirty/force behavior, digest/content/write failures, and existing
lifecycle routing/configuration. The separate Git integration test supplies the 27th focused case.

`session:validate` rebuilt/dry-ran the linux/amd64 Sandbox image and confirmed the separate Worker
bundle/config. No deploy occurred.

## Cloudflare/DO review

- Wrangler 4.110.0 is installed and the JSONC schema recognizes `secrets.required`.
- Binding types were generated, not hand-written.
- Compatibility date is current and `nodejs_compat` remains enabled.
- Observability remains enabled with structured logs.
- The patch response is bounded before buffering; control JSON is stream-bounded.
- Web Crypto performs Worker-side SHA-256 verification.
- No mutable module-global request state was introduced.
- All async work is awaited/returned.
- The existing per-instance mutation chain serializes up/down without
  `blockConcurrencyWhile()` across Sandbox I/O.
- Typed DO RPC remains the control path.
- Desired state is persisted before destructive I/O and retained on failures.

## Open concerns and limitations

- A remote paid-Containers run has not exercised real Worker secrets, service environment
  inheritance, or actual container destroy.
- The 2 MiB cap intentionally refuses large/generated assets. The owner must commit/push manually
  or explicitly force after arranging another backup.
- Git-ignored files and empty directories are not represented. This is source-work preservation,
  not a filesystem snapshot.
- A manually written secret inside the worktree would enter the owner-held patch. Configured
  launch secrets are never written there by this implementation, but collaborator behavior is
  outside that guarantee.
- Exact-value redaction covers configured launch secrets only. Unknown credentials created inside
  the session cannot be recognized.
- Platform replacement before explicit down can still lose ordinary container state. R2 backup or
  authenticated commit/push is needed for automatic sleep/replacement durability.
- Quiescence stops the two SDK-managed services. A collaborator-created independent background
  process is outside the lifecycle's managed-process contract.
- The patch travels through a no-store JSON response before local persistence. A disconnect leaves
  the session intact, but no server-side patch copy exists.
- Normal down stages the disposable worktree index with `git add -A`; this is intentional and the
  content is preserved even if the client fails afterward.
- The private surface/control authorization production gate belongs to `T-004-04-01`; do not
  deploy code-server `--auth none` until that sibling review passes.

## Human production gates

1. Set `SESSION_RUNTIME_SECRETS` using interactive `wrangler secret put` (use `{}` if empty).
2. Complete and verify Access/origin assertion enforcement from `T-004-04-01`.
3. Deploy to an entitled Cloudflare account.
4. Use a disposable marker secret to prove service inheritance and log/CLI redaction.
5. Make tracked/untracked/binary edits in code-server and run normal down.
6. Apply the emitted patch against the recorded base and compare content.
7. Confirm container resources are destroyed only after acknowledgement.
8. Test a save during down and verify mismatch refusal/no loss.
9. Confirm no secret value appears in image history, container baseline, Worker logs, or worktree.

## Final assessment

No critical code issue remains in the ticket scope. The acceptance criterion passes with unit,
real-Git recovery, generated-type, TypeScript, image-build, Worker dry-run, and stable-app
regression evidence. Production Cloudflare behavior and sibling Access completion remain explicit
deployment gates rather than silently assumed proof.

The ticket phase/status frontmatter was not modified. Lisa owns the transition after this Review
artifact is detected.
