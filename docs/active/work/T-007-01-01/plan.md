# Plan — T-007-01-01 map-transfer-surface

_Ordered, verifiable steps. This is a docs-only ticket; "tests" here are static
self-audits over citations, since there is no runtime behavior to exercise._

## Testing strategy

No unit/integration tests — the deliverable is a Markdown inventory and the story
forbids touching runtime code. Verification is a **citation audit**: every seam the
inventory cites must resolve to a real file / binding name / config key in the repo.
Two mechanical checks plus one structural check:

- **C1 — files resolve**: every path cited (`wrangler.jsonc`, `src/lib/*.ts`,
  `migrations/*.sql`, `.github/workflows/deploy.yml`, …) exists.
- **C2 — keys/bindings resolve**: every config key or exported symbol cited
  (`BACKSTAGE_DB`, `DEMO_PASSCODE`, `SESSION_REPOSITORY_URL`, `routes`, `PASSCODE_ENV`,
  `INTEGRATION_CHECKS`, …) is grep-findable at the cited location.
- **C3 — structure**: all seven categories present, in story order; each has ≥1 seam
  row and exactly one `Author coupling (T-007-01-02): _pending_` line.

Acceptance restated: an inventory artifact under `docs/active/work/T-007-01-01/`
lists all seven categories, each mapped to a real file/binding/config key. C1+C2+C3
green ⇒ acceptance met.

## Steps

### Step 1 — Write the frame
Create `transfer-surface-inventory.md`: title, purpose line, two-Worker split note,
citation legend, honest-boundary line. _Verify:_ file exists; legend defines the
three citation forms.

### Step 2 — Section 1 (Repo)
Add the Repo section with its citation table (git origin, `SESSION_REPOSITORY_URL`,
`deploy.yml`, `docs/active/**` leak boundary) + pending coupling line.
_Verify:_ each cited path exists (C1); `SESSION_REPOSITORY_URL` present in
`wrangler.sessions.jsonc` (C2).

### Step 3 — Section 2 (Cloudflare resources)
Worker names, `BACKSTAGE_DB` + `database_id`, DO bindings + migrations, container,
`ASSETS`, `CF_VERSION_METADATA`, account id via CI.
_Verify:_ `BACKSTAGE_DB`, `database_id`, `Sandbox`, `SESSION_COORDINATOR`,
`CF_VERSION_METADATA` grep-resolve at cited configs (C2).

### Step 4 — Section 3 (Domain)
`demo.b28.dev`; `demo-session.b28.dev` / `code-session.b28.dev`; `SESSION_DOMAIN` +
`sessionUrls`/`classifyProxyHost`; `workers_dev`/`preview_urls`.
_Verify:_ the three hostnames appear in the cited `routes`/`vars` (C2).

### Step 5 — Section 4 (Data)
`backstage_entries` migration; `saveEntry`/`listEntries`; `SessionCoordinator` DO
storage; preservation patch.
_Verify:_ migration file + `backstage-store.ts` exist; `saveEntry`/`listEntries`
exported (C1/C2).

### Step 6 — Section 5 (Configuration)
`DEMO_FAULT` + compat keys; session `vars`; `secrets.required` contract arrays;
type/`.dev.vars.example`/`astro.config.mjs` surfaces.
_Verify:_ `DEMO_FAULT` and `secrets.required` present in configs (C2).

### Step 7 — Section 6 (Secrets)
App secrets (`DEMO_SIGNING_KEY`/`receipt.ts`, `DEMO_PASSCODE`/`passcode.ts`
`PASSCODE_ENV`); session secrets (4, via `session-access.ts`); CI secrets
(`deploy.yml`); local `.dev.vars`.
_Verify:_ `PASSCODE_ENV` in `passcode.ts`; all four session secret names in
`wrangler.sessions.jsonc:secrets.required`; `CLOUDFLARE_API_TOKEN` in `deploy.yml`
(C2).

### Step 8 — Section 7 (Checks)
Trio scripts→libs; `INTEGRATION_CHECKS`; Playwright projects + specs;
`verify` aggregate; session validate/image checks.
_Verify:_ the three script+lib pairs exist; `INTEGRATION_CHECKS` in
`integration-check.ts`; `verify` script in `package.json` (C1/C2).

### Step 9 — Coverage checklist
Add the seven-box checklist confirming each category has a cited seam.
_Verify:_ C3 — seven categories, story order, one `_pending_` line each.

### Step 10 — Full citation audit
Run the audit: grep each cited path/key across the repo; confirm zero dangling
citations. Record the command + result in `progress.md`.
_Verify:_ C1+C2+C3 all green.

## Commit strategy

Single logical unit (one inventory file + RDSPI artifacts). Lisa owns commit +
phase transitions per the loop contract, so this pass writes artifacts and records
the audit result in `progress.md` rather than issuing its own `git commit`.

## Risks / watch-items

- **Over-reach into coupling verdicts** — easy to start writing "this binds to the
  author." Hold the line: seam + `_pending_` only; the verdict is T-007-01-02.
- **Stale citation** — a cited `database_id`/hostname could drift. Mitigated by
  Step 10 grepping the live files, not memory.
- **Category vocabulary drift** — must use the story's exact seven words, in order,
  or the coupling pass can't target sections.
