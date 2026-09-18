import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listArticles } from '@/lib/repo';
import { listRedirects } from '@/lib/repo-extra';
import { articleUrlWith, getCategories } from '@/lib/queries';
import { redirectMap } from '@/lib/rhythm';

export const dynamic = 'force-dynamic';
/** Uscita pulita: la mappa di tutti gli indirizzi del sito verso lo schema del nuovo sistema (?schema=/%slug%/ oppure /%anno%/%mese%/%slug%/), più i redirect già esistenti. */
export async function GET(req: Request) {
  const me = await getCurrentUser(); if (!me || !can(me, 'settings.manage')) return new Response('Non autorizzato', { status: 401 }); const q = new URL(req.url).searchParams; const format = (['csv', 'netlify', 'nginx', 'apache', 'wordpress'].includes(q.get('formato') ?? '') ? q.get('formato') : 'csv') as 'csv'; const schema = q.get('schema') || '/%slug%/';
  const [arts, cats, existing] = await Promise.all([listArticles({ status: 'published' }, 'published', 20000), getCategories(), listRedirects(5000)]);
  const target = (a: (typeof arts)[number]) => schema.replace('%slug%', a.slug).replace('%anno%', (a.publishedAt ?? '').slice(0, 4)).replace('%mese%', (a.publishedAt ?? '').slice(5, 7)).replace('%sezione%', cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie');
  const map = [...arts.map((a) => ({ from: articleUrlWith(a, cats), to: target(a) })), ...existing.map((r) => ({ from: r.fromPath, to: r.toPath }))];
  return new Response(redirectMap(map, format), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="redirect-${format}.${format === 'csv' || format === 'wordpress' ? 'csv' : 'txt'}"` } });
}
