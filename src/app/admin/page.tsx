import Link from 'next/link';
import { StatusBadge } from '@/components/admin/badges';
import { getCurrentUser } from '@/lib/auth';
import { countByStatus, getActivity, getCategories, getMostRead, getUsers, recentlyUpdated, stats, weakSeo } from '@/lib/queries';
import { timeAgo } from '@/lib/utils';

const compact = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n));

export default async function DashboardPage() {
  const [me, counts, st, top, recent, weak, activity, cats, users] = await Promise.all([getCurrentUser(), countByStatus(), stats(), getMostRead(7), recentlyUpdated(6), weakSeo(5), getActivity(10), getCategories(), getUsers()]);
  const cat = (id: string) => cats.find((c) => c.id === id); const user = (id: string) => users.find((u) => u.id === id);
  const maxViews = Math.max(1, ...top.map((a) => a.views));
  const seoColor = st.seo.avg >= 80 ? '#0b7a4b' : st.seo.avg >= 55 ? '#e67e00' : '#d7262d';
  return (
    <>
      <div className="page-title"><div><h1>Buongiorno, {me?.name.split(' ')[0]} 👋</h1><p>Ecco cosa succede oggi nella redazione.</p></div><div className="actions"><Link href="/admin/scrivi" className="btn btn-primary">✨ Scrivi un articolo</Link><Link href="/admin/articoli/nuovo" className="btn btn-outline">Editor completo</Link></div></div>
      <div className="stats">
        <div className="stat" style={{ ['--stat-color' as string]: '#0b7a4b' }}><div className="stat-label">Pubblicati</div><div className="stat-value">{compact(counts.published)}</div><div className="stat-sub">{st.today} oggi</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#e67e00' }}><div className="stat-label">In revisione</div><div className="stat-value">{counts.review}</div><div className="stat-sub">da approvare</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#8a8a8a' }}><div className="stat-label">Bozze</div><div className="stat-value">{counts.draft}</div><div className="stat-sub">{counts.scheduled} programmati</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Visualizzazioni</div><div className="stat-value">{compact(st.views)}</div><div className="stat-sub">totali</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#e2001a' }}><div className="stat-label">Commenti in attesa</div><div className="stat-value">{st.pendingComments}</div><div className="stat-sub">{st.subscribers} iscritti newsletter</div></div>
      </div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Articoli più letti <Link href="/admin/articoli" className="btn btn-ghost btn-sm">Tutti</Link></div>
            <div className="bars" style={{ marginBottom: 28 }}>{top.map((a) => <div key={a.id} className="bar" style={{ height: `${(a.views / maxViews) * 100}%` }} title={`${a.title} · ${a.views} visualizzazioni`}><span className="bar-label">{compact(a.views)}</span></div>)}</div>
            <table className="table"><tbody>{top.map((a, i) => <tr key={a.id}><td style={{ width: 30, color: 'var(--gray-400)', fontWeight: 800 }}>{i + 1}</td><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link><div className="t-sub">{cat(a.categoryId)?.name} · {user(a.authorId)?.name}</div></td><td style={{ textAlign: 'right', fontWeight: 700 }}>{compact(a.views)}</td></tr>)}</tbody></table>
          </div>
          <div className="panel"><div className="panel-title">Ultimi articoli modificati</div><table className="table"><tbody>{recent.map((a) => <tr key={a.id}><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link><div className="t-sub">{user(a.authorId)?.name} · {timeAgo(a.updatedAt)}</div></td><td><StatusBadge status={a.status} /></td></tr>)}</tbody></table></div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Da fare</div><ul className="activity">
            {counts.review > 0 && <li><span>⏳</span><div><Link href="/admin/articoli?status=review"><b>{counts.review} articoli</b> in attesa di revisione</Link></div></li>}
            {st.pendingComments > 0 && <li><span>💬</span><div><Link href="/admin/commenti"><b>{st.pendingComments} commenti</b> da moderare</Link></div></li>}
            {counts.scheduled > 0 && <li><span>📅</span><div><Link href="/admin/articoli?status=scheduled"><b>{counts.scheduled} articoli</b> programmati</Link></div></li>}
            {st.pendingEvents > 0 && <li><span>📅</span><div><Link href="/admin/eventi"><b>{st.pendingEvents} eventi</b> segnalati da approvare</Link></div></li>}
            {st.newReports > 0 && <li><span>🚧</span><div><Link href="/admin/segnalazioni"><b>{st.newReports} segnalazioni</b> nuove dai lettori</Link></div></li>}
            {!counts.review && !st.pendingComments && !counts.scheduled && !st.pendingEvents && !st.newReports && <li>Tutto in ordine 🎉</li>}
          </ul></div>
          <div className="panel"><div className="panel-title">SEO automatica</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}><div className="seo-ring" style={{ ['--p' as string]: `${st.seo.avg}%`, ['--c' as string]: seoColor }}><span>{st.seo.avg}</span></div><div><b>Punteggio medio</b><div className="help">{compact(st.seo.n)} articoli pubblicati con punteggio</div></div></div>
            {weak.length > 0 ? <ul className="activity">{weak.map((a) => <li key={a.id}><span className="seo-pill" style={{ background: '#d7262d' }}>{a.seoScore}</span><div><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link><div className="a-time">apri e premi «Ottimizza automaticamente»</div></div></li>)}</ul> : <p className="help">Nessun articolo recente sotto la soglia.</p>}
          </div>
          <div className="panel"><div className="panel-title">Attività recente</div><ul className="activity">{activity.map((e) => <li key={e.id}><img src={user(e.userId)?.avatar} alt="" /><div><b>{user(e.userId)?.name}</b> {e.action} <i>{e.target}</i><div className="a-time">{timeAgo(e.createdAt)}</div></div></li>)}</ul></div>
        </div>
      </div>
    </>
  );
}
