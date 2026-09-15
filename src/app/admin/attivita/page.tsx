import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getUsers } from '@/lib/queries';
import { countActivity, listActivity } from '@/lib/repo';
import { formatDate } from '@/lib/utils';

const PER_PAGE = 60;
export default async function AuditPage({ searchParams }: PageProps<'/admin/attivita'>) {
  const me = await requireUser();
  if (!can(me, 'audit.view')) redirect('/admin');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : ''; const userId = typeof sp.utente === 'string' ? sp.utente : ''; const page = Math.max(1, Number(sp.pagina) || 1);
  const [rows, total, users] = await Promise.all([listActivity(PER_PAGE, (page - 1) * PER_PAGE, { q, userId }), countActivity(), getUsers()]);
  const user = (id: string) => users.find((u) => u.id === id);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number) => `/admin/attivita?${new URLSearchParams({ ...(q ? { q } : {}), ...(userId ? { utente: userId } : {}), pagina: String(p) })}`;
  return (
    <>
      <div className="page-title"><div><h1>Registro attività</h1><p>Chi ha fatto cosa, quando e da quale indirizzo. {total} voci, conservate un anno.</p></div></div>
      <form className="filters" method="get">
        <input className="input grow" name="q" placeholder="Cerca per titolo o azione…" defaultValue={q} />
        <select className="select" name="utente" defaultValue={userId}><option value="">Tutti gli utenti</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <button className="btn btn-outline" type="submit">Filtra</button>
      </form>
      <div className="table-wrap"><table className="table audit-table">
        <thead><tr><th>Quando</th><th>Utente</th><th>Azione</th><th>Dettagli</th><th>IP</th></tr></thead>
        <tbody>
          {rows.map((e) => <tr key={e.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.createdAt)}</td><td><div className="t-user"><img src={user(e.userId)?.avatar} alt="" /><b>{user(e.userId)?.name ?? e.userId}</b></div></td><td>{e.action} {e.articleId ? <Link href={`/admin/articoli/${e.articleId}`}><i>{e.target}</i></Link> : <i>{e.target}</i>}</td><td className="help">{e.details}</td><td className="ip">{e.ip || '—'}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={5} className="help">Nessuna attività registrata.</td></tr>}
        </tbody></table></div>
      {pages > 1 && <div className="pager" style={{ marginTop: 14 }}>{page > 1 && <Link className="btn btn-outline btn-sm" href={link(page - 1)}>← Precedente</Link>}<span className="help">Pagina {page} di {pages}</span>{page < pages && <Link className="btn btn-outline btn-sm" href={link(page + 1)}>Successiva →</Link>}</div>}
    </>
  );
}
