# Ephemeral collaborative demo environments — decisions

**Status:** Decided (MVP shape); implementation not yet started.
**Date:** 2026-07-10
**Source:** PRD "Ephemeral Collaborative Demo Environments" (reference deployment `demo.b28.dev`).
**Relates to:** charter P4 (collaboration has no workplace tax), P6 (every project is
sovereign), P1 (public before deep ideation), P3 (room/phone work safely); non-goal N3
(not a mandatory SaaS control plane).

This note records the decisions taken before any code, so the drafted board (E-004) and
the eventual implementation stay honest about *why*. It is the decision record; the
operator/architecture guide (`docs/demo-environments.md`) and threat model
(`docs/demo-threat-model.md`) are implementation deliverables authored later (E-004 docs
story).

---

## Context

The project already ships a stable public demo (Astro static-first on Cloudflare Workers,
promoted through CI). The PRD asks for two more things: a **branded, stable** demo URL with
one-command **promotion/rollback**, and **isolated, browser-editable collaborative sessions**
(preview + IDE) a teammate can open with nothing but a browser and an identity login. The
PRD is deliberately stack-agnostic; these decisions bind it to *this* project.

## Decision 1 — Session runtime: Cloudflare Containers (Sandbox SDK)

The ephemeral session (the browser IDE + the live Astro dev server, which Workers cannot
host) runs in a **Cloudflare Container via the Sandbox SDK**, not on an owner-controlled VM
behind a named tunnel (the PRD's default in §8).

- **Why:** keeps the project Cloudflare-first and **sovereign (P6)** — no box to patch or
  babysit, idle cost stays near zero, and the whole thing lives in the project's own
  Cloudflare account (honours N3: per-project, not a central control plane). It is the most
  coherent choice with what this template *is*.
- **Cost:** Cloudflare Containers are a newer surface; the load-bearing behaviours are the
  least-documented ones. These are resolved by a **Phase 0 spike** before Phase 2 is
  committed (see Open risks).
- **Runner-up:** VM + `cloudflared` named tunnel + Traefik + code-server — proven, but a host
  to run, which cuts against P6.

## Decision 2 — Scope: MVP, then stop for a real handoff

Build only:
- **Phase 1** — the stable demo on `demo.b28.dev` with promotion/rollback.
- **Phase 2** — exactly **one** Access-protected session (preview + editor).

Then **stop and do a real handoff** before building the fleet (multi-session, invitations,
GC, reconcile, control-plane UI — PRD Phases 3–5). The single-session flow must prove itself
in real use before its complexity is multiplied. This matches the PRD's own instruction to
implement "the smallest coherent version" and the charter's right-sizing.

## Decision 3 — Architecture: two Workers + one Sandbox

Follows from Decisions 1–2.

```
demo.b28.dev        → App Worker (public)      = the promoted BUILD, as a Workers version
demo-<slug>.b28.dev → Sessions Worker (Access) → proxies to the container's Astro dev server
code-<slug>.b28.dev → Sessions Worker (Access) → proxies to the container's code-server (IDE)
promote <slug>      = wrangler versions upload + versions deploy  (the slug's commit → App Worker)
```

- **App Worker and Sessions Worker are physically separate** (PRD §13.2): the public demo and
  the private editor share no auth bypass.
- **The Sessions Worker owns the branded hostnames and reverse-proxies to the container**, so
  we keep `demo-<slug>` / `code-<slug>` (first-level under `b28.dev`, covered by a single
  `*.b28.dev` cert) instead of accepting the SDK's generated preview-URL subdomains. Access
  sits on the Worker route.
- **The Sandbox is only the session runtime.** It never touches the stable demo.

## Deviations from the PRD (recorded per PRD §1.5 / §19)

| PRD default | This project | Reason | Effect on the experience contract |
|---|---|---|---|
| Named tunnel + host + Traefik/Caddy (§8) | Cloudflare Containers / Sandbox SDK | P6 sovereign; no host to babysit; one platform | None — sessions still get preview + editor + terminal |
| Promotion moves a tunnel/DNS route (§4.6, §14) | Promotion = Workers **version alias** (`versions deploy`) | Atomic pointer-move to an already-built immutable artifact; instant rollback, no rebuild, no DNS/TTL | Strengthens it — matches §14 level 1 better than a route swap |
| SDK-generated preview URLs (Sandbox `exposePort`) | Sessions Worker reverse-proxies branded hostnames | Keep memorable `code-<slug>` names; put Access on the Worker; avoid multi-level wildcard certs | None — recipient still gets a clean link |

## Open risks to resolve in Phase 0 (spike gates Phase 2)

1. **Sleep/wake process survival (highest risk).** Containers sleep after ~10 min idle
   (`sleepAfter` configurable). Unknown: do `astro dev` **and** `code-server` resume on wake,
   or are they killed and need a supervisor to relaunch — and is terminal/editor state lost?
   The whole "session feels alive" promise rides on this.
2. **WebSockets through the proxy.** Astro/Vite HMR and code-server both need WS to survive the
   Worker→container hop; must configure Vite `server.allowedHosts` + `server.hmr` for the
   dynamic hostname.
3. **Instance sizing + Node version.** Base image is Node 20; CI pins **Node 24**, and we run
   the *workerd* dev server alongside code-server — `instance_type: lite` may be undersized;
   Node 24 + code-server must be baked into the image.
4. **Cold start vs the 60s budget.** First hit pulls the image + `npm ci` + boots workerd-dev;
   bake deps into the image and/or pre-warm, or the 60s target won't hold.
5. **Uncommitted work is not durable.** Container FS vanishes on destroy (and maybe on sleep).
   Teardown MUST commit+push (or export a patch to R2) before destroy (PRD §7.6).
6. **Agent credentials.** If a session bundles Claude/Codex tooling, inject at launch, never in
   the image/worktree, and don't hand a collaborator the owner's creds by default.

## PRD §22 open choices — answers so far

| Question | Answer |
|---|---|
| What hosts sessions? | Cloudflare Containers (Sandbox SDK) — no owner host |
| Isolation mechanism? | One Sandbox (DO + container) per session; own worktree inside |
| Browser IDE? | code-server, baked into the session image |
| Agent credentials? | Injected at launch; policy TBD in Phase 2 (default: not the owner's) |
| Promotion selects what? | An immutable **Workers version** built from the session's exact commit |
| Who manages DNS/Access? | Automation via the Sessions Worker + Access; operator sets the zone once |
| Session previews private by default? | Yes (Access); made public only by an explicit action |
| OAuth/CORS/cookies/WS for dynamic hosts? | Configured per session hostname; verified in the Phase 0 spike |
| What survives host restart? | The stable demo (a Workers version); sessions are ephemeral by design |
| Session TTL / activity? | TTL per PRD default (12h); `sleepAfter` raised for live sessions |
| Uncommitted work before cleanup? | Commit+push (or R2 patch) before destroy |
| Trust level of code? | Trusted / semi-trusted teammates only — stated prominently in the threat model |
