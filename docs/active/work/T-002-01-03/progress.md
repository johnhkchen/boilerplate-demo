# Progress — T-002-01-03 exemplar-boundary-ops-check

Implementation log. Follows `plan.md`. Baseline captured before any edit.

## Baseline (pre-change)

- `npm test` → **4 passing**, exit 0 (`operation-runner.test.mjs`).
- Working tree: T-001/T-002 work already on disk; `src/lib/operation-runner.ts`,
  `src/lib/receipt.ts`, `src/pages/api/receipt.ts` present. `.dev.vars` holds the
  local `DEMO_SIGNING_KEY`.
- Node `v26.4.0` — native TS type stripping available (`--experimental-strip-types`).
- Shared branch with sibling Lisa threads; stage files explicitly, commit one unit
  at a time, touch only this ticket's files.

## Planned units

1. progress log + baseline (this file)
2. `src/lib/ops-check.ts` — pure core
3. `test/ops-check.test.mjs` + widen `package.json` `test`
4. `scripts/ops-check.ts` + `ops:check` npm script
5. live verification (astro dev up / down)
6. regression (`build`, `dist/` grep) + diff hygiene

## Log

### Unit 1 — implementation log
Created this file. Ticket frontmatter untouched (Lisa owns phase transitions).
