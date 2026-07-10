export const FLOW_PROJECT = {
  healthy: 'healthy',
  stalled: 'stalled',
  // Phone-viewport project for the stakeholder backstage form (T-003-02-02). Runs on a
  // mobile device preset against the same dev server, which additionally binds the D1
  // store and the shared passcode (see playwright.config.ts webServer).
  backstage: 'backstage',
} as const;

export const FLOW_STEP = {
  loadDemo: 'load the public demo',
  awaitReceipt: 'await receipt boundary response',
} as const;

// The backstage form's phone-flow steps, named like FLOW_STEP so failures read plainly.
export const BACKSTAGE_STEP = {
  openForm: 'open the backstage form',
  submitReference: 'submit a reference from a phone',
  confirmStored: 'confirm it reached the store',
} as const;

// The shared low-stakes passcode used by the backstage phone flow. The single value the
// dev server's env (DEMO_PASSCODE) and the spec both read, so the gate and the form cannot
// drift. This is a local test knock, not a secret.
export const BACKSTAGE_PASSCODE = 'playwright-backstage-knock';

// Nested budgets keep the most useful failure closest to the cause while outer
// limits guarantee that setup or teardown cannot leave the whole run hanging.
export const FLOW_BUDGET_MS = {
  assertion: 8_000,
  action: 10_000,
  receiptStep: 5_000,
  test: 20_000,
  // The backstage dev server applies the D1 migration before `astro dev` is ready, so its
  // startup budget is larger than the receipt-only flow needs.
  serverStartup: 30_000,
  run: 40_000,
} as const;

// A dedicated port keeps the owned test server away from Astro's usual 4321,
// which is commonly occupied during local development.
export const LOCAL_BASE_URL = 'http://127.0.0.1:4323';
