# Progress — T-003-03-01 documented-agent-retrieval-seam

Implementation log. All five plan steps complete; committed incrementally.

## Completed steps

| Step | What | Commit |
|------|------|--------|
| 1 | Pure retrieval core `src/lib/backstage-retrieval.ts` | `feat(backstage): add pure agent-retrieval seam core` |
| 2 | Acceptance check `test/backstage-retrieval.test.mjs` + `package.json` test wiring | `test(backstage): prove byte-for-byte retrieval round-trip through the seam` |
| 3 | Thin route `src/pages/api/backstage/feed.ts` (`GET /api/backstage/feed`) | `feat(backstage): expose GET /api/backstage/feed retrieval route` |
| 4 | Repo-local CLI `scripts/backstage-feed.ts` + `backstage:feed` script | `feat(backstage): add repo-local backstage:feed retrieval CLI` |
| 5 | Committed seam doc `docs/knowledge/backstage-retrieval-seam.md` | `docs(backstage): document the agent retrieval seam` |

## Verification performed

- **`npm test` → 80/80 green** (my 10 retrieval cases included; baseline was 60, the
  concurrent T-003-02-01 thread added the rest).
- **`npx tsc --noEmit`** → only the two pre-existing `passcode.ts` `GateDecision` narrowing
  errors; my new files add **zero** errors. (The `entries.ts` error seen mid-run was the
  sibling thread's, since fixed by its own commit.)
- **`npm run build`** → succeeds; `/api/backstage/feed` emitted in the Worker
  (`dist/_worker.js/pages/api/backstage/feed.astro.mjs`) alongside `/api/backstage/entries`.
- **Live HTTP smoke** (`astro dev`, port 4399): no header → `401`, wrong → `403`, correct →
  `200` versioned empty feed.
- **Full two-way loop over real HTTP + local D1:** `POST /api/backstage/entries` (reference
  with newline/quotes/`café`/`😀`/percent-encoded URL, then a feedback) → `201`; then
  `GET /api/backstage/feed` and `npm run backstage:feed` → both entries returned **byte-for-byte**,
  oldest-first, in the envelope.

## Deviations from the plan

None material. One clarification vs. plan.md Step 2: the test's `read()` helper uses
key-presence (`'passcode' in opts`) rather than a defaulted parameter, because an explicit
`{ passcode: undefined }` would otherwise fall back to the valid passcode and mask the
missing-passcode (401) case. Caught and fixed during Step 2 before commit.

## Concurrency notes

The sibling ticket **T-003-02-01** (submit route) ran on the same branch at the same time and
created `src/pages/api/backstage/entries.ts`, `src/lib/backstage-submission.ts`, and
`test/backstage-route.test.mjs`. This ticket touched **none** of those. The only shared file
is `package.json`; each change was a targeted append (my test entry, my `backstage:feed`
script), staged path-by-path so no commit clobbered the other thread's edits. The distinct
route path/file (`feed.ts` vs `entries.ts`) is what kept the two parallel tickets
conflict-free — the DAG models them as independent siblings, so they must not share a file.

## Local dev note

`DEMO_PASSCODE` was added to the gitignored `.dev.vars` for the live smoke (it is otherwise
unset, which makes the gate fail closed with 500 in dev). Left in place so the backstage runs
locally; it is a local-only placeholder, never committed.
