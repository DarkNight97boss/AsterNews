import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? (process.env.E2E_BASE_URL ? '' : 'admin@asternews.it');
const PASSWORD = process.env.E2E_PASSWORD ?? (process.env.E2E_BASE_URL ? '' : 'aster2026');
const PAGES = ['/admin', '/admin/articoli', '/admin/articoli?cestino=1', '/admin/articoli/nuovo', '/admin/scrivi', '/admin/calendario', '/admin/scaletta', '/admin/contatti', '/admin/statistiche', '/admin/statistiche/autori', '/admin/categorie', '/admin/tag', '/admin/media', '/admin/mobile', '/admin/pagine', '/admin/blocchi', '/admin/eventi', '/admin/eventi/biglietti', '/admin/zone', '/admin/redazione', '/admin/commenti', '/admin/segnalazioni', '/admin/newsletter', '/admin/social', '/admin/annunci', '/admin/lettori', '/admin/utenti', '/admin/impostazioni', '/admin/menu', '/admin/home', '/admin/api', '/admin/donazioni', '/admin/importa', '/admin/redirect', '/admin/pubblicita', '/admin/edizioni', '/admin/estensioni', '/admin/aggiornamenti', '/admin/backup', '/admin/errori', '/admin/prestazioni', '/admin/sicurezza', '/admin/privacy', '/admin/rilascio', '/admin/ai-uso', '/admin/attivita', '/admin/profilo', '/admin/guida'];

test.describe('redazione', () => {
  test.skip(!EMAIL || !PASSWORD, 'credenziali e2e non impostate');
  test.beforeEach(async ({ page }) => { await page.goto('/login'); await page.getByLabel('Email').fill(EMAIL); await page.getByLabel('Password').fill(PASSWORD); await page.getByRole('button', { name: /^accedi$/i }).click(); await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 }); });

  test('tutte le pagine di redazione si aprono senza errori', async ({ page }) => {
    test.setTimeout(300_000);
    const problems: string[] = []; const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    for (const url of PAGES) {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0; const body = await page.locator('body').innerText();
      if (status >= 400) problems.push(`${url}: HTTP ${status}`);
      else if (/Application error|Unhandled Runtime Error|does not exist|Internal Server Error/i.test(body)) problems.push(`${url}: ${body.slice(0, 160).replace(/\s+/g, ' ')}`);
      else if (!(await page.locator('h1').first().isVisible().catch(() => false))) problems.push(`${url}: nessun titolo h1`);
    }
    expect(problems, problems.join('\n')).toEqual([]);
    expect(pageErrors.filter((e) => !/hydrat/i.test(e)), pageErrors.join('\n')).toEqual([]);
  });

  test('il log di sicurezza registra l\'accesso appena fatto', async ({ page }) => { await page.goto('/admin/sicurezza'); await expect(page.getByText(EMAIL).first()).toBeVisible(); await expect(page.getByText('Accesso', { exact: true }).first()).toBeVisible(); });

  test('rubrica contatti: crea e ritrova un contatto', async ({ page }) => {
    await page.goto('/admin/contatti'); await page.getByRole('button', { name: /nuovo contatto/i }).click();
    const name = `Contatto e2e ${Date.now()}`; await page.locator('.modal input').first().fill(name); await page.getByRole('button', { name: /^salva$/i }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  });

  test('builder della home: un blocco salvato compare in home', async ({ page }) => {
    await page.goto('/admin/home'); await page.getByRole('button', { name: /aggiungi blocco/i }).click();
    const title = `Blocco e2e ${Date.now()}`; const block = page.locator('.hb-block').last(); await block.locator('select').first().selectOption('latest'); await block.locator('input').first().fill(title);
    await page.getByRole('button', { name: /salva home/i }).click(); await expect(page.getByText(/home salvata/i)).toBeVisible({ timeout: 15_000 });
    await page.goto('/'); await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });
});
