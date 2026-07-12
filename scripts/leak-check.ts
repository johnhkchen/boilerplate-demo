// Thin executable edge for the client-bundle + raw-response disclosure check.
// Exit codes: 0 clean · 1 leak found · 2 configuration/evidence unavailable.

import { existsSync, readFileSync } from 'node:fs';

import { receiptBoundary } from '../src/lib/boundary-contract.ts';
import { formatLeakCheck, runLeakCheck } from '../src/lib/leak-check.ts';

const DEFAULT_BASE_URL = 'http://localhost:4321';
const DEFAULT_BUNDLE_DIR = 'dist';
const DEFAULT_TIME_BUDGET_MS = 2_000;

function readDevVarsKey(path: string, keyEnv: string): string | undefined {
  try {
    if (!existsSync(path)) return undefined;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (line === '' || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1 || line.slice(0, eq).trim() !== keyEnv) continue;
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
    bundleDir: process.env.LEAK_CHECK_DIR ?? DEFAULT_BUNDLE_DIR,
    responseUrl:
      process.env.LEAK_CHECK_URL ??
      `${baseUrl.replace(/\/$/, '')}${receiptBoundary.path}`,
    secret:
      process.env[receiptBoundary.keyEnv] ??
      readDevVarsKey('.dev.vars', receiptBoundary.keyEnv) ??
      '',
    timeBudgetMs:
      process.env.LEAK_CHECK_TIMEOUT_MS === undefined
        ? DEFAULT_TIME_BUDGET_MS
        : Number(process.env.LEAK_CHECK_TIMEOUT_MS),
  };
}

async function main(): Promise<number> {
  try {
    const result = await runLeakCheck(resolveConfig());
    console.log(formatLeakCheck(result));
    return result.outcome === 'passed' ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`leak check misconfigured: ${message}`);
    return 2;
  }
}

process.exit(await main());
