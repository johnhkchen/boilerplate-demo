// The read half of the backstage door: GET /api/backstage/feed. A coding agent (or the
// repo-local `npm run backstage:feed` CLI) retrieves every stored entry verbatim through
// this one documented path, gated by the shared low-stakes passcode. The write half is the
// submit route (POST /api/backstage/entries, T-003-02-01).
//
// Like receipt.ts, `prerender = false` opts this single route out of static prerender so it
// runs server-side on each request (astro.config.mjs is output:'static'; only /api/* invokes
// the Worker). This edge owns env and Response; all logic lives in the pure core
// (src/lib/backstage-retrieval.ts). The passcode and the D1 binding arrive on
// Cloudflare's runtime env — from `.dev.vars` in dev, from a Worker secret /
// binding in production — and neither is PUBLIC_-prefixed, so neither reaches client output.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readBackstageFeed } from '../../../lib/backstage-retrieval';

export const GET: APIRoute = ({ request }) => {
  return readBackstageFeed({
    request,
    configured: env.DEMO_PASSCODE,
    db: env.BACKSTAGE_DB,
  });
};
