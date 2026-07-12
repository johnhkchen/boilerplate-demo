import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseFaultMode,
  corruptSignature,
  leakSigningKey,
} from '../src/lib/fault.ts';
import { makeReceipt, verifyReceipt, BOUNDARY_NAME } from '../src/lib/receipt.ts';
import { runBoundaryCheck } from '../src/lib/ops-check.ts';
import { receiptBoundary } from '../src/lib/boundary-contract.ts';

const KEY = 'test-signing-key';
const URL = 'http://127.0.0.1:4321/api/receipt';

// A fetch stub returning an already-resolved receipt body (mirrors ops-check.test).
const fetchReturning = (body) => async () => ({
  ok: true,
  status: 200,
  json: async () => body,
});

test('parseFaultMode: unset / empty / whitespace / unknown all fall safe to off', () => {
  for (const raw of [undefined, null, '', '   ', 'nope', 'brokn', 'stall']) {
    assert.equal(parseFaultMode(raw), 'off', `${JSON.stringify(raw)} → off`);
  }
});

test('parseFaultMode: fault words are recognized, case- and space-tolerant', () => {
  assert.equal(parseFaultMode('broken'), 'broken');
  assert.equal(parseFaultMode('BROKEN'), 'broken');
  assert.equal(parseFaultMode('  Broken '), 'broken');
  assert.equal(parseFaultMode('stalled'), 'stalled');
  assert.equal(parseFaultMode(' STALLED'), 'stalled');
  assert.equal(parseFaultMode('leak'), 'leak');
  assert.equal(parseFaultMode(' LEAK '), 'leak');
  assert.equal(parseFaultMode('leaky'), 'off');
});

test('leakSigningKey: only the deliberate copy contains the actual configured key', async () => {
  const receipt = await makeReceipt(KEY);
  const leaking = leakSigningKey(receipt, KEY);

  assert.equal(JSON.stringify(receipt).includes(KEY), false);
  assert.equal(leaking.diagnosticSigningKey, KEY);
  assert.equal(JSON.stringify(leaking).includes(KEY), true);
  assert.equal('diagnosticSigningKey' in receipt, false);
  assert.equal(leaking.signature, receipt.signature);
});

test('corruptSignature: same-length hex, different value, and no longer verifies', async () => {
  const receipt = await makeReceipt(KEY);
  const broken = corruptSignature(receipt);

  // The tamper is real…
  assert.notEqual(broken.signature, receipt.signature);
  // …but stays a well-formed signature field: same length, still lower hex.
  assert.equal(broken.signature.length, receipt.signature.length);
  assert.match(broken.signature, /^[0-9a-f]+$/);
  // Every other field is untouched, so the body still looks like a receipt.
  assert.equal(broken.boundary, BOUNDARY_NAME);
  assert.equal(broken.nonce, receipt.nonce);
  assert.equal(broken.issuedAt, receipt.issuedAt);

  // The original verifies against the key; the corrupted one does not.
  assert.equal(await verifyReceipt(KEY, receipt), true);
  assert.equal(await verifyReceipt(KEY, broken), false);
});

test('corruptSignature is deterministic and its own inverse (flip twice → original)', async () => {
  const receipt = await makeReceipt(KEY);
  const once = corruptSignature(receipt);
  const twice = corruptSignature(once);
  assert.equal(twice.signature, receipt.signature);
});

test('broken server → ops-check reports a failed operation naming the boundary', async () => {
  // The exact bytes a DEMO_FAULT=broken boundary would serve.
  const brokenBody = corruptSignature(await makeReceipt(KEY));

  const result = await runBoundaryCheck(receiptBoundary, {
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY, // the out-of-band key the check holds (as `.dev.vars` provides locally)
    fetchImpl: fetchReturning(brokenBody),
  });

  assert.equal(result.trace.outcome, 'failed');
  assert.equal(result.trace.operationName, BOUNDARY_NAME);
  assert.equal('value' in result, false);
  if (result.trace.outcome === 'failed') {
    assert.equal(result.trace.failure.kind, 'operation');
    assert.match(result.trace.failure.message, /signature/i);
  }
});
