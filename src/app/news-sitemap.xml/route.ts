import { articleUrl, getPublished, getSettings, tag } from '@/lib/queries';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sitemap Google News: solo gli articoli delle ultime 48 ore. */
export function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const s = getSettings();
  const limit = Date.now() - 48 * 3600 * 1000;
  const items = getPublished().filter((a) => !a.seo.noIndex && new Date(a.publishedAt ?? '').getTime() >= limit).slice(0, 1000).map((a) => `
  <url>
    <loc>${base}${articleUrl(a)}</loc>
    <news:news>
      <news:publication><news:name>${esc(s.siteName)}</news:name><news:language>it</news:language></news:publication>
      <news:publication_date>${a.publishedAt}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
      <news:keywords>${esc(a.tagIds.map((t) => tag(t)?.name ?? '').filter(Boolean).join(', '))}</news:keywords>
    </news:news>
  </url>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
