import 'server-only';
import { metaGet, metaSet } from './db';
import * as repo from './repo';
import * as x3 from './repo-extra3';
import { aiAvailable, askJson, clip } from './ai';
import { getSettings } from './queries';
import { parseRssItems } from './seo-intel';
import { slugify, uid } from './utils';
import type { Article } from './models';

/** Rassegna mattutina: legge i feed scelti, raggruppa le notizie delle ultime 24 ore e prepara bozze «da valutare» per la riunione. */
export async function runBriefing(force = false): Promise<string> {
  const s = await getSettings(); const b = s.briefing; if (!b?.enabled && !force) return 'disattivata';
  const feeds = (b?.feeds ?? '').split('\n').map((x) => x.trim()).filter((x) => /^https?:\/\//.test(x)).slice(0, 12); if (!feeds.length) return 'nessun feed impostato';
  if (!(await aiAvailable())) return 'assistente AI non configurato';
  const today = new Date().toISOString().slice(0, 10); if (!force && (await metaGet('briefing_day')) === today) return 'già fatta oggi';
  const items: { title: string; link: string; source: string; extra?: string }[] = [];
  for (const f of feeds) { try { const r = await fetch(f, { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'ASTERNews-briefing' } }); if (!r.ok) continue; const host = new URL(f).hostname.replace(/^www\./, ''); for (const it of parseRssItems(await r.text(), 25)) { if (it.date && Date.now() - new Date(it.date).getTime() > 36 * 3600000) continue; items.push({ title: it.title, link: it.link, source: it.source || host, extra: it.extra }); } } catch { /* feed non raggiungibile */ } }
  if (!items.length) return 'nessuna notizia recente nei feed';
  const n = Math.min(10, Math.max(1, b?.count ?? 5));
  const picks = await askJson<{ title: string; kicker: string; summary: string; angle: string; sources: number[] }[]>(`Sei il caporedattore di «${s.siteName}» (${s.description}). Dall'elenco di notizie delle ultime ore scegli le ${n} più rilevanti per i nostri lettori, unendo quelle sullo stesso fatto. Per ciascuna: "title" (titolo nostro, non copiato), "kicker" (occhiello breve), "summary" (3-4 frasi con i fatti certi, senza inventare), "angle" (il taglio locale o l'approfondimento che possiamo dare noi), "sources" (indici delle notizie usate). Rispondi SOLO con un array JSON.\n\n${clip(items.map((it, i) => `${i}. [${it.source}] ${it.title}${it.extra ? ' — ' + it.extra.slice(0, 140) : ''}`).join('\n'), 14000)}`, { maxTokens: 3500, effort: 'medium', action: 'rassegna mattutina' });
  const [cats, users] = await Promise.all([repo.listCategories(), repo.listUsers()]); const author = users.find((u) => u.role === 'admin' && u.active) ?? users[0]; const cat = cats.find((c) => c.kind === 'standard') ?? cats[0]; if (!author || !cat) return 'mancano autore o categoria';
  const now = new Date().toISOString(); let made = 0;
  for (const p of (Array.isArray(picks) ? picks : []).slice(0, n)) {
    const src = (p.sources ?? []).map((i) => items[i]).filter(Boolean); const id = uid('a');
    const a: Article = { id, slug: `${slugify(p.title).slice(0, 70)}-${id.slice(-4)}`, kicker: p.kicker || 'Da valutare', title: p.title, subtitle: '', excerpt: p.summary, content: `<p>${p.summary}</p>\n<div class="box box-info"><b>Il nostro taglio</b><p>${p.angle}</p></div>`, coverImage: '', coverCaption: '', categoryId: cat.id, tagIds: [], authorId: author.id, zoneId: '', address: '', status: 'draft', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now, extra: { template: 'rassegna', sources: src.map((x) => ({ name: x.source, contact: x.link, note: x.title, verified: false })) } };
    await repo.upsertArticle(a); made++;
  }
  await metaSet('briefing_day', today);
  for (const u of users.filter((x) => ['admin', 'editor'].includes(x.role) && x.active)) await x3.insertNotification({ id: uid('nt'), userId: u.id, kind: 'briefing', text: `☕ Rassegna mattutina: ${made} bozze da valutare`, url: '/admin/scaletta', read: false, createdAt: now }).catch(() => {});
  return `${made} bozze create da ${items.length} notizie`;
}
