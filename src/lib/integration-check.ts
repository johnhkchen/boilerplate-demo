export const INTEGRATION_CHECKS = ['operation', 'flow', 'leak'] as const;

export type IntegrationCheckName = (typeof INTEGRATION_CHECKS)[number];
export type IntegrationOutcome = 'passed' | 'failed';
export type IntegrationCheckOutcome = 'passed' | 'failed' | 'skipped';

export interface BoundaryIdentity {
  name: string;
}

export interface CommandEvidence {
  exitCode: number;
  output: string;
  durationMs: number;
}

export type IntegrationCommandRunner = (
  check: IntegrationCheckName,
  signal: AbortSignal,
) => Promise<CommandEvidence>;

export interface IntegrationCheckResult {
  check: IntegrationCheckName;
  boundary: string;
  outcome: IntegrationCheckOutcome;
  durationMs: number;
  exitCode?: number;
  failureKind?: string;
  output: string;
}

export interface IntegrationRunResult {
  outcome: IntegrationOutcome;
  durationMs: number;
  timeBudgetMs: number;
  timedOut: boolean;
  checks: IntegrationCheckResult[];
}

export interface RunIntegrationChecksOptions {
  timeBudgetMs: number;
  runner: IntegrationCommandRunner;
  signal?: AbortSignal;
  // Lets the CLI include build and server startup in the same overall deadline.
  // Tests and ordinary callers omit it, starting the budget at function entry.
  startedAtMs?: number;
}

export interface IntegrationReport {
  schemaVersion: 1;
  outcome: IntegrationOutcome;
  faultMode: string;
  durationMs: number;
  timeBudgetMs: number;
  timedOut: boolean;
  checks: IntegrationCheckResult[];
}

function validateBudget(timeBudgetMs: number): void {
  if (!Number.isFinite(timeBudgetMs) || timeBudgetMs <= 0) {
    throw new RangeError(
      'Integration check time budget must be a positive finite number.',
    );
  }
}

function failureKind(check: IntegrationCheckName, output: string): string {
  if (check === 'operation') {
    return output.match(/\[(operation|timeout)\]/i)?.[1]?.toLowerCase() ??
      'operation';
  }

  if (check === 'flow') {
    return /timeout|timed out|exceeded[^\n]*time/i.test(output)
      ? 'timeout'
      : 'flow';
  }

  return /secret reached/i.test(output) ? 'leak' : 'evidence';
}

function elapsedSince(startedAtMs: number): number {
  return Math.max(0, performance.now() - startedAtMs);
}

export async function runIntegrationChecks(
  boundary: BoundaryIdentity,
  options: RunIntegrationChecksOptions,
): Promise<IntegrationRunResult> {
  validateBudget(options.timeBudgetMs);

  const startedAtMs = options.startedAtMs ?? performance.now();
  const controller = new AbortController();
  const checks: IntegrationCheckResult[] = [];

  let deadlineResolve: (() => void) | undefined;
  const deadline = new Promise<'deadline'>((resolve) => {
    deadlineResolve = () => resolve('deadline');
  });

  const abort = () => {
    controller.abort();
    deadlineResolve?.();
  };
  options.signal?.addEventListener('abort', abort, { once: true });

  const remainingMs = Math.max(
    0,
    options.timeBudgetMs - elapsedSince(startedAtMs),
  );
  const timer = setTimeout(abort, remainingMs);
  if (options.signal?.aborted || remainingMs === 0) abort();

  let timedOut = controller.signal.aborted;

  try {
    for (let index = 0; index < INTEGRATION_CHECKS.length; index += 1) {
      const check = INTEGRATION_CHECKS[index];
      if (controller.signal.aborted) {
        checks.push({
          check,
          boundary: boundary.name,
          outcome: 'skipped',
          durationMs: 0,
          failureKind: 'overall-timeout',
          output: '',
        });
        timedOut = true;
        continue;
      }

      const checkStartedAt = performance.now();
      // Attach both settlement arms before racing. If the deadline wins, a later
      // command rejection stays observed rather than becoming unhandled.
      const execution = Promise.resolve()
        .then(() => options.runner(check, controller.signal))
        .then(
          (evidence) => ({ kind: 'evidence' as const, evidence }),
          (reason: unknown) => ({ kind: 'error' as const, reason }),
        );

      const settled = await Promise.race([execution, deadline]);

      if (settled === 'deadline') {
        timedOut = true;
        checks.push({
          check,
          boundary: boundary.name,
          outcome: 'failed',
          durationMs: elapsedSince(checkStartedAt),
          failureKind: 'overall-timeout',
          output: '',
        });
        continue;
      }

      if (settled.kind === 'error') {
        const message = settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason);
        checks.push({
          check,
          boundary: boundary.name,
          outcome: 'failed',
          durationMs: elapsedSince(checkStartedAt),
          failureKind: 'execution',
          output: message,
        });
        continue;
      }

      const { evidence } = settled;
      checks.push({
        check,
        boundary: boundary.name,
        outcome: evidence.exitCode === 0 ? 'passed' : 'failed',
        durationMs: evidence.durationMs,
        exitCode: evidence.exitCode,
        failureKind:
          evidence.exitCode === 0
            ? undefined
            : failureKind(check, evidence.output),
        output: evidence.output,
      });
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }

  return {
    outcome: checks.every((check) => check.outcome === 'passed')
      ? 'passed'
      : 'failed',
    durationMs: elapsedSince(startedAtMs),
    timeBudgetMs: options.timeBudgetMs,
    timedOut,
    checks,
  };
}

function seconds(ms: number): string {
  return `${(ms / 1_000).toFixed(1)}s`;
}

export function formatIntegrationSummary(result: IntegrationRunResult): string {
  const heading = result.outcome === 'passed' ? 'PASSED' : 'FAILED';
  const lines = [
    `Integration check: ${heading} in ${seconds(result.durationMs)} ` +
      `(budget ${seconds(result.timeBudgetMs)})`,
  ];

  for (const check of result.checks) {
    if (check.outcome === 'passed') {
      lines.push(
        `✓ ${check.boundary} — ${check.check} passed ` +
          `(${check.durationMs.toFixed(1)} ms)`,
      );
      continue;
    }

    const mark = check.outcome === 'skipped' ? '–' : '✗';
    const kind = check.failureKind ?? 'execution';
    lines.push(
      `${mark} ${check.boundary} [${kind}] — ${check.check} ${check.outcome} ` +
        `(${check.durationMs.toFixed(1)} ms)`,
    );
  }

  return lines.join('\n');
}

function redact(value: string, secret?: string): string {
  if (!secret) return value;
  return value.split(secret).join('[REDACTED]');
}

export function createIntegrationReport(
  result: IntegrationRunResult,
  options: { faultMode: string; secret?: string },
): IntegrationReport {
  return {
    schemaVersion: 1,
    outcome: result.outcome,
    faultMode: options.faultMode,
    durationMs: result.durationMs,
    timeBudgetMs: result.timeBudgetMs,
    timedOut: result.timedOut,
    checks: result.checks.map((check) => ({
      ...check,
      output: redact(check.output, options.secret),
    })),
  };
}
