import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  ASTRO_PROCESS_ID,
  ASTRO_PORT,
  BAKED_PROJECT,
  CODE_SERVER_PORT,
  SESSION_GIT_DIR,
  SESSION_PATCH_LIMIT_BYTES,
  SESSION_PRESERVATION_PATH,
  SESSION_WORKTREE,
  boundedLog,
  buildAstroCommand,
  buildAstroConfig,
  buildCodeServerCommand,
  buildProvisionCommand,
  buildPreservationCommand,
  classifyControlRequest,
  classifyProxyHost,
  isCommitRevision,
  isWebSocketUpgrade,
  parseSessionConfig,
  parseDownInput,
  parsePreservationInspection,
  parseRuntimeSecrets,
  parseUpInput,
  readBoundedJson,
  redactSecrets,
  safeErrorMessage,
  safePublicError,
  sessionUrls,
} from '../src/lib/session-lifecycle.ts';
import {
  parseSessionAccessToken,
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

test('runtime secret maps accept safe JSON and reject unsafe shapes without echoing values', () => {
  assert.deepEqual(parseRuntimeSecrets('{}'), {});
  assert.deepEqual(
    parseRuntimeSecrets('{"DEMO_API_TOKEN":"alpha-secret-value","AGENT_KEY":"bravo-secret-value"}'),
    { DEMO_API_TOKEN: 'alpha-secret-value', AGENT_KEY: 'bravo-secret-value' },
  );
  for (const value of [
    undefined,
    'not-json-sensitive-value',
    '[]',
    '{"bad-name":"long-enough-value"}',
    '{"PATH":"long-enough-value"}',
    '{"SESSION_SLUG":"long-enough-value"}',
    '{"TOKEN":"short"}',
    '{"TOKEN":42}',
  ]) {
    assert.throws(
      () => parseRuntimeSecrets(value),
      (error) => !String(error).includes('sensitive-value') && !String(error).includes('long-enough-value'),
    );
  }
  const tooMany = Object.fromEntries(
    Array.from({ length: 33 }, (_, index) => [`TOKEN_${index}`, `secret-value-${index}`]),
  );
  assert.throws(() => parseRuntimeSecrets(JSON.stringify(tooMany)), /at most 32/);
});

test('secret redaction replaces exact and overlapping values before public error bounding', () => {
  const secrets = { SHORT: 'secret-1', LONG: 'secret-1-extended' };
  assert.equal(
    redactSecrets('before secret-1-extended and secret-1 after', secrets),
    'before [REDACTED] and [REDACTED] after',
  );
  assert.equal(
    safePublicError(new Error('first\nsecret-1-extended\tlast'), secrets, 100),
    'first [REDACTED] last',
  );
});

test('down input requires preserve, digest acknowledgement, or explicit force', () => {
  const digest = 'a'.repeat(64);
  assert.deepEqual(parseDownInput({ mode: 'preserve' }), {
    ok: true,
    status: 200,
    value: { mode: 'preserve' },
  });
  assert.deepEqual(parseDownInput({ mode: 'destroy', preservationSha256: digest }), {
    ok: true,
    status: 200,
    value: { mode: 'destroy', preservationSha256: digest },
  });
  assert.deepEqual(parseDownInput({ mode: 'destroy', force: true }), {
    ok: true,
    status: 200,
    value: { mode: 'destroy', force: true },
  });
  for (const value of [
    null,
    {},
    { mode: 'destroy' },
    { mode: 'destroy', force: false },
    { mode: 'destroy', force: true, extra: true },
    { mode: 'destroy', preservationSha256: 'A'.repeat(64) },
  ]) {
    const result = parseDownInput(value);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'invalid_down_request');
  }
});

test('bounded JSON reader accepts small bodies and rejects malformed or oversized streams', async () => {
  const valid = await readBoundedJson(
    new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ revision }),
    }),
  );
  assert.deepEqual(valid, {
    ok: true,
    status: 200,
    value: { revision },
  });

  const malformed = await readBoundedJson(
    new Request('https://example.com', { method: 'POST', body: '{' }),
  );
  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 400);

  const oversized = await readBoundedJson(
    new Request('https://example.com', { method: 'POST', body: '123456' }),
    5,
  );
  assert.equal(oversized.ok, false);
  assert.equal(oversized.status, 413);
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

test('preservation command stages all changes and emits a bounded binary patch contract', () => {
  const command = buildPreservationCommand();
  assert.match(command, /git .* add -A/);
  assert.match(command, /diff --cached --binary --full-index HEAD/);
  assert.match(command, /sha256sum/);
  assert.match(command, /wc -c/);
  assert.match(command, new RegExp(SESSION_PRESERVATION_PATH.replaceAll('/', '\\/')));
  assert.equal(SESSION_PATCH_LIMIT_BYTES, 2 * 1024 * 1024);
});

test('preservation metadata parser accepts strict clean and dirty results', () => {
  const digest = 'b'.repeat(64);
  assert.deepEqual(
    parsePreservationInspection(`state=clean\nbase_revision=${revision}\n`),
    { state: 'clean', baseRevision: revision },
  );
  assert.deepEqual(
    parsePreservationInspection(
      `state=dirty\nbase_revision=${revision}\nbytes=123\nsha256=${digest}\n`,
    ),
    { state: 'dirty', baseRevision: revision, bytes: 123, sha256: digest },
  );
  for (const value of [
    '',
    `state=clean\nbase_revision=main\n`,
    `state=dirty\nbase_revision=${revision}\nbytes=0\nsha256=${digest}\n`,
    `state=dirty\nbase_revision=${revision}\nbytes=1\nsha256=nope\n`,
    `state=clean\nbase_revision=${revision}\nextra=yes\n`,
  ]) {
    assert.throws(() => parsePreservationInspection(value), /invalid preservation metadata/);
  }
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
  assert.deepEqual(parseSessionArguments(['down', '--force']), {
    operation: 'down',
    method: 'POST',
    path: '/__session/down',
    force: true,
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

test('CLI Access token accepts only a bounded non-whitespace application token', () => {
  const token = 'header.payload.signature';
  assert.equal(parseSessionAccessToken(undefined), undefined);
  assert.equal(parseSessionAccessToken(token), token);
  for (const value of ['', 'too-short', ` ${token}`, `${token}\n`, 'x'.repeat(16 * 1024 + 1)]) {
    assert.throws(() => parseSessionAccessToken(value));
  }
});

test('CLI sends and redacts an interactive identity Access token', async () => {
  const token = 'header.payload.identity-signature';
  const writes = { stdout: '', stderr: '' };
  let observedToken;
  const exitCode = await runSessionCommand({
    argv: ['status'],
    workerUrl: 'https://demo-session.example.test',
    accessToken: token,
    fetchImpl: async (_input, init) => {
      observedToken = new Headers(init.headers).get('cf-access-token');
      return Response.json({ ok: true, diagnostic: token });
    },
    stdout: { write: (value) => ((writes.stdout += value), true) },
    stderr: { write: (value) => ((writes.stderr += value), true) },
  });
  assert.equal(exitCode, 0);
  assert.equal(observedToken, token);
  assert.doesNotMatch(writes.stdout, new RegExp(token.replaceAll('.', '\\.')));
  assert.match(writes.stdout, /\[REDACTED\]/);
  assert.equal(writes.stderr, '');
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

test('CLI safe down destroys a clean workspace in one explicit preserve request', async () => {
  const writes = { stdout: '', stderr: '' };
  const requests = [];
  const exitCode = await runSessionCommand({
    argv: ['down'],
    workerUrl: 'https://sessions.example.com',
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return Response.json({ ok: true, operation: 'down', changed: true, phase: 'idle' });
    },
    stdout: { write: (value) => ((writes.stdout += value), true) },
    stderr: { write: (value) => ((writes.stderr += value), true) },
  });
  assert.equal(exitCode, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.body, JSON.stringify({ mode: 'preserve' }));
  assert.match(writes.stdout, /"phase": "idle"/);
  assert.equal(writes.stderr, '');
});

test('CLI safe down persists a verified dirty patch before digest-acknowledged destroy', async () => {
  const content = Buffer.from('diff --git a/demo.txt b/demo.txt\n');
  const sha256 = createHash('sha256').update(content).digest('hex');
  const writes = { stdout: '', stderr: '', files: [] };
  const bodies = [];
  const exitCode = await runSessionCommand({
    argv: ['down'],
    workerUrl: 'https://sessions.example.com',
    artifactDirectory: '/safe',
    writePatch: (path, value) => writes.files.push({ path, value: Buffer.from(value) }),
    fetchImpl: async (_input, init) => {
      bodies.push(JSON.parse(init.body));
      if (bodies.length === 1) {
        return Response.json({
          ok: true,
          operation: 'down',
          changed: false,
          phase: 'ready',
          preservation: {
            baseRevision: revision,
            sha256,
            bytes: content.byteLength,
            contentBase64: content.toString('base64'),
          },
        });
      }
      return Response.json({
        ok: true,
        operation: 'down',
        changed: true,
        phase: 'idle',
        preservationSha256: sha256,
      });
    },
    stdout: { write: (value) => ((writes.stdout += value), true) },
    stderr: { write: (value) => ((writes.stderr += value), true) },
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(bodies, [
    { mode: 'preserve' },
    { mode: 'destroy', preservationSha256: sha256 },
  ]);
  assert.equal(writes.files.length, 1);
  assert.match(writes.files[0].path, /demo-runway-session-0123456789ab-[0-9a-f]{12}\.patch$/);
  assert.deepEqual(writes.files[0].value, content);
  assert.match(writes.stdout, /"path": "\/safe\//);
  assert.doesNotMatch(writes.stdout, /contentBase64/);
  assert.equal(writes.stderr, '');
});

test('CLI refuses destroy when patch verification or local persistence fails', async () => {
  let requests = 0;
  const mismatch = await runSessionCommand({
    argv: ['down'],
    workerUrl: 'https://sessions.example.com',
    fetchImpl: async () => {
      requests += 1;
      return Response.json({
        ok: true,
        preservation: {
          baseRevision: revision,
          sha256: 'a'.repeat(64),
          bytes: 5,
          contentBase64: Buffer.from('patch').toString('base64'),
        },
      });
    },
    stdout: { write: () => true },
    stderr: { write: () => true },
  });
  assert.equal(mismatch, 1);
  assert.equal(requests, 1);

  const content = Buffer.from('patch');
  const sha256 = createHash('sha256').update(content).digest('hex');
  requests = 0;
  const writeFailure = await runSessionCommand({
    argv: ['down'],
    workerUrl: 'https://sessions.example.com',
    fetchImpl: async () => {
      requests += 1;
      return Response.json({
        ok: true,
        preservation: {
          baseRevision: revision,
          sha256,
          bytes: content.byteLength,
          contentBase64: content.toString('base64'),
        },
      });
    },
    writePatch: () => {
      throw new Error('disk full');
    },
    stdout: { write: () => true },
    stderr: { write: () => true },
  });
  assert.equal(writeFailure, 1);
  assert.equal(requests, 1);
});

test('CLI force down sends explicit destructive confirmation and redacts configured values', async () => {
  const secret = 'super-secret-value';
  const writes = { stdout: '', stderr: '' };
  let body;
  const exitCode = await runSessionCommand({
    argv: ['down', '--force'],
    workerUrl: 'https://sessions.example.com',
    runtimeSecretsJson: JSON.stringify({ DEMO_TOKEN: secret }),
    fetchImpl: async (_input, init) => {
      body = JSON.parse(init.body);
      return Response.json({ ok: true, forced: true, diagnostic: secret });
    },
    stdout: { write: (value) => ((writes.stdout += value), true) },
    stderr: { write: (value) => ((writes.stderr += value), true) },
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(body, { mode: 'destroy', force: true });
  assert.doesNotMatch(writes.stdout, new RegExp(secret));
  assert.match(writes.stdout, /\[REDACTED\]/);
  assert.equal(writes.stderr, '');
});
