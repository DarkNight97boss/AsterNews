import { articleUrlWith, countPublished, getCategories, getEvents, getZones, listPublished } from '@/lib/queries';
import { listTags } from '@/lib/repo';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
const CHUNK = 20000;
const base = () => siteUrl();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urlset = (items: string) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}\n</urlset>`;
const xml = (body: string) => new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' } });

/** Sitemap a blocchi: /sitemaps/pagine.xml, /sitemaps/articoli-0.xml, /sitemaps/articoli-1.xml, … (max 20.000 URL ciascuna). */
export async function GET(_req: Request, { params }: RouteContext<'/sitemaps/[name]'>) {
  const { name } = await params;
  const b = base();
  if (name === 'pagine.xml') {
    const [cats, zones, events, tags] = await Promise.all([getCategories(), getZones(), getEvents({}, 5000), listTags(20000)]);
    const items = [
      `<url><loc>${b}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
      ...['/notizie', '/eventi', '/zone', '/meteo', '/segnalazioni', '/video', '/foto'].map((p) => `<url><loc>${b}${p}</loc><changefreq>daily</changefreq></url>`),
      ...cats.map((c) => `<url><loc>${b}/${c.slug}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`),
      ...zones.map((z) => `<url><loc>${b}/zone/${z.slug}</loc><changefreq>daily</changefreq></url>`),
      ...events.map((e) => `<url><loc>${b}/eventi/${esc(e.slug)}</loc><changefreq>weekly</changefreq></url>`),
      ...tags.map((t) => `<url><loc>${b}/tag/${esc(t.slug)}</loc><changefreq>weekly</changefreq><priority>0.4</priority></url>`),
    ].join('\n');
    return xml(urlset(items));
  }
  const m = name.match(/^articoli-(\d+)\.xml$/);
  if (!m) return new Response('Not found', { status: 404 });
  const n = Number(m[1]);
  const cats = await getCategories();
  const items = (await listPublished({}, CHUNK, n * CHUNK)).filter((a) => !a.seo.noIndex).map((a) => `<url><loc>${b}${esc(articleUrlWith(a, cats))}</loc><lastmod>${a.updatedAt}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`).join('\n');
  return xml(urlset(items));
}


