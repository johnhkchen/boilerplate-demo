# New-owner secret and configuration rotation run

Performed for T-007-02-02 on 2026-07-11 (America/Los_Angeles). This is the
re-runnable handoff procedure and the honest result of this environment's run.

## Headline result

**Local fresh-owner rehearsal: PASS.** All eight secret seams received distinct
new-owner-generated values in a disposable private store; the nested session API
key, Access configuration, signing boundary, and passcode gate accepted them.
The two committed session config seams and all route placeholders were moved off
author defaults in the scratch context. Existing ops, healthy browser-flow, and
leak commands passed against the generated App key. An exact-value scan found
none of the eight values or nested API key in runtime files, build output, or
evidence.

**Live Cloudflare/GitHub installation: DEFERRED-LIVE.** No genuine second-owner
Cloudflare account or GitHub repository authority was supplied. No remote store
was read or changed. The exact stores and commands are below. This state is not
reported as `pass` and is not hidden as a successful deployment.

**Non-rotatable gaps: none found.** Every inventoried value has a replacement
seam. The remaining work is authority-dependent installation, not an immutable
author coupling.

## Run it again

From the repository root:

```sh
docs/active/work/T-007-02-02/rotate-fresh-owner.sh
```

Optional explicit simulation/new-owner configuration:

```sh
docs/active/work/T-007-02-02/rotate-fresh-owner.sh \
  --context /tmp/demo-runway-new-owner-context \
  --owner-zone new-owner.example \
  --repository-url https://github.com/new-owner/demo-runway.git
```

`new-owner.example` is reserved and intentionally unroutable. Use the real
new-owner zone/repository for a live rehearsal. The command still performs no
remote mutation; it prepares and verifies the clean context.

Exit codes: `0` local rotation and checks passed; `1` an attempted seam failed;
`2` invocation/environment error.

## What the script guarantees

1. Calls T-007-02-01's harness, which creates the context using `git archive`.
2. Confirms `.git`, `.dev.vars`, `.promote`, and `.wrangler` are absent before
   secret creation.
3. Replaces only scratch-context owner placeholders.
4. Creates a mode-0600 secret file under a private `mktemp` directory.
5. Generates eight independent values; it never prints them.
6. Runs build/dev/check processes under an allowlisted environment rather than
   inheriting operator Cloudflare/GitHub variables.
7. Uses production runtime-secret, Access, and passcode parsers.
8. Runs a clean build, then starts the App using a private external Wrangler
   config holding the generated App values.
9. Runs the existing `ops:check`, healthy Playwright flow, and `leak:check`.
10. Scans scratch runtime, scratch `dist`, and evidence for every exact value,
    including the API key nested inside `SESSION_RUNTIME_SECRETS`.
11. Stops the server, deletes local Wrangler state, and trap-deletes the private
    secret/config directory on success or failure.

The source working tree and every external store remain unchanged.

## Complete rotation inventory

| Name | Destination | Rehearsal result | Live state |
| --- | --- | --- | --- |
| `DEMO_SIGNING_KEY` | App Worker | generated, receipt signature verified, leak clean | deferred-live |
| `DEMO_PASSCODE` | App Worker | generated, accepted; wrong value rejected 403 | deferred-live |
| `SESSION_RUNTIME_SECRETS` | Sessions Worker | generated JSON parsed; includes `NEW_OWNER_DEMO_API_KEY` | deferred-live |
| `SESSION_ACCESS_TEAM_DOMAIN` | Sessions Worker | fresh simulation origin accepted by production parser | deferred-live |
| `SESSION_ACCESS_PREVIEW_AUD` | Sessions Worker | generated and accepted | deferred-live |
| `SESSION_ACCESS_EDITOR_AUD` | Sessions Worker | generated, distinct, and accepted | deferred-live |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions | generated simulated value; workflow destination present | deferred-live |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions | generated simulated value; workflow destination present | deferred-live |

Short SHA-256 fingerprints proving distinct generation are in
`evidence/rotation-report.json`. They are evidence identifiers, not values.

## Configuration result

The performed scratch run used:

- `SESSION_DOMAIN = new-owner.example`;
- `SESSION_REPOSITORY_URL = https://github.com/new-owner/demo-runway.git`;
- routes `demo.new-owner.example`, `demo-session.new-owner.example`, and
  `code-session.new-owner.example`.

The verifier found zero active author markers and zero leftover
`NEW-OWNER-ZONE.example` / `NEW-OWNER/REPO` placeholders. This proves config
replacement, not domain ownership. T-007-02-03 owns the real new-owner zone,
repository, D1 ID, Worker resources, and data transfer.

## Performed evidence

- `evidence/rotation-report.json`: all eight names, stores, distinct
  fingerprints, parser outcomes, empty gap list, and deferred-live stores.
- `evidence/integration-report.json`: clean-build check summary — operation,
  healthy flow, and leak all passed.
- `evidence/rotation-run.txt`: redacted transcript; no environment dump.
- `evidence/author-marker-scan.txt`: six active author couplings absent.
- `evidence/exact-secret-scan.txt`: all eight exact values plus the nested API
  key clean across runtime/build/evidence.

The completed run was repeated after environment isolation was added; both final
runs exited zero and cleaned their private store/server.

## Why this proves no author secret participated

The proof is provenance, not comparison with author values:

- the fresh tree is committed content only, so local author secrets are absent;
- the check environment is rebuilt from an allowlist and carries no ambient
  Cloudflare/GitHub variables;
- values are generated after that boundary is established;
- only those generated App values enter the private local runtime config;
- exact generated values do not appear in the output tree/evidence;
- no author secret is read, so none can be copied into the new-owner path.

This is stronger and safer than attempting to retrieve current remote values for
inequality comparison.

## Live installation under the real new owner

Run this section only from a shell authenticated to the real new-owner accounts,
after T-007-02-03 has filled real config/resource IDs. Do not use the author's
account as a substitute.

### 1. Confirm authority and target

```sh
npx wrangler whoami --json
gh auth status
git remote -v
```

Verify the displayed Cloudflare account and GitHub repository are owned by the
recipient. Stop if either resolves to the author.

### 2. Install App Worker values interactively

Wrangler 4.110.0 prompts without echoing the value:

```sh
npx wrangler secret put DEMO_SIGNING_KEY --config wrangler.jsonc
npx wrangler secret put DEMO_PASSCODE --config wrangler.jsonc
```

Generate new values in the recipient's secret manager. Do not reuse this drill's
disposed simulation values, the author's `.dev.vars`, examples, tests, chat, or
artifacts.

### 3. Install Sessions Worker values interactively

```sh
npx wrangler secret put SESSION_RUNTIME_SECRETS --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_TEAM_DOMAIN --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_PREVIEW_AUD --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_EDITOR_AUD --config wrangler.sessions.jsonc
```

`SESSION_RUNTIME_SECRETS` must be a JSON object. Rotate every provider/API key
inside it; `{}` is valid only when the session truly needs no runtime credential.
Copy the Access team origin and two distinct audience tags from applications in
the new owner's Access account, not the author's.

For non-interactive automation, redirect a mode-0600 file to each command. Never
put values in arguments or use `echo`:

```sh
npx wrangler secret put DEMO_SIGNING_KEY --config wrangler.jsonc < /secure/path/signing-key
```

Delete the input file according to the recipient's secret-manager policy.

### 4. Install CI deployment authority

Target the new-owner repository explicitly. With no `--body`, GitHub CLI prompts
for the value; redirected mode-0600 files are also supported.

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo NEW_OWNER/REPO
gh secret set CLOUDFLARE_ACCOUNT_ID --repo NEW_OWNER/REPO
```

The token should be new-owner-created and least-privilege for this project's
Workers/D1 release path. The account ID must identify the same account confirmed
by `wrangler whoami`.

### 5. Verify names without retrieving values

```sh
npx wrangler secret list --config wrangler.jsonc --format json
npx wrangler secret list --config wrangler.sessions.jsonc --format json
gh secret list --repo NEW_OWNER/REPO --app actions
```

Expected App names: `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`.

Expected Sessions names: `SESSION_RUNTIME_SECRETS`,
`SESSION_ACCESS_TEAM_DOMAIN`, `SESSION_ACCESS_PREVIEW_AUD`,
`SESSION_ACCESS_EDITOR_AUD`.

Expected GitHub names: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

These commands prove presence/name only. The functional checks prove usability.

### 6. Verify the new-owner deployment

After T-007-02-03 deploys resources/routes, point checks at the real URL:

```sh
export DEMO_SIGNING_KEY="$(</secure/path/signing-key)"
DEMO_BASE_URL=https://demo.NEW_OWNER_ZONE npm run ops:check
DEMO_BASE_URL=https://demo.NEW_OWNER_ZONE npm run leak:check
unset DEMO_SIGNING_KEY
```

The value is loaded into a short-lived environment variable without printing it
and unset immediately after both commands. T-007-02-04 owns this deployed
verification and its Playwright/backstage legs.

## Gap ledger

| Seam | State | Detail |
| --- | --- | --- |
| All six Worker bindings | `deferred-live` | No genuine new-owner Cloudflare authority supplied. |
| Two GitHub Actions inputs | `deferred-live` | No genuine new-owner repository authority supplied. |
| Non-rotatable secrets | none | All eight names expose a replacement seam; production parsers accepted generated replacements. |

If a live command is attempted and fails, change that named seam to `gap` and
record the exact command/store/error class. Do not retain `deferred-live` after
an attempted red.

## Operational concern discovered

A superseded first attempt ran the build from the developer source root. Astro
loaded root `.dev.vars` and emitted `dist/server/.dev.vars`; when the generated
key was supplied via process env in the clean context, the existing leak check
correctly named that file as a leak. The final procedure avoids the seam by
building in the `.dev.vars`-free context with no application secret in build env,
then supplying secrets only to the private runtime config.

This is an important operator rule: do not package/deploy from a tree containing
the prior owner's `.dev.vars`. Always use the clean archive/new-owner context.
The source-root generated `dist` from the superseded attempt was removed.
