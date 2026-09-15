import { describe, expect, it } from 'vitest';
import { analyze, extractKeywords, optimizeArticle } from '../src/lib/seo-engine';
import type { Article } from '../src/lib/models';

const article = (over: Partial<Article> = {}): Article => ({
  id: 'a_test', slug: 'manovra-approvata-taglio-del-cuneo', kicker: 'Politica', title: 'Manovra approvata dal Consiglio dei ministri: confermato il taglio del cuneo fiscale', subtitle: 'Il governo conferma le misure per il lavoro', excerpt: 'Il Consiglio dei ministri ha approvato la manovra con il taglio del cuneo fiscale.',
  content: '<p>Il Consiglio dei ministri ha approvato la manovra economica. Il taglio del cuneo fiscale resta il cuore del provvedimento, insieme al bonus per le famiglie numerose.</p><h2>Le misure principali</h2><p>Il taglio del cuneo fiscale vale circa dieci miliardi. Le opposizioni parlano di coperture incerte e chiedono un confronto in Parlamento.</p><p>Il testo passa ora alle Camere per l\'approvazione definitiva entro la fine dell\'anno.</p>',
  coverImage: 'https://example.com/foto.jpg', coverCaption: '', categoryId: 'c_politica', tagIds: [], authorId: 'u_1', zoneId: '', address: '', status: 'published', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true,
  seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: '2026-09-15T08:00:00.000Z', scheduledAt: null, createdAt: '2026-09-15T08:00:00.000Z', updatedAt: '2026-09-15T08:00:00.000Z', ...over,
});
const ctx = { siteName: 'ASTER News', existingTitles: [], tags: [{ id: 't1', name: 'Manovra' }, { id: 't2', name: 'Cuneo fiscale' }], linkTargets: [{ id: 'a_2', title: 'Cuneo fiscale, cosa cambia in busta paga', url: '/economia/cuneo-fiscale-busta-paga', phrases: ['cuneo fiscale'] }] };

describe('motore SEO', () => {
  it('estrae parole chiave sensate dal testo', () => {
    const kw = extractKeywords(article().title, 'Politica', article().content, 5);
    expect(kw.length).toBeGreaterThan(0);
    expect(kw.join(' ')).toMatch(/cuneo fiscale|manovra/);
  });
  it('assegna un punteggio tra 0 e 100', () => {
    const r = analyze(article(), ctx);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('compila meta title e description e inserisce link interni senza toccare gli href esistenti', () => {
    const r = optimizeArticle(article(), ctx, { fillMeta: true, links: true, maxLinks: 3, fixImages: true, siteUrl: 'https://asternews.it', overwriteSlug: false });
    expect(r.article.seo.title.length).toBeGreaterThan(10);
    expect(r.article.seo.description.length).toBeGreaterThan(30);
    expect(r.article.content).toContain('href="/economia/cuneo-fiscale-busta-paga"');
    expect(r.article.content).not.toMatch(/href="[^"]*<a /);
  });
  it('un articolo ottimizzato ha un punteggio maggiore o uguale a quello grezzo', () => {
    const raw = analyze(article(), ctx).score;
    const opt = optimizeArticle(article(), ctx, { fillMeta: true, links: true, maxLinks: 3, fixImages: true, siteUrl: 'https://asternews.it', overwriteSlug: false }).article;
    expect(analyze(opt, ctx).score).toBeGreaterThanOrEqual(raw);
  });
});
