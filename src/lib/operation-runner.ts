// A small, framework-free seam for invoking integration boundaries. It turns an
// asynchronous call into bounded, structured pass/fail evidence without knowing
// anything about Astro, Cloudflare, HTTP, or a particular provider.

export type OperationOutcome = 'passed' | 'failed';

export type OperationFailureKind = 'operation' | 'timeout';

export interface OperationFailure {
  kind: OperationFailureKind;
  message: string;
}

export interface OperationTraceBase {
  operationName: string;
  durationMs: number;
}

export interface PassedOperationTrace extends OperationTraceBase {
  outcome: 'passed';
}

export interface FailedOperationTrace extends OperationTraceBase {
  outcome: 'failed';
  failure: OperationFailure;
}

export type OperationTrace = PassedOperationTrace | FailedOperationTrace;

export interface OperationContext {
  // Operations such as fetch can stop their underlying work when the time budget
  // expires. Callbacks that ignore this signal still cannot delay the runner's
  // own result beyond the budget.
  signal: AbortSignal;
}

export type Operation<T> = (
  context: OperationContext,
) => T | PromiseLike<T>;

export interface RunOperationOptions<T> {
  name: string;
  timeBudgetMs: number;
  invoke: Operation<T>;
}

export type OperationResult<T> =
  | { trace: PassedOperationTrace; value: T }
  | { trace: FailedOperationTrace };

type SettledOperation<T> =
  | { kind: 'passed'; value: T }
  | { kind: 'failed'; reason: unknown }
  | { kind: 'timeout' };

function validateOptions<T>(options: RunOperationOptions<T>): void {
  if (typeof options.name !== 'string' || options.name.trim() === '') {
    throw new TypeError('Operation name must be a non-empty string.');
  }

  if (
    typeof options.timeBudgetMs !== 'number' ||
    !Number.isFinite(options.timeBudgetMs) ||
    options.timeBudgetMs <= 0
  ) {
    throw new RangeError('Operation time budget must be a positive finite number.');
  }

  if (typeof options.invoke !== 'function') {
    throw new TypeError('Operation invoke must be a function.');
  }
}

function failureMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message.trim() !== '') {
    return reason.message;
  }

  if (typeof reason === 'string' && reason.trim() !== '') {
    return reason;
  }

  return 'Operation failed';
}

function timeoutMessage(name: string, timeBudgetMs: number): string {
  return `Operation "${name}" exceeded its ${timeBudgetMs} ms time budget.`;
}

export async function runOperation<T>(
  options: RunOperationOptions<T>,
): Promise<OperationResult<T>> {
  validateOptions(options);

  const startedAt = performance.now();
  const controller = new AbortController();

  // The rejection arm stays attached even if timeout wins, so a late rejection
  // is observed instead of becoming an unhandled promise rejection.
  const operation = Promise.resolve()
    .then(() => options.invoke({ signal: controller.signal }))
    .then<SettledOperation<T>, SettledOperation<T>>(
      (value) => ({ kind: 'passed', value }),
      (reason: unknown) => ({ kind: 'failed', reason }),
    );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<SettledOperation<T>>((resolve) => {
    timer = setTimeout(() => {
      resolve({ kind: 'timeout' });
      controller.abort();
    }, options.timeBudgetMs);
  });

  let settled: SettledOperation<T>;
  try {
    settled = await Promise.race([operation, deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  const durationMs = Math.max(0, performance.now() - startedAt);
  const traceBase = {
    operationName: options.name,
    durationMs,
  };

  if (settled.kind === 'passed') {
    return {
      trace: { ...traceBase, outcome: 'passed' },
      value: settled.value,
    };
  }

  if (settled.kind === 'failed') {
    return {
      trace: {
        ...traceBase,
        outcome: 'failed',
        failure: {
          kind: 'operation',
          message: failureMessage(settled.reason),
        },
      },
    };
  }

  return {
    trace: {
      ...traceBase,
      outcome: 'failed',
      failure: {
        kind: 'timeout',
        message: timeoutMessage(options.name, options.timeBudgetMs),
      },
    },
  };
}
