# T-004-02-01 — stable-demo-on-custom-domain — Review

Self-assessment and handoff. Read the ⚠ CRITICAL item first.

## ⚠ CRITICAL — one operator action remains, and it gates the next push

The Workers custom-domain attach for `demo.b28.dev` is blocked by a leftover
**dashboard-managed tunnel CNAME** on the hostname (from the retired
`pivotal-demo` tunnel). Cloudflare refuses to override records managed by
another product (API error 100117) even with every override flag set, and no
credential on this machine or in CI holds DNS-record scope — deliberately so.

**Do this once:** Cloudflare dashboard → `b28.dev` zone → DNS → delete the
`demo.b28.dev` CNAME → `npm run deploy` (or push `main`). The committed config
then attaches the domain, Cloudflare creates the DNS record and certificate,
and the hostname goes live.

**Until then, `npm run deploy` exits 1 at the trigger step** (the code upload
itself still succeeds and workers.dev keeps serving). A push to `main` before
the deletion turns the deploy workflow red at that step, with the site
unharmed. Everything is verified up to this single action; the dead tunnel
itself and its ingress rule were already cleaned up during implementation
(details in progress.md Step 3).

## What changed

| File | Change |
|---|---|
| `wrangler.jsonc` | `routes: [{ pattern: "demo.b28.dev", custom_domain: true }]` + explanatory comment; `workers_dev: true` and `preview_urls: true` pinned (declaring routes silently flips both defaults to off); header's template-adopter note extended to cover the custom domain |
| `docs/knowledge/deployment.md` | Bootstrap step 2: delete any pre-existing DNS record on the branded hostname before first deploy; verification now targets `https://demo.b28.dev/` with workers.dev reframed as the zone-independent Worker-health probe; new closing section documents hostname-depth/cert behavior, WebSocket-path absence, and the public-surface boundary |

Platform-side (not files): dead tunnel `pivotal-demo` deleted (was down since
March, sole ingress was this hostname); its config's `demo.b28.dev` ingress
rule removed first. Prior config is recorded in progress.md for reversibility.

Commits (local, unpushed): `4822ec2`, `e7653de`, `4b27f28` — config, defaults
pin, docs. RDSPI artifacts in `docs/active/work/T-004-02-01/` are uncommitted,
matching the other in-flight E-004 board files in the working tree.

## Acceptance criteria status

- *demo.b28.dev serves the built app over HTTPS via a Workers custom domain* —
  **config committed and validated; live serving blocked on the CRITICAL
  operator step above.** The Worker itself is verified live (workers.dev
  200 HTML; receipt endpoint answers ops:check).
- *No editor/admin port publicly bound* — ✅ verified and documented: Workers
  bind no ports; the hostname will front only static assets + three API
  routes; backstage feed without a passcode → 401; session editor surfaces
  are explicitly out of scope for this hostname.
- *Hostname-depth/cert behavior documented* — ✅ deployment.md new section
  (depth-1 inside `*.b28.dev` Universal SSL + managed edge cert; deeper names
  fall outside the wildcard; keep public hostnames at depth 1).
- *App WebSocket paths verified* — ✅ zero WS usage in `src/`, `scripts/`,
  config, and built `dist/`; documented, including that custom domains carry
  WS natively if a route ever adds one.

## Test coverage

- **No new unit tests, deliberately:** the diff is one config block and docs —
  no new logic. The existing `npm run verify` gate covers the config via
  `deploy:dry`; both `deploy:dry` and `worker:types:check` were run green
  after each wrangler.jsonc change.
- **Runtime verification** (progress.md Step 4): home page, backstage page,
  passcode gate (401), receipt endpoint via `ops:check` (passes key-less;
  signed verification is owner-side because the production key is
  out-of-band), WS-absence sweep on the shipped artifact.
- **Gaps:** (1) the custom-domain serving path itself is unverified until the
  operator step — re-run `curl --fail https://demo.b28.dev/` and
  `OPS_CHECK_URL=https://demo.b28.dev/api/receipt npm run ops:check`
  afterwards (now the documented release check); (2) full `npm run verify`
  (Playwright flow) was not re-run locally — the diff touches no code path it
  exercises, and CI runs it on push regardless.

## Open concerns

1. **First post-attach CI deploy** should be watched once: expected to
   re-assert the domain idempotently under the Workers-Scripts-scoped CI token
   (the account's other `*.b28.dev` custom-domain Workers deploy this way),
   but this Worker hasn't done it yet.
2. **`wrangler triggers deploy` is experimental** — used only during
   diagnosis, not in any committed path.
3. **Rollback:** removing the `routes` block and redeploying detaches the
   domain; the hostname then goes dark (its old CNAME is gone — it pointed at
   a dead tunnel, so nothing of value was lost). workers.dev is unaffected
   throughout.
4. **T-004-02-02 (promote/rollback)** builds on the property that the domain
   binds to the Worker, not a version — pinned `preview_urls: true` already
   provides the pre-promotion smoke-test URLs it will want.
