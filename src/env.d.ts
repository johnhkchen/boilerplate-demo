/// <reference types="astro/client" />

// Server-only environment available at request time inside on-demand routes.
// Under the Cloudflare adapter these arrive on `Astro.locals.runtime.env`:
// from wrangler's `.dev.vars` in dev (via platformProxy) and from Worker secrets
// in production. Typed here so the boundary route reads a known key, not `any`.
// Nothing here is PUBLIC_-prefixed, so nothing is inlined into client output.
type Env = {
  DEMO_SIGNING_KEY: string;
  // Optional operator toggle to put the boundary into a deliberate fault so the
  // ops-check can be seen catching it: 'broken' | 'stalled'. Unset (the norm in
  // dev and prod) → healthy. Parsed/normalized by src/lib/fault.ts.
  DEMO_FAULT?: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
