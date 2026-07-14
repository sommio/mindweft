import { defineConfig, devices } from '@playwright/test';

/**
 * PWA / 离线 E2E。针对 production build（`next start`）运行，
 * 因为 Serwist 在 dev 关闭 Service Worker，离线回退只能对生产构建验证。
 */
export default defineConfig({
  testDir: '.',
  use: { baseURL: 'http://127.0.0.1:3100' },
  webServer: [
    {
      command: 'STUB_OPENAI_PORT=8788 node e2e/fixtures/stub-openai-server.mjs',
      cwd: '..',
      url: 'http://127.0.0.1:8788/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm exec next start -p 3100',
      cwd: '..',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        DATABASE_URL: './data/e2e-pwa.db',
        MINDWEFT_E2E: '1',
        DRIZZLE_MIGRATIONS_FOLDER: '../../packages/db/drizzle',
      },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
