# T-004-02-01 — stable-demo-on-custom-domain — Design

Grounded in `research.md` (same directory). Four decisions to make: attach
mechanism, fate of workers.dev, handling of the stale tunnel CNAME, and where
the required documentation lands.

## Decision 1 — Attach mechanism: declarative custom domain in wrangler.jsonc

### Options considered

**A. Declarative `routes` entry with `custom_domain: true` (chosen).**

```jsonc
"routes": [{ "pattern": "demo.b28.dev", "custom_domain": true }]
```

Wrangler asserts the custom domain on every deploy; Cloudflare creates the DNS
record and manages the edge certificate for the hostname. The binding between
"this Worker" and "this hostname" lives in the repo, next to every other piece
of the deploy contract.

**B. One-time attach via dashboard/API; wrangler.jsonc stays silent.**
The hostname works the same, but the infrastructure becomes invisible: a fresh
clone of this template deploys a Worker with no hint that a branded domain is
part of the story, and drift (someone detaches the domain) is undetectable from
the repo. This repo's explicit philosophy — stated in `deploy.yml` ("the deploy
contract lives in the repository, not in this CI vendor") and in the
wrangler.jsonc header comments — is that config is code. Rejected.

**C. Classic zone route (`demo.b28.dev/*`) + manually managed proxied DNS
record.** Two moving pieces (route + DNS record) that promotion and rollback
must never touch but an operator can independently break; certs ride on
Universal SSL only. Workers Custom Domains exist precisely to collapse this
pair into one managed object. Rejected.

### Why A fits this ticket's future

T-004-02-02 makes promotion a Workers **version** pointer-move
(`versions deploy`) on this same Worker. A custom domain attaches to the
*Worker*, so promotion/rollback never touches DNS, routes, or certs — exactly
the "atomic pointer-move" property the decision record demands. Options B and C
also technically satisfy this, but A is the only one where the invariant is
visible and reviewable in the repo.

Template-reuse note: like the D1 `database_id`, the hostname is a per-account
value. The wrangler.jsonc comment block already tells adopters to strip the
`database_id`; the same comment gains one line about replacing/removing the
custom domain. Consistent with existing precedent, no new mechanism.

## Decision 2 — workers.dev stays enabled

Keep `demo-runway.john-hk-chen.workers.dev` alive (i.e. do not set
`workers_dev: false`).

- It is the existing verification URL in `docs/knowledge/deployment.md` and the
  natural "is the Worker itself healthy?" probe when the branded hostname has a
  zone-level problem (WAF rule, zone hold, cert issue) — the two failure domains
  stay distinguishable.
- T-004-02-02's promotion flow will want **version preview URLs**
  (`<version>-demo-runway.<subdomain>.workers.dev`) to smoke-test a version
  before aliasing it live; those are workers.dev-family hostnames.
- The AC's "no editor/admin port publicly bound" is not violated: workers.dev
  serves the *same* public app, and Workers expose no ports. The only gated
  surface (backstage) is passcode-gated identically on both hostnames by design.

Docs will name `demo.b28.dev` as the canonical public URL and demote
workers.dev to an operational probe. Rejected alternative — disabling
workers.dev for "one public front door" purity — costs the health-probe and
preview-URL affordances and buys nothing the AC asks for.

## Decision 3 — The stale tunnel CNAME: one-time interactive bootstrap override

`demo.b28.dev` currently carries a dangling CNAME to a dead Cloudflare Tunnel
(error 1033). The Workers custom-domain attach must override it
(`override_existing_dns_record`), which wrangler exposes as an interactive
confirmation on first deploy — and which **fails in non-interactive CI**.

**Chosen:** perform the first attach as a one-time, human-confirmed local
deploy (`npm run deploy`, answer the override prompt), then document it as a
numbered step in the existing "One-time bootstrap" section of
`deployment.md`. This matches the repo's established pattern: Worker creation,
secrets, and D1 migration are already deliberate one-time local acts, with CI
handling only the steady state. After the attach, the custom domain persists on
the Worker; subsequent CI deploys see no conflict and no prompt.

Rejected alternatives:

- **Pre-deleting the DNS record via API/dashboard as a required step** — more
  invasive instructions for the operator, and the override path exists exactly
  for this; also leaves a window where the hostname NXDOMAINs.
- **Automating the override in CI** (env-forced yes) — grants CI standing
  authority to seize any hostname in the zone that a future config typo names.
  A one-time human confirmation is the right friction for a DNS takeover.

Risk noted: if the interactive prompt cannot be driven from the implementing
agent's non-TTY shell, the fallback order is (1) run the deploy under a
pseudo-TTY (`script -q /dev/null …`), (2) attach via the Custom Domains API
with `override_existing_dns_record: true` and record the exact call in
progress.md, (3) leave the attach as a documented operator step and mark the
runtime verification blocked. (1) or (2) is expected to succeed.

## Decision 4 — Documentation lands in docs/knowledge/deployment.md

The AC requires hostname-depth/cert behavior "documented". Options: a new
knowledge file vs. extending `deployment.md`. **Chosen: extend
`deployment.md`** — it is the operator-facing deploy guide, already owns the
bootstrap sequence and verification URLs, and a separate file would fragment
the deploy story for one section. The fuller `docs/demo-environments.md`
operator guide is explicitly a later E-004 deliverable (decision record); this
ticket must not front-run it, only cover the stable-domain slice.

Content the new section must carry (per AC):

1. **Hostname depth / certs:** `demo.b28.dev` is one label below the zone apex,
   inside Universal SSL's `*.b28.dev` wildcard; the custom-domain attach
   additionally has Cloudflare issue and renew the hostname's edge cert
   automatically. Deeper names (`x.demo.b28.dev`) fall outside the universal
   wildcard — the same depth rule that shaped the `demo-<slug>`/`code-<slug>`
   session naming in the decision record — so keep public hostnames at depth 1.
2. **WebSocket paths:** the app exposes none (verified by sweep — no
   `ws://`/`wss://`/Upgrade usage; the backstage feed is plain JSON GET), so no
   WS-specific domain config is needed; Workers custom domains would carry WS
   if the app ever adds one. Session-surface WS belongs to the Sessions Worker
   tickets, not this hostname.
3. **Public-surface statement:** demo.b28.dev fronts only the App Worker's
   built app (static assets + the three `/api` routes); no editor/dev-server/
   admin surface is bound there, and Workers expose no ports. The session
   editor lives on separate Access-protected hostnames (later tickets).
4. **Bootstrap step + verification:** the one-time override deploy, then
   `curl --fail https://demo.b28.dev/` and
   `OPS_CHECK_URL=https://demo.b28.dev/api/receipt npm run ops:check`.

## Verification strategy (feeds Plan)

- **Config validity:** `npm run deploy:dry` (already inside `npm run verify`)
  must pass with the new `routes` block — this is the regression gate CI runs.
- **Runtime:** after the bootstrap attach — `curl --fail -I https://demo.b28.dev/`
  (200, HTML, HTTPS), `ops:check` against the custom domain (exercises a
  server-side `/api` route end-to-end, proving the Worker — not a cached page —
  answers on the hostname), and a backstage-page fetch.
- **Negative/absence checks:** re-run the WS sweep on `dist/` after build (the
  shipped artifact, not just source); confirm the 530/1033 is gone.
- **No unit tests:** this ticket changes one config block and docs; there is no
  new logic to unit-test. The `deploy:dry` gate plus live-hostname checks are
  the appropriate coverage, and review.md must say so explicitly.

## Out of scope (guarded against)

- Promotion/rollback mechanics (`versions upload/deploy`) — T-004-02-02.
- Sessions Worker, `demo-<slug>`/`code-<slug>` hostnames, Access policies —
  S-004-03/S-004-04.
- Deleting the dead tunnel itself (cleanup of the tunnel object is operator
  hygiene, not needed for the hostname to work once overridden).
