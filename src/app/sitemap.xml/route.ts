import { countPublished } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

/** Indice delle sitemap: pagine + N blocchi di articoli da 20.000 URL. */
export async function GET() {
  const base = siteUrl();
  const total = await countPublished();
  const chunks = Math.max(1, Math.ceil(total / 20000));
  const now = new Date().toISOString();
  const items = [`<sitemap><loc>${base}/sitemaps/pagine.xml</loc><lastmod>${now}</lastmod></sitemap>`, ...Array.from({ length: chunks }, (_, i) => `<sitemap><loc>${base}/sitemaps/articoli-${i}.xml</loc><lastmod>${now}</lastmod></sitemap>`)].join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}\n</sitemapindex>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' } });
}
