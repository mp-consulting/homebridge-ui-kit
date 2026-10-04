// Visual and accessibility tests for the component gallery (examples/).
// Run `npm run build && npm run examples` first, then `npm run test:visual`.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const chrome = devices['Desktop Chrome'];

export default defineConfig({
  testDir: 'e2e',
  // Font rendering differs per OS, so baselines are kept per platform.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 },
  },
  webServer: {
    command: `node e2e/serve.js ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'light', use: { ...chrome, colorScheme: 'light' } },
    { name: 'dark', use: { ...chrome, colorScheme: 'dark' } },
    { name: 'narrow', use: { ...chrome, colorScheme: 'light', viewport: { width: 375, height: 812 } } },
    { name: 'rtl', use: { ...chrome, colorScheme: 'light' } },
  ],
});
