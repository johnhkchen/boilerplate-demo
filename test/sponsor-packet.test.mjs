import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';

import { runLeakCheck } from '../src/lib/leak-check.ts';

// The packet mirrors the playbook's intake contract and must stay
// credential-free; these tests are the "change the fixture in the same
// breath" clause made executable.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYBOOK = join(ROOT, 'docs/knowledge/assembly-playbook.md');
const PACKET = join(ROOT, 'test/fixtures/sponsor-packet');
const EXAMPLE_ENV = join(ROOT, '.dev.vars.example');

// The Step 1 intake table is the only table in the playbook whose first
// cell is a backticked class name.
function intakeClasses(markdown) {
  return [...markdown.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]);
}

// The committed placeholder values are the only credential-adjacent strings
// in the repo that could be pasted into the packet by mistake.
function placeholderValues(envExample) {
  return [...envExample.matchAll(/^DEMO_[A-Z_]+="([^"]+)"/gm)].map((m) => m[1]);
}

async function walkFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const cleanResponse = async () => new Response('{"boundary":"receipt"}');

test('packet mirrors the playbook intake classes, one non-empty directory each', async () => {
  const classes = intakeClasses(await readFile(PLAYBOOK, 'utf8'));
  assert.ok(classes.length >= 6, 'playbook intake table not found');

  const entries = await readdir(PACKET, { withFileTypes: true });
  const directories = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  assert.deepEqual(directories.sort(), [...classes].sort());

  for (const name of classes) {
    const files = await walkFiles(join(PACKET, name));
    assert.ok(files.length >= 1, `intake class ${name} has no artifact`);
  }
});

test('packet carries the chosen core moment alongside the class mirror', async () => {
  const moment = await readFile(join(PACKET, 'core-moment.md'), 'utf8');
  assert.match(moment, /core moment/i);
});

test('leak check passes over every packet file', async () => {
  const values = placeholderValues(await readFile(EXAMPLE_ENV, 'utf8'));
  assert.ok(values.length >= 2, '.dev.vars.example placeholders not found');

  const packetFiles = await walkFiles(PACKET);
  for (const secret of values) {
    const result = await runLeakCheck({
      bundleDir: PACKET,
      responseUrl: 'https://demo.invalid/api/receipt',
      secret,
      timeBudgetMs: 100,
      fetchImpl: cleanResponse,
    });
    assert.equal(result.outcome, 'passed');
    assert.deepEqual(result.findings, []);
    assert.equal(result.checked.assetFiles, packetFiles.length);
  }
});

test('the playbook rehearsal note points at the packet', async () => {
  const playbook = await readFile(PLAYBOOK, 'utf8');
  assert.match(playbook, /test\/fixtures\/sponsor-packet/);
});
