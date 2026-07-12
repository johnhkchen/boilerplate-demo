import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  formatIntegrationSummary,
  runIntegrationChecks,
} from '../src/lib/integration-check.ts';

const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURE_CONTRACT = join(
  REPOSITORY_ROOT,
  'test/fixtures/alternate-boundary/boundary-contract.ts',
);
const PLAYWRIGHT = join(REPOSITORY_ROOT, 'node_modules/.bin/playwright');

const BOUNDARY_NAME = 'parcel-proof';
const BOUNDARY_PATH = '/api/parcel-proof';
const KEY_ENV = 'PARCEL_PROOF_KEY';
const SECRET = 'parcel-proof-swap-secret-T0100401';
const EDGE_TIMEOUT_MS = 250;
const CHILD_TIMEOUT_MS = 15_000;

const MIRRORED_FILES = [
  'scripts/ops-check.ts',
  'scripts/leak-check.ts',
  'src/lib/ops-check.ts',
  'src/lib/operation-runner.ts',
  'src/lib/leak-check.ts',
  'tests/demo-flow.spec.ts',
  'tests/support/flow-contract.ts',
  'playwright.config.ts',
];

const UNCHANGED_CONSUMERS = [
  'scripts/ops-check.ts',
  'scripts/leak-check.ts',
  'tests/demo-flow.spec.ts',
];

function fixturePage() {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Parcel Window</title></head>
  <body>
    <main>
      <h1>Parcel Window</h1>
      <p id="parcel-status">Checking the parcel…</p>
      <dl id="parcel-card" hidden>
        <div><dt>Parcel ticket</dt><dd id="parcel-ticket"></dd></div>
        <div><dt>Parcel proof</dt><dd id="parcel-proof"></dd></div>
      </dl>
      <button type="button">Check another parcel</button>
    </main>
    <script>
      const status = document.querySelector('#parcel-status');
      const card = document.querySelector('#parcel-card');
      const ticket = document.querySelector('#parcel-ticket');
      const proof = document.querySelector('#parcel-proof');
      const action = document.querySelector('button');

      async function checkParcel() {
        action.disabled = true;
        status.hidden = false;
        card.hidden = true;
        try {
          const response = await fetch(${JSON.stringify(BOUNDARY_PATH)});
          const parcel = await response.json();
          ticket.textContent = parcel.ticket;
          proof.textContent = parcel.proof;
          status.hidden = true;
          card.hidden = false;
        } finally {
          action.disabled = false;
        }
      }

      action.addEventListener('click', checkParcel);
      void checkParcel();
    </script>
  </body>
</html>`;
}

async function createSwapRoot(t) {
  const root = await mkdtemp(join(REPOSITORY_ROOT, '.swap-proof-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const relativePath of MIRRORED_FILES) {
    const destination = join(root, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(REPOSITORY_ROOT, relativePath), destination);
  }

  const declarationPath = join(root, 'src/lib/boundary-contract.ts');
  await mkdir(dirname(declarationPath), { recursive: true });
  await copyFile(FIXTURE_CONTRACT, declarationPath);

  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(join(root, 'dist/index.html'), '<main>safe fixture</main>\n');

  for (const relativePath of UNCHANGED_CONSUMERS) {
    const [source, mirror] = await Promise.all([
      readFile(join(REPOSITORY_ROOT, relativePath)),
      readFile(join(root, relativePath)),
    ]);
    assert.deepEqual(mirror, source, `${relativePath} must be copied unchanged`);
  }

  return root;
}

function signedParcel(ticket) {
  return {
    service: 'parcel',
    ticket,
    proof: createHmac('sha256', SECRET).update(ticket).digest('hex'),
  };
}

async function startStub(mode, t) {
  let sequence = 0;
  const sockets = new Set();
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture.invalid');
    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(fixturePage());
      return;
    }
    if (url.pathname !== BOUNDARY_PATH) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
      return;
    }
    if (mode === 'stalled') return;

    sequence += 1;
    const ticket = `PX-${String(sequence).padStart(4, '0')}`;
    const parcel = signedParcel(ticket);
    const body = mode === 'broken'
      ? { ...parcel, proof: '0'.repeat(64) }
      : mode === 'leak'
        ? { ...parcel, diagnosticKey: SECRET }
        : parcel;

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  });

  const address = server.address();
  assert(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { baseUrl, boundaryUrl: `${baseUrl}${BOUNDARY_PATH}` };
}

async function runChild(command, args, { cwd, env, timeoutMs = CHILD_TIMEOUT_MS }) {
  const startedAt = performance.now();
  let output = '';

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (signal === 'SIGKILL') output += '\nchild exceeded its outer timeout';
      resolve({
        exitCode: code ?? 1,
        output,
        durationMs: Math.max(0, performance.now() - startedAt),
      });
    });
  });
}

function alternateEnv(urls) {
  return {
    [KEY_ENV]: SECRET,
    DEMO_BASE_URL: urls.baseUrl,
  };
}

function runOperation(root, urls) {
  return runChild(
    process.execPath,
    ['--experimental-strip-types', 'scripts/ops-check.ts'],
    {
      cwd: root,
      env: {
        ...alternateEnv(urls),
        OPS_CHECK_URL: urls.boundaryUrl,
        OPS_CHECK_TIMEOUT_MS: String(EDGE_TIMEOUT_MS),
      },
    },
  );
}

function runLeak(root, urls) {
  return runChild(
    process.execPath,
    ['--experimental-strip-types', 'scripts/leak-check.ts'],
    {
      cwd: root,
      env: {
        ...alternateEnv(urls),
        LEAK_CHECK_DIR: 'dist',
        LEAK_CHECK_URL: urls.boundaryUrl,
        LEAK_CHECK_TIMEOUT_MS: String(EDGE_TIMEOUT_MS),
      },
    },
  );
}

function runFlow(root, urls) {
  return runChild(
    PLAYWRIGHT,
    ['test', '--config', join(root, 'playwright.config.ts'), '--project', 'healthy'],
    {
      cwd: root,
      env: {
        ...alternateEnv(urls),
        PLAYWRIGHT_BASE_URL: urls.baseUrl,
      },
    },
  );
}

async function normalize(evidenceByCheck) {
  return runIntegrationChecks(
    { name: BOUNDARY_NAME },
    {
      timeBudgetMs: 30_000,
      runner: async (check) => evidenceByCheck[check] ?? {
        exitCode: 0,
        output: `${check} not needed for this focused fault`,
        durationMs: 0,
      },
    },
  );
}

function checkResult(result, name) {
  const found = result.checks.find((candidate) => candidate.check === name);
  assert(found, `missing normalized ${name} result`);
  return found;
}

test('an alternate declaration drives unchanged operation, leak, and flow checks', {
  timeout: 45_000,
}, async (t) => {
  await t.test('healthy alternate boundary passes every check', async (t) => {
    const root = await createSwapRoot(t);
    const urls = await startStub('healthy', t);
    const [operation, flow, leak] = await Promise.all([
      runOperation(root, urls),
      runFlow(root, urls),
      runLeak(root, urls),
    ]);

    assert.equal(operation.exitCode, 0, operation.output);
    assert.equal(flow.exitCode, 0, flow.output);
    assert.equal(leak.exitCode, 0, leak.output);
    assert.match(operation.output, /parcel-proof.*passed/);
    assert.doesNotMatch(`${operation.output}${flow.output}${leak.output}`, new RegExp(SECRET));

    const result = await normalize({ operation, flow, leak });
    assert.equal(result.outcome, 'passed');
    assert.deepEqual(result.checks.map((check) => check.boundary), [
      BOUNDARY_NAME,
      BOUNDARY_NAME,
      BOUNDARY_NAME,
    ]);
    assert.ok(result.checks.every((check) => check.outcome === 'passed'));
  });

  await t.test('broken alternate boundary names an operation failure', async (t) => {
    const root = await createSwapRoot(t);
    const urls = await startStub('broken', t);
    const operation = await runOperation(root, urls);

    assert.notEqual(operation.exitCode, 0, operation.output);
    assert.match(operation.output, /parcel-proof.*\[operation\]/);

    const result = await normalize({ operation });
    const failed = checkResult(result, 'operation');
    assert.equal(result.outcome, 'failed');
    assert.equal(failed.boundary, BOUNDARY_NAME);
    assert.equal(failed.failureKind, 'operation');
    assert.match(formatIntegrationSummary(result), /parcel-proof \[operation\]/);
  });

  await t.test('stalled alternate boundary names timeout failures', async (t) => {
    const root = await createSwapRoot(t);
    const urls = await startStub('stalled', t);
    const [operation, flow] = await Promise.all([
      runOperation(root, urls),
      runFlow(root, urls),
    ]);

    assert.notEqual(operation.exitCode, 0, operation.output);
    assert.notEqual(flow.exitCode, 0, flow.output);

    const result = await normalize({ operation, flow });
    const operationFailure = checkResult(result, 'operation');
    const flowFailure = checkResult(result, 'flow');
    assert.equal(operationFailure.boundary, BOUNDARY_NAME);
    assert.equal(operationFailure.failureKind, 'timeout');
    assert.equal(flowFailure.boundary, BOUNDARY_NAME);
    assert.equal(flowFailure.failureKind, 'timeout');
    assert.match(formatIntegrationSummary(result), /parcel-proof \[timeout\]/);
  });

  await t.test('leaking alternate boundary names a leak failure', async (t) => {
    const root = await createSwapRoot(t);
    const urls = await startStub('leak', t);
    const [operation, leak] = await Promise.all([
      runOperation(root, urls),
      runLeak(root, urls),
    ]);

    assert.equal(operation.exitCode, 0, operation.output);
    assert.notEqual(leak.exitCode, 0, leak.output);
    assert.doesNotMatch(`${operation.output}${leak.output}`, new RegExp(SECRET));

    const result = await normalize({ operation, leak });
    const failed = checkResult(result, 'leak');
    assert.equal(result.outcome, 'failed');
    assert.equal(failed.boundary, BOUNDARY_NAME);
    assert.equal(failed.failureKind, 'leak');
    assert.match(formatIntegrationSummary(result), /parcel-proof \[leak\]/);
  });
});
