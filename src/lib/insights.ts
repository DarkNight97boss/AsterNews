import 'server-only';
import { all } from './db';

const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const num = (v: unknown) => Number(v ?? 0);
export interface AuthorStats { authorId: string; views: number; prevViews: number; readSec: number; articles: number; google: number; social: number }
/** Cruscotto per autore: letture degli ultimi 30 giorni contro i 30 precedenti, tempo medio di lettura, provenienza. */
export async function authorStats(): Promise<AuthorStats[]> {
  const cur = (await all("SELECT a.author_id, SUM(h.count) v, CASE WHEN SUM(h.count) > 0 THEN SUM(h.read_ms) / SUM(h.count) / 1000 ELSE 0 END rs, COUNT(DISTINCT h.article_id) n, SUM(CASE WHEN h.source IN ('google','google news','altri motori') THEN h.count ELSE 0 END) g, SUM(CASE WHEN h.source IN ('meta','x','whatsapp','telegram') THEN h.count ELSE 0 END) so FROM hits h JOIN articles a ON a.id = h.article_id WHERE h.day >= ? GROUP BY a.author_id", [day(30)])) as Record<string, unknown>[];
  const prev = (await all('SELECT a.author_id, SUM(h.count) v FROM hits h JOIN articles a ON a.id = h.article_id WHERE h.day >= ? AND h.day < ? GROUP BY a.author_id', [day(60), day(30)])) as Record<string, unknown>[];
  const pm = new Map(prev.map((r) => [String(r.author_id), num(r.v)]));
  return cur.map((r) => ({ authorId: String(r.author_id), views: num(r.v), prevViews: pm.get(String(r.author_id)) ?? 0, readSec: Math.round(num(r.rs)), articles: num(r.n), google: num(r.g), social: num(r.so) })).sort((a, b) => b.views - a.views);
}
export interface DecliningArticle { articleId: string; title: string; slug: string; categoryId: string; publishedAt: string; recent: number; previous: number; drop: number }
/** Contenuti sempreverdi in calo: articoli con più di 60 giorni che nelle ultime due settimane hanno perso almeno il 40% delle letture. */
export async function decliningArticles(limit = 12): Promise<DecliningArticle[]> {
  const rows = (await all("SELECT a.id, a.title, a.slug, a.category_id, a.published_at, SUM(CASE WHEN h.day >= ? THEN h.count ELSE 0 END) r, SUM(CASE WHEN h.day < ? THEN h.count ELSE 0 END) p FROM hits h JOIN articles a ON a.id = h.article_id WHERE h.day >= ? AND a.status = 'published' AND a.deleted_at IS NULL AND a.published_at < ? GROUP BY a.id, a.title, a.slug, a.category_id, a.published_at", [day(14), day(14), day(28), new Date(Date.now() - 60 * 86400000).toISOString()])) as Record<string, unknown>[];
  return rows.map((r) => ({ articleId: String(r.id), title: String(r.title), slug: String(r.slug), categoryId: String(r.category_id), publishedAt: String(r.published_at ?? ''), recent: num(r.r), previous: num(r.p), drop: num(r.p) ? Math.round((1 - num(r.r) / num(r.p)) * 100) : 0 })).filter((x) => x.previous >= 20 && x.drop >= 40).sort((a, b) => b.previous - a.previous).slice(0, limit);
}
/** Dati per il report dell'inserzionista di un contenuto sponsorizzato. */
export async function sponsorReport(articleId: string, days = 90): Promise<{ views: number; readSec: number; byDay: { day: string; views: number }[]; bySource: { source: string; views: number }[] }> {
  const from = day(days);
  const t = ((await all('SELECT COALESCE(SUM(count),0) v, CASE WHEN SUM(count) > 0 THEN SUM(read_ms) / SUM(count) / 1000 ELSE 0 END rs FROM hits WHERE article_id = ? AND day >= ?', [articleId, from])) as Record<string, unknown>[])[0] ?? {};
  const byDay = ((await all('SELECT day, SUM(count) v FROM hits WHERE article_id = ? AND day >= ? GROUP BY day ORDER BY day', [articleId, from])) as Record<string, unknown>[]).map((r) => ({ day: String(r.day), views: num(r.v) }));
  const bySource = ((await all('SELECT source, SUM(count) v FROM hits WHERE article_id = ? AND day >= ? GROUP BY source ORDER BY v DESC LIMIT 8', [articleId, from])) as Record<string, unknown>[]).map((r) => ({ source: String(r.source), views: num(r.v) }));
  return { views: num(t.v), readSec: Math.round(num(t.rs)), byDay, bySource };
}
/** Archivio storico: conteggi per mese e articoli di un intervallo di date. */
export async function archiveMonths(): Promise<{ month: string; n: number }[]> { return ((await all("SELECT SUBSTR(published_at, 1, 7) m, COUNT(*) n FROM articles WHERE status = 'published' AND deleted_at IS NULL AND published_at IS NOT NULL GROUP BY SUBSTR(published_at, 1, 7) ORDER BY m DESC LIMIT 240")) as Record<string, unknown>[]).map((r) => ({ month: String(r.m), n: num(r.n) })); }
export async function archiveDays(month: string): Promise<{ day: string; n: number }[]> { return ((await all("SELECT SUBSTR(published_at, 1, 10) d, COUNT(*) n FROM articles WHERE status = 'published' AND deleted_at IS NULL AND published_at LIKE ? GROUP BY SUBSTR(published_at, 1, 10) ORDER BY d DESC", [`${month}%`])) as Record<string, unknown>[]).map((r) => ({ day: String(r.d), n: num(r.n) })); }
/** Abbonati a rischio: premium che non accedono da almeno tre settimane. */
export async function churnRisk(limit = 50): Promise<{ id: string; email: string; name: string; lastLogin: string | null; premiumUntil: string | null }[]> {
  return ((await all('SELECT id, email, name, last_login, premium_until FROM readers WHERE premium = 1 AND banned = 0 AND (last_login IS NULL OR last_login < ?) ORDER BY last_login ASC LIMIT ?', [new Date(Date.now() - 21 * 86400000).toISOString(), limit])) as Record<string, unknown>[]).map((r) => ({ id: String(r.id), email: String(r.email), name: String(r.name ?? ''), lastLogin: (r.last_login as string | null) ?? null, premiumUntil: (r.premium_until as string | null) ?? null }));
}
