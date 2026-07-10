// The shared backstage gate: a reusable, server-side check of the low-stakes
// passcode that both the submit route (write half) and the retrieve seam (read
// half) compose over. Pure and framework-free like receipt.ts / fault.ts — the
// core reads no env and holds no secret beyond the argument passed in; the HTTP
// edge owns env access and passes the configured passcode down.
//
// Bundle guarantee (charter P3): the passcode is always an *argument*, never a
// literal in this module, and its source (DEMO_PASSCODE) is a server-only env var
// that is not PUBLIC_-prefixed — so Astro/Vite never inline it into client output.
// This is a low-stakes gate (epic E-003), not a server secret like the signing key.

// Stable handle for denial bodies / tracing; shared so route and docs cannot drift.
export const GATE_NAME = 'backstage';

// The server-only env var the operator sets (Worker secret in prod, .dev.vars in
// dev). Named in the DEMO_ family alongside DEMO_SIGNING_KEY / DEMO_FAULT.
export const PASSCODE_ENV = 'DEMO_PASSCODE';

// Where the client presents the passcode. A header keeps it out of URLs, logs, and
// the persisted entry body, and lets one gate cover a POST submit and a GET retrieve.
export const PASSCODE_HEADER = 'x-demo-passcode';

export type GateReason = 'misconfigured' | 'missing' | 'mismatch';

// Discriminated result in the repo's idiom (see OperationResult): narrow on the tag,
// carry only the fields a state permits. Status is embedded so the HTTP mapping lives
// in one place and the route adapter stays trivial.
export type GateDecision =
  | { allowed: true }
  | { allowed: false; reason: 'misconfigured'; status: 500 }
  | { allowed: false; reason: 'missing'; status: 401 }
  | { allowed: false; reason: 'mismatch'; status: 403 };

// A value carries no credential when it is not a string or is only whitespace. Used
// both for "server passcode unset" and "no passcode presented".
function isBlank(v: string | null | undefined): boolean {
  return typeof v !== 'string' || v.trim() === '';
}

// Best-effort constant-time string compare: fold the length difference, then XOR-
// accumulate over the longer length so the loop count does not reveal which input is
// longer and there is no first-mismatch early return. Out-of-range charCodeAt returns
// NaN, which `| 0` coerces to 0, so trailing chars of the longer string still perturb
// the accumulator. True constant time is not reachable in portable JS — this is the
// honest amount of rigor for a low-stakes gate: cheap, dependency-free, no early exit.
function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}

// Pull the presented passcode from request headers. Reads only headers — no env, no
// body — so it composes over any method. Absent header → null.
export function passcodeFromHeaders(headers: Headers): string | null {
  return headers.get(PASSCODE_HEADER);
}

// The pure core. Decide allow/deny from the configured (server) passcode and the
// presented (client) one. Order matters: a misconfigured server is checked before the
// visitor's input, so a broken gate never blames the visitor (mirrors receipt.ts,
// which validates its key before anything else). Never throws; never returns or logs
// the configured value.
export function checkPasscode(
  configured: string | null | undefined,
  presented: string | null | undefined,
): GateDecision {
  if (isBlank(configured)) {
    return { allowed: false, reason: 'misconfigured', status: 500 };
  }
  if (isBlank(presented)) {
    return { allowed: false, reason: 'missing', status: 401 };
  }
  // Both are non-blank strings here; compare exact bytes (no trim/case-fold) so there
  // are no surprising equivalences.
  if (constantTimeEqual(presented as string, configured as string)) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'mismatch', status: 403 };
}

// Plain-English denial copy (brand voice) plus a stable machine slug. Pure map from a
// denied decision; only meaningful for allowed:false. Never contains the passcode.
export function describeDecision(
  decision: GateDecision,
): { error: string; detail: string } {
  if (decision.allowed) {
    // Not a denial — no body to describe. Kept total for callers that pass any decision.
    return { error: 'ok', detail: 'passcode accepted' };
  }
  switch (decision.reason) {
    case 'misconfigured':
      return {
        error: 'gate_misconfigured',
        detail: 'the backstage passcode is not set on the server',
      };
    case 'missing':
      return {
        error: 'passcode_missing',
        detail: 'this backstage door needs the shared passcode',
      };
    case 'mismatch':
      return {
        error: 'passcode_mismatch',
        detail: "that passcode doesn't match",
      };
  }
}

// The route adapter: the one line submit and retrieve share. Returns null to let the
// route proceed, or a finished JSON denial Response carrying the decision's status.
// The only function here that touches Response — the core above stays pure. Response /
// Headers are web globals present identically in Workers and Node.
export function guardPasscode(
  request: Request,
  configured: string | null | undefined,
): Response | null {
  const decision = checkPasscode(configured, passcodeFromHeaders(request.headers));
  if (decision.allowed) return null;

  const body = { gate: GATE_NAME, ...describeDecision(decision) };
  return new Response(JSON.stringify(body, null, 2), {
    status: decision.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
