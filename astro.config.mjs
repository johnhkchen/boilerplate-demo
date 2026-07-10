// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Static-FIRST, not static-only. The initial page is load-bearing static: it is
// prerendered to a file, served from Cloudflare's edge as an asset, and pays no
// compute cold start (charter P6; "no ninety-second initial-page cold starts").
// `output: 'static'` keeps every page prerendered by DEFAULT.
//
// The Cloudflare adapter is present for exactly ONE reason: the template's single
// real API boundary — src/pages/api/receipt.ts — opts a lone route out of
// prerender (`export const prerender = false`) so it can run server-side and hold
// a secret. Astro 5 folds the old `hybrid` mode into `output: 'static'` + a
// per-route opt-out, which requires an adapter to be installed. This does NOT make
// the site SSR: the build emits static pages plus a `_worker.js` + `_routes.json`
// whose exclude-list keeps every page (incl. `/`) served straight from assets.
// Only `/api/*` invokes the Worker. (This resolves the deferral the previous
// comment noted: product-spec calls for a Cloudflare adapter and secret-safe
// server endpoint boundaries; T-002-01-02 is that need.)
//
// Astro 7's Cloudflare Vite plugin runs development in workerd. Routes import
// bindings directly from `cloudflare:workers`, so `.dev.vars`, D1, and production
// Worker bindings share the same runtime access path.
// The combined integration check owns an isolated temporary Wrangler config so
// deliberate faults never require rewriting a developer's `.dev.vars`. Ordinary
// dev/deploy runs leave this unset and retain the existing config + `.dev.vars`
// behavior. The adapter's `configPath` option selects that isolated config. This
// is server-side operator plumbing; it is never exposed to client modules or
// prefixed PUBLIC_.
const integrationConfigPath = process.env.DEMO_WRANGLER_CONFIG_PATH;

export default defineConfig({
  output: 'static',
  adapter: cloudflare({
    // This demo has no image pipeline. Avoid provisioning an unused Images
    // binding; static assets pass through unchanged.
    imageService: 'passthrough',
    ...(integrationConfigPath === undefined
      ? {}
      : { configPath: integrationConfigPath }),
  }),
});
