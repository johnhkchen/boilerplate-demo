// T-005-01-03 evidence harness. Captures the BUILT index page (served by
// `npx wrangler dev --port 8791` against a fresh `npm run build`) at
// projector scale and at a 375px phone viewport. The server is started and
// killed by the operator — this script owns only the browser.
//
// Run from the repo root: node docs/active/work/T-005-01-03/capture.mjs
// The back-of-room resample is a separate step (macOS sips); see cold-read.md.

import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:8791/';
const outPath = (name) => fileURLToPath(new URL(name, import.meta.url));

// Screenshot only the settled, working state: the receipt card filled by a
// real /api/receipt round trip. A timeout here means the demo did NOT work
// at capture time — fail loudly instead of shipping ambiguous evidence.
const RECEIPT_BUDGET_MS = 15_000;

async function captureContext(browser, contextOpts, shots) {
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.locator('#receipt-body').waitFor({
    state: 'visible',
    timeout: RECEIPT_BUDGET_MS,
  });
  for (const { name, fullPage } of shots) {
    await page.screenshot({ path: outPath(name), fullPage });
    console.log(`wrote ${name}`);
  }
  await context.close();
}

const browser = await chromium.launch();
try {
  // Projector: 1080p, the conference-room default. The viewport shot is what
  // the room sees with no scrolling; the full-page shot records the rest.
  await captureContext(
    browser,
    { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
    [
      { name: 'projector-1920x1080.png', fullPage: false },
      { name: 'projector-1920x1080-full.png', fullPage: true },
    ],
  );
  // Phone: 375 logical px wide (AC-pinned), 667 tall — the shortest
  // mainstream fold at that width, so it is the conservative first screen.
  await captureContext(
    browser,
    {
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    [
      { name: 'phone-375-fold.png', fullPage: false },
      { name: 'phone-375-full.png', fullPage: true },
    ],
  );
} finally {
  await browser.close();
}
console.log('capture complete');
