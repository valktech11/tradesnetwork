import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,       // single test pro — sequential avoids DB race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Global setup seeds the isolated e2e test pro; teardown deletes all test data
  globalSetup:    './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  use: {
    baseURL: BASE_URL,

    // ── Vercel deployment protection bypass ───────────────────────────────────
    // Sends x-vercel-automation-bypass-secret on every request (page loads +
    // API calls). Without this, Playwright gets a 401 before it can do anything.
    extraHTTPHeaders: {
      'x-vercel-automation-bypass-secret':
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
    },

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile project kept but runs same tests — viewport-sensitive tests skip if wrong size
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  ...(process.env.CI ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
    },
  }),
})
