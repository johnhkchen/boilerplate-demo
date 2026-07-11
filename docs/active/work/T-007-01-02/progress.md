# Progress — T-007-01-02 flag-author-couplings

## Status

Implementation complete. Review remains.

The transfer inventory now contains a completed, cited author-coupling verdict for
all seven categories. No runtime/configuration behavior or external state changed.

## Completed steps

### 1. Inventory framing

Updated `docs/active/work/T-007-01-01/transfer-surface-inventory.md` so the opening
boundary describes completed T-007-01-02 analysis instead of reserved `_pending_`
slots. Added the audit meaning of `portable`: no dependency on the author's account,
zone, or central services.

### 2. Repo verdict

Marked **coupled**.

Evidence recorded:

- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` hardcodes the author's GitHub
  repository URL.
- `src/lib/session-lifecycle.ts → buildProvisionCommand` inserts that URL into the
  session fetch path.
- `src/session-worker.ts → provisionWorkspace` executes the command.

The verdict distinguishes the coupled repository identity from portable Git and CI
mechanisms.

### 3. Cloudflare resources verdict

Marked **coupled**.

Evidence recorded:

- `wrangler.jsonc:d1_databases[0].database_id` contains the concrete account-bound D1
  UUID.
- `.github/workflows/deploy.yml → secrets.CLOUDFLARE_ACCOUNT_ID` selects the account
  for remote migrations and promotion.

No account ID or credential value was disclosed.

### 4. Domain verdict

Marked **coupled**.

Evidence recorded:

- `wrangler.jsonc:routes` owns `demo.b28.dev`.
- `wrangler.sessions.jsonc:routes` owns `demo-session.b28.dev` and
  `code-session.b28.dev`.
- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` and
  `src/lib/session-lifecycle.ts → sessionUrls` / `classifyProxyHost` carry the zone
  into runtime host behavior.

### 5. Data verdict

Marked **coupled**.

Evidence recorded:

- D1 backstage rows are reached through `BACKSTAGE_DB` and the account-bound
  `database_id`.
- desired session state lives behind the `SESSION_COORDINATOR` Durable Object binding
  and `src/session-worker.ts → SessionCoordinator`.

The verdict states that recreating schema/classes does not transfer existing contents
and preserves the inventory's accurate description of the transient patch.

### 6. Configuration verdict

Marked **coupled**.

Evidence recorded:

- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` commits the author's zone.
- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` commits the author's repo.

The block qualifies all other named configuration contracts as reproducible.

### 7. Secrets verdict

Marked **coupled, fully rotatable**.

Evidence recorded:

- Cloudflare deployment authority is consumed from GitHub Actions secrets.
- App and Session secret names are declared by both Wrangler configs.
- `.dev.vars.example` documents the local replacement seam while real `.dev.vars`
  remains gitignored.

The block explicitly records that no committed or non-rotatable secret was found.

### 8. Checks verdict

Marked **portable**.

Evidence recorded:

- the integration check creates a local target and disposable key;
- Playwright accepts `PLAYWRIGHT_BASE_URL`;
- the ops check accepts `DEMO_BASE_URL` / `OPS_CHECK_URL`;
- `package.json:scripts.verify` is repository-local.

The block explicitly records that no default check path calls the author's live zone
or a fleet/central service.

### 9. Coverage summary

Replaced the final `_pending_` statement with the completed distribution: Repo,
Cloudflare resources, Domain, Data, Configuration, and Secrets are coupled; Checks is
portable; no fleet/central runtime call was found.

## Validation performed

### Structural count

An `awk` count over the inventory returned:

```text
sections=7 verdicts=7 coupled=6 portable=1
```

This matches the designed category distribution.

### Placeholder check

`rg '_pending_'` returned no match in the inventory:

```text
pending_placeholders=0
```

### Citation checks

Confirmed all cited files exist. Confirmed source symbols with `rg`, including:

- `src/lib/session-lifecycle.ts:buildProvisionCommand`;
- `src/session-worker.ts:provisionWorkspace`;
- `src/lib/session-lifecycle.ts:sessionUrls` / `classifyProxyHost`;
- all committed session vars, D1 ID, account-secret name, and URL override names.

The first citation pass caught an inaccurate symbol name (`provisionWorkspaceCommand`).
It was corrected everywhere to the actual `buildProvisionCommand`, with the executing
`src/session-worker.ts → provisionWorkspace` method cited separately.

### Formatting and scope checks

`git diff --check` completed with no errors.

The task changed only:

- the predecessor's transfer inventory deliverable;
- RDSPI artifacts under `docs/active/work/T-007-01-02/`.

The worktree already contained Lisa/other-ticket changes, including ticket-frontmatter
updates and the untracked predecessor work directory. This task did not edit
`docs/active/tickets/T-007-01-02.md`; Lisa advanced its phase automatically while the
artifacts appeared.

## Runtime tests

Not run. The implementation changes Markdown only. Structural checks, citation
resolution, semantic source inspection, and whitespace validation directly exercise
the deliverable; runtime tests would execute unchanged code and would not validate the
coupling verdicts.

## Commits

No commit created. The shared branch contains concurrent Lisa/other-ticket changes,
and the inventory file being extended arrived as part of an untracked predecessor work
directory. Keeping this implementation scoped in the worktree avoids sweeping another
ticket's artifacts or automated frontmatter transitions into a misleading commit;
Lisa owns the board's serialized landing flow.

## Deviations from plan

One evidence-label correction was required during validation: the command builder is
`buildProvisionCommand`, not `provisionWorkspaceCommand`. The corrected verdict now
cites both the command builder and the private Worker method that runs it.

No scope, verdict, file-layout, or testing-strategy deviation occurred.

## Remaining

- Write `review.md` with final change summary, acceptance mapping, test coverage, and
  open concerns.
