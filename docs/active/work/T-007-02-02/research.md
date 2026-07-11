# Research — T-007-02-02 rotate-secrets-and-config

Descriptive map of the configuration and secret-rotation surface for the
fresh-owner drill. This phase records what exists and how it connects; it does
not choose an implementation.

## Ticket boundary

The ticket starts in `phase: research` and has one acceptance criterion with
four observable requirements:

1. a rotation run occurs;
2. every secret is replaced by a new-owner-controlled value;
3. committed configuration is moved off author defaults;
4. an ops/leak check proves zero author-controlled secret reaches deployment,
   with any non-rotatable secret recorded as a named gap.

The story explicitly limits this slice to a drill. It permits drill scripts but
does not permit rewriting product runtime code. It also states that the drill
attempts and observes transfer categories rather than building general-purpose
secret-rotation automation.

## Dependency contract

T-007-02-01 is complete and supplies the starting context:

- `scrub-fresh-owner.sh` creates a tree from `git archive HEAD`;
- Git-untracked `.dev.vars`, `.git`, `.promote`, and `.wrangler` never enter it;
- `docs/active/**` is removed from the scratch tree;
- the account-bound D1 UUID is removed;
- author route, session domain, and repository values become loud new-owner
  placeholders;
- `transfer-signal.md` defines `pass`, `gap`, and `deferred` outcomes.

The harness is a scrubbed local simulation. It does not authenticate to a second
Cloudflare account or mutate a live secret store. Its clean-tree property means
the rotation run begins without any author secret value available to copy.

## Secret inventory

The upstream transfer inventory names eight ownership seams. Six are Worker
bindings; two are CI deployment credentials.

| Store / config | Name | Consumer | Runtime role |
| --- | --- | --- | --- |
| App Worker | `DEMO_SIGNING_KEY` | `src/pages/api/receipt.ts` | Signs the receipt returned by `/api/receipt`. |
| App Worker | `DEMO_PASSCODE` | backstage entry/feed routes via `src/lib/passcode.ts` | Gates backstage reads and writes. |
| Sessions Worker | `SESSION_RUNTIME_SECRETS` | `src/session-worker.ts` via `parseRuntimeSecrets` | JSON map injected only into container processes. |
| Sessions Worker | `SESSION_ACCESS_TEAM_DOMAIN` | `src/lib/session-access.ts` | Expected Cloudflare Access issuer origin. |
| Sessions Worker | `SESSION_ACCESS_PREVIEW_AUD` | `src/lib/session-access.ts` | Preview Access audience. |
| Sessions Worker | `SESSION_ACCESS_EDITOR_AUD` | `src/lib/session-access.ts` | Editor Access audience; must differ from preview. |
| GitHub Actions | `CLOUDFLARE_API_TOKEN` | `.github/workflows/deploy.yml` / Wrangler | Authorizes CI deployment and D1 migration. |
| GitHub Actions | `CLOUDFLARE_ACCOUNT_ID` | `.github/workflows/deploy.yml` / Wrangler | Selects the deployment account. |

No secret value is committed. `wrangler.jsonc:secrets.required` declares the two
App bindings. `wrangler.sessions.jsonc:secrets.required` declares the four
Sessions bindings. GitHub Actions expressions resolve the two CI values from
the repository secret store. Generated Worker types reproduce the same six
runtime-binding names.

`.dev.vars.example` documents only the two App values. Real `.dev.vars` is
gitignored. Session documentation describes setting its four values with
Wrangler and allows `SESSION_RUNTIME_SECRETS` to be `{}` when the demo has no API
credentials.

## Secret value constraints

`DEMO_SIGNING_KEY` is consumed as key material and must be non-empty.
`DEMO_PASSCODE` is compared server-side; blank or absent configuration fails
closed.

`SESSION_RUNTIME_SECRETS` is parsed as a JSON object. It accepts at most 32
uppercase environment names, string values between 8 bytes and 4 KiB, and an
aggregate of at most 16 KiB. It rejects process-loader names, core shell names,
and the Worker's own `SESSION_*` configuration names. The parser emits fixed
errors without echoing source values.

`SESSION_ACCESS_TEAM_DOMAIN` must be a canonical HTTPS
`*.cloudflareaccess.com` origin. Preview/editor audiences use the Access audience
format enforced by `src/lib/session-access.ts`, and the two audience values must
be distinct. These identifiers are configured as secrets even though their
confidentiality is weaker than an API token; they remain account-specific
runtime inputs and are part of the required rotation set.

The Cloudflare API token and account ID are not application bindings. They are
deployment authority held by GitHub Actions or the operator environment. They
must not be placed in `.dev.vars`, Wrangler `vars`, the Worker image, or an
artifact.

## Configuration inventory

Upstream research found two committed author-specific non-secret values:

- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN = b28.dev`;
- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` points to
  `github.com/johnhkchen/boilerplate-demo.git`.

The same configs also contain author resource/domain values owned primarily by
parallel ticket T-007-02-03:

- App and Sessions custom-domain routes under `b28.dev`;
- the App D1 `database_id`.

T-007-02-01 scrubs all of these in the scratch context. For this ticket's
configuration category, the fixed pass signal is specifically that
`SESSION_DOMAIN` and `SESSION_REPOSITORY_URL` no longer carry author values.
T-007-02-03 owns provisioning a real route, repository, and resource IDs.

Other non-secret values (`SESSION_SLUG`, `DEMO_FAULT`, Worker names,
compatibility date/flags, bindings, migrations, observability) are reproducible
project contracts, not author defaults.

## Existing checks

`npm run leak:check` examines the built bundle and `/api/receipt` response for
the exact supplied `DEMO_SIGNING_KEY`. It exits 0 only when both surfaces are
clean, 1 when a leak is found, and 2 when evidence/config is unavailable.

`npm run ops:check` calls `/api/receipt`, checks its bounded operation trace, and
verifies the signature when the signing key is supplied. It accepts
`DEMO_BASE_URL` or `OPS_CHECK_URL`, so it can target local or deployed surfaces.

`npm run integration:check` creates a disposable Wrangler config and signing
key, builds once, starts a local server, and runs operation, flow, and disclosure
checks. It exercises `DEMO_SIGNING_KEY` but not the complete six-binding secret
inventory.

The backstage Playwright project supplies deterministic test values for both
App secrets and proves correct/wrong passcode behavior. Unit tests cover the
session runtime-secret parser and Access config parser. There is no existing
single command that inventories all eight names, issues fresh values, checks
configuration markers, and emits a redacted rotation verdict.

## Wrangler surfaces

The installed CLI is Wrangler 4.110.0. Its current help confirms:

- `wrangler secret put <key> --config <path>` creates or updates one binding;
- the secret value can arrive on standard input and need not be an argument;
- `wrangler secret list --config <path> --format json` lists names without
  returning values;
- `wrangler deploy --dry-run --config <path>` compiles without uploading;
- live account selection may come from `CLOUDFLARE_ACCOUNT_ID`, an API token, or
  an authenticated profile.

Deploy help also states that deploys preserve secrets unless explicitly
changed. A code/config deploy is therefore not itself a rotation; all required
names must be deliberately updated in the new-owner store.

## Security and evidence boundaries

A rotation artifact cannot prove inequality with unknown author values by
reading those values without violating the clean-owner boundary. The available
strong proof is provenance:

1. start from a tree that contains no author secret store;
2. generate or obtain all replacement values inside the new-owner context;
3. install every declared name into only new-owner stores;
4. compare binding-name inventories, not values;
5. scan runtime inputs and evidence for forbidden author markers and exact
   generated values;
6. run functional/leak checks with the generated App key/passcode.

Evidence must never record raw secrets, shell traces containing them, `.dev.vars`
contents, API responses that echo them, or environment dumps. Fingerprints can
show that distinct generated inputs existed without making them recoverable.

## Environment observed for this run

The working tree contains Lisa frontmatter updates and other tickets' untracked
work artifacts. They are unrelated and must be preserved. No live new-owner
Cloudflare/GitHub credentials or target account/zone/repository are supplied to
this session. A safe in-scope run can therefore exercise the scrubbed local
simulation and produce a live-command manifest, but cannot truthfully claim that
Cloudflare or GitHub stores were mutated.

The installed dependencies permit local tests, build, Wrangler dry-run, and
pure parsing checks. A real second-account rotation remains a metered leg whose
absence must be labeled `deferred`, not silently upgraded to `pass`.

## Constraints carried into Design

- Do not edit ticket phase/status fields.
- Do not read or print existing local/remote secret values.
- Do not use the author's authenticated account as a substitute new owner.
- Do not mutate Cloudflare, GitHub, DNS, D1, or Durable Object state without
  explicit new-owner credentials and targets.
- Cover all six Worker bindings plus both CI deployment inputs.
- Treat arbitrary API keys inside `SESSION_RUNTIME_SECRETS` as part of the
  rotation, including an explicit empty-map case.
- Move the two configuration seams off author defaults in the drill context.
- Use non-echoing/file/stdin secret input for any documented Wrangler command.
- Redact exact values from all durable evidence.
- Preserve the story's boundary: drill artifacts may change; product runtime
  code does not.
- Record every unexecuted live store as a named `deferred` seam and every
  attempted failure as a named `gap`.
