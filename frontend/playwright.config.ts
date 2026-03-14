import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    tsConfig: './tests/e2e/tsconfig.json',
  },
  webServer: {
    command:
      process.env.PLAYWRIGHT_WEB_SERVER ||
      'NEXT_PUBLIC_API_URL= npm run dev -- --port 3001 --hostname 0.0.0.0',
    port: Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT || 3001),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
  ],
})
