import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { findArticle, listCategories, listUsers } from '@/lib/repo';
import { getSettings } from '@/lib/queries';
import { enhanceContent } from '@/lib/content-render';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Esportazione dell'articolo impaginato: ?format=print (pagina pronta per Salva come PDF) oppure ?format=doc (Word). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const me = await getCurrentUser(); const a = await findArticle(id);
  if (!me || !a || !(canEdit(me, a) || me.role === 'editor')) return new Response('Non autorizzato', { status: 401 });
  const format = new URL(req.url).searchParams.get('format') === 'doc' ? 'doc' : 'print';
  const [s, cats, users] = await Promise.all([getSettings(), listCategories(), listUsers()]);
  const cat = cats.find((c) => c.id === a.categoryId)?.name ?? ''; const author = a.byline || users.find((u) => u.id === a.authorId)?.name || '';
  const body = await enhanceContent(a.content);
  const date = new Date(a.publishedAt ?? a.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const css = `@page { size: A4; margin: 18mm; } body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.55; } .kicker { color: #c00; font: 700 12px/1 Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; } h1 { font-size: 30px; line-height: 1.15; margin: 8px 0; } .sub { font-size: 18px; color: #444; margin: 0 0 6px; } .meta { font: 12px Arial, sans-serif; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 16px; } img { max-width: 100%; height: auto; } figcaption { font: 12px Arial, sans-serif; color: #666; } h2 { font-size: 20px; margin-top: 22px; } blockquote { border-left: 3px solid #c00; margin: 14px 0; padding-left: 12px; font-style: italic; } .box { border: 1px solid #ddd; padding: 10px 14px; margin: 14px 0; background: #fafafa; } .footer { margin-top: 30px; font: 11px Arial, sans-serif; color: #777; border-top: 1px solid #ddd; padding-top: 8px; } iframe, .embed-video, .poll-placeholder, .before-after input { display: none; } @media print { .noprint { display: none; } }`;
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(a.title)}</title><style>${css}</style></head><body>${format === 'print' ? '<p class="noprint" style="font:13px Arial,sans-serif;background:#fff3cd;padding:8px 12px">Per il PDF: Stampa → «Salva come PDF». <button onclick="window.print()">Stampa / PDF</button></p>' : ''}<div class="kicker">${esc(a.kicker || cat)}</div><h1>${esc(a.title)}</h1>${a.subtitle ? `<p class="sub">${esc(a.subtitle)}</p>` : ''}<div class="meta">${esc(author)} · ${esc(s.siteName)} · ${date}</div>${a.coverImage ? `<figure><img src="${a.coverImage}" alt="" />${a.coverCaption ? `<figcaption>${esc(a.coverCaption)}</figcaption>` : ''}</figure>` : ''}${body}<div class="footer">© ${esc(s.siteName)} · Riproduzione riservata · ${esc(process.env.NEXT_PUBLIC_SITE_URL ?? '')}</div>${format === 'print' ? '<script>if(location.search.includes("auto=1"))setTimeout(()=>window.print(),400)</script>' : ''}</body></html>`;
  if (format === 'doc') return new Response('﻿' + html, { headers: { 'Content-Type': 'application/msword; charset=utf-8', 'Content-Disposition': `attachment; filename="${a.slug || 'articolo'}.doc"` } });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
