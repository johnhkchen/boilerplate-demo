import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  runBoundaryCheck,
  formatBoundaryTrace,
} from '../src/lib/ops-check.ts';
import { makeReceipt, BOUNDARY_NAME } from '../src/lib/receipt.ts';

const KEY = 'test-signing-key';
const OTHER_KEY = 'a-different-key';
const URL = 'http://127.0.0.1:4321/api/receipt';

// A minimal Response stand-in — runBoundaryCheck only reads ok, status, json().
const responseOf = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body,
});

// A fetch stub that returns the given (already-resolved) response.
const fetchReturning = (response) => async () => response;

test('healthy demo with a valid key → passed trace naming the boundary + latency', async () => {
  const receipt = await makeReceipt(KEY);

  const result = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    fetchImpl: fetchReturning(responseOf(receipt)),
  });

  assert.equal(result.trace.outcome, 'passed');
  assert.equal(result.trace.operationName, BOUNDARY_NAME);
  assert.equal(Number.isFinite(result.trace.durationMs), true);
  assert.ok(result.trace.durationMs >= 0);
  assert.equal('value' in result, true);
  if ('value' in result) {
    assert.equal(result.value.signatureVerified, true);
    assert.equal(result.value.receipt.boundary, BOUNDARY_NAME);
  }
});

test('server down (fetch rejects) → failed operation trace still naming the boundary', async () => {
  const result = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    // Mirrors a real ECONNREFUSED: the connection attempt rejects.
    fetchImpl: async () => {
      throw new Error('fetch failed');
    },
  });

  assert.equal(result.trace.outcome, 'failed');
  assert.equal(result.trace.operationName, BOUNDARY_NAME);
  assert.equal('value' in result, false);
  if (result.trace.outcome === 'failed') {
    assert.equal(result.trace.failure.kind, 'operation');
  }
  // The runner never surfaces a stack.
  assert.equal('stack' in result.trace, false);
});

test(
  'stalled boundary → times out within the budget, still naming the boundary',
  { timeout: 1_000 },
  async () => {
    const startedAt = performance.now();

    const result = await runBoundaryCheck({
      url: URL,
      timeBudgetMs: 40,
      key: KEY,
      // A socket that accepts but never answers — the runner must cut it off.
      fetchImpl: () => new Promise(() => {}),
    });

    const elapsedMs = performance.now() - startedAt;

    assert.equal(result.trace.outcome, 'failed');
    assert.equal(result.trace.operationName, BOUNDARY_NAME);
    assert.ok(elapsedMs < 1_000, 'must settle well within the outer timeout');
    if (result.trace.outcome === 'failed') {
      assert.equal(result.trace.failure.kind, 'timeout');
    }
  },
);

test('receipt signed with a different key → failed (signature does not verify)', async () => {
  const receipt = await makeReceipt(OTHER_KEY);

  const result = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    fetchImpl: fetchReturning(responseOf(receipt)),
  });

  assert.equal(result.trace.outcome, 'failed');
  assert.equal(result.trace.operationName, BOUNDARY_NAME);
  if (result.trace.outcome === 'failed') {
    assert.equal(result.trace.failure.kind, 'operation');
    assert.match(result.trace.failure.message, /signature/i);
  }
});

test('non-ok HTTP status → failed, message names the status', async () => {
  const result = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    fetchImpl: fetchReturning(
      responseOf({ boundary: BOUNDARY_NAME, error: 'boundary_misconfigured' }, {
        ok: false,
        status: 500,
      }),
    ),
  });

  assert.equal(result.trace.outcome, 'failed');
  if (result.trace.outcome === 'failed') {
    assert.equal(result.trace.failure.kind, 'operation');
    assert.match(result.trace.failure.message, /500/);
  }
});

test('unexpected body shape → failed (does not pass on any 200)', async () => {
  const result = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    fetchImpl: fetchReturning(responseOf({ hello: 'world' })),
  });

  assert.equal(result.trace.outcome, 'failed');
  if (result.trace.outcome === 'failed') {
    assert.equal(result.trace.failure.kind, 'operation');
  }
});

test('no out-of-band key → still passes on a well-formed receipt, marked unverified', async () => {
  const receipt = await makeReceipt(KEY);

  const result = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    // key omitted
    fetchImpl: fetchReturning(responseOf(receipt)),
  });

  assert.equal(result.trace.outcome, 'passed');
  assert.equal(result.trace.operationName, BOUNDARY_NAME);
  if ('value' in result) {
    assert.equal(result.value.signatureVerified, false);
  }
});

test('formatBoundaryTrace renders readable, stack-free lines for pass and fail', async () => {
  const receipt = await makeReceipt(KEY);

  const passed = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    fetchImpl: fetchReturning(responseOf(receipt)),
  });
  const passText = formatBoundaryTrace(passed);
  assert.match(passText, /receipt/);
  assert.match(passText, /passed in/);
  assert.doesNotMatch(passText, /\n\s+at /); // no stack frames

  const failed = await runBoundaryCheck({
    url: URL,
    timeBudgetMs: 1_000,
    key: KEY,
    fetchImpl: async () => {
      throw new Error('fetch failed');
    },
  });
  const failText = formatBoundaryTrace(failed);
  assert.match(failText, /receipt/);
  assert.match(failText, /failed in/);
  assert.match(failText, /\[operation\]/);
  assert.doesNotMatch(failText, /\n\s+at /);
});
