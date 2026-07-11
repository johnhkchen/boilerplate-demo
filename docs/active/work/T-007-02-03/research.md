# Research — T-007-02-03 transfer-resources-domain-data

What exists today around the four transfer categories this ticket owns — **1 Repo,
2 Cloudflare resources, 3 Domain, 4 Data** (owner column, `../T-007-02-01/transfer-signal.md`)
— and the constraints any attempt must run inside. Descriptive only; the approach
is chosen in `design.md`.

## The ticket in one line

Attempt to make the Worker, storage, and stored data run under the new-owner
context, re-point the domain off the author's `b28.dev` zone, and record every
category as clean or gap **with the failing seam named** (acceptance criterion).

## Inherited stage — what T-007-02-01 already provides

- **`../T-007-02-01/scrub-fresh-owner.sh`** — re-runnable harness. `git archive HEAD`
  → clean tree at `${TMPDIR}/fresh-owner-context` (default), drops `.git`,
  `.dev.vars`, `.promote`, `.wrangler`, `docs/active/**`; scrubs the five active
  author couplings to loud placeholders; asserts nothing survived. Exit 0/1/2.
- **`../T-007-02-01/transfer-signal.md`** — the scorecard. Three states, each must
  cite a seam or command: `pass` / `gap` (names the exact failing seam) /
  `deferred` (names the metered live step). Baselines after scrub: row 1 Repo
  `pass`(placeholder), row 2 Resources `deferred`, row 3 Domain `pass`(placeholder),
  row 4 Data `deferred`. "Downstream tickets move their owned rows to pass or gap
  as they attempt the real transfer."
- **Placeholders it installs**: routes → `demo.NEW-OWNER-ZONE.example`,
  `demo-session.NEW-OWNER-ZONE.example`, `code-session.NEW-OWNER-ZONE.example`;
  `SESSION_DOMAIN` → `NEW-OWNER-ZONE.example`; `SESSION_REPOSITORY_URL` →
  `https://github.com/NEW-OWNER/REPO.git`; `d1_databases[0].database_id` → removed
  (per the config's own instruction so a new account can provision fresh).

## The two deployables and their storage

- **App Worker** (`wrangler.jsonc`, name `demo-runway`): Astro static assets +
  `/api/*` (`src/pages/api/receipt.ts`, `api/backstage/entries.ts`, `api/backstage/feed.ts`).
  Storage: **D1** binding `BACKSTAGE_DB` (`migrations/0001_create_backstage_entries.sql`,
  table `backstage_entries(id, type, url, text, submitted_at)`), read/written only
  via `src/lib/backstage-store.ts → saveEntry / listEntries`. Secrets required:
  `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`. `workers_dev: true` keeps a zone-independent
  health host.
- **Session Worker** (`wrangler.sessions.jsonc`, name `demo-runway-sessions`,
  `main: src/session-worker.ts`): container (`Dockerfile.session`, `Sandbox` class)
  + two Durable Objects (`Sandbox`, `SESSION_COORDINATOR` = `SessionCoordinator`).
  Storage: one `SessionRecord` in DO storage under `SESSION_STORAGE_KEY` — the
  desired session state. `workers_dev: false`; only the two Access-gated custom
  domains serve it.
- **No KV namespace exists in either config.** The ticket text says "KV/DO
  storage"; the real storage surface is **D1 + DO**. Recorded here so the log can
  say so explicitly instead of silently reinterpreting.

## Live-account reality (checked 2026-07-11)

`npx wrangler whoami`: one OAuth login, **john.hk.chen@gmail.com** — the author's
own account (id `caaec605…`). There is **no second Cloudflare account** on this
machine. Consequences:

- A real "deploy under the new owner" cannot be run here; per the story's honest
  boundary it is the **metered manual leg** — named, deferred, never faked.
- Deploying the fresh-owner context from this machine would land in the
  **author's** account and, worse, `npm run deploy` from a copy **overwrites the
  production `demo-runway` Worker** (T-006-02-01 rehearsal finding #2,
  `evidence/deploy-dry.txt` there). Any attempt script must never call a
  mutating `wrangler deploy` against the real account.
- What *can* run without an account: `wrangler deploy --dry-run` (validates
  build+config, no API call), `wrangler dev` local mode (workerd + local D1/DO
  state), `wrangler d1 … --local` (local sqlite under a `--persist-to` dir).

## Per-category seams as they stand

**1 Repo.** Coupling = committed clone URL
(`wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`, consumed by
`src/lib/session-lifecycle.ts → buildProvisionCommand` →
`src/session-worker.ts → provisionWorkspace`) + `git remote origin`
(`johnhkchen/boilerplate-demo.git`). The scrubbed tree has **no `.git` at all**
and the placeholder URL. `parseSessionConfig` (session-lifecycle.ts:283) requires
the URL to be credential-free **HTTPS** — a local `file:///…` stand-in repo would
be *rejected by the runtime's own validation*.

**2 Cloudflare resources.** All declarations are reproducible; account coupling =
the removed `database_id` + `CLOUDFLARE_ACCOUNT_ID` (CI secret). Open question a
dry run must answer: does `wrangler deploy --dry-run` / local dev accept a
`d1_databases` entry **without** `database_id`, or is a placeholder id the
documented owner fill-in? `npm run deploy:dry` = `astro build && wrangler deploy
--dry-run`; `npm run session:validate` ends in `wrangler deploy --dry-run --config
wrangler.sessions.jsonc` (its container/DO/config parse gate).

**3 Domain.** Routes + `SESSION_DOMAIN` scrubbed to `NEW-OWNER-ZONE.example`.
Two live findings from this research pass:

- `src/lib/session-lifecycle.ts:94` — `DNS_NAME = /^…[a-z0-9-]…$/` — **lowercase
  only**, and `parseSessionConfig` throws `SESSION_DOMAIN must be a lowercase DNS
  name` otherwise. The harness placeholder `NEW-OWNER-ZONE.example` is
  **uppercase**: the scrubbed Session Worker cannot even parse its own config
  until the owner fills a real (lowercase) zone. Placeholder-vs-runtime seam.
- `test/promote.test.mjs:246` — test `extractCustomDomain reads the real
  wrangler.jsonc` asserts the literal `demo.b28.dev`. Re-pointing the domain
  **fails the shipped `npm test`** until that expectation is updated (the
  T-007-01-02 inventory predicted "tests spell b28.dev … will evolve with that
  config"; this is the concrete seam).
- Host derivation is consistent by construction: `previewHost = demo-${slug}.${domain}`,
  `editorHost = code-${slug}.${domain}` (session-lifecycle.ts:322) — with
  `slug=session` a single-zone change re-points both scrubbed session routes.
- `NEW-OWNER-ZONE.example` is RFC 2606 reserved and unroutable by design, so "the
  demo resolves on a domain off b28.dev" has no live observable without a real
  zone — only local serving (`127.0.0.1` / `*.workers.dev`) stands in.

**4 Data.** Rows travel only via `BACKSTAGE_DB`; state via `SESSION_COORDINATOR`.
- `wrangler d1 export BACKSTAGE_DB --local` **works** (probed; wrote a valid but
  row-empty dump — the repo's local D1 currently holds no backstage rows, so a
  drill needs seeded fixture rows to make the move observable).
- `wrangler d1 … --local --persist-to <dir>` lets a drill keep its own sqlite
  state without touching the author's `.wrangler/state`.
- **No wrangler command exports Durable Object storage.** The only read path to
  the `SessionRecord` is the Worker's own control API (`/control/session/status`);
  there is no offline export/import seam for DO state.
- `/api/backstage/feed` (GET) returns every stored row, gated by `DEMO_PASSCODE`
  — the natural end-to-end observable that "the moved data serves under the
  new-owner context".

## Adjacent tickets (seam boundaries)

- **T-007-02-02** (parallel, codex) owns rows 5 Configuration and 6 Secrets:
  secret **rotation** proof + leak/ops checks. This ticket must still *install
  fresh throwaway local values* (`.dev.vars` was dropped by the scrub) merely to
  boot the Worker — that is context setup, not rotation proof; no overlap.
- **T-007-02-04** owns row 7 Checks: running the demo's own check suite against
  the transferred deployment. This ticket hands it a context + recorded gaps; it
  does not run the full check trio itself.

## Constraints and hazards

- **PE-7 honest boundary** (story): attempt and observe; a category attempted and
  failed is a `gap`, never `deferred`; `deferred` only for the metered live leg.
- **Untouched-runtime guarantee** (story scope): "drill scripts may be added but
  product runtime code is not rewritten." All work lands under
  `docs/active/work/T-007-02-*/`; `src/**`, configs, tests stay untouched.
- **Agent-session daemonization hazard** (`[[boilerplate-demo-playwright-daemonization]]`,
  T-006-02-01 finding #5): `astro dev`/Playwright webServers are unreliable under
  a coding-agent session. A drill that must serve HTTP should prefer
  `wrangler dev` on the built `dist/` and direct `curl` probes.
- `npm install` inside a clean copy exits 0 but postinstall scripts may need
  approving on stricter setups (T-006-02-01 finding #7); workerd resolved fine on
  this machine.
- Node v26.5.0, wrangler 4.110.0 available; local D1/DO state dirs writable.

## Assumptions surfaced

1. The scorecard file (`../T-007-02-01/transfer-signal.md`) is the shared ledger
   this ticket updates for rows 1–4 — its own text says downstream tickets move
   their rows. Rows 5–7 belong to other tickets and must not be touched.
2. "New-owner context" for every local attempt = the scrub harness output plus
   the owner fill-ins a real new owner would make (real lowercase zone stand-in,
   fresh local secrets, placeholder local D1 id) — each fill-in named in the log.
3. Live legs (second-account deploy, real zone delegation, real repo push,
   remote data import) remain metered and deferred with the exact step named.
