import 'server-only';
import type { Article, Category, HomeBlock, Tag, Zone } from './models';
import { articlesByCategory, getCategories, getTags, getZones, listPublished } from './queries';

export interface ResolvedBlock { block: HomeBlock; title: string; link: string; articles: Article[]; groups?: { title: string; link: string; articles: Article[] }[] }
/** Trasforma i blocchi configurati nel builder in dati pronti per il rendering (una query per blocco, articoli già usati esclusi). */
export async function resolveHomeBlocks(blocks: HomeBlock[], used: Set<string>): Promise<ResolvedBlock[]> {
  if (!blocks.length) return [];
  const [cats, tags, zones] = await Promise.all([getCategories(), getTags(), getZones()]);
  const out: ResolvedBlock[] = [];
  const take = (arr: Article[], n: number) => { const r = arr.filter((a) => !used.has(a.id)).slice(0, n); r.forEach((a) => used.add(a.id)); return r; };
  for (const bl of blocks) {
    const n = Math.min(12, Math.max(1, bl.count || 4));
    if (bl.type === 'latest') out.push({ block: bl, title: bl.title || 'Ultime notizie', link: '/notizie', articles: take(await listPublished({}, n + used.size), n) });
    else if (bl.type === 'category') {
      const list: Category[] = bl.sourceId === '*' ? cats.filter((c) => c.showOnHome && c.kind === 'standard') : cats.filter((c) => c.id === bl.sourceId);
      if (bl.sourceId === '*') out.push({ block: bl, title: bl.title, link: '', articles: [], groups: (await Promise.all(list.map(async (c) => ({ title: c.name, link: `/${c.slug}`, articles: take(await articlesByCategory(c.id, n + 6), n) })))).filter((g) => g.articles.length) });
      else for (const c of list) out.push({ block: bl, title: bl.title || c.name, link: `/${c.slug}`, articles: take(await articlesByCategory(c.id, n + 6), n) });
    } else if (bl.type === 'tag') { const t = tags.find((x: Tag) => x.id === bl.sourceId || x.slug === bl.sourceId); if (t) out.push({ block: bl, title: bl.title || t.name, link: `/tag/${t.slug}`, articles: take(await listPublished({ tagId: t.id }, n + 6), n) }); }
    else if (bl.type === 'zone') {
      const list: Zone[] = bl.sourceId === '*' ? zones.slice(0, 6) : zones.filter((z) => z.id === bl.sourceId);
      if (bl.sourceId === '*') out.push({ block: bl, title: bl.title || 'Dalle zone', link: '/zone', articles: [], groups: (await Promise.all(list.map(async (z) => ({ title: z.name, link: `/zone/${z.slug}`, articles: take(await listPublished({ zoneId: z.id }, n + 4), Math.min(n, 2)) })))).filter((g) => g.articles.length) });
      else for (const z of list) out.push({ block: bl, title: bl.title || z.name, link: `/zone/${z.slug}`, articles: take(await listPublished({ zoneId: z.id }, n + 6), n) });
    } else if (bl.type === 'format') out.push({ block: bl, title: bl.title || bl.sourceId, link: bl.sourceId === 'video' ? '/video' : bl.sourceId === 'gallery' ? '/foto' : '/notizie', articles: take(await listPublished({ format: (bl.sourceId || 'video') as Article['format'] }, n + 4), n) });
    else out.push({ block: bl, title: bl.title, link: '', articles: [] });
  }
  return out.filter((r) => r.articles.length || r.groups?.length || ['events', 'mostread', 'newsletter', 'html'].includes(r.block.type));
}
