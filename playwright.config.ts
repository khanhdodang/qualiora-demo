import { defineConfig, devices } from '@playwright/test';

const fixturePort = process.env.FIXTURE_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${fixturePort}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: process.env.CI ? 'never' : 'on-failure' }],
    ['list'],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve-fixtures.mjs`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: { FIXTURE_PORT: fixturePort },
  },
});
