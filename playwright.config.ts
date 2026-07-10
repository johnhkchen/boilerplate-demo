import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import {
  BACKSTAGE_PASSCODE,
  FLOW_BUDGET_MS,
  FLOW_PROJECT,
  LOCAL_BASE_URL,
} from './tests/support/flow-contract';

// Isolated Wrangler config for the owned dev server. It lives outside the repo root, so
// Wrangler does NOT load the developer's repo-root `.dev.vars` (which may pin a different
// DEMO_PASSCODE/DEMO_SIGNING_KEY); the deterministic values below come from process env
// instead. astro.config.mjs reads DEMO_WRANGLER_CONFIG_PATH into platformProxy. Absolute so
// it resolves regardless of Wrangler's cwd handling.
const backstageWranglerConfigPath = fileURLToPath(
  new URL('./tests/support/backstage.wrangler.jsonc', import.meta.url),
);

// Playwright's webServer expects defined string values. Drop any unset process
// variables before forwarding the environment to the owned dev server.
const env = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] =>
    entry[1] !== undefined),
);

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
          // Astro 7 daemonizes dev servers for detected coding agents. Playwright
          // needs the process to remain in the foreground so it can own cleanup.
          CODEX_THREAD_ID: '',
          CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true',
          // Point the emulated runtime at the isolated config so `.dev.vars` cannot
          // override these values with machine-specific ones. The store binding lives
          // there too; local D1 state persists under the repo-root `.wrangler/state`.
          DEMO_WRANGLER_CONFIG_PATH: backstageWranglerConfigPath,
          DEMO_SIGNING_KEY:
            env.DEMO_SIGNING_KEY ?? 'playwright-local-test-key',
          // The shared backstage passcode the form's submissions are gated on. Surfaced
          // into locals.runtime.env via CLOUDFLARE_INCLUDE_PROCESS_ENV. A local test
          // knock, not a secret. Pinned (not `?? env`) so it can never drift from the
          // value the spec presents from the flow contract.
          DEMO_PASSCODE: BACKSTAGE_PASSCODE,
        },
      },
});
