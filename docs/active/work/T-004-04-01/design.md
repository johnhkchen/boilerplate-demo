# Design — T-004-04-01 access-protects-private-surfaces

## Decision summary

Protect the two exact session hostnames with two separate Cloudflare Access self-hosted
applications and exact-email Allow policies. Add a fail-closed origin verifier to the Sessions
Worker that validates Cloudflare's forwarded application JWT with remote account JWKS, exact
issuer, the audience assigned to the requested surface, token lifetime, application-token type,
and identity claims. Remove the private Worker's `workers.dev` and version-preview hostnames,
and strip Access credentials before proxying an authorized request into the Sandbox.

The stable App Worker and `demo.b28.dev` remain unchanged and public.

## Goals

- Require an identity login before preview HTTP or WebSocket traffic reaches the container.
- Require an identity login before editor HTTP or WebSocket traffic reaches code-server.
- Keep the stable public demo anonymous.
- Reject forged, missing, expired, not-yet-valid, wrong-issuer, and wrong-audience assertions at
  the Worker origin.
- Prevent a preview-only invitation from authorizing the editor.
- Prevent an editor-only invitation from authorizing the preview.
- Give an operator an exact, reviewable Access setup and revocation procedure.
- Keep account identity, audience tags, invited addresses, and API credentials out of Git.
- Preserve local and dry-run verification without claiming an unavailable remote deployment.

## Non-goals

- A multi-session invitation control plane.
- Automated IdP provisioning or SCIM group management.
- A reusable organization-wide Access policy framework.
- Service-token access to the browser surfaces.
- Authentication built into code-server.
- Changes to the public App Worker, its routes, or its health/preview hostnames.
- Production deployment or account mutation without operator credentials and paid entitlement.

## Option 1 — one Access application for both private hostnames

One self-hosted application can cover both exact domains and offer a single login experience.
Cloudflare can issue application cookies across the application's domains, and the Worker would
need only one expected audience.

Advantages:

- one application and one policy to operate;
- one audience setting;
- less initial setup;
- convenient single sign-on across preview and editor.

Disadvantages:

- preview and editor share one authorization boundary;
- any identity allowed to preview is also allowed to edit;
- the origin cannot use audience validation to prevent cross-surface use;
- revocation cannot remove one surface while retaining the other;
- it does not satisfy “only its intended surfaces” for distinct invitation roles.

Decision: reject.

## Option 2 — two Access applications and two audiences

Create one exact-host self-hosted application for `demo-session.b28.dev` and another for
`code-session.b28.dev`. Each application owns an exact-email Allow policy and its own audience.
The Worker chooses the expected audience from the already trusted exact-host classifier.

Advantages:

- preview and editor invitations are independently scoped;
- a token minted for one host fails origin verification on the other;
- per-application revocation can target one surface;
- policy and origin boundaries align with the repository's two proxy targets;
- no runtime invitation database is required for the fixed MVP session.

Disadvantages:

- two applications and policies must be kept correct;
- an identity invited to both may receive separate application cookies;
- two audience bindings must be configured;
- invitation changes occur in Cloudflare rather than through the session CLI.

Decision: choose.

## Option 3 — Worker-owned email allowlists only

The Worker could validate one Access application token and compare its email claim to separate
preview/editor allowlists stored in Worker configuration.

Advantages:

- one Access application;
- the origin independently owns fine-grained authorization;
- deterministic local tests.

Disadvantages:

- duplicates Cloudflare Access policy state in Worker configuration;
- every invite or revoke requires synchronizing and deploying two authorization sources;
- drift can deny legitimate users or leave stale access;
- it makes the application origin a bespoke invitation control plane;
- it weakens Access audit logs as the single record of policy decisions.

Decision: reject for the one-session MVP. The origin independently establishes token
authenticity and surface audience; Access remains the identity-policy source of truth.

## JWT library options

### Hand-written Web Crypto verifier

A small implementation could decode JWT segments, retrieve JWKS, import RSA keys, verify
RSASSA-PKCS1-v1_5/SHA-256, and check claims.

This avoids a dependency but creates security-sensitive parsing, caching, key selection,
clock-skew, and claim-validation code. Correct behavior around malformed values and rotation
would be locally owned.

Decision: reject.

### `jose`

Cloudflare's current Workers example uses `createRemoteJWKSet` and `jwtVerify` from `jose`.
The library handles remote JWKS selection and caching, RS256 verification, issuer, audience,
and registered time claims. It runs on Workers Web Crypto.

Decision: choose and pin it through the existing package lock.

## Origin configuration contract

Add three required production secrets/bindings to the Sessions Worker:

- `SESSION_ACCESS_TEAM_DOMAIN` — the exact HTTPS team-domain origin, such as
  `https://example.cloudflareaccess.com`;
- `SESSION_ACCESS_PREVIEW_AUD` — the preview application's audience tag;
- `SESSION_ACCESS_EDITOR_AUD` — the editor application's audience tag.

These values are identifiers rather than bearer credentials, but the repository's existing
`secrets.required` mechanism avoids committing account-specific values while still generating
binding types. Local values can live in the gitignored `.dev.vars` file.

The parser will:

- require a canonical HTTPS origin with no credentials, path, query, or fragment;
- require a `cloudflareaccess.com` hostname;
- require non-empty audience strings with conservative length bounds;
- require the preview and editor audience values to differ.

Invalid configuration fails closed before a proxy request is dispatched.

## Verification boundary

Authentication applies after exact private-host classification and before the request is sent
to `SessionCoordinator.fetch()`.

For a private host, the Worker will:

1. read only `Cf-Access-Jwt-Assertion` as the origin assertion;
2. reject a missing or blank assertion with a generic 403;
3. select the audience from `preview` or `editor`;
4. verify the JWT through the team domain's remote JWKS;
5. require RS256;
6. require the exact configured issuer;
7. require the selected surface audience;
8. rely on `jose` to enforce `exp` and `nbf` when present;
9. require `type: app`;
10. require non-empty identity `email` and `sub` claims;
11. sanitize credentials from the forwarded request;
12. add only the internal routing header and dispatch to the coordinator.

The verifier will not fall back to `CF_Authorization`. Cloudflare recommends the assertion
header, and accepting a browser cookie directly would blur the edge/origin contract.

## Failure semantics

- Authentication failure returns JSON 403 with `cache-control: no-store`.
- The response uses one stable `access_denied` code and a non-diagnostic public message.
- Missing configuration continues to use the existing 500 misconfiguration envelope.
- The Worker logs only a bounded failure category/message.
- It never logs the assertion, cookies, JWT payload, email, subject, or public keys.
- It does not distinguish missing, malformed, expired, or wrong-audience tokens to the client.
- Authentication runs before lifecycle readiness, so unauthenticated callers cannot use
  readiness differences as a private-session oracle.

## Credential stripping

Authorized requests currently retain all incoming headers when proxied to container code. The
new boundary will remove:

- `Cf-Access-Jwt-Assertion`;
- `Cf-Access-Authenticated-User-Email`;
- the `CF_Authorization` cookie while preserving unrelated cookies.

The Sandbox does not need the Access token. Removing it prevents repository code, Astro logs,
extensions, and code-server from receiving a reusable identity assertion. Other application
cookies remain available so the proxied services can function normally.

## Alternate-host decision

Set `workers_dev: false` and `preview_urls: false` only in `wrangler.sessions.jsonc`.

This leaves the two exact custom domains as the only public entrances to the private Worker.
Both are represented by Access applications. The stable public Worker's settings remain true
because its alternate hosts are intentionally public operational surfaces.

The control API remains path-classified before proxy authentication. With alternate Sessions
Worker hostnames disabled, its externally reachable paths are still behind the Access
application for whichever exact private hostname the operator uses. The ticket's independent
origin validation is specifically enforced for the editor and preview proxy boundary.

## Edge policy design

Create two self-hosted public-hostname Access applications:

| Application | Exact domain | Policy source | Origin audience |
|---|---|---|---|
| Demo Runway session preview | `demo-session.b28.dev` | preview invite emails | preview AUD |
| Demo Runway session editor | `code-session.b28.dev` | editor invite emails | editor AUD |

For each application:

- use an identity IdP or explicitly configured one-time PIN login;
- use an Allow policy with exact Email Include rules;
- do not use Everyone, all-valid-email, Bypass, or Service Auth;
- keep WARP authentication disabled unless deliberately introduced later;
- use a bounded session duration appropriate for the 12-hour session TTL;
- hide the disposable application from the app launcher unless desired;
- record the audience tag into the matching Worker binding.

An editor invite may also be added to preview when live feedback is intended. A preview-only
invite is absent from the editor policy.

## Revocation design

For one identity on one surface:

1. remove its exact-email rule from that application's Allow policy;
2. revoke that user's active Access session;
3. verify a new request is denied after the documented propagation window.

For immediate application-wide containment, revoke existing tokens on that application.
For permanent organization-wide removal, disable the IdP identity and revoke the Access user.

The origin adds a second revocation backstop through token expiry. A removed identity cannot
mint a new matching application token; a token for the other application cannot cross the
audience boundary.

## Operator automation decision

Do not add an API mutation script in this ticket. The repository lacks account identity, IdP
selection, invitation values, and a safe policy ownership convention. An idempotent script
would need to decide whether to adopt, replace, or merge pre-existing account applications and
policies, which is material production authority not inferable here.

Instead, add a durable runbook with the exact two-application invariant, binding commands,
negative/positive tests, revocation steps, and rollback. This is an honest executable handoff
for the operator who owns the account. Multi-session automation belongs with the later fleet
control plane.

## Verification strategy

Unit tests will generate an RSA key pair and use a local JWK set to prove:

- a valid identity token succeeds for its surface;
- its verified identity is returned without exposing the raw token;
- missing assertion fails;
- wrong audience fails, including preview token on editor;
- wrong issuer fails;
- expired and not-yet-valid tokens fail;
- wrong algorithm fails;
- service-token-shaped claims fail;
- malformed tokens fail;
- configuration rejects unsafe team domains and shared audiences;
- sanitized requests remove Access credentials but preserve unrelated cookies;
- public hostname classification still excludes `demo.b28.dev`.

Repository verification will run the full test suite, session generated-type check, isolated
session TypeScript, Wrangler dry deploy, stable app typecheck, and whitespace checks.

Remote acceptance remains a documented go-live gate when account access is unavailable. A
clean browser should demonstrate Access login/deny on both private hosts, anonymous 200 on
`demo.b28.dev`, cross-surface policy denial, and denial after revocation.

## Rollback

- Revert the Sessions Worker code/config deployment if origin validation breaks valid traffic.
- Restore the prior binding values only if an Access application was recreated deliberately.
- Do not create a Bypass policy as a troubleshooting shortcut.
- Access application removal is not a safe rollback while code-server remains unauthenticated;
  disable the private Worker routes or deployment instead.
- The public App Worker requires no rollback because it is unchanged.
