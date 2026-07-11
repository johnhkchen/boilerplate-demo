# Review — T-007-01-02 flag-author-couplings

## Outcome

Complete. The existing transfer-surface inventory now flags the current author
coupling for every one of its seven categories with a file, symbol, binding, or config
key that proves the verdict.

Verdict distribution:

| Category | Verdict | Exact current coupling |
| -------- | ------- | ---------------------- |
| Repo | coupled | Session config hardcodes the author's GitHub repository and session provisioning fetches it. |
| Cloudflare resources | coupled | D1 config contains an account-bound UUID; CI selects the deployment account from an author-controlled repository secret. |
| Domain | coupled | Three `custom_domain` routes and session host configuration name the author's `b28.dev` zone. |
| Data | coupled | Existing D1 rows and Durable Object state reside behind account-scoped bindings/resources. |
| Configuration | coupled | Committed `SESSION_DOMAIN` and `SESSION_REPOSITORY_URL` values identify the author's zone/repo. |
| Secrets | coupled, fully rotatable | Current CI/Worker/local values remain in author-controlled stores and do not travel with Git. |
| Checks | portable | Default evidence paths are local; remote URLs are caller-supplied; no fleet/central service is required. |

No fleet or author-operated central-service runtime call was found. This supports P7
without inventing an absent dependency.

## Files created

### `docs/active/work/T-007-01-02/research.md`

Maps ticket scope, predecessor artifact structure, and evidence for every category.
Separates committed identifiers from out-of-band account/secret selection and records
the absence of a fleet runtime dependency.

### `docs/active/work/T-007-01-02/design.md`

Evaluates three presentation options and selects compact per-category coupling blocks.
Defines `coupled` and `portable`, including the important rule that a replaceable or
rotatable seam may still be coupled in the current state.

### `docs/active/work/T-007-01-02/structure.md`

Defines the file-level change, the coupling-block interface, citations and content
boundaries for all seven categories, ordering, and no-deletion guarantee.

### `docs/active/work/T-007-01-02/plan.md`

Sequences the inventory edit and documentary validation. Defines expected structural
counts, citation checks, scope checks, and Review handoff.

### `docs/active/work/T-007-01-02/progress.md`

Records completed verdicts, actual validation results, the corrected symbol citation,
runtime-test rationale, commit decision, and lack of remaining implementation work.

### `docs/active/work/T-007-01-02/review.md`

This human-review handoff.

## File modified

### `docs/active/work/T-007-01-01/transfer-surface-inventory.md`

This is the story-level deliverable established by the predecessor ticket and named by
S-007-01 as the file this ticket extends.

Changes:

- replaced opening future/pending framing with completed coupling semantics;
- replaced all seven `_pending_` slots with cited verdict blocks;
- distinguished portable sub-mechanisms from current author-owned identities;
- explicitly stated that secrets are fully rotatable and none is committed;
- marked Checks portable with local/override citations;
- replaced the closing pending statement with the complete verdict distribution;
- recorded that no fleet/central runtime call exists.

No existing category, seam row, or cited transfer surface was removed.

## Files not changed

- `docs/active/tickets/T-007-01-02.md` was not edited by this work. Lisa owns and
  performed phase transitions automatically.
- No file under `src/`, `scripts/`, `test/`, or `tests/` changed.
- Neither Wrangler config changed.
- `.github/workflows/deploy.yml` was inspected but not changed.
- No secret store, GitHub setting, Cloudflare resource, route, DNS record, database,
  or Durable Object state was read or mutated externally.

## Acceptance-criterion review

> Each inventory category carries a cited author-coupling entry ... referencing the
> file or config key that proves the coupling; categories with none are marked
> `portable`.

**Met.**

### Repo

The verdict cites `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`,
`src/lib/session-lifecycle.ts → buildProvisionCommand`, and
`src/session-worker.ts → provisionWorkspace`. Together they prove that the committed
author repository URL is a live session-provisioning input.

### Cloudflare resources

The verdict cites the concrete
`wrangler.jsonc:d1_databases[0].database_id` and
`.github/workflows/deploy.yml → secrets.CLOUDFLARE_ACCOUNT_ID`. These prove both the
committed account-bound resource identity and the out-of-band account-selection seam.

### Domain

The verdict cites `wrangler.jsonc:routes`, `wrangler.sessions.jsonc:routes`, and
`wrangler.sessions.jsonc:vars.SESSION_DOMAIN`, plus the runtime URL/classification
consumers. It names all three `b28.dev` hostnames.

### Data

The verdict cites `src/lib/backstage-store.ts` and the D1 `database_id` for backstage
rows, plus `SESSION_COORDINATOR` and `SessionCoordinator` for session state. It avoids
conflating portable schema/code with existing account-resident contents.

### Configuration

The verdict cites the two committed author-specific session vars. It qualifies the
remaining configuration contracts as reproducible instead of overgeneralizing the
category.

### Secrets

The verdict cites GitHub Actions secret reads and both Wrangler required-secret name
contracts. It accurately reports current ownership coupling while explicitly saying
no committed or non-rotatable secret was found.

This is preferable to forcing the acceptance criterion's example of a non-rotatable
secret onto a repository where the evidence shows every secret can be replaced.

### Checks

The verdict is explicitly `portable`. It cites the integration check's local target
and disposable key, Playwright/ops URL overrides, and repo-local aggregate command.
The distinction between local `b28.dev` contract fixtures and a live author-zone call
is stated.

## Test and verification coverage

### Performed

- Counted numbered category sections: **7**.
- Counted coupling verdict blocks: **7**.
- Counted `coupled` verdicts: **6**.
- Counted `portable` verdicts: **1**.
- Searched for unresolved `_pending_` placeholders: **0**.
- Confirmed every cited source file exists.
- Confirmed key symbols and values with source search, including
  `buildProvisionCommand`, `provisionWorkspace`, `sessionUrls`,
  `classifyProxyHost`, the D1 UUID, session vars, CI account secret name, and check
  URL overrides.
- Ran `git diff --check`: **passed**.
- Read the completed inventory top-to-bottom for framing/table/verdict/summary
  consistency.

### Defect caught during verification

The initial documentary draft called the session command builder
`provisionWorkspaceCommand`. Source inspection showed its actual exported name is
`buildProvisionCommand`; the Worker method that executes it is `provisionWorkspace`.
All artifacts and the inventory were corrected to cite both exact symbols.

### Runtime tests not run

No runtime tests were run because implementation changed Markdown only. Unit,
integration, Playwright, and deploy-dry behavior is unchanged, and those suites do not
assert the semantic contents of this inventory. Structural counts, exact source
citation checks, negative-placeholder search, and semantic read-through directly test
this ticket's deliverable.

## Open concerns and limitations

1. **This audit does not perform a handoff.** It identifies seams that will fail or
   retain author ownership. Later S-007-02 tickets must exercise replacement,
   migration, rotation, and validation under a new-owner context.
2. **External values are intentionally undisclosed.** The actual Cloudflare account
   ID, API token, Worker secrets, Access audience values, and local secret values were
   neither queried nor recorded. The inventory cites the configuration/store seam.
3. **Data completeness must be proven during rehearsal.** The code proves where D1
   and desired-session state live; only an export/import or explicit drop decision can
   prove what content is ultimately transferred.
4. **Check fixtures follow config.** Tests containing current `b28.dev` values remain
   portable but will require fixture updates when later tickets repoint the domain.
   The later rehearsal must not hide such failures.
5. **The predecessor work directory is untracked in the current shared worktree.**
   This ticket correctly extends its inventory, but landing/commit serialization must
   preserve the predecessor's other artifacts as Lisa processes concurrent board work.
6. **Cloudflare declarations are reproducible, not globally portable instances.**
   Worker names/classes/config can be deployed again, while the active instances,
   resource IDs, Access apps, and stored data remain account-scoped. The verdicts keep
   that distinction explicit.

## Critical issues requiring human attention

None for this documentary ticket.

Before the actual transfer, a human/new-owner operator will need authority over a
target Git repository, Cloudflare account, replacement domain, GitHub secret store,
and Access configuration. Those are expected prerequisites for the later rehearsal,
not blockers or missing work here.

## Commit coverage

No commit was created in this pass. The shared worktree contains concurrent Lisa and
other-ticket changes, and the predecessor inventory is currently part of an untracked
work directory. The completed changes are intentionally isolated to the inventory and
`docs/active/work/T-007-01-02/`; Lisa's serialized workflow can land them without
folding unrelated automated frontmatter transitions into this ticket's commit.

## Final assessment

The ticket is ready for Lisa's post-Review handling. A reviewer can now scan one bold
verdict per inventory category, follow every claim to repository evidence, see exactly
which current seams remain author-owned, and distinguish those seams from the portable
checks and absent fleet dependency.
