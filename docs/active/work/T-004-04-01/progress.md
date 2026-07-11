# Progress — T-004-04-01 access-protects-private-surfaces

## Status

- Current workflow phase: Implement.
- Ticket frontmatter: intentionally untouched; Lisa owns phase/status changes.
- Research: complete and committed (`c085dc1`).
- Design: complete and committed (`525a037`).
- Structure: complete and committed (`3c80f66`).
- Plan: complete and committed (`d1025ae`).
- Implementation: in progress.
- Review: pending.

## Implementation checklist

- [ ] Add pinned `jose` runtime dependency without unrelated upgrades.
- [ ] Implement Access configuration parsing and per-surface audience selection.
- [ ] Implement RS256/JWKS assertion verification and identity-token validation.
- [ ] Strip Access credentials before container forwarding.
- [ ] Add deterministic RSA/JWK unit tests and include them in `npm test`.
- [ ] Disable private Worker `workers.dev` and preview URL alternate origins.
- [ ] Declare required team-domain and per-surface audience bindings.
- [ ] Regenerate Sessions Worker environment types.
- [ ] Enforce verification before HTTP/WebSocket proxy dispatch.
- [ ] Add durable Access setup, test, revocation, and rollback runbook.
- [ ] Update lifecycle documentation to reference the implemented boundary.
- [ ] Run focused, full, type, config, bundle, stable-app, and whitespace checks.
- [ ] Perform adversarial auth/security self-review.
- [ ] Complete this progress log and `review.md`.

## Starting workspace conditions

- The worktree already contains Lisa/user modifications and untracked E-004 board material.
- The ticket file is untracked and will not be added to this ticket's commits.
- Sibling `T-004-04-02` work artifacts are present and may evolve concurrently.
- All commits use path-scoped staging.
- Shared source/config/package files will be re-read immediately before modification.

## Evidence boundary

- Local cryptographic verification can prove signature/claim/audience behavior.
- Wrangler validation can prove binding/config/bundle structure.
- The current environment has no supplied Cloudflare Access account authority, IdP identity,
  invited email, or audience tag.
- Prior work also records missing paid Containers entitlement.
- No production Access application, policy, deployment, login, or revocation will be claimed
  unless real remote evidence becomes available.

## Deviations

- The Structure/Plan originally left `scripts/session.ts` unchanged. Once alternate private
  Worker hostnames were disabled, the existing CLI had no way to cross identity-only Access on
  the exact custom domains. Current Cloudflare guidance supports an interactive user token from
  `cloudflared access token`, sent as `cf-access-token`. The implementation therefore adds an
  optional `SESSION_ACCESS_TOKEN` input to the owner CLI. This preserves identity policy and
  avoids introducing a Service Auth/shared-bypass credential.

## Implementation log

- Implement phase initialized after all four planning artifacts were written and committed.
- Added `jose` 6.2.3 and a fail-closed per-surface verifier with remote JWKS, RS256, issuer,
  audience, registered lifetime, application type, and identity-claim checks.
- Added 10 focused RSA/JWK tests; focused suite passes 10/10.
- Full suite after the verifier passes 146/146, including sibling work-safety coverage.
- Integrated verification before both HTTP and WebSocket coordinator dispatch, stripped the
  assertion/identity header/Access cookie before Sandbox forwarding, and preserved sibling
  secret-redaction and safe-teardown behavior.
- Disabled private `workers.dev` and version-preview URLs; declared three required Access
  bindings and regenerated Wrangler types.
- `npm run session:validate` passes; bundle is 677.41 KiB / 147.32 KiB gzip and the session
  image dry build completes.
- Added identity-token support to the owner CLI using `SESSION_ACCESS_TOKEN` /
  `cf-access-token`; tokens are bounded, never printed, and included in exact-value redaction.
- Focused Access/lifecycle suite passes 38/38 after the CLI change; full suite passes 148/148.
- Added `docs/knowledge/session-access.md` with exact two-application setup, narrow policy,
  binding, CLI login, clean-browser matrix, revocation, logging, and safe rollback procedures.
- Updated the lifecycle guide to remove the obsolete private `workers.dev` URL and future-ticket
  security wording, and to document Access credential stripping.
- Implementation commits so far:
  - `f169b1d` — Access verifier, dependency lock, focused tests, full-test registration;
  - `e07939f` — sibling work-safety fix also captured the current Worker integration while
    preserving both tickets' code in the shared worktree;
  - `6876192` — alternate-origin closure and generated Access bindings.
  - `fac40c5` — interactive identity Access token support for owner CLI plus tests.
