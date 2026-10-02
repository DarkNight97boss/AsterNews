import { publicContent } from '@/lib/content-render';
import { findArticle } from '@/lib/repo';
import { stripHtml } from '@/lib/utils';

export const dynamic = 'force-dynamic';
/** L'articolo in solo testo: niente HTML, niente immagini, solo le parole. */
export async function GET(_req: Request, ctx: RouteContext<'/1k/[id]'>) { const { id } = await ctx.params; const a = await findArticle(id); if (!a || a.status !== 'published' || a.extra?.circle || a.premium) return new Response('Non trovato', { status: 404 }); const text = stripHtml(await publicContent(a.content)).replace(/\s*\n\s*/g, '\n'); return new Response(`${a.title}\n${a.subtitle ? a.subtitle + '\n' : ''}${a.publishedAt?.slice(0, 10) ?? ''}\n\n${text}\n\n— ${a.byline || ''}\n/1k`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }); }
