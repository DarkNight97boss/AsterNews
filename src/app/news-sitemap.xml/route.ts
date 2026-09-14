import { articleUrlWith, getCategories, getPublished, getSettings, getTags } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Sitemap Google News: solo gli articoli delle ultime 48 ore (max 1000). */
export async function GET() {
  const base = siteUrl();
  const [s, cats, tags, recent] = await Promise.all([getSettings(), getCategories(), getTags(), getPublished(1000)]);
  const tmap = new Map(tags.map((t) => [t.id, t.name]));
  const limit = Date.now() - 48 * 3600 * 1000;
  const items = recent.filter((a) => !a.seo.noIndex && new Date(a.publishedAt ?? '').getTime() >= limit).map((a) => `
  <url><loc>${base}${esc(articleUrlWith(a, cats))}</loc><news:news><news:publication><news:name>${esc(s.siteName)}</news:name><news:language>it</news:language></news:publication><news:publication_date>${a.publishedAt}</news:publication_date><news:title>${esc(a.title)}</news:title><news:keywords>${esc(a.tagIds.map((t) => tmap.get(t) ?? '').filter(Boolean).join(', '))}</news:keywords></news:news></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}\n</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
