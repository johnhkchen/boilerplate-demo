# T-006-01-01 — author-assembly-playbook — Review

Handoff for the human reviewer. Docs-only ticket; two content commits.

## What changed

| Action | Path | Commit |
|---|---|---|
| Created | `docs/knowledge/assembly-playbook.md` (1,619 words) | `852be15` |
| Created | `docs/active/work/T-006-01-01/{research,design,structure,plan}.md` | `1039d28` |
| Created | `docs/active/work/T-006-01-01/{progress,review}.md` | (this commit) |

Nothing modified or deleted. No `src/**`, `scripts/**`, `test/**`,
`tests/**`, or `package.json` changes — matching the story's "no src
changes, no new scripts or tooling" boundary. The ticket file's own
frontmatter modification (present before this session) was left unstaged
for Lisa.

## The deliverable in brief

`docs/knowledge/assembly-playbook.md` is the ordered Day-1 play in four
beats — Intake (steps 1–3), Prove (4–7), Check (8–10), Defer (11–12) — plus
a preflight section, a mandatory observational Exit gate, and a boundaries
section. It composes the seven source docs (charter, product-spec,
vend-workflow, rdspi-workflow, deployment, integration-check,
backstage-retrieval-seam) strictly by reference via per-beat "Depth:"
pointers.

## Acceptance criteria — evidence

1. **File exists** — yes, committed.
2. **Every check/script/seam resolves to a real repo path** — mechanically
   verified (transcript summarized in progress.md): 16/16 paths `test -e`,
   11/11 npm scripts in `package.json`, 7/7 env/binding names grep in the
   codebase, plus literal contract strings (`PRIMARY_ACTION_NAME`, template
   slots, fault evidence text).
3. **Exit condition** — the Exit gate requires the core moment *observed*
   under the harness budgets (integration:check 45 s; `FLOW_BUDGET_MS`
   flows, healthy and stalled; live-hostname ops check; live backstage
   round-trip) **and** every deferral converted to a one-line signal on
   `docs/active/demand.md`; it explicitly names "plausible-looking code /
   checks you did not run / localhost-only" as non-exits.
4. **One-sitting read** — 1,619 words, well under the ~2,500 ceiling.

## Test coverage and gaps

- Verification was mechanical (path/script/env greps + word count), which
  is what a docs-only deliverable admits. `npm run verify` was **not** run:
  no runtime surface changed, so it would only re-prove the pre-existing
  tree.
- **Not covered — by design:** the playbook has not been executed. The live
  dry run is S-006-02; the fixture that exercises the intake contract is
  T-006-01-02. Until those land, the playbook is authored-and-verified, not
  rehearsed — the story's "honest boundary" says exactly this.

## Open concerns for the reviewer

1. **The intake class names are now a contract.** Step 1's six classes
   (`sponsor-site`, `api-docs`, `code-examples`, `design-brief`, `sdk`,
   `credentials`) are what T-006-01-02 must mirror one directory per class.
   If you want different names, change them *before* the fixture ticket
   starts — that ordering is the whole reason this ticket ran first.
2. **The fixture path is deliberately not named.** The draft referenced
   `test/fixtures/sponsor-packet/`; since it doesn't exist yet, a strict
   grep-verification of the merged playbook would fail. It now says "its own
   ticket, landing behind this doc". T-006-01-02 may restore the literal
   path once the directory exists — a one-line follow-up worth remembering.
3. **Board-ID references in shipped knowledge.** The boundaries section
   names S-006-02, matching sibling precedent (deployment.md names E-004).
   If the template-leak guardrail is later tightened to strip board IDs from
   generated projects, this doc has exactly one such reference to clean.
4. **Two budget numbers are inlined** (45 s gate, 20 s per test) with the
   owning files named (`scripts/integration-check.ts`,
   `tests/support/flow-contract.ts`). If those constants change, the
   playbook needs the same one-line touch — accepted rot risk per design
   D7/"Rejected details".
5. **Hostname placeholder.** Step 10 uses `https://<your-demo-hostname>/`
   rather than `demo.b28.dev` because generated projects will have their
   own hostname; deployment.md keeps the concrete example. Flagging in case
   you prefer the concrete hostname here too.

## Nothing critical

No security-relevant content was added: the playbook repeats (and routes
through) the existing secret-handling rules; no credentials, tokens, or
provider endpoints appear in it or in these artifacts.
