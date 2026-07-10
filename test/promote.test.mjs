import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import {
  EXIT,
  parsePromoteArgs,
  parseRollbackArgs,
  isUsageError,
  classifyPorcelain,
  parseWranglerOutputFile,
  parseUploadStdout,
  parseDeploymentsList,
  pickRollbackTarget,
  formatVersionTag,
  formatVersionMessage,
  formatPromoteDeployMessage,
  formatRollbackDeployMessage,
  extractCustomDomain,
} from '../src/lib/promote.ts';

// --- argument parsing -------------------------------------------------------

test('promote args: commit-ish plus flags in any order', () => {
  const args = parsePromoteArgs(['--yes', 'abc123', '--skip-verify', '--dry-run']);
  assert.deepEqual(args, {
    commitish: 'abc123',
    yes: true,
    skipVerify: true,
    dryRun: true,
  });
});

test('promote args: missing commit-ish, unknown flag, extra positional all refuse', () => {
  for (const argv of [[], ['--yes'], ['HEAD', '--bogus'], ['HEAD', 'HEAD~1']]) {
    const result = parsePromoteArgs(argv);
    assert.ok(isUsageError(result), `${JSON.stringify(argv)} → usage error`);
  }
});

test('rollback args: version id optional; misuse refuses', () => {
  assert.deepEqual(parseRollbackArgs([]), { yes: false, dryRun: false });
  assert.deepEqual(parseRollbackArgs(['ver-1', '-y']), {
    versionId: 'ver-1',
    yes: true,
    dryRun: false,
  });
  assert.ok(isUsageError(parseRollbackArgs(['--nope'])));
  assert.ok(isUsageError(parseRollbackArgs(['a', 'b'])));
});

// --- tree cleanliness (refusal rules) ---------------------------------------

test('clean porcelain is neither blocking nor warned', () => {
  assert.deepEqual(classifyPorcelain(''), { blocking: [], warnings: [] });
  assert.deepEqual(classifyPorcelain('\n\n'), { blocking: [], warnings: [] });
});

test('any tracked modification blocks (staged or unstaged)', () => {
  const status = classifyPorcelain(
    [' M src/lib/receipt.ts', 'M  package.json', 'A  scripts/new.ts'].join('\n'),
  );
  assert.equal(status.blocking.length, 3);
  assert.equal(status.warnings.length, 0);
});

test('untracked files block under build inputs and at the root, warn elsewhere', () => {
  const status = classifyPorcelain(
    [
      '?? src/__scratch.ts', // build input → block
      '?? public/x.png', // build input → block
      '?? rogue.config.mjs', // repo root (config lives here) → block
      '?? docs/active/work/T-1/notes.md', // docs → warn
      '?? .lisa/tmp.jsonl', // agent machinery → warn
    ].join('\n'),
  );
  assert.deepEqual(
    status.blocking.map((l) => l.slice(3)),
    ['src/__scratch.ts', 'public/x.png', 'rogue.config.mjs'],
  );
  assert.equal(status.warnings.length, 2);
});

// --- wrangler output capture -------------------------------------------------
// Fixtures captured from wrangler 4.110.0 against the real Worker (2026-07-10).

const OUTPUT_FILE_FIXTURE = [
  '{"type":"wrangler-session","version":1,"wrangler_version":"4.110.0","command_line_args":["versions","upload"],"log_file_path":"/x.log","timestamp":"2026-07-10T23:29:32.673Z"}',
  '{"type":"version-upload","version":1,"worker_name":"demo-runway","worker_tag":null,"version_id":"1c6af664-9bbe-416b-a62e-f6a7a5c2e0df","worker_name_overridden":false,"timestamp":"2026-07-10T23:29:32.723Z"}',
].join('\n');

test('output-file parser finds the uploaded version id', () => {
  assert.deepEqual(parseWranglerOutputFile(OUTPUT_FILE_FIXTURE), {
    versionId: '1c6af664-9bbe-416b-a62e-f6a7a5c2e0df',
  });
});

test('output-file parser tolerates dry-run (null id), torn lines, and junk', () => {
  const dryRun =
    '{"type":"version-upload","version":1,"worker_name":"demo-runway","version_id":null,"timestamp":"t"}';
  assert.deepEqual(parseWranglerOutputFile(dryRun), {});
  assert.deepEqual(parseWranglerOutputFile('not json\n{"type":"versi'), {});
  assert.deepEqual(parseWranglerOutputFile(''), {});
});

test('stdout fallback finds version id and preview URL', () => {
  const stdout = [
    'Total Upload: 1234.56 KiB / gzip: 345.67 KiB',
    'Worker Version ID: 49830810-e8b2-4ae3-9c7c-6ff98b542230',
    'Version Preview URL: https://49830810-demo-runway.example.workers.dev',
  ].join('\n');
  assert.deepEqual(parseUploadStdout(stdout), {
    versionId: '49830810-e8b2-4ae3-9c7c-6ff98b542230',
    previewUrl: 'https://49830810-demo-runway.example.workers.dev',
  });
  assert.deepEqual(parseUploadStdout('--dry-run: exiting now.'), {});
});

// --- deployment history -------------------------------------------------------
// Shape captured from `wrangler deployments list --json` (4.110.0): an array
// ordered OLDEST-first; each entry carries versions[{version_id, percentage}].

const deployment = (id, createdOn, versionId, message) => ({
  id,
  source: 'wrangler',
  strategy: 'percentage',
  annotations: {
    'workers/triggered_by': 'deployment',
    ...(message ? { 'workers/message': message } : {}),
  },
  versions: [{ version_id: versionId, percentage: 100 }],
  created_on: createdOn,
});

const HISTORY = [
  deployment('d-1', '2026-07-10T15:00:00Z', 'ver-old'),
  deployment('d-2', '2026-07-10T19:00:00Z', 'ver-prior', 'promote abc prior=ver-old'),
  deployment('d-3', '2026-07-10T23:00:00Z', 'ver-active', 'promote def prior=ver-prior'),
];

test('deployments normalize newest-first with message and serving version', () => {
  const list = parseDeploymentsList(HISTORY);
  assert.deepEqual(
    list.map((d) => d.versionId),
    ['ver-active', 'ver-prior', 'ver-old'],
  );
  assert.equal(list[0].message, 'promote def prior=ver-prior');
  assert.equal(list[2].message, undefined);
});

test('deployments parser survives junk and picks the highest-percentage version', () => {
  assert.deepEqual(parseDeploymentsList('nope'), []);
  assert.deepEqual(parseDeploymentsList([null, {}, { id: 'x', versions: [] }]), []);
  const split = {
    id: 'd-s',
    created_on: '2026-07-10T20:00:00Z',
    versions: [
      { version_id: 'ver-a', percentage: 10 },
      { version_id: 'ver-b', percentage: 90 },
    ],
  };
  assert.equal(parseDeploymentsList([split])[0].versionId, 'ver-b');
});

// --- rollback target selection ------------------------------------------------

const NORMALIZED = parseDeploymentsList(HISTORY);

test('rollback default: previous deployment version', () => {
  const choice = pickRollbackTarget(NORMALIZED);
  assert.deepEqual(choice, { versionId: 'ver-prior', warnings: [] });
});

test('rollback explicit target wins; unknown id warns but proceeds', () => {
  const known = pickRollbackTarget(NORMALIZED, 'ver-old');
  assert.deepEqual(known, { versionId: 'ver-old', warnings: [] });
  const unknown = pickRollbackTarget(NORMALIZED, 'ver-never-deployed');
  assert.equal(unknown.versionId, 'ver-never-deployed');
  assert.equal(unknown.warnings.length, 1);
});

test('rollback refuses: target already active, or no prior deployment', () => {
  assert.ok('refusal' in pickRollbackTarget(NORMALIZED, 'ver-active'));
  assert.ok('refusal' in pickRollbackTarget(NORMALIZED.slice(0, 1)));
  assert.ok('refusal' in pickRollbackTarget([]));
  const samePrior = parseDeploymentsList([
    deployment('d-1', '2026-07-10T15:00:00Z', 'ver-x'),
    deployment('d-2', '2026-07-10T16:00:00Z', 'ver-x'),
  ]);
  assert.ok('refusal' in pickRollbackTarget(samePrior));
});

test('rollback cross-checks the local record and trusts the API on mismatch', () => {
  const record = {
    action: 'promote',
    versionId: 'ver-active',
    priorVersionId: 'ver-somewhere-else',
    deployedAt: '2026-07-10T23:00:00Z',
    hostname: 'demo.b28.dev',
    hostVerified: true,
  };
  const choice = pickRollbackTarget(NORMALIZED, undefined, record);
  assert.equal(choice.versionId, 'ver-prior');
  assert.equal(choice.warnings.length, 1);
  const agreeing = pickRollbackTarget(NORMALIZED, undefined, {
    ...record,
    priorVersionId: 'ver-prior',
  });
  assert.deepEqual(agreeing.warnings, []);
});

// --- records and messages -------------------------------------------------------

test('version tag is the 12-char short sha; messages stay within budget', () => {
  const sha = 'fd90fe0123456789abcdef0123456789abcdef01';
  assert.equal(formatVersionTag(sha), 'fd90fe012345');
  assert.equal(
    formatVersionMessage(sha, 'fix the thing'),
    `${sha} fix the thing`,
  );
  const long = formatVersionMessage(sha, 'x'.repeat(200));
  assert.ok(long.length <= 100);
  assert.ok(long.endsWith('…'));
});

test('deploy messages record action and prior version', () => {
  assert.equal(
    formatPromoteDeployMessage('fd90fe012345', 'ver-prior'),
    'promote fd90fe012345 prior=ver-prior',
  );
  assert.equal(
    formatPromoteDeployMessage('fd90fe012345', null),
    'promote fd90fe012345 prior=none',
  );
  assert.equal(
    formatRollbackDeployMessage('ver-prior', 'ver-active'),
    'rollback to ver-prior from ver-active',
  );
});

// --- hostname discovery -----------------------------------------------------------

test('extractCustomDomain reads the real wrangler.jsonc', () => {
  const jsonc = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  assert.equal(extractCustomDomain(jsonc), 'demo.b28.dev');
});

test('extractCustomDomain handles key order and absence', () => {
  assert.equal(
    extractCustomDomain('{"routes":[{"custom_domain": true, "pattern": "x.example"}]}'),
    'x.example',
  );
  assert.equal(extractCustomDomain('{"name": "worker"}'), undefined);
  assert.equal(
    extractCustomDomain('{"routes":[{"pattern": "y.example/route/*"}]}'),
    undefined,
  );
});

// --- exit codes stay stable (scripts and docs both reference them) ----------------

test('exit-code contract', () => {
  assert.deepEqual(EXIT, { OK: 0, REFUSED: 1, MISCONFIGURED: 2, UNVERIFIED: 3 });
});
