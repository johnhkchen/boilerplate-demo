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
    `npm run dev -- ${SESSION_WORKTREE} --config ${SESSION_ASTRO_CONFIG_PATH}`,
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
