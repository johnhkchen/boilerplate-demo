<!-- This is the capability guide: the journeys through the demo environments.
     Operational facts (flags, budgets, dashboards, checklists) live in the
     linked docs/knowledge runbooks — update those first, then this. -->

# Demo environments

This project ships two things from one Cloudflare account: a **stable public
demo** at `demo.b28.dev`, and a **private collaborative session** — a live
preview plus a browser editor — that an owner can hand to a teammate as two
links, with nothing to install on either side. Read
[the threat model](demo-threat-model.md) before sharing any session link.

## What's here (architecture)

```text
demo.b28.dev         → App Worker (public)       = the promoted build, a Workers version
demo-session.b28.dev → Access → Sessions Worker  → container's Astro dev server :4321
code-session.b28.dev → Access → Sessions Worker  → container's code-server IDE :8080
```

Two **physically separate Workers** share the account and nothing else:

- The **App Worker** (`wrangler.jsonc`) serves the public demo — static
  pages plus three JSON API routes, D1, and the release metadata. It has no
  session code and no Access application; it stays anonymous by design.
- The **Sessions Worker** (`wrangler.sessions.jsonc`) owns the two private
  hostnames. It verifies a Cloudflare Access identity assertion itself before
  proxying any HTTP or WebSocket traffic, then forwards into the session
  container. Its `workers.dev` and version-preview hostnames are disabled.

The session runs in **one Cloudflare Container** managed through the Sandbox
SDK: a pinned image (Node 24, code-server, dependencies baked at
`/opt/demo-runway` — see [session-image.md](knowledge/session-image.md)) that
checks out one exact commit into an isolated Git worktree and runs the Astro
dev server and code-server from it
([session-lifecycle.md](knowledge/session-lifecycle.md)). The MVP is exactly
one session with the fixed slug `session`.

A **release is an immutable Workers version** tagged with its commit;
promotion and rollback move a pointer, never rebuild, and never touch DNS
([deployment.md](knowledge/deployment.md)). All public hostnames sit exactly
one label under the zone apex so the `*.b28.dev` Universal SSL certificate
covers them.

Why it's shaped this way is recorded in
[demo-environments-decisions.md](knowledge/demo-environments-decisions.md);
the deviations from the PRD it binds are recorded below.

## One-time operator setup

You need account-level authority: Wrangler login, the `b28.dev` zone, a Zero
Trust organization, and the ability to create Access applications. Each step
links to the runbook that owns the details.

1. **Bootstrap the stable demo** — authenticate Wrangler, delete the stale
   `demo.b28.dev` CNAME left by the retired tunnel demo (the attach refuses
   otherwise), then `npm run deploy` to create the Worker, bindings, and
   custom domain; set `DEMO_SIGNING_KEY` and `DEMO_PASSCODE` interactively;
   apply the D1 migration; add the two GitHub Actions secrets so CI can
   promote. Full sequence: [deployment.md](knowledge/deployment.md).
2. **Enable Workers Paid Containers** on the account. This entitlement is
   currently the blocking gate for everything session-side.
3. **Build and check the session image** — `npm run session:image:check`
   builds the pinned image, boots a clean container, and measures cold
   readiness against the 60 s budget
   ([session-image.md](knowledge/session-image.md)).
4. **Create the two Access applications** — one for
   `demo-session.b28.dev` (preview), one for `code-session.b28.dev`
   (editor), with **different audience tags** and exact-email Allow
   policies. Never a shared multi-domain app, Bypass, Everyone, or
   Service Auth policy ([session-access.md](knowledge/session-access.md)).
5. **Configure the Sessions Worker secrets** — all four, interactively:
   `SESSION_RUNTIME_SECRETS` (a JSON map; `{}` if the demo needs no
   credentials), `SESSION_ACCESS_TEAM_DOMAIN`, `SESSION_ACCESS_PREVIEW_AUD`,
   `SESSION_ACCESS_EDITOR_AUD` — each via
   `npx wrangler secret put <NAME> --config wrangler.sessions.jsonc`.
6. **Deploy the Sessions Worker** only after Access covers both exact
   hostnames, and confirm the deployment exposes no `workers.dev` or
   version-preview URL.
7. **Run the clean-browser acceptance matrix** — public 200 anonymously,
   both private hosts denied anonymously, each invited identity reaching
   only its intended surfaces — before sending anyone a link
   ([session-access.md](knowledge/session-access.md)).

## Running a session (owner day-to-day)

Authenticate the CLI through Access with your own identity — there is no
shared bypass token:

```bash
cloudflared access login https://code-session.b28.dev
export SESSION_ACCESS_TOKEN="$(cloudflared access token -app=https://code-session.b28.dev)"
export SESSION_WORKER_URL=https://code-session.b28.dev

npm run session -- up <full-commit-sha>   # bring up that exact commit
npm run session -- status                 # desired vs actual state
npm run session -- logs                   # bounded Astro + code-server output
npm run session -- down                   # tear down, preserving dirty work
```

Two consequences of the design worth internalizing:

- **The session costs while it's up.** It runs with keep-alive because
  container sleep destroys processes and files; `down` is your job, not a
  timeout's ([session-lifecycle.md](knowledge/session-lifecycle.md)).
- **`down` protects uncommitted work.** A dirty worktree is exported as a
  verified Git patch to your current directory before the container is
  destroyed; `down --force` is the only way to skip that, and it is the
  destructive confirmation.

## The teammate path — nothing to install

*This section is for the person receiving the links.*

You get two links and an invitation tied to your email address. You need a
browser — no repository clone, no runtime, no IDE, no VPN.

- **The preview link** (`demo-session.b28.dev`) shows the running demo as it
  is being edited, live.
- **The editor link** (`code-session.b28.dev`) opens a full code editor —
  files, terminal, search — on an isolated copy of the project.

Open either link, sign in with the email that was invited (your identity
provider, or a one-time PIN if the owner enabled it), and you're in. Edit a
file in the editor, save, and the preview updates by itself — keep both tabs
open side by side.

Worth knowing:

- You may be invited to the preview only, or to both. The editor invitation
  is the powerful one — it includes a terminal.
- Your sign-in lasts at most the session's lifetime (12 hours); just sign in
  again if asked.
- Your edits live in the session, not in the project's history. Before the
  owner tears the session down, tell them what you want kept — their
  teardown automatically exports uncommitted work as a patch they hold.
- The session belongs to one exact commit. If the owner switches commits,
  the session refuses rather than silently discarding your work.
- What you can and can't see inside the session is spelled out in
  [the threat model](demo-threat-model.md).

## Promotion and rollback

The strongest session state, or any commit, becomes the public demo with one
command — and comes back off it just as fast:

```bash
npm run promote -- <commit-ish>   # e.g. HEAD, a sha, a session's exact commit
npm run rollback                  # previous deployment, no rebuild, <1 s
npm run rollback -- <version-id>  # a specific version
```

Promote refuses on a dirty build-reaching tree or a failed verify gate,
smoke-tests the new version's preview URL before anything public changes,
then moves the pointer and confirms the hostname serves the new version.
Exit codes, the deployment ledger, the 100-version rollback horizon, and the
D1-is-outside-versions caveat: [deployment.md](knowledge/deployment.md).

## Deviations from the PRD

The PRD ("Ephemeral Collaborative Demo Environments") is deliberately
stack-agnostic; per its §1.5/§19 every deviation is recorded with its reason
and its effect on the experience contract. This project deviates in three
places (decided before implementation in
[demo-environments-decisions.md](knowledge/demo-environments-decisions.md)):

| PRD default | This project | Reason | Effect on the experience contract |
|---|---|---|---|
| Named tunnel + owner host + Traefik/Caddy (§8) | Cloudflare Containers via the Sandbox SDK | Sovereign per-project (P6): no host to patch or babysit, one platform, idle cost near zero | None — sessions still deliver preview + editor + terminal |
| Promotion moves a tunnel/DNS route (§4.6, §14) | Promotion = Workers **version alias** (`versions upload` + `versions deploy`) | Atomic pointer-move to an already-built immutable artifact; instant rollback; no rebuild, no DNS/TTL wait | Strengthens it — a truer §14 level 1 than a route swap |
| SDK-generated preview URLs (Sandbox `exposePort`) | Sessions Worker reverse-proxies branded hostnames | Memorable `demo-session`/`code-session` names; Access enforced on the Worker route; stays inside the single-level wildcard certificate | None — the recipient still gets a clean, brandable link |

The second deviation is the reason rollback is instant and the active version
can never be garbage-collected; the third is the reason the origin — not just
the edge — verifies every Access assertion.

## Evidence status and go-live gates

Honest state as of 2026-07-10:

- **Live-exercised:** a real promote → rollback round-trip on the account
  (versions uploaded, pointer moved, restored in under a second). Hostname
  verification currently ends exit 3 until the stale `demo.b28.dev` CNAME is
  deleted by hand — step 1 above.
- **Implementation-complete, locally verified:** the entire session stack —
  image cold-start (4.5 s local), lifecycle, worktree isolation, HMR through
  the proxy, Access origin verification (148/148 tests), secret injection
  and redaction, patch-export teardown.
- **Production-pending:** paid Containers placement, a real Access
  application with identity login and revocation, and the browser
  editor/HMR flow behind Access. The go-live checklists live at the end of
  [session-lifecycle.md](knowledge/session-lifecycle.md),
  [session-access.md](knowledge/session-access.md), and
  [deployment.md](knowledge/deployment.md).

## Reusing this in another generated demo

This capability is a template permanent. To adopt it in another demo, change:
the zone and the three hostnames (in `wrangler.jsonc`, `wrangler.sessions.jsonc`,
and the pinned Vite `allowedHosts`/HMR host), `SESSION_REPOSITORY_URL` (a
credential-free public HTTPS clone URL), the Access organization and its two
applications, and every secret. The commands, image, lifecycle, and trust
boundary carry over unchanged.
