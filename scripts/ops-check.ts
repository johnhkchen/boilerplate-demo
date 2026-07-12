// The runnable ops check. Thin edge over src/lib/ops-check.ts: it resolves
// configuration from the environment, runs the boundary through the traced
// operation, prints a readable trace, and sets the process exit code. All logic
// lives in the pure core; this file is the only place that touches env, files,
// stdout, and process.exit.
//
//   npm run ops:check                 # against the local demo (astro dev)
//   OPS_CHECK_URL=… npm run ops:check  # point elsewhere (wrangler dev, CI, prod)
//
// Exit codes: 0 = boundary healthy · 1 = boundary failed · 2 = the check itself
// was misconfigured (e.g. a non-positive time budget).

import { existsSync, readFileSync } from 'node:fs';

import { receiptBoundary } from '../src/lib/boundary-contract.ts';
import { runBoundaryCheck, formatBoundaryTrace } from '../src/lib/ops-check.ts';

// Default to the demo's own dev server, using the exact host Astro advertises
// ("Local  http://localhost:4321/"). Matching that string is what makes the
// default reliable: on macOS `localhost` often resolves to IPv6 ::1 and Astro's
// dev server listens there, so a hard-coded 127.0.0.1 (IPv4) is refused and the
// healthy demo looks "down". Node's fetch resolves `localhost` to whichever
// family the server is on. DEMO_BASE_URL / OPS_CHECK_URL override for wrangler
// dev, CI, or a deployed URL.
const DEFAULT_BASE_URL = 'http://localhost:4321';
const DEFAULT_TIME_BUDGET_MS = 2_000;

// Read DEMO_SIGNING_KEY from a .dev.vars file so a plain local run verifies the
// signature against the same key the running dev server uses — no extra setup.
// Tolerant by design: a missing file or any parse trouble simply means "no key",
// and the check runs without out-of-band verification rather than erroring.
function readDevVarsKey(path: string): string | undefined {
  try {
    if (!existsSync(path)) return undefined;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (line === '' || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const name = line.slice(0, eq).trim();
      if (name !== 'DEMO_SIGNING_KEY') continue;
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
  const url = process.env.OPS_CHECK_URL ?? `${baseUrl}/api/receipt`;

  const budgetRaw = process.env.OPS_CHECK_TIMEOUT_MS;
  const timeBudgetMs =
    budgetRaw === undefined ? DEFAULT_TIME_BUDGET_MS : Number(budgetRaw);

  const key = process.env.DEMO_SIGNING_KEY ?? readDevVarsKey('.dev.vars');

  return { url, timeBudgetMs, key };
}

async function main(): Promise<number> {
  const config = resolveConfig();

  let result;
  try {
    result = await runBoundaryCheck(receiptBoundary, config);
  } catch (err) {
    // runOperation rejects (TypeError/RangeError) only for an invalid check
    // config — a bad budget, not a boundary failure. Keep that distinct.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ops check misconfigured: ${message}`);
    return 2;
  }

  console.log(formatBoundaryTrace(result));
  return result.trace.outcome === 'passed' ? 0 : 1;
}

process.exit(await main());
