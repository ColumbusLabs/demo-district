import { defineConfig } from '@playwright/test';
import production from './playwright.config.mjs';

// Real module-level lifecycle/HMR tests require Vite's development module server.
// Keep this separate so the production bundle is tested independently.
export default defineConfig({
  ...production,
  testDir: './tests/lifecycle',
  outputDir: 'test-results/lifecycle',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/lifecycle-results.json' }]],
  use: { ...production.use, baseURL: 'http://127.0.0.1:5173' },
  // Phone keeps touch, interaction, navigation, and engine lifecycle checks; HMR and graphics
  // switching are modality-agnostic and run on desktop only (CI job limit: 15 minutes).
  projects: production.projects.map(({ testMatch, ...project }) => (project.use?.hasTouch
    ? { ...project, testIgnore: /(hmr|quality)\.spec\./ }
    : project)),
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60_000 },
});
