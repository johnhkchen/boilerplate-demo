# Research — T-003-01-02 shared-passcode-gate

Descriptive map of the codebase as it bears on a reusable, server-side check of the
shared low-stakes passcode. No solutions proposed here.

## What the ticket asks for

Provide a reusable server-side check of the shared low-stakes passcode that **both the
submit and retrieve paths compose over** — no accounts, no server secret in the bundle.
Acceptance: a unit test drives the gate — a request with a missing or wrong passcode is
rejected (401/403) and a correct one passes; the passcode is read server-side and never
appears in any browser-shipped bundle.

`_Advances: P4, P3_` — P4 is "collaboration has no workplace tax" (structured context,
no mandatory accounts); P3's guardrail is "keeps every server-side key out of browser
bundles." The passcode is explicitly a **low-stakes gate, not a server secret** (epic
E-003 "Context & constraints").

## Where this sits in the epic

- **E-003 stakeholder-backstage**: a passcode-gated surface where nontechnical
  collaborators submit structured entries, plus one documented seam for agents to
  retrieve them verbatim.
- **S-003-01 backstage-entry-store**: the store half — 3 tickets.
  - T-003-01-01 (`entry-schema-and-storage-binding`, codex) — entry contract + KV/D1.
  - **T-003-01-02 (this ticket)** — the reusable passcode gate. `depends_on: [T-002-02-03]`.
  - T-003-01-03 (`entry-persistence-module`) — write/list data layer.
- **Downstream consumers of this gate** (the "submit and retrieve paths"):
  - T-003-02-01 (`passcode-gated-submission-route`, codex) — `depends_on: [T-003-01-02, T-003-01-03]`.
    "gates on the shared passcode, validates the entry shape, and persists it."
  - T-003-03-01 (`documented-agent-retrieval-seam`) — `depends_on: [T-003-01-02, T-003-01-03]`.
    the read path an agent follows to retrieve entries verbatim.

So this ticket ships **only the reusable gate primitive**. The two routes that compose
over it are downstream tickets and do not exist yet. Nothing to gate is present in
`src/pages/api/` today except the exemplar `receipt.ts`.

## The boundary / secret pattern already in the repo

The codebase has a strong, consistent shape for "server holds a secret, browser never
sees it." The passcode gate should read as a member of the same family.

- **`src/pages/api/receipt.ts`** — the one on-demand route (`prerender = false`). Reads
  `locals.runtime.env` for its secret (`DEMO_SIGNING_KEY`), validates it (missing/blank →
  `500 boundary_misconfigured` with a safe detail string, no value leaked), then does work.
  Env is read at the HTTP edge only; the value is never `PUBLIC_`-prefixed, logged, or
  interpolated into a response.
- **`src/lib/receipt.ts`** — pure, framework-free logic. "never reads env and never holds
  a key beyond the argument passed in — the HTTP layer owns env access." HMAC via Web
  Crypto (`crypto.subtle`), identical in Workers and Node. `verifyReceipt` recomputes and
  compares with `expected === r.signature` and a note: "inputs here are trusted test/ops
  contexts" (i.e. no constant-time compare, deliberately).
- **`src/lib/fault.ts`** — pure. Exports a single-source-of-truth env-name constant
  (`FAULT_ENV = 'DEMO_FAULT'`) and a tolerant `parseFaultMode` that fails safe to `'off'`
  on anything unexpected. No throw, no I/O.
- **`src/lib/operation-runner.ts` / `ops-check.ts`** — establish the **discriminated-union
  result** idiom: `{ trace: Passed…; value } | { trace: Failed… }`, with typed outcome
  fields the caller narrows on. Validation throws `TypeError`/`RangeError` on bad config.
- **`src/lib/leak-check.ts`** — operator-only assertion that the configured secret does not
  appear in (a) emitted client assets or (b) a raw boundary response body. Config carries
  `secret`, `bundleDir`, `responseUrl`, `timeBudgetMs`. Node `fs` — "must never be imported
  by application pages or routes." This is the executable enforcement of "not in the bundle."

### Env typing and documentation

- **`src/env.d.ts`** — `type Env` lists server-only vars available at
  `Astro.locals.runtime.env`: `DEMO_SIGNING_KEY: string` and optional `DEMO_FAULT?: string`.
  Comment: "Nothing here is `PUBLIC_`-prefixed, so nothing is inlined into client output."
- **`.dev.vars.example`** — checked-in template (no real secrets). Documents each var,
  the `wrangler secret put` production path, and the fault toggle. Copied to `.dev.vars`
  (gitignored) for local dev; surfaced via the Cloudflare adapter's `platformProxy`.
- **`astro.config.mjs`** — `output: 'static'`; only `/api/*` invokes the Worker. Confirms
  the bundle-exclusion guarantee: pages (incl. `/`) served as static assets; server env is
  never part of client output unless `PUBLIC_`-prefixed.

## Test conventions

- Runner: `node --experimental-strip-types --test test/<name>.test.mjs …` (Node 26 here).
  Tests import `.ts` sources directly (`../src/lib/fault.ts`).
- Style: `node:test` `test()` + `node:assert/strict`. Small, behavior-named cases; inject
  stubs (`fetchReturning`) rather than mock frameworks; assert on discriminated results.
- The `test` script in `package.json` lists each test file explicitly — a new test file
  must be added to that list to run in CI/`npm test`.
- `test/fault.test.mjs` is the closest analogue: it drives pure functions over a matrix of
  inputs (`parseFaultMode` fall-through cases) and asserts a secret does / does not appear
  in a serialized body (`leakSigningKey` — `JSON.stringify(...).includes(KEY)`).

## Runtime and platform facts that constrain the design

- Web globals available identically in Workers and Node ≥18 (and this Node 26): `crypto`,
  `crypto.subtle`, `Request`, `Response`, `Headers`, `AbortController`, `TextEncoder`.
  `leak-check.ts` uses `fetch`; `operation-runner.ts` uses `AbortController`; `receipt.ts`
  uses `crypto.subtle`. A gate may safely use `Request`/`Response`/`Headers`.
- Node-specific APIs (`node:fs`) appear only in operator tooling (`leak-check.ts`,
  `scripts/*`), never in `src/lib` modules meant for route reuse.
- Astro exposes only `PUBLIC_`-prefixed vars to the client; `locals.runtime.env` values are
  never bundled. This is the structural basis of "never appears in a browser bundle."

## Constraints and assumptions surfaced

- **Reusability is the point.** Two independent routes (submit POST, retrieve GET) must
  compose over one check. The check must not assume a method, a body, or a route shape.
- **Low-stakes threat model.** The epic calls the passcode a low-stakes gate, not a server
  secret. `verifyReceipt` already chose plain `===`; a passcode reaching the open internet
  is a slightly different exposure, so timing-side-channel handling is a judgment call for
  Design, not a settled fact.
- **Fail closed on misconfiguration.** The receipt route's precedent: a missing/blank
  secret is a `500`, not a client error, with a safe message and no value echoed.
- **Missing vs wrong.** Acceptance lists "401/403"; the repo has no existing auth code to
  copy a convention from, so the missing-vs-wrong status split is a Design decision.
- **Env naming.** The family is `DEMO_SIGNING_KEY`, `DEMO_FAULT`. A passcode var and any
  header name should join that family and live in `env.d.ts` + `.dev.vars.example`.
- **No route is wired in this ticket.** The submit/retrieve routes are downstream; adding
  an unused route here would be premature. The deliverable is the pure gate + its unit test.
- **Bundle guarantee is by construction here.** `leak-check.ts` scans built assets, but it
  is keyed to `DEMO_SIGNING_KEY`. Extending leak-check to the passcode is out of this
  ticket's scope; the "not in bundle" guarantee for the gate is structural (server-only env,
  read at the edge, passed into a pure function as an argument — never embedded).
