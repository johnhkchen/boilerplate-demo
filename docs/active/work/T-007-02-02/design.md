# Design — T-007-02-02 rotate-secrets-and-config

## Decision summary

Build a ticket-scoped, self-redacting rotation rehearsal that starts from the
T-007-02-01 fresh-owner context, substitutes explicit new-owner configuration,
generates fresh values for all eight secret seams, validates every runtime
contract, runs the existing integration/ops/leak gate with the new App signing
key, and writes only names, fingerprints, states, and check outcomes as evidence.

The run will have two deliberately distinct outcomes:

- **local rotation rehearsal: pass** when all values are fresh, all contracts
  accept them, author markers and exact secret values are absent from runtime
  files/build evidence, and existing checks pass;
- **live store installation: deferred** when no genuine second-owner
  Cloudflare/GitHub authority is supplied. The exact unexecuted commands/stores
  are named rather than pretending the author's account is a new owner.

This matches the story's permitted scrubbed simulation while retaining an
honest boundary around external mutations.

## Goals

- Cover `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`, all four Sessions Worker bindings,
  and both CI deployment inputs.
- Include at least one new-owner API key inside `SESSION_RUNTIME_SECRETS` so
  “any API keys” is exercised rather than represented by an empty object.
- Replace the session domain and repository configuration in the scratch tree.
- Prove no author secret can be inherited from the source context.
- Prove generated secret values do not reach committed/runtime files, built
  output, logs, or durable evidence.
- Reuse the production parsers and existing check trio rather than inventing
  parallel acceptance semantics.
- Keep all implementation under this ticket's work directory.

## Non-goals

- No author/local secret discovery.
- No use of current Cloudflare login state.
- No live Worker/GitHub secret mutation without new-owner authority.
- No domain, resource, D1, Durable Object, or data transfer (T-007-02-03).
- No verification against the completed new-owner deployment (T-007-02-04).
- No general provider-independent secret manager or durable rotation product.
- No product runtime rewrite.

## Option A — prose-only manual checklist

Document eight commands and ask an operator to report completion.

### Advantages

- Smallest implementation.
- Interactive `wrangler secret put` naturally avoids command-line values.
- Works with any actual new-owner values.

### Drawbacks

- No run exists in the current environment.
- Inventory omissions are easy to miss.
- It cannot prove generated values satisfy Sessions parser constraints.
- It cannot scan evidence for exact-value disclosure.
- It makes the acceptance depend entirely on an unavailable live account.

### Verdict

Rejected as the sole deliverable. A manual live appendix remains necessary, but
the ticket requires a performed rotation run and evidence.

## Option B — mutate the repository configs and `.dev.vars`

Replace author values directly in `wrangler*.jsonc`, generate a repository-root
`.dev.vars`, and run the checks in place.

### Advantages

- Directly resembles ordinary local development.
- Existing scripts already read `.dev.vars`.
- Minimal scratch-context plumbing.

### Drawbacks

- Conflicts with T-007-02-03's parallel ownership of routes/resources.
- Risks reading/replacing the developer's existing gitignored `.dev.vars`.
- Leaves new secret values on disk outside a disposable boundary.
- Changes the product repository even though the story says drill scripts may
  be added but runtime code is not rewritten.
- The active dirty worktree contains unrelated ticket work.

### Verdict

Rejected. The predecessor deliberately established a scratch context so this
ticket does not need to mutate the source tree.

## Option C — ticket-scoped disposable rotation rehearsal

Add a shell orchestrator plus a TypeScript verifier under
`docs/active/work/T-007-02-02/`.

The orchestrator:

1. creates/reuses the predecessor's scrubbed context;
2. replaces only the new-owner config placeholders;
3. creates eight cryptographically random simulated new-owner values in a
   private temporary directory/environment;
4. runs a verifier against config, production parsers, and runtime paths;
5. runs `npm run integration:check` with the generated signing key;
6. scans `dist` and captured evidence for every exact value;
7. deletes the temporary secret store on every exit;
8. writes redacted evidence and a final pass/gap/deferred result.

### Advantages

- Produces a real, repeatable run without external mutation.
- Begins from a context where author secret stores are structurally absent.
- Covers every secret name mechanically.
- Exercises real input validators and the existing ops/leak paths.
- Secret values never enter command arguments, source files, or artifacts.
- Keeps parallel ticket seams isolated.

### Drawbacks

- Random simulated CI values are structurally fresh but do not authenticate to
  GitHub/Cloudflare.
- Access identifiers can be shape-valid locally but only a live Access
  application can establish their real audience values.
- Local checks prove the application path, not successful remote installation.
- The script is ticket evidence, not reusable product tooling.

### Verdict

Selected. These limitations are visible states, not hidden failures, and align
with the story's stated local-simulation boundary.

## Option D — install into the currently authenticated account

Run `wrangler whoami`, rotate all Worker secrets, and update GitHub secrets in
the repository currently available to the session.

### Advantages

- Exercises real secret stores.
- Produces remote binding-name evidence.

### Drawbacks

- There is no evidence that current auth belongs to a second owner.
- Could overwrite production author secrets and break the deployed demo.
- GitHub/Cloudflare mutation materially exceeds authority supplied to this run.
- It would violate the criterion's ownership intent even if commands succeeded.

### Verdict

Rejected as unsafe and semantically invalid.

## Selected data model

The verifier owns the canonical inventory:

```text
App Worker:       DEMO_SIGNING_KEY, DEMO_PASSCODE
Sessions Worker:  SESSION_RUNTIME_SECRETS,
                  SESSION_ACCESS_TEAM_DOMAIN,
                  SESSION_ACCESS_PREVIEW_AUD,
                  SESSION_ACCESS_EDITOR_AUD
CI store:         CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
```

Each result contains only:

- secret name;
- destination store;
- short SHA-256 fingerprint;
- `rotated` boolean;
- `installed` state (`simulated` or `deferred-live`);
- contract-check outcome.

Fingerprints are evidence of distinct inputs, not credentials. The report must
never contain length-plus-prefix data, raw values, complete hashes, shell
commands with interpolated values, or environment dumps.

## Secret generation design

Use Node's `crypto.randomBytes` through a small generation step because Node is
already a required runtime and behaves consistently across supported hosts.

- App signing key: 32 random bytes encoded as hex.
- Backstage passcode: independently generated 24 random bytes encoded as hex.
- Runtime API key: independently generated 24 random bytes, placed under
  `NEW_OWNER_DEMO_API_KEY` in the JSON map.
- Access team domain: a new-owner simulation origin under
  `*.cloudflareaccess.com`; it is configuration-shaped, not claimed live.
- Access audience tags: two independent 32-byte hex strings.
- CI API token: independent random bytes used only as a simulated value.
- CI account ID: independent random bytes in account-ID shape.

The generated file is mode `0600` inside `mktemp -d`; cleanup is installed before
generation. Values are passed to subprocesses through environment/stdin, never
arguments. `set -x` is prohibited.

## Configuration design

The rehearsal accepts an owner zone and HTTPS GitHub repository URL. Defaults
are explicit reserved simulation values:

- `new-owner.example`;
- `https://github.com/new-owner/demo-runway.git`.

The script changes `SESSION_DOMAIN`, `SESSION_REPOSITORY_URL`, and the three
placeholder route patterns only in the scratch context. T-007-02-02 asserts the
two configuration-category seams. Route replacement is needed only to avoid
leaving the predecessor placeholder and is not evidence of a live domain
transfer.

The App D1 ID remains absent. That is T-007-02-03's resource seam and prevents a
false claim that this context is directly deployable before resource creation.

## Verification design

### Inventory completeness

Parse comment-stripped JSONC and compare `secrets.required` arrays to the exact
expected App and Sessions sets. Separately assert the two CI expressions remain
present in `.github/workflows/deploy.yml` so the generated new-owner values have
defined destinations.

### Contract validity

Import and call production `parseRuntimeSecrets` and `parseAccessConfig` with
the generated values. Use production `guardPasscode` with matching and wrong
headers to demonstrate that the generated passcode controls the gate.

### Provenance and leak boundary

Assert the predecessor-forbidden paths are absent. Scan the runtime path for
known author coupling markers. Scan the scratch runtime, source repository
`dist`, and captured evidence for every exact generated value. The temporary
secret file itself is intentionally excluded and then deleted.

### Operational path

Run the existing integration runner with the generated signing key. This runner
builds, starts an isolated local Wrangler surface, and invokes `ops:check`, the
healthy Playwright flow, and `leak:check`. Preserve its redacted report/output as
evidence.

### Remote installation

Document, but do not execute, interactive/stdin commands for all six Worker
bindings and `gh secret set` for both CI inputs. A live operator must also list
binding names and run checks against the new deployment. This run records those
two external stores as `deferred-live: missing new-owner authority`.

## Failure semantics

- **pass:** local rehearsal generated all eight, config is off author defaults,
  contracts and checks pass, and all exact-value scans are clean.
- **gap:** an attempted local step fails; the report names the secret/config/check
  seam and exits non-zero.
- **deferred-live:** remote store was not attempted because no new-owner auth or
  target exists; command/store is named.
- A remote command that is attempted and fails becomes `gap`, never `deferred`.

## Skill-driven constraints

The Cloudflare/Wrangler guidance reinforces three choices:

- use the installed Wrangler 4 CLI and explicit `--config` paths;
- use interactive or stdin/file secret input, never command arguments;
- use `secret list --format json` for name-only verification and dry/local
  checks when remote authority is unavailable.

No product configuration schema changes are planned, so generated Worker types
do not need updating.
