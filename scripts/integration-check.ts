// One lifecycle owner for the demo's operation, audience-flow, and disclosure
// checks. It builds once, starts one isolated local server, runs all three checks
// against that server, emits normalized evidence, and always cleans up.

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createIntegrationReport,
  formatIntegrationSummary,
  runIntegrationChecks,
} from '../src/lib/integration-check.ts';
import type {
  CommandEvidence,
  IntegrationCheckName,
} from '../src/lib/integration-check.ts';
import { parseFaultMode } from '../src/lib/fault.ts';
import type { FaultMode } from '../src/lib/fault.ts';

const DEFAULT_TIME_BUDGET_MS = 45_000;
const DEFAULT_PORT = 4_324;
const SERVER_STARTUP_BUDGET_MS = 10_000;
const MAX_CAPTURE_CHARS = 32_000;
const REPORT_PATH = 'test-results/integration-report.json';
const CONFIG_PATH_ENV = 'DEMO_WRANGLER_CONFIG_PATH';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

interface IntegrationConfig {
  faultMode: FaultMode;
  timeBudgetMs: number;
  port: number;
  baseUrl: string;
  signingKey: string;
}

interface RunningServer {
  child: ChildProcess;
  output: () => string;
}

function positiveNumber(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
  return value;
}

function resolveConfig(): IntegrationConfig {
  const timeBudgetMs = positiveNumber(
    process.env.INTEGRATION_CHECK_TIMEOUT_MS,
    DEFAULT_TIME_BUDGET_MS,
    'INTEGRATION_CHECK_TIMEOUT_MS',
  );
  const port = positiveNumber(
    process.env.INTEGRATION_CHECK_PORT,
    DEFAULT_PORT,
    'INTEGRATION_CHECK_PORT',
  );
  if (!Number.isInteger(port) || port > 65_535) {
    throw new RangeError('INTEGRATION_CHECK_PORT must be an integer from 1 to 65535');
  }

  return {
    faultMode: parseFaultMode(process.env.DEMO_FAULT),
    timeBudgetMs,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    signingKey:
      process.env.DEMO_SIGNING_KEY ?? randomBytes(24).toString('hex'),
  };
}

function redact(text: string, secret: string): string {
  return text.split(secret).join('[REDACTED]');
}

function appendTail(current: string, chunk: string): string {
  const combined = current + chunk;
  return combined.length <= MAX_CAPTURE_CHARS
    ? combined
    : combined.slice(combined.length - MAX_CAPTURE_CHARS);
}

function terminateChild(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform !== 'win32' && child.pid !== undefined) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    // The process may have exited between the state check and kill.
  }
}

function installAbortTermination(
  child: ChildProcess,
  signal: AbortSignal,
): () => void {
  let forcedKill: ReturnType<typeof setTimeout> | undefined;
  const terminate = () => {
    terminateChild(child, 'SIGTERM');
    forcedKill = setTimeout(() => terminateChild(child, 'SIGKILL'), 1_000);
    forcedKill.unref();
  };
  signal.addEventListener('abort', terminate, { once: true });
  if (signal.aborted) terminate();

  return () => {
    signal.removeEventListener('abort', terminate);
    if (forcedKill !== undefined) clearTimeout(forcedKill);
  };
}

async function runCommand(
  label: string,
  args: string[],
  options: {
    env: NodeJS.ProcessEnv;
    signal: AbortSignal;
    secret: string;
  },
): Promise<CommandEvidence> {
  console.log(`\n── ${label} ──`);
  const startedAt = performance.now();
  let output = '';

  return await new Promise<CommandEvidence>((resolve, reject) => {
    const child = spawn(npm, args, {
      cwd: process.cwd(),
      env: options.env,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const removeAbort = installAbortTermination(child, options.signal);

    const capture = (chunk: Buffer, target: NodeJS.WriteStream) => {
      const safe = redact(chunk.toString(), options.secret);
      output = appendTail(output, safe);
      target.write(safe);
    };
    child.stdout?.on('data', (chunk: Buffer) => capture(chunk, process.stdout));
    child.stderr?.on('data', (chunk: Buffer) => capture(chunk, process.stderr));

    child.once('error', (error) => {
      removeAbort();
      reject(error);
    });
    child.once('close', (code, signal) => {
      removeAbort();
      if (code === null && options.signal.aborted) {
        output = appendTail(output, `\nterminated by overall deadline (${signal})`);
      }
      resolve({
        exitCode: code ?? 1,
        output,
        durationMs: Math.max(0, performance.now() - startedAt),
      });
    });
  });
}

async function createTemporaryConfig(
  config: IntegrationConfig,
): Promise<{ directory: string; path: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'demo-runway-integration-'));
  const path = join(directory, 'wrangler.json');
  const vars: Record<string, string> = {
    DEMO_SIGNING_KEY: config.signingKey,
  };
  if (config.faultMode !== 'off') vars.DEMO_FAULT = config.faultMode;

  await writeFile(
    path,
    JSON.stringify(
      {
        name: 'demo-runway-integration-check',
        compatibility_date: '2026-07-10',
        compatibility_flags: ['nodejs_compat'],
        vars,
      },
      null,
      2,
    ),
    { encoding: 'utf8', mode: 0o600 },
  );
  return { directory, path };
}

function waitForDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

async function waitForServer(
  server: RunningServer,
  baseUrl: string,
  signal: AbortSignal,
): Promise<void> {
  const startedAt = performance.now();
  while (!signal.aborted) {
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(
        `dev server exited before readiness\n${server.output()}`.trim(),
      );
    }

    try {
      const attemptSignal = AbortSignal.any([
        signal,
        AbortSignal.timeout(500),
      ]);
      await fetch(baseUrl, { signal: attemptSignal });
      return;
    } catch {
      if (performance.now() - startedAt >= SERVER_STARTUP_BUDGET_MS) {
        throw new Error(
          `dev server did not become ready within ${SERVER_STARTUP_BUDGET_MS} ms`,
        );
      }
      await waitForDelay(100, signal);
    }
  }
  throw new Error('overall deadline expired during server startup');
}

async function startServer(
  config: IntegrationConfig,
  configPath: string,
  signal: AbortSignal,
): Promise<RunningServer> {
  console.log('\n── server ──');
  let output = '';
  const child = spawn(
    npm,
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(config.port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, [CONFIG_PATH_ENV]: configPath },
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  installAbortTermination(child, signal);

  const capture = (chunk: Buffer, target: NodeJS.WriteStream) => {
    const safe = redact(chunk.toString(), config.signingKey);
    output = appendTail(output, safe);
    target.write(safe);
  };
  child.stdout?.on('data', (chunk: Buffer) => capture(chunk, process.stdout));
  child.stderr?.on('data', (chunk: Buffer) => capture(chunk, process.stderr));
  child.once('error', (error) => {
    output = appendTail(output, `\nserver spawn failed: ${error.message}`);
  });

  const server = { child, output: () => output };
  try {
    await waitForServer(server, config.baseUrl, signal);
    return server;
  } catch (error) {
    // `main` cannot own the handle until this function returns. Clean it here so
    // a readiness error never leaves an untracked dev-server process behind.
    await stopServer(server);
    throw error;
  }
}

async function stopServer(server: RunningServer | undefined): Promise<void> {
  if (server === undefined) return;
  if (server.child.exitCode !== null || server.child.signalCode !== null) return;
  terminateChild(server.child, 'SIGTERM');
  await Promise.race([
    new Promise<void>((resolve) => server.child.once('close', () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
  ]);
  terminateChild(server.child, 'SIGKILL');
}

function commandFor(
  check: IntegrationCheckName,
  config: IntegrationConfig,
): { args: string[]; env: NodeJS.ProcessEnv } {
  const shared = {
    ...process.env,
    DEMO_SIGNING_KEY: config.signingKey,
    DEMO_BASE_URL: config.baseUrl,
  };
  if (check === 'operation') {
    return {
      args: ['run', 'ops:check'],
      env: { ...shared, OPS_CHECK_URL: `${config.baseUrl}/api/receipt` },
    };
  }
  if (check === 'flow') {
    return {
      args: ['run', 'test:flow'],
      env: { ...shared, PLAYWRIGHT_BASE_URL: config.baseUrl },
    };
  }
  return {
    args: ['run', 'leak:check'],
    env: { ...shared, LEAK_CHECK_URL: `${config.baseUrl}/api/receipt` },
  };
}

async function writeReport(report: unknown): Promise<void> {
  await mkdir('test-results', { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(): Promise<number> {
  let config: IntegrationConfig;
  try {
    config = resolveConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`integration check misconfigured: ${message}`);
    return 2;
  }

  const startedAtMs = performance.now();
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), config.timeBudgetMs);
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);

  let temporary: { directory: string; path: string } | undefined;
  let server: RunningServer | undefined;

  try {
    temporary = await createTemporaryConfig(config);

    const build = await runCommand('build', ['run', 'build'], {
      env: process.env,
      signal: controller.signal,
      secret: config.signingKey,
    });
    if (build.exitCode !== 0) {
      console.error('integration check setup failed [build]');
      return 1;
    }

    server = await startServer(config, temporary.path, controller.signal);

    const result = await runIntegrationChecks({
      timeBudgetMs: config.timeBudgetMs,
      startedAtMs,
      signal: controller.signal,
      runner: async (check, signal) => {
        const command = commandFor(check, config);
        return runCommand(check, command.args, {
          env: command.env,
          signal,
          secret: config.signingKey,
        });
      },
    });

    console.log(`\n${formatIntegrationSummary(result)}`);
    const report = createIntegrationReport(result, {
      faultMode: config.faultMode,
      secret: config.signingKey,
    });
    await writeReport(report);
    console.log(`Report: ${REPORT_PATH}`);
    return result.outcome === 'passed' ? 0 : 1;
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error(`integration check failed: ${redact(raw, config.signingKey)}`);
    return controller.signal.aborted ? 1 : 2;
  } finally {
    clearTimeout(deadline);
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
    await stopServer(server);
    if (temporary !== undefined) {
      await rm(temporary.directory, { recursive: true, force: true });
    }
  }
}

process.exitCode = await main();
