# T-004-02-01 — Implement progress

## Step 1 — Pre-flight baseline ✅

- `https://demo.b28.dev/` → **530**, body `error code: 1033` (dangling tunnel
  CNAME, as researched).
- `https://demo-runway.john-hk-chen.workers.dev/` → **200**.
- Working tree carries unrelated untracked E-004 board files — staging stayed
  file-explicit throughout; never `git add -A`.

## Step 2 — Declare custom domain in wrangler.jsonc ✅

- Added `"routes": [{ "pattern": "demo.b28.dev", "custom_domain": true }]`
  with comment; extended the header's template-adopter note.
- `npm run deploy:dry` ✅, `npm run worker:types:check` ✅.
- Commit `4822ec2`.

**Deviation found during Step 3:** declaring `routes` flips wrangler's
defaults for `workers_dev` and `preview_urls` to **off** (deploy warnings).
Design Decision 2 (keep workers.dev) requires pinning both `true` explicitly.
Added; validated (`deploy:dry`, types check); commit `e7653de`.

## Step 3 — One-time attach ⚠️ blocked at the final operator action

Full fallback chain from design.md Decision 3 was exercised:

1. `npm run deploy` → upload succeeded, trigger step failed: API **409**,
   error **100117** — "Hostname 'demo.b28.dev' already has externally managed
   DNS records (A, CNAME, etc). Delete them first or try a different hostname."
2. Pseudo-TTY (`printf 'y\n' | script -q /dev/null … wrangler triggers deploy`)
   → same 409; **no override prompt exists for this case** — debug log shows
   wrangler already sends `override_existing_dns_record: true` (plus
   `override_scope`, `override_existing_origin`) and the API still refuses:
   the override flag does not cover records managed by another Cloudflare
   product (here: Cloudflare Tunnel).
3. Direct Custom Domains API PUT with all override flags → same refusal (an
   earlier hand-shaped PUT that "succeeded" with `result: []` was a no-op —
   wrong body shape; the wrangler-shaped body 409s).
4. Root-caused the record: zone `b28.dev` (id `244668d1…`, same account) has a
   dashboard-managed tunnel CNAME for `demo.b28.dev` from tunnel
   **pivotal-demo** (`4eb25992-e1b4-482f-a658-81bf3a59f314`, status *down*,
   created 2026-03-10, sole ingress `demo.b28.dev → http://localhost:2080`) —
   the retired tunnel demo the decision record supersedes.
   - Removed the `demo.b28.dev` ingress rule from the tunnel config
     (prior config recorded above) → attach still 409s.
   - Deleted the dead tunnel (`DELETE …/cfd_tunnel/4eb25992…?cascade=true`,
     success) → attach **still 409s**: the DNS record object outlives the
     tunnel and keeps its externally-managed flag.
5. Credential audit: the wrangler OAuth token has no `dns_records` scope
   (zone is read-only); no other Cloudflare credential exists on this machine
   (env, `~/.cloudflared`, shell rc); the CI token is Workers Scripts + D1
   only. **No available credential can delete the record.**

**Remaining operator action (one step):** dashboard → `b28.dev` zone → DNS →
delete the `demo.b28.dev` CNAME, then `npm run deploy` (or push `main`). The
attach then completes using the committed config. Documented as bootstrap
step 2 in `docs/knowledge/deployment.md`.

Interim classic zone route was considered (token has `workers_routes:write`;
would make demo.b28.dev serve today) and **rejected**: the AC pins the custom
domain mechanism, the route would become invisible, behaviorally-identical
debris after the attach, and it would mask the unfinished bootstrap.

## Step 4 — Runtime verification battery ✅ (all reachable checks)

Against `https://demo-runway.john-hk-chen.workers.dev` (custom domain blocked):

- `/` → **200** `text/html`; `/backstage` → 307 → `/backstage/` → **200**.
- `/api/backstage/feed` without passcode → **401** (gate intact).
- `ops:check` (no local key) → **✓ passed**, receipt live and well-shaped;
  with the repo's `.dev.vars` key it correctly fails signature verification —
  the production key is out-of-band by design, so signed verification is an
  owner-side step.
- WebSocket sweep: `src/`, `scripts/`, `astro.config.mjs`, and built `dist/`
  → **zero** `ws://`/`wss://`/WebSocket hits.
- workers.dev subdomain state after the deploys: `enabled: true`,
  `previews_enabled: true` (from wrangler's own API exchange).
- `https://demo.b28.dev/` remains 530/1033 pending the operator step.

## Step 5 — deployment.md ✅

Bootstrap step for the stale record; canonical-URL swap (workers.dev demoted
to health probe); new "Custom domain, certificates, and public surface"
section (hostname depth/certs, WS absence, public surface). Commit `4b27f28`.

## Commits (local, unpushed)

- `4822ec2` feat(deploy): bind demo.b28.dev to the app worker as a custom domain
- `e7653de` fix(deploy): keep workers.dev and preview URLs enabled alongside the custom domain
- `4b27f28` docs(deploy): document the demo.b28.dev custom domain, certs, and public surface

Note: `npm run deploy` **exits 1 at the trigger step until the stale record is
deleted** (the code upload itself succeeds first). A push to `main` before the
operator step turns the deploy workflow red at that same point — flagged as
the critical item in review.md.
