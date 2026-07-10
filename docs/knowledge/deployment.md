# Production deployment

The deploy workflow assumes one deliberate bootstrap has created the Worker and
its automatically provisioned bindings. Runtime secrets are stored in Cloudflare;
GitHub receives only the credentials needed to deploy.

## One-time bootstrap

1. Authenticate Wrangler to the intended Cloudflare account and confirm it:

   ```sh
   npx wrangler whoami
   ```

2. If the branded hostname (`demo.b28.dev`) already carries a DNS record — for
   example the retired tunnel-based demo's CNAME — delete that record in the
   Cloudflare dashboard (zone → DNS) first. The custom-domain attach refuses to
   override records managed by another Cloudflare product (API error 100117),
   and the deploy-time wrangler credential deliberately holds no DNS scope.

3. Create the Worker, provision its D1 and asset bindings, and attach the
   custom domain declared in `wrangler.jsonc` (Cloudflare creates the DNS
   record and manages the certificate):

   ```sh
   npm run deploy
   ```

4. Set both runtime secrets through Wrangler's interactive, non-echoing prompt:

   ```sh
   npx wrangler secret put DEMO_SIGNING_KEY
   npx wrangler secret put DEMO_PASSCODE
   ```

   Use a fresh production signing key and a production backstage passcode. Do not
   reuse values from `.dev.vars`, examples, tests, or RDSPI artifacts.

5. Apply the committed D1 migration:

   ```sh
   npx wrangler d1 migrations apply BACKSTAGE_DB --remote
   ```

6. Add the two GitHub Actions secrets through non-echoing prompts:

   ```sh
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```

   The API token needs Workers Scripts and D1 edit permissions for the target
   account. The account ID is available from `npx wrangler whoami`.

## Release and verification

Push `main`. The workflow performs a locked install, the full `npm run verify`
gate, pending remote D1 migrations, and the Worker deploy. After it succeeds:

```sh
curl --fail https://demo.b28.dev/
OPS_CHECK_URL=https://demo.b28.dev/api/receipt npm run ops:check
```

`https://demo-runway.<workers-subdomain>.workers.dev/` serves the same app and
stays enabled as the Worker-health probe: it answers even when the zone layer
(DNS, certificate, a zone rule) is the thing that broke, so the two failure
domains stay distinguishable.

Use a fresh browser session to confirm the static page, then submit and retrieve
one backstage entry with the production passcode. Never place the signing key or
passcode in a command argument, committed file, URL, browser bundle, or CI log.

## Custom domain, certificates, and public surface

`demo.b28.dev` is the canonical public URL, bound to the Worker as a Workers
custom domain by the `routes` entry in `wrangler.jsonc`. The binding belongs to
the Worker, not to a version — promoting or rolling back a version never
touches DNS, routes, or certificates. After the one-time attach, routine
deploys (including CI) re-assert the domain without needing any DNS permission.

**Hostname depth and certificates.** `demo.b28.dev` sits exactly one label
below the zone apex, inside Universal SSL's `*.b28.dev` wildcard, and the
custom-domain attach additionally has Cloudflare issue and renew the
hostname's edge certificate automatically. A deeper name (`x.demo.b28.dev`)
would fall outside the universal wildcard — the same depth rule that shapes
the planned `demo-<slug>`/`code-<slug>` session hostnames — so keep public
hostnames at depth 1.

**WebSocket paths.** The app exposes none: every page is static and the three
`/api` routes (`/api/receipt`, `/api/backstage/entries`, `/api/backstage/feed`)
are plain request/response JSON — verified by sweeping `src/`, `scripts/`, and
the built `dist/` for `ws://`/`wss://`/WebSocket usage (zero hits). No
WS-specific domain configuration is needed; Workers custom domains carry
WebSockets natively if a route ever adds one. Live-session WebSockets (HMR,
editor) belong to the separate Sessions Worker hostnames, never this one.

**Public surface.** The custom domain fronts only the built app: static assets
plus those three API routes, with backstage reads and writes passcode-gated.
Workers bind no ports, and no editor, dev-server, or admin surface exists on
this hostname; session editor/preview surfaces live on separate
Access-protected hostnames (E-004, later tickets).
