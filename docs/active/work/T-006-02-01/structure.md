# Structure — T-006-02-01 clean-copy-rehearsal-run

The blueprint: what gets created, where, and the boundaries between the
rehearsal-evidence tree (in this repo) and the clean-copy working tree (outside
it). No code here — the shape of the work.

## Two trees, one guarantee

```
this repo (boilerplate-demo/)                 clean copy (scratchpad/cleancopy/)
├── docs/active/work/T-006-02-01/   <── all   ├── src/**           <── slice edits
│   ├── research.md                  evidence  │   ├── lib/parcel.ts        (new)
│   ├── design.md                    lands     │   ├── pages/api/parcel.ts  (new/replace)
│   ├── structure.md                 HERE      │   └── pages/index.astro    (renamed slots)
│   ├── plan.md                                ├── tests/support/flow-contract.ts (renamed)
│   ├── rehearsal-log.md   ◄─ the deliverable  ├── docs/knowledge/**   (kept, read-only ref)
│   ├── progress.md                            ├── docs/active/**      (DELETED — no planning)
│   └── review.md                              ├── .git/              (ABSENT — no history)
└── src/**   ← UNTOUCHED (story guarantee)     └── test/fixtures/sponsor-packet/ (the input)
```

**Invariant:** nothing under this repo's `src/**` changes. The rehearsal log
records the `git status`/`git diff --stat` of this repo's `src/` as proof
(expected: empty). All slice code is written in the clean copy.

## Evidence artifacts (this repo) — files created

Under `docs/active/work/T-006-02-01/`:

- `research.md` — done (terrain map).
- `design.md` — done (decisions).
- `structure.md` — this file.
- `plan.md` — ordered steps + check strategy.
- `rehearsal-log.md` — **the acceptance deliverable.** Structure below.
- `progress.md` — Implement-phase running log of what ran, deviations.
- `review.md` — handoff self-assessment.

Optional captured evidence (referenced from the log, kept small):

- `evidence/integration-report.json` — copy of the clean copy's
  `test-results/integration-report.json` after Step 8.
- `evidence/*.txt` — trimmed stdout of the key commands (install, fault modes,
  verify, ops:check) so the log's quoted lines are traceable.

## `rehearsal-log.md` — section shape

The log is written to satisfy each clause of the acceptance criterion in order,
so a reviewer can check it off:

1. **Header** — what was rehearsed, when (date from session), against which
   fixture, the clean-copy location, and the honest boundary (agent-run, local
   surface for the deploy legs per Design Decision 2).
2. **Clean-copy creation** — the exact commands that built the copy, the proof
   it has no history (`git status` → not a repo) and no `docs/active/**`, and the
   install result. Satisfies clause 1.
3. **Step-by-step execution table** — one row per playbook unit (Before-event +
   Steps 1–12), each with: what the playbook said, what was run, the observed
   result (quoted), and a verdict (`answered` / `answered with friction` /
   `could not answer`). Satisfies clause 2.
4. **Vertical slice at its URL** — the core moment observed working: the labeled
   "Track my parcel" action returning `FW-2417-DEMO`'s latest scan with checksum
   verified, and the named-failure paths (broken/stalled/404). URL recorded as
   the **local** surface with the public-surface leg explicitly deferred (Design
   Decision 2). Satisfies clause 3 (with the honest boundary noted).
5. **Checks green under budget** — quoted pass lines and elapsed-vs-budget for
   `integration:check` (45 s), the flow budgets (20 s/test), and `ops:check`.
   Satisfies clause 4.
6. **Verbatim leftovers + steps the playbook could not answer** — the bulleted,
   quotable list. Satisfies clause 5; this is what T-006-02-02 consumes.

## Clean-copy slice — files and boundaries

Mirrors the receipt exemplar's shape (Research). In the clean copy's `src/`:

- **`src/lib/parcel.ts` (new)** — the stub client + verifier. Public surface:
  - `BOUNDARY_NAME` constant (e.g. `'parcel-status'`), paralleling
    `receipt.ts`'s `BOUNDARY_NAME`.
  - `PARCELS` deterministic sample data from the api-doc (FW-2417-DEMO's three
    scans; FW-0000-VOID → not present).
  - `computeChecksum(parcelId, scannedAt, event)` — lowercase hex SHA-256 of
    `parcelId + ":" + scannedAt + ":" + event` per the doc's rule.
  - `fetchParcel(parcelId, token, {signal, slow?})` — the stub boundary:
    rejects blank token (401 `missing_token`), unknown parcel (404
    `unknown_parcel`), returns latest scan + checksum for known; honors the
    abort signal and can reproduce the slow case. No network — deterministic.
  - `verifyParcel(payload)` — recompute checksum, throw on mismatch (the
    "corrupt, treat as failure" rule).
  - Knows nothing about Astro/HTTP — pure lib, like `receipt.ts`.
- **`src/pages/api/parcel.ts` (new, replacing the receipt route's role)** — the
  ONE server boundary, `prerender = false`. Reads a token from env (the temp
  credential, routed via `.dev.vars` per Step 2 — never bundled), calls
  `fetchParcel` **behind `runOperation({name, timeBudgetMs, invoke})`**, honors
  `DEMO_FAULT=broken|stalled` (broken = corrupt checksum; stalled = never
  answer until abort) so Step 6's fault demonstration still works, returns the
  verified scan as JSON. Mirrors `receipt.ts` control flow.
- **`src/pages/index.astro` (modified)** — `DEMO_NAME` → the parcel demo name
  (e.g. `'Fernway Parcel'`), `PRIMARY_ACTION_LABEL` → `'Track my parcel'`; the
  live card fetches `/api/parcel`, narrates status via the existing `aria-live`
  region, renders location/time/event instead of issued/nonce/signature. Backstage
  section unchanged.
- **`tests/support/flow-contract.ts` (modified)** — `PRIMARY_ACTION_NAME` →
  `'Track my parcel'` in the **same change** as the index rename (Step 5's
  one-change rule; otherwise `test:flow` fails on the named activation step —
  which the log will demonstrate deliberately, then fix).

**Ordering that matters:**

1. Clean copy created + installed **before** any step.
2. Rename (Step 5) is one atomic change across `index.astro` +
   `flow-contract.ts`. The log captures the *deliberate* red when only one side
   is renamed, to show the contract enforcing itself, then the green.
3. Fault legibility (Step 6) is proven **before** the real slice wiring (Step 7),
   per the playbook order.
4. Slice built (Step 7) **before** the gates (Steps 8–9).
5. Deploy-dependent legs (Step 4 publish, Step 10 live checks) run to the
   boundary and are recorded as deferred (Design Decision 2) — the local
   equivalents run in their place and are labeled as such.

## What is explicitly NOT created

- No new GitHub remote, no published Cloudflare Worker, no provisioned D1, no
  set secrets, no custom-domain claim (Design Decision 2).
- No new demand signals or playbook edits — that is T-006-02-02's job; this
  ticket only *records* the leftovers.
- No changes to this repo's `src/**`, `wrangler.jsonc`, or harness scripts.
- No new provider abstractions beyond the single parcel stub (charter N5;
  fixture's "no second provider").
