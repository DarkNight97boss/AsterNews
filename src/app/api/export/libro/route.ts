import { collectionArticles, personalLists } from '@/lib/actions-personal';
import { listArticles } from '@/lib/repo';
import { getSettings, getUsers } from '@/lib/queries';
import { stripCircles } from '@/lib/circles';
import { buildEpub, buildPrintHtml } from '@/lib/book';
import { guardRate } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
/** Libro dal blog: una raccolta oppure un periodo (?dal=AAAA-MM-GG&al=…), in EPUB o in HTML impaginato per la stampa. Solo contenuti pubblici. */
export async function GET(req: Request) {
  if (await guardRate('libro', 6, 600_000)) return new Response('Troppe richieste', { status: 429 }); const q = new URL(req.url).searchParams; const slug = q.get('raccolta'); const format = q.get('formato') === 'html' ? 'html' : 'epub'; const [s, users] = await Promise.all([getSettings(), getUsers()]);
  let title = s.siteName; let arts;
  if (slug) { const c = (await personalLists()).collections.find((x) => x.data.slug === slug); if (!c) return new Response('Raccolta non trovata', { status: 404 }); title = c.data.title; arts = await collectionArticles(c.data.query, 80); }
  else { const from = q.get('dal') ?? `${new Date().getFullYear()}-01-01`; const to = q.get('al') ?? new Date().toISOString(); title = `${s.siteName}, ${from.slice(0, 4)}`; arts = (await listArticles({ status: 'published', from, to }, 'published', 120)).reverse(); }
  arts = arts.filter((a) => !a.premium); if (!arts.length) return new Response('Nessun articolo nel periodo', { status: 404 });
  const author = [...new Set(arts.map((a) => users.find((u) => u.id === a.authorId)?.name).filter(Boolean))].slice(0, 3).join(', ') || s.siteName; const chapters = arts.map((a) => ({ title: a.title, date: new Date(a.publishedAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }), html: stripCircles(a.content) }));
  if (format === 'html') return new Response(buildPrintHtml({ title, author }, chapters), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
  const file = buildEpub({ title, author, id: `urn:aster:${slug ?? 'periodo'}:${Date.now()}`, date: new Date().toISOString() }, chapters); return new Response(Buffer.from(file), { headers: { 'Content-Type': 'application/epub+zip', 'Content-Disposition': `attachment; filename="${(slug ?? 'libro').replace(/[^a-z0-9-]/gi, '')}.epub"`, 'X-Robots-Tag': 'noindex' } });
}
