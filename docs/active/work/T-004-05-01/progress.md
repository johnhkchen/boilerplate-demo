# T-004-05-01 — Progress

## Plan checklist

- [x] Step 1 — commit RDSPI blueprint artifacts (`339ad77`)
- [x] Step 2 — write docs/demo-environments.md (`9e7ea8e`, 203 lines)
- [x] Step 3 — write docs/demo-threat-model.md (`0c03232`, 160 lines)
- [x] Step 4 — cross-check pass (no fixes required; evidence below)
- [x] Step 5 — progress.md maintained (this file)
- [x] Step 6 — review.md (final commit with this file)

## Log

- Research/Design/Structure/Plan artifacts authored in one continuous pass;
  sources: decision record, four knowledge runbooks, dependency reviews
  (T-004-02-02, T-004-04-01, T-004-04-02), source tree spot-checks.
- Staging path-scoped to this ticket's files throughout; the shared branch
  carries other tickets' uncommitted board files, untouched.

## Cross-check evidence (Step 4)

- **Commands:** every `npm run …` in both docs (`deploy`, `promote`,
  `rollback`, `session`, `session:image:check`) exists in `package.json`
  scripts.
- **Links:** all 7 distinct relative links resolve
  (`knowledge/{deployment,session-image,session-lifecycle,session-access,
  demo-environments-decisions}.md`, plus the two docs cross-linking).
- **Hostnames/flags vs configs:** `demo.b28.dev` custom domain in
  `wrangler.jsonc` (public Worker keeps `workers_dev: true` as the health
  probe — stated in the threat model surface table);
  `demo-session.b28.dev` + `code-session.b28.dev` custom domains,
  `workers_dev: false`, `preview_urls: false`, four required secrets, and
  `SessionCoordinator` DO in `wrangler.sessions.jsonc` — all as documented.
- **Deviation table:** three rows semantically identical to
  `docs/knowledge/demo-environments-decisions.md` (editorial rewording
  only).
- **Hygiene:** `git diff --check` clean. No code gates consume `docs/`, so
  the full test suite was not run for a docs-only change (per plan).
- **Sensitive values:** no team domain, AUD tag, account ID, secret value,
  or personal email appears in either doc.

## Acceptance-criteria mapping

| AC clause | Where satisfied |
|---|---|
| demo-environments.md covers one-time operator setup | `## One-time operator setup` (7 ordered steps, runbook-linked) |
| …architecture | `## What's here (architecture)` |
| …teammate zero-install path, separately | `## The teammate path — nothing to install` (standalone, addressed to the teammate) |
| threat model states trusted/semi-trusted boundary prominently | `## The boundary, up front` — first section, block-quoted |
| …credential flow prominently | `## Credential flow` — second section, diagram + 8-row table |
| all three PRD deviations with reasons and experience-contract effects | `## Deviations from the PRD` — 3-row table with both columns, plus consequence notes |

## Deviations from plan

- None. The conditional Step 4 fix commit was not needed.
