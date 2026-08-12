import { defineConfig } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL || 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'node node_modules/next/dist/bin/next dev -p 3001',
        url: 'http://127.0.0.1:3001/en/e2e/visual-search-product-flow',
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          NEXT_PUBLIC_E2E: '1',
        },
      },
});
