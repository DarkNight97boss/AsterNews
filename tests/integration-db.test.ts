import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Database PGlite in memoria: prova l'SQL reale (schema + migrazioni) delle funzioni aggiunte nelle ultime tornate.
process.env.PGLITE_DIR = 'memory://';
delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; delete process.env.POSTGRES_PRISMA_URL; delete process.env.POSTGRES_URL_NON_POOLING;

type Repo = typeof import('../src/lib/repo'); type X3 = typeof import('../src/lib/repo-extra3');
let repo: Repo; let x3: X3; let closeDb: () => Promise<void>;
const now = () => new Date().toISOString();
const article = (id: string, p: Record<string, unknown> = {}) => ({ id, slug: id, kicker: '', title: `Titolo ${id}`, subtitle: '', excerpt: '', content: '<p>Testo</p>', coverImage: '', coverCaption: '', categoryId: 'c1', tagIds: [], authorId: 'u1', zoneId: '', address: '', status: 'published' as const, format: 'standard' as const, videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: now(), scheduledAt: null, createdAt: now(), updatedAt: now(), ...p });

beforeAll(async () => { repo = await import('../src/lib/repo'); x3 = await import('../src/lib/repo-extra3'); closeDb = (await import('../src/lib/db')).closeDb; }, 60_000);
afterAll(async () => { await closeDb(); });

describe('articoli: dati extra e cestino', () => {
  it('salva e rilegge la colonna JSON extra', async () => {
    await repo.upsertArticle(article('a1', { extra: { fields: { punteggio: '4' }, corrections: [{ date: now(), text: 'Corretto il nome' }], stage: 1, titleB: 'Titolo B' } }));
    const a = await repo.findArticle('a1'); expect(a?.extra?.fields?.punteggio).toBe('4'); expect(a?.extra?.corrections?.[0].text).toBe('Corretto il nome'); expect(a?.extra?.stage).toBe(1);
  });
  it('patchArticle aggiorna extra senza toccare il resto', async () => {
    await repo.patchArticle('a1', { extra: JSON.stringify({ stage: 2 }) }); const a = await repo.findArticle('a1'); expect(a?.extra?.stage).toBe(2); expect(a?.title).toBe('Titolo a1');
  });
  it('il cestino nasconde e ripristina', async () => {
    await repo.trashArticle('a1'); expect((await repo.listArticles({}, 'updated', 10)).some((a) => a.id === 'a1')).toBe(false); expect(await repo.countTrash()).toBe(1);
    await repo.restoreArticle('a1'); expect((await repo.listArticles({}, 'updated', 10)).some((a) => a.id === 'a1')).toBe(true);
  });
});
describe('media: cestino, duplicati, diritti', () => {
  it('inserisce con i campi nuovi, filtra il cestino e trova i doppioni', async () => {
    const m = (id: string, hash: string) => ({ id, name: `${id}.webp`, url: `/u/${id}.webp`, alt: '', type: 'image' as const, size: 10, uploadedBy: 'u1', createdAt: now(), folder: 'prove', tags: 'test', credit: 'Foto Rossi', license: 'Redazionale', rightsUntil: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), hash, exclusive: true, lat: 41.9, lon: 12.5 });
    await repo.insertMedia(m('m1', 'h1')); await repo.insertMedia(m('m2', 'h1')); await repo.insertMedia(m('m3', 'h2'));
    const list = await repo.listMedia(10); expect(list).toHaveLength(3); expect(list[0].folder).toBe('prove'); expect(list[0].exclusive).toBe(true); expect(list[0].lat).toBeCloseTo(41.9);
    const d = await repo.mediaDuplicates(); expect(d).toHaveLength(1); expect(d[0].items.map((i) => i.id).sort()).toEqual(['m1', 'm2']);
    await repo.setMediaDeleted('m2', now()); expect(await repo.listMedia(10)).toHaveLength(2); expect(await repo.listMediaTrash()).toHaveLength(1); expect(await repo.mediaDuplicates()).toHaveLength(0);
    expect((await repo.mediaRightsExpiring(7)).map((x) => x.id).sort()).toEqual(['m1', 'm3']);
    await repo.updateMediaRow({ ...list[0], credit: 'Ansa' }); expect((await repo.findMedia(list[0].id))?.credit).toBe('Ansa');
  });
});
describe('repo-extra3: funzioni nuove', () => {
  it('blocchi riutilizzabili e contatti', async () => {
    await x3.upsertSnippet({ id: 's1', name: 'Disclaimer', html: '<p>v1</p>', updatedAt: now() }); await x3.upsertSnippet({ id: 's1', name: 'Disclaimer', html: '<p>v2</p>', updatedAt: now() });
    expect((await x3.findSnippet('s1'))?.html).toBe('<p>v2</p>'); expect(await x3.listSnippets()).toHaveLength(1);
    await x3.upsertContact({ id: 'k1', name: 'Mario Rossi', role: 'Portavoce', org: 'Comune', phone: '06', email: 'm@x.it', notes: '', tags: 'comune', createdBy: 'u1', updatedAt: now() });
    expect(await x3.listContacts('comune')).toHaveLength(1); expect(await x3.listContacts('inesistente')).toHaveLength(0);
  });
  it('pagine con dati landing', async () => {
    await x3.upsertPage({ id: 'p1', slug: 'elezioni', title: 'Elezioni', content: '', excerpt: '', status: 'published', template: 'landing', coverImage: '', seo: { title: '', description: '', canonical: '', noIndex: false }, showInMenu: false, menuOrder: 0, authorId: 'u1', createdAt: now(), updatedAt: now(), extra: { brand: '#ff0000', feedTagId: 'elezioni' } });
    expect((await x3.findPageBySlug('elezioni'))?.extra?.brand).toBe('#ff0000');
  });
  it('codici regalo: uso singolo', async () => {
    await x3.insertGift({ id: 'g1', code: 'DONO-TEST', email: 'a@b.it', months: 12, message: '', fromReader: '', redeemedBy: '', createdAt: now(), redeemedAt: null });
    expect((await x3.findGift('DONO-TEST'))?.months).toBe(12); await x3.redeemGift('g1', 'r1'); expect((await x3.findGift('DONO-TEST'))?.redeemedAt).toBeTruthy();
  });
  it('quiz: tiene il punteggio migliore e ordina la classifica', async () => {
    const q = (who: string, score: number) => ({ id: 'q' + Math.random(), quizId: 'qzabc123', articleId: 'a1', who, name: who, score, total: 5, createdAt: now() });
    await x3.upsertQuizResult(q('anna', 3)); await x3.upsertQuizResult(q('anna', 2)); await x3.upsertQuizResult(q('luca', 5));
    const b = await x3.quizLeaderboard('qzabc123'); expect(b.map((r) => [r.who, r.score])).toEqual([['luca', 5], ['anna', 3]]);
  });
  it('web vitals: p75 per dispositivo e pagine peggiori', async () => {
    for (const v of [1000, 2000, 3000, 4000]) await x3.insertVital('/lenta', 'LCP', v, 'mobile');
    const s = await x3.vitalsSummary(7); expect(s.samples).toBe(4); expect(s.p75.mobile.LCP).toBe(4000); expect(s.worst[0].path).toBe('/lenta');
  });
  it('registro consensi', async () => {
    await x3.insertConsent('all', 2, 'hash', 'UA'); await x3.insertConsent('necessary', 2, 'hash', 'UA');
    expect(await x3.consentStats()).toEqual({ all: 1, necessary: 1, total: 2 }); expect((await x3.listConsents())[0].version).toBe(2);
  });
  it('pagespeed: ultimo risultato per pagina', async () => {
    const run = (id: string, perf: number, at: string) => ({ id, url: 'https://x/', strategy: 'mobile' as const, performance: perf, accessibility: 100, bestPractices: 100, seo: 100, lcp: 2000, cls: 0, tbt: 10, fcp: 900, si: 1500, opportunities: [{ id: 'x', title: 'X', displayValue: '', savingsKb: 1, savingsMs: 0, items: [] }], createdAt: at });
    await x3.insertPageSpeedRun(run('r1', 80, '2026-01-01T00:00:00.000Z')); await x3.insertPageSpeedRun(run('r2', 95, '2026-02-01T00:00:00.000Z'));
    const last = await x3.latestPageSpeedRun('https://x/', 'mobile'); expect(last?.performance).toBe(95); expect(last?.opportunities[0].id).toBe('x');
  });
  it('commenti con priorità di moderazione', async () => {
    await repo.insertComment({ id: 'cm1', articleId: 'a1', authorName: 'Tizio', email: 't@x.it', body: 'ciao', status: 'pending', createdAt: now(), readerId: 'r1', parentId: '', flags: 0, votes: 0, staff: false, priority: 0.8, aiNote: 'insulto' });
    const c = (await repo.listComments('pending')).find((x) => x.id === 'cm1'); expect(c?.priority).toBeCloseTo(0.8); expect(c?.aiNote).toBe('insulto');
  });
});

describe('lettori: argomenti seguiti e biglietti', () => {
  it('segui un argomento una sola volta e smetti dal link', async () => {
    const f = (id: string, token: string) => ({ id, tagId: 't1', email: 'a@b.it', readerId: '', token, createdAt: now() });
    await x3.upsertFollow(f('f1', 'tok1')); await x3.upsertFollow(f('f2', 'tok2'));
    expect(await x3.followersOfTags(['t1'])).toHaveLength(1); expect(await x3.deleteFollowByToken('tok1')).toBe(true); expect(await x3.followersOfTags(['t1'])).toHaveLength(0); expect(await x3.deleteFollowByToken('tok1')).toBe(false);
  });
  it('biglietti: pagamento una sola volta, venduti aggiornati, ingresso', async () => {
    await repo.upsertEvent({ id: 'e1', slug: 'serata', title: 'Serata', description: '', type: 'concerti', dateFrom: '2026-12-01', dateTo: null, timeInfo: '', place: 'Teatro', address: '', zoneId: '', price: '10', free: false, image: '', rating: 4, status: 'published', submittedBy: '', createdAt: now(), ticketPrice: 10, ticketsTotal: 50 });
    expect((await repo.findEvent('e1'))?.ticketPrice).toBe(10);
    await x3.insertTicket({ id: 'k1', eventId: 'e1', name: 'Anna', email: 'a@b.it', qty: 2, code: 'TKT-AAAA', status: 'pending', amount: 20, createdAt: now(), usedAt: null });
    expect((await x3.markTicketPaid('k1'))?.status).toBe('paid'); expect(await x3.markTicketPaid('k1')).toBeNull();
    await repo.addTicketsSold('e1', 2); expect((await repo.findEvent('e1'))?.ticketsSold).toBe(2);
    await x3.useTicket('k1'); expect((await x3.findTicketByCode('TKT-AAAA'))?.usedAt).toBeTruthy();
  });
  it('note con frase citata e segnalazioni dei lettori', async () => {
    const x = await import('../src/lib/repo-extra'); await x.insertNote({ id: 'n1', articleId: 'a1', userId: '', kind: 'reader', body: 'Nome sbagliato', resolved: false, createdAt: now(), quote: 'il sindaco Rossi' });
    const n = (await x.listNotes('a1'))[0]; expect(n.kind).toBe('reader'); expect(n.quote).toBe('il sindaco Rossi');
  });
});
