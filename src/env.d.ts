/// <reference types="astro/client" />

// Server-only environment available at request time inside on-demand routes.
// Under the Cloudflare adapter these arrive on `Astro.locals.runtime.env`:
// from wrangler's `.dev.vars` in dev (via platformProxy) and from Worker secrets
// in production. Typed here so the boundary route reads a known key, not `any`.
// Nothing here is PUBLIC_-prefixed, so nothing is inlined into client output.
type Env = {
  DEMO_SIGNING_KEY: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
