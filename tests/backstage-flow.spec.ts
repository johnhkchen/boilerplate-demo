import { expect, test } from '@playwright/test';
import { PASSCODE_HEADER } from '../src/lib/passcode.ts';
import {
  BACKSTAGE_PASSCODE,
  BACKSTAGE_STEP,
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
} from './support/flow-contract';

// The whole account-free dashboard acceptance, driven on a phone viewport. A single successful
// feed request unlocks the page; submit, completion, and deletion then reuse that page-memory
// passcode without another credential prompt. Final feed assertions prove canonical store state.
test('one passcode unlocks the backstage checklist and every entry action', async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== FLOW_PROJECT.backstage,
    'backstage flow runs only on the mobile backstage project',
  );

  const marker = `pw-backstage-${Date.now()}`;
  const seedText = `Already waiting for the team — ${marker}`;
  const completeText = `Complete this from the checklist — ${marker}`;
  const deleteText = `Delete this from the checklist — ${marker}`;
  const completeUrl = `https://example.com/complete/${marker}`;

  const apiHeaders = {
    [PASSCODE_HEADER]: BACKSTAGE_PASSCODE,
    'content-type': 'application/json',
  };
  const seed = await request.post('/api/backstage/entries', {
    headers: apiHeaders,
    data: { type: 'feedback', url: '', text: seedText },
  });
  expect(seed.status(), `seed response: ${await seed.text()}`).toBe(201);

  await test.step(
    BACKSTAGE_STEP.openLocked,
    async () => {
      await page.goto('/backstage');
      await expect(page.getByRole('heading', { name: 'Backstage', exact: true })).toBeVisible();
      await expect(page.getByLabel('Shared passcode')).toBeVisible();
      await expect(page.locator('#backstage-dashboard')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Add to the list' })).toBeHidden();
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.refuseWrong,
    async () => {
      await page.getByLabel('Shared passcode').fill('definitely-the-wrong-knock');
      const denialPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/backstage/feed' &&
          response.request().method() === 'GET',
      );
      await page.getByRole('button', { name: 'Open backstage' }).click();
      expect((await denialPromise).status()).toBe(403);
      await expect(page.getByRole('alert')).toContainText("That passcode didn't work");
      await expect(page.locator('#backstage-dashboard')).toBeHidden();
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.unlockAndList,
    async () => {
      await page.getByLabel('Shared passcode').fill(BACKSTAGE_PASSCODE);
      const feedPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/backstage/feed' &&
          response.request().method() === 'GET',
      );
      await page.getByRole('button', { name: 'Open backstage' }).click();
      expect((await feedPromise).status()).toBe(200);
      await expect(page.locator('#backstage-gate')).toBeHidden();
      await expect(page.locator('#backstage-dashboard')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'The shared checklist' })).toBeFocused();
      await expect(page.getByLabel('Shared passcode')).toHaveValue('');
      await expect(page.getByRole('listitem').filter({ hasText: seedText })).toBeVisible();
      await expect(page.locator('#backstage-dashboard input[type="password"]')).toHaveCount(0);
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.submitWithoutSecondCredential,
    async () => {
      await page.getByLabel('Link', { exact: true }).fill(completeUrl);
      await page.getByLabel('Say more').fill(completeText);
      const submissionPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/backstage/entries' &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Add to the list' }).click();
      expect((await submissionPromise).status()).toBe(201);
      const completeItem = page.getByRole('listitem').filter({ hasText: completeText });
      await expect(completeItem).toBeVisible();
      await expect(completeItem.getByRole('link')).toHaveAttribute('href', completeUrl);
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  let completedId = 0;
  await test.step(
    BACKSTAGE_STEP.completeFromChecklist,
    async () => {
      const completeItem = page.getByRole('listitem').filter({ hasText: completeText });
      completedId = Number(await completeItem.getAttribute('data-entry-id'));
      expect(completedId).toBeGreaterThan(0);
      const checkbox = completeItem.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
      const completionPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/backstage/entries/${completedId}` &&
          response.request().method() === 'PATCH',
      );
      await checkbox.check();
      expect((await completionPromise).status()).toBe(200);
      const refreshedItem = page.getByRole('listitem').filter({ hasText: completeText });
      await expect(refreshedItem.getByRole('checkbox')).toBeChecked();
      await expect(refreshedItem.getByRole('checkbox')).toBeDisabled();
      await expect(refreshedItem).toContainText('Complete');
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  let deletedId = 0;
  await test.step(
    BACKSTAGE_STEP.deleteFromChecklist,
    async () => {
      await page.getByRole('radio', { name: 'A bit of feedback' }).check();
      await page.getByLabel('Say more').fill(deleteText);
      const submissionPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/backstage/entries' &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Add to the list' }).click();
      expect((await submissionPromise).status()).toBe(201);

      const deleteItem = page.getByRole('listitem').filter({ hasText: deleteText });
      await expect(deleteItem).toBeVisible();
      deletedId = Number(await deleteItem.getAttribute('data-entry-id'));
      expect(deletedId).toBeGreaterThan(0);
      page.once('dialog', (dialog) => dialog.accept());
      const deletionPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/backstage/entries/${deletedId}` &&
          response.request().method() === 'DELETE',
      );
      await deleteItem.getByRole('button', { name: `Delete entry ${deletedId}` }).click();
      expect((await deletionPromise).status()).toBe(200);
      await expect(page.getByRole('listitem').filter({ hasText: deleteText })).toHaveCount(0);
      await expect(page.getByRole('listitem').filter({ hasText: completeText })).toBeVisible();
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.confirmCanonical,
    async () => {
      const response = await request.get('/api/backstage/feed', {
        headers: { [PASSCODE_HEADER]: BACKSTAGE_PASSCODE },
      });
      expect(response.status()).toBe(200);
      const feed = (await response.json()) as { entries: Array<Record<string, unknown>> };
      expect(feed.entries.some((entry) => entry.text === seedText)).toBe(true);
      const completed = feed.entries.find((entry) => entry.text === completeText);
      expect(completed?.id).toBe(completedId);
      expect(typeof completed?.completedAt).toBe('string');
      expect(feed.entries.some((entry) => entry.id === deletedId || entry.text === deleteText)).toBe(
        false,
      );
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );
});
