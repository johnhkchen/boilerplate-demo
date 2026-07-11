// Framework-free implementation for the id-addressed backstage management edge.
// The Astro route owns Cloudflare env/params and delegates here; Node tests inject
// a real SQLite-backed store. The shared passcode is deliberately the outer wall:
// denied callers cannot exercise id parsing, clock access, or persistence.

import type { EntryStoreDatabase } from "./backstage-store.ts";
import { deleteEntry, setEntryCompletion } from "./backstage-store.ts";
import { guardPasscode } from "./passcode.ts";

export interface BackstageManagementRouteEnv {
  DEMO_PASSCODE?: string;
  BACKSTAGE_DB?: EntryStoreDatabase;
}

export type BackstageClock = () => Date;

const BOUNDARY = "backstage_management";
const defaultClock: BackstageClock = () => new Date();

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const error = (status: number, slug: string, detail: string): Response =>
  json({ boundary: BOUNDARY, error: slug, detail }, status);

// Keep a single canonical spelling for the positive INTEGER PRIMARY KEY. This
// refuses coercive aliases such as whitespace, signs, decimals, exponents, and
// leading zeroes before an untrusted path value reaches SQLite.
function parseEntryId(rawId: string | undefined): number | null {
  if (rawId === undefined || !/^[1-9]\d*$/.test(rawId)) return null;
  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

type ManagementPreflight =
  | { ok: true; id: number; db: EntryStoreDatabase }
  | { ok: false; response: Response };

function preflight(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
): ManagementPreflight {
  const denial = guardPasscode(request, env.DEMO_PASSCODE);
  if (denial !== null) return { ok: false, response: denial };

  const id = parseEntryId(rawId);
  if (id === null) {
    return {
      ok: false,
      response: error(
        400,
        "invalid_entry_id",
        "the backstage entry id must be a positive integer",
      ),
    };
  }

  if (env.BACKSTAGE_DB === undefined) {
    return {
      ok: false,
      response: error(
        500,
        "store_misconfigured",
        "the backstage entry store is not configured",
      ),
    };
  }

  return { ok: true, id, db: env.BACKSTAGE_DB };
}

export async function completeBackstageEntry(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
  now: BackstageClock = defaultClock,
): Promise<Response> {
  const checked = preflight(request, rawId, env);
  if (!checked.ok) return checked.response;

  let completedAt: string;
  let changed: boolean;
  try {
    completedAt = now().toISOString();
    changed = await setEntryCompletion(checked.db, checked.id, completedAt);
  } catch {
    return error(
      500,
      "entry_completion_failed",
      "the backstage entry could not be completed",
    );
  }

  if (!changed) {
    return error(404, "entry_not_found", "that backstage entry does not exist");
  }

  return json(
    {
      boundary: BOUNDARY,
      entry: { id: checked.id, completedAt },
    },
    200,
  );
}

export async function deleteBackstageEntryById(
  request: Request,
  rawId: string | undefined,
  env: BackstageManagementRouteEnv,
): Promise<Response> {
  const checked = preflight(request, rawId, env);
  if (!checked.ok) return checked.response;

  let changed: boolean;
  try {
    changed = await deleteEntry(checked.db, checked.id);
  } catch {
    return error(
      500,
      "entry_delete_failed",
      "the backstage entry could not be deleted",
    );
  }

  if (!changed) {
    return error(404, "entry_not_found", "that backstage entry does not exist");
  }

  return json(
    {
      boundary: BOUNDARY,
      deleted: { id: checked.id },
    },
    200,
  );
}
