# Structure — T-006-02-02 deferral-signals-and-playbook-revision

The blueprint: which files change, in what shape, in what order. All changes
are documentation/board files; no module or interface boundaries move.

## File inventory

### Created — rehearsal project (the clean copy, outside this repo)

```
<cleancopy>/docs/active/demand.md        # minted board, 11 signals
```

`<cleancopy>` = `/private/tmp/claude-501/-Users-johnchen-swe-repos-boilerplate-demo/3299e229-5e22-4d03-bd5d-ed37d572da11/scratchpad/cleancopy`

Shape: the source board's header doctrine (title, "thin demand signals" intro,
horizontal rule) with a one-line provenance note naming the rehearsal
(S-006-02 / T-006-02-01, 2026-07-11), then 11 numbered one-line signals in
board shape (**bold what** — why it might matter), same order and numbering as
the rehearsal log's leftover list. No template signals, no epics, no tags
beyond the line itself (the log's `[playbook]`/`[E-002]` tags are routing hints
for *this* repo, kept in lowercase parenthetical form only where the "why"
needs them).

### Created — this repo, work artifacts

```
docs/active/work/T-006-02-02/research.md                        (done)
docs/active/work/T-006-02-02/design.md                          (done)
docs/active/work/T-006-02-02/structure.md                       (this file)
docs/active/work/T-006-02-02/plan.md
docs/active/work/T-006-02-02/progress.md
docs/active/work/T-006-02-02/review.md
docs/active/work/T-006-02-02/evidence/cleancopy-docs-listing.txt
docs/active/work/T-006-02-02/evidence/cleancopy-demand.md
```

- `cleancopy-docs-listing.txt`: output of a recursive listing of
  `<cleancopy>/docs/` (directories + files), prefaced by the exact command,
  demonstrating clause (c): `knowledge/assembly-playbook.md` present;
  `active/` contains exactly `demand.md`; no `epic/`, `stories/`, `tickets/`,
  `work/`, `pm/`.
- `cleancopy-demand.md`: verbatim copy of the minted board (durable record of
  clause (a), since the clean copy is tmp-storage).

### Modified — this repo

```
docs/knowledge/assembly-playbook.md      # the revision diff (clause b)
docs/active/demand.md                    # +4 template signals (story boundary)
```

### Deleted / explicitly untouched

Nothing deleted. Untouched by contract: `src/**`, `scripts/**`, `tests/**`,
`wrangler.jsonc`, `test/fixtures/sponsor-packet/**` (class names unchanged ⇒
fixture contract unbroken), the clean copy's `docs/knowledge/**` (rehearsed
version preserved), ticket/story frontmatter, `.lisa/provenance.jsonl`,
`docs/archive/**`.

## Playbook edit map (anchor → change)

Ordered as they appear in the doc; each keyed to the friction it answers.

1. **Before the event, dependencies bullet** (#7): append one sentence — if the
   environment blocks npm postinstall scripts, approve `workerd`/`sharp`/
   `esbuild` (else `wrangler` may not start).
2. **Before the event, board bullet** (#6): after the existing `lisa init` /
   `vend init` sentence, add — a project that is a *copy* rather than generated
   must create `docs/active/demand.md` itself (Beat 4 needs somewhere to
   write).
3. **Before the event, deploy-bootstrap bullet + Step 4** (#2): add the deploy-
   identity warning — `wrangler.jsonc`'s worker name, route, and D1 id are
   *this project's* production identity; only a freshly generated project may
   run `npm run deploy` as-is; a copy must rename the Worker, provision its own
   D1, and take a `*.workers.dev` host first — or not deploy. Tooling for
   collision-free copies: deferred, on the board.
4. **Step 2** (#1): after the `.dev.vars` sentence, add the declaration rule —
   a *new* credential must also be declared in `wrangler.jsonc`
   (`secrets.required`); `.dev.vars` only supplies values for declared
   bindings, and workerd silently drops undeclared keys (symptom:
   `boundary_misconfigured`). Prod: `npx wrangler secret put <NAME>`.
5. **Step 3** (Step-3 minor friction): one sentence — a sponsor packet that
   already ships the intake statement substitutes for authoring one; verify it
   against the six classes rather than re-deriving it.
6. **Step 5** (#3): extend the rename set with the fourth target — the heading
   literal in `tests/demo-flow.spec.ts` (asserted by role/name, not sourced
   from the contract); note centralizing it is on the board.
7. **Beat 3 preamble** (#5): one short paragraph — the session-pressure caveat:
   under a coding-agent session Astro daemonizes `astro dev`; stale servers
   with per-run keys answer probes and the checks lie in every mode. Stop
   daemons (`npx astro dev stop`) and strip agent markers (or use a clean
   shell) before trusting red or green. Harness-side neutralization: deferred,
   on the board.
8. **Step 7 → Step 8 seam warning** (#4): at the end of Step 7 (or opening
   Step 8 — decide at edit time by which reads better in one sitting), the
   honest deferral — the shipped checks are bound to the receipt exemplar
   (`integration-check.ts` probes `/api/receipt`; `ops-check.ts` asserts the
   receipt shape; `leak:check` guards `DEMO_SIGNING_KEY`): after replacing the
   slice, rewire those three to your boundary or Step 8 validates the wrong
   thing; config-driven harness deferred, on the board.
9. **"What this play is not," last bullet** (staleness): rewrite — the fixture
   dry run happened (S-006-02, 2026-07-11) and its frictions are folded in;
   what remains unrehearsed is the live-sponsor, public-deploy run.

Constraint: every edit is additive sentences/short paragraphs inside existing
sections; no renumbering of steps; no new top-level sections; net growth kept
modest (~25–35 lines on a 239-line doc) so "readable in one sitting" holds.

## Demand-board edit map (this repo)

`docs/active/demand.md`: append signals 5–8 after existing signal 4, one line
each, same typographic shape (**bold what** — why it might matter):

5. Boundary-agnostic integration harness (checks follow the replaced slice
   from config instead of hardcoding receipt path/shape/secret/heading).
6. Collision-free go-public for copied projects (deploy identity baked into
   `wrangler.jsonc`; rename-and-provision or generation automation).
7. Agent-proof check environment (neutralize all coding-agent markers, not
   just `CODEX_THREAD_ID`; Astro dev daemonization falsifies checks).
8. Failure-status carry-through at the seam (`operation-runner` collapses
   upstream statuses to `operation|timeout`).

No edits to the header or existing signals 1–4.

## Ordering of changes

1. Mint the clean copy's `demand.md` (clause a) — independent of the diff.
2. Capture evidence: listing + board copy into `evidence/` (clause c) — after
   (1) so the listing shows the final state.
3. Revise `docs/knowledge/assembly-playbook.md` (clause b).
4. Append the 4 signals to this repo's `docs/active/demand.md`.
5. Write `progress.md`; commit in three scoped commits (playbook / board /
   work artifacts+evidence).
6. Write `review.md`; amend nothing afterward.

(1)–(2) before (3)–(4) so the evidence listing cannot be contaminated by any
later mistake in this repo; (3) before (4) so the board lines can echo the
playbook's final deferral wording.

## Verification hooks (used by Plan)

- Clause a: `grep -c '^[0-9]\+\.' <cleancopy>/docs/active/demand.md` → 11.
- Clause b: a reviewer can walk rehearsal-log frictions #1–#7 (+ Step-3 minor,
  + staleness) against `git diff docs/knowledge/assembly-playbook.md` and find
  each either answered in-line or deferred with its board signal named.
- Clause c: the committed listing shows `assembly-playbook.md` and shows
  `docs/active/` == `{demand.md}`; independently re-runnable while the copy
  exists.
- Repo hygiene: `git status --porcelain src scripts tests wrangler.jsonc` empty;
  staged paths limited to the inventory above.
