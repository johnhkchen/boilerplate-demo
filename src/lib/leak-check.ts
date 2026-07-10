// Operator-only assertion over the two surfaces a browser can receive: emitted
// client assets and a raw boundary response. This module intentionally uses Node
// filesystem APIs and must never be imported by application pages or routes.

import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

export type LeakSurface = 'asset' | 'response';

export interface LeakFinding {
  surface: LeakSurface;
  location: string;
}

export interface LeakCheckConfig {
  bundleDir: string;
  responseUrl: string;
  secret: string;
  timeBudgetMs: number;
  fetchImpl?: typeof fetch;
}

export interface LeakCheckResult {
  outcome: 'passed' | 'failed';
  findings: LeakFinding[];
  checked: {
    assetFiles: number;
    responseBodies: number;
  };
}

const TOP_LEVEL_METADATA = new Set(['.assetsignore', '_routes.json']);
const SERVER_OUTPUT = '_worker.js';

function validateConfig(config: LeakCheckConfig): void {
  if (typeof config.secret !== 'string' || config.secret.trim() === '') {
    throw new TypeError('DEMO_SIGNING_KEY is not set');
  }
  if (typeof config.bundleDir !== 'string' || config.bundleDir.trim() === '') {
    throw new TypeError('bundle directory is not set');
  }
  if (typeof config.responseUrl !== 'string' || config.responseUrl.trim() === '') {
    throw new TypeError('response URL is not set');
  }
  if (!Number.isFinite(config.timeBudgetMs) || config.timeBudgetMs <= 0) {
    throw new RangeError('LEAK_CHECK_TIMEOUT_MS must be a positive number');
  }
}

function portableRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

function excludedAtRoot(relativePath: string): boolean {
  const top = relativePath.split('/')[0];
  return top === SERVER_OUTPUT || TOP_LEVEL_METADATA.has(relativePath);
}

async function scanClientAssets(
  bundleDir: string,
  marker: Buffer,
): Promise<{ files: number; findings: LeakFinding[] }> {
  const root = resolve(bundleDir);
  const findings: LeakFinding[] = [];
  let files = 0;

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const location = portableRelative(root, path);
      if (excludedAtRoot(location)) continue;

      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        files += 1;
        const body = await readFile(path);
        if (body.includes(marker)) findings.push({ surface: 'asset', location });
      }
      // Build-output symlinks and other special entries are deliberately ignored;
      // following them could scan outside the asserted bundle root.
    }
  }

  try {
    await walk(root);
  } catch {
    throw new Error(`could not read client bundle at ${bundleDir}`);
  }

  if (files === 0) {
    throw new Error(`client bundle at ${bundleDir} has no browser assets`);
  }
  return { files, findings };
}

async function readResponseWithinBudget(
  url: string,
  timeBudgetMs: number,
  fetchImpl: typeof fetch,
): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('response timed out'));
    }, timeBudgetMs);
  });

  try {
    return await Promise.race([
      fetchImpl(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      }).then((response) => response.text()),
      deadline,
    ]);
  } catch {
    throw new Error(`could not read response body from ${url}`);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function runLeakCheck(
  config: LeakCheckConfig,
): Promise<LeakCheckResult> {
  validateConfig(config);
  const marker = Buffer.from(config.secret, 'utf8');
  const assets = await scanClientAssets(config.bundleDir, marker);
  const responseBody = await readResponseWithinBudget(
    config.responseUrl,
    config.timeBudgetMs,
    config.fetchImpl ?? fetch,
  );

  const findings = [...assets.findings];
  if (responseBody.includes(config.secret)) {
    findings.push({ surface: 'response', location: config.responseUrl });
  }
  findings.sort((a, b) =>
    a.surface.localeCompare(b.surface) || a.location.localeCompare(b.location),
  );

  return {
    outcome: findings.length === 0 ? 'passed' : 'failed',
    findings,
    checked: { assetFiles: assets.files, responseBodies: 1 },
  };
}

export function formatLeakCheck(result: LeakCheckResult): string {
  if (result.outcome === 'passed') {
    return [
      '✓ leak check — passed',
      `    client assets    ${result.checked.assetFiles} checked`,
      `    response bodies  ${result.checked.responseBodies} checked`,
    ].join('\n');
  }

  const count = result.findings.length;
  const heading = `✗ leak check — secret reached ${count} browser ${
    count === 1 ? 'surface' : 'surfaces'
  }`;
  const lines = result.findings.map((finding) =>
    `    ${finding.surface === 'asset' ? 'client asset' : 'response body'}: ${finding.location}`,
  );
  return [heading, ...lines].join('\n');
}
