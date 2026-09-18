import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listArticles } from '@/lib/repo';
import { getCategories, getSettings, getUsers } from '@/lib/queries';
import { stripCircles } from '@/lib/circles';
import { zipStore } from '@/lib/zip';

export const dynamic = 'force-dynamic'; export const maxDuration = 120;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
/**
 * Sito in scatola: uno ZIP di pagine HTML semplici (un indice, una pagina per articolo, un foglio di stile), senza JavaScript né server.
 * Si apre con un doppio clic tra cinquant'anni. Le immagini restano collegate all'indirizzo originale. Solo amministratori, oppure l'erede con il gettone personale ricevuto per email.
 */
export async function GET(req: Request) {
  const me = await getCurrentUser(); const key = (new URL(req.url).searchParams.get('chiave') ?? '').replace(/[^\w-]/g, '');
  if (!(me && can(me, 'settings.manage'))) { const { findRecord } = await import('@/lib/records'); const t = key.length >= 20 ? await findRecord(`xt_${key}`) : undefined; if (!t || t.kind !== 'export-token' || (t.dueAt && t.dueAt < new Date().toISOString())) return new Response('Non autorizzato', { status: 401 }); }
  const [s, cats, users, arts] = await Promise.all([getSettings(), getCategories(), getUsers(), listArticles({ status: 'published' }, 'published', 5000)]);
  const page = (title: string, body: string, depth = 0) => `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="${'../'.repeat(depth)}stile.css"></head><body><header><a href="${'../'.repeat(depth)}index.html">${esc(s.siteName)}</a></header><main>${body}</main><footer>Copia statica di ${esc(s.siteName)} creata il ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}. Si legge senza internet, tranne le immagini.</footer></body></html>`;
  const file = (a: (typeof arts)[number]) => `articoli/${(a.publishedAt ?? '').slice(0, 10)}-${a.slug.slice(0, 80)}.html`; const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const years = [...new Set(arts.map((a) => (a.publishedAt ?? '').slice(0, 4)))];
  const files = [
    { name: 'LEGGIMI.txt', data: `${s.siteName}\n\nApri index.html con qualunque browser. Non serve un server, non serve internet (tranne che per le immagini).\nArticoli: ${arts.length}. Creato il ${new Date().toISOString().slice(0, 10)}.\nI testi sono anche in dati/articoli.json, in un formato che qualunque programma futuro saprà leggere.\n` },
    { name: 'stile.css', data: 'body{font-family:Georgia,serif;line-height:1.65;max-width:42em;margin:0 auto;padding:1em;color:#111;background:#fffdf8}header a{font:900 1.4em Arial,sans-serif;color:#111;text-decoration:none}header{border-bottom:3px double #111;padding-bottom:.5em;margin-bottom:1.5em}h1{line-height:1.15}img{max-width:100%;height:auto}.meta{color:#666;font:0.85em Arial,sans-serif}footer{margin-top:3em;border-top:1px solid #ccc;padding-top:1em;color:#666;font:0.8em Arial,sans-serif}li{margin:.4em 0}blockquote{border-left:3px solid #999;margin-left:0;padding-left:1em}' },
    { name: 'index.html', data: page(s.siteName, `<h1>${esc(s.siteName)}</h1><p>${esc(s.tagline ?? '')}</p>${years.map((y) => `<h2>${y}</h2><ul>${arts.filter((a) => (a.publishedAt ?? '').startsWith(y)).map((a) => `<li><a href="${file(a)}">${esc(a.title)}</a> <span class="meta">${day(a.publishedAt)} · ${esc(cats.find((c) => c.id === a.categoryId)?.name ?? '')}</span></li>`).join('')}</ul>`).join('')}`) },
    ...arts.map((a) => ({ name: file(a), data: page(a.title, `<article><p class="meta">${esc(cats.find((c) => c.id === a.categoryId)?.name ?? '')} · ${day(a.publishedAt)} · ${esc(a.byline || users.find((u) => u.id === a.authorId)?.name || '')}</p><h1>${esc(a.title)}</h1>${a.subtitle ? `<p><em>${esc(a.subtitle)}</em></p>` : ''}${a.coverImage ? `<img src="${esc(a.coverImage)}" alt="">` : ''}${stripCircles(a.content).replace(/<(script|iframe)[\s\S]*?<\/\1>/gi, '')}${(a.extra?.corrections ?? []).map((c) => `<p class="meta">Correzione del ${day(c.date)}: ${esc(c.text)}</p>`).join('')}</article>`, 1) })),
    { name: 'dati/articoli.json', data: JSON.stringify(arts.map((a) => ({ titolo: a.title, sottotitolo: a.subtitle, data: a.publishedAt, sezione: cats.find((c) => c.id === a.categoryId)?.name, autore: a.byline || users.find((u) => u.id === a.authorId)?.name, testo: stripCircles(a.content), immagine: a.coverImage })), null, 1) },
  ];
  return new Response(Buffer.from(zipStore(files)), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="sito-in-scatola-${new Date().toISOString().slice(0, 10)}.zip"`, 'X-Robots-Tag': 'noindex' } });
}
