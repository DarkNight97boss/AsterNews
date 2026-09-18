import { describe, expect, it } from 'vitest';
import { checkArticleSchema } from '../src/lib/schema-check';
import type { Article } from '../src/lib/models';

const base = { id: 'a', slug: 'a', kicker: '', title: 'Titolo giusto', subtitle: '', excerpt: 'Sommario', content: '', coverImage: 'https://x/y.jpg', coverCaption: '', categoryId: 'c', tagIds: [], authorId: 'u', zoneId: '', address: '', status: 'published', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: '2026-01-01T00:00:00.000Z', scheduledAt: null, createdAt: '', updatedAt: '' } as unknown as Article;
describe('dati strutturati', () => {
  it('un articolo completo non ha errori', () => { expect(checkArticleSchema(base, { authorName: 'Anna', siteLogo: true }).filter((i) => i.level === 'error')).toEqual([]); });
  it('segnala immagine e autore mancanti e titolo troppo lungo', () => {
    const r = checkArticleSchema({ ...base, coverImage: '', title: 'x'.repeat(130) }, { authorName: '', siteLogo: false });
    expect(r.filter((i) => i.level === 'error').map((i) => i.text).join(' ')).toMatch(/image mancante[\s\S]*author mancante/); expect(r.some((i) => i.level === 'warn' && i.text.includes('110'))).toBe(true);
  });
  it('formato video senza URL è un errore', () => { expect(checkArticleSchema({ ...base, format: 'video' } as Article, { authorName: 'A', siteLogo: true }).some((i) => i.level === 'error' && i.text.includes('VideoObject'))).toBe(true); });
});
