import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const workDir = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(workDir, 'screenshots');
const baseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4323').replace(
  /\/$/,
  '',
);
const passcode = process.env.DEMO_PASSCODE ?? 'playwright-backstage-knock';

const viewports = [
  {
    name: 'projector-1920x1080',
    context: {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    },
  },
  {
    name: 'phone-375x812',
    context: {
      viewport: { width: 375, height: 812 },
      screen: { width: 375, height: 812 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    },
  },
];

async function waitForFonts(page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function writeScreenshots(page, filename) {
  const viewportPath = resolve(screenshotDir, filename);
  const fullPagePath = resolve(
    screenshotDir,
    filename.replace(/\.png$/, '-full.png'),
  );
  await page.screenshot({ path: viewportPath, animations: 'disabled' });
  await page.screenshot({
    path: fullPagePath,
    fullPage: true,
    animations: 'disabled',
  });
  console.log(`wrote ${viewportPath}`);
  console.log(`wrote ${fullPagePath}`);
}

async function captureIndex(browser, viewport) {
  const context = await browser.newContext(viewport.context);
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Demo Runway', exact: true }).waitFor();
    await page.locator('#receipt-body').waitFor({ state: 'visible' });
    await waitForFonts(page);
    await writeScreenshots(page, `index-${viewport.name}.png`);
  } finally {
    await context.close();
  }
}

async function captureBackstage(browser, viewport) {
  const context = await browser.newContext(viewport.context);
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/backstage`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Backstage', exact: true }).waitFor();
    await page.getByLabel('Shared passcode').waitFor();
    await waitForFonts(page);
    await writeScreenshots(page, `backstage-locked-${viewport.name}.png`);

    await page.getByLabel('Shared passcode').fill(passcode);
    await page.getByRole('button', { name: 'Open backstage', exact: true }).click();
    await page.locator('#backstage-gate').waitFor({ state: 'hidden' });
    await page.locator('#backstage-dashboard').waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: 'Shared checklist', exact: true }).waitFor();
    await writeScreenshots(page, `backstage-open-${viewport.name}.png`);
  } finally {
    await context.close();
  }
}

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    await captureIndex(browser, viewport);
    await captureBackstage(browser, viewport);
  }
} finally {
  await browser.close();
}
