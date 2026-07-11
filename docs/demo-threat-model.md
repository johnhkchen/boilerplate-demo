<!-- This is the trust contract for the demo environments. Enforcement
     details (flags, tests, procedures) live in the docs/knowledge runbooks —
     update those first, then this. Architecture: demo-environments.md. -->

# Demo environments — threat model

## The boundary, up front

> **Sessions are for trusted and semi-trusted teammates only.**
>
> An editor invitee gets a real terminal in the session container. They can
> run arbitrary code, read any credential injected into the session
> (including everything in `SESSION_RUNTIME_SECRETS`), and modify the
> worktree. **Access decides who gets in; nothing sandboxes what an invitee
> does once inside.** Secret handling here is a launch-and-persistence
> boundary — secrets never land in the image, worktree, or logs — not
> isolation from code running in the session.

Consequences, in order of importance:

- **Never invite someone you wouldn't hand a laptop on this project.**
- **Never inject the owner's agent or account credentials by default** —
  give a session only demo-scoped credentials it actually needs, or `{}`.
- A preview invitee is lower-trust than an editor invitee: they can watch
  the work-in-progress, not touch it. Keep the two Allow policies distinct.
- The public demo (`demo.b28.dev`) is a different trust world entirely: a
  separate Worker, anonymous by design, sharing no auth path with sessions.

## Credential flow

```text
operator laptop            CI (GitHub Actions)         teammate browser
  wrangler login             CLOUDFLARE_API_TOKEN        IdP login / OTP
  cloudflared identity       CLOUDFLARE_ACCOUNT_ID            │
  token (per-use)                 │                     Access assertion (JWT)
       │                          │                           │
       ▼                          ▼                           ▼
  Cloudflare account ──── Workers versions ────── Sessions Worker verifies,
  secrets (encrypted):                            then STRIPS assertion +
    App:      DEMO_SIGNING_KEY, DEMO_PASSCODE     Access cookie/header
    Sessions: SESSION_ACCESS_* (3),                       │
              SESSION_RUNTIME_SECRETS ──── env ──▶ container processes only
```

| Credential | Held by | Enters | Must never appear in |
|---|---|---|---|
| Operator Wrangler/`cloudflared` auth | operator's machine, interactive | Cloudflare APIs | repo, CI logs, scripts |
| CI deploy token (Workers Scripts + D1) + account ID | GitHub Actions secrets | version upload/deploy, migrations | repo, workflow logs |
| `DEMO_SIGNING_KEY`, `DEMO_PASSCODE` | App Worker secrets | receipt signing, backstage gate | commands, URLs, browser bundle, `.dev.vars` reuse |
| `SESSION_ACCESS_TEAM_DOMAIN` / `_PREVIEW_AUD` / `_EDITOR_AUD` | Sessions Worker secrets | origin JWT verification | Git, docs, logs |
| `SESSION_RUNTIME_SECRETS` (JSON map) | Sessions Worker secret | `startProcess.env` of the two services only | image, worktree, coordinator state, logs/API/CLI (exact-value redacted) |
| Teammate identity login → Access assertion | teammate's browser ↔ Access | verified by the Worker, then stripped | the container, Worker logs, storage |
| `SESSION_ACCESS_TOKEN` (owner CLI, per-use) | operator's shell, unset after use | `cf-access-token` header to the exact hostname | arguments, files, CI, Git; CLI redacts it |
| Git clone credentials | **none** — `SESSION_REPOSITORY_URL` is public HTTPS | container fetch | anywhere (private repos are out of scope) |

The teammate's identity is verified twice — at the Access edge and again by
the Sessions Worker (signature, issuer, per-surface audience, lifetime,
identity shape) — and then deliberately forgotten: the assertion, the Access
email header, and the `CF_Authorization` cookie are removed before the
request reaches the container, and identity is never logged or persisted
([session-access.md](knowledge/session-access.md)).

## Surfaces and their protections

| Surface | Protection | Notes |
|---|---|---|
| `demo.b28.dev` | none (public by design) | static pages + 3 JSON APIs; backstage reads/writes are passcode-gated; no editor/admin surface exists here |
| `demo-runway.<subdomain>.workers.dev` | none (public) | same app; kept as a Worker-health probe distinct from zone failures |
| `demo-session.b28.dev` | Access preview app + origin JWT check | proxies to Astro dev :4321 |
| `code-session.b28.dev` | Access editor app + origin JWT check | proxies to code-server :8080; also carries `/__session/*` control API (reserved, never proxied) |
| Sessions Worker alternate origins | **disabled** | `workers_dev: false`, version previews off — the two exact hostnames are the only doors |
| code-server itself | `--auth none` **inside** the boundary | safe only because it is reachable solely through the verified proxy; must never be exposed directly |

## Trust zones

1. **Anonymous internet** — sees the public demo, nothing else.
2. **Preview invitee** — sees the live work-in-progress.
3. **Editor invitee** — full editor, terminal, session environment
   (including injected runtime secrets), worktree write access.
4. **Owner/operator** — session lifecycle (up/status/logs/down), promotion,
   invitations; authenticated by their own identity, never a shared token.
5. **Cloudflare account authority** — secrets, Access policies, entitlements;
   the root of everything above.

Each zone crossing is an explicit action: an invitation (exact email in an
Allow policy), an identity login, or account-level credentials.

## Enforced invariants

Each of these is backed by config or tests, not convention:

- **Physically separate Workers** — the public app and the session proxy are
  different deployments with different configs; no shared bypass can exist
  because no shared code path exists.
- **Per-surface audiences** — preview and editor are distinct Access
  applications; a valid preview token fails on the editor (and vice versa)
  at the origin, not just the edge. Fail-closed on any verification error,
  including JWKS unavailability (`test/session-access.test.mjs`).
- **Identity-only** — assertions must be `type: app` with a non-empty email
  and subject; service-token shapes are rejected.
- **Credential stripping** — assertion, email header, and Access cookie are
  removed before container forwarding.
- **Nothing baked** — `.dockerignore` plus explicit-COPY Dockerfile keep
  secrets out of the image; runtime secrets travel only as process
  environment, never written to worktree or coordinator state.
- **Exact-value redaction** — every configured secret value is replaced with
  `[REDACTED]` in process logs, stored errors, API responses, and CLI output.
- **Teardown preserves work** — a dirty worktree becomes a SHA-256-verified
  patch held by the owner before destroy; `down --force` is the only bypass
  and is the explicit destructive confirmation
  (`test/session-work-safety.test.mjs`).
- **Control API has no shared secret** — the owner CLI crosses the same
  Access boundary with an interactive identity token.

## Residual risks and operator obligations

1. **Platform replacement before `down` loses state.** Keep-alive avoids
   sleep, but a platform-initiated container replacement still discards
   uncommitted work. Encourage commits; run `down` when stepping away.
2. **The patch export caps at 2 MiB** and represents source work, not a
   filesystem snapshot: Git-ignored files, empty directories, and large
   generated assets are not preserved. Arrange another backup before
   `--force`.
3. **Redaction knows only configured values.** A credential a collaborator
   creates or pastes inside the session cannot be recognized or redacted —
   and if written to the worktree, it lands in the exported patch. Treat
   patches as sensitive.
4. **Revocation is three separate actions** — remove the email from the
   Allow policy, revoke the active Access session, and (if warranted)
   disable the identity at the IdP. No single dashboard click is all three
   ([session-access.md](knowledge/session-access.md)).
5. **Concurrent promotes are unguarded locally.** CI serializes itself; two
   humans racing `npm run promote` could interleave. Single-operator
   assumption, per the trust model.
6. **JWKS dependency.** Origin verification fails closed if the team's
   Access cert endpoint is unreachable — an availability risk, never an
   authentication bypass.
7. **D1 sits outside Workers versions.** Rolling back the demo does not roll
   back the schema; migrations are forward-only and old code must tolerate
   the current schema.

## Explicit non-goals

- Hosting **untrusted or anonymous** collaborators' code or edits.
- Multi-tenant isolation between collaborators — there is one session, one
  worktree, one environment.
- Secret isolation from an invited editor (see the boundary above).
- Fleet features — multiple sessions, invitations with expiry, garbage
  collection, reconcile, a control-plane UI (PRD Phases 3–5, deliberately
  unbuilt).

## Status

The invariants above are implementation-backed and locally verified
(148/148 tests, image build, Worker dry runs). No production Access
application, identity login, revocation, or paid Containers placement has
been executed yet; the go-live matrices in
[session-access.md](knowledge/session-access.md) and
[session-lifecycle.md](knowledge/session-lifecycle.md) are the human gates
before the first real invitation is sent.
