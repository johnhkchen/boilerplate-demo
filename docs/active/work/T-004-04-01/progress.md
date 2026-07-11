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

- None.

## Implementation log

- Implement phase initialized after all four planning artifacts were written and committed.
