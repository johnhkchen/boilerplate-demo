// The first directly-invokable traced operation: it runs the exemplar boundary
// (src/pages/api/receipt.ts, logic in src/lib/receipt.ts) through the operation
// runner (src/lib/operation-runner.ts) and reports readable pass/fail evidence.
// This is the seam that turns "the integration works" from an assumption into a
// green check — reachable, correctly shaped, and (when a key is held out-of-band)
// signed by the real server secret.
//
// Pure and framework-free, matching receipt.ts / operation-runner.ts: no env, no
// argv, no stdout, no process.exit, no file reads. `fetch` is injectable so the
// whole thing is unit-testable with a stub. The thin CLI (scripts/ops-check.ts)
// owns all I/O and the exit code.

import { runOperation } from './operation-runner.ts';
import type { OperationResult } from './operation-runner.ts';
import { BOUNDARY_NAME, verifyReceipt } from './receipt.ts';
import type { Receipt } from './receipt.ts';

export interface BoundaryCheckConfig {
  // Full URL of the boundary, e.g. http://127.0.0.1:4321/api/receipt.
  url: string;
  // Passed straight to runOperation, which validates it (positive, finite).
  timeBudgetMs: number;
  // Out-of-band signing key. When present, the receipt's signature is re-verified
  // against it — proving the server used the secret the browser never sees. When
  // absent, the check still passes on a reachable, well-formed receipt.
  key?: string;
  // Injectable for tests; defaults to the platform's global fetch.
  fetchImpl?: typeof fetch;
}

export interface BoundaryCheckValue {
  receipt: Receipt;
  // True only when a key was provided AND the signature verified against it.
  signatureVerified: boolean;
}

// The runner's own discriminated result, specialized to this operation's value.
export type BoundaryCheckResult = OperationResult<BoundaryCheckValue>;

// Narrow untrusted JSON to a Receipt. Throws (→ a stack-free operation failure via
// the runner) on anything that isn't this boundary's shape, so a bare 200 with the
// wrong body never passes as "the integration works".
function assertReceiptShape(body: unknown): Receipt {
  if (typeof body !== 'object' || body === null) {
    throw new Error('unexpected response shape from the boundary');
  }
  const r = body as Record<string, unknown>;
  const stringFields = ['boundary', 'issuedAt', 'nonce', 'signature'] as const;
  for (const field of stringFields) {
    if (typeof r[field] !== 'string' || (r[field] as string) === '') {
      throw new Error('unexpected response shape from the boundary');
    }
  }
  if (r.boundary !== BOUNDARY_NAME) {
    throw new Error(
      `boundary named "${String(r.boundary)}", expected "${BOUNDARY_NAME}"`,
    );
  }
  return body as Receipt;
}

// Run the boundary through the runner. Always settles — on success a passed trace
// carrying the validated receipt, on any error/timeout a failed trace whose
// operationName is BOUNDARY_NAME (so the boundary is named even when the server is
// down and there is no response to inspect).
export async function runBoundaryCheck(
  config: BoundaryCheckConfig,
): Promise<BoundaryCheckResult> {
  const doFetch = config.fetchImpl ?? fetch;
  const hasKey = typeof config.key === 'string' && config.key !== '';

  return runOperation<BoundaryCheckValue>({
    name: BOUNDARY_NAME,
    timeBudgetMs: config.timeBudgetMs,
    invoke: async ({ signal }) => {
      // A down server rejects here (ECONNREFUSED); a stalled one is aborted by the
      // runner at the time budget. Either way the runner records the failure — the
      // core never catches its own error, so no raw stack ever reaches the caller.
      const res = await doFetch(config.url, {
        signal,
        headers: { accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`boundary answered HTTP ${res.status}`);
      }

      const receipt = assertReceiptShape(await res.json());

      if (hasKey) {
        const ok = await verifyReceipt(config.key as string, receipt);
        if (!ok) {
          throw new Error('signature did not verify against the out-of-band key');
        }
        return { receipt, signatureVerified: true };
      }

      return { receipt, signatureVerified: false };
    },
  });
}

// Round a duration for display only; the trace keeps full precision.
function roundMs(n: number): string {
  return n.toFixed(1);
}

// A stack-free, human-readable summary of a settled result. Pure string — the CLI
// prints it and chooses the exit code from result.trace.outcome. Plain English by
// brand voice: no jargon.
export function formatBoundaryTrace(result: BoundaryCheckResult): string {
  const { trace } = result;
  const ms = roundMs(trace.durationMs);

  if (trace.outcome === 'passed' && 'value' in result) {
    const { receipt, signatureVerified } = result.value;
    const signatureLine = signatureVerified
      ? 'signature   verified against the out-of-band key'
      : 'signature   present, not checked — no key available';
    return [
      `✓ ${trace.operationName} — passed in ${ms} ms`,
      `    issued at   ${receipt.issuedAt}`,
      `    one-time    ${receipt.nonce}`,
      `    ${signatureLine}`,
    ].join('\n');
  }

  const { failure } = trace as { failure: { kind: string; message: string } };
  return [
    `✗ ${trace.operationName} — failed in ${ms} ms  [${failure.kind}]`,
    `    ${failure.message}`,
  ].join('\n');
}
