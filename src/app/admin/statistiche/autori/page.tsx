import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { authorStats, decliningArticles } from '@/lib/insights';
import { getCategories, getUsers } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export default async function AuthorsStatsPage() {
  const me = await requireUser(); if (!can(me, 'stats.view')) redirect('/admin');
  const [stats, users, declining, cats] = await Promise.all([authorStats(), getUsers(), decliningArticles(12), getCategories()]);
  const rows = can(me, 'article.edit.any') ? stats : stats.filter((s) => s.authorId === me.id);
  const delta = (a: number, b: number) => (b ? Math.round((a / b - 1) * 100) : a ? 100 : 0); const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <>
      <div className="page-title"><div><h1>Cruscotto per autore</h1><p>Ultimi 30 giorni contro i 30 precedenti. {can(me, 'article.edit.any') ? 'Tutta la redazione.' : 'Solo i tuoi dati.'}</p></div><div className="actions"><Link className="btn btn-outline" href="/admin/statistiche">← Statistiche</Link></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Autore</th><th style={{ textAlign: 'right' }}>Letture</th><th>Variazione</th><th>Articoli letti</th><th>Tempo medio</th><th>Da Google</th><th>Dai social</th></tr></thead><tbody>
        {rows.map((r) => { const u = users.find((x) => x.id === r.authorId); const d = delta(r.views, r.prevViews); return <tr key={r.authorId}><td><div className="t-user">{u?.avatar && <img src={u.avatar} alt="" />}<b>{u?.name ?? r.authorId}</b></div></td><td style={{ textAlign: 'right', fontWeight: 700 }}>{r.views.toLocaleString('it-IT')}</td><td><span style={{ color: d >= 0 ? '#0b7a4b' : '#d7262d', fontWeight: 700 }}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}%</span> <span className="help">da {r.prevViews.toLocaleString('it-IT')}</span></td><td>{r.articles}</td><td>{mmss(r.readSec)}</td><td>{r.views ? Math.round((r.google / r.views) * 100) : 0}%</td><td>{r.views ? Math.round((r.social / r.views) * 100) : 0}%</td></tr>; })}
        {rows.length === 0 && <tr><td colSpan={7} className="help">Nessuna lettura registrata negli ultimi 30 giorni.</td></tr>}
      </tbody></table></div>
      <div className="panel" style={{ marginTop: 20 }}><div className="panel-title">Contenuti sempreverdi in calo</div><p className="help" style={{ marginBottom: 8 }}>Articoli con più di due mesi che nelle ultime due settimane hanno perso almeno il 40% delle letture: aggiornali (data, dati, titolo) per recuperare posizioni su Google.</p>
        <table className="table"><tbody>{declining.map((a) => <tr key={a.articleId}><td className="t-title"><Link href={`/admin/articoli/${a.articleId}`}>{a.title}</Link><div className="t-sub">{cats.find((c) => c.id === a.categoryId)?.name} · pubblicato il {new Date(a.publishedAt).toLocaleDateString('it-IT')}</div></td><td>{a.previous} → <b>{a.recent}</b></td><td><span className="badge badge-red">−{a.drop}%</span></td><td><Link className="btn btn-outline btn-sm" href={`/admin/articoli/${a.articleId}`}>Aggiorna</Link></td></tr>)}{declining.length === 0 && <tr><td className="help">Nessun contenuto in calo significativo.</td></tr>}</tbody></table>
      </div>
    </>
  );
}
