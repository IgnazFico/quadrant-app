import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Projects:
 *  - "smoke"  : runs on every PR. Fast, reliable, excludes live-login.spec.ts
 *              which needs a seeded database with a real user.
 *  - "e2e"    : runs on demand (workflow_dispatch / manual). Full suite including
 *              live-login.spec.ts against the staging backend.
 *  - "chromium", "firefox", "webkit" : legacy multi-browser projects. Included for
 *              backwards compatibility; prefer "smoke" for CI gates.
 */
export default defineConfig({
  testDir: './tests',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. */
  reporter: 'html',

  /* Shared settings for all projects. */
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  /**
   * Projects.
   *
   * The "smoke" project is the CI gate: it runs on every PR and excludes
   * live-login.spec.ts, which requires a real backend with a seeded user.
   * The "e2e" project is for full regression runs (manual or scheduled).
   */
  projects: [
    {
      name: 'smoke',
      testMatch: ['**/*.spec.ts', '!live-login.spec.ts', '!week-desktop.spec.ts', '!weekly-review-loop.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: true,
      workers: process.env.CI ? 1 : undefined,
      retries: process.env.CI ? 2 : 0,
    },

    {
      name: 'e2e',
      testMatch: ['**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: true,
      workers: 1,
      retries: process.env.CI ? 2 : 0,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /*
   * Run your local dev server before starting the tests.
   * In CI, env vars (DATABASE_URL etc.) are provided by the workflow,
   * so the dev server connects to the staging database.
   */
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
});
