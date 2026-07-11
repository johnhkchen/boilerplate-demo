// The one documented read path an agent uses to retrieve stored backstage entries
// verbatim — the read half that closes the epic's two-way loop (the write half is the
// submit route, T-003-02-01). Pure and framework-free like receipt.ts / passcode.ts /
// backstage-store.ts: the core reads no env and holds no secret. It takes its three
// dependencies as arguments — the presented request, the configured (server) passcode,
// and the D1 handle — and the thin HTTP edge (src/pages/api/backstage/feed.ts) imports
// Cloudflare's runtime env and passes them in.
//
// It composes two done modules rather than reimplementing them:
//   * passcode.ts `guardPasscode` — the shared low-stakes gate. Returning its denial
//     Response verbatim keeps the gate's HTTP mapping (500/401/403 + copy) in one place.
//   * backstage-store.ts `listEntries` — every stored entry, verbatim, oldest-first.
//
// The gate is the OUTER wall: store state is only revealed after the gate allows, so a
// caller without the passcode learns nothing about the store (not even that it exists).
//
// Imports use explicit `.ts` extensions so the acceptance check (test/backstage-
// retrieval.test.mjs) can import this core under `node --experimental-strip-types`,
// exactly as backstage-store.test.mjs imports the store.

import type { BackstageEntry } from './backstage-entry.ts';
import type { EntryStoreDatabase } from './backstage-store.ts';
import { listEntries } from './backstage-store.ts';
import { GATE_NAME, guardPasscode } from './passcode.ts';

// Stable envelope marker so the seam can evolve without breaking agents that parse it
// (repo idiom: integration-check.ts's report carries `schemaVersion: 1`).
export const FEED_SCHEMA_VERSION = 1 as const;

// Entries use the complete persisted public contract, oldest-first with no value
// transformed. Success and failure share the recognizable `gate` field (denials
// carry `{ gate, error, detail }`).
export interface BackstageFeed {
  schemaVersion: typeof FEED_SCHEMA_VERSION;
  gate: typeof GATE_NAME;
  count: number;
  entries: BackstageEntry[];
}

// Everything the seam needs, injected — no env read here.
export interface ReadBackstageFeedInput {
  // Carries the `x-demo-passcode` header the gate reads.
  request: Request;
  // The server passcode (DEMO_PASSCODE). Blank/absent → gate returns misconfigured (500).
  configured: string | null | undefined;
  // The backstage store (BACKSTAGE_DB). Absent → store_unavailable (500), but only after
  // the gate has allowed the caller in.
  db: EntryStoreDatabase | null | undefined;
}

// Pretty-printed JSON with a stable content type — same shape every route/report here uses.
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// The one composition an agent hits. Order of checks is deliberate:
//   1. Gate first. A denial (500 misconfigured / 401 missing / 403 mismatch) short-
//      circuits with the gate's own Response, before the store is ever touched.
//   2. Store presence. A missing binding is a server misconfiguration, not a client
//      error — a safe 500 with no leaked value (mirrors receipt.ts's missing-key 500).
//      Checked AFTER the gate so an ungated caller never learns store state.
//   3. List + envelope. Verbatim entries, oldest-first, in the versioned envelope.
export async function readBackstageFeed(
  input: ReadBackstageFeedInput,
): Promise<Response> {
  const denied = guardPasscode(input.request, input.configured);
  if (denied) return denied;

  if (!input.db) {
    return json(
      {
        gate: GATE_NAME,
        error: 'store_unavailable',
        detail: 'the backstage store is not bound on the server',
      },
      500,
    );
  }

  const entries = await listEntries(input.db);
  const feed: BackstageFeed = {
    schemaVersion: FEED_SCHEMA_VERSION,
    gate: GATE_NAME,
    count: entries.length,
    entries,
  };
  return json(feed, 200);
}
