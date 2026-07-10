// Deliberate boundary faults, made observable on demand. Pure and framework-free
// like receipt.ts / operation-runner.ts: no env, no I/O, no throw. The HTTP edge
// (src/pages/api/receipt.ts) reads DEMO_FAULT from the runtime environment, parses
// it here, and puts the exemplar boundary into a broken or stalled state so the
// *identical* `npm run ops:check` proves the harness names the offender and fails
// within budget — instead of a green check that only ever means "nothing broke yet".

import type { Receipt } from './receipt.ts';

// The three states the boundary can be put in. 'off' is the healthy default: a
// signed receipt, exactly as if the toggle did not exist.
export type FaultMode = 'off' | 'broken' | 'stalled';

// The environment variable an operator flips. Named here so the route and the docs
// share one source of truth and cannot drift.
export const FAULT_ENV = 'DEMO_FAULT';

// Tolerant and fail-safe. Trim + lowercase, then exact-match the two fault words;
// anything else — unset, empty, whitespace, or a typo — is 'off'. A fault the
// operator did not deliberately ask for is worse than a no-op, so the server can
// never accidentally break itself. Never throws.
export function parseFaultMode(raw: string | null | undefined): FaultMode {
  if (typeof raw !== 'string') return 'off';
  const v = raw.trim().toLowerCase();
  return v === 'broken' || v === 'stalled' ? v : 'off';
}

// Map a lowercase hex digit d to (15 - d): 0<->f, 1<->e, …, 7<->8. Since 15 - d is
// never equal to d for an integer digit, every digit changes — so a whole hex string
// is guaranteed to come out different, same length, still hex. Non-hex characters
// pass through unchanged (defensive; makeReceipt only ever emits lower hex).
function flipHexDigit(ch: string): string {
  const d = parseInt(ch, 16);
  return Number.isNaN(d) ? ch : (15 - d).toString(16);
}

// broken mode: return a copy of a valid receipt whose signature is deterministically
// corrupted so it no longer matches canonicalMessage(receipt). Every other field is
// left intact, so the body still passes shape validation (a well-formed 200 a naive
// "did it return 200?" check would accept) — but verifyReceipt against the real
// out-of-band key returns false, which is exactly the failure ops-check reports.
// Pure and deterministic (no re-signing, no randomness).
export function corruptSignature(receipt: Receipt): Receipt {
  const signature = receipt.signature.split('').map(flipHexDigit).join('');
  return { ...receipt, signature };
}
