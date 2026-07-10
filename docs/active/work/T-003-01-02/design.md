# Design — T-003-01-02 shared-passcode-gate

Decisions, with the alternatives weighed and rejected. Grounded in `research.md`.

## The shape of the deliverable

A **pure, framework-free core** (`checkPasscode`) that decides allow/deny from two plain
strings, plus a **thin route adapter** (`guardPasscode`) that reads the presented passcode
off a `Request` and returns a ready-to-send denial `Response` (or `null` to proceed). Both
live in one module, `src/lib/passcode.ts`, mirroring how `fault.ts` keeps pure logic that
`api/receipt.ts` composes. The submit and retrieve routes (downstream tickets) each call
`guardPasscode` as their first line and drop through on `null`.

This is the whole ticket: the primitive + its unit test. No route is wired here (there is
nothing to gate yet — the routes are T-003-02-01 / T-003-03-01).

## Decision 1 — Where the client presents the passcode: **request header**

`x-demo-passcode` (constant `PASSCODE_HEADER`).

- **Chosen: HTTP header.** Method-agnostic, so one gate composes over a submit `POST` *and*
  a retrieve `GET` without touching the body or the URL. Keeps the passcode out of the URL
  (so it never lands in access logs, referrers, or browser history) and out of the entry
  payload the store persists. An agent following the retrieval seam (T-003-03-01) sets one
  header; a browser form (T-003-02-02) sets the same header on `fetch`.
- Rejected — **body field** (`{ passcode, … }`): couples the gate to a JSON body, so it
  cannot gate a bodyless `GET`; forces the gate to parse and consume the request body before
  the route's own shape validation runs; risks the passcode being persisted or logged with
  the entry.
- Rejected — **query string** (`?passcode=`): lands the secret in server logs, proxy logs,
  and browser history — the exact "ordinary feedback" leak P3 warns against.
- Rejected — **`Authorization: Bearer`**: implies an account/token system this epic
  explicitly excludes (no accounts). A bespoke header reads as what it is — a shared knock,
  not credentials — and avoids colliding with real auth middleware later.

## Decision 2 — Missing vs wrong: **401 for missing, 403 for wrong**, 500 for misconfigured

The gate distinguishes three deny reasons and one allow:

| decision                | status | meaning                                             |
| ----------------------- | ------ | --------------------------------------------------- |
| `allowed: true`         | —      | presented passcode matches the configured one        |
| `misconfigured`         | 500    | server has no passcode set (blank/undefined)         |
| `missing`               | 401    | no passcode presented (header absent / whitespace)   |
| `mismatch`              | 403    | a passcode was presented but does not match          |

- **401 missing / 403 wrong** is the conventional split (401 = "you didn't authenticate";
  403 = "authenticated attempt refused"). The acceptance lists "401/403"; being deliberate
  about which is which gives downstream routes and their tests one clear contract, and gives
  a stakeholder a distinguishable "you forgot the passcode" vs "that passcode is wrong".
- **500 for a blank server passcode** follows `receipt.ts` exactly: an unset gate is a
  server misconfiguration, not a visitor's fault, and must be visible — never silently
  allow-all and never silently deny-all-with-a-client-error. Fail closed (deny) with a safe
  message and no value echoed.
- Rejected — **collapse missing+wrong into one 403** (avoids a mild "does a passcode exist"
  oracle): the epic's own threat model calls this a *low-stakes* gate the passcode-holder is
  meant to pass; whether the door exists is not secret (the epic is public intent). The DX
  win of a precise status outweighs a non-secret oracle. Documented here so the choice is
  deliberate, not accidental.

## Decision 3 — Comparison: **best-effort constant-time, exact bytes**

- `receipt.ts` verifies a signature with plain `===` and notes it runs in "trusted
  test/ops contexts." A passcode header, by contrast, is checked on every internet-facing
  request, so a first-mismatch early return is a needless (if minor) timing signal. I use a
  small **length-independent constant-time compare** (`constantTimeEqual`) that folds the
  length difference and XOR-accumulates over the longer string — removing the trivial early
  return. It is best-effort (true constant time is not reachable in portable JS), which is
  the honest and correct amount of rigor for a *low-stakes* gate: cheap, no dependency, no
  false promise. Documented as best-effort in the code.
- **Exact-byte compare** (no trimming, no case-folding of the *presented* value): surprising
  equivalences ("Code " == "Code") are a footgun. A client that wants to trim does so before
  sending. The one place we normalize is detecting *missing*: a whitespace-only or empty
  header carries no credential, so it maps to `missing` (401), not `mismatch` (403).
- Rejected — **hashing both sides then comparing**: adds `crypto.subtle` async and ceremony
  for no benefit at this stakes level; the configured value is already a server-only string.
- Rejected — **`node:crypto` `timingSafeEqual`**: not guaranteed in the Workers runtime and
  pulls a Node dependency into a module meant for route reuse (research: `src/lib` modules
  stay off Node-only APIs). A four-line pure helper is portable and testable.

## Decision 4 — Server passcode source: **`DEMO_PASSCODE` env, owned by the route**

- New server-only var `DEMO_PASSCODE` (constant `PASSCODE_ENV`), read at the HTTP edge from
  `locals.runtime.env` exactly like `DEMO_SIGNING_KEY`, and **passed into** `checkPasscode`
  as the `configured` argument. The pure core never reads env and never embeds a literal —
  so the passcode cannot be inlined into a client bundle by construction, and the module is
  trivially unit-testable with plain strings. Named in the `DEMO_` family, documented in
  `env.d.ts` and `.dev.vars.example`.
- Because the name is not `PUBLIC_`-prefixed, Astro/Vite never expose it to client output
  (research: only `PUBLIC_` vars are bundled). This is the same guarantee `DEMO_SIGNING_KEY`
  already relies on — the "never appears in a browser bundle" acceptance is met structurally.
- Rejected — **a build-time constant / config file**: any value that reaches the build can
  reach a bundle; env read at request time cannot. Also blocks per-deployment rotation.

## Decision 5 — Return type: **discriminated union, status embedded in the decision**

`checkPasscode` returns `GateDecision`:
```ts
type GateDecision =
  | { allowed: true }
  | { allowed: false; reason: 'misconfigured'; status: 500 }
  | { allowed: false; reason: 'missing'; status: 401 }
  | { allowed: false; reason: 'mismatch'; status: 403 };
```
This matches the repo's `OperationResult` idiom (narrow on a tag; carry only the fields that
reason permits). Embedding `status` keeps the HTTP mapping in one place and lets the route
adapter be trivial. A pure `describeDecision(decision)` returns `{ error, detail }` plain
strings for the denial body, so the route composes body + status without duplicating copy.

- Rejected — **throwing on deny**: `operation-runner` shows the house style is to *return*
  structured outcomes and reserve `throw` for programmer error (bad config). A wrong
  passcode is an expected outcome, not an exception.

## Decision 6 — Adapter returns `Response | null`, not a boolean

`guardPasscode(request, configured): Response | null` — `null` means "let the route
proceed"; a `Response` is the finished 401/403/500 JSON. Both downstream routes then read:
```ts
const denied = guardPasscode(request, env?.DEMO_PASSCODE);
if (denied) return denied;
```
One line, no duplicated status/JSON logic across submit and retrieve — the concrete meaning
of "both paths compose over" the gate. `Response`/`Headers` are safe web globals in both
runtimes (research). The core stays pure; only this adapter touches `Response`.

## Brand voice for the denial copy

Denial bodies follow `receipt.ts`'s `{ error: <slug>, detail: <plain English> }` shape.
The `detail` strings are kitchen-table plain, not jargon: missing → "this backstage door
needs the shared passcode"; mismatch → "that passcode doesn't match"; misconfigured →
"the backstage passcode is not set on the server". Machine-readable `error` slugs
(`passcode_missing`, `passcode_mismatch`, `gate_misconfigured`) stay stable for callers.

## What Design deliberately leaves out

- No submit/retrieve route (downstream tickets own those).
- No extension of `leak:check` to `DEMO_PASSCODE` (out of scope; guarantee is structural).
- No rate limiting / lockout (not asked; low-stakes gate; would be a separate signal).
