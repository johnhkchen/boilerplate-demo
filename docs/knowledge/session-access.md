# Session Access boundary

The collaborative session is private by default. Two exact Cloudflare Access self-hosted
applications protect its preview and editor, and the Sessions Worker independently verifies the
Access application assertion before proxying HTTP or WebSocket traffic into the Sandbox.

The stable demo is a separate Worker and remains public:

```text
demo.b28.dev                 -> public App Worker (no Access application)
demo-session.b28.dev         -> preview Access app -> Sessions Worker -> Astro :4321
code-session.b28.dev         -> editor Access app  -> Sessions Worker -> code-server :8080
```

## Security invariants

- Keep the public App Worker and private Sessions Worker physically separate.
- Protect both exact private hostnames with Access before deploying the session runtime.
- Use two Access applications, not one multi-domain application.
- Give the applications different audience tags.
- Use identity Allow policies with explicit invited emails.
- Do not use Bypass, Everyone, all-valid-email, or Service Auth policies.
- Do not enable `workers.dev` or version preview URLs on the Sessions Worker.
- Never make code-server directly reachable; it intentionally runs with `--auth none` inside
  the protected boundary.
- Never commit a team domain, audience tag, invited email, Access token, account ID, or API
  credential to the template.

The origin verifier accepts only an RS256 application token with:

- a signature from the configured team's current/previous remote JWKS;
- the exact configured team-domain issuer;
- the audience assigned to the request's exact preview/editor hostname;
- valid `exp` and `nbf` times plus required `iat`;
- `type: app`;
- non-empty identity `email` and `sub` claims.

Service-token-shaped assertions have no identity email and are rejected. A preview application
token fails on the editor because its audience differs, even if it is otherwise valid.

Before forwarding an authenticated request, the Worker removes the assertion header, the Access
email convenience header, and the `CF_Authorization` cookie. Unrelated application cookies and
WebSocket headers remain intact. Access identity is not logged, persisted, or sent to the
container.

## Prerequisites

- `b28.dev` is active in the same Cloudflare account as the Workers deployment.
- The Zero Trust organization has an identity provider configured. One-time PIN is acceptable
  for invited collaborators when deliberately enabled.
- The operator can create Access applications and policies.
- The operator can configure Worker secrets through Wrangler.
- The account can deploy Workers Containers.
- The two exact custom domains in `wrangler.sessions.jsonc` are the intended session hostnames.

Use current Cloudflare documentation for UI/API details:

- Access self-hosted applications:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/>
- Access policies:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/policies/>
- Origin JWT validation:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/>
- Session/revocation management:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/>

## Create the preview application

In Zero Trust > Access controls > Applications, add a self-hosted application with:

| Setting | Value |
|---|---|
| Name | Demo Runway session preview |
| Public hostname | `demo-session.b28.dev` |
| Type | Self-hosted |
| Session duration | no longer than the session's 12-hour TTL |
| WARP authentication | disabled unless deliberately required later |
| App launcher | hidden for this disposable MVP unless the team wants it visible |

Attach an Allow policy whose Include rules are exact invited Email values. Add only people who
may view the work-in-progress preview. Do not add an Everyone selector, broad all-valid-email
login selector, Bypass action, or Service Auth action.

From the application's Additional settings, copy its Application Audience (AUD) tag into a
secure operator note for the next configuration step. Do not commit it.

## Create the editor application

Add a second self-hosted application with:

| Setting | Value |
|---|---|
| Name | Demo Runway session editor |
| Public hostname | `code-session.b28.dev` |
| Type | Self-hosted |
| Session duration | no longer than the session's 12-hour TTL |
| WARP authentication | disabled unless deliberately required later |
| App launcher | hidden for this disposable MVP unless the team wants it visible |

Attach a separate identity Allow policy containing only identities trusted to edit and use the
terminal. An editor may also appear in the preview policy when they need live preview access.
A preview-only identity must not appear in the editor policy.

Copy the editor application's AUD tag. Confirm it differs from the preview tag. The Worker
fails closed if both configured tags are equal.

## Configure the Sessions Worker

Configure the existing runtime-secret map first, using `{}` when the session needs none:

```bash
npx wrangler secret put SESSION_RUNTIME_SECRETS --config wrangler.sessions.jsonc
```

Then enter each account-specific Access value interactively:

```bash
npx wrangler secret put SESSION_ACCESS_TEAM_DOMAIN --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_PREVIEW_AUD --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_EDITOR_AUD --config wrangler.sessions.jsonc
```

`SESSION_ACCESS_TEAM_DOMAIN` is the canonical origin only:

```text
https://<team-name>.cloudflareaccess.com
```

Do not include a trailing slash, path, credentials, port, query, or fragment. Audience values
are entered exactly as shown by their corresponding Access applications.

For local Wrangler work, place disposable values in the gitignored `.dev.vars` file. Local
cryptographic tests use generated keys and do not require a real team domain.

Regenerate/validate binding types after any configuration contract change:

```bash
npm run session:types
npm run session:types:check
```

## Safe deployment order

1. Create both Access applications and their narrow identity policies.
2. Confirm the preview/editor audience tags differ.
3. Configure all four required Sessions Worker secret bindings.
4. Run `npm test` and `npm run session:validate`.
5. Deploy the Sessions Worker and container only after Access covers both exact custom domains.
6. Confirm the deployment has no `workers.dev` or version-preview hostname.
7. Run the clean-browser matrix below before sending either link.

If Access is not ready, do not add a Bypass policy. Leave the private Worker undeployed or
remove/disable its custom-domain routes.

## Owner CLI through identity Access

The control API lives on the same exact custom domains and has no shared bypass token. Use an
interactive user application token from `cloudflared`, not a Service Auth credential:

```bash
cloudflared access login https://code-session.b28.dev
export SESSION_ACCESS_TOKEN="$(cloudflared access token -app=https://code-session.b28.dev)"
export SESSION_WORKER_URL=https://code-session.b28.dev
npm run session -- status
```

`scripts/session.ts` sends this token as `cf-access-token`. Cloudflare Access authenticates it
under the user's identity and forwards its own `Cf-Access-Jwt-Assertion` only after the editor
policy allows the request. The CLI redacts the configured token from its output/errors.

Unset the shell value after the operation:

```bash
unset SESSION_ACCESS_TOKEN
```

Do not add the token to shell scripts, `.env` files, command arguments, CI logs, or Git. For
headless automation, stop and design a separately scoped Service Auth surface rather than
turning either browser application into a shared bypass.

## Acceptance test matrix

Use a clean supported browser profile with no existing Access cookies.

| Identity/state | Public demo | Preview | Editor | Expected |
|---|---:|---:|---:|---|
| unauthenticated | 200 | login/deny | login/deny | public only |
| preview invite only | 200 | allowed | denied | cannot edit |
| editor invite only | 200 | denied unless separately invited | allowed | exact policy scope |
| invited to both | 200 | allowed | allowed | two application audiences |
| removed/revoked | 200 | denied where removed | denied where removed | no stale private access |

For every allowed private request, verify the actual Astro page or code-server loads rather than
accepting a redirect/login page as success. Exercise WebSockets by keeping the editor and preview
open, saving a change, and observing HMR.

Basic anonymous probes:

```bash
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://demo.b28.dev/
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://demo-session.b28.dev/
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://code-session.b28.dev/
```

The public probe must be 200. Private probes must not return the session content anonymously;
Access may respond with a login redirect or denial depending on request headers and settings.

Repository cryptographic tests additionally prove missing, malformed, expired, future,
wrong-issuer, wrong-algorithm, non-identity, and cross-surface assertions fail at the origin.

## Invitation changes

To grant preview only, add the exact identity email only to the preview Allow policy. To grant
editing, add it to the editor policy and separately add preview permission if desired. Have the
recipient authenticate in a clean browser and verify only the intended matrix cells.

Avoid broad email-domain rules for external collaborators unless every identity in that domain
is intended to receive access. Exact email rules are the one-session MVP invitation unit.

## Revocation

For one identity on one surface:

1. remove its exact Email Include rule from that application's Allow policy;
2. revoke the user's active Access session from Team & Resources > Users;
3. if the identity must lose all future organization access, disable/remove it at the IdP;
4. wait for documented Access propagation;
5. retry in the existing browser tab and in a fresh clean profile;
6. confirm the removed surface denies while any intentionally retained surface still works;
7. inspect Access authentication logs for the denied decision.

For incident containment affecting everyone on one surface, use that application's “Revoke
existing tokens” action. Policy removal prevents a user from minting a new application token;
token revocation removes the active session; IdP disablement prevents future authentication.
Those are complementary actions, not interchangeable labels.

Application-token expiry is an additional origin backstop. A token minted for the other surface
still fails audience validation and cannot substitute for the revoked application's token.

## Logs and troubleshooting

Use Access authentication logs to confirm which application and policy produced allow/deny
decisions. Sessions Worker denial logs contain only:

- component and operation;
- preview/editor surface;
- a fixed verification failure category.

They intentionally omit JWTs, cookies, email, subject, payloads, and keys. The container should
never receive the Access assertion or authorization cookie.

If a valid invite gets the Worker's generic 403:

1. confirm the request reached the intended exact hostname;
2. confirm the binding uses that application's AUD rather than the other surface's;
3. confirm the team-domain origin is exact and has no trailing slash;
4. confirm the application was not deleted/recreated (which changes its audience);
5. inspect Access logs and current signing-key endpoint health;
6. redeploy corrected bindings; never work around the verifier with Bypass.

## Rollback

If origin verification breaks legitimate access, roll back the Sessions Worker version while
keeping Access policies in place. If the runtime cannot be made safe promptly, disable/remove
the private Worker custom domains or deployment.

Never roll back by:

- adding a Bypass policy;
- enabling `workers.dev` or version preview URLs;
- combining preview and editor into one broad application;
- enabling code-server passwordless access on another hostname;
- weakening the origin to trust an unverified email header or cookie.

The public App Worker needs no Access rollback because this implementation does not modify it.

## Evidence status

Local repository evidence covers JWT cryptography, claims, audience isolation, request
sanitization, generated bindings, types, and Worker bundling. A real Cloudflare deployment,
identity login, Access policy decision, application-token revocation, paid container placement,
and browser editor/HMR flow still require the sovereign project account and must be attached as
production evidence before the epic's handoff is claimed complete.
