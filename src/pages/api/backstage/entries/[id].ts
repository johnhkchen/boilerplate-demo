// The id-addressed management half of the backstage door. PATCH completes one
// entry and DELETE removes one entry; both operations share the same passcode
// gate through the framework-free core. Collection POST remains in the sibling
// entries.ts edge and is deliberately unaffected.
export const prerender = false;

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  completeBackstageEntry,
  deleteBackstageEntryById,
} from "../../../../lib/backstage-management.ts";

export const PATCH: APIRoute = ({ request, params }) =>
  completeBackstageEntry(request, params.id, env);

export const DELETE: APIRoute = ({ request, params }) =>
  deleteBackstageEntryById(request, params.id, env);
