// The template's ONE real API boundary. `prerender = false` opts this single route
// out of static prerendering so it runs server-side on each request (see
// astro.config.mjs) — every other route stays a static asset with no cold start.
//
// It reads a server-only signing key from the runtime environment and returns a
// freshly signed receipt. The key is imported from Cloudflare's runtime env (fed
// by `.dev.vars` in dev and by a Worker secret in production) and
// is never PUBLIC_-prefixed, logged, interpolated into a response, or bundled into
// client output — so it stays out of the browser (charter P3).
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { BOUNDARY_NAME, makeReceipt } from '../../lib/receipt';
import {
  FAULT_ENV,
  corruptSignature,
  leakSigningKey,
  parseFaultMode,
} from '../../lib/fault';

// Identify the running Worker version (id + commit tag) on every response of
// this route. The promote/rollback scripts assert x-demo-version-id after a
// pointer-move to prove demo.b28.dev serves the version they deployed. These
// are headers, not body fields: the receipt's signature canonically covers
// boundary:issuedAt:nonce, and version identity is transport metadata, not part
// of the signed evidence. Absent outside the Workers runtime (astro dev).
const versionHeaders = (): Record<string, string> => {
  const meta = (env as { CF_VERSION_METADATA?: { id?: string; tag?: string } })
    .CF_VERSION_METADATA;
  const headers: Record<string, string> = {};
  if (meta?.id) headers['x-demo-version-id'] = meta.id;
  if (meta?.tag) headers['x-demo-version-tag'] = meta.tag;
  return headers;
};

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...versionHeaders(),
    },
  });

export const GET: APIRoute = async ({ request }) => {
  const key = env.DEMO_SIGNING_KEY;

  // Environment validation (product-spec: "environment validation"). A missing or
  // blank key is a misconfiguration, not a client error — fail explicitly with a
  // safe message so a broken boundary is visible, never a leaked value or a hang.
  // Checked before the fault toggle: a misconfigured server is misconfigured
  // regardless of any deliberate fault.
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

  // Deliberate, operator-triggered fault so failure is observable on demand. Read
  // from the runtime env exactly like the key; unset/unknown → healthy (see
  // parseFaultMode). The ops-check (scripts/ops-check.ts) then catches each state
  // without any change to how it is invoked.
  const fault = parseFaultMode(env[FAULT_ENV]);

  // stalled: never answer. Settle only when the client gives up, so the ops-check's
  // own time budget bounds the wait (it aborts the fetch, which aborts this signal)
  // and no request handler leaks. If nothing ever aborts, it stays hung — the point.
  if (fault === 'stalled') {
    return new Promise<Response>((resolve) => {
      request.signal.addEventListener(
        'abort',
        () => resolve(new Response(null, { status: 499 })),
        { once: true },
      );
    });
  }

  const receipt = await makeReceipt(key);

  // broken: a well-formed 200 whose signature no longer verifies against the real
  // key. A naive "did it return 200?" check passes it; the ops-check rejects it.
  if (fault === 'broken') {
    return json(corruptSignature(receipt), 200);
  }

  // leak: deliberately put the real configured key in an otherwise successful
  // response. This unsafe branch is the executable negative case for leak:check;
  // it is never entered unless the server operator explicitly selects it.
  if (fault === 'leak') {
    return json(leakSigningKey(receipt, key), 200);
  }

  return json(receipt, 200);
};
