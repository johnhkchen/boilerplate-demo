# Progress — T-004-04-02 secrets-and-uncommitted-work-safety

## State

- Phase: Implement
- Started: 2026-07-10 America/Los_Angeles
- Design: Worker-secret JSON launch map plus verified client-side binary Git patch handoff
- Ticket frontmatter: intentionally untouched

## Pre-existing shared-worktree changes

The following were present before this ticket's implementation and are not owned here:

- `.lisa/provenance.jsonl`
- `docs/active/demand.md`
- untracked E-004 epic/story/ticket material
- work artifacts for other T-004 tickets
- `docs/knowledge/demo-environments-decisions.md`

Only explicit ticket files will be staged for commits.

## Checklist

- [x] Read repository and workflow instructions.
- [x] Complete `research.md`.
- [x] Complete `design.md`.
- [x] Complete `structure.md`.
- [x] Complete `plan.md`.
- [x] Add and test pure runtime-secret contracts.
- [x] Inject launch secrets into managed services.
- [x] Redact secret values from logs/errors/API/CLI.
- [x] Add and test typed teardown preservation contracts.
- [x] Implement coordinator patch export/digest acknowledgement.
- [x] Implement CLI patch persistence and explicit force path.
- [x] Regenerate Sessions Worker bindings.
- [x] Prove patch recovery with a local Git fixture.
- [x] Update durable lifecycle documentation.
- [x] Run full validation.
- [x] Complete `review.md`.

## Validation

| Command/check | Result |
|---|---|
| instruction/ticket read | complete |
| initial worktree isolation | complete; unrelated changes recorded above |
| targeted lifecycle tests | 26/26 pass after Worker/CLI safety implementation |
| full `npm test` | 146/146 pass in final shared-worktree run; 27 session safety/lifecycle tests pass |
| `npm run session:validate` | pass; types current, TypeScript clean, Worker/image dry run succeeds |
| `npm run typecheck` | pass; Astro 51 files, zero diagnostics; App Worker types current |
| `npm run deploy:dry` | pass; stable App Worker build/upload dry run only |
| Git patch recovery fixture | 1/1 pass; tracked/untracked/deleted/binary/mode changes recover to identical Git tree |
| `git diff --check` | pass |

## Deviations

- Final Cloudflare/DO safety review identified a save race between digest comparison and
  destruction. The coordinator now stops the two managed services before its final patch
  inspection. A mismatched digest retains the container and records a failed phase so stopped
  service state is not reported as ready.

## Commit ledger

- `1034245` — RDSPI blueprint artifacts.
- `6506457` — pure secret and teardown contracts.
- `7dcafd8` — launch injection, redaction, and verified teardown implementation.
- `8219149` — recovery fixture and durable operations documentation.
- `e07939f` — final teardown-race hardening (shared-file commit also captured concurrent
  `T-004-04-01` access-proxy hunks already present in `src/session-worker.ts`).
- Pending: final Review artifact commit.
