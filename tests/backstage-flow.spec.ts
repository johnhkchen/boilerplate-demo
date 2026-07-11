import { expect, test } from '@playwright/test';
import type {
  BackstageEntry,
  NewBackstageEntry,
} from '../src/lib/backstage-entry.ts';
import type { BackstageFeed } from '../src/lib/backstage-retrieval.ts';
import { PASSCODE_HEADER } from '../src/lib/passcode.ts';
import {
  BACKSTAGE_PASSCODE,
  BACKSTAGE_STEP,
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
} from './support/flow-contract';

interface SubmissionResponse {
  entry: NewBackstageEntry;
}

interface CompletionResponse {
  boundary: 'backstage_management';
  entry: { id: number; completedAt: string };
}

interface DeletionResponse {
  boundary: 'backstage_management';
  deleted: { id: number };
}

// The whole account-free dashboard acceptance, driven on a phone viewport. A single successful
// feed request unlocks the page; submit, completion, and deletion then reuse that page-memory
// passcode without another credential prompt. Direct gated reads after every transition prove the
// agent feed reflects the human's incomplete, completed, and deleted entry state verbatim.
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
  const completeUrl = `https://example.com/complete/${marker}`;

  const apiHeaders = {
    [PASSCODE_HEADER]: BACKSTAGE_PASSCODE,
    'content-type': 'application/json',
  };
  const readFeed = async (): Promise<BackstageFeed> => {
    const response = await request.get('/api/backstage/feed', {
      headers: { [PASSCODE_HEADER]: BACKSTAGE_PASSCODE },
    });
    const body = await response.text();
    expect(response.status(), `feed response: ${body}`).toBe(200);
    const feed = JSON.parse(body) as BackstageFeed;
    expect(feed.schemaVersion).toBe(1);
    expect(feed.gate).toBe('backstage');
    expect(feed.count).toBe(feed.entries.length);
    return feed;
  };

  const seed = await request.post('/api/backstage/entries', {
    headers: apiHeaders,
    data: { type: 'feedback', url: '', text: seedText },
  });
  const seedBody = await seed.text();
  expect(seed.status(), `seed response: ${seedBody}`).toBe(201);
  const seedSubmission = JSON.parse(seedBody) as SubmissionResponse;
  expect(seedSubmission.entry).toEqual({
    type: 'feedback',
    url: '',
    text: seedText,
    submittedAt: expect.any(String),
  });

  let expectedSeed: BackstageEntry;
  let expectedLifecycle: BackstageEntry;

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
      await expect(page.getByRole('heading', { name: 'Shared checklist' })).toBeFocused();
      await expect(page.getByLabel('Shared passcode')).toHaveValue('');
      await expect(page.getByRole('listitem').filter({ hasText: seedText })).toBeVisible();
      await expect(page.locator('#backstage-dashboard input[type="password"]')).toHaveCount(0);

      const feed = await readFeed();
      const seedEntry = feed.entries.find((entry) => entry.text === seedText);
      expect(seedEntry).toBeDefined();
      if (seedEntry === undefined) throw new Error('seed entry missing from the unlocked feed');
      expectedSeed = {
        id: seedEntry.id,
        type: 'feedback',
        url: '',
        text: seedText,
        submittedAt: seedSubmission.entry.submittedAt,
        completedAt: null,
      };
      expect(seedEntry).toEqual(expectedSeed);
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
      const submission = await submissionPromise;
      const submissionBody = await submission.text();
      expect(submission.status(), `submission response: ${submissionBody}`).toBe(201);
      const submitted = JSON.parse(submissionBody) as SubmissionResponse;
      expect(submitted.entry).toEqual({
        type: 'reference',
        url: completeUrl,
        text: completeText,
        submittedAt: expect.any(String),
      });

      const completeItem = page.getByRole('listitem').filter({ hasText: completeText });
      await expect(completeItem).toBeVisible();
      await expect(completeItem.getByRole('link')).toHaveAttribute('href', completeUrl);
      const lifecycleId = Number(await completeItem.getAttribute('data-entry-id'));
      expect(lifecycleId).toBeGreaterThan(0);
      expectedLifecycle = {
        id: lifecycleId,
        type: 'reference',
        url: completeUrl,
        text: completeText,
        submittedAt: submitted.entry.submittedAt,
        completedAt: null,
      };

      const feed = await readFeed();
      expect(feed.entries.find((entry) => entry.id === lifecycleId)).toEqual(expectedLifecycle);
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.completeFromChecklist,
    async () => {
      const completeItem = page.getByRole('listitem').filter({ hasText: completeText });
      const checkbox = completeItem.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
      const completionPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/backstage/entries/${expectedLifecycle.id}` &&
          response.request().method() === 'PATCH',
      );
      await checkbox.check();
      const completion = await completionPromise;
      const completionBody = await completion.text();
      expect(completion.status(), `completion response: ${completionBody}`).toBe(200);
      const completed = JSON.parse(completionBody) as CompletionResponse;
      expect(completed).toEqual({
        boundary: 'backstage_management',
        entry: {
          id: expectedLifecycle.id,
          completedAt: expect.any(String),
        },
      });
      expect(Number.isNaN(Date.parse(completed.entry.completedAt))).toBe(false);

      const refreshedItem = page.getByRole('listitem').filter({ hasText: completeText });
      await expect(refreshedItem.getByRole('checkbox')).toBeChecked();
      await expect(refreshedItem.getByRole('checkbox')).toBeDisabled();
      await expect(refreshedItem).toContainText('Complete');
      expectedLifecycle = {
        ...expectedLifecycle,
        completedAt: completed.entry.completedAt,
      };

      const feed = await readFeed();
      expect(feed.entries.find((entry) => entry.id === expectedLifecycle.id)).toEqual(
        expectedLifecycle,
      );
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );

  await test.step(
    BACKSTAGE_STEP.deleteFromChecklist,
    async () => {
      const deleteItem = page.getByRole('listitem').filter({ hasText: completeText });
      await expect(deleteItem).toBeVisible();
      page.once('dialog', (dialog) => dialog.accept());
      const deletionPromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/backstage/entries/${expectedLifecycle.id}` &&
          response.request().method() === 'DELETE',
      );
      await deleteItem
        .getByRole('button', { name: `Delete entry ${expectedLifecycle.id}` })
        .click();
      const deletion = await deletionPromise;
      const deletionBody = await deletion.text();
      expect(deletion.status(), `deletion response: ${deletionBody}`).toBe(200);
      const deleted = JSON.parse(deletionBody) as DeletionResponse;
      expect(deleted).toEqual({
        boundary: 'backstage_management',
        deleted: { id: expectedLifecycle.id },
      });

      await expect(page.getByRole('listitem').filter({ hasText: completeText })).toHaveCount(0);
      await expect(page.getByRole('listitem').filter({ hasText: seedText })).toBeVisible();

      const feed = await readFeed();
      expect(feed.entries.some((entry) => entry.id === expectedLifecycle.id)).toBe(false);
      expect(feed.entries.find((entry) => entry.id === expectedSeed.id)).toEqual(expectedSeed);
    },
    { box: true, timeout: FLOW_BUDGET_MS.action },
  );
});
