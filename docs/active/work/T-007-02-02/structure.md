# Structure — T-007-02-02 rotate-secrets-and-config

## Change boundary

All created files live under `docs/active/work/T-007-02-02/`. No product runtime,
Wrangler source config, package script, workflow, test, ticket frontmatter, or
external secret store is modified.

| File | Action | Responsibility |
| --- | --- | --- |
| `research.md` | create | Codebase/secret/config/check map. |
| `design.md` | create | Options, decision, security boundary. |
| `structure.md` | create | File and interface blueprint. |
| `plan.md` | create | Ordered implementation/test sequence. |
| `rotate-fresh-owner.sh` | create | Disposable rotation-rehearsal orchestrator. |
| `verify-rotation.ts` | create | Inventory/config/parser/passcode/leak assertions and redacted JSON result. |
| `rotation-run.md` | create | Operator-facing procedure, performed result, live command appendix. |
| `evidence/rotation-report.json` | create | Machine-readable redacted verifier result. |
| `evidence/integration-report.json` | create | Existing integration check's normalized report. |
| `evidence/rotation-run.txt` | create | Redacted command/run transcript. |
| `evidence/author-marker-scan.txt` | create | Named zero-hit runtime coupling scan. |
| `evidence/exact-secret-scan.txt` | create | Name-only exact-value scan outcomes. |
| `progress.md` | create | Implementation log, deviations, commits/checks. |
| `review.md` | create | Final change/test/open-concern handoff. |

The generated fresh-owner context and raw secret store remain outside the
repository under `/tmp` (or caller-selected paths). They are disposable run
state, not deliverables.

## Component boundary

```text
T-007-02-01 scrub harness
  -> disposable fresh-owner context
      -> rotate-fresh-owner.sh
          -> substitute new-owner config in scratch only
          -> private random secret JSON (0600, trap-cleaned)
          -> verify-rotation.ts
              -> config/inventory checks
              -> production parser checks
              -> passcode gate check
              -> author-marker + exact-secret scans
              -> redacted rotation-report.json
          -> existing npm run integration:check
              -> build + local server
              -> ops check + browser flow + leak check
          -> post-build exact-secret scan
          -> redacted evidence files
```

No secret flows from the source repository into the temporary store. The flow is
one-way from freshly generated values to short-lived process environment and
local verification.

## `rotate-fresh-owner.sh`

### Public interface

```sh
docs/active/work/T-007-02-02/rotate-fresh-owner.sh \
  [--context DIR] \
  [--owner-zone DOMAIN] \
  [--repository-url HTTPS_GITHUB_URL] \
  [--evidence-dir DIR]
```

Defaults:

- context: `${TMPDIR:-/tmp}/demo-runway-new-owner-context`;
- zone: `new-owner.example`;
- repository URL: `https://github.com/new-owner/demo-runway.git`;
- evidence: this ticket's `evidence/` directory.

Exit codes:

- `0`: local rotation rehearsal passed; live stores may remain explicitly
  deferred;
- `1`: an attempted rotation/config/check seam failed;
- `2`: invocation or environment error.

### Preconditions

- invoked from repository root;
- Node/npm and the installed dependency tree available;
- predecessor harness file present and executable/readable;
- no use of shell xtrace;
- owner zone is a hostname without scheme/path;
- repository URL is credential-free HTTPS GitHub URL;
- evidence directory resolves inside this ticket by default.

### Orchestration stages

1. Parse and validate arguments.
2. Recreate the fresh-owner context with the predecessor harness.
3. Replace only known `NEW-OWNER-ZONE.example` and `NEW-OWNER/REPO` placeholders.
4. Create private temp directory and install cleanup trap.
5. Generate a JSON object with all eight named values.
6. Export values only for the verifier/integration child processes.
7. Run `verify-rotation.ts`; write its stdout JSON directly to the report.
8. Run existing integration check with the fresh signing key; capture a
   redacted transcript and copy its report.
9. Run the verifier's post-build scan mode over `dist` and evidence.
10. Delete temporary secret state and print the state summary.

The orchestrator never runs `wrangler secret put`, `gh secret set`, `deploy`, or
any other remote mutation. Those are manual commands documented in
`rotation-run.md` and require a conscious new-owner shell.

## `verify-rotation.ts`

### Inputs

Non-secret arguments:

```text
--context <absolute scratch path>
--repo-root <absolute source root>
--report-mode <initial|post-build>
```

Secret inputs arrive only through environment variables with the eight
inventory names. `SESSION_RUNTIME_SECRETS` remains a serialized JSON object.

### Expected constants

```ts
APP_BINDINGS = ['DEMO_PASSCODE', 'DEMO_SIGNING_KEY']
SESSION_BINDINGS = [
  'SESSION_ACCESS_EDITOR_AUD',
  'SESSION_ACCESS_PREVIEW_AUD',
  'SESSION_ACCESS_TEAM_DOMAIN',
  'SESSION_RUNTIME_SECRETS',
]
CI_BINDINGS = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN']
AUTHOR_MARKERS = [
  account-bound D1 UUID,
  three active b28.dev route strings,
  author SESSION_DOMAIN line,
  author GitHub clone URL,
]
```

Arrays are sorted before comparison and emission so reports are deterministic
except for fingerprints/timestamps.

### JSONC handling

Wrangler JSONC contains line comments but no URL values should be damaged by a
naive `//` regex. The verifier uses a small character-state comment stripper
that respects JSON string/escape state, then `JSON.parse`. It does not introduce
a new package dependency.

### Assertions

- scratch context has no `.git`, `.dev.vars`, `.promote`, `.wrangler`;
- App/Session `secrets.required` exactly match expected inventories;
- workflow contains both GitHub secret references;
- session domain/repository equal the selected new-owner values and contain no
  author marker/placeholder;
- custom-domain patterns contain no active author marker/placeholder;
- `parseRuntimeSecrets` accepts the map and it contains
  `NEW_OWNER_DEMO_API_KEY`;
- `parseAccessConfig` accepts the three Access inputs and audience values differ;
- `guardPasscode` permits the exact generated value and rejects a wrong value;
- each of eight required environment inputs exists;
- fingerprints are pairwise distinct (except no intentional sharing exists);
- runtime path has zero active author-marker hits;
- runtime/build/evidence path has zero exact-secret hits outside the temporary
  store and current report process.

### Output

Initial mode prints one JSON document:

```json
{
  "ticket": "T-007-02-02",
  "outcome": "passed",
  "configuration": { "outcome": "passed", "seams": [] },
  "secrets": [
    {
      "name": "DEMO_PASSCODE",
      "store": "app-worker",
      "fingerprint": "sha256:0123456789ab",
      "contract": "passed",
      "installation": "simulated"
    }
  ],
  "authorSecretProvenance": "absent-from-clean-source",
  "exactValueScan": { "outcome": "passed", "findings": [] },
  "liveStores": [
    { "store": "cloudflare-workers", "state": "deferred-live", "reason": "..." },
    { "store": "github-actions", "state": "deferred-live", "reason": "..." }
  ],
  "nonRotatableGaps": []
}
```

Errors go to stderr and contain only the seam/name, never a value. Failed reports
name findings by path and secret name.

Post-build mode prints a compact name-only scan result for all values over
`dist` and the evidence directory. It must avoid scanning its own environment or
temporary store.

## Evidence boundaries

`rotation-run.txt` is created by redirecting only known-redacted output. The
integration runner already replaces the signing key with `[REDACTED]`. Before
accepting any artifact, the post-build verifier scans the complete evidence
directory for all eight exact values.

`rotation-report.json` fingerprints use the first 12 hexadecimal characters of
SHA-256. They are sufficient to show the generated values are distinct while
not acting as replayable credentials. No report records secret length.

`author-marker-scan.txt` lists each active marker label with `absent`; it does not
dump arbitrary matching context. Allowed narrative/brand residue remains outside
the active marker set defined by the predecessor.

## `rotation-run.md`

Sections:

1. scope and honest local/live boundary;
2. exact eight-name inventory;
3. one-command local rehearsal;
4. performed run result and evidence links;
5. non-secret configuration result;
6. ops/leak/passcode/session contract results;
7. leak/provenance argument;
8. live new-owner command sequence using secure stdin/interactive prompts;
9. remote name-only verification commands;
10. `pass`/`gap`/`deferred-live` table;
11. non-rotatable gap ledger.

The live appendix uses placeholders for filenames/variables but never sample
secret values. It requires `wrangler whoami` confirmation and explicit configs.

## Test boundary

No general test file is added to `test/` because the implementation is a ticket
drill artifact. The performed script is self-testing. Existing production unit
tests remain the independent backstop for parsers/passcode/leak logic.

Verification commands:

- `bash -n rotate-fresh-owner.sh`;
- run the script end to end;
- run it a second time to confirm disposable/idempotent behavior;
- `npm test` for regression coverage;
- `npm run typecheck` and `npm run deploy:dry` if the full integration runner
  has not already covered build/dry behavior;
- inspect `git diff --check` and scoped status.

## Commit grouping

1. Research/Design/Structure/Plan artifacts.
2. Rotation script and verifier.
3. Performed redacted evidence and rotation procedure.
4. Progress/Review updates after final verification.

Only ticket-scoped paths are staged in every commit so unrelated Lisa/parallel
work remains untouched.
