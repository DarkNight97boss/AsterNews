import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { DEFAULT_API } from '@/lib/models';
import { articleUrlWith, getCategories, getEvents, getSettings, getTags, getZones, listPublished, search, tagsByIds, user } from '@/lib/queries';
import { findArticleBySlug } from '@/lib/repo';
import { findApiKeyByHash } from '@/lib/repo-extra3';
import { checkLimit } from '@/lib/ratelimit';
import { siteUrl } from '@/lib/site-url';
import type { Article } from '@/lib/models';
import { stripCircles } from '@/lib/circles';

export const dynamic = 'force-dynamic';

/**
 * API pubblica in sola lettura (JSON):
 *   GET /api/v1/articles?category=slug&zone=slug&tag=slug&limit=20&offset=0
 *   GET /api/v1/articles/{slug}
 *   GET /api/v1/search?q=testo
 *   GET /api/v1/categories · /api/v1/tags · /api/v1/zones · /api/v1/events
 * Chiave (se richiesta): intestazione Authorization: Bearer <chiave> oppure ?key=.
 */
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(data, { status, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60', ...headers } });

async function serialize(a: Article, cats: Awaited<ReturnType<typeof getCategories>>, full = false) {
  const base = siteUrl(); const cat = cats.find((c) => c.id === a.categoryId);
  const [author, tags] = await Promise.all([user(a.authorId), tagsByIds(a.tagIds)]);
  return { id: a.id, slug: a.slug, url: `${base}${articleUrlWith(a, cats)}`, title: a.title, kicker: a.kicker, subtitle: a.subtitle, excerpt: a.excerpt, image: a.coverImage, category: cat ? { id: cat.id, slug: cat.slug, name: cat.name } : null, author: author ? { id: author.id, name: author.name } : null, tags: tags.map((t) => ({ slug: t.slug, name: t.name })), format: a.format, premium: !!a.premium, publishedAt: a.publishedAt, updatedAt: a.updatedAt, ...(full ? { content: stripCircles(a.content), faq: a.faq ?? [], gallery: a.gallery, videoUrl: a.videoUrl } : {}) };
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const s = await getSettings(); const cfg = { ...DEFAULT_API, ...(s.api ?? {}) };
  if (!cfg.enabled) return json({ error: 'API disattivata' }, 404);
  const u = new URL(req.url); const ip = (req.headers.get('x-forwarded-for') ?? 'ip').split(',')[0].trim();
  const auth = req.headers.get('authorization') ?? ''; const key = u.searchParams.get('key') ?? (auth.startsWith('Bearer ') ? auth.slice(7) : '');
  let keyId = '';
  if (key) { const k = await findApiKeyByHash(createHash('sha256').update(key).digest('hex')); if (!k) return json({ error: 'Chiave non valida' }, 401); keyId = k.id; }
  if (cfg.requireKey && !keyId) return json({ error: 'Serve una chiave API (Authorization: Bearer …)' }, 401);
  const rl = checkLimit(`api:${keyId || ip}`, cfg.rateLimitPerMinute, 60_000);
  if (!rl.ok) return json({ error: 'Troppe richieste' }, 429, { 'Retry-After': String(rl.retryAfter) });
  const { path } = await params; const [res, id] = path;
  const limit = Math.min(50, Math.max(1, Number(u.searchParams.get('limit')) || 20)); const offset = Math.max(0, Number(u.searchParams.get('offset')) || 0);
  const cats = await getCategories();
  try {
    if (res === 'articles' && id) { const a = await findArticleBySlug(id, true); return a ? json(await serialize(a, cats, true)) : json({ error: 'Non trovato' }, 404); }
    if (res === 'articles') {
      const [zones, tags] = await Promise.all([getZones(), getTags()]);
      const cat = cats.find((c) => c.slug === u.searchParams.get('category')); const zone = zones.find((z) => z.slug === u.searchParams.get('zone')); const tag = tags.find((t) => t.slug === u.searchParams.get('tag'));
      const list = await listPublished({ categoryId: cat?.id, zoneId: zone?.id, tagId: tag?.id, ...(u.searchParams.get('featured') === '1' ? { featured: true } : {}) }, limit, offset);
      return json({ items: await Promise.all(list.map((a) => serialize(a, cats))), limit, offset });
    }
    if (res === 'search') { const q = u.searchParams.get('q') ?? ''; const r = await search(q, limit, offset); return json({ query: q, total: r.total, items: await Promise.all(r.items.map((a) => serialize(a, cats))) }); }
    if (res === 'categories') return json(cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, kind: c.kind, url: `${siteUrl()}/${c.slug}` })));
    if (res === 'tags') return json((await getTags()).map((t) => ({ slug: t.slug, name: t.name, url: `${siteUrl()}/tag/${t.slug}` })));
    if (res === 'zones') return json((await getZones()).map((z) => ({ id: z.id, slug: z.slug, name: z.name, kind: z.kind, url: `${siteUrl()}/zone/${z.slug}` })));
    if (res === 'events') return json((await getEvents({}, limit)).map((e) => ({ id: e.id, slug: e.slug, title: e.title, type: e.type, dateFrom: e.dateFrom, dateTo: e.dateTo, place: e.place, address: e.address, free: e.free, price: e.price, image: e.image, url: `${siteUrl()}/eventi/${e.slug}` })));
    if (res === 'site') return json({ name: s.siteName, tagline: s.tagline, description: s.description, url: siteUrl(), endpoints: ['/api/v1/articles', '/api/v1/articles/{slug}', '/api/v1/search?q=', '/api/v1/categories', '/api/v1/tags', '/api/v1/zones', '/api/v1/events'] });
    return json({ error: 'Endpoint sconosciuto', endpoints: ['/api/v1/site'] }, 404);
  } catch (e) { console.error('[api v1]', e); return json({ error: 'Errore interno' }, 500); }
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } }); }
