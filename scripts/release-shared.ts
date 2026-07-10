// Impure helpers shared by scripts/promote.ts and scripts/rollback.ts — the
// subprocess, fs, network, and prompt edges around the pure core in
// src/lib/promote.ts. Kept out of both entry scripts because each script runs
// main() at import time (the ops-check pattern), so neither can import the
// other.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createInterface } from 'node:readline/promises';

import { runBoundaryCheck, formatBoundaryTrace } from '../src/lib/ops-check.ts';
import {
  extractCustomDomain,
  parseDeploymentsList,
  parseWranglerOutputFile,
  parseUploadStdout,
  type DeploymentInfo,
  type PromotionRecord,
  type UploadResult,
} from '../src/lib/promote.ts';

const PROMOTE_DIR = '.promote';
const LAST_RECORD_PATH = `${PROMOTE_DIR}/last.json`;
const HISTORY_PATH = `${PROMOTE_DIR}/history.jsonl`;

// --- subprocesses -----------------------------------------------------------

// Run a command with output flowing straight to the operator (verify, build,
// versions deploy). Returns the exit status only.
export function runInherit(cmd: string, args: string[]): number {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  return result.status ?? 1;
}

// Run git and hand back trimmed stdout, or undefined on any failure.
export function git(args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

// Run `wrangler <args> --json`-style commands and parse stdout as JSON.
export function wranglerJson(args: string[]): unknown {
  const stdout = execFileSync('npx', ['wrangler', ...args], {
    stdio: ['ignore', 'pipe', 'inherit'],
  }).toString();
  return JSON.parse(stdout);
}

export function fetchDeployments(): DeploymentInfo[] {
  return parseDeploymentsList(wranglerJson(['deployments', 'list', '--json']));
}

// `wrangler versions upload`, capturing the version id via the machine-
// readable output file (WRANGLER_OUTPUT_FILE_PATH) with the human stdout as
// both fallback parser and the only carrier of the preview URL. Stdout is
// echoed so the operator sees what wrangler said.
export function versionsUpload(
  extraArgs: string[],
): { status: number; result: UploadResult } {
  mkdirSync(PROMOTE_DIR, { recursive: true });
  const outFile = `${PROMOTE_DIR}/wrangler-out-${process.pid}.ndjson`;
  const proc = spawnSync('npx', ['wrangler', 'versions', 'upload', ...extraArgs], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: outFile },
  });
  const stdout = proc.stdout?.toString() ?? '';
  if (stdout !== '') process.stdout.write(stdout);
  const fromFile = existsSync(outFile)
    ? parseWranglerOutputFile(readFileSync(outFile, 'utf8'))
    : {};
  rmSync(outFile, { force: true });
  const fromStdout = parseUploadStdout(stdout);
  return {
    status: proc.status ?? 1,
    result: {
      versionId: fromFile.versionId ?? fromStdout.versionId,
      previewUrl: fromStdout.previewUrl,
    },
  };
}

export function versionsDeploy(versionId: string, message: string): number {
  return runInherit('npx', [
    'wrangler',
    'versions',
    'deploy',
    `${versionId}@100%`,
    '--yes',
    '--message',
    message,
  ]);
}

// --- hostname & smoke checks -------------------------------------------------

export function resolveHostname(): string | undefined {
  if (process.env.PROMOTE_HOSTNAME) return process.env.PROMOTE_HOSTNAME;
  try {
    return extractCustomDomain(readFileSync('wrangler.jsonc', 'utf8'));
  } catch {
    return undefined;
  }
}

// The same receipt boundary check the release docs prescribe, keyless (the
// production signing key is deliberately out-of-band).
export async function receiptCheck(baseUrl: string): Promise<boolean> {
  const result = await runBoundaryCheck({
    url: `${baseUrl}/api/receipt`,
    timeBudgetMs: 10_000,
  });
  console.log(formatBoundaryTrace(result));
  return result.trace.outcome === 'passed';
}

// Smoke-test an uploaded version through its preview URL before any pointer
// moves: the home page must be HTML and the receipt boundary must pass.
export async function previewSmoke(previewUrl: string): Promise<boolean> {
  try {
    const home = await fetch(previewUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = home.headers.get('content-type') ?? '';
    if (!home.ok || !contentType.includes('text/html')) {
      console.error(
        `preview smoke: GET ${previewUrl} → ${home.status} (${contentType})`,
      );
      return false;
    }
  } catch (err) {
    console.error(`preview smoke: GET ${previewUrl} failed: ${String(err)}`);
    return false;
  }
  return receiptCheck(previewUrl);
}

// Prove the hostname serves the version we just deployed: poll the receipt
// route until x-demo-version-id matches, then run the boundary check on it.
export async function verifyHostname(
  hostname: string,
  expectedVersionId: string,
): Promise<boolean> {
  const budgetMs = Number(process.env.PROMOTE_VERIFY_TIMEOUT_MS ?? 30_000);
  const intervalMs = 3_000;
  const url = `https://${hostname}/api/receipt`;
  const deadline = Date.now() + budgetMs;
  let lastSeen = 'no response';
  for (;;) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const seen = res.headers.get('x-demo-version-id');
      if (seen === expectedVersionId) {
        console.log(`hostname check: ${url} serves version ${seen}`);
        return receiptCheck(`https://${hostname}`);
      }
      lastSeen = seen === null ? `HTTP ${res.status}, no version header` : seen;
    } catch (err) {
      lastSeen = String(err);
    }
    if (Date.now() >= deadline) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.error(
    `hostname check FAILED: expected version ${expectedVersionId} on ${url}; ` +
      `last observed: ${lastSeen}`,
  );
  return false;
}

// --- records ------------------------------------------------------------------

export function writeRecord(record: PromotionRecord): void {
  mkdirSync(PROMOTE_DIR, { recursive: true });
  appendFileSync(HISTORY_PATH, `${JSON.stringify(record)}\n`);
  writeFileSync(LAST_RECORD_PATH, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
}

export function readLastRecord(): PromotionRecord | undefined {
  try {
    return JSON.parse(readFileSync(LAST_RECORD_PATH, 'utf8')) as PromotionRecord;
  } catch {
    return undefined;
  }
}

// --- operator confirmation -----------------------------------------------------

// Returns true to proceed. Without --yes: a TTY gets a y/N prompt; anything
// non-interactive refuses (the caller maps that to the misconfigured exit).
export async function confirmOrExplain(question: string): Promise<
  'proceed' | 'declined' | 'no-tty'
> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return 'no-tty';
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes' ? 'proceed' : 'declined';
}
