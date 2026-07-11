# Review — T-004-04-01 access-protects-private-surfaces

## Outcome

The repository implementation for private session Access is complete and locally verified.

The Sessions Worker now requires a cryptographically valid Cloudflare Access identity
application assertion before it proxies either preview or editor HTTP/WebSocket traffic. Preview
and editor use different Access application audiences, so authorization for one surface cannot
be replayed on the other. Access credentials are removed before the request enters the Sandbox.

The private Worker's `workers.dev` and version-preview hostnames are disabled, leaving only the
two exact Access-managed custom domains. The stable public App Worker and `demo.b28.dev` were not
modified and retain their anonymous deployment contract.

The owner CLI can cross the control API's identity-only Access boundary using an interactive
user application token obtained with `cloudflared`; no Service Auth policy or shared bypass
credential was introduced.

No remote Access application, identity login, or revocation was executed because the workspace
contains no account/IdP authority or audience tags and prior work records missing paid
Containers entitlement. The exact production setup and evidence matrix are documented in
`docs/knowledge/session-access.md`.

## Acceptance criterion assessment

Ticket criterion:

> An unauthenticated request to a session editor or preview is denied while demo.b28.dev serves
> anonymously; the origin independently validates the Access assertion; an invited identity
> reaches only its intended surfaces and revocation removes access.

| Clause | Repository/local evidence | Verdict |
|---|---|---|
| unauthenticated preview denied | missing/blank assertion tests fail closed; handler authenticates before coordinator | PASS locally |
| unauthenticated editor denied | same exact branch with editor audience; missing assertion fails | PASS locally |
| private edge login required | two exact Access apps specified; private alternate origins disabled | CONFIGURED CONTRACT; remote pending |
| public demo anonymous | separate `wrangler.jsonc`/App Worker untouched; private host classifier excludes it | PASS structurally; remote probe pending |
| origin verifies signature | generated RSA token validated against JWK; malformed/HS256 rejected | PASS |
| origin verifies issuer | wrong-team token test rejected | PASS |
| origin verifies lifetime | expired and future-`nbf` token tests rejected | PASS |
| preview/editor isolation | distinct binding invariant plus preview-token-on-editor rejection | PASS |
| identity-only | `type: app`, non-empty email/sub required; service-shaped token rejected | PASS |
| invited identity policy | exact-email separate Allow policies documented; no broad selectors | REMOTE POLICY pending |
| revocation removes access | policy removal + user token revoke + IdP procedure documented; expiry enforced | REMOTE TEST pending |
| HTTP and WebSocket protected | both enter the same authenticated branch before coordinator dispatch | PASS by code/type |
| no token enters Sandbox | assertion/email header/Access cookie stripping tests | PASS |
| no private alternate origin | `workers_dev:false`, `preview_urls:false` | PASS config |
| no shared bypass | no Bypass/Service Auth path; CLI uses interactive identity token | PASS |

The implementation satisfies everything that can be proven without production account state.
The acceptance criterion should not be declared remotely demonstrated until the clean-browser
and revocation matrix in the runbook is executed.

## Delivered architecture

```text
anonymous browser
  -> demo.b28.dev
  -> separate public App Worker

private browser
  -> exact preview/editor hostname
  -> Cloudflare Access application + narrow identity Allow policy
  -> Cf-Access-Jwt-Assertion
  -> Sessions Worker
       exact hostname -> expected per-surface AUD
       remote team JWKS -> RS256 signature
       issuer + aud + exp + nbf + iat + app/email/sub
       strip assertion, Access email header, CF_Authorization cookie
  -> SessionCoordinator
  -> Sandbox Astro :4321 or code-server :8080

owner CLI
  -> cloudflared interactive identity application token
  -> cf-access-token header
  -> exact private hostname /__session/*
  -> Access edge policy (no shared bypass)
  -> existing lifecycle coordinator
```

## Files created

### Runtime and tests

| File | Purpose |
|---|---|
| `src/lib/session-access.ts` | Access binding validation, surface audience mapping, JWT verification, credential stripping. |
| `test/session-access.test.mjs` | Generated RSA/JWK origin-verifier and request-sanitization tests. |

### Documentation and workflow

| File | Purpose |
|---|---|
| `docs/knowledge/session-access.md` | Exact Access application/policy, binding, CLI, acceptance, revocation, log, and rollback runbook. |
| `docs/active/work/T-004-04-01/research.md` | Codebase and current-product research. |
| `docs/active/work/T-004-04-01/design.md` | Options, tradeoffs, and two-application decision. |
| `docs/active/work/T-004-04-01/structure.md` | File/module/interface blueprint. |
| `docs/active/work/T-004-04-01/plan.md` | Ordered implementation and verification sequence. |
| `docs/active/work/T-004-04-01/progress.md` | Commits, evidence, deviation, and completed checklist. |
| `docs/active/work/T-004-04-01/review.md` | This handoff. |

## Files modified

| File | Change |
|---|---|
| `src/session-worker.ts` | Verify the target-specific assertion before proxy dispatch; generic denial log/response; sanitize request. |
| `wrangler.sessions.jsonc` | Disable alternate hostnames; declare required team domain and two audience bindings. |
| `worker-configuration.sessions.d.ts` | Regenerated typed Access bindings. |
| `scripts/session.ts` | Accept, send, validate, and redact interactive identity `SESSION_ACCESS_TOKEN`. |
| `test/session-lifecycle.test.mjs` | CLI identity-token header, validation, and redaction coverage. |
| `package.json` | Add `jose` runtime dependency and register Access tests while preserving sibling tests. |
| `package-lock.json` | Lock `jose` 6.2.3. |
| `docs/knowledge/session-lifecycle.md` | Replace obsolete private `workers.dev` operator URL/future gate; document auth and stripping. |

No file was deleted.

The ticket frontmatter, stable public `wrangler.jsonc`, stable generated bindings, App Worker
source, public pages/APIs, container image definition, and Durable Object storage schema were
not modified by this ticket.

## Origin verification review

### Configuration

The parser requires:

- an exact canonical HTTPS team-domain origin;
- a subdomain of `cloudflareaccess.com`;
- no credentials, port, path, query, fragment, trailing slash, or whitespace;
- bounded URL-safe audience tags;
- different preview and editor audience values.

Missing or invalid private Access configuration returns the existing fixed 500
misconfiguration response. Account-specific values are generated binding types but stored with
interactive Wrangler secret input, not in Git.

### Cryptographic checks

`jose` follows Cloudflare's current Worker guidance:

- keys come from `<team-domain>/cdn-cgi/access/certs`;
- `kid` selection and rotation are handled through the remote JWK set;
- accepted algorithm is restricted to RS256;
- issuer and requested-surface audience are exact;
- `aud`, `exp`, `iat`, `iss`, `nbf`, and `sub` are required;
- expiry and not-before are enforced;
- identity validation occurs only after signature/claim verification.

The origin additionally requires `type: app`, a non-blank IdP email, and a non-blank subject.
That intentionally rejects service-token application claims for browser collaboration.

### Failure behavior

- missing, blank, and over-16-KiB assertions fail before JWKS work;
- all verification errors become one generic public 403;
- logs use only fixed failure categories and surface name;
- no token, payload, email, subject, cookie, or key enters logs/errors/storage;
- authentication happens before session readiness/process inspection;
- JWKS/network failure is fail-closed.

### Forwarding behavior

After success, the Worker removes:

- `Cf-Access-Jwt-Assertion`;
- `Cf-Access-Authenticated-User-Email`;
- the `CF_Authorization` cookie pair.

It preserves unrelated cookies, ordinary headers, URL/method/body, WebSocket Upgrade, and
subprotocol. The coordinator later removes the Worker-owned target header as before.

The verified identity object remains request-local and is not forwarded or persisted.

## Edge policy and surface isolation review

The runbook requires two exact self-hosted Access applications:

| Host | Application role | Policy population | Origin expectation |
|---|---|---|---|
| `demo-session.b28.dev` | preview | exact preview invite emails | preview AUD |
| `code-session.b28.dev` | editor/terminal | exact editor invite emails | editor AUD |

This keeps policy decisions and origin audience decisions aligned. A preview-only collaborator
is absent from the editor policy, and even a valid preview application token fails the editor
origin audience check.

The runbook explicitly prohibits:

- a shared multi-domain application;
- Bypass;
- Everyone/all-valid-email selectors;
- Service Auth on browser surfaces;
- alternate Worker hostnames;
- a directly exposed passwordless code-server.

## CLI review

Disabling private alternate origins invalidated the previous production CLI example. The final
CLI supports the documented identity-only Access workflow:

1. user logs in through `cloudflared` and the normal Access identity policy;
2. `SESSION_ACCESS_TOKEN` holds the application token in the local shell;
3. the CLI sends it as `cf-access-token` to the exact custom domain;
4. Access emits the origin assertion only after policy authorization;
5. the CLI includes the token in exact-value output/error redaction;
6. the operator unsets it after use.

The token is optional for local Wrangler operation, bounded to 16 KiB, and rejected if blank or
whitespace-bearing. It is never accepted as a CLI argument or printed.

This was a documented implementation deviation from the original Structure/Plan, prompted by
current Cloudflare CLI guidance and the need to avoid stranding lifecycle operations after
closing `workers.dev`.

## Test coverage

### Focused Access and lifecycle tests

Focused run: **38/38 pass**.

The 10 new Access tests cover:

- canonical safe config and unsafe config variants;
- distinct surface audience selection;
- valid preview/editor RSA tokens;
- cross-surface audience rejection;
- missing/blank/oversized/malformed assertions;
- wrong issuer;
- expired and future-not-before tokens;
- HS256 rejection;
- service/organization/incomplete identity shape rejection;
- failure non-disclosure;
- assertion/email-header/Access-cookie removal;
- preservation of unrelated cookies and WebSocket headers.

Two new lifecycle/CLI tests cover:

- token input validation;
- `cf-access-token` request header;
- exact token redaction from CLI output.

### Full repository verification

- `npm test`: **148/148 pass**, zero failures/skips.
- `npm run session:types:check`: pass.
- isolated Sessions Worker TypeScript: pass.
- `npm run session:validate`: pass.
- Sessions Worker upload: **677.41 KiB / 147.32 KiB gzip**.
- Docker session image dry build: pass.
- `npm run typecheck`: pass; 52 Astro files, zero errors/warnings/hints.
- stable App Worker generated types: current.
- `git diff --check`: pass.

The full suite includes the concurrently completed work-safety tests, so Access integration did
not regress runtime-secret redaction, recoverable teardown patches, or process quiescence.

## Skill-guided review

The `cloudflare-one` skill caused current Cloudflare Access documentation/API retrieval before
the design. It shaped the two-application policy boundary, remote JWKS validation, identity-only
claim checks, revocation procedure, and prohibition on broad/Bypass policies.

The `workers-best-practices` skill caused retrieval of current Worker guidance, types, and the
Wrangler schema before code edits. It shaped generated binding use, fail-closed structured
errors, awaited verification, absence of request-scoped global state, no credential logging,
and request-body/header preservation.

The `wrangler` skill shaped interactive secret commands, binding regeneration, current v4 CLI
syntax, and dry-run validation. No remote mutation or secret value was passed on a command line.

## Commits

Ticket artifact and implementation commits:

1. `c085dc1` — Research.
2. `525a037` — Design.
3. `3c80f66` — Structure.
4. `d1025ae` — Plan.
5. `d98e8fc` — initial Progress.
6. `f169b1d` — `jose`, verifier, focused tests, and full-test registration.
7. `6876192` — alternate-origin closure and generated Access bindings.
8. `fac40c5` — identity-authenticated owner CLI and tests.
9. `06a7efc` — Access runbook, lifecycle update, and implementation evidence.
10. Final Review commit — this artifact and completed Progress.

Because Lisa ran sibling `T-004-04-02` on the shared branch, its `e07939f` commit captured the
current `src/session-worker.ts` while both tickets' compatible changes were present. The final
source contains both Access enforcement and work-preservation hardening; all shared tests pass.

All direct ticket commits used path-scoped staging. Pre-existing Lisa/user board changes remain
outside this ticket.

## Open concerns

### 1. Remote Access and revocation evidence — production gate

No real Access application, identity policy, browser login, audience binding, authentication
log, or revocation was available. An authorized operator must execute the runbook matrix before
calling the private handoff production-ready.

### 2. Paid Containers entitlement — production gate

Prior work records that the account could not deploy Containers. Access can be configured
correctly while the runtime still cannot be placed. Enablement is a financial/account action and
was not attempted.

### 3. Browser/editor WebSocket evidence — production gate

Code paths protect WebSocket upgrades, and Vite HMR worked in earlier local lifecycle evidence.
A real code-server browser WebSocket plus save/HMR flow behind Access remains unobserved.

### 4. Control API origin verification — documented boundary

The control API is edge-protected by whichever exact Access application hostname the owner CLI
uses, and alternate public origins are disabled. Independent JWT verification in this ticket is
applied specifically to the preview/editor proxy branch required by the acceptance criterion.
There is no externally reachable direct Durable Object binding. If a future service binding or
new hostname exposes control operations, add an explicit origin authorization policy for that
new boundary rather than assuming the current edge route.

### 5. Remote JWKS latency/availability — low operational risk

Verification depends on the team's Access cert endpoint and fails closed if it is unavailable.
`jose` owns key lookup/rotation behavior. The fixed one-session MVP has low traffic; if higher
scale reveals repeated key-fetch latency, profile before adding an isolate-level or durable JWKS
cache and preserve rotation semantics.

### 6. Revocation is multi-step

Removing an email rule prevents new matching tokens but does not replace active-session
revocation. Permanent removal may also require IdP disablement. The runbook calls out all three;
operators must not treat one dashboard action as every form of revocation.

## Human go-live handoff

Before sharing either private link:

1. enable the Containers entitlement;
2. create two exact-host Access applications with distinct audiences;
3. attach narrow exact-email identity Allow policies and no Bypass/Service Auth;
4. configure all required Worker bindings interactively;
5. deploy and confirm private alternate hostnames are absent;
6. prove `demo.b28.dev` returns anonymous 200;
7. prove both private hosts deny a clean unauthenticated browser;
8. prove preview-only and editor-only identities receive only their intended surfaces;
9. prove editor save plus preview HMR over WebSockets;
10. remove/revoke a disposable identity and prove existing/new sessions lose access;
11. inspect Access authentication and Sessions Worker logs for the expected decisions;
12. retain the work-safety teardown patch evidence before destroying the session.

Until that remote matrix passes, the repository is implementation-ready but the production
identity handoff remains an explicit human gate.
