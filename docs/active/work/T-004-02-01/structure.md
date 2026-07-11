# T-004-02-01 — stable-demo-on-custom-domain — Structure

The blueprint: which files change, what shape the changes take, and the order
that matters. No new modules, no source-code changes — this ticket is one
config block, one docs section, and a one-time platform action, all verified.

## File inventory

| File | Action | Purpose |
|---|---|---|
| `wrangler.jsonc` | modify | Add the `routes` custom-domain block + adopter comment |
| `docs/knowledge/deployment.md` | modify | Bootstrap step, canonical-URL swap, new "Custom domain, certificates, and public surface" section |
| `docs/active/work/T-004-02-01/progress.md` | create | Implement-phase progress log |
| `docs/active/work/T-004-02-01/review.md` | create | Review-phase handoff |
| *(platform, not a file)* | one-time action | Custom-domain attach overriding the dangling tunnel CNAME |

Explicitly **not** touched: `src/**` (no app logic changes), `scripts/**`
(`ops-check.ts` is already URL-parameterized), `.github/workflows/deploy.yml`
(steady-state CI needs no new step; the attach is one-time bootstrap),
`worker-configuration.d.ts` (routes add no bindings — confirm via
`worker:types:check` inside the verify gate), `docs/knowledge/demo-environments-decisions.md`
(decision record stays a record; no restated implementation).

## Change 1 — wrangler.jsonc

Insert after the `"main"` line (keeps trigger config near the top, before
bindings), following the file's existing commented style:

```jsonc
// The branded public hostname. A Workers custom domain binds demo.b28.dev to
// this Worker: Cloudflare creates the DNS record and manages the edge cert;
// promotion/rollback (Workers versions) never touches DNS. Replace or remove
// this hostname when deploying the template to a different zone/account.
"routes": [{ "pattern": "demo.b28.dev", "custom_domain": true }],
```

Shape notes:

- `custom_domain: true` is what distinguishes a managed Custom Domain from a
  classic zone route — no `zone_name` needed (the hostname resolves the zone).
- The existing header comment ("Remove `database_id` before deploying this
  template to a different account") gains a parallel clause naming the custom
  domain, so template adopters get one consolidated "per-account values" note.
- No `workers_dev` key is added (absent = enabled = Decision 2).

## Change 2 — docs/knowledge/deployment.md

Three surgical edits, preserving the document's terse operator voice:

1. **"One-time bootstrap" list gains a step** (after secrets/migration, before
   the GitHub-secrets step): run `npm run deploy` locally and confirm wrangler's
   prompt to override the existing `demo.b28.dev` DNS record (the dangling
   tunnel CNAME); state that this is deliberate and one-time, and that CI never
   needs to answer it because the domain persists on the Worker.
2. **"Release and verification" swaps to the canonical hostname:**
   `curl --fail https://demo.b28.dev/` and
   `OPS_CHECK_URL=https://demo.b28.dev/api/receipt npm run ops:check`, with the
   workers.dev URL retained on a following line, reframed as the Worker-health
   probe that bypasses zone-level configuration.
3. **New closing section — "Custom domain, certificates, and public surface"**
   (~20 lines) carrying the four AC-mandated items from design.md Decision 4:
   hostname-depth/cert behavior (depth-1 inside `*.b28.dev` Universal SSL +
   custom-domain managed cert; deeper names fall outside the wildcard — keep
   public hostnames at depth 1), WebSocket-path status (none exist; verified;
   custom domains would carry WS if added; session WS lives on the future
   Sessions Worker hostnames), the public-surface statement (only the built
   app's static assets + three `/api` routes; no editor/admin surface, no
   ports), and the note that `demo.b28.dev` is canonical while workers.dev is
   an operational probe.

## Change 3 — the one-time attach (platform action, ordered)

Performed during Implement, after Change 1 is committed-ready and
`deploy:dry` passes:

1. `npm run deploy` (build + deploy with the new routes block).
2. Expect the override confirmation for the existing DNS record; answer yes.
   Non-TTY fallback chain per design.md Decision 3: pseudo-TTY (`script -q`),
   then the Custom Domains API with `override_existing_dns_record: true`, then
   document-and-block. Record which path was used in progress.md.
3. Post-attach verification battery (see Verification below).

## Interfaces and boundaries

- **Worker ↔ hostname:** the custom domain is a property of the Worker
  (`demo-runway`), not of a version. This is the boundary T-004-02-02 relies
  on: `versions deploy` re-points what the *same* attached hostname serves.
- **Public ↔ private surfaces:** this ticket binds exactly one hostname to
  exactly one Worker. The Sessions Worker (not yet existing) will own its own
  hostnames; nothing here may create a path from `demo.b28.dev` to any future
  editor/preview surface.
- **Repo ↔ platform:** wrangler.jsonc declares the desired binding; the
  platform holds the attach state. The docs bootstrap step is the bridge for
  the one action the declaration can't perform unattended (the override).

## Ordering constraints

1. wrangler.jsonc edit **before** any deploy (the deploy must carry the block).
2. `npm run deploy:dry` (config validation) **before** the real deploy.
3. The real deploy + override **before** runtime verification (obviously) and
   **before** the deployment.md verification-URL swap is committed — docs must
   not instruct operators to curl a hostname that still 530s. Practically:
   config commit first, attach, verify, then docs commit.
4. Commit increments: (a) wrangler.jsonc, (b) deployment.md, each with the
   verify gate's relevant slice run locally first. Commits stay local; pushing
   `main` is the owner's/Lisa's release act (a push triggers the CI deploy).

## Failure-mode map (what Implement watches for)

| Failure | Signal | Response |
|---|---|---|
| Zone not in this account | attach error naming zone ownership | Stop; record in progress.md; ticket blocked on operator |
| Override prompt undrivable | wrangler aborts in non-interactive mode | Fallback chain (pseudo-TTY → API → document) |
| CI re-prompts on next deploy | deploy.yml run fails post-merge | Would contradict persisted-domain expectation; documented as a watch-item in review.md |
| Cert not yet issued at first curl | TLS error/526 right after attach | Brief propagation wait, then re-verify; note timing in progress.md |
