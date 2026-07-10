# Plan — T-003-01-02 shared-passcode-gate

Ordered, independently verifiable steps. Each ends at a green `npm test` and an atomic
commit. Grounded in `structure.md`.

## Testing strategy

- **Unit tests only** (`test/passcode.test.mjs`, `node:test` + `assert/strict`), matching
  the repo. No integration test is warranted: this ticket ships a pure primitive, not a
  route. The downstream route tickets (T-003-02-01 route test, T-003-02-02 mobile UI check,
  T-003-03-01 seam check) exercise the gate end-to-end through HTTP — that is their
  acceptance, not this one's.
- The unit test *is* the acceptance criterion: missing/wrong → 401/403 reject, correct →
  pass, and the passcode-never-in-bundle guarantee asserted structurally.
- Verification each step: `npm test` (whole suite, ~40 tests) must stay green — the new file
  is added to the `test` script in Step 2 so it runs from then on.
- After the code lands, run `npm run build` once to confirm the new `src/lib` module and the
  `env.d.ts` change do not break the Astro/Cloudflare build (the module is not yet imported
  by a route, so this only checks it type-checks and bundles cleanly).

## Step 1 — Write the gate module

**File:** `src/lib/passcode.ts` (create).
- House-style header comment (purity, consumers, bundle guarantee).
- Constants: `GATE_NAME`, `PASSCODE_ENV`, `PASSCODE_HEADER`.
- Types: `GateReason`, `GateDecision`.
- Internals: `constantTimeEqual`, `isBlank`.
- Public: `passcodeFromHeaders`, `checkPasscode`, `describeDecision`, `guardPasscode`.
- Enforce decision order: misconfigured → missing → mismatch → allowed.
**Verify:** file type-checks when imported by the test in Step 2 (no standalone check yet).
**Commit:** `Add reusable backstage passcode gate (T-003-01-02)`.

## Step 2 — Write the unit test and wire it in

**Files:** `test/passcode.test.mjs` (create); `package.json` (modify — append the file to
the `test` script list).
- Cover: correct pass; wrong → 403; missing (`null`/`''`/`'   '`) → 401; blank configured
  (`undefined`/`''`/`'  '`) → 500; `constantTimeEqual` matrix (equal, diff length, same
  length one-char diff, empty/empty); `passcodeFromHeaders` (present / absent); `guardPasscode`
  end-to-end over a real `Request` for all four outcomes; structural bundle-safety asserts
  (`PASSCODE_ENV` is `DEMO_PASSCODE`, not `PUBLIC_`-prefixed; denial body excludes the value).
**Verify:** `npm test` → new cases pass, existing 38 still pass.
**Commit:** `Drive the passcode gate with unit tests (T-003-01-02)`.

## Step 3 — Env typing and dev-vars documentation

**Files:** `src/env.d.ts` (add `DEMO_PASSCODE: string` with a matching comment);
`.dev.vars.example` (add a documented `DEMO_PASSCODE` block: header name, prod
`wrangler secret put` path, low-stakes-gate note).
**Verify:** `npm test` still green; `npm run build` succeeds (type-checks env + bundles).
**Commit:** `Declare and document the backstage passcode env var (T-003-01-02)`.

## Step order rationale

1 before 2: the module is the unit under test. 2 before 3: the acceptance (test-driven
gate) is the highest-leverage checkpoint and should be green before touching the env
surface. 3 last: the env/doc surface is what downstream routes read; it carries no logic
and cannot regress the gate. Each commit is self-contained and revertible.

## Risks and mitigations

- **`constantTimeEqual` edge cases** (`NaN | 0` for out-of-range `charCodeAt`, length fold):
  covered explicitly by the Step 2 matrix, including empty/empty and unequal lengths.
- **Missing-vs-mismatch classification of whitespace:** `isBlank` (trim) routes a
  whitespace-only header to `missing` (401), tested directly, so it can never be read as a
  wrong passcode.
- **Forgetting to wire the test file** into `package.json` (silent no-run): done in the same
  Step 2 commit and verified by seeing the new case count rise in `npm test` output.
- **Build regression from `env.d.ts`:** `DEMO_PASSCODE` is a plain `string` on an existing
  type; `npm run build` in Step 3 confirms no breakage. No route imports the module yet, so
  there is no runtime surface to regress this ticket.

## Definition of done

- `npm test` green, including the new gate cases.
- `npm run build` green.
- Missing/wrong passcode → 401/403; correct → pass; passcode read server-side only and, by
  construction, absent from any browser bundle (`DEMO_PASSCODE` is non-`PUBLIC_` env, passed
  as an argument into a pure core that never embeds it).
- `env.d.ts` and `.dev.vars.example` document the new var; three atomic commits landed.
- `review.md` written summarizing changes, coverage, and open concerns.
