# T-004-05-01 — operator-and-teammate-docs-and-threat-model — Research

Descriptive map of what exists that the two deliverable documents
(`docs/demo-environments.md`, `docs/demo-threat-model.md`) must describe. No
solutions proposed here.

## The ticket in one line

Make the E-004 capability transferable: document operator setup, the teammate
zero-install path, the trust boundary/credential flow, and the three recorded
PRD deviations — so the permanent is reusable across generated demos.

## Acceptance criteria decomposed

1. `docs/demo-environments.md` covers **one-time operator setup**,
   **architecture**, and the **teammate zero-install path** — as separate
   sections/audiences.
2. `docs/demo-threat-model.md` states the **trusted/semi-trusted boundary**
   and **credential flow** prominently.
3. All **three PRD deviations** are recorded with reasons and
   experience-contract effects.

## Where the deliverables sit

- `docs/` currently has **no top-level files** — only `active/`, `archive/`,
  `knowledge/`. These two docs are the first top-level entries.
- `docs/knowledge/demo-environments-decisions.md` (the decision record)
  explicitly names both files as "implementation deliverables authored later
  (E-004 docs story)". The decision record stays authoritative for *why*; the
  new docs own *how to operate* and *what to trust*.
- The PRD ("Ephemeral Collaborative Demo Environments") is **not in the
  repo**; it is referenced by section number from the decisions doc. The
  deviations table there is the only in-repo record of the PRD defaults.

## Source material inventory (all verified present)

### Decision record — docs/knowledge/demo-environments-decisions.md

- Decisions 1–3: Containers/Sandbox SDK runtime; MVP scope (Phase 1 stable
  demo + Phase 2 exactly one session, then stop); two Workers + one Sandbox.
- **The three PRD deviations table** (per PRD §1.5/§19) — this is the direct
  source for AC 3:
  1. tunnel+host+Traefik → Cloudflare Containers/Sandbox SDK (P6 sovereign;
     effect: none — preview + editor + terminal preserved);
  2. promotion via tunnel/DNS route move → Workers **version alias**
     (atomic pointer, instant rollback; effect: strengthens the contract);
  3. SDK-generated preview URLs → Sessions Worker reverse-proxies branded
     hostnames (memorable names, Access on the Worker, single-level wildcard
     cert; effect: none — recipient still gets a clean link).
- PRD §22 open-choices answers (hosting, isolation, IDE, credentials,
  promotion unit, TTL, trust level).

### Stable demo / promotion — docs/knowledge/deployment.md (T-004-02-01/02)

- One-time bootstrap: wrangler auth, stale-CNAME deletion, `npm run deploy`
  (creates Worker, D1, assets, custom domain), interactive secrets
  (`DEMO_SIGNING_KEY`, `DEMO_PASSCODE`), D1 migration, two GitHub Actions
  secrets.
- `npm run promote -- <commit-ish>`: resolves exact commit, refuses on dirty
  build-reaching tree or failed verify gate, uploads commit-tagged version,
  smoke-tests preview URL, moves pointer, verifies hostname via
  `x-demo-version-id`. Ledger = Cloudflare deployment message + gitignored
  `.promote/`.
- `npm run rollback [-- <version-id>]`: pointer-move only, no rebuild/gate,
  sub-second, no DNS. Exit codes 0/1/2/3 shared. 100-version horizon; active
  version cannot be GC'd. D1 is outside versions (forward-only migrations).
- Custom domain belongs to the Worker, not a version; depth-1 hostname rule
  (`*.b28.dev` Universal SSL) shapes all public names.

### Session image — docs/knowledge/session-image.md (T-004-03-01)

- Exact pins: `@cloudflare/sandbox@0.12.3` (SDK and Docker base must match),
  Node 24.18.0 overlay, code-server 4.127.0 (checksum-verified),
  linux/amd64 only.
- Baked baseline at `/opt/demo-runway`; entrypoint `/container-server/sandbox`
  must not be replaced. Ports 4321 (Astro) / 8080 (code-server).
- Build-context security: `.dockerignore` + explicit COPY; no secrets baked.
- Local cold readiness 4,485 ms vs 60,000 ms budget; production unmeasured
  (Containers entitlement missing).
- Commands: `session:image:build`, `session:image:check`, `session:validate`,
  `session:types(:check)`.

### Session lifecycle — docs/knowledge/session-lifecycle.md (T-004-03-02, T-004-04-02)

- Fixed slug `session`; exact Custom Domains `demo-session.b28.dev` /
  `code-session.b28.dev`; no wildcard (platform limit + would capture the
  public host).
- Two DO namespaces: `SessionCoordinator` (desired state, serialization) and
  SDK `Sandbox` (container, worktree, processes, forwarding).
- Owner commands: `npm run session -- up <full-sha> | status | logs | down
  [--force]` over `/__session/*` control API (reserved prefix, not proxied).
- Worktree program: bare repo + detached worktree at exact SHA; same-revision
  rerun preserves edits; different-SHA refusal; baked-dependency reuse.
- Vite/HMR config pinned for the branded hostname (`wss`, clientPort 443).
- `keepAlive: true` — sleep destroys processes and `/workspace` (spike
  finding), so the operator **must** run `down`; idle cost is not near-zero
  while a session is up.
- Teardown: dirty worktree → `git add -A` + full-index binary patch (≤2 MiB),
  SHA-256 verified, CLI writes mode-0600 artifact, digest acknowledgement,
  quiesce services, regenerate, destroy only on match. `--force` is the only
  bypass. Recovery: `git checkout --detach <base>` + `git apply --binary`.
- Runtime secrets: `SESSION_RUNTIME_SECRETS` JSON map (`{}` allowed), Worker
  secret only, injected as `startProcess.env`, never in image/worktree/
  coordinator; exact-value redaction in logs/API/CLI. Terminals inherit env —
  by design readable to authorized collaborators.

### Access boundary — docs/knowledge/session-access.md (T-004-04-01)

- Two exact self-hosted Access applications (preview, editor) with distinct
  AUD tags; exact-email Allow policies; no Bypass/Everyone/Service Auth.
- Origin (Sessions Worker) independently verifies RS256 assertion: JWKS,
  issuer, per-surface audience, exp/nbf/iat, `type: app`, identity email/sub;
  strips assertion/email header/`CF_Authorization` before forwarding.
- `workers.dev` + version-preview URLs disabled on the Sessions Worker.
- code-server runs `--auth none` **inside** the boundary — must never be
  directly reachable.
- Owner CLI crosses Access with an interactive `cloudflared` identity token
  (`SESSION_ACCESS_TOKEN` → `cf-access-token` header); redacted by CLI.
- Secrets: `SESSION_ACCESS_TEAM_DOMAIN`, `SESSION_ACCESS_PREVIEW_AUD`,
  `SESSION_ACCESS_EDITOR_AUD` (+ `SESSION_RUNTIME_SECRETS`) via interactive
  `wrangler secret put --config wrangler.sessions.jsonc`.
- Acceptance matrix (clean-browser, per-identity), invitation and
  multi-step revocation procedures, log hygiene, rollback rules
  (never Bypass / never re-enable alternate origins).

### Spikes — sandbox-session-spike.md, sandbox-sleep-wake-spike.md (T-004-01-*)

Phase 0 findings that shaped everything: sleep/wake destroys processes and
files (hence keepAlive + explicit down + patch export); HMR WebSockets survive
the Worker→container hop with pinned Vite config.

## Implementation reality (verified against source tree)

- Two Workers: `wrangler.jsonc` (App) / `wrangler.sessions.jsonc` (Sessions);
  separate generated type projects (`tsconfig.sessions.json`).
- `src/session-worker.ts` (886 lines) — coordinator, Access verification,
  proxy, lifecycle, teardown. `src/lib/session-access.ts`,
  `src/lib/session-lifecycle.ts`, `src/lib/promote.ts` pure cores.
- `scripts/`: `promote.ts`, `rollback.ts`, `release-shared.ts`, `session.ts`
  (CLI), `session-image-check.ts`, `leak-check.ts`, `ops-check.ts`,
  `integration-check.ts`.
- `Dockerfile.session`; `justfile` has only dev/build/preview (release and
  session ops are npm scripts).
- Tests: 148/148 at last review, including Access crypto and Git patch
  recovery integration.

## Trust-model facts the threat model must state (from dependency reviews)

- Trust level: **trusted / semi-trusted teammates only** (PRD §22 answer;
  epic guardrail). An editor invitee gets a terminal and the runtime-secret
  environment — injection ≠ isolation from session code.
- Credential flows to enumerate: operator Cloudflare/wrangler auth; CI
  deploy token (Workers Scripts + D1); App Worker secrets (signing key,
  passcode); Sessions Worker Access config + runtime-secret map; teammate
  identity login (IdP/OTP) → Access assertion → stripped before container;
  owner CLI identity token; explicit "never" list (no agent creds by
  default, nothing baked in image/worktree, no tokens in repo/logs).
- Known residual risks (from reviews): platform replacement before `down`
  loses state; 2 MiB patch cap; redaction covers configured values only;
  collaborator-written secrets enter the patch; concurrent promotes
  unguarded; revocation is multi-step; JWKS fail-closed dependency.

## Production-evidence caveat (must not be overstated)

All Access/Containers behavior is locally/implementation proven only: the
account lacked paid Containers entitlement and no real Access application,
identity login, or revocation was executed. `demo.b28.dev` promote/rollback
**was** exercised live (exit 3 pending stale-CNAME deletion — an operator
step). Both new docs must distinguish implemented-and-locally-verified from
production-pending, and point at the production checklists in the knowledge
docs rather than duplicating them.

## Constraints and assumptions

- ~200 lines per artifact; docs should link to knowledge docs (runbooks) as
  the operational source of truth rather than fork their content.
- CLAUDE.md brand voice applies to user-facing copy; these are operator/
  contributor docs — plain English still preferred, but they are technical
  references, not visitor-facing cards.
- Audiences differ: operator (owner, has Cloudflare account authority),
  teammate (browser + identity only), future maintainer (deviations, trust
  reasoning). AC 1 explicitly requires the three concerns "separately".
- The capability is a **permanent** — docs must read as template-reusable
  (per-project sovereign account), not one-off notes about b28.dev, while
  still using the concrete `b28.dev` hostnames as the worked example.
