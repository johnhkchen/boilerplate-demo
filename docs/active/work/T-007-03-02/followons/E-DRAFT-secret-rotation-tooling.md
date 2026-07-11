---
id: E-DRAFT-secret-rotation-tooling
title: guided-secret-rotation
status: draft
kind: permanent
advances: [P6, P3]
serves: >
  A new owner rotates every runtime credential out of the author's control in one
  guided, verified pass — Worker secrets and CI deployment authority — without any
  value ever printed, reused, or left on the author's account.
---

```
guided-secret-rotation   {2}{W}{U}
permanent — white, blue   (rarity: rare)
```

_Draft minted by T-007-03-02 from the S-007-02 owner-transfer drill gaps.
Un-promoted: promotion into `docs/active/epic/` (and a canonical id — suggested
E-009, non-binding) is Vend's `propose-epic` / a human's pull-decision._

## Intent — the bigger-picture play

The drill proved every secret is rotatable — production parsers accepted freshly
generated replacements for all eight named seams, and no non-rotatable author
coupling exists. What is missing is *tooling*: today the live install is a careful
manual six-step runbook (confirm authority → install App secrets → install Session
secrets → install CI authority → verify names → verify deployment) that is easy to
get subtly wrong (reuse a value, echo it into shell history, build from a tree still
carrying the prior owner's `.dev.vars`). This play builds a guided rotation that
generates new values in the recipient's control, installs them across both Workers
and GitHub Actions without echoing them, verifies presence by name and function, and
refuses to run against the author's account. Intent only; DecomposeEpic breaks this
into generation, installation, and verification.

## Value to the design

Turns the drill's manual rotation procedure into repeatable, hard-to-misuse tooling —
so "rotate every secret out of the author's control" (E-007's Done-looks-like) is a
guided command, not a checklist a new owner executes under pressure. Advances P6
(sovereignty includes credential control) and P3 (server-side keys never leak into
bundles, comments, or shell history during the handoff).

## Done looks like

A new owner runs one guided flow that, against their own authenticated Cloudflare +
GitHub, generates and installs all eight secrets, verifies each is present by name and
accepted by the production parser, and confirms zero author value is on the path — with
no secret value printed, passed as an argument, or committed, and a hard stop if the
target account/repo resolves to the author. The `.dev.vars` build-leak trap is
prevented structurally (build from the clean context), not just warned about.

## Context & constraints

No mandatory SaaS secret broker (N3/P7): a portable script driving `wrangler secret
put` and `gh secret set`, not a hosted rotation service. Cloudflare + GitHub surface
only (N2). Secrets never enter bundles, repos, comments, or chat (charter guardrail);
values are generated after the clean boundary is established and never compared against
retrieved author values. Right-sized (PE-7) to the eight named seams this template
declares.

## Seeds — the drill gaps this closes

- **Secrets deferred-live install.** `docs/active/work/T-007-02-02/rotation-run.md`
  §"Live installation under the real new owner" is the manual six-step procedure this
  epic automates; its rotation inventory lists the eight seams:
  `DEMO_SIGNING_KEY`, `DEMO_PASSCODE` (`wrangler.jsonc:secrets.required`),
  `SESSION_RUNTIME_SECRETS`, `SESSION_ACCESS_TEAM_DOMAIN`, `SESSION_ACCESS_PREVIEW_AUD`,
  `SESSION_ACCESS_EDITOR_AUD` (`wrangler.sessions.jsonc:secrets.required`), and
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (`.github/workflows/deploy.yml`).
- **"No non-rotatable secret" finding.** All eight expose a replacement seam — so this
  is pure tooling, not a runtime redesign (`rotation-run.md` §"Non-rotatable gaps").
- **G5, the `.dev.vars` build-leak operator rule.** Building from a tree with the
  prior owner's `.dev.vars` packages `dist/server/.dev.vars` and `leak:check` flags it
  (`rotation-run.md` §"Operational concern discovered"). The tool should make the
  clean-context build the only path.
