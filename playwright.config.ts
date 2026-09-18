import { defineConfig } from '@playwright/test';
/** Test end-to-end sui flussi chiave (home, login, scrittura e pubblicazione, commento). In CI parte un server locale su PGlite con i dati demo. */
export default defineConfig({
  testDir: 'e2e', timeout: 60_000, retries: process.env.CI ? 1 : 0, reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100', trace: 'retain-on-failure', locale: 'it-IT' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'SETUP_DISABLED=1 DEMO_MODE=1 npx next dev -p 3100', url: 'http://localhost:3100', reuseExistingServer: true, timeout: 120_000 },
});
