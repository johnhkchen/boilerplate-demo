# T-005-01-02 — playwright-labeled-action-assertion — Structure

The blueprint: exactly two files change, none are created or deleted.

## File inventory

| File | Change | Why |
| --- | --- | --- |
| `tests/support/flow-contract.ts` | modified | new contract const, two step names, one budget |
| `tests/demo-flow.spec.ts` | modified | guard + new step on the healthy test; new stalled test |
| `playwright.config.ts` | untouched | read-only per story; existing projects already route both tests |
| `src/pages/index.astro` | untouched | surface under test; hooks already exported by T-005-01-01 |
| `tests/backstage-flow.spec.ts` | untouched | different story, already green |

## `tests/support/flow-contract.ts` — additions (no removals, no reshapes)

Every existing export keeps its name, shape, and values; the three
additions slot into the file's existing sections.

1. **`PRIMARY_ACTION_NAME`** — new exported const, placed beside
   `BACKSTAGE_PASSCODE` (the file's existing "single value on both ends"
   contract). Value: `'Ask for a fresh note'`. Comment states the
   authoring side is `index.astro`'s `PRIMARY_ACTION_LABEL` template slot
   and that a rename there must land here in the same change — the suite
   failing on the named activation step is this contract enforcing itself.

2. **`FLOW_STEP`** — two new keys, same plain-language voice as the
   existing entries:
   - `activateAction: 'activate the labeled primary action'`
   - `observeStall: 'observe the stalled boundary stays narrated'`

3. **`FLOW_BUDGET_MS`** — one new key, grouped with the step budgets:
   - `actionStep: 5_000` — bounds one activation round trip, same class
     as `receiptStep`; comment notes worst-case step sums stay within the
     unchanged `test` cap (10s + 5s + 5s = 20s).

   `assertion`, `action`, `receiptStep`, `test`, `serverStartup`, `run`
   are unchanged — the config (read-only) keeps reading the same keys.

## `tests/demo-flow.spec.ts` — reorganization

Target shape (one file, two linear tests, shared imports; ~95 lines):

```
imports: expect, test, {FLOW_BUDGET_MS, FLOW_PROJECT, FLOW_STEP,
                        PRIMARY_ACTION_NAME} from './support/flow-contract'

file-level comment: the two projects that share this spec and why —
  healthy proves the receipt flow and the labeled action's replay;
  stalled proves the failure mode stays narrated and the action still
  answers. Notes the contract change: the stalled project was an
  intentional always-red demo (T-002-02-01); as of T-005-01-02 it is a
  green assertion of the same observability property.
  (Closes T-005-01-01 review concern #2.)

test 1 (existing, title unchanged): 'main demo flow renders the signed receipt'
  guard: test.skip(project !== healthy)          ← replaces route-interception branch
  step FLOW_STEP.loadDemo        [unchanged verbatim]
  step FLOW_STEP.awaitReceipt    [unchanged verbatim]
  step FLOW_STEP.activateAction  [new, box, timeout: actionStep]
    - const action = page.getByRole('button', { name: PRIMARY_ACTION_NAME })
    - expect(action).toBeVisible() + toBeEnabled()   ← existence, by accessible name
    - read nonceBefore = textContent of #receipt-nonce
    - action.click()
    - expect(#receipt-nonce).not.toHaveText(nonceBefore)   ← response observed
    - expect(#receipt-nonce).toHaveText(/^[0-9a-f]{32}$/)  ← still a real receipt
    - expect(action).toBeEnabled()                          ← re-armed after round trip
    (assertion messages name the claim, mirroring awaitReceipt's style)

test 2 (new): 'the stalled boundary stays narrated and the labeled action still answers'
  guard: test.skip(project !== stalled)
  page.route('**/api/receipt', () => {})   ← moved here from test 1's branch,
                                              keeping its explanatory comment
  step FLOW_STEP.loadDemo        [same body as test 1's: commit-wait goto + heading]
  step FLOW_STEP.observeStall    [new, box, timeout: receiptStep]
    - expect(#receipt-status).toBeVisible()   ← the wait is narrated
    - expect(#receipt-body).toBeHidden()      ← no receipt is faked
  step FLOW_STEP.activateAction  [new, box, timeout: actionStep]
    - const action = getByRole button by PRIMARY_ACTION_NAME
    - expect visible + enabled                ← exists under its verb-forward name
    - action.click()
    - expect(action).toBeDisabled()           ← the handler answered the activation
    - expect(#receipt-status).toBeVisible()   ← narration holds during the hang
    - expect(#receipt-body).toBeHidden()
```

## Boundaries and interfaces

- **Public interface of this change** = the three new `flow-contract.ts`
  exports. `playwright.config.ts` (read-only) already imports only
  `BACKSTAGE_PASSCODE`, `FLOW_BUDGET_MS`, `FLOW_PROJECT`,
  `LOCAL_BASE_URL` — additive keys cannot disturb it.
- **Step-name reuse**: `FLOW_STEP.activateAction` appears in both tests
  deliberately — same contract, two modes; the project name in the report
  distinguishes them. `loadDemo` likewise. Duplicated *step bodies* for
  `loadDemo` stay inline in each test rather than a shared helper: two
  short tests reading top-to-bottom beat a three-line abstraction (and
  match the file's existing flat style).
- **Locator discipline in the new steps**: the activation step uses only
  the role/name locator for the button (the AC's point); receipt-state
  assertions keep using the established `#receipt-*` ids exactly like the
  existing `awaitReceipt` step.
- **No new fixtures, helpers, or support files.** The spec keeps zero
  local functions; every budget and label comes from the contract.

## Ordering of changes

1. `flow-contract.ts` first — the spec imports the new names; committing
   contract-then-spec keeps every intermediate tree type-checkable.
2. `demo-flow.spec.ts` second — both tests in one edit; the file is only
   coherent with guard + stalled test landing together (moving the
   route-interception out of test 1 without adding test 2 would silently
   drop stalled coverage).

Single commit is also defensible (the two files form one contract);
decided in plan.md. Either way the tree is never left with a red default
run.

## Failure-legibility invariants (what the shape must preserve)

- Every wait sits inside a named, boxed `test.step` with a budget from
  `FLOW_BUDGET_MS` — a hang names its step and dies inside its line item,
  never at the anonymous test cap.
- Custom expect messages on the assertions whose failure would otherwise
  be cryptic (nonce-change, narration-holds), phrased as the claim being
  checked — matching `awaitReceipt`'s existing style.
- The stalled test must not await anything that settles only when the
  boundary answers — all its assertions check states that are already
  true or become true synchronously on click (button.disabled flips
  before the stalled fetch could ever settle; toBeDisabled polls, so no
  race with the handler's first line).
