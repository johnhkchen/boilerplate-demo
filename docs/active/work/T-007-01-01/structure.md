# Structure — T-007-01-01 map-transfer-surface

_The shape of the deliverable. What files change, and the internal layout of the
one artifact this ticket creates._

## Files

| Path | Action | Why |
| ---- | ------ | --- |
| `docs/active/work/T-007-01-01/transfer-surface-inventory.md` | **create** | The deliverable the story acceptance checks. |
| `docs/active/work/T-007-01-01/{research,design,structure,plan,progress,review}.md` | create | RDSPI phase artifacts (this pass). |
| _any runtime file_ | **none** | Story boundary: "touches no runtime code." No `src/**`, config, or migration edits. |

Exactly one non-RDSPI file is produced. No deletions, no moves.

## Internal layout of `transfer-surface-inventory.md`

Ordered top to bottom:

1. **Title + frame** (~15 lines)
   - `# Transfer Surface Inventory — demo-runway`
   - One line on purpose: map each of the seven transfer categories to its concrete
     seam in this repo (S-007-01 / E-007).
   - **Two deployables** note: App Worker (`wrangler.jsonc`, `demo-runway`) vs
     Session Worker (`wrangler.sessions.jsonc`, `demo-runway-sessions`) — stated
     once so per-category tables need not re-explain it.
   - **Citation legend**: `file` (whole file) · `file:key` (config key/JSON path) ·
     `file → symbol` (exported binding/const). Every seam row uses one of these.
   - **Honest boundary** line: this maps only; it transfers/rotates nothing, makes
     no Cloudflare API call; coupling verdicts are T-007-01-02.

2. **Seven category sections** (`## 1.` … `## 7.`), each identical in shape
   (the Design blueprint):
   - `## N. <Category>` heading.
   - One line: what "transferring this category" concretely means here.
   - A citation table: `| Seam | Cited at | What it is |`.
   - A standing line: `**Author coupling (T-007-01-02):** _pending_` — the reserved
     slot the sibling ticket fills.

3. **Coverage checklist** (~10 lines): a seven-box list confirming each category has
   ≥1 cited seam — the at-a-glance "all seven present" proof for a reviewer.

## The seven sections and their pinned seams (content spec)

Order follows the story's enumeration exactly: repo, Cloudflare resources, domain,
data, configuration, secrets, checks.

### 1. Repo
- `git remote origin` → `github.com/johnhkchen/boilerplate-demo.git`
- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`
- `.github/workflows/deploy.yml` (push→main, promote `$GITHUB_SHA`)
- `docs/active/**` template-history leak boundary (ref T-006-02-02)

### 2. Cloudflare resources
- `wrangler.jsonc:name` (`demo-runway`) · `wrangler.sessions.jsonc:name`
  (`demo-runway-sessions`)
- `wrangler.jsonc:d1_databases[0]` binding `BACKSTAGE_DB`, `database_id` UUID
- `wrangler.sessions.jsonc:durable_objects.bindings` (`Sandbox`,
  `SESSION_COORDINATOR`) + `migrations` v1/v2
- `wrangler.sessions.jsonc:containers[0]` (`Dockerfile.session`)
- `wrangler.jsonc:assets` (`ASSETS`) · `wrangler.jsonc:version_metadata`
  (`CF_VERSION_METADATA`)
- account: `CLOUDFLARE_ACCOUNT_ID` (via `deploy.yml`, not committed)

### 3. Domain
- `wrangler.jsonc:routes` → `demo.b28.dev`
- `wrangler.sessions.jsonc:routes` → `demo-session.b28.dev`,
  `code-session.b28.dev`
- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` (`b28.dev`) +
  `src/lib/session-lifecycle.ts → sessionUrls/classifyProxyHost`
- `wrangler.jsonc:workers_dev` / `preview_urls` (zone-independent fallback hosts)

### 4. Data
- `migrations/0001_create_backstage_entries.sql` (table `backstage_entries`)
- `src/lib/backstage-store.ts → saveEntry/listEntries` (the only D1 access path)
- `src/session-worker.ts → SessionCoordinator` DO storage (`SESSION_STORAGE_KEY`)
- session preservation patch (`session-worker.ts → inspectPreservation`)

### 5. Configuration
- `wrangler.jsonc:vars.DEMO_FAULT`, `compatibility_date`, `compatibility_flags`
- `wrangler.sessions.jsonc:vars` (`SESSION_SLUG`, `SESSION_DOMAIN`,
  `SESSION_REPOSITORY_URL`)
- `secrets.required` arrays in both configs (the non-secret runtime contract)
- `.dev.vars.example`, `src/env.d.ts`, `worker-configuration*.d.ts`,
  `astro.config.mjs` (`DEMO_WRANGLER_CONFIG_PATH`)

### 6. Secrets
- `wrangler.jsonc:secrets.required` → `DEMO_SIGNING_KEY`
  (`src/lib/receipt.ts`), `DEMO_PASSCODE` (`src/lib/passcode.ts:PASSCODE_ENV`)
- `wrangler.sessions.jsonc:secrets.required` → `SESSION_RUNTIME_SECRETS`,
  `SESSION_ACCESS_TEAM_DOMAIN`, `SESSION_ACCESS_PREVIEW_AUD`,
  `SESSION_ACCESS_EDITOR_AUD` (`src/lib/session-access.ts`)
- CI: `deploy.yml` → `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- local: `.dev.vars` (gitignored)

### 7. Checks
- trio: `scripts/{ops,leak,integration}-check.ts` → `src/lib/{ops,leak,integration}-check.ts`
- `src/lib/integration-check.ts:INTEGRATION_CHECKS` (`operation`,`flow`,`leak`)
- Playwright: `playwright.config.ts` projects (`healthy`/`stalled`/`backstage`),
  `tests/demo-flow.spec.ts`, `tests/backstage-flow.spec.ts`,
  `tests/support/flow-contract.ts`
- aggregate: `package.json:scripts.verify`; session-side `session:validate`,
  `session:image:check`

## Interfaces / conventions

- Every "Cited at" cell uses the legend forms only — reviewable by pattern.
- Category headings and order are FIXED (the story's vocabulary), so T-007-01-02 can
  target sections by number/name without ambiguity.
- The `Author coupling` line uses the literal marker `_pending_` so a later grep
  finds every unfilled slot.

## Ordering of changes

Single artifact, written in one pass in section order 1→7, then the coverage
checklist. No inter-file dependencies. RDSPI progress/review follow.
