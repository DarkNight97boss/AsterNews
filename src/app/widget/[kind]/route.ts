import { articleUrlWith, getCategories, getEvents, getPublished, getSettings, listPublished } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Widget incorporabili in siti terzi (iframe): ultime notizie, eventi, meteo. Vedi /api/widget.js per il caricatore. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params; const u = new URL(req.url); const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n')) || 5)); const catSlug = u.searchParams.get('category') ?? ''; const theme = u.searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const [s, cats] = await Promise.all([getSettings(), getCategories()]); const base = siteUrl(); const cat = cats.find((c) => c.slug === catSlug);
  let title = s.siteName; let items = '';
  if (kind === 'eventi') { const ev = await getEvents({}, n); title = 'Cosa fare in città'; items = ev.map((e) => `<li><a href="${base}/eventi/${esc(e.slug)}" target="_blank" rel="noopener">${esc(e.title)}</a><span>${esc(new Date(e.dateFrom).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }))}</span></li>`).join(''); }
  else if (kind === 'meteo') { title = `Meteo ${s.weatherCity}`; items = `<li><iframe src="${base}/meteo?embed=1" style="width:100%;height:140px;border:0"></iframe></li>`; }
  else { const arts = cat ? await listPublished({ categoryId: cat.id }, n) : await getPublished(n); title = cat ? cat.name : 'Ultime notizie'; items = arts.map((a) => `<li>${a.coverImage ? `<img src="${esc(a.coverImage)}" alt="" loading="lazy">` : ''}<a href="${base}${articleUrlWith(a, cats)}?utm_source=widget" target="_blank" rel="noopener">${esc(a.title)}</a></li>`).join(''); }
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:${theme === 'dark' ? '#111' : '#fff'};color:${theme === 'dark' ? '#eee' : '#111'}}.h{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:3px solid #22418f;font-weight:800}.h a{color:inherit;text-decoration:none;font-size:12px;opacity:.7}ul{list-style:none;margin:0;padding:0}li{display:flex;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid ${theme === 'dark' ? '#333' : '#eee'};font-size:14px}li img{width:56px;height:38px;object-fit:cover;flex:none}li a{color:inherit;text-decoration:none;font-weight:600;line-height:1.3}li a:hover{text-decoration:underline}li span{margin-left:auto;font-size:12px;opacity:.7;white-space:nowrap}</style></head><body><div class="h"><span>${esc(title)}</span><a href="${base}" target="_blank" rel="noopener">${esc(s.siteName)} ↗</a></div><ul>${items}</ul></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Content-Security-Policy': 'frame-ancestors *' } });
}
