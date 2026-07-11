# Plan — T-007-01-02 flag-author-couplings

## Acceptance target

Extend `docs/active/work/T-007-01-01/transfer-surface-inventory.md` so every one of
the seven inventory categories contains a cited author-coupling verdict. A category
with no author account/zone/central-service dependency must say `portable`. Do not
change runtime behavior or ticket frontmatter.

## Testing strategy

This is a Markdown-only change. Runtime unit, integration, browser, and deployment
tests cannot validate the semantic accuracy of documentary coupling claims and are not
required for the implementation diff.

Verification will instead use:

- structural counts for seven numbered sections and seven verdict blocks;
- a negative grep for `_pending_` in the inventory;
- positive greps for `coupled`, `portable`, author URLs/hosts, D1 UUID, account secret
  name, and check override names;
- file existence checks for every citation introduced by the verdicts;
- `git diff --check` for whitespace errors;
- scoped diff inspection to prove no runtime/config/ticket file changed in this task;
- full Markdown read-through for claim/evidence alignment.

No network or Cloudflare API verification will run because the ticket maps couplings
and does not authorize external state access or mutation.

## Step 1 — Update inventory completion framing

Modify the opening `Honest boundary` paragraph:

- retain the statement that the artifact transfers nothing;
- say T-007-01-02 now supplies per-category verdicts;
- define `portable` in the context of the audit;
- remove future/pending language.

Independent verification: grep the inventory header for `portable` and ensure
`_pending_` is absent from the opening.

## Step 2 — Flag Repo coupling

Replace the Repo placeholder with `coupled`.

Cite `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`,
`src/lib/session-lifecycle.ts → buildProvisionCommand`, and
`src/session-worker.ts → provisionWorkspace`. State that the hardcoded
`github.com/johnhkchen/boilerplate-demo.git` source is cloned at session provision.
Qualify the Git/CI machinery itself as portable.

Independent verification: the block includes both config and consumer citations.

## Step 3 — Flag Cloudflare resource coupling

Replace the resource placeholder with `coupled`.

Cite the exact D1 `database_id` and the `CLOUDFLARE_ACCOUNT_ID` injection in
`.github/workflows/deploy.yml`. State that the live resources exist in the selected
account while their declarations can be recreated.

Independent verification: the UUID in the verdict matches `wrangler.jsonc` exactly;
no actual account ID or token value appears.

## Step 4 — Flag Domain coupling

Replace the Domain placeholder with `coupled`.

Cite both `routes` configs and `SESSION_DOMAIN`. Name `demo.b28.dev`,
`demo-session.b28.dev`, and `code-session.b28.dev`; explain zone-control and runtime
host-classification consequences.

Independent verification: all three route strings resolve in the cited configs.

## Step 5 — Flag Data coupling

Replace the Data placeholder with `coupled`.

Cite the `BACKSTAGE_DB` access path plus account-bound database ID, and the
`SESSION_COORDINATOR` Durable Object binding/storage owner. State that schema/code
recreation does not migrate existing contents.

Independent verification: distinguish account-resident data from the transient
preservation patch and avoid claiming external persistence for the latter.

## Step 6 — Flag Configuration coupling

Replace the Configuration placeholder with `coupled`.

Cite `SESSION_DOMAIN` and `SESSION_REPOSITORY_URL` as committed author-specific values.
State that other non-secret config is reproducible.

Independent verification: both cited keys exist under
`wrangler.sessions.jsonc:vars`.

## Step 7 — Flag Secrets coupling

Replace the Secrets placeholder with `coupled, fully rotatable`.

Cite GitHub Actions secret consumption and both Wrangler `secrets.required` contracts.
State that deployed/current values are author-controlled and absent from Git. Explicitly
record that no non-rotatable or committed secret was found.

Independent verification: no secret literal is introduced; only binding/secret names
are present.

## Step 8 — Mark Checks portable

Replace the Checks placeholder with `portable`.

Cite integration check temporary local config, Playwright base URL override, ops check
URL overrides, and repo-local `verify`. State that no default check path requires the
author's zone or a fleet/central service. Qualify current-domain test fixtures as local
contract tests.

Independent verification: inspect `scripts/integration-check.ts`,
`playwright.config.ts`, and `scripts/ops-check.ts` to ensure defaults are local and
remote targets are caller-selected.

## Step 9 — Update closing coverage summary

Replace the final pending statement with:

- all seven placeholders resolved;
- Repo, Cloudflare resources, Domain, Data, Configuration, and Secrets are coupled;
- Checks is portable;
- no fleet/central-service runtime call was found.

Independent verification: summary verdicts agree with section headings.

## Step 10 — Structural validation

Run commands equivalent to:

```sh
rg -c '^## [1-7]\\.' docs/active/work/T-007-01-01/transfer-surface-inventory.md
rg -c '^\\*\\*Author coupling \\(T-007-01-02\\)' docs/active/work/T-007-01-01/transfer-surface-inventory.md
rg -n '_pending_' docs/active/work/T-007-01-01/transfer-surface-inventory.md
rg -n 'Author coupling.*portable|Author coupling.*coupled' docs/active/work/T-007-01-01/transfer-surface-inventory.md
git diff --check
```

Expected results:

- seven numbered category sections;
- seven coupling blocks;
- zero `_pending_` matches;
- six coupled verdicts and one portable verdict;
- no whitespace errors.

## Step 11 — Citation and semantic review

For every verdict, open the cited source and verify:

- spelling of key/binding names;
- exact author URL/hostname/UUID where quoted;
- whether the source is committed or out-of-band;
- whether the stated failure follows from that seam;
- no fleet dependency is asserted without evidence.

Read the inventory top-to-bottom to catch contradictions between framing, tables,
verdicts, and coverage summary.

## Step 12 — Scope review

Inspect `git diff --` for the inventory and this ticket's work directory. Existing
dirty files from Lisa/other tickets are out of scope and must remain untouched.

Confirm specifically that `docs/active/tickets/T-007-01-02.md` phase/status fields were
not changed by this work.

## Step 13 — Record implementation progress

Create `progress.md` with:

- steps completed;
- actual files changed;
- validation commands/results;
- deviations from this plan;
- remaining work (Review only at that point).

This is one meaningful documentary implementation unit. The shared branch already
contains unrelated, uncommitted Lisa/other-ticket changes; do not sweep those changes
into a commit. Record the commit decision transparently in progress.

## Step 14 — Review handoff

Create `review.md` summarizing:

- inventory framing and seven verdicts;
- file inventory;
- acceptance-criterion mapping;
- documentary test coverage and why runtime tests were not run;
- open concerns, especially that this audit does not perform a transfer and that
  account/secret values remain intentionally undisclosed;
- whether critical human action is required.

Stop after `review.md` is complete. Lisa owns subsequent phase/status transitions.

## Rollback boundary

If a coupling claim proves unsupported, revert only that verdict block to evidence-based
wording; do not alter runtime/config to make the claim true. If the source inventory has
drifted, update the cited seam row and corresponding verdict together so the artifact
remains internally consistent.
