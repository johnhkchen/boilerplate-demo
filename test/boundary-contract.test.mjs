import assert from 'node:assert/strict';
import { test } from 'node:test';

import { receiptBoundary } from '../src/lib/boundary-contract.ts';
import { corruptSignature } from '../src/lib/fault.ts';
import { makeReceipt } from '../src/lib/receipt.ts';

const KEY = 'boundary-contract-test-key';

test('receipt boundary declares the current server and page contract', () => {
  assert.equal(receiptBoundary.name, 'receipt');
  assert.equal(receiptBoundary.path, '/api/receipt');
  assert.equal(receiptBoundary.keyEnv, 'DEMO_SIGNING_KEY');
  assert.deepEqual(
    {
      heading: receiptBoundary.landmark.heading,
      statusSelector: receiptBoundary.landmark.statusSelector,
      bodySelector: receiptBoundary.landmark.bodySelector,
      primaryActionName: receiptBoundary.landmark.primaryActionName,
    },
    {
      heading: 'Demo Runway',
      statusSelector: '#receipt-status',
      bodySelector: '#receipt-body',
      primaryActionName: 'Ask for a fresh note',
    },
  );
  assert.deepEqual(
    receiptBoundary.landmark.evidence.map(({ name, selector, pattern }) => ({
      name,
      selector,
      pattern: pattern.source,
    })),
    [
      {
        name: 'nonce',
        selector: '#receipt-nonce',
        pattern: '^[0-9a-f]{32}$',
      },
      {
        name: 'signature',
        selector: '#receipt-signature',
        pattern: '^[0-9a-f]{64}$',
      },
    ],
  );
});

test('assertShape accepts a genuinely signed receipt', async () => {
  const receipt = await makeReceipt(KEY);

  assert.equal(receiptBoundary.assertShape(receipt), receipt);
});

test('assertShape rejects a non-object and the wrong boundary', async () => {
  const receipt = await makeReceipt(KEY);

  assert.throws(() => receiptBoundary.assertShape(null), /unexpected response shape/);
  assert.throws(
    () => receiptBoundary.assertShape({ ...receipt, boundary: 'parcel' }),
    /expected "receipt"/,
  );
});

test('assertShape rejects every missing receipt field', async () => {
  const receipt = await makeReceipt(KEY);

  for (const field of [
    'boundary',
    'issuedAt',
    'nonce',
    'algorithm',
    'signature',
    'keySource',
  ]) {
    const candidate = { ...receipt };
    delete candidate[field];
    assert.throws(
      () => receiptBoundary.assertShape(candidate),
      /unexpected response shape/,
      `missing ${field}`,
    );
  }
});

test('assertShape rejects blank or incorrect fixed fields', async () => {
  const receipt = await makeReceipt(KEY);

  for (const [field, value] of [
    ['boundary', ''],
    ['issuedAt', '   '],
    ['nonce', ''],
    ['algorithm', ''],
    ['signature', ''],
    ['keySource', ''],
    ['algorithm', 'SHA-256'],
    ['keySource', 'browser'],
  ]) {
    assert.throws(
      () => receiptBoundary.assertShape({ ...receipt, [field]: value }),
      Error,
      `${field}=${JSON.stringify(value)}`,
    );
  }
});

test('assertShape rejects non-hex or incorrectly sized nonces and signatures', async () => {
  const receipt = await makeReceipt(KEY);

  for (const [field, value] of [
    ['nonce', `${'0'.repeat(31)}g`],
    ['nonce', `${'0'.repeat(31)}A`],
    ['nonce', '0'.repeat(31)],
    ['nonce', '0'.repeat(33)],
    ['signature', `${'0'.repeat(63)}g`],
    ['signature', `${'0'.repeat(63)}A`],
    ['signature', '0'.repeat(63)],
    ['signature', '0'.repeat(65)],
  ]) {
    assert.throws(
      () => receiptBoundary.assertShape({ ...receipt, [field]: value }),
      /unexpected response shape/,
      `${field}=${value}`,
    );
  }
});

test('verify accepts a valid signature and rejects a corrupted signature', async () => {
  const receipt = receiptBoundary.assertShape(await makeReceipt(KEY));
  const corrupted = receiptBoundary.assertShape(corruptSignature(receipt));

  assert.equal(await receiptBoundary.verify(KEY, receipt), true);
  assert.equal(await receiptBoundary.verify(KEY, corrupted), false);
});
