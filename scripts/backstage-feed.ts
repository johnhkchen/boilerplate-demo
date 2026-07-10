// Repo-local retrieval CLI — the concrete read path a coding agent (or teammate) uses to
// pull stored backstage entries from a running demo: `npm run backstage:feed`. It fetches
// the documented seam (GET /api/backstage/feed), presents the shared passcode in the
// `x-demo-passcode` header, and prints the entries as JSON on stdout. This is the
// "stable machine-readable interface suitable for a repo-local CLI" the product spec calls
// for; the JSON API and a later MCP adapter are the same seam by other doors.
//
// Exit codes follow the repo's *:check family:
//   0  entries retrieved (printed as JSON)
//   1  the gate or server refused (401/403/500, or a non-2xx) — body printed to stderr
//   2  misconfigured / unreachable (no passcode, network error, timeout)
//
// The passcode is read server-side only (env or .dev.vars) and never printed. Mirrors
// scripts/leak-check.ts's config resolution and bounded-fetch shape.

import { existsSync, readFileSync } from 'node:fs';

import { PASSCODE_ENV, PASSCODE_HEADER } from '../src/lib/passcode.ts';

const DEFAULT_BASE_URL = 'http://localhost:4321';
const DEFAULT_TIME_BUDGET_MS = 2_000;

// Read a single key out of a `.dev.vars` file (dotenv-ish: KEY=value, optional quotes,
// `#` comments). Same shape as leak-check.ts's reader, parameterized by key.
function readDevVar(path: string, key: string): string | undefined {
  try {
    if (!existsSync(path)) return undefined;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (line === '' || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1 || line.slice(0, eq).trim() !== key) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value === '' ? undefined : value;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveConfig() {
  const baseUrl = process.env.DEMO_BASE_URL ?? DEFAULT_BASE_URL;
  return {
    url:
      process.env.BACKSTAGE_FEED_URL ??
      `${baseUrl.replace(/\/$/, '')}/api/backstage/feed`,
    passcode: process.env[PASSCODE_ENV] ?? readDevVar('.dev.vars', PASSCODE_ENV) ?? '',
    timeBudgetMs:
      process.env.BACKSTAGE_FEED_TIMEOUT_MS === undefined
        ? DEFAULT_TIME_BUDGET_MS
        : Number(process.env.BACKSTAGE_FEED_TIMEOUT_MS),
  };
}

async function main(): Promise<number> {
  const config = resolveConfig();

  if (config.passcode === '') {
    console.error(
      `backstage:feed misconfigured: set ${PASSCODE_ENV} (env or .dev.vars) to the shared passcode.`,
    );
    return 2;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeBudgetMs);
  try {
    const response = await fetch(config.url, {
      headers: { [PASSCODE_HEADER]: config.passcode },
      signal: controller.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      console.error(`backstage:feed refused (${response.status}):`);
      console.error(text);
      return 1;
    }

    // Print just the verbatim entries — the payload an agent consumes. Fall back to the
    // raw envelope if the body is not the expected shape, so nothing is silently dropped.
    let entries: unknown = text;
    try {
      const body = JSON.parse(text);
      entries = body && typeof body === 'object' && 'entries' in body ? body.entries : body;
    } catch {
      /* non-JSON body: print as received */
    }
    console.log(JSON.stringify(entries, null, 2));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`backstage:feed unreachable: ${message}`);
    return 2;
  } finally {
    clearTimeout(timer);
  }
}

process.exit(await main());
