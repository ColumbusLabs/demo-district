import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/production',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // CI renders with SwiftShader on a small shared runner: one browser at a time, and timeouts
  // sized for software-rendered frames. Local runs keep the fast defaults.
  workers: process.env.CI ? 1 : 2,
  timeout: process.env.CI ? 120_000 : 30_000,
  expect: { timeout: process.env.CI ? 25_000 : 5_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/production-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    // Phone runs only what is phone- or touch-specific; modality-agnostic specs run on desktop.
    // Each district load costs ~10 s under CI's software rendering and the job has 15 minutes.
    { name: 'phone-viewport-chromium', testMatch: /(touch|scaffold)\.spec\./, use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
