# Design — T-007-01-02 flag-author-couplings

## Decision to make

The predecessor already chose the inventory's location and per-category structure.
This phase decides how to express coupling verdicts so a future handoff operator can
identify what breaks, where it is proven, and whether the seam is replaceable—without
turning this documentary ticket into a migration plan.

## Evaluation criteria

The result must:

1. cover all seven categories exactly once;
2. cite a file, binding, or config key for every coupling claim;
3. use `portable` when no author/account/zone/central-service dependency exists;
4. distinguish a committed identifier from an out-of-band secret value;
5. preserve the inventory's existing seam map and readability;
6. avoid claiming a fleet dependency where none exists;
7. remain useful when the actual transfer rehearsal begins.

## Option A — Replace each placeholder with a short single-sentence verdict

Example shape:

> **Author coupling:** `wrangler.jsonc:routes` binds the app to `demo.b28.dev`.

### Advantages

- Smallest diff.
- Easy to scan.
- Fits the existing placeholder exactly.

### Drawbacks

- Categories such as Cloudflare resources and Secrets have more than one distinct
  ownership seam.
- A sentence tends to blur committed IDs, selected accounts, and rotatable values.
- It does not naturally identify what fails during handoff.
- Citations embedded in prose become difficult to audit mechanically.

## Option B — Add an `Author coupling` column to every seam table

Each existing row would gain `coupled` or `portable` plus a short reason.

### Advantages

- Maximum row-level precision.
- Makes portable sub-seams within a coupled category visible.
- Supports exhaustive mechanical review.

### Drawbacks

- Rewrites every existing table even though acceptance is category-level.
- Creates wide, hard-to-read Markdown tables.
- Repeats the same account or zone coupling across many resource rows.
- Obscures the requested per-category verdict beneath implementation detail.

## Option C — Replace each placeholder with a compact coupling block

Each category retains its existing table and receives a short block containing:

- a bold verdict (`coupled` or `portable`);
- one or more exact cited seams;
- one sentence describing the handoff break;
- qualification where the surrounding mechanism remains portable or rotatable.

Example shape:

> **Author coupling (T-007-01-02) — coupled.**
> `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` hardcodes the author's repo;
> `src/lib/session-lifecycle.ts → provisionWorkspace` fetches it for every session.
> A new owner can clone the code, but an unchanged session deployment still sources
> the author's repository.

### Advantages

- Fits the predecessor's reserved edit point.
- Meets the category-level acceptance criterion directly.
- Allows multiple citations without inflating the seam table.
- Makes the failure mode explicit while retaining nuance.
- Produces a small, reviewable diff limited to the intended artifact.

### Drawbacks

- Some evidence already appears in the table and will be repeated once in the verdict.
- Consistency depends on using the same vocabulary in all seven blocks.

## Chosen approach

Choose **Option C: compact per-category coupling blocks**.

The predecessor intentionally created one reserved coupling line per category. Option C
uses that interface rather than restructuring finished work. It is detailed enough to
separate identity, ownership, and portability, while keeping the inventory usable as a
human handoff map.

## Verdict model

Use two verdicts only:

- **coupled** — at least one seam in the category currently resolves to the author's
  GitHub account, Cloudflare account, `b28.dev` zone, account-specific Access config,
  or author-controlled secret store.
- **portable** — no seam in the category requires the author's account, zone, or a
  fleet/central service to run; normal local fixtures and replaceable inputs do not
  count as author coupling.

This model evaluates the current deployed/project state, not whether transfer is
possible. A rotatable or replaceable seam can still be coupled today.

## Category decisions

### 1. Repo — coupled

Primary proof:
`wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` hardcodes
`https://github.com/johnhkchen/boilerplate-demo.git`.

Runtime connection:
`src/lib/session-lifecycle.ts → buildProvisionCommand` uses
`SESSION_REPOSITORY_URL` as the fetched origin, and
`src/session-worker.ts → provisionWorkspace` executes it during session provisioning.

Qualification: Git and the CI workflow are portable; the current source locator is not.

### 2. Cloudflare resources — coupled

Primary proof:
`wrangler.jsonc:d1_databases[0].database_id` is a concrete account-bound D1 UUID.

Account-selection proof:
`.github/workflows/deploy.yml` injects `CLOUDFLARE_ACCOUNT_ID` into remote Wrangler
commands from the author's repository secrets.

Handoff break: an unchanged deploy targets the selected author account and references
a D1 database that does not belong to a new account.

### 3. Domain — coupled

Proof:
`wrangler.jsonc:routes`, `wrangler.sessions.jsonc:routes`, and
`wrangler.sessions.jsonc:vars.SESSION_DOMAIN` name `b28.dev` and its three exact hosts.

Handoff break: a new account without control of the author's zone cannot attach those
custom domains, and session host classification continues expecting them.

### 4. Data — coupled

Proof:
`src/lib/backstage-store.ts` accesses `BACKSTAGE_DB`, which resolves through the
account-bound `wrangler.jsonc:d1_databases[0].database_id`. Session state resolves
through `wrangler.sessions.jsonc:durable_objects.bindings.SESSION_COORDINATOR`.

Handoff break: deploying schemas and classes elsewhere does not carry the existing D1
rows or Durable Object state.

### 5. Configuration — coupled

Proof:
`wrangler.sessions.jsonc:vars.SESSION_DOMAIN` and `SESSION_REPOSITORY_URL` commit the
author's zone and repository.

Qualification: the rest of the config is reproducible; this verdict is not a claim
that configuration as a mechanism is nonportable.

### 6. Secrets — coupled, fully rotatable

Proof:
`.github/workflows/deploy.yml` reads the Cloudflare account ID/token from GitHub
Secrets; both Wrangler configs declare Worker secret bindings, including Access team
and audience identifiers.

Handoff break: secret values are not conveyed by cloning and current values remain
under author-controlled GitHub/Cloudflare stores.

Qualification: no non-rotatable or committed secret was found. A new owner should set
new values rather than receive the author's values.

### 7. Checks — portable

Proof:
`scripts/integration-check.ts` owns a local server/config/key;
`playwright.config.ts` accepts `PLAYWRIGHT_BASE_URL`; `scripts/ops-check.ts` accepts
`DEMO_BASE_URL`/`OPS_CHECK_URL`; `package.json:scripts.verify` is repo-local.

Qualification: test fixtures mirror the current `b28.dev` config and must evolve when
that config changes, but no check calls the author's zone or a fleet service by default.

## Rejected interpretations

### Mark only immutable seams as coupled

Rejected because the acceptance asks what binds resources to the author now, not what
can never be changed. Account secrets and config values are replaceable but still make
an unchanged handoff fail.

### Call Secrets portable because no values are committed

Rejected because the deployed values live in author-controlled stores and are not
transferred with the repo. The correct nuance is `coupled, fully rotatable`.

### Call Checks coupled because tests contain `b28.dev` strings

Rejected because those strings validate repository configuration locally. The checks
do not contact the live author zone unless an operator explicitly supplies such a URL.

### Add a fleet-service warning to every category

Rejected because the scan found no central/fleet runtime call. P7 is best demonstrated
by an explicit no-dependency statement and a `portable` Checks verdict, not by inventing
a service seam.

## Scope guardrails

- Edit only the inventory and this ticket's RDSPI artifacts.
- Do not change the author's URLs, resource IDs, bindings, routes, or secrets yet.
- Do not update ticket phase/status frontmatter.
- Do not query or mutate Cloudflare/GitHub state.
- Do not turn coupling findings into transfer instructions; later S-007 work owns the
  rehearsal and handoff runbook.
