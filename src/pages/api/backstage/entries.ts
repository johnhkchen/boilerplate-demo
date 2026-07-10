// The write half of the stakeholder backstage door. This is an on-demand route;
// the public demo remains a static asset. It composes the shared gate and store
// rather than reimplementing either concern here.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleBackstageEntry } from '../../../lib/backstage-route.ts';

export const POST: APIRoute = ({ request }) =>
  handleBackstageEntry(request, env);
