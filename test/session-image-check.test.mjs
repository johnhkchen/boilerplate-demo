import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatEvidence,
  parseArgs,
  parsePublishedPort,
  parseVersionDiagnostics,
  validateEntrypoint,
  validateVersions,
} from '../scripts/session-image-check.ts';

test('parseArgs returns the documented defaults', () => {
  assert.deepEqual(parseArgs([]), {
    image: 'demo-runway-session:local',
    dockerfile: 'Dockerfile.session',
    budgetMs: 60_000,
    skipBuild: false,
  });
});

test('parseArgs accepts every supported override', () => {
  assert.deepEqual(
    parseArgs([
      '--image',
      'example:test',
      '--dockerfile',
      'Containerfile',
      '--budget-ms',
      '1234',
      '--skip-build',
    ]),
    {
      image: 'example:test',
      dockerfile: 'Containerfile',
      budgetMs: 1234,
      skipBuild: true,
    },
  );
});

test('parseArgs rejects malformed options and budgets', () => {
  assert.throws(() => parseArgs(['--wat']), /Unknown option/);
  assert.throws(() => parseArgs(['--image']), /requires a value/);
  assert.throws(() => parseArgs(['--budget-ms', '0']), /positive finite/);
  assert.throws(() => parseArgs(['--budget-ms', '-1']), /positive finite/);
  assert.throws(() => parseArgs(['--budget-ms', 'nope']), /positive finite/);
});

test('parsePublishedPort accepts Docker IPv4 and IPv6 output', () => {
  assert.equal(parsePublishedPort('127.0.0.1:49152\n'), 49_152);
  assert.equal(parsePublishedPort('[::1]:49153\n'), 49_153);
});

test('parsePublishedPort rejects missing and invalid ports', () => {
  assert.throws(() => parsePublishedPort(''), /Could not parse/);
  assert.throws(() => parsePublishedPort('4321/tcp'), /Could not parse/);
  assert.throws(() => parsePublishedPort('127.0.0.1:70000'), /invalid port/);
});

test('validateEntrypoint requires the inherited Sandbox entrypoint', () => {
  assert.deepEqual(validateEntrypoint(['/container-server/sandbox']), [
    '/container-server/sandbox',
  ]);
  assert.throws(() => validateEntrypoint(['/bin/sh']), /retain the Sandbox entrypoint/);
  assert.throws(() => validateEntrypoint(null), /retain the Sandbox entrypoint/);
});

test('version diagnostics select the runtime and editor versions', () => {
  const observed = parseVersionDiagnostics(
    'v24.18.0\n11.16.0\n[2026-07-11T00:00:00Z] info\n4.127.0 abc with Code 1.127.0\n',
  );
  assert.deepEqual(observed, {
    node: 'v24.18.0',
    npm: '11.16.0',
    codeServer: '4.127.0',
  });
});

test('version validation attributes Node and code-server mismatches', () => {
  assert.throws(
    () => validateVersions({ node: 'v22.0.0', npm: '11.0.0', codeServer: '4.127.0' }),
    /Expected Node v24.18.0; observed v22.0.0/,
  );
  assert.throws(
    () => validateVersions({ node: 'v24.18.0', npm: '11.0.0', codeServer: '4.126.0' }),
    /Expected code-server 4.127.0; observed 4.126.0/,
  );
  assert.throws(() => parseVersionDiagnostics('v24.18.0\n'), /Incomplete version diagnostics/);
});

test('formatEvidence emits stable pretty JSON with a trailing newline', () => {
  const value = { ticket: 'T-004-03-01', elapsedMs: 1234 };
  const output = formatEvidence(value);
  assert.equal(output.endsWith('\n'), true);
  assert.deepEqual(JSON.parse(output), value);
});
