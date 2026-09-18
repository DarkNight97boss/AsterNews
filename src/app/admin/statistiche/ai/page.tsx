import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listRecords } from '@/lib/records';
import { findArticle } from '@/lib/repo';
import { AI_SOURCES } from '@/lib/distribution';
import { AiPolicyForm } from '@/components/admin/ai-policy-form';

export const dynamic = 'force-dynamic';
type V = { n: number; path?: string; month: string; articleId?: string };
/** Quanto ci citano le AI: visite arrivate dagli assistenti (referrer o utm_source) e passaggi dei loro crawler sugli articoli. */
export default async function AiStatsPage() {
  const me = await requireUser(); if (!can(me, 'stats.view')) redirect('/admin'); const [visits, crawls, s] = await Promise.all([listRecords<V>('ai-visit', { limit: 3000 }), listRecords<V>('ai-crawl', { limit: 3000 }), getSettings()]);
  const month = new Date().toISOString().slice(0, 7); const name = (id: string) => AI_SOURCES.find((x) => x.id === id)?.name ?? id; const sum = (l: typeof visits) => l.reduce((n, r) => n + r.data.n, 0);
  const bySource = AI_SOURCES.map((src) => ({ id: src.id, visits: sum(visits.filter((v) => v.ref === src.id && v.data.month === month)), crawls: sum(crawls.filter((v) => v.ref === src.id && v.data.month === month)) })).filter((x) => x.visits + x.crawls > 0);
  const pages = new Map<string, { path: string; articleId: string; n: number; sources: Set<string> }>(); for (const v of visits) { const k = v.data.path ?? ''; const cur = pages.get(k) ?? { path: k, articleId: v.data.articleId ?? '', n: 0, sources: new Set<string>() }; cur.n += v.data.n; cur.sources.add(name(v.ref)); pages.set(k, cur); }
  const top = [...pages.values()].sort((a, b) => b.n - a.n).slice(0, 25); const titles = new Map<string, string>(); for (const t of top) if (t.articleId) titles.set(t.articleId, (await findArticle(t.articleId))?.title ?? '');
  const crawled = new Map<string, number>(); for (const c of crawls) crawled.set(c.data.articleId ?? '', (crawled.get(c.data.articleId ?? '') ?? 0) + c.data.n); const topCrawl = [...crawled.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10); for (const [id] of topCrawl) if (!titles.has(id)) titles.set(id, (await findArticle(id))?.title ?? '');
  return (
    <>
      <div className="page-title"><div><h1>Quanto ci citano le AI</h1><p>Le visite che arrivano da ChatGPT, Claude, Perplexity e simili, e gli articoli che i loro crawler leggono di più. Gli articoli in cima sono le domande a cui il tuo sito è la risposta.</p></div><Link className="btn btn-outline" href="/admin/statistiche">Tutte le statistiche</Link></div>
      <div className="stats">{bySource.length === 0 ? <p className="help">Ancora nessuna visita da assistenti AI questo mese.</p> : bySource.map((b) => <div className="stat" key={b.id}><div className="stat-label">{name(b.id)} · questo mese</div><div className="stat-value">{b.visits} <small>visite · {b.crawls} letture del crawler</small></div></div>)}</div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Le pagine a cui rimandano</div>{top.length === 0 ? <p className="help">Nessun dato ancora.</p> : <table className="table"><tbody>{top.map((t) => <tr key={t.path}><td className="t-title">{t.articleId ? <Link href={`/admin/articoli/${t.articleId}`}>{titles.get(t.articleId) || t.path}</Link> : t.path}<div className="help">{[...t.sources].join(', ')}</div></td><td style={{ textAlign: 'right' }}>{t.n}</td></tr>)}</tbody></table>}</div>
        <div className="panel"><div className="panel-title">Gli articoli più letti dai crawler</div>{topCrawl.length === 0 ? <p className="help">Nessun passaggio registrato.</p> : <table className="table"><tbody>{topCrawl.map(([id, n]) => <tr key={id}><td className="t-title"><Link href={`/admin/articoli/${id}`}>{titles.get(id) || id}</Link></td><td style={{ textAlign: 'right' }}>{n}</td></tr>)}</tbody></table>}<p className="help">Se un crawler legge molto un pezzo ma le visite non arrivano, l&apos;assistente risponde senza rimandare a te: vale la pena dirlo in /llms.txt.</p></div>
      </div>
      {can(me, 'settings.manage') && <AiPolicyForm notes={s.aiPolicy?.notes ?? ''} allowTraining={!!s.aiPolicy?.allowTraining} />}
    </>
  );
}
