// The template's ONE real API boundary. `prerender = false` opts this single route
// out of static prerendering so it runs server-side on each request (see
// astro.config.mjs) — every other route stays a static asset with no cold start.
//
// It reads a server-only signing key from the runtime environment and returns a
// freshly signed receipt. The key is read via `locals.runtime.env` (fed by
// `.dev.vars` in dev through platformProxy, by a Worker secret in production) and
// is never PUBLIC_-prefixed, logged, interpolated into a response, or bundled into
// client output — so it stays out of the browser (charter P3).
export const prerender = false;

import type { APIRoute } from 'astro';
import { BOUNDARY_NAME, makeReceipt } from '../../lib/receipt';

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const GET: APIRoute = async ({ locals }) => {
  const key = locals.runtime?.env?.DEMO_SIGNING_KEY;

  // Environment validation (product-spec: "environment validation"). A missing or
  // blank key is a misconfiguration, not a client error — fail explicitly with a
  // safe message so a broken boundary is visible, never a leaked value or a hang.
  if (typeof key !== 'string' || key.trim() === '') {
    return json(
      {
        boundary: BOUNDARY_NAME,
        error: 'boundary_misconfigured',
        detail: 'server signing key is not set',
      },
      500,
    );
  }

  const receipt = await makeReceipt(key);
  return json(receipt, 200);
};
