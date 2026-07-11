# Review — T-007-02-03 transfer-resources-domain-data

Self-assessment and handoff. The ticket attempted the four owner-transfer
categories it owns (Repo, Cloudflare resources, Domain, Data) on the fresh-owner
context, and recorded each as clean or gap with the failing seam named.

## What changed

**Created — `docs/active/work/T-007-02-03/`:**
- `research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md`,
  `review.md` — the RDSPI trail.
- `transfer-drill.sh` — the re-runnable drill: scrub (via the T-007-02-01
  harness) → named owner fill-ins → per-category attempts → evidence. Exit 0 =
  drill complete (gaps are recorded outcomes); account-safe by construction (no
  `wrangler deploy` without `--dry-run`, no `--remote`, writes only to the drill
  dir + `evidence/`).
- `transfer-log.md` — **the acceptance artifact**: per-category verdicts, seams,
  owner fill-ins, and named metered live legs.
- `evidence/0…9-*.txt` — one uninterrupted final run's raw output.

**Modified:**
- `docs/active/work/T-007-02-01/transfer-signal.md` — scorecard rows **1–4**
  moved per that file's own protocol (table cells, detail-paragraph annotations,
  a scoped post-drill note). Rows 5–7 (T-007-02-02 / T-007-02-04) untouched.

**Deleted:** nothing. **Runtime untouched:** no file under `src/`, `test/`,
`tests/`, `scripts/`, `migrations/`, or either wrangler config changed — the
story's untouched-runtime guarantee holds (`git status` verified during the run).

## Outcomes (the headline)

| Category | Verdict | Seam / live leg |
|----------|---------|-----------------|
| 1 Repo | clean (local drill) | live: real GitHub repo + `SESSION_REPOSITORY_URL` |
| 2 Resources | clean locally; live deploy deferred | no second CF account on this machine |
| 3 Domain | **gap** | `test/promote.test.mjs:246` hardcodes `demo.b28.dev` → re-pointed tree fails its own `npm test` |
| 4 Data | **gap** (DO) / clean (D1) | `SESSION_COORDINATOR` DO storage has no export/import seam |

Acceptance criterion coverage: the Worker + D1 storage + moved rows **ran and
served** under the new-owner context (stage 6: `wrangler dev`, HTTP 200,
`/api/backstage/feed` returned both moved rows under the fresh passcode, at a
host off `b28.dev`), within the story's pre-authorized scrubbed-simulation
boundary — no second Cloudflare account exists here, so every live leg is a
named metered step, never faked. Every category is recorded clean or gap with
the exact seam. Note: the ticket's "KV/DO storage" wording — the repo has no KV;
the real surface (D1 + DO) is recorded explicitly in the log.

## Secondary findings worth board signals (S-007-03)

1. **F-1**: the harness placeholder `NEW-OWNER-ZONE.example` fails the runtime's
   lowercase-only `DNS_NAME` validation (`session-lifecycle.ts:94`) — a
   lowercase placeholder would be equally loud *and* runnable.
2. Unscoped `d1 export --no-schema` collides with applied migrations on import
   (`d1_migrations` bookkeeping rows); `--table backstage_entries` is required.
3. `deploy:dry` passes **without** `database_id` — the auto-provision contract
   the config comment promises holds at validation level (good news, verified).
4. A local `file://` repo stand-in is barred by `parseSessionConfig`'s
   HTTPS-only rule — repo handoff can only be finished against a real remote.

## Test coverage

No product code changed → no new unit tests (per plan). The drill script carries
its own assertions (coupling greps, round-trip diff, row-count and feed-content
checks, expected-throw and expected-test-failure probes) and hard-fails on
structural breakage; a reviewer reproduces every verdict with one command from
the repo root. Product suites were used as *observables*: `test/promote.test.mjs`
ran in the context (19 pass / 1 fail — the fail **is** the recorded domain gap).
**Gap in coverage (deliberate):** the full check trio + Playwright flow against
the transferred context is T-007-02-04's row, not duplicated here; the container
image build was a named scope cut (config contract covered by
`session:validate`).

## Open concerns

1. **The domain gap blocks a green `npm run verify` for any re-pointed owner**
   — `test/promote.test.mjs:246` couples the test suite to the author zone.
   T-007-02-04 will hit it; the durable fix (derive the expectation from config,
   or a flow-contract constant, same shape as T-006-02-01 finding #3) belongs to
   the gap-list epic, not a drive-by edit here.
2. **DO session state is untransferable today.** Real handoffs lose in-flight
   session state (one small re-creatable `SessionRecord`, so severity is low,
   but the seam is real and now named).
3. **Scorecard concurrency**: T-007-02-02 edits rows 5–6 of the same file in a
   parallel thread. My edits were confined to rows/paragraphs 1–4 + one
   additive note; Lisa's commit serialization should merge cleanly, but a human
   should eyeball the final scorecard once both tickets land.
4. **The drill's second run in-session emitted npm `allow-scripts` warnings**
   (environment posture, known from T-006-02-01 finding #7); build and wrangler
   still worked. On a stricter machine the drill's stage 3 could stall on
   postinstall approval — the script would fail loudly, not falsely pass.

## Critical items for a human

- Decide when to spend the metered legs: a real second Cloudflare account +
  zone (rows 2/3 live halves) — everything local that could be proven has been.
- Confirm the scorecard merge after the parallel tickets land (concern 3).
