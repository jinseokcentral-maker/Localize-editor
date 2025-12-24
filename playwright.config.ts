import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:3001',
    trace: 'on-first-retry',
    headless: process.env.CI ? true : false, // CI에서는 headless, 로컬에서는 브라우저 표시
  },
  projects: [
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
  ],
  webServer: {
    command: process.env.TEST_PORT ? `PORT=${process.env.TEST_PORT} pnpm dev` : 'pnpm dev',
    url: process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:3001',
    reuseExistingServer: true, // CI에서도 기존 서버 재사용 (포트 충돌 방지)
  },
});


