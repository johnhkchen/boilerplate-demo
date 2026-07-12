import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createIntegrationReport,
  formatIntegrationSummary,
  runIntegrationChecks,
} from '../src/lib/integration-check.ts';
import { receiptBoundary } from '../src/lib/boundary-contract.ts';

const evidence = (exitCode, output = '') => ({
  exitCode,
  output,
  durationMs: 2,
});

test('healthy run executes all checks in order and aggregates to passed', async () => {
  const calls = [];
  const result = await runIntegrationChecks({ name: 'parcel' }, {
    timeBudgetMs: 1_000,
    runner: async (check) => {
      calls.push(check);
      return evidence(0, `${check} passed`);
    },
  });

  assert.deepEqual(calls, ['operation', 'flow', 'leak']);
  assert.equal(result.outcome, 'passed');
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.checks.map((check) => check.boundary), [
    'parcel',
    'parcel',
    'parcel',
  ]);
  assert.deepEqual(result.checks.map((check) => check.outcome), [
    'passed',
    'passed',
    'passed',
  ]);
});

test('ordinary failure does not short-circuit later checks', async () => {
  const calls = [];
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 1_000,
    runner: async (check) => {
      calls.push(check);
      return check === 'operation'
        ? evidence(1, '✗ receipt — failed [operation]')
        : evidence(0);
    },
  });

  assert.deepEqual(calls, ['operation', 'flow', 'leak']);
  assert.equal(result.outcome, 'failed');
  assert.equal(result.checks[0].failureKind, 'operation');
  assert.equal(result.checks[1].outcome, 'passed');
  assert.equal(result.checks[2].outcome, 'passed');
});

test('normalizes operation, flow, and leak failure kinds', async () => {
  const outputs = {
    operation: '✗ receipt — failed [timeout]',
    flow: 'Timeout 4000ms exceeded while awaiting receipt',
    leak: '✗ leak check — secret reached 1 browser surface',
  };
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 1_000,
    runner: async (check) => evidence(1, outputs[check]),
  });

  assert.deepEqual(
    result.checks.map((check) => check.failureKind),
    ['timeout', 'timeout', 'leak'],
  );
});

test('generic flow failure and unavailable leak evidence stay distinct', async () => {
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 1_000,
    runner: async (check) => {
      if (check === 'flow') return evidence(1, 'browser exited unexpectedly');
      if (check === 'leak') return evidence(2, 'could not read response body');
      return evidence(0);
    },
  });

  assert.equal(result.checks[1].failureKind, 'flow');
  assert.equal(result.checks[2].failureKind, 'evidence');
});

test('runner rejection becomes execution evidence and later checks still run', async () => {
  const calls = [];
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 1_000,
    runner: async (check) => {
      calls.push(check);
      if (check === 'operation') throw new Error('spawn failed');
      return evidence(0);
    },
  });

  assert.deepEqual(calls, ['operation', 'flow', 'leak']);
  assert.equal(result.checks[0].failureKind, 'execution');
  assert.match(result.checks[0].output, /spawn failed/);
});

test(
  'overall deadline settles an abort-ignoring runner and skips the remainder',
  { timeout: 1_000 },
  async () => {
    const started = performance.now();
    const result = await runIntegrationChecks(receiptBoundary, {
      timeBudgetMs: 30,
      runner: () => new Promise(() => {}),
    });

    assert.ok(performance.now() - started < 500);
    assert.equal(result.outcome, 'failed');
    assert.equal(result.timedOut, true);
    assert.deepEqual(result.checks.map((check) => check.outcome), [
      'failed',
      'skipped',
      'skipped',
    ]);
    assert.deepEqual(result.checks.map((check) => check.failureKind), [
      'overall-timeout',
      'overall-timeout',
      'overall-timeout',
    ]);
  },
);

test('an already-consumed setup budget skips all checks without invoking runner', async () => {
  let calls = 0;
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 10,
    startedAtMs: performance.now() - 50,
    runner: async () => {
      calls += 1;
      return evidence(0);
    },
  });

  assert.equal(calls, 0);
  assert.equal(result.timedOut, true);
  assert.equal(result.checks.length, 3);
  assert.ok(result.checks.every((check) => check.outcome === 'skipped'));
});

test('formatter names the boundary, failure kind, outcome, and budget', async () => {
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 1_000,
    runner: async (check) =>
      check === 'flow'
        ? evidence(1, 'Timeout while awaiting receipt')
        : evidence(0),
  });
  const output = formatIntegrationSummary(result);

  assert.match(output, /Integration check: FAILED/);
  assert.match(output, /budget 1\.0s/);
  assert.match(output, /receipt \[timeout\] — flow failed/);
  assert.match(output, /receipt — operation passed/);
});

test('report carries normalized metadata and redacts the supplied secret', async () => {
  const secret = 'ticket-secret-marker';
  const result = await runIntegrationChecks(receiptBoundary, {
    timeBudgetMs: 1_000,
    runner: async (check) =>
      check === 'leak'
        ? evidence(1, `secret reached response: ${secret}`)
        : evidence(0),
  });
  const report = createIntegrationReport(result, {
    faultMode: 'leak',
    secret,
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.faultMode, 'leak');
  assert.equal(report.outcome, 'failed');
  assert.equal(serialized.includes(secret), false);
  assert.match(serialized, /\[REDACTED\]/);
});

test('invalid overall budgets reject before invoking the runner', async () => {
  let calls = 0;
  const runner = async () => {
    calls += 1;
    return evidence(0);
  };

  for (const timeBudgetMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      runIntegrationChecks(receiptBoundary, { timeBudgetMs, runner }),
      /positive finite/,
    );
  }
  assert.equal(calls, 0);
});
