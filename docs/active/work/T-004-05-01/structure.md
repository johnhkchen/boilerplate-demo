# T-004-05-01 — operator-and-teammate-docs-and-threat-model — Structure

File-level blueprint. Two files created, none modified, none deleted.

## Files

| File | Status | Role |
|---|---|---|
| `docs/demo-environments.md` | **create** (~200 lines) | Capability guide: architecture, operator one-time setup, teammate zero-install path, day-to-day release ops, PRD deviations, evidence status |
| `docs/demo-threat-model.md` | **create** (~170 lines) | Trust contract: boundary + credential flow up front, surfaces, invariants, residual risks, non-goals |
| `docs/active/work/T-004-05-01/*` | create | RDSPI artifacts (this set) |

No source, config, test, or knowledge-doc changes. Ticket frontmatter is not
touched (Lisa owns transitions).

## docs/demo-environments.md — section blueprint

```
# Demo environments
  1–2 sentence orientation: one public stable demo URL + one private
  collaborative session, both in the project's own Cloudflare account.
  Pointer to demo-threat-model.md before sharing links.

## What's here (architecture)                     [AC 1: "architecture"]
  Hostname → Worker → runtime diagram (3 hostnames), then:
  - two physically separate Workers (public App / private Sessions), why
  - the one Sandbox container (image pins summary, /opt baseline, worktree)
  - promotion = Workers version alias; what a "release" is
  - fixed `session` slug, depth-1 hostname + certificate rule
  Per-subsystem deep links: deployment.md, session-image.md,
  session-lifecycle.md, session-access.md, demo-environments-decisions.md.

## One-time operator setup                        [AC 1: "operator setup"]
  Ordered checklist with exact command names, each step linking to its
  runbook section for detail:
  1. Stable demo bootstrap (wrangler auth → stale CNAME → npm run deploy →
     App Worker secrets → D1 migration → CI secrets)      → deployment.md
  2. Containers entitlement (paid; currently the blocking gate)
  3. Session image build/check (session:image:check)      → session-image.md
  4. Access: two exact apps, distinct AUDs, exact-email
     policies; the never-list (no Bypass/Everyone)        → session-access.md
  5. Sessions Worker secrets (4 bindings, interactive)    → session-access.md
  6. Deploy Sessions Worker only after Access covers both hostnames;
     confirm no workers.dev/preview URLs
  7. Clean-browser acceptance matrix before first invite  → session-access.md

## Running a session (owner day-to-day)
  cloudflared identity token → session up <sha> / status / logs / down;
  keepAlive consequence (sessions cost while up; always `down`);
  dirty-work patch export in one paragraph               → session-lifecycle.md

## The teammate path — nothing to install         [AC 1: "teammate path"]
  Written to the teammate (plain English, standalone):
  - you get two links (preview / editor) + an invitation on your email
  - open link → identity login (or one-time PIN) → that's the whole setup
  - what each link is; edits in the editor appear live in the preview
  - what to expect: session may pause/refuse while owner rebases (409),
    12h session-duration cap, save your work by telling the owner before
    they tear down (their `down` exports your uncommitted edits)
  - what you can see: terminal + any launch-injected demo credentials
    (pointer to threat model)

## Promotion and rollback (link-heavy summary)
  promote <commit-ish> (incl. a session's exact commit) / rollback;
  exit codes; instant, no-DNS pointer-move               → deployment.md

## Deviations from the PRD                        [AC 3]
  Intro sentence citing PRD §1.5/§19 + decision record. Table with columns:
  PRD default | This project | Reason | Effect on the experience contract.
  Three rows (runtime, promotion mechanism, hostname/proxy). One sentence
  per row expanding the effect beyond the table where useful.

## Evidence status & go-live gates
  Live-exercised vs locally-proven vs production-pending; link to the
  production checklists in session-lifecycle.md, session-access.md,
  deployment.md. The stale-CNAME + entitlement operator actions named.

## Reusing this in another generated demo
  What an adopter changes: zone/hostnames in both wrangler configs,
  SESSION_REPOSITORY_URL, Access org + apps, secrets. ~8 lines.
```

## docs/demo-threat-model.md — section blueprint

```
# Demo environments — threat model

## The boundary, up front                          [AC 2: boundary, prominent]
  Box-quote style statement: sessions are for trusted / semi-trusted
  teammates only. An editor invitee can run arbitrary code in the
  container (terminal), read injected runtime secrets, and modify the
  worktree. Access controls who gets in; it does not sandbox what an
  invitee does inside. Never invite strangers; never inject owner agent
  credentials by default. Public demo ≠ session surfaces.

## Credential flow                                 [AC 2: credential flow]
  One flow diagram (operator / CI / teammate / CLI lanes) + table:
  credential | held by | enters | never appears in.
  Rows: operator wrangler auth; CI token (scopes); DEMO_SIGNING_KEY +
  DEMO_PASSCODE; SESSION_ACCESS_* bindings; SESSION_RUNTIME_SECRETS;
  teammate IdP login → Access assertion (stripped before container);
  owner SESSION_ACCESS_TOKEN; git: none (public HTTPS clone URL).

## Surfaces and their protections
  Table: demo.b28.dev (public, static+3 JSON APIs, passcode-gated
  backstage) · demo-session (Access preview app) · code-session (Access
  editor app; also /__session/* control API) · disabled alternate origins
  (workers.dev, version previews) · code-server --auth none = inside the
  boundary only.

## Trust zones
  anonymous internet < preview invitee < editor invitee < owner/operator
  < Cloudflare account authority — one line each on capability gained.

## Enforced invariants (implementation-backed)
  Bullets citing what code/config/tests guarantee: physically separate
  Workers; per-surface AUD + full JWT verification, fail-closed;
  credential stripping before container; no secrets in image/worktree/
  coordinator (dockerignore + explicit COPY + env-only injection);
  exact-value redaction; verified patch export before destroy; --force is
  the only bypass; control API identity-only (no shared bypass token).

## Residual risks and operator obligations
  Numbered, from dependency reviews: platform replacement before down;
  2 MiB patch cap; redaction knows only configured values; collaborator-
  written secrets land in the exported patch; terminals inherit env
  (restate); revocation is 3-step (policy + session revoke + IdP);
  concurrent promotes unguarded; JWKS availability = fail-closed outage;
  D1 schema outside version rollback.

## Explicit non-goals
  Untrusted-code hosting, multi-tenant isolation, fleet/GC/invitations
  (PRD Phases 3–5), secret isolation from an invited editor.

## Status
  Locally verified vs production-pending, same framing as the guide.
```

## Internal-interface notes

- Every section that delegates uses one canonical link form:
  `docs/knowledge/<file>.md` relative links (`knowledge/…` from `docs/`).
- Both docs open with an HTML comment: "journeys/trust contract live here;
  operational facts live in the linked runbooks — update there first."
- Hostname triple always in the same order (demo, demo-session,
  code-session) matching the existing docs' diagrams.
- The deviation table reuses the decision record's column semantics so the
  two tables stay diffable.

## Ordering of changes

1. `demo-environments.md` first (the threat model back-references its
   architecture section).
2. `demo-threat-model.md` second.
3. Cross-link check + markdown lint pass.
Each file is one atomic commit; artifacts committed per repo convention.
