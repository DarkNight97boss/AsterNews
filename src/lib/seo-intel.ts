import 'server-only';

/** Intelligence SEO: tendenze Google, titoli della concorrenza su Google News, parsing RSS minimale senza dipendenze. */
export interface FeedItem { title: string; link: string; source: string; date: string; extra?: string }
const dec = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/<[^>]+>/g, '').trim();
const tag = (xml: string, t: string) => xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`))?.[1] ?? '';
export function parseRssItems(xml: string, max = 30): FeedItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, max).map((m) => { const it = m[1]; return { title: dec(tag(it, 'title')), link: dec(tag(it, 'link')) || dec(it.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? ''), source: dec(tag(it, 'source')) || dec(tag(it, 'dc:creator')), date: dec(tag(it, 'pubDate')), extra: dec(tag(it, 'ht:approx_traffic') || tag(it, 'description')).slice(0, 200) }; });
}
async function get(url: string): Promise<string> { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ASTERNews' }, signal: AbortSignal.timeout(12_000), next: { revalidate: 900 } }); if (!r.ok) throw new Error(`${r.status} da ${new URL(url).host}`); return r.text(); }
/** Tendenze di ricerca in Italia (ultime 24 ore). */
export async function googleTrends(geo = 'IT'): Promise<FeedItem[]> { return parseRssItems(await get(`https://trends.google.com/trending/rss?geo=${geo}`), 25); }
/** Chi titola cosa su Google News per una parola chiave: utile per capire cosa premia l'algoritmo. */
export async function newsTitles(q: string, max = 15): Promise<FeedItem[]> { return parseRssItems(await get(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=it&gl=IT&ceid=IT:it`), max).map((i) => ({ ...i, title: i.title.replace(/\s-\s[^-]+$/, '') })); }
/** Parole chiave del testo che coincidono con le tendenze: segnale «scrivilo adesso». */
export function matchTrends(text: string, trends: FeedItem[]): FeedItem[] { const t = text.toLowerCase(); return trends.filter((x) => { const w = x.title.toLowerCase().split(/\s+/).filter((k) => k.length > 3); return w.length && w.every((k) => t.includes(k)); }); }
