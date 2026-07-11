# Plan — T-007-02-04 verify-checks-under-new-owner

Ordered, independently-verifiable steps. Each ends with an observable and a commit.
Grounded in `structure.md`. Honest boundary: served-local new-owner stand-in; the
live deployed-URL re-run is the named deferred leg.

## Step 0 — Preconditions (verify, don't build)
- `git rev-parse --show-toplevel` == repo root; `scrub-fresh-owner.sh` present and
  executable; `rotate-fresh-owner.sh` present (pattern source).
- `npx wrangler whoami` → author account only (already confirmed) — fixes the
  deferred-live boundary.
- Pre-clear lingering dev state: `npx astro dev stop` (best-effort);
  `rm -rf .wrangler/state tests/support/.wrangler` for a clean-slate flow run.
- **Verify:** commands resolve; no lingering `astro.mjs dev` process on 4323/4324.

## Step 1 — Write `verify-checks.sh` (the driver)
Author the script per `structure.md`: arg parse, guards (incl. **lowercase**
owner-zone per F-1), trap cleanup, stages 1–8.
- **Verify:** `bash -n verify-checks.sh` (syntax) and `shellcheck` if available;
  `./verify-checks.sh --help`-style misinvocation returns exit 2.
- **Commit:** `docs(T-007-02-04): add new-owner checks driver`

## Step 2 — Stand up the context (stages 1–4), dry of checks
Run stages 1–4 alone first (temporarily short-circuit before stage 5) to confirm the
context builds green under the sanitized env before wiring the checks.
- **Verify:** `$CONTEXT` exists; `.git`/`.dev.vars`(author)/`.promote`/`.wrangler`
  absent post-scrub; config has the lowercase zone and owner repo, zero
  `NEW-OWNER-ZONE.example`/`b28.dev` route/var; `npm run build` exits 0 under
  `env -i`. Capture `evidence/0-context-build.txt`.
- No commit (scaffolding); folds into Step 4.

## Step 3 — Wire and run the four checks (stages 5–7)
Enable the check stages. Run the full driver end to end **with the agent env
stripped** (the `env -i` sanitize inside the script does this; if invoking manually,
also wrap the whole call to be safe):
```
env -u CLAUDECODE -u AI_AGENT -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_ENTRYPOINT \
    -u CLAUDE_CODE_EXECPATH -u CLAUDE_CODE_SESSION_ID -u CLAUDE_EFFORT \
    docs/active/work/T-007-02-04/verify-checks.sh
```
Legs and their pass observable:
- **integration:check** → `outcome: passed`, exit 0; report at
  `test-results/integration-report.json` (copied to evidence).
- **ops:check** → `boundary healthy`, exit 0, against the served context with the
  new-owner signing key.
- **leak:check** → `clean`, exit 0, over the context `dist` + served `/api/receipt`.
- **test:flow:backstage** → 1 passed (submit→retrieve), exit 0; Playwright json at
  `test-results/flow-report.json`.
- **Verify:** driver prints `PASS` and exits 0 **iff** all four are green. If any leg
  is red, capture the failing output and the seam — that is the row-7 `gap`, recorded,
  not retried into green.
- **Deviation rule:** if the daemonization artifact still appears after sanitizing,
  record that leg as **environment-deferred** with the exact outside-session command
  (per `transfer-signal.md:107`), distinct from a demo gap; do not report the whole row
  as pass without noting it.

## Step 4 — Capture evidence (stage 8)
Driver writes:
- `evidence/1-integration.txt`, `evidence/2-ops.txt`, `evidence/3-leak.txt`,
  `evidence/4-flow-backstage.txt` — redacted per-leg transcripts (secrets never
  printed; signing key redacted as the check scripts already do).
- `evidence/integration-report.json`, `evidence/flow-report.json` — machine reports.
- `evidence/checks-report.json` — the driver's own four-leg summary
  (`{check, command, outcome, exitCode}` + `mode: served-local-new-owner`).
- **Verify:** every leg has a transcript; `checks-report.json` outcome matches the
  driver exit code. Exact-secret spot-check: `grep` the evidence for the generated
  signing key/passcode → absent.
- **Commit:** `test(T-007-02-04): run demo checks against new-owner context` (script +
  evidence).

## Step 5 — Write `checks-run.md` (acceptance artifact)
Fill the seven sections from `structure.md` with the **actual** results: headline
verdict, re-run command, per-check table with evidence links, the served-local
boundary + deferred live leg, the author/fleet-absence proof, the gap ledger
(cross-linking the out-of-scope S-007-03 domain/DO gaps so they are not misread as
check failures), and the scorecard delta.
- **Verify:** every claim cites a command or evidence file; no bare verdict.
- **Commit:** `docs(T-007-02-04): record new-owner checks run`

## Step 6 — Move scorecard row 7
Edit `../T-007-02-01/transfer-signal.md` row 7 off `deferred` to the attempted
verdict (`pass` if all green; else `gap` with seam), and add an "After the
T-007-02-04 run" line to the baseline summary — same shape as the existing
"After the T-007-02-03 drill" note. Keep the live-URL leg named as `deferred`.
- **Verify:** row 7 cell states the verdict + evidence pointer; the deferred live leg
  still named.
- **Commit:** `docs(T-007-02-04): move checks scorecard row to verdict`

## Step 7 — Review
Write `review.md`: files changed, per-check coverage, test-coverage gaps, open
concerns (the environment daemonization caveat, the deferred live leg, the pre-existing
S-007-03 gaps that bound the drill), and what a human reviewer must check.
- **Verify:** `review.md` present, ~200 lines, honest about every red/deferred.
- **Commit:** `docs(T-007-02-04): review new-owner checks`

## Testing strategy
- **No new unit tests** — this ticket adds a drill script + docs, not product code
  (S-007-02 bars runtime rewrites). The "tests" here *are* the demo's own checks run
  against the new-owner context; their pass/fail **is** the acceptance signal.
- **Idempotence:** the driver rebuilds `$CONTEXT` fresh each run and traps cleanup;
  running it twice must yield the identical verdict (spot-check once).
- **Isolation proof:** the `env -i` boundary + local-only commands are the test that
  "author accounts are removed from the path"; asserted by the absence scan in
  `checks-run.md` §5.

## Rollback / safety
Nothing to roll back in the product tree — all writes are under
`docs/active/work/T-007-02-04/**` and a throwaway `$CONTEXT`. The trap removes the
private secret store, stops servers, and deletes `$CONTEXT/.wrangler` on any exit. No
`deploy`/`--remote` means no author-account state can change.
