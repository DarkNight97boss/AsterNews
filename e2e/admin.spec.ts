import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? (process.env.E2E_BASE_URL ? '' : 'admin@asternews.it');
const PASSWORD = process.env.E2E_PASSWORD ?? (process.env.E2E_BASE_URL ? '' : 'aster2026');
const PAGES = ['/admin', '/admin/articoli', '/admin/articoli?cestino=1', '/admin/articoli/nuovo', '/admin/scrivi', '/admin/calendario', '/admin/scaletta', '/admin/fiducia', '/admin/officina', '/admin/contatti', '/admin/statistiche', '/admin/statistiche/autori', '/admin/categorie', '/admin/tag', '/admin/media', '/admin/mobile', '/admin/pagine', '/admin/blocchi', '/admin/eventi', '/admin/eventi/biglietti', '/admin/zone', '/admin/redazione', '/admin/commenti', '/admin/segnalazioni', '/admin/newsletter', '/admin/social', '/admin/annunci', '/admin/lettori', '/admin/utenti', '/admin/impostazioni', '/admin/adatta', '/admin/menu', '/admin/home', '/admin/api', '/admin/donazioni', '/admin/importa', '/admin/redirect', '/admin/pubblicita', '/admin/edizioni', '/admin/estensioni', '/admin/aggiornamenti', '/admin/backup', '/admin/errori', '/admin/prestazioni', '/admin/sicurezza', '/admin/privacy', '/admin/rilascio', '/admin/ai-uso', '/admin/attivita', '/admin/profilo', '/admin/guida'];

test.describe('redazione', () => {
  test.skip(!EMAIL || !PASSWORD, 'credenziali e2e non impostate');
  test.beforeEach(async ({ page }) => { await page.goto('/login'); await page.getByLabel('Email').fill(EMAIL); await page.getByLabel('Password').fill(PASSWORD); await page.getByRole('button', { name: /^accedi$/i }).click(); await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 }); });

  // Va per primo: il menu tiene in primo piano le voci già aperte, e il test successivo le apre tutte.
  test('adatta il CMS: con il profilo «blog personale» il menu parla di post e si accorcia', async ({ page }) => {
    await page.goto('/admin/adatta'); const before = await page.locator('.admin-sidebar nav a').count();
    await page.getByRole('button', { name: /Blog personale/ }).click(); await page.getByRole('button', { name: /salva e applica/i }).click(); await expect(page.getByText(/si è adattato/i)).toBeVisible({ timeout: 15_000 });
    await page.reload(); await expect(page.locator('.admin-sidebar nav').getByRole('link', { name: /Post/ }).first()).toBeVisible(); await expect(page.getByRole('button', { name: /Altro/ })).toBeVisible();
    expect(await page.locator('.admin-sidebar nav a').count()).toBeLessThan(before);
    await page.getByRole('button', { name: /Quotidiano/ }).click(); await page.getByRole('button', { name: /salva e applica/i }).click(); await expect(page.getByText(/si è adattato/i)).toBeVisible({ timeout: 15_000 });
  });

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

  test('scrittura a strati e scatola nera: il lettore sceglie la profondità', async ({ page }) => {
    await page.goto('/admin/articoli/nuovo'); const title = `Strati e2e ${Date.now()}`; await page.getByPlaceholder("Titolo dell'articolo").fill(title);
    await page.getByRole('button', { name: 'Blocchi', exact: true }).click(); await page.locator('.blk-plus').first().click(); await page.getByRole('button', { name: /Paragrafo a strati/ }).click();
    const areas = page.locator('.blk-layered textarea'); await areas.nth(0).fill('Versione breve.'); await areas.nth(1).fill('Versione normale del passaggio.'); await areas.nth(2).fill('Versione completa con tutti i dettagli e il contesto.');
    await page.getByRole('button', { name: /^Pubblica$/ }).click(); const live = page.getByRole('link', { name: /vedi sul sito/i }); await expect(live).toBeVisible({ timeout: 20_000 }); await page.goto((await live.getAttribute('href'))!);
    await expect(page.getByText('Versione normale del passaggio.')).toBeVisible(); await expect(page.getByText('Versione breve.')).toBeHidden();
    await page.getByRole('slider').fill('1'); await expect(page.getByText('Versione breve.')).toBeVisible(); await expect(page.getByText('Versione normale del passaggio.')).toBeHidden();
    await page.getByRole('slider').fill('3'); await expect(page.getByText(/tutti i dettagli/)).toBeVisible();
  });
  test('fiducia: etichetta, stato di verifica, firma verificabile e replica approvata', async ({ page, request }) => {
    await page.goto('/admin/articoli/nuovo'); const title = `Fiducia e2e ${Date.now()}`; await page.getByPlaceholder("Titolo dell'articolo").fill(title);
    await page.getByLabel("Che cos'è questo testo").selectOption('inchiesta'); await page.getByLabel('Stato di verifica').selectOption('developing'); await page.getByLabel(/Cosa non sappiamo ancora/).fill('Chi ha firmato il contratto?');
    await page.getByRole('button', { name: /^Pubblica$/ }).click(); const live = page.getByRole('link', { name: /vedi sul sito/i }); await expect(live).toBeVisible({ timeout: 20_000 }); const url = (await live.getAttribute('href'))!; await page.goto(url);
    await expect(page.getByText("Etichetta dell'articolo")).toBeVisible(); await expect(page.getByText('In evoluzione')).toBeVisible(); await expect(page.getByText('Chi ha firmato il contratto?')).toBeVisible();
    const verify = await page.getByRole('link', { name: /verifica l.autenticità/i }).getAttribute('href'); const v = await (await request.get(verify!)).json(); expect(v).toMatchObject({ signed: true, authentic: true, intact: true });
    await page.getByText(/Chiedi il diritto di replica/).click(); await page.getByLabel('Nome e cognome').fill('Mario Rossi'); await page.locator('.reply-ask').getByLabel('Email').fill('mario@example.com'); await page.getByLabel('Testo della replica').fill('Preciso che il contratto citato non è mai stato firmato dal sottoscritto e lo posso documentare.');
    await page.getByRole('button', { name: /invia alla redazione/i }).click(); await expect(page.getByText(/Richiesta ricevuta/)).toBeVisible({ timeout: 15_000 });
    await page.goto('/admin/fiducia'); await expect(page.getByText('Mario Rossi')).toBeVisible(); await page.getByRole('button', { name: /Pubblica sotto l.articolo/ }).first().click(); await expect(page.getByText('Mario Rossi')).toBeHidden({ timeout: 15_000 });
    await page.goto(url); await expect(page.getByText(/Replica di Mario Rossi/)).toBeVisible(); await page.goto('/domande-aperte'); await expect(page.getByText('Chi ha firmato il contratto?')).toBeVisible();
  });
  test('officina: tre appunti maturano in un tema, un numero vivo e una nota d\'autore arrivano al lettore', async ({ page }) => {
    const key = `residenti${Date.now().toString(36)}`; await page.goto('/admin/officina');
    for (const n of ['La piscina comunale è chiusa da mesi', 'Costi della piscina da chiedere in Comune', 'I genitori protestano per la piscina']) { await page.getByLabel('Nuovo appunto').fill(n); await page.getByRole('button', { name: 'Annota' }).click(); await expect(page.locator('.seed-list').getByText(n)).toBeVisible({ timeout: 15_000 }); }
    await expect(page.getByText(/Hai 3 appunti su «piscin/)).toBeVisible();
    await page.getByLabel('Chiave').fill(key); await page.getByLabel('Valore').fill('48.312'); await page.getByLabel('Fonte').fill('ISTAT'); await page.getByRole('button', { name: 'Salva dato' }).click(); await expect(page.getByText(`{{dato:${key}}}`).first()).toBeVisible({ timeout: 15_000 });
    await page.goto('/admin/articoli/nuovo'); await page.getByPlaceholder("Titolo dell'articolo").fill(`Officina e2e ${Date.now()}`);
    await page.getByRole('button', { name: 'Blocchi', exact: true }).click(); await page.locator('.blk-plus').first().click(); await page.getByRole('button', { name: /¶ Paragrafo/ }).click();
    await page.locator('.blk-edit').first().click(); await page.keyboard.type(`I residenti sono {{dato:${key}}} secondo il Comune. [[nota: qui ho tagliato due paragrafi]] Fine.`);
    await page.getByRole('button', { name: /^Pubblica$/ }).click(); const live = page.getByRole('link', { name: /vedi sul sito/i }); await expect(live).toBeVisible({ timeout: 20_000 }); await page.goto((await live.getAttribute('href'))!);
    await expect(page.locator('.live-datum')).toHaveText('48.312'); await expect(page.getByText('qui ho tagliato due paragrafi')).toBeHidden();
    await page.getByRole('button', { name: /Note dell.autore/ }).click(); await expect(page.getByText('qui ho tagliato due paragrafi')).toBeVisible();
  });
});
