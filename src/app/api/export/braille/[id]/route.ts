import { findArticle } from '@/lib/repo';
import { publicContent } from '@/lib/content-render';
import { toBrf } from '@/lib/formats';
import { stripHtml } from '@/lib/utils';

/** Articolo in Braille (file .brf, grado 1 italiano) per le stampanti delle associazioni. */
export async function GET(_req: Request, ctx: RouteContext<'/api/export/braille/[id]'>) {
  const a = await findArticle((await ctx.params).id); if (!a || a.status !== 'published' || a.extra?.circle || a.premium) return new Response('Non trovato', { status: 404 });
  const text = `${a.title}. ${a.subtitle ? a.subtitle + '. ' : ''}${stripHtml(await publicContent(a.content))}`;
  return new Response(toBrf(text), { headers: { 'Content-Type': 'text/plain; charset=us-ascii', 'Content-Disposition': `attachment; filename="${a.slug.slice(0, 60)}.brf"`, 'X-Robots-Tag': 'noindex' } });
}
