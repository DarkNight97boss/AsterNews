import { expect, test } from '@playwright/test';

const PASSWORD = 'aster2026';
test('la home carica con testata e articoli', async ({ page }) => { await page.goto('/'); await expect(page.locator('h1, h2').first()).toBeVisible(); await expect(page.locator('a[href^="/"]').first()).toBeVisible(); });
test('feed, API e sitemap rispondono', async ({ request }) => { for (const u of ['/feed.xml', '/api/v1/site', '/sitemap.xml', '/feed/google-news.xml']) { const r = await request.get(u); expect(r.status(), u).toBe(200); } });
test('login in redazione, scrittura e pubblicazione di un articolo', async ({ page }) => {
  await page.goto('/login'); await page.getByLabel(/email/i).fill('direttore@asternews.it'); await page.getByLabel(/password/i).fill(PASSWORD); await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.goto('/admin/articoli/nuovo');
  const title = `Test e2e ${Date.now()}`; await page.getByPlaceholder("Titolo dell'articolo").fill(title);
  await page.getByRole('button', { name: /^Pubblica$/ }).click();
  await expect(page.getByText(/pubblicato|revisione/i).first()).toBeVisible({ timeout: 15_000 });
});
test('un lettore può commentare un articolo', async ({ page, request }) => {
  const r = await request.get('/api/v1/articles?limit=1'); const { items } = await r.json(); test.skip(!items?.length, 'nessun articolo');
  await page.goto(new URL(items[0].url).pathname);
  const name = page.getByPlaceholder('Nome'); test.skip(!(await name.count()), 'commenti solo per account');
  await name.fill('Tester'); await page.getByPlaceholder(/email/i).first().fill('tester@example.com'); await page.getByPlaceholder(/commento|risposta/i).first().fill('Commento di prova end-to-end.'); await page.getByRole('button', { name: /invia commento/i }).click();
  await expect(page.getByText(/commento|moderazione/i).first()).toBeVisible();
});
