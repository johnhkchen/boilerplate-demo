import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASTRO_PROCESS_ID,
  ASTRO_PORT,
  BAKED_PROJECT,
  CODE_SERVER_PORT,
  SESSION_ASTRO_CONFIG_PATH,
  SESSION_GIT_DIR,
  SESSION_WORKTREE,
  boundedLog,
  buildAstroCommand,
  buildAstroConfig,
  buildCodeServerCommand,
  buildProvisionCommand,
  classifyControlRequest,
  classifyProxyHost,
  isCommitRevision,
  isWebSocketUpgrade,
  parseSessionConfig,
  parseUpInput,
  safeErrorMessage,
  sessionUrls,
} from '../src/lib/session-lifecycle.ts';
import {
  parseSessionArguments,
  parseSessionWorkerUrl,
  runSessionCommand,
} from '../scripts/session.ts';

const revision = '0123456789abcdef0123456789abcdef01234567';
const config = parseSessionConfig({
  SESSION_SLUG: 'session',
  SESSION_DOMAIN: 'b28.dev',
  SESSION_REPOSITORY_URL: 'https://github.com/johnhkchen/boilerplate-demo.git',
});

test('commit revision requires exactly 40 lowercase hexadecimal characters', () => {
  assert.equal(isCommitRevision(revision), true);
  for (const value of [
    revision.toUpperCase(),
    revision.slice(1),
    `${revision}0`,
    'main',
    '',
    null,
  ]) {
    assert.equal(isCommitRevision(value), false);
  }
});

test('up input accepts only one valid revision field', () => {
  assert.deepEqual(parseUpInput({ revision }), {
    ok: true,
    status: 200,
    value: { revision },
  });
  for (const value of [
    null,
    [],
    {},
    { revision: 'main' },
    { revision, extra: true },
  ]) {
    const result = parseUpInput(value);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.error.code, 'invalid_revision');
  }
});

test('session config produces exact fixed hosts from safe variables', () => {
  assert.deepEqual(config, {
    slug: 'session',
    domain: 'b28.dev',
    repositoryUrl: 'https://github.com/johnhkchen/boilerplate-demo.git',
    previewHost: 'demo-session.b28.dev',
    editorHost: 'code-session.b28.dev',
  });
  assert.deepEqual(sessionUrls(config), {
    previewUrl: 'https://demo-session.b28.dev',
    editorUrl: 'https://code-session.b28.dev',
  });
});

test('session config rejects unsafe slugs, domains, and repository URLs', () => {
  const valid = {
    SESSION_SLUG: 'session',
    SESSION_DOMAIN: 'b28.dev',
    SESSION_REPOSITORY_URL: 'https://example.com/repo.git',
  };
  for (const patch of [
    { SESSION_SLUG: 'Bad_slug' },
    { SESSION_DOMAIN: '*.b28.dev' },
    { SESSION_REPOSITORY_URL: 'http://example.com/repo.git' },
    { SESSION_REPOSITORY_URL: 'https://token@example.com/repo.git' },
    { SESSION_REPOSITORY_URL: 'not a url' },
  ]) {
    assert.throws(() => parseSessionConfig({ ...valid, ...patch }));
  }
});

test('control classifier enforces the exact path and method contract', () => {
  assert.deepEqual(classifyControlRequest('POST', '/__session/up'), {
    kind: 'operation',
    operation: 'up',
  });
  assert.deepEqual(classifyControlRequest('GET', '/__session/status'), {
    kind: 'operation',
    operation: 'status',
  });
  assert.deepEqual(classifyControlRequest('GET', '/__session/logs'), {
    kind: 'operation',
    operation: 'logs',
  });
  assert.deepEqual(classifyControlRequest('POST', '/__session/down'), {
    kind: 'operation',
    operation: 'down',
  });
  assert.deepEqual(classifyControlRequest('GET', '/__session/up'), {
    kind: 'method-not-allowed',
    allow: 'POST',
  });
  assert.deepEqual(classifyControlRequest('GET', '/__session/unknown'), {
    kind: 'method-not-allowed',
    allow: '',
  });
  assert.deepEqual(classifyControlRequest('GET', '/api/receipt'), {
    kind: 'not-control',
  });
});

test('proxy host classification is exact and case insensitive', () => {
  assert.equal(classifyProxyHost('demo-session.b28.dev', config), 'preview');
  assert.equal(classifyProxyHost('CODE-SESSION.B28.DEV', config), 'editor');
  assert.equal(classifyProxyHost('demo.b28.dev', config), null);
  assert.equal(classifyProxyHost('evil-demo-session.b28.dev', config), null);
});

test('WebSocket upgrade detection is case insensitive', () => {
  assert.equal(
    isWebSocketUpgrade(new Request('https://example.com', { headers: { Upgrade: 'WebSocket' } })),
    true,
  );
  assert.equal(isWebSocketUpgrade(new Request('https://example.com')), false);
});

test('bounded logs retain the recent byte tail and report truncation', () => {
  assert.deepEqual(boundedLog('hello', 5), {
    value: 'hello',
    truncated: false,
    originalBytes: 5,
  });
  assert.deepEqual(boundedLog('before-after', 5), {
    value: 'after',
    truncated: true,
    originalBytes: 12,
  });
  const unicode = boundedLog('🙂🙂', 5);
  assert.equal(unicode.truncated, true);
  assert.equal(unicode.originalBytes, 8);
  assert.throws(() => boundedLog('x', 0));
});

test('provision command uses fixed paths and environment variables without user interpolation', () => {
  const command = buildProvisionCommand();
  assert.match(command, new RegExp(SESSION_GIT_DIR.replaceAll('/', '\\/')));
  assert.match(command, new RegExp(SESSION_WORKTREE.replaceAll('/', '\\/')));
  assert.match(command, new RegExp(BAKED_PROJECT.replaceAll('/', '\\/')));
  assert.match(command, /\$SESSION_REPOSITORY_URL/);
  assert.match(command, /\$SESSION_REVISION/);
  assert.match(command, /worktree add --detach/);
  assert.match(command, /exit 42/);
  assert.doesNotMatch(command, new RegExp(revision));
});

test('Astro config contains the exact branded HMR contract', () => {
  const generated = buildAstroConfig(config);
  assert.match(generated, /demo-session\.b28\.dev/);
  assert.match(generated, new RegExp(`port: ${ASTRO_PORT}`));
  assert.match(generated, /protocol: 'wss'/);
  assert.match(generated, /clientPort: 443/);
  assert.match(generated, /allowedHosts: \["demo-session\.b28\.dev"\]/);
  assert.match(generated, new RegExp(`file://${SESSION_WORKTREE}/astro\\.config\\.mjs`));
});

test('service commands use stable paths, ports, and no embedded credentials', () => {
  assert.equal(
    buildAstroCommand(),
    `./node_modules/.bin/astro --root ${SESSION_WORKTREE} --config ../session-runtime/astro.config.mjs dev`,
  );
  const codeServer = buildCodeServerCommand();
  assert.match(codeServer, new RegExp(`0\\.0\\.0\\.0:${CODE_SERVER_PORT}`));
  assert.match(codeServer, /--auth none/);
  assert.match(codeServer, new RegExp(`${SESSION_WORKTREE}$`));
  assert.equal(ASTRO_PROCESS_ID, 'astro-dev');
});

test('safe errors are single-line and bounded', () => {
  assert.equal(safeErrorMessage(new Error('first\nsecond'), 20), 'first second');
  assert.equal(safeErrorMessage('abcdefgh', 4), 'abcd');
  assert.equal(safeErrorMessage(''), 'unknown session error');
});

test('CLI parser maps the four commands to the control contract', () => {
  assert.deepEqual(parseSessionArguments(['up', revision]), {
    operation: 'up',
    method: 'POST',
    path: '/__session/up',
    revision,
  });
  assert.deepEqual(parseSessionArguments(['status']), {
    operation: 'status',
    method: 'GET',
    path: '/__session/status',
  });
  assert.deepEqual(parseSessionArguments(['logs']), {
    operation: 'logs',
    method: 'GET',
    path: '/__session/logs',
  });
  assert.deepEqual(parseSessionArguments(['down']), {
    operation: 'down',
    method: 'POST',
    path: '/__session/down',
  });
  for (const argv of [[], ['up'], ['up', 'main'], ['status', 'extra'], ['wat']]) {
    assert.throws(() => parseSessionArguments(argv));
  }
});

test('CLI worker URL accepts only credential-free HTTP(S) origins', () => {
  assert.equal(parseSessionWorkerUrl('https://sessions.example.com').href, 'https://sessions.example.com/');
  assert.equal(parseSessionWorkerUrl('http://localhost:8787').href, 'http://localhost:8787/');
  for (const value of [
    undefined,
    '',
    'sessions.example.com',
    'ftp://sessions.example.com',
    'https://token@sessions.example.com',
    'https://sessions.example.com/path',
  ]) {
    assert.throws(() => parseSessionWorkerUrl(value));
  }
});

test('CLI up sends the exact JSON request and prints successful JSON', async () => {
  const writes = { stdout: '', stderr: '' };
  let observed;
  const exitCode = await runSessionCommand({
    argv: ['up', revision],
    workerUrl: 'https://sessions.example.com',
    fetchImpl: async (input, init) => {
      observed = { url: String(input), init };
      return Response.json({ ok: true, operation: 'up' });
    },
    stdout: { write: (value) => ((writes.stdout += value), true) },
    stderr: { write: (value) => ((writes.stderr += value), true) },
  });
  assert.equal(exitCode, 0);
  assert.equal(observed.url, 'https://sessions.example.com/__session/up');
  assert.equal(observed.init.method, 'POST');
  assert.equal(observed.init.body, JSON.stringify({ revision }));
  assert.equal(new Headers(observed.init.headers).get('content-type'), 'application/json');
  assert.equal(writes.stdout, '{\n  "ok": true,\n  "operation": "up"\n}\n');
  assert.equal(writes.stderr, '');
});

test('CLI reports Worker and invocation failures without throwing', async () => {
  const httpWrites = { stdout: '', stderr: '' };
  const httpExit = await runSessionCommand({
    argv: ['status'],
    workerUrl: 'http://localhost:8787',
    fetchImpl: async () => Response.json({ ok: false, error: { code: 'not_ready' } }, { status: 503 }),
    stdout: { write: (value) => ((httpWrites.stdout += value), true) },
    stderr: { write: (value) => ((httpWrites.stderr += value), true) },
  });
  assert.equal(httpExit, 1);
  assert.equal(httpWrites.stdout, '');
  assert.match(httpWrites.stderr, /not_ready/);

  const usageWrites = { stdout: '', stderr: '' };
  const usageExit = await runSessionCommand({
    argv: ['up', 'main'],
    workerUrl: 'http://localhost:8787',
    stdout: { write: (value) => ((usageWrites.stdout += value), true) },
    stderr: { write: (value) => ((usageWrites.stderr += value), true) },
  });
  assert.equal(usageExit, 2);
  assert.match(usageWrites.stderr, /40-character/);
  assert.match(usageWrites.stderr, /usage:/);
});
