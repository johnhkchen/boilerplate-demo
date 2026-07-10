import { expect, test } from '@playwright/test';
import {
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
  FLOW_STEP,
} from './support/flow-contract';

test('main demo flow renders the signed receipt', async ({ page }, testInfo) => {
  if (testInfo.project.name === FLOW_PROJECT.stalled) {
    // A routed request remains stalled until the handler continues, fulfills, or
    // aborts it. Intentionally do none of those so the real page stays in its
    // loading state and the named receipt step proves its own time budget.
    await page.route('**/api/receipt', () => {});
  }

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
});
