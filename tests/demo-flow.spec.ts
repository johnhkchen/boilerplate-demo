import { expect, test } from '@playwright/test';
import {
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
  FLOW_STEP,
  PRIMARY_ACTION_NAME,
} from './support/flow-contract';

// Two projects share this spec, one test each (the guards skip the other):
//   healthy — the signed receipt renders, and the labeled primary action responds
//             with a fresh receipt when activated.
//   stalled — with the boundary never answering, the page keeps narrating the wait
//             and the labeled action still answers its activation.
// The stalled project began life as a deliberate always-red demonstration that the
// run fails at its budget naming the awaited step (T-002-02-01). As of T-005-01-02
// it asserts that same observability property and passes: failure at the boundary
// stays visible and bounded, without a red run to re-diagnose.

test('main demo flow renders the signed receipt', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== FLOW_PROJECT.healthy,
    'the signed-receipt flow runs only on the healthy project',
  );

  await test.step(
    FLOW_STEP.loadDemo,
    async () => {
      // The page module awaits the receipt fetch. Waiting only for navigation
      // commit keeps a deliberately stalled fetch out of this document-load step;
      // the heading proves the static HTML parsed before the named receipt wait.
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { name: 'Demo Runway' })).toBeVisible();
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    FLOW_STEP.awaitReceipt,
    async () => {
      await expect(
        page.locator('#receipt-body'),
        'await receipt boundary response: signed receipt should become visible',
      ).toBeVisible();
      await expect(page.locator('#receipt-status')).toBeHidden();
      await expect(page.locator('#receipt-nonce')).toHaveText(/^[0-9a-f]{32}$/);
      await expect(page.locator('#receipt-signature')).toHaveText(/^[0-9a-f]{64}$/);
    },
    { box: true, timeout: FLOW_BUDGET_MS.receiptStep },
  );

  // The epic's contract, pinned: the primary action exists under its accessible
  // verb-forward name and responds when activated. Existence and response only —
  // whether the page convinces anyone is the human gate, not this check.
  await test.step(
    FLOW_STEP.activateAction,
    async () => {
      const action = page.getByRole('button', { name: PRIMARY_ACTION_NAME });
      await expect(
        action,
        'the primary action should exist under its verb-forward accessible name',
      ).toBeVisible();
      await expect(action).toBeEnabled();

      // Each /api/receipt answer mints a fresh nonce, so a changed nonce is the
      // page-visible proof the activation produced a new server response.
      const nonceBefore = await page.locator('#receipt-nonce').textContent();
      await action.click();
      await expect(
        page.locator('#receipt-nonce'),
        'activating the primary action should fetch a fresh receipt (new nonce)',
      ).not.toHaveText(nonceBefore ?? '');
      await expect(page.locator('#receipt-nonce')).toHaveText(/^[0-9a-f]{32}$/);
      await expect(
        action,
        'the action should re-arm once its round trip completes',
      ).toBeEnabled();
    },
    { box: true, timeout: FLOW_BUDGET_MS.actionStep },
  );
});

test('the stalled boundary stays narrated and the labeled action still answers', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== FLOW_PROJECT.stalled,
    'the stalled-boundary flow runs only on the stalled project',
  );

  // A routed request remains stalled until the handler continues, fulfills, or
  // aborts it. Intentionally do none of those so the real page stays in its
  // loading state for the whole test.
  await page.route('**/api/receipt', () => {});

  await test.step(
    FLOW_STEP.loadDemo,
    async () => {
      // Same commit-wait rationale as the healthy flow: the stalled fetch must not
      // count against document load; the heading proves the static shell parsed.
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { name: 'Demo Runway' })).toBeVisible();
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    FLOW_STEP.observeStall,
    async () => {
      await expect(
        page.locator('#receipt-status'),
        'a boundary that never answers should stay narrated, not blank',
      ).toBeVisible();
      await expect(
        page.locator('#receipt-body'),
        'no receipt may be faked while the boundary is stalled',
      ).toBeHidden();
    },
    { box: true, timeout: FLOW_BUDGET_MS.receiptStep },
  );

  // The activation contract holds even when the server never answers: the button
  // exists under its accessible name and observably reacts to the click (its
  // handler disables it for the in-flight round trip). Nothing here waits on the
  // stalled response itself, so the step settles in milliseconds.
  await test.step(
    FLOW_STEP.activateAction,
    async () => {
      const action = page.getByRole('button', { name: PRIMARY_ACTION_NAME });
      await expect(
        action,
        'the primary action should exist under its verb-forward accessible name',
      ).toBeVisible();
      await expect(action).toBeEnabled();

      await action.click();
      await expect(
        action,
        'the action should answer its activation even while the boundary hangs',
      ).toBeDisabled();
      await expect(page.locator('#receipt-status')).toBeVisible();
      await expect(page.locator('#receipt-body')).toBeHidden();
    },
    { box: true, timeout: FLOW_BUDGET_MS.actionStep },
  );
});
