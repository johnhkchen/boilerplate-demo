# Structure — T-004-04-01 access-protects-private-surfaces

## Change map

```text
Cloudflare Access preview app       Cloudflare Access editor app
  exact preview email policy          exact editor email policy
  preview application AUD             editor application AUD
              |                                  |
              +------------- edge ---------------+
                                |
                     Sessions Worker custom domains
                                |
                  src/lib/session-access.ts
                   issuer + per-host audience
                    RS256/JWKS + identity shape
                                |
                  sanitized authenticated Request
                                |
                     src/session-worker.ts
                    exact target + coordinator
                                |
                    Sandbox preview / editor

demo.b28.dev -> separate App Worker -> unchanged anonymous response
```

## Files created

### `src/lib/session-access.ts`

Own all pure and cryptographic Access-boundary behavior outside the Worker orchestration file.

Public exports:

- `ACCESS_ASSERTION_HEADER`
  - canonical lower-case name for `Cf-Access-Jwt-Assertion`;
- `AccessConfig`
  - parsed team domain plus preview/editor audience values;
- `AccessIdentity`
  - minimal verified identity containing `email` and `subject`;
- `AccessSurface`
  - alias compatible with the existing `ProxyTarget` values;
- `parseAccessConfig(env)`
  - validates the three generated Worker bindings;
- `accessAudience(config, surface)`
  - returns the one expected audience for an exact surface;
- `verifyAccessRequest(request, config, surface, options?)`
  - verifies the assertion and returns a discriminated success/failure result;
- `stripAccessCredentials(request)`
  - produces a Request whose headers exclude origin-only Access credentials.

Internal organization:

1. constants and length bounds;
2. configuration parsing helpers;
3. exact audience selection;
4. JWKS construction/injection seam;
5. JWT verification;
6. identity-claim validation;
7. cookie parsing/filtering and credential stripping.

The module imports `createRemoteJWKSet` and `jwtVerify` from `jose`. It accepts an optional
`JWTVerifyGetKey` in test options, allowing deterministic local JWK tests without network I/O.
No request identity is stored at module scope. The library's remote JWK cache may be reused as
an immutable verification facility, but config/request data remains call-scoped.

### `test/session-access.test.mjs`

Own focused authentication and sanitization tests.

Test fixtures:

- generated RSA key pair through `jose`;
- public JWK with a fixed test `kid`;
- local JWK set resolver;
- signer helper with controllable issuer, audience, claims, times, and algorithm;
- canonical preview/editor Access configuration.

Test groups:

- safe configuration acceptance/rejection;
- per-surface audience selection;
- valid preview and editor identity tokens;
- wrong-surface audience denial;
- missing/malformed assertion denial;
- wrong issuer denial;
- expiry and not-before denial;
- non-RS256 denial;
- non-application and non-identity token denial;
- Access-header and cookie removal;
- preservation of unrelated cookies and request properties.

### `docs/knowledge/session-access.md`

Durable operator runbook and architecture note.

Sections:

- boundary and invariants;
- exact Access application table;
- prerequisites and identity-provider assumptions;
- creating the preview application/policy;
- creating the editor application/policy;
- configuring team domain and audience bindings;
- deployment order;
- clean-browser acceptance matrix;
- origin-denial and cross-audience probes;
- invitation change procedure;
- per-surface and per-user revocation procedure;
- Access logs to inspect;
- rollback without Bypass;
- remote evidence still required.

The runbook will not contain an account ID, invited email, audience tag, token, or secret value.

## Files modified

### `src/session-worker.ts`

Add imports from `src/lib/session-access.ts`.

Handler changes:

1. parse normal session config using the existing path;
2. classify control requests as today;
3. classify exact proxy hostname as today;
4. only after a proxy target exists, parse Access config;
5. verify the request against the target-specific audience;
6. return a stable no-store 403 on any verification failure;
7. strip Access credentials from the verified request;
8. set the Worker-owned proxy target header;
9. send the sanitized request to the coordinator.

Authentication will precede coordinator/lifecycle work. Both ordinary HTTP and WebSocket
requests pass through the same code path.

Add a small response helper if needed:

- `accessDenied()` returns the stable JSON envelope;
- structured logging records component, operation, surface, and bounded verification failure;
- it omits assertion, claims, email, subject, and cookie values.

No Durable Object method, stored record, lifecycle transition, container port, or proxy method
changes. The coordinator continues to remove the internal routing header before container
forwarding.

### `wrangler.sessions.jsonc`

Change exposure:

- `workers_dev: true` -> `workers_dev: false`;
- `preview_urls: true` -> `preview_urls: false`.

Extend the existing required binding contract:

- `SESSION_ACCESS_TEAM_DOMAIN`;
- `SESSION_ACCESS_PREVIEW_AUD`;
- `SESSION_ACCESS_EDITOR_AUD`.

Retain:

- both exact custom domains;
- current compatibility date and `nodejs_compat`;
- container and Durable Object declarations;
- structured observability settings;
- current non-secret session vars.

No Access app IDs or policies are embedded because Wrangler does not own those account objects.

### `worker-configuration.sessions.d.ts`

Regenerate with `npm run session:types` after changing Wrangler configuration.

Expected generated environment additions:

- `SESSION_ACCESS_TEAM_DOMAIN: string`;
- `SESSION_ACCESS_PREVIEW_AUD: string`;
- `SESSION_ACCESS_EDITOR_AUD: string`.

The file remains generated; no manual interface edits.

### `package.json`

Add `jose` as a runtime dependency because verification executes in the deployed Worker.

Add `test/session-access.test.mjs` to the explicit `npm test` file list. Do not replace the
current deterministic test list with discovery as part of this ticket.

No new deployment script is added.

### `package-lock.json`

Regenerate through npm when adding `jose`.

Only the dependency graph changes; do not perform a broad package upgrade.

### `docs/knowledge/session-lifecycle.md`

Replace or refine the current “future Access ticket” gate with a link to the implemented
Access boundary and runbook.

State clearly:

- code-server remains `--auth none` internally;
- the Sessions Worker now requires a verified identity application token per surface;
- remote Access applications/policies must exist before collaboration is considered live;
- the stable public Worker remains separate.

Do not rewrite unrelated lifecycle evidence or operational content.

### `docs/active/work/T-004-04-01/progress.md`

Created at Implement start and updated after each meaningful unit.

Track:

- completed artifacts;
- dependency addition;
- verifier implementation;
- Worker/config integration;
- generated types;
- tests and documentation;
- command results;
- deviations;
- remote evidence limitations;
- commit hashes/messages.

### `docs/active/work/T-004-04-01/review.md`

Created only in Review after code and verification finish.

Include:

- outcome and acceptance mapping;
- architecture delivered;
- complete file inventory;
- JWT/security review;
- edge policy and revocation handoff;
- exact local test results;
- effect of the Cloudflare skills;
- open paid-platform/remote-evidence concerns;
- human go-live checklist.

## Files not modified

- `docs/active/tickets/T-004-04-01.md`
  - Lisa owns phase and status transitions.
- `wrangler.jsonc`
  - the stable public App Worker remains anonymous and retains its operational alternate URLs.
- `worker-configuration.d.ts`
  - stable Worker bindings do not change.
- public Astro pages and APIs
  - no Access code enters the public application.
- `src/lib/session-lifecycle.ts`
  - host/lifecycle configuration remains separate from Access configuration.
- `scripts/session.ts`
  - control CLI authentication is not expanded by the proxy-surface criterion.
- `Dockerfile.session`
  - no credential or verifier enters the container image.
- session Durable Object state/schema
  - identity is request-scoped and is not persisted.

## Interface contracts

### Configuration input

```ts
type AccessConfig = {
  teamDomain: string;
  previewAudience: string;
  editorAudience: string;
};
```

The parser reads generated `SessionWorkerEnv` bindings but may accept a minimal structural
input in its pure signature so unit tests need no hand-written platform environment.

### Verification output

```ts
type AccessVerification =
  | { ok: true; identity: { email: string; subject: string } }
  | { ok: false; reason: string };
```

The failure reason is bounded and log-only. HTTP callers always receive the same public denial.

### Surface mapping

```text
preview host -> preview Access application -> preview AUD
editor host  -> editor Access application  -> editor AUD
```

There is no default/fallback audience. Unknown hosts never enter Access verification or
container proxying.

### Forwarded request

The Request retains method, URL, body stream, WebSocket upgrade headers, subprotocol, and all
non-Access headers. It removes the assertion header, untrusted Access email convenience header,
and only the `CF_Authorization` cookie pair. The existing internal target header is overwritten
after sanitization.

## Error and log boundaries

- Client response: status 403, `access_denied`, generic message, no-store.
- Configuration response: existing status 500 `session_worker_misconfigured` envelope.
- Log: structured JSON only, with no raw token or identity claim.
- Container: no Access assertion or authorization cookie.
- Durable storage: no identity data.
- Public Worker: no new errors or logs.

## Implementation ordering constraints

1. Add and lock `jose` before compiling the new verifier.
2. Implement the pure verifier module and tests before handler integration.
3. Update Wrangler bindings before using them in handler code.
4. Regenerate types after the config change, never hand-edit first.
5. Integrate authentication before coordinator dispatch.
6. Verify WebSocket request cloning remains valid after header sanitization.
7. Write the operator runbook after executable names and failure behavior stabilize.
8. Run the complete suite before Review.

## Concurrency constraints

- Stage only paths belonging to this ticket.
- Re-read `src/session-worker.ts`, `wrangler.sessions.jsonc`, package files, and lifecycle docs
  immediately before editing because sibling `T-004-04-02` may be active.
- If sibling changes land, preserve them and adapt the Access boundary around the new current
  file rather than restoring the earlier baseline.
- Keep each implementation commit coherent and narrow.
