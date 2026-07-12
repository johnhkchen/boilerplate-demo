import { receiptBoundary } from '../../src/lib/boundary-contract.ts';

export const FLOW_PROJECT = {
  healthy: 'healthy',
  stalled: 'stalled',
  // Phone-viewport project for the stakeholder backstage form (T-003-02-02). Runs on a
  // mobile device preset against the same dev server, which additionally binds the D1
  // store and the shared passcode (see playwright.config.ts webServer).
  backstage: 'backstage',
} as const;

// The browser-facing slice of the exemplar boundary declaration. Playwright's
// route interception needs an any-origin glob; every page landmark remains the
// declaration's original value and type.
export const DEMO_FLOW_BOUNDARY = {
  pathGlob: `**${receiptBoundary.path}`,
  landmark: receiptBoundary.landmark,
} as const;

// Named re-export for the role locator that proves the static page shell parsed.
export const DEMO_HEADING = DEMO_FLOW_BOUNDARY.landmark.heading;

export const FLOW_STEP = {
  loadDemo: 'load the public demo',
  awaitReceipt: 'await receipt boundary response',
  activateAction: 'activate the labeled primary action',
  observeStall: 'observe the stalled boundary stays narrated',
} as const;

// The unified backstage dashboard's phone-flow steps, named so failures identify the exact
// credential or checklist transition that broke.
export const BACKSTAGE_STEP = {
  openLocked: 'open the locked backstage dashboard',
  refuseWrong: 'refuse a wrong passcode',
  unlockAndList: 'unlock once and list existing entries',
  submitWithoutSecondCredential: 'submit without a second credential',
  completeFromChecklist: 'complete an entry from the checklist',
  deleteFromChecklist: 'delete an entry from the checklist',
} as const;

// The shared low-stakes passcode used by the backstage phone flow. The single value the
// dev server's env (DEMO_PASSCODE) and the spec both read, so the gate and the form cannot
// drift. This is a local test knock, not a secret.
export const BACKSTAGE_PASSCODE = 'playwright-backstage-knock';

// The accessible name of the index page's one primary action, re-exported from
// the boundary declaration so the named activation step follows one source.
export const PRIMARY_ACTION_NAME =
  DEMO_FLOW_BOUNDARY.landmark.primaryActionName;

// Nested budgets keep the most useful failure closest to the cause while outer
// limits guarantee that setup or teardown cannot leave the whole run hanging.
export const FLOW_BUDGET_MS = {
  assertion: 8_000,
  action: 10_000,
  receiptStep: 5_000,
  // One activation round trip of the labeled primary action — same class as
  // receiptStep. Worst-case step sums stay within the unchanged test cap
  // (action 10s + receiptStep 5s + actionStep 5s = test 20s).
  actionStep: 5_000,
  // The unified backstage flow performs unlock plus three mutations and canonical refreshes.
  test: 35_000,
  // The backstage dev server applies the D1 migration before `astro dev` is ready, so its
  // startup budget is larger than the receipt-only flow needs.
  serverStartup: 30_000,
  run: 60_000,
} as const;

// A dedicated port keeps the owned test server away from Astro's usual 4321,
// which is commonly occupied during local development.
export const LOCAL_BASE_URL = 'http://127.0.0.1:4323';
