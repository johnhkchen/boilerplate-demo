# Progress — T-007-02-02 rotate-secrets-and-config

## Status: implementation and regression verification complete; Review pending

Research, Design, Structure, Plan, implementation, the corrected performed run,
adversarial verifier checks, and evidence generation are complete.

## Phase artifacts

- `research.md`: inventory and runtime/config/check map.
- `design.md`: selected disposable redacted rehearsal; live stores honest-deferred.
- `structure.md`: ticket-scoped file/interface blueprint.
- `plan.md`: ordered implementation, test, commit, and review sequence.

Committed as `47c5571` (`docs(T-007-02-02): design owner rotation drill`).

## Implementation unit 1 — verifier and orchestrator

Created `verify-rotation.ts`:

- exact two-App/four-Sessions/two-CI inventory;
- string-safe JSONC parsing;
- workflow destination checks;
- new-owner config/route assertions;
- clean-source forbidden-path assertions;
- production `parseRuntimeSecrets`, `parseAccessConfig`, and `guardPasscode`
  calls;
- active author-marker scan;
- exact eight-value + nested API-key scan;
- short fingerprints and redacted JSON report;
- named `deferred-live` stores and non-rotatable gap list.

Created `rotate-fresh-owner.sh`:

- invokes T-007-02-01 clean-context harness;
- substitutes scratch-only owner configuration;
- creates/trap-deletes a private mode-0600 secret set;
- generates all eight values independently;
- runs validation and functional checks;
- emits redacted evidence and exact-value results;
- performs no external mutation.

Committed as `fee2c34` (`test(T-007-02-02): add redacted rotation rehearsal`).

## Documented Structure deviation

Before implementation, changed verifier secret input from eight inherited
environment values to one mode-0600 temporary file path. This narrows accidental
child-process propagation and follows the secure file/stdin boundary. Only the
generated signing key is placed in the environment of the two checks that need
it; it is unset immediately afterward.

## First run — superseded after a real leak finding

The initial implementation invoked `npm run integration:check` from the source
root. It passed, but its build transcript said it loaded `.dev.vars`. Inspection
was limited to path and file size—no value was read—and showed
`dist/server/.dev.vars` existed. That invalidated the author-secret provenance
claim even though the generated-key leak check was green.

The next attempt moved integration into the scrubbed context but passed the
generated signing key in build environment. The existing leak check then failed
honestly:

```text
secret reached 1 browser surface
client asset: server/.dev.vars
```

This was not suppressed. The implementation was corrected before accepting
evidence:

- build happens in the clean context with no App secret in build environment;
- runtime receives generated values through a private external Wrangler config;
- existing ops/flow/leak commands run against that runtime;
- the process environment is allowlisted with `env -i`;
- scratch build output, not source-root `dist`, is scanned;
- source-root `dist` produced by the superseded attempt was removed.

This is the main implementation deviation from using the aggregate integration
runner. The aggregate runner cannot accept an operator-selected signing key
without exposing it to its build child. The corrected orchestration reuses the
same existing commands individually and emits a normalized summary.

## Final performed runs

The corrected full script ran successfully twice (idempotence/repeatability):

- fresh-owner harness: pass;
- config substitution: pass;
- all eight generated in private store: pass;
- inventory + production parsers + passcode gate: pass;
- clean build: pass (expected warnings that App secrets are absent at build);
- generated-key receipt operation: pass, signature verified;
- healthy Playwright flow: 1 passed, 1 deliberately skipped stalled case;
- leak check: pass, 23 client assets + 1 response body;
- exact-value scan: all eight names + nested API key clean;
- server stopped and private temp dirs absent after run;
- non-rotatable gaps: none;
- Cloudflare/GitHub installation: named `deferred-live`.

The corrected transcript/report files supersede all prior evidence.

## Adversarial verifier checks

Executed against disposable copies and fixture-only values:

1. Complete rotated context: accepted.
2. Restored `demo.b28.dev` route: rejected with `App custom-domain route` seam.
3. Removed `DEMO_PASSCODE` declaration: rejected with App inventory mismatch.
4. Wrote nested runtime API-key fixture into `scripts/`: scan failed with
   `SESSION_RUNTIME_SECRETS.NEW_OWNER_DEMO_API_KEY` and path.
5. Reused preview audience as editor audience: production Access parser failed
   closed with the distinct-audience error.

All disposable fixtures/temp secrets were trap-deleted and no raw generated run
value was persisted.

## Evidence produced

- `evidence/rotation-report.json` — pass, eight distinct fingerprints, config
  outcome, contract results, empty exact-value findings, two deferred-live stores,
  empty non-rotatable gaps.
- `evidence/integration-report.json` — operation/flow/leak all pass.
- `evidence/rotation-run.txt` — corrected redacted transcript.
- `evidence/author-marker-scan.txt` — six active markers absent.
- `evidence/exact-secret-scan.txt` — eight values + nested API key clean.
- `rotation-run.md` — rerun procedure, result, secure live appendix, gap ledger.

## Regression verification

- `npm test`: pass — 152 tests, 0 failures, 0 skipped at the Node test-runner
  level.
- `npm run typecheck`: pass — Astro checked 56 files with 0 errors/warnings/hints;
  TypeScript passed; Wrangler 4.110.0 confirmed generated App Worker types are
  current.
- `npm run deploy:dry`: pass under an allowlisted environment and isolated
  Wrangler config, so the developer `.dev.vars` could not participate. Wrangler
  bundled 17 modules, read 5 public assets, listed D1/Assets/`DEMO_FAULT`
  bindings, and exited at `--dry-run` without deployment. Expected warnings name
  missing App secrets at build time; that absence is the desired leak-safe
  boundary because remote Worker secrets are installed separately.
- `git diff --check -- docs/active/work/T-007-02-02`: pass.
- Corrected rehearsal repeated: pass; port 4332 stopped; no private
  `owner-rotation-secrets.*` directory remained.

One shell wrapper around the first dry-run used zsh's read-only variable name
`status` after the Wrangler command had already passed; the wrapper exited
non-zero. It was immediately rerun with `rc`, passed end to end, and removed the
generated `dist` directory. This was test harness syntax, not a product/check
failure.

## Scope hygiene

Only `docs/active/work/T-007-02-02/**` is staged/committed by this ticket. Lisa's
provenance/frontmatter changes and other tickets' untracked work remain present
and untouched. The ticket's phase/status frontmatter was never manually edited.

## Remaining

- Commit performed procedure/evidence/progress.
- Write Review after inspecting the committed ticket diff and acceptance matrix.
