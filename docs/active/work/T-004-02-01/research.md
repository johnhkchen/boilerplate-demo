# T-004-02-01 — stable-demo-on-custom-domain — Research

Descriptive map of what exists today, gathered 2026-07-10. No solutions proposed here.

## The ticket in one line

Put the already-deployed App Worker (`demo-runway`) on the branded hostname
`demo.b28.dev` via a Workers custom domain, with the public surface limited to the
built app, and document hostname-depth/cert behavior plus WebSocket-path status.

## What is deployed today

- **Worker:** `demo-runway` exists and is live in account
  `caaec605822549aee441310a1c77bb43` (John.hk.chen@gmail.com's Account).
  `npx wrangler deployments list` shows a healthy 100% deployment
  (latest version `49830810-…`, plus two secret-change versions today).
- **workers.dev:** `https://demo-runway.john-hk-chen.workers.dev/` answers
  `HTTP/2 200` with `content-type: text/html`. This is the verification URL the
  docs currently reference (`docs/knowledge/deployment.md`).
- **Deploy contract:** `npm run deploy` = `astro build && wrangler deploy`, run
  identically locally and by CI (`.github/workflows/deploy.yml`) on every push to
  `main`, after `npm run verify` and remote D1 migrations. CI is non-interactive
  (`CLOUDFLARE_API_TOKEN` with Workers Scripts + D1 edit permissions).

## Current wrangler.jsonc shape

`wrangler.jsonc` (44 lines) declares:

- `name: demo-runway`, `main: @astrojs/cloudflare/entrypoints/server`,
  `compatibility_date: 2026-07-10`, `nodejs_compat`.
- `assets: { directory: ./dist, binding: ASSETS }` — static-first; Cloudflare
  serves every static asset from the edge and only `/api/*` invokes the Worker
  (Astro `output: 'static'`, three routes opt out via `prerender = false`).
- `d1_databases`: `BACKSTAGE_DB` (id `c95861d4-…`), migrations in `./migrations`.
- `vars.DEMO_FAULT: "off"`; declared required secrets `DEMO_SIGNING_KEY`,
  `DEMO_PASSCODE` (values live in Cloudflare, never in the repo).
- Observability: logs at 100% head sampling, traces at 10%.
- **No `routes`, no `workers_dev`, no custom domain config of any kind.** The
  Worker is reachable today only because `workers.dev` defaults to enabled.

## DNS / zone reality for b28.dev

- `b28.dev` is on Cloudflare nameservers (`weston.ns.cloudflare.com`,
  `arely.ns.cloudflare.com`) and serves John's site (200, `cf-cache-status: HIT`),
  i.e. the zone is Cloudflare-managed and, by every signal, in the same account
  wrangler is authenticated to.
- **`demo.b28.dev` already has a proxied DNS record.** It resolves to Cloudflare
  anycast IPs (104.21.94.240 / 172.67.141.159) and returns **`HTTP/2 530` with body
  `error code: 1033`** — the Cloudflare Tunnel error. So there is a **dangling
  CNAME to a Cloudflare Tunnel** left over from an earlier tunnel-based demo.
  Any Workers custom-domain attach on this hostname must displace that record;
  Cloudflare's API refuses unless `override_existing_dns_record` is set, and
  wrangler surfaces this as an interactive confirmation prompt (which **fails in
  non-interactive contexts like CI**).
- HTTPS already terminates for `demo.b28.dev` (the 530 arrived over valid TLS),
  consistent with Universal SSL's `*.b28.dev` + apex certificate. `demo.b28.dev`
  is exactly one label under the zone apex, so it sits inside Universal SSL's
  wildcard coverage. A *deeper* name (e.g. `x.demo.b28.dev`) would not.

## The app's public surface (what demo.b28.dev would serve)

Pages and API routes (`src/pages/`):

- `/` (`index.astro`) — static, prerendered.
- `/backstage` (`backstage.astro`) — static page; its data flows are
  passcode-gated at the API layer.
- `/api/receipt` (`receipt.ts`) — server-side, signs a receipt with
  `DEMO_SIGNING_KEY`; target of `npm run ops:check`.
- `POST /api/backstage/entries`, `GET /api/backstage/feed` — server-side,
  gated by the shared low-stakes `DEMO_PASSCODE`, backed by D1.

All logic lives in pure cores under `src/lib/`; the API edges own env/Response.

### WebSocket status

`grep -ri "websocket\|ws://\|wss://"` across `src/`, `scripts/`,
`astro.config.mjs` finds **nothing**. The feed endpoint is a plain JSON GET (no
SSE, no streaming, no `Upgrade`). The app as shipped has **zero WebSocket
paths** — the "verify WS paths" acceptance clause can only be satisfied by
verifying and documenting their *absence* (plus noting that Workers custom
domains do carry WS fine, which matters for the *sessions* hostnames later —
but those live on the separate Sessions Worker per the decision record).

### "Editor/admin port" status

Workers expose no ports at all. The only admin-ish surface in the app is the
backstage door (passcode-gated by design, part of the product). The clause in
the AC traces to the epic's guardrail (decision record, PRD §13.2): the *public*
hostname must never front the session editor/dev-server — those belong to the
physically separate Sessions Worker on `demo-<slug>` / `code-<slug>` hostnames.
Today no Sessions Worker exists (`S-004-03` is not started), so the check is
that `demo.b28.dev` binds only the App Worker and nothing else answers there.

## Binding decisions already taken (must honor)

From `docs/knowledge/demo-environments-decisions.md` (Decision 3):

- `demo.b28.dev → App Worker (public) = the promoted BUILD, as a Workers version`.
- Promotion (next ticket, T-004-02-02, depends on this one) = `wrangler versions
  upload` + `versions deploy` — an atomic pointer move on this same Worker. The
  custom domain must therefore be attached to the **Worker**, not to a specific
  version or a route+DNS pair that promotion would have to touch.
- Session hostnames are first-level under `b28.dev` precisely to stay inside the
  single `*.b28.dev` Universal SSL cert — the same hostname-depth logic applies
  to `demo.b28.dev` and is what the AC wants documented.

## Where documentation lives

- `docs/knowledge/deployment.md` — the operator bootstrap + release/verify guide;
  currently verifies via `https://demo-runway.<workers-subdomain>.workers.dev/`.
  This is the natural home for custom-domain bootstrap and cert-behavior notes
  (the fuller operator guide `docs/demo-environments.md` is a later E-004
  deliverable, per the decision record).
- `docs/knowledge/demo-environments-decisions.md` — decision record (do not
  restate implementation detail there).

## Verification machinery available

- `npm run verify` — unit tests, typecheck (`astro check`, `tsc`,
  `wrangler types --check`), integration check, backstage Playwright flow,
  and `deploy:dry` (`astro build && wrangler deploy --dry-run`). A wrangler
  config error would fail `deploy:dry` and thus CI's gate.
- `npm run ops:check` — hits `OPS_CHECK_URL` (defaults to the receipt route) and
  asserts the signed-receipt contract; already parameterized by URL, so it can
  point at the custom domain unchanged.
- `worker-configuration.d.ts` is generated from wrangler.jsonc
  (`npm run worker:types`); config changes may regenerate it (routes do not add
  bindings, so likely no type change — to confirm at implement time).

## Constraints and assumptions surfaced

1. **The dangling tunnel CNAME is the main operational hazard.** First
   custom-domain attach must override it; CI cannot answer wrangler's override
   prompt, so the first attach is a one-time interactive/bootstrap action (fits
   the repo's existing "one-time bootstrap" pattern) or an explicit API call.
2. **Zone must be in the same account as the Worker** for Workers custom
   domains. All evidence says yes; the attach itself is the definitive test.
3. **CI token scope:** the deploy token has "Workers Scripts + D1" permissions.
   Once the custom domain exists, routine `wrangler deploy` does not need to
   re-attach it (custom domains persist on the Worker), so CI should keep
   working — but the first post-change CI run must be watched for a permission
   or re-attach prompt regression.
4. **workers.dev stays reachable** unless explicitly disabled
   (`workers_dev: false`). Whether to keep it is a design question: docs use it
   for verification, and version preview URLs (relevant to T-004-02-02) are
   workers.dev-based.
5. Local dev (`astro dev`, `wrangler dev`) ignores custom domains; no impact.

## Open questions carried to Design

- Attach mechanism: `routes: [{ pattern, custom_domain: true }]` in
  wrangler.jsonc (declarative, survives redeploys) vs. one-time dashboard/API
  attach (config stays silent). Which serves the template-nature of this repo?
- Keep or disable workers.dev once the branded domain is live?
- How to clear/override the stale tunnel CNAME non-destructively, and what the
  documented bootstrap step looks like for the next operator.
- Where exactly the hostname-depth/cert note lands so the AC's "documented" is
  checkable (deployment.md section vs. new knowledge file).
