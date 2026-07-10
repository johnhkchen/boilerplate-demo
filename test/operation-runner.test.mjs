import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runOperation } from '../src/lib/operation-runner.ts';

test('records a passed trace and preserves the operation value', async () => {
  const value = { answer: 42 };

  const result = await runOperation({
    name: 'passing-stub',
    timeBudgetMs: 1_000,
    invoke: ({ signal }) => {
      assert.equal(signal.aborted, false);
      return value;
    },
  });

  assert.equal(result.trace.operationName, 'passing-stub');
  assert.equal(result.trace.outcome, 'passed');
  assert.equal(Number.isFinite(result.trace.durationMs), true);
  assert.ok(result.trace.durationMs >= 0);
  assert.equal('failure' in result.trace, false);
  assert.equal('value' in result, true);
  if ('value' in result) assert.strictEqual(result.value, value);
});

test('records an operation failure without exposing a stack', async () => {
  const result = await runOperation({
    name: 'broken-stub',
    timeBudgetMs: 1_000,
    invoke: () => {
      throw new Error('stub broke');
    },
  });

  assert.equal(result.trace.operationName, 'broken-stub');
  assert.equal(result.trace.outcome, 'failed');
  assert.equal(Number.isFinite(result.trace.durationMs), true);
  assert.ok(result.trace.durationMs >= 0);
  assert.equal('value' in result, false);
  assert.equal('stack' in result.trace, false);

  if (result.trace.outcome === 'failed') {
    assert.deepEqual(result.trace.failure, {
      kind: 'operation',
      message: 'stub broke',
    });
  }
});

test(
  'times out a never-resolving operation and aborts its signal',
  { timeout: 1_000 },
  async () => {
    let operationSignal;
    const startedAt = performance.now();

    const result = await runOperation({
      name: 'stalled-stub',
      timeBudgetMs: 40,
      invoke: ({ signal }) => {
        operationSignal = signal;
        return new Promise(() => {});
      },
    });

    const elapsedMs = performance.now() - startedAt;

    assert.equal(result.trace.operationName, 'stalled-stub');
    assert.equal(result.trace.outcome, 'failed');
    assert.ok(result.trace.durationMs >= 20);
    assert.ok(result.trace.durationMs < 1_000);
    assert.ok(elapsedMs < 1_000);
    assert.equal(operationSignal?.aborted, true);

    if (result.trace.outcome === 'failed') {
      assert.deepEqual(result.trace.failure, {
        kind: 'timeout',
        message: 'Operation "stalled-stub" exceeded its 40 ms time budget.',
      });
    }
  },
);

test('rejects invalid configuration before invoking the operation', async () => {
  let invocationCount = 0;
  const invoke = () => {
    invocationCount += 1;
  };

  await assert.rejects(
    runOperation({ name: '   ', timeBudgetMs: 10, invoke }),
    TypeError,
  );

  for (const timeBudgetMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      runOperation({ name: 'invalid-budget', timeBudgetMs, invoke }),
      RangeError,
    );
  }

  assert.equal(invocationCount, 0);
});
