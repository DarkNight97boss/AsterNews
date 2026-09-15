import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings } from '@/lib/queries';
import { findArticle } from '@/lib/repo';
import { hitsByDay, hitsByHour, hitsBySource, hitsTotals, topArticlesByHits, countPushSubscriptions, mostCommented } from '@/lib/repo-extra';
import { DEFAULT_ANALYTICS } from '@/lib/models';

const fmt = (n: number) => n.toLocaleString('it-IT');
const sec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

function Bars({ data, labels, color = '#22418f', height = 120 }: { data: number[]; labels: string[]; color?: string; height?: number }) {
  const max = Math.max(1, ...data); const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height + 18}`} preserveAspectRatio="none" role="img" aria-label="Grafico a barre" style={{ width: '100%', height: height + 40 }}>
      {data.map((v, i) => <g key={i}><rect x={i * w + w * 0.15} y={height - (v / max) * height} width={w * 0.7} height={(v / max) * height} fill={color} rx={0.6}><title>{`${labels[i]}: ${fmt(v)}`}</title></rect>{(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && <text x={i * w + w / 2} y={height + 12} fontSize={data.length > 14 ? 3 : 4} textAnchor="middle" fill="#666">{labels[i]}</text>}</g>)}
    </svg>
  );
}

export default async function StatsPage({ searchParams }: PageProps<'/admin/statistiche'>) {
  const me = await requireUser();
  if (!can(me, 'stats.view')) redirect('/admin');
  const sp = await searchParams; const days = Math.min(365, Math.max(1, Number(sp.giorni) || 30));
  const s = await getSettings(); const enabled = { ...DEFAULT_ANALYTICS, ...(s.analytics ?? {}) }.enabled;
  const today = new Date().toISOString().slice(0, 10);
  const [byDay, byHour, bySource, top, totals, totalsPrev, push, commented, cats] = await Promise.all([hitsByDay(days), hitsByHour(today), hitsBySource(days), topArticlesByHits(days, 15), hitsTotals(days), hitsTotals(days * 2), countPushSubscriptions(), mostCommented(6, days), getCategories()]);
  const prev = Math.max(0, totalsPrev.views - totals.views);
  const delta = prev ? Math.round(((totals.views - prev) / prev) * 100) : 0;
  const dayMap = new Map(byDay.map((d) => [d.day, d.views]));
  const daysList = Array.from({ length: days }, (_, i) => { const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10); return { day: d, views: dayMap.get(d) ?? 0 }; });
  const hourMap = new Map(byHour.map((h) => [h.hour, h.views]));
  const topArticles = await Promise.all(top.map(async (t) => ({ ...t, article: await findArticle(t.articleId) })));
  const commentedArticles = await Promise.all(commented.map(async (c) => ({ ...c, article: await findArticle(c.articleId) })));
  const srcTotal = Math.max(1, bySource.reduce((a, b) => a + b.views, 0));
  return (
    <>
      <div className="page-title"><div><h1>Statistiche</h1><p>Letture misurate dal sito stesso, senza cookie e senza dati personali. {!enabled && <b style={{ color: 'var(--red)' }}>Raccolta disattivata nelle Impostazioni.</b>}</p></div>
        <div className="actions">{[7, 30, 90].map((d) => <Link key={d} href={`/admin/statistiche?giorni=${d}`} className={`btn btn-sm ${days === d ? 'btn-dark' : 'btn-outline'}`}>{d} giorni</Link>)}</div></div>
      <div className="stats">
        <div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Pagine viste</div><div className="stat-value">{fmt(totals.views)}</div><div className="stat-sub">{prev ? `${delta >= 0 ? '+' : ''}${delta}% sul periodo precedente` : `ultimi ${days} giorni`}</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#0b7a4b' }}><div className="stat-label">Tempo medio di lettura</div><div className="stat-value">{sec(totals.readSec)}</div><div className="stat-sub">per pagina</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#e67e00' }}><div className="stat-label">Pagine diverse lette</div><div className="stat-value">{fmt(totals.paths)}</div><div className="stat-sub">nel periodo</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#d7262d' }}><div className="stat-label">Iscritti push</div><div className="stat-value">{fmt(push)}</div><div className="stat-sub">ricevono le ultim&apos;ora</div></div>
      </div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Pagine viste per giorno</div><Bars data={daysList.map((d) => d.views)} labels={daysList.map((d) => d.day.slice(8) + '/' + d.day.slice(5, 7))} /></div>
          <div className="panel"><div className="panel-title">Oggi, per ora (UTC)</div><Bars data={Array.from({ length: 24 }, (_, h) => hourMap.get(h) ?? 0)} labels={Array.from({ length: 24 }, (_, h) => String(h))} color="#0b7a4b" height={80} /></div>
          <div className="panel"><div className="panel-title">Articoli più letti</div>
            <table className="table"><thead><tr><th>#</th><th>Articolo</th><th style={{ textAlign: 'right' }}>Letture</th><th style={{ textAlign: 'right' }}>Tempo</th></tr></thead><tbody>
              {topArticles.map((t, i) => <tr key={t.articleId}><td style={{ color: 'var(--gray-400)', fontWeight: 800 }}>{i + 1}</td><td className="t-title">{t.article ? <Link href={`/admin/articoli/${t.article.id}`}>{t.article.title}</Link> : t.path}<div className="t-sub">{cats.find((c) => c.id === t.article?.categoryId)?.name}</div></td><td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(t.views)}</td><td style={{ textAlign: 'right' }}>{sec(t.readSec)}</td></tr>)}
              {topArticles.length === 0 && <tr><td colSpan={4} className="help">Ancora nessun dato: le letture compaiono qui man mano che arrivano.</td></tr>}
            </tbody></table>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Da dove arrivano i lettori</div>
            {bySource.map((sr) => <div key={sr.source} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{sr.source}</span><b>{Math.round((sr.views / srcTotal) * 100)}%</b></div><div style={{ height: 6, background: 'var(--gray-200)', borderRadius: 3 }}><div style={{ width: `${(sr.views / srcTotal) * 100}%`, height: '100%', background: '#22418f', borderRadius: 3 }} /></div></div>)}
            {bySource.length === 0 && <p className="help">Nessun dato.</p>}
          </div>
          <div className="panel"><div className="panel-title">Più commentati</div>
            <ul className="activity">{commentedArticles.map((c) => <li key={c.articleId}><span className="seo-pill" style={{ background: '#22418f' }}>{c.n}</span><div>{c.article ? <Link href={`/admin/articoli/${c.article.id}`}>{c.article.title}</Link> : c.articleId}</div></li>)}{commentedArticles.length === 0 && <li className="help">Nessun commento nel periodo.</li>}</ul>
          </div>
          <div className="panel"><div className="panel-title">Come funziona</div><p className="help">Ogni pagina invia una segnalazione anonima al caricamento e il tempo di lettura all&apos;uscita. Non vengono salvati indirizzi IP, cookie o identificativi: i dati sono aggregati per giorno, ora, pagina e sorgente. Puoi affiancare Vercel Analytics dalle Impostazioni.</p></div>
        </div>
      </div>
    </>
  );
}
