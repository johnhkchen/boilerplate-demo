# Progress — T-003-01-02 shared-passcode-gate

## Status: implementation complete

All three planned steps landed as atomic commits; `npm test` (52) and `npm run build` green.

## Steps completed

- **Step 1 — gate module** (`4d8f5a2`)
  - Created `src/lib/passcode.ts`: `GATE_NAME`, `PASSCODE_ENV`, `PASSCODE_HEADER`;
    `GateDecision` discriminated union; `checkPasscode` (pure core), `passcodeFromHeaders`,
    `describeDecision`, `guardPasscode` (Response adapter); internal `constantTimeEqual`,
    `isBlank`. Decision order misconfigured → missing → mismatch → allowed.
- **Step 2 — unit tests + wiring** (`8d305b5`)
  - Created `test/passcode.test.mjs` (14 cases) and appended it to the `test` script in
    `package.json`. Suite: 38 → 52 tests, all green.
- **Step 3 — env typing + docs** (`02789b8`)
  - Added `DEMO_PASSCODE: string` to `src/env.d.ts` with a server-only/non-`PUBLIC_` comment;
    documented `DEMO_PASSCODE` (header, prod secret path, low-stakes framing) in
    `.dev.vars.example`. `npm run build` confirmed no type/bundle regression.

## Verification

- `npm test` → tests 52, pass 52, fail 0.
- `npm run build` → client + server build Complete.
- Acceptance met: correct passcode passes; missing → 401; wrong → 403; passcode read
  server-side (`DEMO_PASSCODE`, non-`PUBLIC_`, passed as an argument into a pure core) and
  therefore absent from any browser bundle by construction; no denial body echoes the value.

## Deviations from plan

None. Implemented exactly as `plan.md` / `structure.md` specified.

## Notes for downstream tickets

- Submit route (T-003-02-01) and retrieve seam (T-003-03-01) compose over the gate with:
  ```ts
  const denied = guardPasscode(request, env?.DEMO_PASSCODE);
  if (denied) return denied;
  ```
- The client sets the `x-demo-passcode` header (`PASSCODE_HEADER`). The phone form
  (T-003-02-02) and the agent seam doc (T-003-03-01) should reference that header name.
- Extending `leak:check` to also scan for `DEMO_PASSCODE` is a reasonable future hardening
  but was out of this ticket's scope (guarantee here is structural).
