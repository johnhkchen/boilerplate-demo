import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  formatLeakCheck,
  runLeakCheck,
} from '../src/lib/leak-check.ts';
import { leakSigningKey } from '../src/lib/fault.ts';
import { makeReceipt } from '../src/lib/receipt.ts';

const SECRET = 'fixture-signing-marker-T0020202';
const URL = 'https://demo.invalid/api/receipt';

async function bundleFixture(files) {
  const root = await mkdtemp(join(tmpdir(), 'leak-check-'));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, contents);
  }
  return root;
}

const responseWith = (body, status = 200) => async () =>
  new Response(body, { status });

test('configured clean bundle and response pass with both surfaces counted', async (t) => {
  const bundleDir = await bundleFixture({
    'index.html': '<main>Demo Runway</main>',
    '_astro/app.js': 'fetch("/api/receipt")',
  });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));

  const result = await runLeakCheck({
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
    fetchImpl: responseWith('{"boundary":"receipt"}'),
  });

  assert.equal(result.outcome, 'passed');
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.checked, { assetFiles: 2, responseBodies: 1 });
});

test('asset leak fails and identifies its exact relative client path', async (t) => {
  const bundleDir = await bundleFixture({
    'index.html': '<main>safe</main>',
    '_astro/nested/app.js': `window.debugKey = ${JSON.stringify(SECRET)}`,
  });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));

  const result = await runLeakCheck({
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
    fetchImpl: responseWith('{}'),
  });

  assert.equal(result.outcome, 'failed');
  assert.deepEqual(result.findings, [
    { surface: 'asset', location: '_astro/nested/app.js' },
  ]);
});

test('server output and deploy metadata are not classified as browser assets', async (t) => {
  const bundleDir = await bundleFixture({
    'index.html': '<main>safe</main>',
    '_worker.js/index.js': SECRET,
    '_worker.js/chunks/route.mjs': SECRET,
    '_routes.json': SECRET,
    '.assetsignore': SECRET,
  });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));

  const result = await runLeakCheck({
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
    fetchImpl: responseWith('{}'),
  });

  assert.equal(result.outcome, 'passed');
  assert.equal(result.checked.assetFiles, 1);
});

test('raw response leak fails and identifies the exact response body URL', async (t) => {
  const bundleDir = await bundleFixture({ 'index.html': '<main>safe</main>' });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));

  const result = await runLeakCheck({
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
    fetchImpl: responseWith(JSON.stringify({ diagnosticSigningKey: SECRET })),
  });

  assert.equal(result.outcome, 'failed');
  assert.deepEqual(result.findings, [{ surface: 'response', location: URL }]);
});

test('actual leak fault payload is detected while the same healthy receipt passes', async (t) => {
  const bundleDir = await bundleFixture({ 'index.html': '<main>safe</main>' });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));
  const receipt = await makeReceipt(SECRET);
  const config = {
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
  };

  const healthy = await runLeakCheck({
    ...config,
    fetchImpl: responseWith(JSON.stringify(receipt)),
  });
  const leaking = await runLeakCheck({
    ...config,
    fetchImpl: responseWith(JSON.stringify(leakSigningKey(receipt, SECRET))),
  });

  assert.equal(healthy.outcome, 'passed');
  assert.equal(leaking.outcome, 'failed');
  assert.deepEqual(leaking.findings, [{ surface: 'response', location: URL }]);
});

test('all leak locations are deterministic and formatted without the key', async (t) => {
  const bundleDir = await bundleFixture({
    'z.js': SECRET,
    'a.js': SECRET,
  });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));

  const result = await runLeakCheck({
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
    fetchImpl: responseWith(SECRET),
  });
  const output = formatLeakCheck(result);

  assert.deepEqual(result.findings, [
    { surface: 'asset', location: 'a.js' },
    { surface: 'asset', location: 'z.js' },
    { surface: 'response', location: URL },
  ]);
  assert.match(output, /client asset: a\.js/);
  assert.match(output, /response body: https:\/\/demo\.invalid\/api\/receipt/);
  assert.doesNotMatch(output, new RegExp(SECRET));
});

test('clean formatter states positive evidence counts', async (t) => {
  const bundleDir = await bundleFixture({ 'index.html': 'safe' });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));
  const result = await runLeakCheck({
    bundleDir,
    responseUrl: URL,
    secret: SECRET,
    timeBudgetMs: 100,
    fetchImpl: responseWith('safe'),
  });
  const output = formatLeakCheck(result);
  assert.match(output, /passed/);
  assert.match(output, /client assets\s+1 checked/);
  assert.match(output, /response bodies\s+1 checked/);
});

test('missing secret and invalid timeout reject instead of passing', async () => {
  await assert.rejects(
    runLeakCheck({
      bundleDir: 'dist',
      responseUrl: URL,
      secret: '   ',
      timeBudgetMs: 100,
      fetchImpl: responseWith('safe'),
    }),
    /DEMO_SIGNING_KEY/,
  );
  await assert.rejects(
    runLeakCheck({
      bundleDir: 'dist',
      responseUrl: URL,
      secret: SECRET,
      timeBudgetMs: 0,
      fetchImpl: responseWith('safe'),
    }),
    /positive number/,
  );
});

test('missing or empty client bundle rejects instead of passing', async (t) => {
  const empty = await bundleFixture({});
  t.after(() => rm(empty, { recursive: true, force: true }));

  await assert.rejects(
    runLeakCheck({
      bundleDir: join(empty, 'missing'),
      responseUrl: URL,
      secret: SECRET,
      timeBudgetMs: 100,
      fetchImpl: responseWith('safe'),
    }),
    /could not read client bundle/,
  );
  await assert.rejects(
    runLeakCheck({
      bundleDir: empty,
      responseUrl: URL,
      secret: SECRET,
      timeBudgetMs: 100,
      fetchImpl: responseWith('safe'),
    }),
    /no browser assets/,
  );
});

test('unreadable or stalled response rejects safely and stays bounded', { timeout: 1_000 }, async (t) => {
  const bundleDir = await bundleFixture({ 'index.html': 'safe' });
  t.after(() => rm(bundleDir, { recursive: true, force: true }));
  const base = { bundleDir, responseUrl: URL, secret: SECRET, timeBudgetMs: 30 };

  await assert.rejects(
    runLeakCheck({ ...base, fetchImpl: async () => { throw new Error(SECRET); } }),
    (error) => {
      assert.match(error.message, /could not read response body/);
      assert.equal(error.message.includes(SECRET), false);
      return true;
    },
  );

  const started = performance.now();
  await assert.rejects(
    runLeakCheck({ ...base, fetchImpl: () => new Promise(() => {}) }),
    /could not read response body/,
  );
  assert.ok(performance.now() - started < 500);
});
