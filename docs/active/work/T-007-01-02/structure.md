# Structure — T-007-01-02 flag-author-couplings

## Change inventory

| Path | Action | Responsibility |
| ---- | ------ | -------------- |
| `docs/active/work/T-007-01-01/transfer-surface-inventory.md` | modify | Replace seven reserved coupling placeholders with cited verdict blocks; update artifact framing and final checklist. |
| `docs/active/work/T-007-01-02/research.md` | create | Record the observed account/zone/repo/secret/check evidence. |
| `docs/active/work/T-007-01-02/design.md` | create | Evaluate presentation options and define verdict semantics. |
| `docs/active/work/T-007-01-02/structure.md` | create | Define this file-level blueprint. |
| `docs/active/work/T-007-01-02/plan.md` | create | Sequence edits and verification. |
| `docs/active/work/T-007-01-02/progress.md` | create during Implement | Track execution, validation, and deviations. |
| `docs/active/work/T-007-01-02/review.md` | create during Review | Handoff summary, coverage, and open concerns. |

No runtime, config, test, workflow, ticket, or secret-store file is modified.

## Inventory framing changes

The opening `Honest boundary` paragraph currently says the coupling work will happen
in the sibling ticket and that every category reserves a pending slot. Replace it with
a completed-analysis statement:

- this remains a map and does not transfer anything;
- T-007-01-02 now flags the exact coupling for every category;
- `portable` means no author account/zone/central-service dependency was found.

The closing checklist currently says every section carries `_pending_`. Replace that
line with a coupling coverage summary listing six coupled categories and one portable
category. This keeps the beginning and end consistent with the section bodies.

## Coupling block interface

Each numbered category keeps its current title, transfer definition, and seam table.
Only the placeholder immediately below the table changes.

Use this common structure:

```markdown
**Author coupling (T-007-01-02) — coupled.** `file:key` proves the exact seam.
An unchanged handoff fails because ... . Portable/rotatable qualification, if needed.
```

For a portable category:

```markdown
**Author coupling (T-007-01-02) — portable.** `file → symbol` and `file:key`
prove the check is local/parameterized. No author account, zone, or central service is
required ... .
```

The bold prefix is the stable skim/grep interface. The evidence and failure statement
remain prose because categories have different numbers and kinds of seams.

## Section 1 — Repo block

### Citations

- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`
- `src/lib/session-lifecycle.ts → buildProvisionCommand`
- `src/session-worker.ts → provisionWorkspace`

### Content boundary

State that the committed URL belongs to the author's GitHub namespace and is fetched
for each provisioned session. Qualify that Git and `.github/workflows/deploy.yml` are
portable mechanisms; only the configured source identity is coupled.

Do not rely solely on `git remote origin`, because local Git configuration is not a
portable repository artifact. It may remain in the seam table as observed provenance,
but the verdict must cite the committed runtime config.

## Section 2 — Cloudflare resources block

### Citations

- `wrangler.jsonc:d1_databases[0].database_id`
- `.github/workflows/deploy.yml` → `CLOUDFLARE_ACCOUNT_ID`

### Content boundary

Name the concrete D1 UUID and state that the config comment identifies it as
account-bound. Explain that CI selects the account with an out-of-band repository
secret. The Worker/DO/container declarations can be recreated, but their active
instances and the referenced D1 database live in that selected account.

Do not expose or speculate about the actual account ID value.

## Section 3 — Domain block

### Citations

- `wrangler.jsonc:routes`
- `wrangler.sessions.jsonc:routes`
- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN`
- optionally `src/lib/session-lifecycle.ts → sessionUrls` / `classifyProxyHost`

### Content boundary

Name all three custom-domain hosts and `b28.dev`. Explain both failure planes:
Cloudflare route attachment requires zone control, and runtime host derivation expects
the committed domain.

Keep the `workers_dev` qualification in the seam table; it is not sufficient to mark
the category portable because the primary branded surface remains coupled.

## Section 4 — Data block

### Citations

- `src/lib/backstage-store.ts → saveEntry` / `listEntries`
- `wrangler.jsonc:d1_databases[0].database_id`
- `wrangler.sessions.jsonc:durable_objects.bindings` → `SESSION_COORDINATOR`
- `src/session-worker.ts → SessionCoordinator`

### Content boundary

Separate portable schema/code from existing account-resident contents. State that a
fresh deploy creates equivalent stores but does not move D1 rows or Durable Object
state. Do not claim the transient preservation patch is server-persisted.

## Section 5 — Configuration block

### Citations

- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN`
- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`

### Content boundary

Identify the two committed author-specific values. Qualify the other settings and
binding contracts as reproducible project configuration. Avoid duplicating a full
domain/repo explanation; cross-category repetition should be limited to the exact
reason this category is not portable as currently committed.

## Section 6 — Secrets block

### Citations

- `.github/workflows/deploy.yml` → `secrets.CLOUDFLARE_API_TOKEN`
- `.github/workflows/deploy.yml` → `secrets.CLOUDFLARE_ACCOUNT_ID`
- `wrangler.jsonc:secrets.required`
- `wrangler.sessions.jsonc:secrets.required`
- `.dev.vars.example` and gitignored `.dev.vars`

### Content boundary

Label the category `coupled, fully rotatable`. State that the current values live in
the author's GitHub/Cloudflare/local stores and are not transferred with Git. Explicitly
state that no committed or non-rotatable secret was found. The Access team domain and
audience values are account-specific even though they use Worker secret bindings.

Never include a secret value.

## Section 7 — Checks block

### Citations

- `scripts/integration-check.ts → resolveConfig` / temporary config
- `playwright.config.ts` → `PLAYWRIGHT_BASE_URL` / `LOCAL_BASE_URL`
- `scripts/ops-check.ts` → `DEMO_BASE_URL` / `OPS_CHECK_URL`
- `package.json:scripts.verify`

### Content boundary

Use verdict `portable`. State that default execution is local and deployed targets are
caller-supplied. Confirm no fleet/central-service call or required author zone appears
in the check path. Note that config-contract fixtures containing `b28.dev` must change
when the config changes, but do not transform that maintenance fact into an author
service dependency.

## Artifact boundaries

Research, Design, Structure, and Plan describe evidence and intent. `progress.md`
records what was actually edited and which validation commands ran. `review.md`
summarizes the final diff, acceptance coverage, test scope, and unresolved limitations.

The ticket frontmatter remains untouched because Lisa owns phase/status transitions.

## Ordering constraints

1. Write the four pre-implementation artifacts before editing the inventory.
2. Update opening framing before section verdicts so the document never describes
   finished work as pending in the final diff.
3. Replace all seven placeholders in one logical inventory edit.
4. Update the closing coverage statement.
5. Run structural greps and citation existence checks.
6. Inspect the diff for unrelated changes and frontmatter modifications.
7. Write `progress.md`, then `review.md` after verification.

## No-deletion guarantee

No file is deleted. Existing inventory tables and category mappings remain intact.
The only removal is placeholder/framing prose made obsolete by this ticket's completed
analysis.
