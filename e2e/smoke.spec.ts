import { expect, test } from '@playwright/test';

// Nell'ambiente usa e getta si usano gli account demo (DEMO_MODE=1). Contro un server esistente servono E2E_EMAIL ed E2E_PASSWORD, altrimenti il login viene saltato.
const EMAIL = process.env.E2E_EMAIL ?? (process.env.E2E_BASE_URL ? '' : 'admin@asternews.it');
const PASSWORD = process.env.E2E_PASSWORD ?? (process.env.E2E_BASE_URL ? '' : 'aster2026');
test('la home carica con testata e articoli', async ({ page }) => { await page.goto('/'); await expect(page.locator('h1, h2').first()).toBeVisible(); await expect(page.locator('a[href^="/"]').first()).toBeVisible(); });
test('feed, API e sitemap rispondono', async ({ request }) => { for (const u of ['/feed.xml', '/api/v1/site', '/sitemap.xml', '/feed/google-news.xml', '/archivio', '/pubblicita', '/notifiche', '/podcast', '/storie', '/trasparenza', '/correzioni', '/previsioni', '/domande-aperte', '/attenzione', '/riprendi', '/colazione', '/mappa', '/percorsi', '/adesso', '/uso', '/raccolte', '/corrispondenze', '/lettere-al-futuro', '/ospiti', '/quaderno', '/api/export/libro?formato=html', '/comunita', '/assemblea', '/competenze', '/taccuino', '/domande-al-comune', '/bacheca', '/archivio-fotografico', '/ascolto', '/abbonamento-sospeso', '/tessera', '/llms.txt', '/schermo', '/stampa/tutto']) { const r = await request.get(u); expect(r.status(), u).toBe(200); } });
test('login in redazione, scrittura e pubblicazione di un articolo', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'credenziali e2e non impostate');
  await page.goto('/login'); await page.getByLabel(/email/i).fill(EMAIL); await page.getByLabel(/password/i).fill(PASSWORD); await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.goto('/admin/articoli/nuovo');
  const title = `Test e2e ${Date.now()}`; await page.getByPlaceholder("Titolo dell'articolo").fill(title);
  await page.getByRole('button', { name: /^Pubblica$/ }).click();
  const live = page.getByRole('link', { name: /vedi sul sito/i }); await expect(live).toBeVisible({ timeout: 20_000 });
  const href = await live.getAttribute('href'); await page.goto(href!); await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
});
test('un lettore può commentare un articolo', async ({ page, request }) => {
  const r = await request.get('/api/v1/articles?limit=1'); const { items } = await r.json(); test.skip(!items?.length, 'nessun articolo');
  await page.goto(new URL(items[0].url).pathname);
  const name = page.getByLabel('Nome', { exact: true }); test.skip(!(await name.count()), 'commenti solo per account');
  await name.fill('Tester'); await page.getByLabel(/Email \(non pubblicata\)/).fill('tester@example.com'); await page.getByLabel('Commento', { exact: true }).fill('Commento di prova end-to-end.'); await page.getByRole('button', { name: /invia commento/i }).click();
  await expect(page.getByText(/commento|moderazione/i).first()).toBeVisible();
});
