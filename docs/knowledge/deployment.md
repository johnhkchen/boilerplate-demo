# Production deployment

The deploy workflow assumes one deliberate bootstrap has created the Worker and
its automatically provisioned bindings. Runtime secrets are stored in Cloudflare;
GitHub receives only the credentials needed to deploy.

## One-time bootstrap

1. Authenticate Wrangler to the intended Cloudflare account and confirm it:

   ```sh
   npx wrangler whoami
   ```

2. Create the Worker and provision its D1, asset, and session bindings:

   ```sh
   npm run deploy
   ```

3. Set both runtime secrets through Wrangler's interactive, non-echoing prompt:

   ```sh
   npx wrangler secret put DEMO_SIGNING_KEY
   npx wrangler secret put DEMO_PASSCODE
   ```

   Use a fresh production signing key and a production backstage passcode. Do not
   reuse values from `.dev.vars`, examples, tests, or RDSPI artifacts.

4. Apply the committed D1 migration:

   ```sh
   npx wrangler d1 migrations apply BACKSTAGE_DB --remote
   ```

5. Add the two GitHub Actions secrets through non-echoing prompts:

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
curl --fail https://demo-runway.<workers-subdomain>.workers.dev/
OPS_CHECK_URL=https://demo-runway.<workers-subdomain>.workers.dev/api/receipt npm run ops:check
```

Use a fresh browser session to confirm the static page, then submit and retrieve
one backstage entry with the production passcode. Never place the signing key or
passcode in a command argument, committed file, URL, browser bundle, or CI log.
