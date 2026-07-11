# Review — T-007-02-02 rotate-secrets-and-config

## Outcome

The ticket is complete within S-007-02's explicit scrubbed-local-simulation
boundary.

- A complete local rotation rehearsal ran successfully twice.
- All eight inventoried secret seams received distinct new-owner-generated
  values in a private disposable store.
- `SESSION_RUNTIME_SECRETS` contained and validated a rotated
  `NEW_OWNER_DEMO_API_KEY`, so the run covers API keys rather than treating the
  map as empty.
- Session domain/repository config and the three scratch routes moved off author
  values/placeholders.
- Production parsers accepted the runtime-secret and Access values.
- The generated passcode opened the production gate; a wrong value failed 403.
- A generated signing key powered a healthy receipt operation and passed leak
  inspection.
- Exact-value scanning found none of eight secret values or the nested API key in
  runtime files, scratch build output, or evidence.
- Active author config markers were absent.
- No non-rotatable secret was found.

The live Cloudflare Worker and GitHub Actions stores are explicitly
`deferred-live`, not passed: no genuine new-owner credentials/account/repository
were supplied. This is the story's named PE-7 boundary. The operator appendix
contains the exact secure installation and name-only verification commands for
the recipient.

## Acceptance criterion assessment

> A rotation run replaces every secret (passcode + any API keys) with
> new-owner values.

**Met in the performed simulation.** `rotation-report.json` contains exactly
eight rows: two App bindings, four Sessions bindings, and two CI deployment
inputs. Fingerprints are pairwise distinct. The runtime-secret map additionally
contains a separately scanned `NEW_OWNER_DEMO_API_KEY`. Values originated only
after the clean-owner boundary was established and were trap-deleted afterward.

> Move config off author defaults.

**Met in the scratch context.** `SESSION_DOMAIN` and
`SESSION_REPOSITORY_URL` equal selected new-owner simulation values. The three
routes use that owner zone. The verifier rejects author values and unresolved
placeholders. It does not falsely claim the reserved simulation zone is a live
domain; T-007-02-03 owns real resources/routes/data.

> A leak/ops check confirms zero author-controlled secrets reach deployment.

**Met for the clean-owner runtime path.** The rehearsal begins from `git archive`
with `.dev.vars`, `.git`, `.promote`, and `.wrangler` absent, then executes build
and checks under an allowlisted environment. `ops:check` verified the signature;
`leak:check` checked 23 client assets and one response body; the broader verifier
scanned every generated value plus the nested API key. No author secret was read,
so none could be inherited/copied into the scratch deployment output.

> Any secret that proved non-rotatable is logged as a named gap.

**Met.** `nonRotatableGaps` is present and empty because every name exposed a
working replacement seam. Missing live authority is recorded per store as
`deferred-live`, which must become a named gap if a future attempted install
fails.

## Files created

### RDSPI artifacts

- `research.md` — secret/config/check inventory, constraints, environment map.
- `design.md` — four options and selection of a disposable redacted rehearsal.
- `structure.md` — ticket-scoped component/interface/evidence blueprint.
- `plan.md` — ordered implementation, adversarial checks, regression strategy.
- `progress.md` — commits, deviations, performed runs, leak finding, final tests.
- `review.md` — this handoff assessment.

### Implementation and procedure

- `rotate-fresh-owner.sh` — clean-context orchestration, random secret creation,
  allowlisted build/runtime, existing ops/flow/leak execution, cleanup.
- `verify-rotation.ts` — exact inventory/config/contract/author-marker/exact-value
  assertions with a redacted report.
- `rotation-run.md` — rerunnable local procedure, actual result, eight-name table,
  secure live commands, deferred/gap ledger.

### Evidence

- `evidence/rotation-report.json` — machine-readable rotation/config verdict.
- `evidence/integration-report.json` — operation/flow/leak pass summary.
- `evidence/rotation-run.txt` — redacted corrected transcript.
- `evidence/author-marker-scan.txt` — six active couplings absent.
- `evidence/exact-secret-scan.txt` — eight values + nested API key clean.

No file was deleted. No file outside this ticket's work directory was changed by
the ticket commits. The source-root generated `dist` from a superseded test run
was removed; it is ignored build output, not source.

## Implementation quality and security review

### Secret handling

- No raw value appears in a command argument, source, report, or transcript.
- Temporary secret/runtime-config files are created mode 0600 under `mktemp`.
- An exit/signal trap stops the server and deletes the private directory.
- Ambient process variables are dropped with `env -i`; only PATH, HOME, TMPDIR,
  and explicit check inputs are passed.
- The signing-key shell variable is unset immediately after checks.
- The source `.dev.vars` is never opened by the successful path.
- Evidence records short hashes, names, and paths only.

### Inventory completeness

The verifier compares config arrays rather than merely searching text. It also
requires both workflow GitHub-secret references. Deleting one App binding was
adversarially tested and failed with the correct seam.

### Contract fidelity

The implementation imports product `parseRuntimeSecrets`, `parseAccessConfig`,
and `guardPasscode`. This prevents a drill-only validator from drifting from the
actual Worker behavior. Access preview/editor uniqueness is checked by production
code and was adversarially exercised.

### Failure behavior

Residual author route, missing binding, leaked nested API key, and shared Access
audience all failed non-zero with a name/path/seam and without printing secret
values. A wrong passcode is expected control evidence and returns 403.

## Test coverage

| Verification | Result |
| --- | --- |
| Corrected full rotation rehearsal | pass twice |
| Clean build | pass |
| Generated-key `ops:check` | pass; signature verified |
| Healthy Playwright flow | 1 pass; stalled-only case intentionally skipped |
| `leak:check` | pass; 23 assets + 1 response |
| Exact all-secret scan | pass; 8 seams + nested API key |
| Active author-marker scan | pass; 6 markers absent |
| Adversarial verifier cases | 5/5 expected outcomes |
| `npm test` | pass; 152 tests, 0 failures |
| `npm run typecheck` | pass; 56 Astro files, 0 diagnostics; TS/types current |
| `npm run deploy:dry` | pass; no upload |
| `bash -n rotate-fresh-owner.sh` | pass |
| full ticket `git diff --check` | pass |
| report schema assertions | pass |

The dry deployment used an isolated Wrangler config and allowlisted environment,
so the developer's `.dev.vars` did not contaminate verification. Wrangler's
expected build warning that App secrets were absent is positive evidence here:
runtime secrets are installed out-of-band, not bundled.

## Important finding from the superseded run

The first source-root run loaded `.dev.vars`; a second attempt that supplied the
generated signing key during build made `leak:check` fail on
`server/.dev.vars`. This uncovered a real operator hazard: Astro build can emit a
secret-derived file under `dist/server` when application secrets are available
at build time.

The result was not accepted or hidden. The final procedure builds in a clean
tree with no App secrets, supplies secrets only to a private runtime config, and
scans scratch `dist`. The source-root `dist` from the superseded attempt was
removed.

Human/operator action: always deploy from the clean new-owner context; never
package a handoff from a tree retaining the prior owner's `.dev.vars` or with App
secrets exported during build. A future hardening ticket could make the normal
aggregate integration/deploy tooling refuse or strip `dist/server/.dev.vars`
independently of exact-key leak matching.

## Open concerns and limitations

1. **Remote installation is unexecuted.** A recipient must run the documented
   commands under a genuine new-owner Cloudflare account/GitHub repository and
   list the eight names. This is the only acceptance leg not live-observed.
2. **Access values are shape-valid simulations.** Only new-owner Access
   applications can supply real team/audience values; their live JWT behavior is
   T-007-02-04 verification.
3. **CI token usability is not locally testable.** The simulated token/account
   ID establish rotation coverage/provenance, not Cloudflare authorization.
4. **Build-time secret-file hazard remains in general tooling.** The drill avoids
   it safely but does not rewrite product build/integration code, per story scope.
5. **No Sessions Worker/container was started.** Production parsers validate all
   four bindings and API-key map; resource/session execution depends on
   T-007-02-03 and deployed checks on T-007-02-04.

## Critical issues requiring human attention

- Do not interpret `installation: simulated` as remote installation. The two
  `deferred-live` rows are deliberate and must be resolved by a real recipient.
- Treat any `dist/server/.dev.vars` in a deploy tree as sensitive and block the
  deploy until rebuilt from a secret-free source context.
- Confirm `wrangler whoami --json`, `gh auth status`, and the Git remote all name
  the new owner before setting any live value.

No destructive action, remote mutation, credential read, ticket-frontmatter
edit, or non-rotatable secret gap remains from this ticket itself.

## Commits

- `47c5571` — Research/Design/Structure/Plan.
- `fee2c34` — verifier and redacted rotation orchestrator.
- `068545b` — procedure, performed evidence, progress.
- `1308f32` — evidence whitespace normalization and future transcript hygiene.

Other agents committed between these units on the shared branch; each ticket
commit staged only `docs/active/work/T-007-02-02/**`.
