import Link from 'next/link';
import { StatusBadge } from '@/components/admin/badges';
import { getCurrentUser } from '@/lib/auth';
import { category, countByStatus, getActivity, getAllArticles, getAllEvents, getComments, getMostRead, getPublished, getReports, getSubscribers, user } from '@/lib/queries';
import { timeAgo } from '@/lib/utils';

const compact = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n));

export default async function DashboardPage() {
  const me = await getCurrentUser();
  const counts = countByStatus();
  const totalViews = getAllArticles().reduce((s, a) => s + a.views, 0);
  const pending = getComments().filter((c) => c.status === 'pending').length;
  const pendingEvents = getAllEvents().filter((e) => e.status === 'pending').length;
  const newReports = getReports().filter((r) => r.status === 'new').length;
  const top = getMostRead().slice(0, 7);
  const maxViews = Math.max(1, ...top.map((a) => a.views));
  const recent = [...getAllArticles()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const today = getPublished().filter((a) => new Date(a.publishedAt!).toDateString() === new Date().toDateString()).length;
  return (
    <>
      <div className="page-title">
        <div><h1>Buongiorno, {me?.name.split(' ')[0]} 👋</h1><p>Ecco cosa succede oggi nella redazione.</p></div>
        <div className="actions"><Link href="/admin/articoli/nuovo" className="btn btn-primary">+ Nuovo articolo</Link></div>
      </div>
      <div className="stats">
        <div className="stat" style={{ ['--stat-color' as string]: '#0b7a4b' }}><div className="stat-label">Pubblicati</div><div className="stat-value">{counts.published}</div><div className="stat-sub">{today} oggi</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#e67e00' }}><div className="stat-label">In revisione</div><div className="stat-value">{counts.review}</div><div className="stat-sub">da approvare</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#8a8a8a' }}><div className="stat-label">Bozze</div><div className="stat-value">{counts.draft}</div><div className="stat-sub">{counts.scheduled} programmati</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Visualizzazioni</div><div className="stat-value">{compact(totalViews)}</div><div className="stat-sub">totali</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#e2001a' }}><div className="stat-label">Commenti in attesa</div><div className="stat-value">{pending}</div><div className="stat-sub">{getSubscribers().length} iscritti newsletter</div></div>
      </div>
      <div className="admin-grid-2">
        <div>
          <div className="panel">
            <div className="panel-title">Articoli più letti <Link href="/admin/articoli" className="btn btn-ghost btn-sm">Tutti</Link></div>
            <div className="bars" style={{ marginBottom: 28 }}>
              {top.map((a) => <div key={a.id} className="bar" style={{ height: `${(a.views / maxViews) * 100}%` }} title={`${a.title} · ${a.views} visualizzazioni`}><span className="bar-label">{compact(a.views)}</span></div>)}
            </div>
            <table className="table"><tbody>
              {top.map((a, i) => (
                <tr key={a.id}><td style={{ width: 30, color: 'var(--gray-400)', fontWeight: 800 }}>{i + 1}</td>
                  <td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link><div className="t-sub">{category(a.categoryId)?.name} · {user(a.authorId)?.name}</div></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{compact(a.views)}</td></tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel">
            <div className="panel-title">Ultimi articoli modificati</div>
            <table className="table"><tbody>
              {recent.map((a) => (
                <tr key={a.id}><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link><div className="t-sub">{user(a.authorId)?.name} · {timeAgo(a.updatedAt)}</div></td><td><StatusBadge status={a.status} /></td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
        <div>
          <div className="panel">
            <div className="panel-title">Da fare</div>
            <ul className="activity">
              {counts.review > 0 && <li><span>⏳</span><div><Link href="/admin/articoli?status=review"><b>{counts.review} articoli</b> in attesa di revisione</Link></div></li>}
              {pending > 0 && <li><span>💬</span><div><Link href="/admin/commenti"><b>{pending} commenti</b> da moderare</Link></div></li>}
              {counts.scheduled > 0 && <li><span>📅</span><div><Link href="/admin/articoli?status=scheduled"><b>{counts.scheduled} articoli</b> programmati</Link></div></li>}
              {pendingEvents > 0 && <li><span>📅</span><div><Link href="/admin/eventi"><b>{pendingEvents} eventi</b> segnalati da approvare</Link></div></li>}
              {newReports > 0 && <li><span>🚧</span><div><Link href="/admin/segnalazioni"><b>{newReports} segnalazioni</b> nuove dai lettori</Link></div></li>}
              {!counts.review && !pending && !counts.scheduled && !pendingEvents && !newReports && <li>Tutto in ordine 🎉</li>}
            </ul>
          </div>
          <div className="panel">
            <div className="panel-title">Attività recente</div>
            <ul className="activity">
              {getActivity().slice(0, 10).map((e) => (
                <li key={e.id}><img src={user(e.userId)?.avatar} alt="" /><div><b>{user(e.userId)?.name}</b> {e.action} <i>{e.target}</i><div className="a-time">{timeAgo(e.createdAt)}</div></div></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
