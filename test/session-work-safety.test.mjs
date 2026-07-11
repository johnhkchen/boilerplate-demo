import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  SESSION_PRESERVATION_PATH,
  SESSION_RUNTIME_DIR,
  SESSION_WORKTREE,
  buildPreservationCommand,
  parsePreservationInspection,
} from '../src/lib/session-lifecycle.ts';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed:\n${result.stderr}\n${result.stdout}`,
  );
  return result.stdout.trim();
}

test('preservation patch recovers tracked, untracked, deleted, binary, and mode changes', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'demo-runway-preservation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const runtime = join(root, 'runtime');
  const patchPath = join(runtime, 'uncommitted-work.patch');
  mkdirSync(source);

  run('git', ['init', '--quiet'], source);
  run('git', ['config', 'user.name', 'Session Safety Test'], source);
  run('git', ['config', 'user.email', 'session-safety@example.invalid'], source);
  writeFileSync(join(source, 'tracked.txt'), 'before\n');
  writeFileSync(join(source, 'deleted.txt'), 'remove me\n');
  writeFileSync(join(source, 'mode.sh'), '#!/bin/sh\nexit 0\n');
  run('git', ['add', '.'], source);
  run('git', ['commit', '--quiet', '-m', 'base'], source);

  writeFileSync(join(source, 'tracked.txt'), 'after\n');
  rmSync(join(source, 'deleted.txt'));
  writeFileSync(join(source, 'untracked.txt'), 'new file\n');
  writeFileSync(join(source, 'untracked.bin'), Buffer.from([0, 1, 2, 3, 255, 0, 128]));
  chmodSync(join(source, 'mode.sh'), 0o755);

  const command = buildPreservationCommand()
    .replaceAll(SESSION_PRESERVATION_PATH, patchPath)
    .replaceAll(SESSION_RUNTIME_DIR, runtime)
    .replaceAll(SESSION_WORKTREE, source);
  const inspection = parsePreservationInspection(run('/bin/sh', ['-c', command], root));
  assert.equal(inspection.state, 'dirty');
  const patch = readFileSync(patchPath);
  assert.equal(inspection.bytes, patch.byteLength);
  assert.equal(inspection.sha256, createHash('sha256').update(patch).digest('hex'));

  const recovered = join(root, 'recovered');
  run('git', ['clone', '--quiet', source, recovered], root);
  run('git', ['apply', '--binary', '--index', patchPath], recovered);
  assert.equal(run('git', ['write-tree'], source), run('git', ['write-tree'], recovered));
  assert.equal(readFileSync(join(recovered, 'untracked.bin')).equals(readFileSync(join(source, 'untracked.bin'))), true);
});

