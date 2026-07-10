import { defineConfig, devices } from '@playwright/test';
import {
  BACKSTAGE_PASSCODE,
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
  LOCAL_BASE_URL,
} from './tests/support/flow-contract';

// The project intentionally has no @types/node dependency. Playwright executes
// this file in Node, so describe only the runtime surface the config consumes.
const env = (
  globalThis as typeof globalThis & {
    process: { env: Record<string, string> };
  }
).process.env;

const externalBaseURL = env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? LOCAL_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(env.CI),
  retries: 0,
  workers: 1,
  timeout: FLOW_BUDGET_MS.test,
  globalTimeout: FLOW_BUDGET_MS.run,
  expect: { timeout: FLOW_BUDGET_MS.assertion },
  outputDir: 'test-results/artifacts',
  reporter: [
    ['list', { printSteps: true }],
    ['json', { outputFile: 'test-results/flow-report.json' }],
  ],
  use: {
    baseURL,
    actionTimeout: FLOW_BUDGET_MS.action,
    navigationTimeout: FLOW_BUDGET_MS.action,
    trace: 'retain-on-failure',
  },
  projects: [
    // The receipt demo flow runs on desktop; pin each project to its spec so the
    // backstage phone flow never executes here (and vice versa).
    {
      name: FLOW_PROJECT.healthy,
      testMatch: /demo-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: FLOW_PROJECT.stalled,
      testMatch: /demo-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // The stakeholder backstage form, driven on a phone device preset (isMobile,
    // touch, phone viewport) — the acceptance's mobile-viewport UI check.
    {
      name: FLOW_PROJECT.backstage,
      testMatch: /backstage-flow\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        // Apply the D1 migration to the local store before `astro dev` takes the
        // binding's lock — race-free and idempotent (already-applied migrations are
        // skipped) — so the backstage form's writes actually persist during the test.
        command:
          'npx wrangler d1 migrations apply BACKSTAGE_DB --local && npm run dev -- --host 127.0.0.1 --port 4323',
        url: LOCAL_BASE_URL,
        timeout: FLOW_BUDGET_MS.serverStartup,
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'pipe',
        env: {
          ...env,
          CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true',
          DEMO_SIGNING_KEY:
            env.DEMO_SIGNING_KEY ?? 'playwright-local-test-key',
          // The shared backstage passcode the form's submissions are gated on. Surfaced
          // into locals.runtime.env via CLOUDFLARE_INCLUDE_PROCESS_ENV, exactly like the
          // signing key. A local test knock, not a secret.
          DEMO_PASSCODE: env.DEMO_PASSCODE ?? BACKSTAGE_PASSCODE,
        },
      },
});
