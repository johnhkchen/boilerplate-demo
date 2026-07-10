// Framework-free implementation for POST /api/backstage/entries. The Astro route
// imports Cloudflare's runtime env and delegates here; Node tests inject a real
// SQLite-backed store without needing to emulate the `cloudflare:workers` module.

import type { EntryStoreDatabase } from './backstage-store.ts';
import { saveEntry } from './backstage-store.ts';
import {
  toBackstageEntry,
  validateBackstageSubmission,
} from './backstage-submission.ts';
import { guardPasscode } from './passcode.ts';

export interface BackstageEntryRouteEnv {
  DEMO_PASSCODE?: string;
  BACKSTAGE_DB?: EntryStoreDatabase;
}

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const error = (
  status: number,
  slug: string,
  detail: string,
  issues?: string[],
): Response =>
  json(
    {
      boundary: 'backstage_entries',
      error: slug,
      detail,
      ...(issues === undefined ? {} : { issues }),
    },
    status,
  );

function isJson(contentType: string | null): boolean {
  return contentType?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}

export async function handleBackstageEntry(
  request: Request,
  env: BackstageEntryRouteEnv,
): Promise<Response> {
  // Gate before inspecting the body: unauthorized traffic cannot exercise input
  // parsing/validation, and every denial necessarily happens before a store write.
  const denial = guardPasscode(request, env.DEMO_PASSCODE);
  if (denial !== null) return denial;

  if (!isJson(request.headers.get('content-type'))) {
    return error(
      415,
      'json_required',
      'send the backstage entry as application/json',
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return error(400, 'invalid_json', 'the request body is not valid JSON');
  }

  const validation = validateBackstageSubmission(payload);
  if ('issues' in validation) {
    return error(
      422,
      'invalid_entry',
      'the backstage entry is not well formed',
      validation.issues,
    );
  }

  if (env.BACKSTAGE_DB === undefined) {
    return error(
      500,
      'store_misconfigured',
      'the backstage entry store is not configured',
    );
  }

  const entry = toBackstageEntry(validation.value, new Date().toISOString());
  try {
    await saveEntry(env.BACKSTAGE_DB, entry);
  } catch {
    // Database details are operator data. Keep SQL, binding internals, and raw
    // exception messages out of the stakeholder-facing response.
    return error(
      500,
      'entry_write_failed',
      'the backstage entry could not be saved',
    );
  }

  return json({ entry }, 201);
}
