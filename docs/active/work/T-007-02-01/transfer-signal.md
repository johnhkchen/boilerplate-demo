# Transfer Signal — the per-category pass/fail scorecard

The committed scorecard every owner-transfer attempt reports against. It fixes,
per category, the **observable** you run, the **pass condition**, what a **gap**
names, and which downstream ticket owns the attempt. Seeded from the transfer
inventory (`../T-007-01-01/transfer-surface-inventory.md`) and the coupling
verdicts (`../T-007-01-02/`); the baseline column reflects the scrubbed context
this ticket's harness produces (`fresh-owner-harness.md`).

## How to read a row

Every category carries one of three states — and **every state must cite a seam
or a command**, never a bare verdict:

- **`pass`** — the category transferred; the observable holds under the
  new-owner context with no author account/zone/repo/secret on the path.
- **`gap`** — a seam failed to transfer cleanly. The row **names the exact
  failing seam** (file + config key or binding). Never silently skipped — this is
  the story's and E-007's non-negotiable.
- **`deferred`** — a metered live step (a deploy under a real second Cloudflare
  account) not run in this drill because no second live account is assumed
  available (PE-7 honest boundary). `deferred` **names the exact metered step and
  why**; it is never used to hide a red. A category that was *attempted and
  failed* is a `gap`, not `deferred`.

The harness sets each category's **baseline** after the scrub. Downstream tickets
move their owned rows to `pass` or `gap` as they attempt the real transfer.

## The scorecard

| # | Category | Observable (run / look at) | Pass condition | Gap names (seam) | Baseline after scrub | Owner |
|---|----------|----------------------------|----------------|------------------|----------------------|-------|
| 1 | **Repo** | `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`; `git remote -v` in the new tree | Clone URL is the new owner's repo; no author remote | `SESSION_REPOSITORY_URL` still author repo, or `origin` still `johnhkchen/*` | **`pass`** — attempted (T-007-02-03 drill): context committed + pushed to a new-owner remote, round trip verified, no author remote; real GitHub repo + `SESSION_REPOSITORY_URL` = metered fill-in | T-007-02-03 |
| 2 | **Cloudflare resources** | `wrangler.jsonc:d1_databases`, Worker names; `npx wrangler whoami`; a real `deploy` | Worker + D1 + DO + container provisioned under new account; fresh `database_id` | account still author's; `database_id` still `c95861d4-…`; deploy collides with author Worker | **`deferred`** (live deploy under a real second account — none on this machine) — local attempt clean (T-007-02-03): `deploy:dry` + `session:validate` green **without** `database_id`, Worker runs and serves via `wrangler dev` | T-007-02-03 |
| 3 | **Domain** | `wrangler.jsonc:routes`, `wrangler.sessions.jsonc:routes`, `vars.SESSION_DOMAIN`; resolve the public URL | Routes point off `b28.dev` to a new-owner zone; demo resolves there | any route still `*.b28.dev`; `SESSION_DOMAIN` still `b28.dev` | **`gap`** (T-007-02-03): `test/promote.test.mjs:246` hardcodes `demo.b28.dev` — the re-pointed tree fails its own `npm test`; config side clean (zero `b28.dev` routes/vars; one zone value re-points all three hosts); live zone delegation deferred | T-007-02-03 |
| 4 | **Data** | `BACKSTAGE_DB` rows (`src/lib/backstage-store.ts`); `SESSION_COORDINATOR` DO storage | New-owner store holds the moved rows / desired session state | rows/state absent under new account, or export/import step missing | **`gap`** (T-007-02-03): `SESSION_COORDINATOR` DO storage has **no export/import seam**; D1 half clean — rows exported/imported between local stores and served via `/api/backstage/feed`; remote import deferred | T-007-02-03 |
| 5 | **Configuration** | `wrangler.sessions.jsonc:vars` (`SESSION_DOMAIN`, `SESSION_REPOSITORY_URL`) | Both committed author values replaced with new-owner values | either var still author zone/repo | `pass` (scrubbed to placeholders) → owner fills real values | T-007-02-02 |
| 6 | **Secrets** | `wrangler.jsonc:secrets.required` + session `secrets.required`; `leak:check` / `ops:check`; `.dev.vars` absent | Every secret set to new-owner value; leak/ops green; zero author secret on path | any author secret reachable, or a secret proves non-rotatable (name it) | `pass` (clean tree carries **no** secret to inherit) → owner installs + rotation proven | T-007-02-02 |
| 7 | **Checks** | `npm run integration:check`, `leak:check`, `ops:check`, `test:flow:backstage` against the new-owner URL | All green against the new deployment with author accounts removed from the path | any check red → record the failing check + seam | `deferred` — checks need a live new-owner deployment to run against | T-007-02-04 |

## Per-category detail

**1. Repo.** The runtime coupling is the committed clone URL, not GitHub as a
mechanism (`../T-007-01-02/research.md`). Pass = the Session Worker provisions
from the new owner's repo. The harness scrubs it to
`github.com/NEW-OWNER/REPO.git`; a real handoff sets the true repo and re-homes
`origin`. Gap seam: `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`.
*Attempted (T-007-02-03): clean in the local drill — new-owner remote round trip
verified, `.dev.vars` kept out of history; note a local `file://` stand-in for
`SESSION_REPOSITORY_URL` is barred by `parseSessionConfig`'s HTTPS-only rule
(`../T-007-02-03/transfer-log.md`).*

**2. Cloudflare resources.** Definitions (Worker/DO/container/assets/version
metadata) are reproducible; the coupling is the *account* the live instances sit
in and the account-bound `database_id`. `deferred` here because standing up real
instances needs a second live account — the metered step. When attempted, a
collision with the author's production Worker (T-006-02-01 finding) is a `gap`,
not a pass. Gap seam: `wrangler.jsonc:d1_databases[0].database_id`,
`CLOUDFLARE_ACCOUNT_ID`.
*Attempted (T-007-02-03): local legs clean — `deploy:dry` and `session:validate`
green with `database_id` removed (the auto-provision contract holds at
validation level) and the App Worker ran and served locally; container image
build not exercised (named scope cut); live second-account deploy still the
metered leg (`../T-007-02-03/transfer-log.md`).*

**3. Domain.** Three `custom_domain` routes plus `SESSION_DOMAIN` bind the demo to
the author's `b28.dev` zone; `src/lib/session-lifecycle.ts` derives hosts from
`SESSION_DOMAIN`. Scrubbed to `NEW-OWNER-ZONE.example` (RFC 2606 reserved,
unroutable) so the seam is loud until a real zone is chosen. Gap seam: any
`routes[].pattern` or `SESSION_DOMAIN` still on `b28.dev`.
*Attempted (T-007-02-03): **gap** — `test/promote.test.mjs:246` asserts the
literal `demo.b28.dev` against the real `wrangler.jsonc`, so a re-pointed tree
fails its own `npm test` (19 pass / 1 fail observed). Also: this scorecard's
uppercase placeholder is rejected by the runtime's lowercase-only `DNS_NAME`
validation — a lowercase placeholder would be equally loud and runnable. Config
side re-pointed cleanly (`../T-007-02-03/transfer-log.md`).*

**4. Data.** Schema (`migrations/0001_*.sql`) and access code are portable; the
*rows* and DO state do not travel with a clone. `deferred` — a real export/import
against a live second-account D1/DO is required. Gap seam: `BACKSTAGE_DB`
contents, `SESSION_COORDINATOR` storage under `SESSION_STORAGE_KEY`.
*Attempted (T-007-02-03): D1 half clean in the local drill — rows exported
(`d1 export --table backstage_entries --no-schema`; the unscoped dump collides
with applied migrations), imported, and served via `/api/backstage/feed`. DO
half **gap** — no wrangler subcommand exports Durable Object storage; the only
read path is the live Worker's control API (`../T-007-02-03/transfer-log.md`).*

**5. Configuration.** Exactly two committed author values (`SESSION_DOMAIN`,
`SESSION_REPOSITORY_URL`); everything else is portable project-local config. Both
are scrubbed to placeholders — `pass` baseline, owner fills real values. Gap seam:
either `wrangler.sessions.jsonc:vars` value still author-owned.

**6. Secrets.** No secret value is committed, and the fresh-owner tree drops
`.dev.vars` outright — so there is literally **no author secret to inherit**
(the strongest possible baseline). T-007-02-02's job is to prove *new* values
install and that `leak:check`/`ops:check` stay green with them. A secret that
proves non-rotatable is a named `gap`; none is known today (all rotatable per
`../T-007-01-02/`). Gap seam: the specific `secrets.required` name that could not
be rotated.

**7. Checks.** Every check resolves a caller-supplied target (`DEMO_BASE_URL`,
`OPS_CHECK_URL`, `LEAK_CHECK_URL`, `PLAYWRIGHT_BASE_URL`) and calls no author
central service — the category is `portable`. `deferred` only because there is no
live new-owner deployment yet to point them at; the moment T-007-02-03 produces
one, T-007-02-04 runs the trio + backstage flow against it. Gap = any red check,
recorded with the failing check name and seam (note the in-session Playwright
daemonization hazard, `[[boilerplate-demo-playwright-daemonization]]`, is an
environment artifact to run outside an agent session, not a demo gap).

## Baseline summary after the harness

- `pass` on the scrubbed tree: **1 Repo**, **3 Domain**, **5 Configuration**,
  **6 Secrets** — the couplings that are pure committed config/secret hygiene,
  now new-owner-controlled or absent.
- `deferred` pending a real second account: **2 Cloudflare resources**,
  **4 Data**, **7 Checks** — each names the metered live step it awaits.
- `gap`: **none yet** — no attempt has failed; gaps are recorded by the
  downstream tickets as they attempt the live legs.

**After the T-007-02-03 drill (rows 1–4 moved; see the table above and
`../T-007-02-03/transfer-log.md`):** 1 Repo `pass` (attempted), 2 Resources
`deferred` with clean local legs, 3 Domain **`gap`** (`test/promote.test.mjs:246`
domain literal), 4 Data **`gap`** (`SESSION_COORDINATOR` DO storage has no
export seam; D1 half clean). Rows 5–7 remain with T-007-02-02 / T-007-02-04.
