/// <reference types="astro/client" />

// Server-only environment available at request time inside on-demand routes.
// Under the Cloudflare adapter these arrive on `Astro.locals.runtime.env`:
// from wrangler's `.dev.vars` in dev (via platformProxy) and from Worker secrets
// in production. Typed here so the boundary route reads a known key, not `any`.
// Nothing here is PUBLIC_-prefixed, so nothing is inlined into client output.
type Env = {
  DEMO_SIGNING_KEY: string;
  // Shared low-stakes passcode for the stakeholder backstage. Read server-side at
  // the HTTP edge and passed into the pure gate (src/lib/passcode.ts) that the
  // submit route and retrieve seam compose over. Not PUBLIC_-prefixed, so it is
  // never inlined into client output. It is a low-stakes gate, not a server secret
  // like DEMO_SIGNING_KEY; a blank value makes the gate fail closed (500).
  DEMO_PASSCODE: string;
  // Optional operator toggle to put the boundary into a deliberate fault so the
  // checks can be seen catching it: 'broken' | 'stalled' | 'leak'. Leak mode is
  // deliberately unsafe and exists only to prove leak:check turns red. Unset (the
  // norm in dev and prod) → healthy. Parsed/normalized by src/lib/fault.ts.
  DEMO_FAULT?: string;
  // The backstage entry store (D1), consumed server-side by the persistence module
  // (src/lib/backstage-store.ts) that the submit route and retrieve seam compose over.
  // Typed as the minimal D1 surface that module uses rather than a global `D1Database`,
  // which does not resolve without @cloudflare/workers-types; real D1 is structurally
  // assignable to it. Not PUBLIC_-prefixed and never touched by client code.
  BACKSTAGE_DB: import('./lib/backstage-store.ts').EntryStoreDatabase;
};

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
