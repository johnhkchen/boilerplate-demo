import { expect, test } from '@playwright/test';
import { PASSCODE_HEADER } from '../src/lib/passcode.ts';
import {
  BACKSTAGE_PASSCODE,
  BACKSTAGE_STEP,
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
} from './support/flow-contract';

// The acceptance, driven end to end on a phone viewport: a visitor enters the passcode,
// submits a reference, and sees a confirmation — then we prove the submission reached the
// store by reading it back through the documented retrieval seam (GET /api/backstage/feed),
// exactly as a coding agent would. This closes E-003's submit→retrieve loop.
test('a stakeholder submits a reference from a phone and it lands in the store', async ({
  page,
  request,
}, testInfo) => {
  // Guard: this flow is the backstage project's alone (mobile device preset). If some other
  // project ever matches it, skip rather than run at the wrong viewport.
  test.skip(
    testInfo.project.name !== FLOW_PROJECT.backstage,
    'backstage flow runs only on the mobile backstage project',
  );

  // A per-run marker so the assertion targets THIS submission regardless of any entries the
  // local store already holds from prior runs.
  const marker = `pw-backstage-${Date.now()}`;
  const noteText = `Take a look at this reference — ${marker}`;
  const linkUrl = `https://example.com/ref/${marker}`;

  await test.step(
    BACKSTAGE_STEP.openForm,
    async () => {
      await page.goto('/backstage');
      await expect(page.getByRole('heading', { name: 'Backstage' })).toBeVisible();
      await expect(page.getByLabel('Shared passcode')).toBeVisible();
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.submitReference,
    async () => {
      await page.getByLabel('Shared passcode').fill(BACKSTAGE_PASSCODE);
      // The reference radio is checked by default; assert it, then fill link + note.
      const reference = page.getByRole('radio', { name: 'A link or reference' });
      await expect(reference).toBeChecked();
      // Exact match: the "A link or reference" radio's accessible name also contains "link".
      await page.getByLabel('Link', { exact: true }).fill(linkUrl);
      await page.getByLabel('Say more').fill(noteText);
      await page.getByRole('button', { name: 'Send it over' }).click();

      // The form is swapped for the confirmation panel, which echoes what was sent.
      await expect(
        page.getByRole('heading', { name: 'Got it — thanks.' }),
        'the confirmation panel should appear after a successful submit',
      ).toBeVisible();
      await expect(page.locator('#bs-confirm-text')).toHaveText(noteText);
      await expect(page.locator('#bs-confirm-url')).toHaveText(linkUrl);
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.confirmStored,
    async () => {
      // Read the store back through the real documented seam, gated by the same passcode.
      const res = await request.get('/api/backstage/feed', {
        headers: { [PASSCODE_HEADER]: BACKSTAGE_PASSCODE },
      });
      expect(res.status(), 'the feed seam should accept the shared passcode').toBe(200);
      const feed = await res.json();

      const mine = (feed.entries as Array<Record<string, unknown>>).find(
        (entry) => entry.text === noteText,
      );
      expect(
        mine,
        'the submitted reference should be retrievable from the store via the feed seam',
      ).toBeTruthy();
      expect(mine?.type).toBe('reference');
      expect(mine?.url).toBe(linkUrl);
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );
});
