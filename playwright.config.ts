import { defineConfig } from '@playwright/test';

/**
 * Test end-to-end sui flussi chiave. Due modi:
 *  - contro un server già acceso: E2E_BASE_URL=http://localhost:3100 npm run e2e
 *  - ambiente usa e getta (CI e `npm run e2e:isolated`): database PGlite temporaneo con dati demo, build di produzione su porta separata.
 */
const port = Number(process.env.E2E_PORT ?? 3101);
export default defineConfig({
  testDir: 'e2e', timeout: 90_000, retries: process.env.CI ? 1 : 0, workers: 1, reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`, trace: 'retain-on-failure', locale: 'it-IT' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: `npx next start -p ${port}`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 120_000, env: { SETUP_DISABLED: '1', DEMO_MODE: '1', PGLITE_DIR: process.env.PGLITE_DIR ?? 'data/pg-e2e', DATABASE_URL: '', POSTGRES_URL: '', POSTGRES_PRISMA_URL: '', POSTGRES_URL_NON_POOLING: '' } },
});
